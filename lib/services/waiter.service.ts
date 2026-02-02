import { DatabaseQueries } from '../database/queries';
import { SupabaseClient } from '../database/client';
import { 
  Waiter, 
  WaiterInsert, 
  WaiterUpdate, 
  CreateWaiterRequest,
  UpdateWaiterRequest,
  WaiterWithStats,
  WaiterSelection,
  WaiterQuery
} from '../../types';
import { ValidationService } from './validation.service';

/**
 * Waiter management service
 * Handles CRUD operations for waiters with proper validation
 */
export class WaiterService {
  private queries: DatabaseQueries;

  constructor(private client: SupabaseClient) {
    this.queries = new DatabaseQueries(client);
  }

  /**
   * Create a new waiter with validation
   */
  async createWaiter(data: CreateWaiterRequest): Promise<{
    success: boolean;
    data?: Waiter;
    error?: string;
  }> {
    try {
      // Validate phone number for M-Pesa compatibility
      const phoneValidation = ValidationService.validateAndNormalizeMpesaPhone(data.phone_number);
      if (!phoneValidation.isValid) {
        return {
          success: false,
          error: phoneValidation.error
        };
      }

      // Check if phone number is already used by another waiter in the same restaurant
      const existingWaiter = await this.getWaiterByPhone(data.restaurant_id, phoneValidation.normalizedPhone!);
      if (existingWaiter.success && existingWaiter.data) {
        return {
          success: false,
          error: 'Phone number is already registered for another waiter in this restaurant'
        };
      }

      // Create waiter
      const waiterData: WaiterInsert = {
        restaurant_id: data.restaurant_id,
        name: data.name,
        phone_number: phoneValidation.normalizedPhone!,
        email: data.email || null,
        profile_photo_url: data.profile_photo_url || null,
        is_active: true,
      };

      const result = await this.queries.createWaiter(waiterData);
      
      if (result.error) {
        return {
          success: false,
          error: result.error.message
        };
      }

      return {
        success: true,
        data: result.data!
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create waiter'
      };
    }
  }

  /**
   * Get waiter by ID
   */
  async getWaiter(id: string): Promise<{
    success: boolean;
    data?: Waiter;
    error?: string;
  }> {
    try {
      const result = await this.queries.getWaiter(id);
      
      if (result.error) {
        return {
          success: false,
          error: result.error.message
        };
      }

      return {
        success: true,
        data: result.data!
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get waiter'
      };
    }
  }

