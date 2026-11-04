"""Trusted CSV parsing, explicit intent and independent transformation expectations."""
import csv
import io
import re
import unicodedata
from collections import Counter

MAX_BYTES = 16384
MAX_ROWS = 100
FIELDS = {"baseline": ("sku", "price", "stock", "name", "type"),
          "supplier": ("sku", "price", "stock")}
ALIASES = {"sku": {"sku", "productsku"}, "price": {"price", "regularprice"},
           "stock": {"stock", "quantity", "stockquantity"},
           "name": {"name", "productname"}, "type": {"type", "producttype"}}


def parse(raw):
    if not raw or len(raw) > MAX_BYTES:
        raise ValueError("Each CSV must contain 1–16384 bytes")
    text = raw.decode("utf-8-sig")
    if any(unicodedata.category(c) in ("Cc", "Cf") and c not in "\r\n" for c in text):
        raise ValueError("CSV contains control characters")
    try:
        rows = list(csv.reader(io.StringIO(text), strict=True))
    except csv.Error as error:
        raise ValueError("Malformed CSV quoting") from error
    if not rows or not 1 <= len(rows) - 1 <= MAX_ROWS:
        raise ValueError("CSV must contain 1–100 data rows")
    headers = rows[0]
    if (not 1 <= len(headers) <= 20 or len(set(headers)) != len(headers)
            or any(not h or len(h) > 80 for h in headers)):
        raise ValueError("CSV headers must be unique, nonempty and bounded")
    if any(len(row) != len(headers) or any(len(c) > 256 or "\n" in c or "\r" in c
                                         for c in row) for row in rows[1:]):
        raise ValueError("CSV has inconsistent columns or oversized cells")
    return {"headers": headers, "rows": rows[1:]}


def candidates(table, kind):
    return {field: [h for h in table["headers"]
                    if re.sub(r"[^a-z]", "", h.lower()) in ALIASES[field]]
            for field in FIELDS[kind]}


def mapped(table, mapping, kind):
    if set(mapping) != set(FIELDS[kind]) or len(set(mapping.values())) != len(mapping):
        raise ValueError("Confirm one distinct column for every required field")
    if any(h not in table["headers"] for h in mapping.values()):
        raise ValueError("Mapping references an unknown column")
    return [{f: row[table["headers"].index(h)] for f, h in mapping.items()}
            for row in table["rows"]]


def invalid(row):
    if not row["sku"] or row["sku"] != row["sku"].strip():
        return "Empty SKU or surrounding SKU whitespace"
    if row["sku"][0] in "=+-@" or not re.fullmatch(r"[0-9]{1,9}(\.[0-9]{1,6})?", row["price"]):
        return "Unsafe SKU or price must be a nonnegative decimal with at most six places"
    if not re.fullmatch(r"[0-9]{1,7}", row["stock"]):
        return "Stock must be a nonnegative integer"
    return None


def plan(data, mapping):
    baseline = mapped(data["baseline"], mapping["baseline"], "baseline")
    supplier = mapped(data["supplier"], mapping["supplier"], "supplier")
    if len({r["sku"].casefold() for r in baseline}) != len(baseline):
        raise ValueError("Baseline SKUs must be unique")
    for row in baseline:
        if invalid(row) or row["type"] != "simple" or not row["name"]:
            raise ValueError("Baseline requires valid simple products, names, prices and stock")
    known = {r["sku"] for r in baseline}
    counts = Counter(r["sku"].casefold() for r in supplier)
    resolved, unresolved = [], []
    for number, row in enumerate(supplier, 1):
        reason = invalid(row)
        if counts[row["sku"].casefold()] > 1:
            reason = "Duplicate supplier SKU"
        elif row["sku"] not in known:
            reason = "SKU absent from baseline"
        if reason:
            unresolved.append({"row": number, "sku": row["sku"], "reason": reason})
        else:
            resolved.append({"row": number, **row})
    validate_accounting(len(supplier), resolved, unresolved)
    return baseline, supplier, resolved, unresolved


def validate_accounting(total, resolved, unresolved):
    numbers = [r.get("row") for r in [*resolved, *unresolved]]
    if (any(type(n) is not int for n in numbers) or len(numbers) != total
            or sorted(numbers) != list(range(1, total+1))):
        raise ValueError("Resolved and unresolved rows must partition all supplier rows exactly once")


def validate(output, expected):
    # Exact string comparison protects identifiers and decimal scale. Never trust
    # a model's row accounting, omissions, extra fields or claimed success.
    if (not isinstance(output, list) or any(
            not isinstance(r, dict) or type(r.get("row")) is not int
            or any(type(r.get(f)) is not str for f in ("sku", "price", "stock"))
            for r in output) or output != expected):
        raise ValueError("Transformation differs from independently computed row accounting/values")


def csv_text(rows, baseline=False):
    stream = io.StringIO(newline="")
    fields = ["Type", "SKU", "Name", "Regular price", "Stock"] if baseline else [
        "SKU", "Regular price", "Stock"]
    writer = csv.writer(stream)
    writer.writerow(fields)
    for r in rows:
        writer.writerow(["simple", r["sku"], r["name"], r["price"], r["stock"]]
                        if baseline else [r["sku"], r["price"], r["stock"]])
    return stream.getvalue()
