import os
import time
import base64
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

import sys
sys.path.insert(0, os.path.dirname(__file__))
from agents.orchestrator import run_pipeline

app = Flask(__name__)
CORS(app)

@app.route("/api/process", methods=["POST"])
def process_receipt():
    try:
        receipt_file = request.files.get("receipt")
        members_raw = request.form.get("members", "")
        rules = request.form.get("rules", "Split evenly")
        paypal_username = request.form.get("paypal_username", "yourpaypal")

        if not receipt_file:
            return jsonify({"error": "No receipt image provided."}), 400

        members = [m.strip() for m in members_raw.split(",") if m.strip()]
        if not members:
            return jsonify({"error": "No group members provided."}), 400

        image_bytes = receipt_file.read()
        image_b64 = base64.b64encode(image_bytes).decode("utf-8")
        image_mime = receipt_file.mimetype or "image/jpeg"

        result = None
        last_error = None
        for attempt in range(3):
            try:
                result = run_pipeline(
                    image_b64=image_b64,
                    image_mime=image_mime,
                    members=members,
                    rules=rules,
                    paypal_username=paypal_username,
                )
                break
            except Exception as e:
                last_error = str(e)
                if "429" in str(e) and attempt < 2:
                    print(f"Rate limited, waiting 30 seconds... (attempt {attempt+1})")
                    time.sleep(30)
                else:
                    raise

        if result is None:
            return jsonify({"error": last_error}), 500

        return jsonify(result), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok", "service": "SplitSmart API"}), 200

if __name__ == "__main__":
    app.run(debug=True, port=5001)
