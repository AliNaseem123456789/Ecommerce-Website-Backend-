import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from 'src/supabase/supabase.client';

@Injectable()
export class QuestionService {
  async createQuestion(productId: string, formData: any) {
    const { data, error } = await supabase
      .from('product_questions')
      .insert([
        {
          product_id: productId,
          ...formData,
        },
      ])
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async getQuestionsByProduct(productId: string) {
    const { data, error } = await supabase
      .from('product_questions')
      .select('*')
      .eq('product_id', productId)
      .order('created_at', { ascending: false });

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
