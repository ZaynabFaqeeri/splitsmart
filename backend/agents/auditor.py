TOLERANCE = 0.02

def run_auditor(splits, grand_total):
    if not splits:
        return {
            "verified": False,
            "sum_of_splits": 0.0,
            "grand_total": grand_total,
            "discrepancy": grand_total,
            "correction_hint": "No splits were calculated.",
        }

    sum_of_splits = round(sum(p["total"] for p in splits.values()), 2)
    discrepancy = round(abs(sum_of_splits - grand_total), 2)
    verified = discrepancy <= TOLERANCE

    correction_hint = None
    if not verified:
        correction_hint = (
            f"The sum of individual totals (${sum_of_splits:.2f}) does not match "
            f"the receipt grand total (${grand_total:.2f}). "
            f"Discrepancy: ${discrepancy:.2f}. Please recalculate."
        )

    return {
        "verified": verified,
        "sum_of_splits": sum_of_splits,
        "grand_total": grand_total,
        "discrepancy": discrepancy,
        "correction_hint": correction_hint,
    }
