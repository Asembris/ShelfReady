"""Conservative competent non-LLM comparator: synonyms, fuzzy tokens and samples."""
import re
import unicodedata
from difflib import SequenceMatcher

from shelfready.interpretation import check

ALIASES = {
    "sku": ["sku", "product identifier", "product code", "item code", "item number", "identifier",
            "vendor part", "part number", "reference", "ref", "article", "artikelnummer", "referenz"],
    "price": ["unit selling price", "selling price", "regular price", "retail price", "sale price",
              "public unit price", "list price", "rrp", "msrp", "pvp", "prix vente", "tarif public",
              "verkaufspreis", "shelf price", "unit price"],
    "stock": ["stock", "available units", "available", "on hand", "quantity", "qty", "inventory",
              "free stock", "sellable units", "disponible", "dispo", "lagerbestand", "bestand", "verfugbar"],
}


def norm(text):
    return re.sub(r"[^a-z0-9]", "", unicodedata.normalize("NFKD", text.lower()).encode(
        "ascii", "ignore").decode())


def propose(table, baseline_skus, intent):
    fields, uncertainties = {}, []
    for field in ("sku", "price", "stock"):
        ranked = []
        for index, header in enumerate(table["headers"]):
            values = [r[index] for r in table["rows"][:5]]
            text = norm(header)
            tokens = {norm(t) for t in re.findall(r"\w+", header)}
            score = max(max(SequenceMatcher(None, text, norm(alias)).ratio(),
                            .95 if norm(alias) in tokens else 0) for alias in ALIASES[field])
            if field == "sku":
                matches = sum((v.strip() if intent["allow_sku_trim"] else v) in baseline_skus for v in values)
                score = max(score, matches/len(values))
            else:
                numeric = sum(bool(re.fullmatch(r"[0-9]+(?:[.,][0-9]+)?(?: (?:ea|each))?", v)) for v in values)
                score += .10 * numeric/len(values)
            if field == "price" and re.search(r"cost|purchase|buy|achat|compra|\bek\b|wholesale", header, re.I):
                score = 0
            if field == "stock" and re.search(r"incoming|inbound|reserved|pending|cases?|cartons?|pack|bestellt|attente|\bpte", header, re.I):
                score = 0
            ranked.append((score, header, values))
        ranked.sort(reverse=True)
        best = ranked[0]
        blocked = ((field == "price" and (intent["currency"] == "unknown" or intent["price_format"] == "unknown"))
                   or (field == "stock" and intent["stock_unit"] != "each"))
        if blocked or best[0] < .65 or (len(ranked)>1 and best[0]-ranked[1][0] < .12):
            fields[field] = {"column": None, "rule": "identity", "evidence": [],
                             "explanation": "Insufficient unambiguous score or unspecified business basis"}
            uncertainties.append(f"Confirm {field}: deterministic/fuzzy match abstained")
            continue
        rule = "identity"
        if field == "sku" and intent["allow_sku_trim"] and any(v != v.strip() for v in best[2]):
            rule = "trim"
        elif field == "price" and intent["price_format"] == "comma":
            rule = "decimal_comma"
        elif field == "stock" and any(re.fullmatch(r"[0-9]+ (?:ea|each)", v) for v in best[2]):
            rule = "strip_each"
        fields[field] = {"column": best[1], "rule": rule,
                         "evidence": [{"row": 1, "value": best[2][0]}],
                         "explanation": f"Synonym/fuzzy/sample score {best[0]:.3f}; human confirmation required"}
    return check({"fields": fields, "uncertainties": uncertainties}, table, intent), {"model_calls": 0}
