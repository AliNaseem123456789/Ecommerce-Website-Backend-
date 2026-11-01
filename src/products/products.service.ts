import { Injectable } from '@nestjs/common';
import { Prisma } from '../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { supabase } from '../supabase/supabase.client';
import { ListProductsDto } from './dto/list-products.dto';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async getFeatured(idsString: string) {
    if (!idsString) return [];

    const ids = idsString.split(',').map(Number);
    return this.prisma.products.findMany({
      where: { product_id: { in: ids } },
    });
  }

  async findManyByIds(ids: number[]) {
    if (ids.length === 0) return [];

    return this.prisma.products.findMany({
      where: { product_id: { in: ids } },
    });
  }

  async getProducts(query: ListProductsDto) {
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 12, 60);
    const where: Prisma.productsWhereInput = {};
    if (query.categories) {
      where.category_id = { in: query.categories.split(',').map(Number) };
    }
    if (query.minPrice != null || query.maxPrice != null) {
      where.price = {};
      if (query.minPrice != null) where.price.gte = query.minPrice;
      if (query.maxPrice != null) where.price.lte = query.maxPrice;
    }

    const sort = query.sort || query.sortBy;
    let orderBy: Prisma.productsOrderByWithRelationInput | undefined;
    if (sort === 'price_asc') orderBy = { price: 'asc' };
    if (sort === 'price_desc') orderBy = { price: 'desc' };
    if (sort === 'rating' || sort === 'rating_desc') orderBy = { avg_rating: 'desc' };
    if (sort === 'name_asc') orderBy = { name: 'asc' };
    if (sort === 'name_desc') orderBy = { name: 'desc' };

    const [total, items] = await Promise.all([
      this.prisma.products.count({ where }),
      this.prisma.products.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const product = await this.prisma.products.findUnique({
      where: { product_id: id },
    });
    if (!product) {
      throw new Error(
        'JSON object requested, multiple (or no) rows returned',
      );
    }
    return product;
  }

  async searchProducts(searchParams: any) {
    const { q, category, minPrice, maxPrice, sortBy } = searchParams;
    const where: Prisma.productsWhereInput = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (category) where.category_id = Number(category);
    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice) where.price.gte = parseFloat(minPrice);
      if (maxPrice) where.price.lte = parseFloat(maxPrice);
    }

    let orderBy: Prisma.productsOrderByWithRelationInput = {
      created_at: 'desc',
    };
    switch (sortBy) {
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'name_asc':
        orderBy = { name: 'asc' };
        break;
      case 'name_desc':
        orderBy = { name: 'desc' };
        break;
      case 'rating_desc':
        orderBy = { avg_rating: 'desc' };
        break;
    }

    return this.prisma.products.findMany({ where, orderBy });
  }

  async getSuggestions(searchTerm: string) {
    console.log('getSuggestions called with:', searchTerm);

    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    let rows;
    try {
      rows = await this.prisma.products.findMany({
        where: {
          OR: [
            { name: { contains: searchTerm, mode: 'insensitive' } },
            { description: { contains: searchTerm, mode: 'insensitive' } },
          ],
        },
        select: { product_id: true, name: true, price: true },
        take: 5,
      });
    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }

    return rows.map((product) => {
      let image_url: string | null = null;
      try {
        const { data: imageData } = supabase.storage
          .from('products')
          .getPublicUrl(`${product.product_id}-1.jpeg`);
        image_url = imageData.publicUrl;
      } catch (err) {
        console.log(`No image found for product ${product.product_id}`);
      }

      return {
        product_id: product.product_id,
        name: product.name,
        price: product.price,
        image_url,
      };
    });
  }
}
