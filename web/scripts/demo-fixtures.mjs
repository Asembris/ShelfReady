import {copyFile, mkdir, writeFile} from 'node:fs/promises';
const target = new URL('../dist/demo/', import.meta.url);
await mkdir(target, {recursive: true});
for (const name of ['baseline.csv', 'update.csv']) {
  await copyFile(new URL(`../../fixtures/${name}`, import.meta.url), new URL(name, target));
}
await writeFile(new URL('index.html', target), `<!doctype html>
<html lang="en"><meta charset="utf-8"><title>ShelfReady synthetic demo files</title>
<h1>Synthetic demo files</h1>
<p>This restricted demo accepts exactly these two files, in their indicated roles.
Do not upload customer data or edit the files.</p>
<p><a download href="baseline.csv">Download baseline WooCommerce CSV</a></p>
<p><a download href="update.csv">Download supplier CSV</a></p>
<p><a href="/">Open ShelfReady</a> and explicitly confirm the SKU, price and stock mappings.</p>
</html>`);
