"""
Cash Flow Statement — Indirect Method

Structure:
─────────────────────────────────────────────────────
A. Cash Flow from Operations (CFO)
     EBITDA
     (Less) Tax Paid
     = Net CFO

B. Cash Flow from Investing (CFI)
     (Less) CAPEX spend
     = Net CFI

C. Cash Flow from Financing (CFF)
     Equity injections (Share Capital raised)
     Debt drawdowns
     (Less) Interest Paid (P&L interest only; IDC is non-cash / capitalised)
     (Less) Principal Repayments
     (Less) Dividends Paid
     = Net CFF

D. Net Change in Cash = CFO + CFI + CFF
E. Opening Cash
F. Closing Cash

Notes:
  - Depreciation is a non-cash item already excluded (EBITDA-based start)
  - IDC is capitalised — it is a non-cash charge to CWIP, not P&L interest
  - Interest Paid in CFF = P&L interest_expense (cash outflow)
"""

from __future__ import annotations


def compute_cashflow(
    fys: list[str],
    construction_fys: list[str],
    # From IS
    ebitda: dict[str, float],
    # From Tax
    tax_paid: dict[str, float],
    # From CAPEX
    total_capex: dict[str, float],
    # From Debt
    drawdown: dict[str, float],
    interest_expense: dict[str, float],
    principal_repayment: dict[str, float],
    # From BS
    share_capital: dict[str, float],          # cumulative; we derive annual injection
    # Dividends
    dividends_paid: dict[str, float] | None = None,
    opening_cash_balance: float = 0.0,
) -> dict:
    divs = dividends_paid or {fy: 0.0 for fy in fys}

    cfo: dict[str, float] = {}
    cfi: dict[str, float] = {}
    cff: dict[str, float] = {}
    net_change: dict[str, float] = {}
    opening_cash: dict[str, float] = {}
    closing_cash: dict[str, float] = {}

    # Derive annual equity injection from cumulative share capital
    prev_sc = 0.0
    annual_equity_injection: dict[str, float] = {}
    for fy in fys:
        sc = share_capital.get(fy, 0.0)
        annual_equity_injection[fy] = sc - prev_sc
        prev_sc = sc

    running_cash = opening_cash_balance

    for fy in fys:
        # A — Operations
        _cfo = ebitda.get(fy, 0.0) - tax_paid.get(fy, 0.0)
        cfo[fy] = _cfo

        # B — Investing (capex is a cash outflow)
        _cfi = -total_capex.get(fy, 0.0)
        cfi[fy] = _cfi

        # C — Financing
        _equity_in = annual_equity_injection.get(fy, 0.0)
        _debt_in = drawdown.get(fy, 0.0)
        _interest_out = -interest_expense.get(fy, 0.0)
        _principal_out = -principal_repayment.get(fy, 0.0)
        _div_out = -divs.get(fy, 0.0)

        _cff = _equity_in + _debt_in + _interest_out + _principal_out + _div_out
        cff[fy] = _cff

        # D–F — Cash movement
        _net = _cfo + _cfi + _cff
        net_change[fy] = _net
        opening_cash[fy] = running_cash
        running_cash = running_cash + _net  # negative = overdraft / funding gap (surfaced in BS)
        closing_cash[fy] = running_cash

    return {
        # CFO components
        "ebitda": ebitda,
        "tax_paid": tax_paid,
        "cfo": cfo,
        # CFI components
        "capex_outflow": {fy: -total_capex.get(fy, 0.0) for fy in fys},
        "cfi": cfi,
        # CFF components
        "equity_injection": annual_equity_injection,
        "debt_drawdown": drawdown,
        "interest_paid": {fy: -interest_expense.get(fy, 0.0) for fy in fys},
        "principal_repayment": {fy: -principal_repayment.get(fy, 0.0) for fy in fys},
        "dividends_paid": {fy: -divs.get(fy, 0.0) for fy in fys},
        "cff": cff,
        # Summary
        "net_change_in_cash": net_change,
        "opening_cash": opening_cash,
        "closing_cash": closing_cash,
    }
