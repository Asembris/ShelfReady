SELECT JSON_OBJECT(
  'id', CAST(p.ID AS CHAR), 'parent', CAST(p.post_parent AS CHAR),
  'name', p.post_title, 'slug', p.post_name, 'status', p.post_status,
  'description', p.post_content, 'short_description', p.post_excerpt,
  'sku', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_sku'),
  'price', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_regular_price'),
  'active_price', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_price'),
  'sale_price', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_sale_price'),
  'stock', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_stock'),
  'manage_stock', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_manage_stock'),
  'stock_status', (SELECT meta_value FROM wp_postmeta WHERE post_id=p.ID AND meta_key='_stock_status'),
  'type', (SELECT t.slug FROM wp_terms t JOIN wp_term_taxonomy tt ON tt.term_id=t.term_id
           JOIN wp_term_relationships tr ON tr.term_taxonomy_id=tt.term_taxonomy_id
           WHERE tr.object_id=p.ID AND tt.taxonomy='product_type')
) FROM wp_posts p WHERE p.post_type IN ('product','product_variation') ORDER BY p.ID;
