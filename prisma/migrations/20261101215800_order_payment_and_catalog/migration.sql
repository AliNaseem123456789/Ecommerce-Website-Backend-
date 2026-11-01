-- AlterTable
ALTER TABLE "order_items" ADD COLUMN     "product_name" VARCHAR(200);

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cancelled_at" TIMESTAMP(6),
ADD COLUMN     "delivered_at" TIMESTAMP(6),
ADD COLUMN     "paid_at" TIMESTAMP(6),
ADD COLUMN     "payment_intent_id" TEXT,
ADD COLUMN     "payment_method" TEXT,
ADD COLUMN     "payment_status" TEXT DEFAULT 'unpaid',
ADD COLUMN     "shipped_at" TIMESTAMP(6);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "image_url" TEXT;

-- AlterTable
ALTER TABLE "user_addresses" ADD COLUMN     "is_default" BOOLEAN DEFAULT false;

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(6) NOT NULL,
    "used_at" TIMESTAMP(6),
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_answers" (
    "id" SERIAL NOT NULL,
    "question_id" INTEGER NOT NULL,
    "answer" TEXT NOT NULL,
    "answered_by" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_answers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "password_reset_tokens_user_id_idx" ON "password_reset_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_payment_intent_id_key" ON "orders"("payment_intent_id");

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users_test"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_answers" ADD CONSTRAINT "product_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "product_questions"("question_id") ON DELETE CASCADE ON UPDATE NO ACTION;
