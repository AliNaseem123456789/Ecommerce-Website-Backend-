# Product variants — design only

No migration and no code in this step. This is the plan for a later, additive change to `cart_items_test` and `order_items`, which are on the payment path.

## `product_variants`

New table. Nothing on `products` is dropped or retyped.

| Column | Type | Notes |
| --- | --- | --- |
| id | uuid, default `gen_random_uuid()` | primary key |
| product_id | int, not null | FK `products(product_id)` ON DELETE CASCADE |
| sku | varchar(80), unique | |
| option_name | varchar(50), nullable | for example `Size`. One name per variant row is enough for the first version. A second option can be a later nullable column, not a retype. |
| option_value | varchar(80), nullable | for example `Large` |
| price | decimal(10,2), nullable | override. Null means use `products.price`. |
| stock | int, not null, default 0 | |
| image_url | text, nullable | |
| active | boolean, default true | |
| created_at | timestamp, default now | |

Index on `product_id`. Unique on `(product_id, option_name, option_value)` so one product cannot have two "Large" rows.

## Where stock lives

Stock stays on `products` for any product that has no variants. All 27 current products stay in that state: no variant rows, `products.stock` remains the number checkout already checks and decrements.

When a product gains at least one active variant, stock moves to the variants:

- The admin form requires a variant for any new stock change.
- `products.stock` is then a cached sum of active variant stock, rewritten in the same transaction as a variant insert, update, or delete. It is not the source of truth anymore for that product.
- A product with zero variants keeps using `products.stock` exactly as today.

Existing products are not backfilled with a dummy variant. A null `variant_id` means "this line is the product itself."

## Cart and order lines

Add nullable columns. Do not drop `product_id`.

`cart_items_test`

- `variant_id` uuid, nullable, FK `product_variants(id)` ON DELETE RESTRICT
- The existing 17 cart rows keep `variant_id` null and stay valid.
- A line is unique on `(user_id, product_id, variant_id)`. Two sizes of one product are two rows. Null variant stays the current "plain product" line.

`order_items`

- `variant_id` uuid, nullable, FK `product_variants(id)` ON DELETE SET NULL
- `variant_name` varchar(200), nullable
- The existing 4 order items keep both null. `product_id`, `price`, and `product_name` stay.
- `variant_name` is a snapshot written at order creation, the same way `product_name` and `price` already are. Example: `Large`. The charged price is the variant override if set, otherwise `products.price`, and that number is what `order_items.price` stores.

RESTRICT on the cart FK stops a variant delete from silently destroying a live cart line. SET NULL on the order FK keeps history if a variant is removed later; the snapshot columns still describe what was bought.

## Stock guard and decrement

`createPaymentIntent` still reads the database, never a client amount.

- Line with `variant_id` null: same check as today, `products.stock >= quantity`.
- Line with a variant: the variant must be active, belong to that `product_id`, and `product_variants.stock >= quantity`.
- On `payment_intent.succeeded`, the same `FOR UPDATE` order lock remains. Decrement the variant stock when `variant_id` is set, and decrement `products.stock` only for lines with no variant. The conditional `updateMany` (`stock >= quantity`, count must be 1) stays, so a short variant rolls the transaction back and the order stays unpaid.
- Cancelling a paid order puts the quantity back on the same place it was taken from: the variant if `order_items.variant_id` is still set, otherwise the product. If the variant was deleted and `variant_id` was set null, the cancel restores `products.stock` and the snapshot name still shows what was sold.

Idempotency does not change. A second `payment_intent.succeeded` for an order already marked paid returns without decrementing.

## Admin form

The product form gains a variant list: sku, option name, option value, price override, stock, image, active. Saving a variant does not rewrite historical `order_items`. Deleting a variant is refused with 409 while a cart row still points at it. Deleting one that only appears on old orders is allowed; those order rows keep `variant_name` and lose the live FK.

## Migration sequence

Each step is its own reviewed SQL file. None of them drop or retype an existing column.

1. `CREATE TABLE product_variants` plus its indexes and the product FK.
2. `ALTER TABLE cart_items_test ADD COLUMN variant_id uuid` (nullable) and the FK. Existing cart rows stay valid.
3. `ALTER TABLE order_items ADD COLUMN variant_id uuid` and `ADD COLUMN variant_name varchar(200)`, both nullable, plus the FK. Existing order items stay valid.

No seed. The 27 products simply have no variant rows.

## If a variant is deleted after it was ordered

The order row remains. `variant_id` becomes null because of ON DELETE SET NULL. `variant_name`, `product_name`, and `price` were copied at checkout and do not change, so the receipt and the order page still show "Blue mug / Large" at the price that was charged. Stock is not returned by the delete. Only a cancel of a paid order returns stock, and after the FK is cleared that return goes to `products.stock`, which is why the admin should deactivate a variant instead of deleting it when the product still sells that option.
