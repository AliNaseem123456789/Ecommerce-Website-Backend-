/**
 * One-off upload of local product images into the Supabase `products` bucket
 * and write each product's public URL into products.image_url.
 * Run from Ecommerce-Backend/api: node scripts/upload-product-images.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const { createClient } = require('@supabase/supabase-js');

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

async function main() {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  const files = fs
    .readdirSync(assetsDir)
    .filter((file) => contentType(file));
  let uploaded = 0;
  const uploadedNames = new Set();
  for (const file of files) {
    const body = fs.readFileSync(path.join(assetsDir, file));
    const { error } = await supabase.storage.from('products').upload(file, body, {
      upsert: true,
      contentType: contentType(file),
    });
    if (error) {
      console.error(`upload failed ${file}: ${error.message}`);
      continue;
    }
    uploaded += 1;
    uploadedNames.add(file);
  }

  const products = (await db.query('SELECT product_id FROM products')).rows;
  let updated = 0;
  for (const product of products) {
    const preferred = [`${product.product_id}-1.jpeg`, `${product.product_id}.jpeg`];
    const file = preferred.find((name) => uploadedNames.has(name));
    if (!file) continue;
    const { data } = supabase.storage.from('products').getPublicUrl(file);
    await db.query('UPDATE products SET image_url = $2 WHERE product_id = $1', [
      product.product_id,
      data.publicUrl,
    ]);
    updated += 1;
  }
  console.log(`uploaded ${uploaded}/${files.length}, image_url set on ${updated} products`);
  await db.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
