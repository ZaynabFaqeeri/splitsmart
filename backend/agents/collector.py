class CollectorAgent:
    DEFAULT_PAYPAL_USER = "splitsmart"

    def run(self, splits: list, paypal_username: str = "") -> dict:
        username = paypal_username.strip() if paypal_username.strip() else self.DEFAULT_PAYPAL_USER

        if username.startswith("@"):
            username = username[1:]

        payments = []
        for split in splits:
            amount = split["amount"]
            name = split["name"]
            link = f"https://paypal.me/{username}/{amount:.2f}"
            payments.append({
                "name": name,
                "amount": amount,
                "link": link,
                "items": split.get("items", [])
            })

        return {"payments": payments, "paypal_username": username}
