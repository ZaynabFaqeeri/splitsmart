import json
import re
import base64
from google import genai
from google.genai import types

def run_accountant(image_b64, image_mime):
    client = genai.Client()

    ACCOUNTANT_PROMPT = """
You are a receipt scanning assistant. Analyze this receipt image carefully.
Extract ALL of the following and return ONLY a valid JSON object, no prose, no markdown.

{
  "items": [
    {"name": "Item name", "qty": 1, "unit_price": 0.00, "line_total": 0.00}
  ],
  "subtotal": 0.00,
  "tax": 0.00,
  "tip": 0.00,
  "total": 0.00,
  "error": null
}

All dollar amounts must be floats. If you cannot read the receipt, set error to a short description. Return ONLY the JSON.
"""

    try:
        image_bytes = base64.b64decode(image_b64)
        print(f"DEBUG: image_mime={image_mime}, image_bytes_len={len(image_bytes)}")
        response = client.models.generate_content(
            model="gemini-2.0-flash",
            contents=[
                types.Content(parts=[
                    types.Part(text=ACCOUNTANT_PROMPT),
                    types.Part(inline_data=types.Blob(mime_type="image/jpeg", data=image_bytes))
                ])
            ]
        )
        print(f"DEBUG: Gemini response: {response.text[:300]}")
        raw_text = response.text.strip()
        raw_text = re.sub(r"```json\s*", "", raw_text)
        raw_text = re.sub(r"```\s*", "", raw_text).strip()
        return json.loads(raw_text)
    except json.JSONDecodeError as e:
        print(f"DEBUG: JSON error: {e}, raw_text: {raw_text[:200]}")
        return {"error": "Could not read receipt. Please try a clearer photo."}
    except Exception as e:
        print(f"DEBUG: Exception: {str(e)}")
        return {"error": f"Accountant agent failed: {str(e)}"}

