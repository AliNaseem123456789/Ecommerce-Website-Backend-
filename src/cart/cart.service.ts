import { Injectable } from '@nestjs/common';
import { supabase } from 'src/supabase/supabase.client';

@Injectable()
export class CartService {
  async getCart(userId: string) {
    const { data, error } = await supabase
      .from('cart_items_test')
      .select(`cart_item_id, quantity, products(*)`)
      .eq('user_id', userId);

    if (error) throw new Error(error.message);
    return data;
  }

  async addItem(userId: string, productId: string, quantity: number) {
    const { data: existing } = await supabase
      .from('cart_items_test')
      .select('*')
      .eq('user_id', userId)
      .eq('product_id', productId)
      .single();

    if (existing) {
      return await supabase
        .from('cart_items_test')
        .update({ quantity: existing.quantity + quantity })
        .eq('cart_item_id', existing.cart_item_id)
        .select()
        .single();
    }

    return await supabase
      .from('cart_items_test')
      .insert({ user_id: userId, product_id: productId, quantity })
      .select(`cart_item_id, quantity, products(*)`)
      .single();
  }

  async updateQty(cartItemId: string, quantity: number) {
    return await supabase
      .from('cart_items_test')
      .update({ quantity })
      .eq('cart_item_id', cartItemId);
  }

  async removeItem(cartItemId: string) {
    return await supabase
      .from('cart_items_test')
      .delete()
      .eq('cart_item_id', cartItemId);
  }
  async mergeCarts(guestId: string, userId: string) {
    const { data: guestItems } = await supabase
      .from('cart_items_test')
      .select('*')
      .eq('user_id', guestId);
    if (!guestItems || guestItems.length === 0) return;
    for (const item of guestItems) {
      await this.addItem(userId, item.product_id, item.quantity);
    }
    await supabase.from('cart_items_test').delete().eq('user_id', guestId);
    return { success: true };
  }
}
