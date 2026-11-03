"""Shared synthetic test input, never an external integration result."""
BASE = "Type,SKU,Name,Regular price,Stock\nsimple,00017,Test,12.30,4\n"
SUPPLIER = "SKU,Regular price,Stock\n00017,13.5500,7\nmissing,3.00,0\n"
MAPPING = {"baseline": {"sku": "SKU", "price": "Regular price", "stock": "Stock",
                        "name": "Name", "type": "Type"},
           "supplier": {"sku": "SKU", "price": "Regular price", "stock": "Stock"}}
