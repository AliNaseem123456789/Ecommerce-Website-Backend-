-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "cart_items_test" (
    "cart_item_id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" INTEGER,
    "quantity" INTEGER DEFAULT 1,
    "added_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cart_items_test_pkey" PRIMARY KEY ("cart_item_id")
);

-- CreateTable
CREATE TABLE "categories" (
    "category_id" SERIAL NOT NULL,
    "name" VARCHAR(100) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("category_id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "item_id" BIGSERIAL NOT NULL,
    "order_id" UUID,
    "product_id" INTEGER,
    "quantity" INTEGER DEFAULT 1,
    "price" DECIMAL(10,2),

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("item_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "order_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID,
    "status" TEXT DEFAULT 'pending',
    "subtotal" DECIMAL(10,2),
    "shipping" DECIMAL(10,2),
    "tax" DECIMAL(10,2),
    "total" DECIMAL(10,2),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("order_id")
);

-- CreateTable
CREATE TABLE "product_questions" (
    "question_id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "question" TEXT NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_questions_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "product_reviews" (
    "review_id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "name" VARCHAR(100) NOT NULL,
    "email" VARCHAR(100) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "review" TEXT NOT NULL,
    "rating" DECIMAL(2,1) NOT NULL,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_reviews_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "products" (
    "product_id" SERIAL NOT NULL,
    "category_id" INTEGER,
    "name" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "price" DECIMAL(10,2) NOT NULL,
    "stock" INTEGER DEFAULT 0,
    "avg_rating" DECIMAL(3,2) DEFAULT 0,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "shipping_address" (
    "address_id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID,
    "first_name" TEXT,
    "last_name" TEXT,
    "email" TEXT,
    "phone" TEXT,
    "street" TEXT,
    "apartment" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shipping_address_pkey" PRIMARY KEY ("address_id")
);

-- CreateTable
CREATE TABLE "users_test" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT,
    "role" TEXT DEFAULT 'customer',
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,

    CONSTRAINT "users_test_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "wishlist_test" (
    "wishlist_item_id" BIGSERIAL NOT NULL,
    "user_id" TEXT NOT NULL,
    "product_id" INTEGER NOT NULL,
    "added_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "wishlist_test_pkey" PRIMARY KEY ("wishlist_item_id")
);

-- CreateTable
CREATE TABLE "user_addresses" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "user_id" UUID,
    "type" TEXT,
    "first_name" TEXT,
    "last_name" TEXT,
    "company" TEXT,
    "country" TEXT,
    "street" TEXT,
    "apartment" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postal_code" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_addresses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "users_test_email_key" ON "users_test"("email");

-- CreateIndex
CREATE UNIQUE INDEX "unique_user_address_type" ON "user_addresses"("user_id", "type");

-- AddForeignKey
ALTER TABLE "cart_items_test" ADD CONSTRAINT "cart_items_test_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users_test"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_questions" ADD CONSTRAINT "product_questions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_reviews" ADD CONSTRAINT "product_reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("category_id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "shipping_address" ADD CONSTRAINT "shipping_address_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "wishlist_test" ADD CONSTRAINT "wishlist_test_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("product_id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "user_addresses" ADD CONSTRAINT "user_addresses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users_test"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
