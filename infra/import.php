<?php
// Trusted adapter calls the exact native importer used by WooCommerce's UI.
require_once ABSPATH . 'wp-admin/includes/file.php';
require_once WC_ABSPATH . 'includes/import/abstract-wc-product-importer.php';
require_once WC_ABSPATH . 'includes/import/class-wc-product-csv-importer.php';
$importer = new WC_Product_CSV_Importer('/tmp/catalog.csv', [
    'mapping' => ['SKU' => 'sku', 'Type' => 'type', 'Name' => 'name',
                  'Regular price' => 'regular_price', 'Stock' => 'stock_quantity'],
    'update_existing' => getenv('IMPORT_UPDATE') === '1',
    'parse' => true,
]);
$result = $importer->import();
echo wp_json_encode($result) . PHP_EOL;
if (count($result['failed']) || count($result['skipped'])) {
    WP_CLI::error('Native import failed or skipped rows');
}