  /**
   * Get waiter by phone number within a restaurant
   */
  async getWaiterByPhone(restaurantId: string, phoneNumber: string): Promise<{
    success: boolean;
    data?: Waiter;
    error?: string;
  }> {
    try {
      const { data, error } = await this.client
        .from('waiters')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .eq('phone_number', phoneNumber)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return {
            success: true,
            data: undefined
          };
        }
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get waiter'
      };
    }
  }

  /**
   * Get waiters with filtering and search
   */
  async getWaiters(query: WaiterQuery & { page?: number; limit?: number }): Promise<{
    success: boolean;
    data?: Waiter[];
    total?: number;
    error?: string;
  }> {
    try {
      let dbQuery = this.client.from('waiters').select('*', { count: 'exact' });

      // Apply filters
      if (query.restaurant_id) {
        dbQuery = dbQuery.eq('restaurant_id', query.restaurant_id);
      }

      if (query.is_active !== undefined) {
        dbQuery = dbQuery.eq('is_active', query.is_active);
      }

      if (query.search) {
        dbQuery = dbQuery.ilike('name', `%${query.search}%`);
      }

      // Apply pagination
      const page = query.page || 1;
      const limit = query.limit || 20;
      const offset = (page - 1) * limit;

      dbQuery = dbQuery
        .order('name')
        .range(offset, offset + limit - 1);

      const { data, error, count } = await dbQuery;

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data || [],
        total: count || 0
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get waiters'
      };
    }
  }

  /**
   * Get active waiters for selection (simplified data for tipping interface)
   */
  async getActiveWaitersForSelection(restaurantId: string, search?: string): Promise<{
    success: boolean;
    data?: WaiterSelection[];
    error?: string;
  }> {
    try {
      let query = this.client
        .from('waiters')
        .select('id, name, profile_photo_url')
        .eq('restaurant_id', restaurantId)
        .eq('is_active', true);

      if (search) {
        query = query.ilike('name', `%${search}%`);
      }

      const { data, error } = await query.order('name').limit(50);

      if (error) {
        return {
          success: false,
          error: error.message
        };
      }

      return {
        success: true,
        data: data || []
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get waiters for selection'
      };
    }
  }

  /**
   * Update waiter with validation
   */
  async updateWaiter(id: string, data: UpdateWaiterRequest): Promise<{
    success: boolean;
    data?: Waiter;
    error?: string;
  }> {
    try {
      // Validate phone number if provided
      if (data.phone_number) {
        const phoneValidation = ValidationService.validateAndNormalizeMpesaPhone(data.phone_number);
        if (!phoneValidation.isValid) {
          return {
            success: false,
            error: phoneValidation.error
          };
        }

        // Check if phone number is already used by another waiter
        const currentWaiter = await this.getWaiter(id);
        if (currentWaiter.success && currentWaiter.data) {
          const existingWaiter = await this.getWaiterByPhone(
            currentWaiter.data.restaurant_id, 
            phoneValidation.normalizedPhone!
          );
          if (existingWaiter.success && existingWaiter.data && existingWaiter.data.id !== id) {
            return {
              success: false,
              error: 'Phone number is already registered for another waiter in this restaurant'
            };
          }
        }

        data.phone_number = phoneValidation.normalizedPhone;
      }

      const result = await this.queries.updateWaiter(id, data);
      
      if (result.error) {
        return {
          success: false,
          error: result.error.message
        };
      }

      return {
        success: true,
        data: result.data!
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to update waiter'
      };
    }
  }

  /**
   * Activate waiter
   */
  async activateWaiter(id: string): Promise<{
    success: boolean;
    data?: Waiter;
    error?: string;
  }> {
    return this.updateWaiter(id, { is_active: true });
  }

  /**
   * Deactivate waiter
   */
  async deactivateWaiter(id: string): Promise<{
    success: boolean;
    data?: Waiter;
    error?: string;
  }> {
    return this.updateWaiter(id, { is_active: false });
  }

  /**
   * Delete waiter (soft delete by setting is_active to false)
   */
  async deleteWaiter(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const result = await this.deactivateWaiter(id);
      
      if (!result.success) {
        return {
          success: false,
          error: result.error
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete waiter'
      };
    }
  }

  /**
   * Get waiter with statistics
   */
  async getWaiterWithStats(id: string, month?: string): Promise<{
    success: boolean;
    data?: WaiterWithStats;
    error?: string;
  }> {
    try {
      // Get basic waiter data
      const waiterResult = await this.getWaiter(id);
      if (!waiterResult.success || !waiterResult.data) {
        return waiterResult;
      }

      const waiter = waiterResult.data;

      // Get statistics
      const currentMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      // Get total tips
      const { data: totalTipsData } = await this.client
        .from('tips')
        .select('amount')
        .eq('waiter_id', id)
        .eq('payment_status', 'completed');

      // Get monthly tips
      const { data: monthlyTipsData } = await this.client
        .from('tips')
        .select('amount')
        .eq('waiter_id', id)
        .eq('payment_status', 'completed')
        .gte('created_at', `${currentMonth}-01`)
        .lt('created_at', `${currentMonth}-32`);

      const totalTips = totalTipsData?.reduce((sum, tip) => sum + tip.amount, 0) || 0;
      const monthlyTips = monthlyTipsData?.reduce((sum, tip) => sum + tip.amount, 0) || 0;
      const tipCount = totalTipsData?.length || 0;

      const waiterWithStats: WaiterWithStats = {
        ...waiter,
        total_tips: totalTips,
        monthly_tips: monthlyTips,
        tip_count: tipCount,
      };

      return {
        success: true,
        data: waiterWithStats
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get waiter statistics'
      };
    }
  }

  /**
   * Validate phone number for M-Pesa compatibility
   */
  validatePhoneNumber(phoneNumber: string): {
    isValid: boolean;
    normalizedPhone?: string;
    error?: string;
  } {
    return ValidationService.validateAndNormalizeMpesaPhone(phoneNumber);
  }

  /**
   * Check if phone number is available for a restaurant
   */
  async isPhoneNumberAvailable(restaurantId: string, phoneNumber: string, excludeId?: string): Promise<{
    available: boolean;
    error?: string;
  }> {
    try {
      // Normalize phone number first
      const phoneValidation = ValidationService.validateAndNormalizeMpesaPhone(phoneNumber);
      if (!phoneValidation.isValid) {
        return {
          available: false,
          error: phoneValidation.error
        };
      }

      let query = this.client
        .from('waiters')
        .select('id')
        .eq('restaurant_id', restaurantId)
        .eq('phone_number', phoneValidation.normalizedPhone!);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - phone number is available
          return { available: true };
        }
        return {
          available: false,
          error: error.message
        };
      }

      return { available: false };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Failed to check phone number availability'
      };
    }
  }
}