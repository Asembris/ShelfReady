"""Independent persisted-state checks. Never run or edit this inside generated code."""
from decimal import Decimal

UNCHANGED = ("id", "parent", "name", "slug", "status", "description",
             "short_description", "type", "sale_price", "manage_stock")


def verify_snapshot(actual, expected, before=None):
    if len(actual) != len(expected):
        raise RuntimeError("Persisted product count differs from expected baseline")
    want = {r["sku"]: r for r in expected}
    if len(want) != len(expected):
        raise RuntimeError("Duplicate expected SKU")
    seen, ids = set(), set()
    prior = {r["sku"]: r for r in before} if before is not None else None
    for row in actual:
        if not (set(UNCHANGED) | {"sku", "price", "active_price", "stock", "stock_status"}) <= row.keys():
            raise RuntimeError("Readback omitted required persisted fields")
        sku = row.get("sku")
        if sku not in want or sku in seen:
            raise RuntimeError("Missing, duplicate or unexpected persisted SKU")
        seen.add(sku)
        if not isinstance(row.get("id"), str) or not row["id"].isdigit() or row["id"] in ids:
            raise RuntimeError("Invalid or duplicate persisted identifier")
        ids.add(row["id"])
        item = want[sku]
        try:
            prices = [Decimal(row[f]) for f in ("price", "active_price")]
            if (any(not p.is_finite() or p != Decimal(item["price"]) for p in prices)
                    or int(row["stock"]) != int(item["stock"])
                    or row["name"] != item["name"] or row["type"] != "simple"
                    or row["manage_stock"] != "yes"
                    or row["stock_status"] != ("instock" if int(item["stock"]) else "outofstock")):
                raise RuntimeError("Persisted values differ from independent expectations")
        except (ValueError, TypeError, ArithmeticError, KeyError) as error:
            raise RuntimeError("Malformed independent store readback") from error
        if prior is not None and any(row.get(f) != prior[sku].get(f) for f in UNCHANGED):
            raise RuntimeError("Import changed supported unchanged fields or product identifiers")
    if seen != set(want):
        raise RuntimeError("Readback omitted expected products")
