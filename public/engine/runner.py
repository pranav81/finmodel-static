"""
Model Runner

Orchestrates the full financial model computation in the correct dependency order.

Pass 1 (bootstrap):
  1. CAPEX (no IDC yet — first pass uses zero IDC)
  2. Debt (uses pass-1 CAPEX to get IDC and equity_required)
  3. Rerun CAPEX with actual IDC from debt module

Pass 2 (full):
  4. Revenue drivers
  5. Cost drivers
  6. Income Statement Pass 1 (PBT without tax)
  7. Tax (needs PBT)
  8. Income Statement Pass 2 (final, with tax)
  9. Metrics (needs IS, Debt — also computes dividends_paid)
  10. CFS (needs dividends_paid from metrics)
  11. BS (needs closing_cash from CFS)

Returns a single ComputedModel dict that the FastAPI layer serialises to JSON.
"""

from __future__ import annotations

from engine.models.assumptions import FinancialModelInput
from engine.compute.capex import compute_capex
from engine.compute.debt import compute_debt
from engine.compute.drivers import compute_revenue, compute_costs
from engine.compute.income_statement import compute_income_statement
from engine.compute.tax import compute_tax
from engine.compute.cashflow import compute_cashflow
from engine.compute.balance_sheet import compute_balance_sheet
from engine.compute.metrics import compute_metrics


def run_model(inp: FinancialModelInput) -> dict:
    """
    Full model run. Returns all computed sheets.
    Raises ValueError on formula errors or structural inconsistencies.
    """
    fys = inp.fy_range()
    construction_fys = inp.construction_fys()
    operations_fys = inp.operations_fys()

    # Pull WACC and Ke from assumptions (with sensible defaults)
    assumptions = inp.assumptions_dict()
    wacc = assumptions.get("wacc_pct", 12.0)
    cost_of_equity = assumptions.get("cost_of_equity_pct", 15.0)
    dividend_payout_ratio = assumptions.get("dividend_payout_ratio_pct", 50.0)

    # ------------------------------------------------------------------
    # PASS 1 — CAPEX (no IDC) → derive total_debt from ratio → Debt → CAPEX (with IDC)
    # ------------------------------------------------------------------
    capex_pass1 = compute_capex(inp, idc_by_fy=None)

    # Derive total_debt from ratio: debt_pct % of total CAPEX
    total_capex_amount = sum(capex_pass1["total_capex"].values())
    inp.debt.total_debt = total_capex_amount * inp.debt.debt_pct / 100.0
    inp.debt.equity_pct = 100.0 - inp.debt.debt_pct

    debt_result = compute_debt(inp, capex_pass1["total_capex"])

    # Rerun CAPEX with IDC from debt module
    capex_result = compute_capex(inp, idc_by_fy=debt_result["idc"])

    # Rerun debt with corrected CAPEX (CWIP now includes IDC correctly)
    debt_result = compute_debt(inp, capex_result["total_capex"])

    # ------------------------------------------------------------------
    # PASS 2 — Drivers → IS (no tax) → Tax → IS (final)
    # ------------------------------------------------------------------
    rev_result = compute_revenue(inp)
    cost_result = compute_costs(inp)

    # IS pass 1: zero tax to get PBT
    is_pass1 = compute_income_statement(
        fys=fys,
        revenue_total=rev_result["revenue_total"],
        cost_total=cost_result["cost_total"],
        depreciation=capex_result["depreciation"],
        interest_expense=debt_result["interest_expense"],
        tax_paid={fy: 0.0 for fy in fys},
    )

    tax_result = compute_tax(
        inp,
        pbt_by_fy=is_pass1["pbt"],
        depreciation_by_fy=capex_result["depreciation"],
    )

    # IS pass 2: final with actual tax
    is_result = compute_income_statement(
        fys=fys,
        revenue_total=rev_result["revenue_total"],
        cost_total=cost_result["cost_total"],
        depreciation=capex_result["depreciation"],
        interest_expense=debt_result["interest_expense"],
        tax_paid=tax_result["tax_paid"],
    )

    # ------------------------------------------------------------------
    # Metrics (includes dividends_paid with DSCR gating)
    # ------------------------------------------------------------------
    metrics_result = compute_metrics(
        fys=fys,
        first_fy=inp.meta.first_fy,
        ebitda=is_result["ebitda"],
        pat=is_result["pat"],
        depreciation=capex_result["depreciation"],
        total_capex=capex_result["total_capex"],
        closing_loan=debt_result["closing_loan"],
        total_debt_service=debt_result["total_debt_service"],
        drawdown=debt_result["drawdown"],
        principal_repayment=debt_result["principal_repayment"],
        equity_required=debt_result["equity_required"],
        tax_paid=tax_result["tax_paid"],
        wacc=wacc,
        cost_of_equity=cost_of_equity,
        dscr_dividend_gate=inp.debt.dscr_dividend_gate,
        dividend_payout_ratio=dividend_payout_ratio,
    )
    dividends_paid = metrics_result["dividends_paid"]

    # ------------------------------------------------------------------
    # CFS → BS (cash from CFS feeds BS)
    # ------------------------------------------------------------------
    # Build share_capital for CFS (derive from equity_required + construction)
    equity_required = debt_result["equity_required"]
    annual_eq = equity_required / len(construction_fys) if construction_fys else 0.0
    cumsc = 0.0
    share_capital_for_cfs: dict[str, float] = {}
    for fy in fys:
        if fy in construction_fys:
            cumsc += annual_eq
        share_capital_for_cfs[fy] = cumsc

    cfs_result = compute_cashflow(
        fys=fys,
        construction_fys=construction_fys,
        ebitda=is_result["ebitda"],
        tax_paid=tax_result["tax_paid"],
        total_capex=capex_result["total_capex"],
        drawdown=debt_result["drawdown"],
        interest_expense=debt_result["interest_expense"],
        principal_repayment=debt_result["principal_repayment"],
        share_capital=share_capital_for_cfs,
        dividends_paid=dividends_paid,
        opening_cash_balance=0.0,
    )

    bs_result = compute_balance_sheet(
        fys=fys,
        construction_fys=construction_fys,
        cwip=capex_result["cwip"],
        gross_block=capex_result["gross_block"],
        accumulated_depreciation=capex_result["accumulated_depreciation"],
        net_block=capex_result["net_block"],
        closing_loan=debt_result["closing_loan"],
        principal_repayment=debt_result["principal_repayment"],
        equity_required=equity_required,
        mat_credit_asset=tax_result["mat_credit_asset"],
        pat=is_result["pat"],
        closing_cash=cfs_result["closing_cash"],
        dividends_paid=dividends_paid,
    )

    # ------------------------------------------------------------------
    # Return full output bundle
    # ------------------------------------------------------------------
    return {
        "meta": {
            "project_name": inp.meta.name,
            "client": inp.meta.client,
            "currency": inp.meta.currency,
            "fy_range": fys,
            "construction_fys": construction_fys,
            "operations_fys": operations_fys,
            "active_scenario": inp.active_scenario_id,
        },
        "assumptions": {p.key: p.value for p in inp.assumptions},
        "assumptions_applied": inp.assumptions_dict(),   # after scenario overrides
        "capex": capex_result,
        "debt": debt_result,
        "revenue": rev_result,
        "costs": cost_result,
        "income_statement": is_result,
        "tax": tax_result,
        "cashflow": cfs_result,
        "balance_sheet": bs_result,
        "metrics": metrics_result,
    }
