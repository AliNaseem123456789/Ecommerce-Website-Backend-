import { Injectable } from '@nestjs/common';
import { supabase } from '../supabase/supabase.client';

@Injectable()
export class ProductsService {
  async getFeatured(idsString: string) {
    if (!idsString) return [];

    const ids = idsString.split(',').map(Number);

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('product_id', ids);

    if (error) throw new Error(error.message);
    return data;
  }

  async findManyByIds(ids: number[]) {
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .in('product_id', ids);

    if (error) {
      throw new Error(`Wishlist Fetch Error: ${error.message}`);
    }

    return data;
  }
  async getProducts({
    categories,
    sort,
  }: {
    categories?: string;
    sort?: string;
  }) {
    let query = supabase.from('products').select('*');

    if (categories) {
      const ids = categories.split(',').map(Number);
      query = query.in('category_id', ids);
    }

    if (sort === 'price_asc') {
      query = query.order('price', { ascending: true });
    }

    if (sort === 'price_desc') {
      query = query.order('price', { ascending: false });
    }

    if (sort === 'rating') {
      query = query.order('avg_rating', { ascending: false });
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }
}
