"""Competent mapping-and-staging comparator, with no inference or generated code."""
from collections import Counter

from shelfready import catalog


def transform(data, mapping):
    baseline = catalog.mapped(data["baseline"], mapping["baseline"], "baseline")
    supplier = catalog.mapped(data["supplier"], mapping["supplier"], "supplier")
    known = {r["sku"] for r in baseline}
    counts = Counter(r["sku"].casefold() for r in supplier)
    output, unresolved = [], []
    for number, row in enumerate(supplier, 1):
        if catalog.invalid(row) or row["sku"] not in known or counts[row["sku"].casefold()] != 1:
            unresolved.append(number)
        else:
            output.append({"row": number, **row})
    return output, unresolved
