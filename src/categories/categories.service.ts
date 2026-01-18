import { Injectable } from '@nestjs/common';
import { supabase } from '../supabase/supabase.client';
@Injectable()
export class CategoriesService {
  async getCategories() {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('name');
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
}
