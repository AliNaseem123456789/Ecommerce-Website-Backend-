/**
 * Set products.avg_rating from the reviews that already exist.
 * Run once from Ecommerce-Backend/api: node scripts/backfill-ratings.js
 */
require('dotenv').config();
const { Client } = require('pg');

async function main() {
  const db = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
  await db.connect();
  const result = await db.query(`
    update products p
    set avg_rating = coalesce(r.avg_rating, 0)
    from (
      select product_id, round(avg(rating), 2) as avg_rating
      from product_reviews
      group by product_id
    ) r
    where p.product_id = r.product_id
  `);
  const cleared = await db.query(`
    update products
    set avg_rating = 0
    where product_id not in (
      select distinct product_id from product_reviews where product_id is not null
    )
  `);
  console.log({
    products_with_reviews: result.rowCount,
    products_without_reviews: cleared.rowCount,
  });
  await db.end();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
