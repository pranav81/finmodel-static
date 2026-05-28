/**
 * Default (blank) FinancialModelInput template.
 * Everything starts empty — the user defines all parameters,
 * revenue drivers, cost drivers, and CAPEX tranches from scratch.
 */

export function DEFAULT_MODEL_INPUT() {
  return {
    meta: {
      name: 'New Project',
      client: '',
      currency: 'INR Crores',
      first_fy: 2027,
      last_fy: 2041,
      construction_end_fy: 2032,
    },
    assumptions: [],
    revenue_drivers: { line_items: [] },
    cost_drivers:    { line_items: [] },
    capex: {
      tranches: [],
      dep_method: 'SLM',
      useful_life_years: 60,
      salvage_pct: 0,
      capitalisation_fy: 'FY2032',
    },
    debt: {
      debt_pct: 70,
      equity_pct: 30,
      total_debt: 0,
      drawdown_profile: {},
      interest_rate_pct: 9.5,
      moratorium_end_fy: 'FY2035',
      repayment_years: 6,
      idc_capitalised: true,
      dscr_dividend_gate: 1.20,
    },
    tax: {
      corporate_tax_rate_pct: 25.17,
      mat_rate_pct: 15.0,
      mat_credit_utilisation_years: 15,
    },
    scenarios: [
      { id: 'base', label: 'Base Case', description: 'Central assumptions', overrides: [], is_default: true },
    ],
    active_scenario_id: 'base',
  };
}
