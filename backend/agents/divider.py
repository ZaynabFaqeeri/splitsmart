import anthropic
import json
import os
import re

class DividerAgent:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        self.model = "claude-opus-4-5"

    def run(self, line_items: list, total: float, members: list, instructions: str) -> dict:
        try:
            if not instructions.strip():
                per_person = round(total / len(members), 2)
                splits = []
                running = 0.0
                for i, name in enumerate(members):
                    if i == len(members) - 1:
                        amount = round(total - running, 2)
                    else:
                        amount = per_person
                        running += amount
                    splits.append({"name": name, "amount": amount, "items": ["even split"]})
                return {"splits": splits, "method": "even split"}

            items_text = "\n".join([f"- {item['name']}: ${item['price']:.2f}" for item in line_items])
            members_text = ", ".join(members)

            prompt = f"""You are a bill-splitting logic agent. Calculate exactly how much each person owes.

RECEIPT LINE ITEMS:
{items_text}

TOTAL (including tax and tip): ${total:.2f}

GROUP MEMBERS: {members_text}

SPLIT INSTRUCTIONS: {instructions}

Rules:
- Apply the instructions exactly as stated
- Tax and tip should be distributed proportionally
- If instructions don't mention an item, split it evenly
- All amounts must add up to exactly ${total:.2f}

Return ONLY a valid JSON object (no markdown, no explanation):
{{
  "splits": [
    {{
      "name": "Person Name",
      "amount": 0.00,
      "items": ["list of items this person is paying for"]
    }}
  ],
  "method": "brief description of how the split was applied"
}}
"""
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[{"role": "user", "content": prompt}],
            )

            raw = message.content[0].text.strip()
            raw = re.sub(r"```json|```", "", raw).strip()
            result = json.loads(raw)

            splits = result.get("splits", [])
            if splits:
                current_sum = sum(s["amount"] for s in splits)
                diff = round(total - current_sum, 2)
                if abs(diff) > 0.0:
                    splits[-1]["amount"] = round(splits[-1]["amount"] + diff, 2)

            return result

        except json.JSONDecodeError as e:
            return {"error": f"Could not parse split data: {str(e)}"}
        except Exception as e:
            return {"error": str(e)}
