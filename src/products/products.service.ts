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
  async findOne(id: number) {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('product_id', id)
      .single();

    if (error) throw new Error(error.message);
    return data;
  }

  async searchProducts(searchParams: any) {
    const { q, category, minPrice, maxPrice, sortBy } = searchParams;
    let query = supabase.from('products').select('*');

    if (q) {
      query = query.or(`name.ilike.%${q}%,description.ilike.%${q}%`);
    }
    if (category) {
      query = query.eq('category_id', category);
    }
    if (minPrice) {
      query = query.gte('price', parseFloat(minPrice));
    }
    if (maxPrice) {
      query = query.lte('price', parseFloat(maxPrice));
    }

    switch (sortBy) {
      case 'price_asc':
        query = query.order('price', { ascending: true });
        break;
      case 'price_desc':
        query = query.order('price', { ascending: false });
        break;
      case 'name_asc':
        query = query.order('name', { ascending: true });
        break;
      case 'name_desc':
        query = query.order('name', { ascending: false });
        break;
      case 'rating_desc':
        query = query.order('avg_rating', { ascending: false });
        break;
      default:
        query = query.order('created_at', { ascending: false });
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data;
  }
  async getSuggestions(searchTerm: string) {
    console.log('getSuggestions called with:', searchTerm);

    if (!searchTerm || searchTerm.length < 2) {
      return [];
    }

    const { data, error } = await supabase
      .from('products')
      .select('product_id, name, price')
      .or(`name.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%`)
      .limit(5);

    if (error) {
      console.error('Suggestions error:', error);
      return [];
    }
    const productsWithImages = data.map((product) => {
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
        image_url: image_url,
      };
    });

    console.log('Suggestions found:', productsWithImages.length);
    return productsWithImages;
  }
}
