import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async getCategories() {
    return this.prisma.categories.findMany({
      orderBy: { name: 'asc' },
    });
  }

  /** Top-level categories with their subcategories nested underneath. */
  async getTree() {
    const rows = await this.prisma.categories.findMany({
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
    const byParent = new Map<number | null, typeof rows>();
    for (const row of rows) {
      const key = row.parent_id ?? null;
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key)!.push(row);
    }
    return (byParent.get(null) || []).map((parent) => ({
      ...parent,
      children: byParent.get(parent.category_id) || [],
    }));
  }

  /** Categories flagged for the landing page, in display order. */
  async getFeatured() {
    return this.prisma.categories.findMany({
      where: { featured: true },
      orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    });
  }
}
