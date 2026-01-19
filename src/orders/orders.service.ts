import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from '../supabase/supabase.client';

@Injectable()
export class OrderService {
  async getUserOrders(userId: string) {
    const { data, error } = await supabase
      .from('orders')
      .select(
        `
        order_id,
        total,
        created_at,
        order_items ( 
          quantity, 
          price, 
          products(name) 
        ),
        shipping_address (*)
      `,
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new BadRequestException(error.message);
    }

    return data;
  }
  async createOrder(userId: string, orderData: any) {
    const { subtotal, shipping, total, form, items } = orderData;

    // 1. Create the main Order
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert([{ user_id: userId, subtotal, shipping, total }])
      .select()
      .single();

    if (orderErr) throw new Error(orderErr.message);

    // 2. Save Shipping Address
    const { error: addrErr } = await supabase
      .from('shipping_address')
      .insert([{ order_id: order.order_id, ...form }]);

    if (addrErr) throw new Error(addrErr.message);

    // 3. Save Order Items
    const orderItems = items.map((item) => ({
      order_id: order.order_id,
      product_id: item.products.product_id,
      quantity: item.quantity,
      price: item.products.price,
    }));

    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsErr) throw new Error(itemsErr.message);

    return order;
  }
}
