"""
Sandboxed formula evaluator for user-defined revenue and cost driver formulas.

Users write formulas like:
    leasable_area_a * occupancy_rate_a * lease_rate_a * 12
    (parking_bays * parking_rate_per_bay * 12) * occupancy_rate_parking
    maintenance_fee_psf * total_area * (1 + escalation_pct/100) ** (year - base_year)

The formula context includes:
  - All assumption key→value pairs (from the active scenario)
  - The current FY as both `fy` (string, "FY2033") and `year` (int, 2033)
  - Safe math functions: min, max, abs, round, pow

simpleeval is used to prevent arbitrary code execution.
"""

from __future__ import annotations
import math
from simpleeval import SimpleEval, EvalWithCompoundTypes, FeatureNotAvailable


# Safe functions available inside formulas
_SAFE_FUNCTIONS = {
    "min": min,
    "max": max,
    "abs": abs,
    "round": round,
    "pow": pow,
    "sqrt": math.sqrt,
    "floor": math.floor,
    "ceil": math.ceil,
    "log": math.log,
}


class FormulaEvaluator:
    """
    Evaluates a formula string against a context dict.

    Usage:
        ev = FormulaEvaluator(assumptions_dict)
        result = ev.evaluate("leasable_area * occupancy * rate * 12", fy="FY2033")
    """

    def __init__(self, assumptions: dict[str, float]):
        self._assumptions = assumptions

    def evaluate(self, formula: str, fy: str, year: int | None = None) -> float:
        """
        Evaluate formula for a specific financial year.

        Args:
            formula: Expression string using assumption keys + fy/year variables.
            fy:      Financial year string, e.g. "FY2033".
            year:    Integer year (derived from fy if not provided).

        Returns:
            float result. Returns 0.0 on evaluation error (logged to stderr).
        """
        if not formula or not formula.strip():
            return 0.0

        yr = year if year is not None else int(fy.replace("FY", ""))

        names: dict[str, float | str | int] = {
            **self._assumptions,
            "fy": fy,
            "year": yr,
        }

        evaluator = EvalWithCompoundTypes(
            functions=_SAFE_FUNCTIONS,
            names=names,
        )

        try:
            result = evaluator.eval(formula.strip())
            return float(result) if result is not None else 0.0
        except FeatureNotAvailable as e:
            raise ValueError(
                f"Formula uses a disallowed feature: {e}\n"
                f"Formula: '{formula}'"
            )
        except Exception as e:
            # Surface formula errors clearly so the user can fix them
            raise ValueError(
                f"Formula evaluation error: {e}\n"
                f"Formula: '{formula}'\n"
                f"Available keys: {sorted(self._assumptions.keys())}"
            ) from e

    def evaluate_series(
        self,
        formula: str,
        fy_list: list[str],
    ) -> dict[str, float]:
        """Evaluate a formula across a list of FYs. Returns {FY: value}."""
        return {
            fy: self.evaluate(formula, fy)
            for fy in fy_list
        }

    def validate_formula(self, formula: str, fy: str = "FY2033") -> tuple[bool, str]:
        """
        Dry-run a formula and return (is_valid, error_message).
        Used by the API to validate formulas before saving.
        """
        try:
            self.evaluate(formula, fy)
            return True, ""
        except ValueError as e:
            return False, str(e)
        except Exception as e:
            return False, str(e)
