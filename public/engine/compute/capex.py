"""
CAPEX & Depreciation Schedule

Outputs per FY:
  - capex_by_tranche: {tranche_label: {FY: spend}}
  - total_capex: {FY: total spend}
  - cwip: {FY: closing CWIP balance}
  - gross_block: {FY: gross block after capitalisation}
  - accumulated_depreciation: {FY: cumulative dep}
  - net_block: {FY: gross_block - acc_dep}
  - depreciation: {FY: annual charge}
  - idc_capitalised: {FY: IDC added to CWIP} (if debt.idc_capitalised=True)

Rules:
  - During construction, capex flows into CWIP
  - IDC (interest during construction) is capitalised into CWIP (Ind AS 23)
  - At capitalisation_fy, entire CWIP converts to Gross Block
  - Depreciation begins the FY after capitalisation (SLM, 60 years, zero salvage by default)
"""

from __future__ import annotations
from engine.models.assumptions import FinancialModelInput


def compute_capex(
    inp: FinancialModelInput,
    idc_by_fy: dict[str, float] | None = None,
) -> dict:
    """
    Args:
        inp:        Full model input.
        idc_by_fy:  IDC amounts per FY (provided by debt module if capitalised).
                    Pass None or empty dict if debt module hasn't run yet.

    Returns a dict with keys:
        capex_by_tranche, total_capex, cwip, gross_block,
        depreciation, accumulated_depreciation, net_block
    """
    fys = inp.fy_range()
    cap_fy = inp.capex.capitalisation_fy
    useful_life = inp.capex.useful_life_years
    salvage_pct = inp.capex.salvage_pct / 100
    idc = idc_by_fy or {}

    # ------------------------------------------------------------------
    # 1. CAPEX spend per tranche per FY
    # ------------------------------------------------------------------
    capex_by_tranche: dict[str, dict[str, float]] = {}
    total_capex: dict[str, float] = {fy: 0.0 for fy in fys}

    for tranche in inp.capex.tranches:
        tranche_spend: dict[str, float] = {}
        for fy in fys:
            frac = tranche.disbursement_profile.get(fy, 0.0)
            spend = tranche.total_cost * frac
            tranche_spend[fy] = spend
            total_capex[fy] += spend
        capex_by_tranche[tranche.label] = tranche_spend

    # ------------------------------------------------------------------
    # 2. CWIP build-up (including IDC if capitalised)
    # ------------------------------------------------------------------
    cwip: dict[str, float] = {}
    running_cwip = 0.0
    capitalised_cwip = None   # set when capitalisation_fy is reached

    for fy in fys:
        if fy < cap_fy:
            # Still in construction — add capex + IDC to CWIP
            running_cwip += total_capex[fy]
            if inp.debt.idc_capitalised:
                running_cwip += idc.get(fy, 0.0)
            cwip[fy] = running_cwip
        elif fy == cap_fy:
            # In the capitalisation year: add final capex+IDC, then convert.
            running_cwip += total_capex[fy]
            if inp.debt.idc_capitalised:
                running_cwip += idc.get(fy, 0.0)
            capitalised_cwip = running_cwip   # save for gross block
            cwip[fy] = 0.0  # Fully converted to Fixed Asset; CWIP = 0 at year end
        else:
            cwip[fy] = 0.0  # Post-capitalisation

    # If capitalisation_fy was never reached in the FY range, default to 0
    # (happens when cap_fy > last_fy, e.g. empty model)
    if capitalised_cwip is None:
        capitalised_cwip = 0.0

    # ------------------------------------------------------------------
    # 3. Gross Block — CWIP converts entirely at capitalisation_fy
    # ------------------------------------------------------------------
    gross_block_value = capitalised_cwip   # total amount capitalised
    gross_block: dict[str, float] = {}

    for fy in fys:
        if fy < cap_fy:
            gross_block[fy] = 0.0
        else:
            gross_block[fy] = gross_block_value

    # ------------------------------------------------------------------
    # 4. Depreciation — SLM, starts the year AFTER capitalisation
    # ------------------------------------------------------------------
    salvage_value = gross_block_value * salvage_pct
    depreciable_amount = gross_block_value - salvage_value
    annual_dep = depreciable_amount / useful_life if useful_life > 0 else 0.0

    depreciation: dict[str, float] = {}
    accumulated_depreciation: dict[str, float] = {}
    net_block: dict[str, float] = {}

    acc_dep = 0.0
    dep_started = False

    for fy in fys:
        if fy <= cap_fy:
            # No depreciation during construction
            depreciation[fy] = 0.0
        else:
            dep_started = True
            # Stop depreciating once fully depreciated
            remaining = depreciable_amount - acc_dep
            dep_this_year = min(annual_dep, max(remaining, 0.0))
            depreciation[fy] = dep_this_year

        acc_dep += depreciation[fy]
        accumulated_depreciation[fy] = acc_dep
        net_block[fy] = max(gross_block[fy] - acc_dep, salvage_value if dep_started else 0.0)

    return {
        "capex_by_tranche": capex_by_tranche,
        "total_capex": total_capex,
        "cwip": cwip,
        "gross_block": gross_block,
        "depreciation": depreciation,
        "accumulated_depreciation": accumulated_depreciation,
        "net_block": net_block,
    }
