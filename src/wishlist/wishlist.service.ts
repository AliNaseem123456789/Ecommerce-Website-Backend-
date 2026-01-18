import { Injectable } from '@nestjs/common';
import { supabase } from 'src/supabase/supabase.client';
@Injectable()
export class WishlistService {
  async getWishlist(userId: string) {
    const { data, error } = await supabase
      .from('wishlist_test')
      .select('product_id')
      .eq('user_id', userId);

    if (error) throw error;
    return data.map((item) => item.product_id);
  }
  async toggle(userId: string, productId: string) {
    const { data: existing } = await supabase
      .from('wishlist_test')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (existing) {
      await supabase
        .from('wishlist_test')
        .delete()
        .eq('user_id', userId)
        .eq('product_id', productId);
      return { action: 'removed', productId };
    } else {
      await supabase
        .from('wishlist_test')
        .insert({ user_id: userId, product_id: productId });
      return { action: 'added', productId };
    }
  }
  async getWishlistWithDetails(userId: string) {
    const { data, error } = await supabase
      .from('wishlist_test')
      .select(
        `
        products (
          product_id,
          name,
          price,
          description
        )
      `,
      )
      .eq('user_id', userId);
    if (error) throw error;
    return data.map((item: any) => item.products).filter((p) => p !== null);
  }
}
