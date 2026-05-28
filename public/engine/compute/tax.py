"""
Tax Schedule — with Brought-Forward Losses and Unabsorbed Depreciation

Order of set-off each year (Income Tax Act, India):
  1. Unabsorbed Depreciation (carry forward: INDEFINITE, FIFO)
  2. Brought-Forward Business Loss (carry forward: 8 years, FIFO with vintage expiry)

Only after both set-offs is Normal Tax computed on the residual taxable income.

MAT is computed on BOOK PROFIT (= PBT before BF loss set-off, per Companies Act
Schedule III / Sec 115JB). MAT is not reduced by brought-forward losses.

Tax Payable  = max(Normal Tax on net taxable income,  MAT on book profit)
MAT Credit   = MAT − Normal Tax  (created in MAT years, utilised in normal-tax years)
MAT Credit carry-forward: 15 years (configurable), FIFO utilisation.

Loss creation rules each year (when PBT < 0):
  unabsorbed_dep_created  = min(depreciation, abs(PBT))
  business_loss_created   = abs(PBT) − unabsorbed_dep_created
  (depreciation is always "absorbed" first before recognising a business loss)
"""

from __future__ import annotations
from collections import deque
from engine.models.assumptions import FinancialModelInput


def compute_tax(
    inp: FinancialModelInput,
    pbt_by_fy: dict[str, float],
    depreciation_by_fy: dict[str, float],
) -> dict:
    fys       = inp.fy_range()
    t         = inp.tax
    corp_rate = t.corporate_tax_rate_pct / 100.0
    mat_rate  = t.mat_rate_pct / 100.0

    # Output dicts
    normal_tax:           dict[str, float] = {}
    mat_charge:           dict[str, float] = {}
    tax_payable:          dict[str, float] = {}
    tax_paid:             dict[str, float] = {}
    is_mat_year:          dict[str, bool]  = {}
    mat_credit_created:   dict[str, float] = {}
    mat_credit_utilised:  dict[str, float] = {}
    mat_credit_asset:     dict[str, float] = {}
    bf_loss_created:      dict[str, float] = {}
    bf_loss_utilised:     dict[str, float] = {}
    bf_loss_balance:      dict[str, float] = {}
    unabsorbed_dep_created:   dict[str, float] = {}
    unabsorbed_dep_utilised:  dict[str, float] = {}
    unabsorbed_dep_balance:   dict[str, float] = {}

    # Pools — stored as deque of (amount, expiry_fy_string)
    # Unabsorbed depreciation: no expiry → expiry_fy = "FY9999"
    unabsorbed_dep_pool: deque[tuple[float, str]] = deque()
    # Business loss: expires after 8 assessment years
    bf_loss_pool:        deque[tuple[float, str]] = deque()
    # MAT credit: expires after mat_credit_utilisation_years
    mat_credit_pool:     deque[tuple[float, str]] = deque()

    for fy in fys:
        yr  = int(fy.replace("FY", ""))
        pbt = pbt_by_fy.get(fy, 0.0)
        dep = depreciation_by_fy.get(fy, 0.0)

        # ── Expire stale credits / losses ──────────────────────────────
        # Unabsorbed dep: no expiry — nothing to expire
        # Business loss: expires after 8 years
        bf_loss_pool = deque(
            (amt, exp) for amt, exp in bf_loss_pool
            if exp > fy  # expiry_fy is the last year it can be used
        )
        # MAT credit: expires after mat_credit_utilisation_years
        mat_credit_pool = deque(
            (amt, exp) for amt, exp in mat_credit_pool
            if exp > fy
        )

        # ── Book profit for MAT (not reduced by BF losses) ─────────────
        # MAT applies on book profit which mirrors PBT for our model.
        # Book profit cannot be negative for MAT purposes.
        book_profit = max(pbt, 0.0)
        m_tax = book_profit * mat_rate

        if pbt <= 0:
            # ── Loss year ───────────────────────────────────────────────
            # No normal tax, no MAT (book profit = 0)
            loss = abs(pbt)

            # Unabsorbed depreciation = portion of loss attributable to dep
            # (depreciation is absorbed first; any remaining loss is business loss)
            ud_created = min(dep, loss)
            bl_created = loss - ud_created

            unabsorbed_dep_created[fy]  = ud_created
            bf_loss_created[fy]         = bl_created
            unabsorbed_dep_utilised[fy] = 0.0
            bf_loss_utilised[fy]        = 0.0

            # Add to pools
            if ud_created > 0.001:
                unabsorbed_dep_pool.append((ud_created, "FY9999"))
            if bl_created > 0.001:
                expiry = f"FY{yr + 8}"
                bf_loss_pool.append((bl_created, expiry))

            normal_tax[fy]          = 0.0
            mat_charge[fy]          = 0.0
            tax_payable[fy]         = 0.0
            is_mat_year[fy]         = False
            mat_credit_created[fy]  = 0.0
            mat_credit_utilised[fy] = 0.0

        else:
            # ── Profit year ─────────────────────────────────────────────
            bf_loss_created[fy]          = 0.0
            unabsorbed_dep_created[fy]   = 0.0

            # Step 1: set off unabsorbed depreciation (priority, indefinite)
            ud_available = sum(amt for amt, _ in unabsorbed_dep_pool)
            ud_used      = min(ud_available, pbt)
            taxable      = pbt - ud_used

            unabsorbed_dep_utilised[fy] = ud_used
            _deduct_from_pool(unabsorbed_dep_pool, ud_used)

            # Step 2: set off brought-forward business loss (8-year limit)
            bl_available = sum(amt for amt, _ in bf_loss_pool)
            bl_used      = min(bl_available, taxable)
            taxable      = taxable - bl_used

            bf_loss_utilised[fy] = bl_used
            _deduct_from_pool(bf_loss_pool, bl_used)

            # Step 3: normal tax on residual taxable income
            n_tax = max(taxable, 0.0) * corp_rate
            normal_tax[fy] = n_tax
            mat_charge[fy] = m_tax

            if m_tax > n_tax:
                # MAT year
                is_mat_year[fy]         = True
                tax_payable[fy]         = m_tax
                created                  = m_tax - n_tax
                mat_credit_created[fy]  = created
                mat_credit_utilised[fy] = 0.0
                expiry = f"FY{yr + t.mat_credit_utilisation_years}"
                mat_credit_pool.append((created, expiry))
            else:
                # Normal tax year — utilise MAT credit
                is_mat_year[fy]        = False
                mat_credit_created[fy] = 0.0

                mc_available       = sum(amt for amt, _ in mat_credit_pool)
                # Tax paid cannot fall below MAT floor
                reducible          = max(n_tax - m_tax, 0.0)
                utilised           = min(mc_available, reducible)
                mat_credit_utilised[fy] = utilised
                _deduct_from_pool(mat_credit_pool, utilised)

                tax_payable[fy] = max(n_tax - utilised, 0.0)

        # Closing balances
        unabsorbed_dep_balance[fy] = sum(amt for amt, _ in unabsorbed_dep_pool)
        bf_loss_balance[fy]        = sum(amt for amt, _ in bf_loss_pool)
        mat_credit_asset[fy]       = sum(amt for amt, _ in mat_credit_pool)
        tax_paid[fy]               = tax_payable[fy]

    return {
        "normal_tax":               normal_tax,
        "mat_charge":               mat_charge,
        "tax_payable":              tax_payable,
        "tax_paid":                 tax_paid,
        "is_mat_year":              is_mat_year,
        "mat_credit_created":       mat_credit_created,
        "mat_credit_utilised":      mat_credit_utilised,
        "mat_credit_asset":         mat_credit_asset,
        "bf_loss_created":          bf_loss_created,
        "bf_loss_utilised":         bf_loss_utilised,
        "bf_loss_balance":          bf_loss_balance,
        "unabsorbed_dep_created":   unabsorbed_dep_created,
        "unabsorbed_dep_utilised":  unabsorbed_dep_utilised,
        "unabsorbed_dep_balance":   unabsorbed_dep_balance,
    }


def _deduct_from_pool(pool: deque, amount: float) -> None:
    """Deduct `amount` from pool FIFO in-place."""
    remaining = amount
    new_pool: deque = deque()
    for (amt, exp) in pool:
        if remaining <= 0:
            new_pool.append((amt, exp))
        elif amt <= remaining:
            remaining -= amt
        else:
            new_pool.append((amt - remaining, exp))
            remaining = 0
    pool.clear()
    pool.extend(new_pool)
