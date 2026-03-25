import json
import re
from google import genai

def run_divider(receipt_data, members, rules, correction_hint=None):
    client = genai.Client()
    items_str = json.dumps(receipt_data.get("items", []), indent=2)
    members_str = ", ".join(members)
    correction_block = f"\nIMPORTANT CORRECTION: {correction_hint}\n" if correction_hint else ""

    prompt = f"""
You are an expense-splitting assistant.{correction_block}

RECEIPT:
Items: {items_str}
Subtotal: ${receipt_data.get('subtotal', 0):.2f}
Tax: ${receipt_data.get('tax', 0):.2f}
Tip: ${receipt_data.get('tip', 0):.2f}
Grand Total: ${receipt_data.get('total', 0):.2f}

GROUP MEMBERS: {members_str}
SPLIT RULES: {rules}

Calculate each person's exact share. Distribute tax and tip proportionally.
The sum of all totals MUST equal the grand total exactly.
Return ONLY valid JSON, no prose, no markdown:

{{
  "splits": {{
    "PersonName": {{
      "subtotal": 0.00,
      "tax": 0.00,
      "tip": 0.00,
      "total": 0.00,
      "items": ["Item 1"]
    }}
  }},
  "error": null
}}
"""
    try:
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[prompt]
        )
        raw_text = response.text.strip()
        raw_text = re.sub(r"```json\s*", "", raw_text)
        raw_text = re.sub(r"```\s*", "", raw_text).strip()
        return json.loads(raw_text)
    except json.JSONDecodeError:
        return {"error": "Divider agent could not calculate splits. Please try again."}
    except Exception as e:
        return {"error": f"Divider agent failed: {str(e)}"}
