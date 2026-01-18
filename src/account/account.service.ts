import { Injectable, BadRequestException } from '@nestjs/common';
import { supabase } from 'src/supabase/supabase.client';

@Injectable()
export class AccountService {
  async getAddresses(userId: string) {
    const { data, error } = await supabase
      .from('user_addresses')
      .select('*')
      .eq('user_id', userId);

    if (error) throw new BadRequestException(error.message);
    return data;
  }
  async upsertAddress(userId: string, type: string, formData: any) {
    const { data, error } = await supabase
      .from('user_addresses')
      .upsert(
        {
          user_id: userId,
          type: type,
          ...formData,
        },
        { onConflict: 'user_id, type' },
      )
      .select()
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }
}
