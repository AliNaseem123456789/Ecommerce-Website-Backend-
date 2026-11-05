-- CreateTable
CREATE TABLE "order_requests" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "user_id" UUID,
    "type" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'open',
    "reason" TEXT,
    "item_ids" BIGINT[] DEFAULT ARRAY[]::BIGINT[],
    "admin_note" TEXT,
    "created_at" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolved_at" TIMESTAMP(6),

    CONSTRAINT "order_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "order_requests_order_id_idx" ON "order_requests"("order_id");

-- CreateIndex
CREATE INDEX "order_requests_status_idx" ON "order_requests"("status");

-- At most one open request of each type per order
CREATE UNIQUE INDEX "order_requests_one_open_per_type" ON "order_requests"("order_id", "type") WHERE "status" = 'open';

-- AddForeignKey
ALTER TABLE "order_requests" ADD CONSTRAINT "order_requests_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("order_id") ON DELETE CASCADE ON UPDATE NO ACTION;
