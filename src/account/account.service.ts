import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
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
  async deleteAddress(userId: string, addressId: string) {
    const { data: existing, error: findError } = await supabase
      .from('user_addresses')
      .select('id')
      .eq('id', addressId)
      .eq('user_id', userId)
      .single();

    if (findError || !existing) {
      throw new NotFoundException(
        `Address with ID ${addressId} not found for this user`,
      );
    }
    const { error: deleteError } = await supabase
      .from('user_addresses')
      .delete()
      .eq('id', addressId)
      .eq('user_id', userId);

    if (deleteError) {
      throw new BadRequestException(
        `Failed to delete address: ${deleteError.message}`,
      );
    }

    return {
      success: true,
      message: 'Address deleted successfully',
      deletedId: addressId,
    };
  }
}
