import { SupabaseClient } from './client';
import { QueryResult, QueryListResult, TenantContext } from './types';
import { 
  Restaurant, RestaurantInsert, RestaurantUpdate,
  Waiter, WaiterInsert, WaiterUpdate,
  Tip, TipInsert, TipUpdate,
  QRCode, QRCodeInsert, QRCodeUpdate,
  Payout, PayoutInsert, PayoutUpdate,
  DistributionGroup, DistributionGroupInsert, DistributionGroupUpdate
} from '../../types';

// Base query helper class with tenant context
export class DatabaseQueries {
  constructor(
    private client: SupabaseClient,
    private tenantContext?: TenantContext
  ) {}

  // Set tenant context for RLS
  async setTenantContext(context: TenantContext): Promise<void> {
    this.tenantContext = context;
    // Set the tenant context in the database session
    await this.client.rpc('set_config', {
      setting_name: 'app.current_tenant',
      setting_value: context.restaurant_id,
      is_local: true
    });
  }

  // Restaurant queries
  async getRestaurant(id: string): Promise<QueryResult<Restaurant>> {
    const { data, error } = await this.client
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  }

  async createRestaurant(restaurant: RestaurantInsert): Promise<QueryResult<Restaurant>> {
    const { data, error } = await this.client
      .from('restaurants')
      .insert(restaurant)
      .select()
      .single();

    return { data, error };
  }

  async updateRestaurant(id: string, updates: RestaurantUpdate): Promise<QueryResult<Restaurant>> {
    const { data, error } = await this.client
      .from('restaurants')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  async deleteRestaurant(id: string): Promise<QueryResult<null>> {
    const { error } = await this.client
      .from('restaurants')
      .delete()
      .eq('id', id);

    return { data: null, error };
  }

  // Waiter queries
  async getWaiters(restaurantId?: string): Promise<QueryListResult<Waiter>> {
    let query = this.client.from('waiters').select('*');
    
    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    const { data, error, count } = await query.order('name');
    return { data, error, count };
  }

  async getWaiter(id: string): Promise<QueryResult<Waiter>> {
    const { data, error } = await this.client
      .from('waiters')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  }

  async createWaiter(waiter: WaiterInsert): Promise<QueryResult<Waiter>> {
    const { data, error } = await this.client
      .from('waiters')
      .insert(waiter)
      .select()
      .single();

    return { data, error };
  }

  async updateWaiter(id: string, updates: WaiterUpdate): Promise<QueryResult<Waiter>> {
    const { data, error } = await this.client
      .from('waiters')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  async deleteWaiter(id: string): Promise<QueryResult<null>> {
    const { error } = await this.client
      .from('waiters')
      .delete()
      .eq('id', id);

    return { data: null, error };
  }

  // Tip queries
  async getTips(filters?: {
    restaurant_id?: string;
    waiter_id?: string;
    payment_status?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<QueryListResult<Tip>> {
    let query = this.client.from('tips').select('*');

    if (filters?.restaurant_id) {
      query = query.eq('restaurant_id', filters.restaurant_id);
    }
    if (filters?.waiter_id) {
      query = query.eq('waiter_id', filters.waiter_id);
    }
    if (filters?.payment_status) {
      query = query.eq('payment_status', filters.payment_status);
    }
    if (filters?.start_date) {
      query = query.gte('created_at', filters.start_date);
    }
    if (filters?.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });
    return { data, error, count };
  }

  async getTip(id: string): Promise<QueryResult<Tip>> {
    const { data, error } = await this.client
      .from('tips')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  }

  async createTip(tip: TipInsert): Promise<QueryResult<Tip>> {
    const { data, error } = await this.client
      .from('tips')
      .insert(tip)
      .select()
      .single();

    return { data, error };
  }

  async updateTip(id: string, updates: TipUpdate): Promise<QueryResult<Tip>> {
    const { data, error } = await this.client
      .from('tips')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  // QR Code queries
  async getQRCodes(restaurantId?: string): Promise<QueryListResult<QRCode>> {
    let query = this.client.from('qr_codes').select('*');
    
    if (restaurantId) {
      query = query.eq('restaurant_id', restaurantId);
    }

    const { data, error, count } = await query.order('table_number');
    return { data, error, count };
  }

  async getQRCode(id: string): Promise<QueryResult<QRCode>> {
    const { data, error } = await this.client
      .from('qr_codes')
      .select('*')
      .eq('id', id)
      .single();

    return { data, error };
  }

  async createQRCode(qrCode: QRCodeInsert): Promise<QueryResult<QRCode>> {
    const { data, error } = await this.client
      .from('qr_codes')
      .insert(qrCode)
      .select()
      .single();

    return { data, error };
  }

  async updateQRCode(id: string, updates: QRCodeUpdate): Promise<QueryResult<QRCode>> {
    const { data, error } = await this.client
      .from('qr_codes')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  // Payout queries
  async getPayouts(filters?: {
    restaurant_id?: string;
    waiter_id?: string;
    payout_month?: string;
    status?: string;
  }): Promise<QueryListResult<Payout>> {
    let query = this.client.from('payouts').select('*');

    if (filters?.restaurant_id) {
      query = query.eq('restaurant_id', filters.restaurant_id);
    }
    if (filters?.waiter_id) {
      query = query.eq('waiter_id', filters.waiter_id);
    }
    if (filters?.payout_month) {
      query = query.eq('payout_month', filters.payout_month);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error, count } = await query.order('created_at', { ascending: false });
    return { data, error, count };
  }

  async createPayout(payout: PayoutInsert): Promise<QueryResult<Payout>> {
    const { data, error } = await this.client
      .from('payouts')
      .insert(payout)
      .select()
      .single();

    return { data, error };
  }

  async updatePayout(id: string, updates: PayoutUpdate): Promise<QueryResult<Payout>> {
    const { data, error } = await this.client
      .from('payouts')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  // Distribution Group queries
  async getDistributionGroups(restaurantId: string): Promise<QueryListResult<DistributionGroup>> {
    const { data, error, count } = await this.client
      .from('distribution_groups')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('group_name');

    return { data, error, count };
  }

  async createDistributionGroup(group: DistributionGroupInsert): Promise<QueryResult<DistributionGroup>> {
    const { data, error } = await this.client
      .from('distribution_groups')
      .insert(group)
      .select()
      .single();

    return { data, error };
  }

  async updateDistributionGroup(id: string, updates: DistributionGroupUpdate): Promise<QueryResult<DistributionGroup>> {
    const { data, error } = await this.client
      .from('distribution_groups')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    return { data, error };
  }

  async deleteDistributionGroup(id: string): Promise<QueryResult<null>> {
    const { error } = await this.client
      .from('distribution_groups')
      .delete()
      .eq('id', id);

    return { data: null, error };
  }
}