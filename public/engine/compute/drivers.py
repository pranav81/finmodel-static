"""
Revenue & Cost Drivers

Evaluates all user-defined formula-based line items across every FY.

Each driver line item has:
  - id, label, formula, phase (construction / operations / both)
  - category (for grouping in the UI)

The formula is evaluated in the context of:
  - All assumption key→value pairs (scenario-adjusted)
  - fy (string), year (int)

Outputs:
  revenue_by_line:  {line_item_id: {FY: value}}
  revenue_total:    {FY: sum of all revenue line items active in that FY}
  cost_by_line:     {line_item_id: {FY: value}}
  cost_total:       {FY: sum of all cost line items active in that FY}
  revenue_metadata: {line_item_id: {label, category, formula}}
  cost_metadata:    {line_item_id: {label, category, formula}}
"""

from __future__ import annotations
from engine.models.assumptions import FinancialModelInput
from engine.compute.formula import FormulaEvaluator


def _is_active(phase: str, fy: str, construction_fys: list[str], operations_fys: list[str]) -> bool:
    if phase == "construction":
        return fy in construction_fys
    elif phase == "operations":
        return fy in operations_fys
    else:  # "both"
        return True


def compute_revenue(inp: FinancialModelInput) -> dict:
    fys = inp.fy_range()
    construction_fys = inp.construction_fys()
    operations_fys = inp.operations_fys()
    assumptions = inp.assumptions_dict()
    ev = FormulaEvaluator(assumptions)

    revenue_by_line: dict[str, dict[str, float]] = {}
    revenue_metadata: dict[str, dict] = {}
    revenue_total: dict[str, float] = {fy: 0.0 for fy in fys}

    for item in inp.revenue_drivers.line_items:
        line_values: dict[str, float] = {}
        for fy in fys:
            if _is_active(item.phase, fy, construction_fys, operations_fys):
                try:
                    val = ev.evaluate(item.formula, fy)
                except ValueError:
                    val = 0.0
            else:
                val = 0.0

            line_values[fy] = val
            revenue_total[fy] += val

        revenue_by_line[item.id] = line_values
        revenue_metadata[item.id] = {
            "label": item.label,
            "category": item.category,
            "formula": item.formula,
            "phase": item.phase,
            "notes": item.notes,
        }

    return {
        "revenue_by_line": revenue_by_line,
        "revenue_total": revenue_total,
        "revenue_metadata": revenue_metadata,
    }


def compute_costs(inp: FinancialModelInput) -> dict:
    fys = inp.fy_range()
    construction_fys = inp.construction_fys()
    operations_fys = inp.operations_fys()
    assumptions = inp.assumptions_dict()
    ev = FormulaEvaluator(assumptions)

    cost_by_line: dict[str, dict[str, float]] = {}
    cost_metadata: dict[str, dict] = {}
    cost_total: dict[str, float] = {fy: 0.0 for fy in fys}

    for item in inp.cost_drivers.line_items:
        line_values: dict[str, float] = {}
        for fy in fys:
            if _is_active(item.phase, fy, construction_fys, operations_fys):
                try:
                    val = ev.evaluate(item.formula, fy)
                except ValueError:
                    val = 0.0
            else:
                val = 0.0

            line_values[fy] = val
            cost_total[fy] += val

        cost_by_line[item.id] = line_values
        cost_metadata[item.id] = {
            "label": item.label,
            "category": item.category,
            "formula": item.formula,
            "phase": item.phase,
            "notes": item.notes,
        }

    return {
        "cost_by_line": cost_by_line,
        "cost_total": cost_total,
        "cost_metadata": cost_metadata,
    }
