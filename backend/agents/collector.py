def run_collector(splits, paypal_username):
    payment_links = {}

    for person, data in splits.items():
        total = round(data.get("total", 0.0), 2)
        link = f"https://paypal.me/{paypal_username}/{total:.2f}"
        payment_links[person] = {
            "subtotal": data.get("subtotal", 0.0),
            "tax": data.get("tax", 0.0),
            "tip": data.get("tip", 0.0),
            "total": total,
            "items": data.get("items", []),
            "paypal_link": link,
        }

    return {"payment_links": payment_links}
