from flask import Flask, request, jsonify
import os
from agents.accountant import AccountantAgent
from agents.divider import DividerAgent
from agents.auditor import AuditorAgent
from agents.collector import CollectorAgent

app = Flask(__name__)

@app.after_request
def add_cors(response):
    response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Headers"] = "*"
    response.headers["Access-Control-Allow-Methods"] = "*"
    return response

@app.route("/api/split", methods=["POST", "OPTIONS"])
def split_receipt():
    if request.method == "OPTIONS":
        return "", 200

    try:
        data = request.get_json()
        image_base64 = data.get("image")
        members = data.get("members", [])
        instructions = data.get("instructions", "")
        paypal_username = data.get("paypalUsername", "")

        if not image_base64 or not members:
            return jsonify({"error": "Missing image or members"}), 400

        accountant_result = AccountantAgent().run(image_base64)
        if accountant_result.get("error"):
            return jsonify({"error": accountant_result["error"]}), 500

        divider_result = DividerAgent().run(
            line_items=accountant_result["line_items"],
            total=accountant_result["total"],
            members=members,
            instructions=instructions
        )
        if divider_result.get("error"):
            return jsonify({"error": divider_result["error"]}), 500

        auditor_result = AuditorAgent().run(
            splits=divider_result["splits"],
            total=accountant_result["total"]
        )

        collector_result = CollectorAgent().run(
            splits=divider_result["splits"],
            paypal_username=paypal_username
        )

        return jsonify({
            "accountant": accountant_result,
            "divider": divider_result,
            "auditor": auditor_result,
            "collector": collector_result
        })

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})

if __name__ == "__main__":
    app.run(debug=False, port=8000)
