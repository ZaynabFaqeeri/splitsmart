import anthropic
import json
import os
import re
import base64

class AccountantAgent:
    def __init__(self):
        self.client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))
        self.model = "claude-opus-4-5"

    def detect_media_type(self, image_base64: str) -> str:
        raw = base64.b64decode(image_base64[:16])
        if raw[:8] == b'\x89PNG\r\n\x1a\n':
            return "image/png"
        elif raw[:3] == b'\xff\xd8\xff':
            return "image/jpeg"
        elif raw[:4] == b'GIF8':
            return "image/gif"
        else:
            return "image/jpeg"

    def run(self, image_base64: str) -> dict:
        try:
            media_type = self.detect_media_type(image_base64)
            prompt = """You are a receipt scanning agent. Carefully examine this receipt image and extract ALL information.

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation):
{
  "line_items": [
    {"name": "Item Name", "price": 0.00}
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "tip": 0.00,
  "total": 0.00,
  "item_count": 0
}

Rules:
- Extract every line item with its exact price
- If tip is not on receipt, set tip to 0.00
- If tax is not shown separately, estimate from total - subtotal
- total should equal subtotal + tax + tip
- All prices must be numbers (not strings)
"""
            message = self.client.messages.create(
                model=self.model,
                max_tokens=1024,
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image",
                                "source": {
                                    "type": "base64",
                                    "media_type": media_type,
                                    "data": image_base64,
                                },
                            },
                            {"type": "text", "text": prompt}
                        ],
                    }
                ],
            )

            raw = message.content[0].text.strip()
            raw = re.sub(r"```json|```", "", raw).strip()
            result = json.loads(raw)
            result.setdefault("line_items", [])
            result.setdefault("subtotal", 0.0)
            result.setdefault("tax", 0.0)
            result.setdefault("tip", 0.0)
            result.setdefault("total", result["subtotal"] + result["tax"] + result["tip"])
            result.setdefault("item_count", len(result["line_items"]))
            return result

        except json.JSONDecodeError as e:
            return {"error": f"Could not parse receipt data: {str(e)}"}
        except Exception as e:
            return {"error": str(e)}
