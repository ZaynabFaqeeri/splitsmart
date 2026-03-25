import os
from google import genai
from agents.accountant import run_accountant
from agents.divider import run_divider
from agents.auditor import run_auditor
from agents.collector import run_collector

MAX_RETRIES = 2

def run_pipeline(image_b64, image_mime, members, rules, paypal_username):
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise EnvironmentError("GEMINI_API_KEY not set in environment.")
    
    os.environ["GEMINI_API_KEY"] = api_key

    # Agent 1: Accountant
    accountant_result = run_accountant(image_b64, image_mime)
    if accountant_result.get("error"):
        return {
            "success": False,
            "stage": "accountant",
            "error": accountant_result["error"],
            "message": "Could not read the receipt. Please upload a clearer photo.",
        }

    # Agent 2: Divider + Agent 3: Auditor (with retry loop)
    divider_result = None
    auditor_result = None

    for attempt in range(1, MAX_RETRIES + 2):
        divider_result = run_divider(
            receipt_data=accountant_result,
            members=members,
            rules=rules,
            correction_hint=auditor_result.get("correction_hint") if auditor_result else None,
        )
        if divider_result.get("error"):
            return {
                "success": False,
                "stage": "divider",
                "error": divider_result["error"],
                "message": "Could not calculate the split. Please try again.",
            }

        auditor_result = run_auditor(
            splits=divider_result["splits"],
            grand_total=accountant_result["total"],
        )

        if auditor_result["verified"] or attempt > MAX_RETRIES:
            break

    # Agent 4: Collector
    collector_result = run_collector(
        splits=divider_result["splits"],
        paypal_username=paypal_username,
    )

    return {
        "success": True,
        "accountant": {
            "items": accountant_result.get("items", []),
            "subtotal": accountant_result.get("subtotal"),
            "tax": accountant_result.get("tax"),
            "tip": accountant_result.get("tip"),
            "total": accountant_result.get("total"),
            "item_count": len(accountant_result.get("items", [])),
        },
        "divider": {
            "splits": divider_result["splits"],
            "rules_applied": rules,
        },
        "auditor": {
            "verified": auditor_result["verified"],
            "discrepancy": auditor_result.get("discrepancy", 0),
        },
        "collector": {
            "payment_links": collector_result["payment_links"],
        },
    }
