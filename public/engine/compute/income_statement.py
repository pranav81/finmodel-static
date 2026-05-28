"""
Income Statement

EBITDA → EBIT → PBT → PAT

Line items per FY:
  revenue              = sum of revenue driver line items
  total_opex           = sum of cost driver line items
  ebitda               = revenue − total_opex
  ebitda_margin_pct    = ebitda / revenue × 100
  depreciation         = from capex module
  ebit                 = ebitda − depreciation
  interest_expense     = from debt module (P&L interest only, not IDC)
  pbt                  = ebit − interest_expense
  tax                  = from tax module
  pat                  = pbt − tax
  pat_margin_pct       = pat / revenue × 100

Note: tax module needs PBT, so we compute IS twice:
  Pass 1: compute PBT (no tax)
  Pass 2: feed PBT to tax module, then produce final IS
The runner handles this two-pass flow.
"""

from __future__ import annotations


def compute_income_statement(
    fys: list[str],
    revenue_total: dict[str, float],
    cost_total: dict[str, float],
    depreciation: dict[str, float],
    interest_expense: dict[str, float],
    tax_paid: dict[str, float],
) -> dict:
    """
    All inputs are {FY: float} dicts.
    Returns a dict of {metric: {FY: float}}.
    """
    ebitda: dict[str, float] = {}
    ebitda_margin: dict[str, float] = {}
    ebit: dict[str, float] = {}
    pbt: dict[str, float] = {}
    pat: dict[str, float] = {}
    pat_margin: dict[str, float] = {}

    for fy in fys:
        rev = revenue_total.get(fy, 0.0)
        opex = cost_total.get(fy, 0.0)
        dep = depreciation.get(fy, 0.0)
        interest = interest_expense.get(fy, 0.0)
        tax = tax_paid.get(fy, 0.0)

        _ebitda = rev - opex
        _ebit = _ebitda - dep
        _pbt = _ebit - interest
        _pat = _pbt - tax

        ebitda[fy] = _ebitda
        ebitda_margin[fy] = (_ebitda / rev * 100) if rev != 0 else 0.0
        ebit[fy] = _ebit
        pbt[fy] = _pbt
        pat[fy] = _pat
        pat_margin[fy] = (_pat / rev * 100) if rev != 0 else 0.0

    return {
        "revenue": revenue_total,
        "total_opex": cost_total,
        "ebitda": ebitda,
        "ebitda_margin_pct": ebitda_margin,
        "depreciation": depreciation,
        "ebit": ebit,
        "interest_expense": interest_expense,
        "pbt": pbt,
        "tax": tax_paid,
        "pat": pat,
        "pat_margin_pct": pat_margin,
    }
