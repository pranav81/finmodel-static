"""
Balance Sheet — Fully Integrated

Assets = Liabilities + Equity always holds.
Equity is the plug: Share Capital + Retained Earnings.

Structure
─────────────────────────────────────────────
ASSETS
  Non-Current Assets
    Gross Block
    (Less) Accumulated Depreciation
    Net Block (Fixed Assets)
    Capital Work In Progress (CWIP)
    MAT Credit Asset (deferred tax asset)
  Current Assets
    Cash & Cash Equivalents          ← from CFS closing balance
    Other Current Assets             ← placeholder (extend as needed)
  Total Assets

LIABILITIES & EQUITY
  Equity
    Share Capital                    ← cumulative equity injections
    Retained Earnings / (Deficit)    ← cumulative PAT after dividends
  Non-Current Liabilities
    Long-Term Debt (Loan Outstanding)
  Current Liabilities
    Current Portion of Debt          ← principal due next year
    Other Current Liabilities        ← placeholder
  Total Liabilities & Equity
─────────────────────────────────────────────

Equity injections are assumed to happen each construction year
proportional to equity_required / construction_years.
"""

from __future__ import annotations


def compute_balance_sheet(
    fys: list[str],
    construction_fys: list[str],
    # From CAPEX module
    cwip: dict[str, float],
    gross_block: dict[str, float],
    accumulated_depreciation: dict[str, float],
    net_block: dict[str, float],
    # From Debt module
    closing_loan: dict[str, float],
    principal_repayment: dict[str, float],
    equity_required: float,
    # From Tax module
    mat_credit_asset: dict[str, float],
    # From IS module
    pat: dict[str, float],
    # From CFS module (cash balances)
    closing_cash: dict[str, float],
    # Dividend payments per FY (from metrics/runner)
    dividends_paid: dict[str, float] | None = None,
) -> dict:
    divs = dividends_paid or {fy: 0.0 for fy in fys}

    # ------------------------------------------------------------------
    # Share capital injections: spread equally across construction years
    # ------------------------------------------------------------------
    share_capital: dict[str, float] = {}
    if construction_fys:
        annual_equity = equity_required / len(construction_fys)
    else:
        annual_equity = 0.0

    cumulative_sc = 0.0
    for fy in fys:
        if fy in construction_fys:
            cumulative_sc += annual_equity
        share_capital[fy] = cumulative_sc

    # ------------------------------------------------------------------
    # Retained earnings: cumulative PAT net of dividends,
    # PLUS the MAT credit asset balance (deferred tax credit per Ind AS 12).
    # The MAT credit asset represents excess tax already paid — the
    # corresponding equity entry is a deferred tax income credit to reserves.
    # Without this, the BS would show Assets > L+E by exactly the MAT credit balance.
    # ------------------------------------------------------------------
    retained_earnings: dict[str, float] = {}
    cumulative_re = 0.0
    for fy in fys:
        cumulative_re += pat.get(fy, 0.0) - divs.get(fy, 0.0)
        # Add deferred tax credit: mat_credit_asset represents future tax savings
        # already paid in cash, which is a real equity benefit.
        retained_earnings[fy] = cumulative_re + mat_credit_asset.get(fy, 0.0)

    # ------------------------------------------------------------------
    # Current portion of debt = next year's principal repayment
    # ------------------------------------------------------------------
    current_portion_debt: dict[str, float] = {}
    for i, fy in enumerate(fys):
        if i + 1 < len(fys):
            current_portion_debt[fy] = principal_repayment.get(fys[i + 1], 0.0)
        else:
            current_portion_debt[fy] = 0.0

    # ------------------------------------------------------------------
    # Assemble balance sheet
    # ------------------------------------------------------------------
    total_equity: dict[str, float] = {}
    total_assets: dict[str, float] = {}
    total_liabilities_equity: dict[str, float] = {}
    check: dict[str, float] = {}  # should be ~0 always

    for fy in fys:
        _net_block = net_block.get(fy, 0.0)
        _cwip = cwip.get(fy, 0.0)
        _mat_credit = mat_credit_asset.get(fy, 0.0)
        _cash = closing_cash.get(fy, 0.0)

        _total_assets = _net_block + _cwip + _mat_credit + _cash

        _lt_debt = max(closing_loan.get(fy, 0.0) - current_portion_debt.get(fy, 0.0), 0.0)
        _st_debt = current_portion_debt.get(fy, 0.0)
        _share_cap = share_capital[fy]
        _re = retained_earnings[fy]
        _equity = _share_cap + _re

        _total_l_e = _equity + _lt_debt + _st_debt

        total_equity[fy] = _equity
        total_assets[fy] = _total_assets
        total_liabilities_equity[fy] = _total_l_e
        check[fy] = round(_total_assets - _total_l_e, 4)

    return {
        # Assets
        "gross_block": gross_block,
        "accumulated_depreciation": accumulated_depreciation,
        "net_block": net_block,
        "cwip": cwip,
        "mat_credit_asset": mat_credit_asset,
        "cash": closing_cash,
        "total_assets": total_assets,
        # Equity
        "share_capital": share_capital,
        "retained_earnings": retained_earnings,
        "total_equity": total_equity,
        # Liabilities
        "long_term_debt": {
            fy: max(closing_loan.get(fy, 0.0) - current_portion_debt.get(fy, 0.0), 0.0)
            for fy in fys
        },
        "current_portion_debt": current_portion_debt,
        "total_liabilities_equity": total_liabilities_equity,
        # Integrity check (should be 0)
        "bs_check": check,
    }
