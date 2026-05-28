"""
Core Pydantic schemas for the financial model engine.

Design philosophy:
- Assumptions are a flat key→value dict of user-defined parameters.
  Any sheet can reference any assumption by its key.
- Revenue and cost drivers are user-defined named line items with
  formula strings that reference assumption keys.
- Scenarios are user-defined: each has a name and a dict of
  assumption overrides (absolute or % delta).
"""

from __future__ import annotations
from typing import Any, Literal
from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Assumption parameter (one entry in the assumptions dict)
# ---------------------------------------------------------------------------

class AssumptionParam(BaseModel):
    key: str                        # machine key, e.g. "lease_rate_wing_a"
    label: str                      # human label, e.g. "Lease Rate – Wing A (₹/sqft/mo)"
    value: float
    unit: str = ""                  # "₹/sqft/mo", "%", "sqft", etc.  (display only)
    group: str = "General"          # groups params in the UI


# ---------------------------------------------------------------------------
# Formula-based driver (revenue or cost line item)
# ---------------------------------------------------------------------------

class DriverLineItem(BaseModel):
    id: str                         # unique within the model, e.g. "wing_a_income"
    label: str                      # "Wing A Lease Income"
    formula: str                    # e.g. "leasable_area_a * occupancy_a * lease_rate_a * 12"
    phase: Literal["construction", "operations", "both"] = "operations"
    category: str = ""              # e.g. "Lease Income", "Parking", "Maintenance Fee"
    notes: str = ""


class RevenueDrivers(BaseModel):
    line_items: list[DriverLineItem] = Field(default_factory=list)


class CostDrivers(BaseModel):
    line_items: list[DriverLineItem] = Field(default_factory=list)


# ---------------------------------------------------------------------------
# Scenario
# ---------------------------------------------------------------------------

class ScenarioOverride(BaseModel):
    key: str                        # assumption key to override
    mode: Literal["absolute", "delta_pct"] = "delta_pct"
    # absolute: replace value with this number
    # delta_pct: multiply base value by (1 + value/100)
    value: float


class Scenario(BaseModel):
    id: str                         # "base", "upside", "downside", or any user string
    label: str                      # "Base Case", "Bull Case", etc.
    description: str = ""
    overrides: list[ScenarioOverride] = Field(default_factory=list)
    is_default: bool = False        # which scenario to show on load


# ---------------------------------------------------------------------------
# CAPEX assumptions
# ---------------------------------------------------------------------------

class CapexTranche(BaseModel):
    label: str                      # "Civil Works", "MEP", "FF&E", etc.
    total_cost: float               # INR Crores
    # Disbursement profile: dict of {FY: fraction}, fractions must sum to 1.0
    # e.g. {"FY2027": 0.20, "FY2028": 0.35, ...}
    disbursement_profile: dict[str, float]

    @model_validator(mode="after")
    def check_profile_sums(self) -> "CapexTranche":
        total = sum(self.disbursement_profile.values())
        if not (0.999 < total < 1.001):
            raise ValueError(
                f"Disbursement profile for '{self.label}' sums to {total:.4f}, must be 1.0"
            )
        return self


class CapexAssumptions(BaseModel):
    tranches: list[CapexTranche] = Field(default_factory=list)
    # Depreciation
    dep_method: Literal["SLM"] = "SLM"     # straight-line (only method for now)
    useful_life_years: int = 60
    salvage_pct: float = 0.0                # % of gross block as residual value
    capitalisation_fy: str = "FY2033"       # year CWIP converts to Fixed Assets


# ---------------------------------------------------------------------------
# Debt assumptions
# ---------------------------------------------------------------------------

class DebtAssumptions(BaseModel):
    # Ratio-based financing — total_debt derived from total_capex * debt_pct/100
    debt_pct: float = 70.0
    equity_pct: float = 30.0
    total_debt: float = 0.0               # Derived by runner; kept for compatibility
    drawdown_profile: dict[str, float] = {}
    interest_rate_pct: float = 9.5
    moratorium_end_fy: str = "FY2035"
    repayment_years: int = 6
    idc_capitalised: bool = True
    dscr_dividend_gate: float = 1.20

    @model_validator(mode="after")
    def check_drawdown_sums(self) -> "DebtAssumptions":
        if self.drawdown_profile and self.debt_pct > 0:
            total = sum(self.drawdown_profile.values())
            if total > 0 and not (0.999 < total < 1.001):
                raise ValueError(f"Drawdown profile sums to {total:.4f}, must be 1.0")
        return self


# ---------------------------------------------------------------------------
# Tax assumptions
# ---------------------------------------------------------------------------

class TaxAssumptions(BaseModel):
    corporate_tax_rate_pct: float = 25.17   # incl. surcharge & cess
    mat_rate_pct: float = 15.0              # MAT rate on book profits
    mat_credit_utilisation_years: int = 15  # MAT credit can be carried forward


# ---------------------------------------------------------------------------
# Top-level model input
# ---------------------------------------------------------------------------

class ProjectMeta(BaseModel):
    name: str
    client: str = ""
    currency: str = "INR Crores"
    first_fy: int = 2027
    last_fy: int = 2041
    construction_end_fy: int = 2032         # last year of construction phase


class FinancialModelInput(BaseModel):
    meta: ProjectMeta
    assumptions: list[AssumptionParam]      # flat list; engine converts to key→value
    revenue_drivers: RevenueDrivers
    cost_drivers: CostDrivers
    capex: CapexAssumptions
    debt: DebtAssumptions
    tax: TaxAssumptions
    scenarios: list[Scenario] = Field(default_factory=list)
    active_scenario_id: str = "base"        # which scenario to compute

    # -----------------------------------------------------------------------
    # Helpers
    # -----------------------------------------------------------------------

    def assumptions_dict(self) -> dict[str, float]:
        """Return flat {key: value} dict, with active scenario overrides applied."""
        base = {p.key: p.value for p in self.assumptions}

        # find active scenario
        active = next(
            (s for s in self.scenarios if s.id == self.active_scenario_id), None
        )
        if active:
            for override in active.overrides:
                if override.key in base:
                    if override.mode == "absolute":
                        base[override.key] = override.value
                    else:  # delta_pct
                        base[override.key] = base[override.key] * (1 + override.value / 100)
        return base

    def fy_range(self) -> list[str]:
        return [f"FY{y}" for y in range(self.meta.first_fy, self.meta.last_fy + 1)]

    def construction_fys(self) -> list[str]:
        return [f"FY{y}" for y in range(self.meta.first_fy, self.meta.construction_end_fy + 1)]

    def operations_fys(self) -> list[str]:
        return [f"FY{y}" for y in range(self.meta.construction_end_fy + 1, self.meta.last_fy + 1)]
