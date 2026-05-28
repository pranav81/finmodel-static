"""
Debt Schedule — principal-only IDC method

IDC is computed on the PRINCIPAL balance only (drawn amounts).
Prior IDC does NOT compound — it is tracked separately as a
capitalised cost item but does not sit on the loan attracting
further interest.

Two balances are tracked per year:
  principal_balance  — debt actually drawn (what the bank charges interest on)
  closing_loan       — principal_balance + cumulative_idc (for BS)

IDC formula:
  avg_principal = (opening_principal + (opening_principal + drawn)) / 2
               = opening_principal + drawn / 2
  IDC_this_year = avg_principal × rate

Opening loan for next year = closing_loan (principal + all prior IDC)
But IDC for next year is computed on the PRINCIPAL portion only.
"""

from __future__ import annotations
from engine.models.assumptions import FinancialModelInput


def compute_debt(
    inp: FinancialModelInput,
    total_capex_by_fy: dict[str, float],
) -> dict:
    fys    = inp.fy_range()
    d      = inp.debt
    cap_fy = inp.capex.capitalisation_fy
    rate   = d.interest_rate_pct / 100.0

    # ── 1. Drawdown amounts ───────────────────────────────────────────────
    drawdown: dict[str, float] = {
        fy: d.total_debt * d.drawdown_profile.get(fy, 0.0)
        for fy in fys
    }

    # ── 2. Pre-pass: find opening balance at first repayment year ─────────
    # We need this to size equal annual instalments.
    # The ops opening = total principal drawn + cumulative IDC (principal-only)
    first_repayment_fy = _next_fy(d.moratorium_end_fy)
    repayment_fys = [fy for fy in fys if fy >= first_repayment_fy][: d.repayment_years]

    _prin = 0.0
    _idc_acc = 0.0
    for fy in fys:
        drawn = d.total_debt * d.drawdown_profile.get(fy, 0.0)
        if fy <= cap_fy:
            # IDC on principal only
            avg_prin = _prin + drawn * 0.5
            _idc = avg_prin * rate if d.idc_capitalised else 0.0
            _prin += drawn
            _idc_acc += _idc
        else:
            if fy == first_repayment_fy:
                break

    repayment_start_balance = _prin + _idc_acc   # principal + capitalised IDC
    annual_principal = (
        repayment_start_balance / d.repayment_years
        if d.repayment_years > 0 and repayment_fys
        else 0.0
    )

    # ── 3. Forward pass ───────────────────────────────────────────────────
    idc:                 dict[str, float] = {}
    interest_expense:    dict[str, float] = {}
    principal_repayment: dict[str, float] = {}
    opening_loan:        dict[str, float] = {}
    closing_loan:        dict[str, float] = {}
    opening_principal:   dict[str, float] = {}   # principal-only tracker
    closing_principal:   dict[str, float] = {}

    prin_balance  = 0.0   # cumulative principal drawn (no IDC)
    total_balance = 0.0   # prin_balance + cumulative_idc  (for BS / loan statement)
    cumulative_idc = 0.0

    for fy in fys:
        opening_loan[fy]      = total_balance
        opening_principal[fy] = prin_balance
        drawn = drawdown[fy]

        if fy <= cap_fy:
            # ── Construction ──────────────────────────────────────────────
            # IDC = avg principal × rate  (principal only, no compounding)
            avg_prin = prin_balance + drawn * 0.5
            idc_this_year = avg_prin * rate if d.idc_capitalised else 0.0
            idc[fy] = idc_this_year
            cumulative_idc += idc_this_year

            interest_expense[fy]    = (avg_prin * rate) if not d.idc_capitalised else 0.0
            principal_repayment[fy] = 0.0

            prin_balance  += drawn
            total_balance  = prin_balance + cumulative_idc

            closing_principal[fy] = prin_balance
            closing_loan[fy]      = total_balance

        else:
            # ── Operations ────────────────────────────────────────────────
            idc[fy] = 0.0
            interest_expense[fy] = total_balance * rate

            if fy in repayment_fys:
                principal_repayment[fy] = min(annual_principal, max(total_balance, 0.0))
            else:
                principal_repayment[fy] = 0.0

            total_balance  = max(total_balance - principal_repayment[fy], 0.0)
            prin_balance   = total_balance   # after capitalisation, no further IDC separation needed
            closing_loan[fy]      = total_balance
            closing_principal[fy] = total_balance

    # ── 4. Debt service ───────────────────────────────────────────────────
    total_debt_service: dict[str, float] = {
        fy: interest_expense[fy] + principal_repayment[fy]
        for fy in fys
    }

    # ── 5. Equity plug ────────────────────────────────────────────────────
    total_capex_amount = sum(total_capex_by_fy.values())
    total_debt_drawn   = sum(drawdown.values())
    equity_required    = max(total_capex_amount - total_debt_drawn, 0.0)

    return {
        "drawdown":            drawdown,
        "opening_loan":        opening_loan,
        "closing_loan":        closing_loan,
        "opening_principal":   opening_principal,
        "closing_principal":   closing_principal,
        "idc":                 idc,
        "cumulative_idc":      cumulative_idc,
        "interest_expense":    interest_expense,
        "principal_repayment": principal_repayment,
        "total_debt_service":  total_debt_service,
        "equity_required":     equity_required,
    }


def _next_fy(fy: str) -> str:
    yr = int(fy.replace("FY", ""))
    return f"FY{yr + 1}"
