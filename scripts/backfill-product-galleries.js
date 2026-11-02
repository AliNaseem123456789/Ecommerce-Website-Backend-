/**
 * Rebuild product galleries from the local assets folder.
 *
 * The files were already uploaded to the Supabase `products` bucket by
 * scripts/upload-product-images.js, keeping their original names
 * ({id}.jpeg as the main shot, {id}-N.jpeg as extra shots). This script
 * inserts the matching product_images rows so the storefront gallery and the
 * card hover image come back, and points products.image_url at the primary.
 *
 * Run from Ecommerce-Backend/api:
 *   node scripts/backfill-product-galleries.js            (skips products that already have rows)
 *   node scripts/backfill-product-galleries.js --force    (rebuilds every product's rows)
 *   node scripts/backfill-product-galleries.js --dry-run  (prints the plan, writes nothing)
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

const FORCE = process.argv.includes('--force');
const DRY_RUN = process.argv.includes('--dry-run');

const assetsDir = path.resolve(
  __dirname,
  '../../../ecommerce-app/src/assets/products',
);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY,
);

function contentType(file) {
  const ext = path.extname(file).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  if (ext === '.avif') return 'image/avif';
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  return null;
}

/**
 * "13-4.jpeg"  -> { id: 13, position: 4 }
 * "13.jpeg"    -> { id: 13, position: 0 }   (the main shot sorts first)
 * "aa.jpeg"    -> null                      (ignored)
 */
function parseName(file) {
  const base = path.basename(file, path.extname(file));
  const match = base.match(/^(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  return {
    id: Number(match[1]),
    position: match[2] ? Number(match[2]) : 0,
  };
}

async function main() {
  if (!fs.existsSync(assetsDir)) {
    throw new Error(`Assets folder not found: ${assetsDir}`);
  }

  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();

  // Group local files by product id, main shot first.
  const byProduct = new Map();
  let ignored = 0;
  for (const file of fs.readdirSync(assetsDir)) {
    if (!contentType(file)) continue;
    const parsed = parseName(file);
    if (!parsed) {
      ignored += 1;
      continue;
    }
    if (!byProduct.has(parsed.id)) byProduct.set(parsed.id, []);
    byProduct.get(parsed.id).push({ file, position: parsed.position });
  }
  for (const list of byProduct.values()) {
    list.sort((a, b) => a.position - b.position);
  }

  const existing = new Set(
    (await db.query('SELECT product_id FROM products')).rows.map(
      (row) => row.product_id,
    ),
  );

  let productsTouched = 0;
  let rowsInserted = 0;
  let skipped = 0;
  const orphans = [];

  for (const [productId, files] of [...byProduct.entries()].sort(
    (a, b) => a[0] - b[0],
  )) {
    if (!existing.has(productId)) {
      orphans.push(productId);
      continue;
    }

    const already = Number(
      (
        await db.query(
          'SELECT COUNT(*)::int AS count FROM product_images WHERE product_id = $1',
          [productId],
        )
      ).rows[0].count,
    );

    if (already > 0 && !FORCE) {
      skipped += 1;
      continue;
    }

    const urls = [];
    for (const entry of files) {
      // Make sure the object really is in the bucket; upload if it is missing.
      const { data: head } = await supabase.storage
        .from('products')
        .list('', { search: entry.file, limit: 1 });
      if (!head || head.length === 0) {
        const body = fs.readFileSync(path.join(assetsDir, entry.file));
        const { error } = await supabase.storage
          .from('products')
          .upload(entry.file, body, {
            upsert: true,
            contentType: contentType(entry.file),
          });
        if (error) {
          console.error(`  upload failed ${entry.file}: ${error.message}`);
          continue;
        }
      }
      const { data } = supabase.storage
        .from('products')
        .getPublicUrl(entry.file);
      urls.push(data.publicUrl);
    }

    if (urls.length === 0) continue;

    console.log(
      `product ${productId}: ${urls.length} image${urls.length === 1 ? '' : 's'}` +
        (already > 0 ? ' (rebuilding)' : ''),
    );
    if (DRY_RUN) {
      productsTouched += 1;
      rowsInserted += urls.length;
      continue;
    }

    try {
      await db.query('BEGIN');
      if (already > 0) {
        await db.query('DELETE FROM product_images WHERE product_id = $1', [
          productId,
        ]);
      }
      for (let index = 0; index < urls.length; index += 1) {
        await db.query(
          `INSERT INTO product_images (product_id, url, sort_order, is_primary)
           VALUES ($1, $2, $3, $4)`,
          [productId, urls[index], index, index === 0],
        );
        rowsInserted += 1;
      }
      await db.query(
        'UPDATE products SET image_url = $2 WHERE product_id = $1',
        [productId, urls[0]],
      );
      await db.query('COMMIT');
      productsTouched += 1;
    } catch (error) {
      await db.query('ROLLBACK');
      console.error(`  product ${productId} failed: ${error.message}`);
    }
  }

  console.log('');
  console.log(DRY_RUN ? '--- dry run, nothing written ---' : '--- done ---');
  console.log(`products updated : ${productsTouched}`);
  console.log(`image rows       : ${rowsInserted}`);
  console.log(`skipped (had rows): ${skipped}${FORCE ? ' (--force ignores this)' : ''}`);
  if (ignored) console.log(`files ignored    : ${ignored} (name is not {id} or {id}-N)`);
  if (orphans.length) {
    console.log(`no such product  : ${orphans.join(', ')}`);
  }

  await db.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
