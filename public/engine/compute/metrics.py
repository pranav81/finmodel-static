"""
Metrics Module

Computes:
  Project IRR      — unlevered cash flows (EBITDA − CAPEX − Tax)
  Equity IRR       — levered cash flows (PAT + Depreciation − CAPEX + Debt − Repayment)
  NPV (Project)    — at WACC
  NPV (Equity)     — at equity cost
  WACC             — from assumptions (or computed if Ke/Kd provided)
  DSCR per year    — EBITDA / Total Debt Service (interest + principal)
  Payback Period   — years from first operations year to cumulative CFO recovery of equity
  Peak Debt        — max closing loan balance
  Debt/EBITDA      — at peak operations year

DSCR gate:
  If DSCR < dscr_dividend_gate in a given year, dividends = 0 for that year.
  This feeds back into the BS and CFS (dividends_paid dict).
"""

from __future__ import annotations
import numpy_financial as npf


def compute_metrics(
    fys: list[str],
    first_fy: int,
    # IS
    ebitda: dict[str, float],
    pat: dict[str, float],
    depreciation: dict[str, float],
    # CAPEX
    total_capex: dict[str, float],
    # Debt
    closing_loan: dict[str, float],
    total_debt_service: dict[str, float],
    drawdown: dict[str, float],
    principal_repayment: dict[str, float],
    equity_required: float,
    # Tax
    tax_paid: dict[str, float],
    # Settings
    wacc: float,                    # % e.g. 12.0
    cost_of_equity: float,          # % e.g. 15.0
    dscr_dividend_gate: float,      # e.g. 1.20
    dividend_payout_ratio: float = 50.0,  # % of PAT paid as dividend
) -> dict:

    # ------------------------------------------------------------------
    # DSCR per year
    # ------------------------------------------------------------------
    dscr: dict[str, float | None] = {}
    total_debt_drawn = sum(drawdown.values()) if drawdown else 0.0
    # Meaningful debt service threshold: 0.5 Cr (in the model's native unit).
    # Below this the debt service is a rounding artefact — treat as N/A.
    # This also covers years with zero debt (total_debt_drawn == 0).
    DS_THRESHOLD = 0.5
    for fy in fys:
        ds = total_debt_service.get(fy, 0.0)
        if ds >= DS_THRESHOLD:
            dscr[fy] = ebitda.get(fy, 0.0) / ds
        else:
            # No meaningful debt service this year — DSCR not applicable
            dscr[fy] = None

    # ------------------------------------------------------------------
    # Dividend gating (DSCR-linked)
    # ------------------------------------------------------------------
    dividends_paid: dict[str, float] = {}
    for fy in fys:
        year_pat = pat.get(fy, 0.0)
        dscr_val = dscr.get(fy)
        # None DSCR = no debt service constraint, gate is cleared
        gate_cleared = (dscr_val is None) or (dscr_val >= dscr_dividend_gate)
        if year_pat > 0 and gate_cleared:
            # Simple policy: pay out 50% of PAT as dividends when gate is cleared
            # User can extend this as a configurable payout ratio
            dividends_paid[fy] = year_pat * (dividend_payout_ratio / 100.0)
        else:
            dividends_paid[fy] = 0.0

    # ------------------------------------------------------------------
    # Project IRR (unlevered, pre-financing)
    # Cash flows: −CAPEX during construction, EBITDA − Tax during operations
    # ------------------------------------------------------------------
    project_cf = []
    for fy in fys:
        yr = int(fy.replace("FY", ""))
        capex_out = total_capex.get(fy, 0.0)
        ops_in = ebitda.get(fy, 0.0) - tax_paid.get(fy, 0.0)
        project_cf.append(ops_in - capex_out)

    try:
        project_irr = npf.irr(project_cf)
        project_irr_pct = project_irr * 100 if project_irr is not None and not _isnan(project_irr) else None
    except Exception:
        project_irr_pct = None

    # ------------------------------------------------------------------
    # Equity IRR (levered)
    # Cash flows: −Equity injections, then PAT + Depreciation (proxy for equity FCF)
    # ------------------------------------------------------------------
    # Equity injection per FY derived from drawdown and total capex
    equity_by_fy = _derive_equity_injections(fys, total_capex, drawdown, equity_required)

    equity_cf = []
    for fy in fys:
        eq_out = equity_by_fy.get(fy, 0.0)
        eq_in = pat.get(fy, 0.0) + depreciation.get(fy, 0.0) - principal_repayment.get(fy, 0.0)
        equity_cf.append(eq_in - eq_out)

    try:
        equity_irr = npf.irr(equity_cf)
        equity_irr_pct = equity_irr * 100 if equity_irr is not None and not _isnan(equity_irr) else None
    except Exception:
        equity_irr_pct = None

    # ------------------------------------------------------------------
    # NPV
    # ------------------------------------------------------------------
    wacc_rate = wacc / 100
    ke_rate = cost_of_equity / 100

    try:
        project_npv = npf.npv(wacc_rate, project_cf)
    except Exception:
        project_npv = None

    try:
        equity_npv = npf.npv(ke_rate, equity_cf)
    except Exception:
        equity_npv = None

    # ------------------------------------------------------------------
    # Payback period (simple, from first positive cumulative project CF)
    # ------------------------------------------------------------------
    payback_year = None
    cumulative = 0.0
    for i, fy in enumerate(fys):
        cumulative += project_cf[i]
        if cumulative >= 0 and payback_year is None:
            payback_year = fy

    # ------------------------------------------------------------------
    # Peak debt and Debt/EBITDA
    # ------------------------------------------------------------------
    peak_debt_fy = max(closing_loan, key=lambda fy: closing_loan.get(fy, 0.0))
    peak_debt = closing_loan.get(peak_debt_fy, 0.0)

    # Debt/EBITDA at peak debt year (first operations year with debt outstanding)
    ops_fys_with_debt = {fy: closing_loan[fy] for fy in fys if closing_loan.get(fy, 0.0) > 0 and ebitda.get(fy, 0.0) > 0}
    if ops_fys_with_debt:
        peak_debt_ops_fy = max(ops_fys_with_debt, key=lambda fy: ops_fys_with_debt[fy])
        ebitda_at_peak = ebitda.get(peak_debt_ops_fy, 0.0)
        debt_ebitda = (
            closing_loan.get(peak_debt_ops_fy, 0.0) / ebitda_at_peak
            if ebitda_at_peak > 0 else None
        )
    else:
        debt_ebitda = None

    # Min DSCR during repayment years
    repayment_dscr = {fy: v for fy, v in dscr.items()
                       if v is not None and total_debt_service.get(fy, 0) > 0.001}
    min_dscr = min(repayment_dscr.values()) if repayment_dscr else None

    return {
        "project_irr_pct": _round(project_irr_pct),
        "equity_irr_pct": _round(equity_irr_pct),
        "project_npv": _round(project_npv),
        "equity_npv": _round(equity_npv),
        "wacc_used_pct": wacc,
        "cost_of_equity_pct": cost_of_equity,
        "dscr": {fy: _round(v) for fy, v in dscr.items()},
        "min_dscr": _round(min_dscr),
        "dividends_paid": dividends_paid,
        "payback_year": payback_year,
        "peak_debt": _round(peak_debt),
        "peak_debt_fy": peak_debt_fy,
        "debt_ebitda": _round(debt_ebitda),
        # Raw cash flow arrays for charting
        "project_cashflows": {fy: _round(project_cf[i]) for i, fy in enumerate(fys)},
        "equity_cashflows": {fy: _round(equity_cf[i]) for i, fy in enumerate(fys)},
    }


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _derive_equity_injections(
    fys: list[str],
    total_capex: dict[str, float],
    drawdown: dict[str, float],
    equity_required: float,
) -> dict[str, float]:
    """Equity injected = capex spend − debt drawdown per year, floors at 0."""
    result = {}
    for fy in fys:
        inj = total_capex.get(fy, 0.0) - drawdown.get(fy, 0.0)
        result[fy] = max(inj, 0.0)
    # Scale to ensure total matches equity_required
    total_derived = sum(result.values())
    if total_derived > 0 and abs(total_derived - equity_required) > 0.01:
        scale = equity_required / total_derived
        result = {fy: v * scale for fy, v in result.items()}
    return result


def _round(v) -> float | None:
    if v is None:
        return None
    try:
        return round(float(v), 4)
    except (TypeError, ValueError):
        return None


def _isnan(v) -> bool:
    try:
        import math
        return math.isnan(v)
    except Exception:
        return True
