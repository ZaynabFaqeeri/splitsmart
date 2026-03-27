class AuditorAgent:
    TOLERANCE = 0.02

    def run(self, splits: list, total: float) -> dict:
        computed_total = round(sum(s["amount"] for s in splits), 2)
        discrepancy = round(abs(computed_total - total), 2)
        verified = discrepancy <= self.TOLERANCE

        if verified:
            message = f"All amounts verified. Total: ${computed_total:.2f}"
        else:
            message = (
                f"Discrepancy detected: splits sum to ${computed_total:.2f} "
                f"but receipt total is ${total:.2f} (off by ${discrepancy:.2f})"
            )

        return {
            "verified": verified,
            "computed_total": computed_total,
            "expected_total": total,
            "discrepancy": discrepancy,
            "message": message
        }
