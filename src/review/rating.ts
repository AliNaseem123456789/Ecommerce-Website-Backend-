export async function recalculateProductRating(tx: any, productId: number) {
  const agg = await tx.product_reviews.aggregate({
    where: { product_id: productId },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const avg = agg._avg.rating ? Number(agg._avg.rating.toString()) : 0;
  const avg_rating = Math.round(avg * 100) / 100;
  await tx.products.update({
    where: { product_id: productId },
    data: { avg_rating },
  });
  return { avg_rating, review_count: agg._count._all as number };
}
