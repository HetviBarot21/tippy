import { DatabaseQueries } from '../database/queries';
import { SupabaseClient } from '../database/client';
import { 
  Restaurant, 
  RestaurantInsert, 
  RestaurantUpdate, 
  CreateRestaurantRequest,
  UpdateRestaurantRequest,
  RestaurantWithStats,
  defaultDistributionGroups
} from '../../types';
import { ValidationService } from './validation.service';

/**
 * Restaurant management service
 * Handles CRUD operations for restaurants with proper validation
 */
export class RestaurantService {
  private queries: DatabaseQueries;

  constructor(private client: SupabaseClient) {
    this.queries = new DatabaseQueries(client);
  }

  /**
   * Create a new restaurant with validation
   */
  async createRestaurant(data: CreateRestaurantRequest): Promise<{
    success: boolean;
    data?: Restaurant;
    error?: string;
  }> {
    try {
      // Validate slug
      const slugValidation = ValidationService.validateRestaurantSlug(data.slug);
      if (!slugValidation.isValid) {
        return {
          success: false,
          error: slugValidation.error
        };
      }

      // Validate commission rate if provided
      if (data.commission_rate !== undefined) {
        const commissionValidation = ValidationService.validateCommissionRate(data.commission_rate);
        if (!commissionValidation.isValid) {
          return {
            success: false,
            error: commissionValidation.error
          };
        }
      }

      // Validate phone number if provided
      if (data.phone_number) {
        const phoneValidation = ValidationService.validateAndNormalizeMpesaPhone(data.phone_number);
        if (!phoneValidation.isValid) {
          return {
            success: false,
            error: phoneValidation.error
          };
        }
        data.phone_number = phoneValidation.normalizedPhone;
      }

      // Check if slug is already taken
      const existingRestaurant = await this.getRestaurantBySlug(data.slug);
      if (existingRestaurant.success && existingRestaurant.data) {
        return {
          success: false,
          error: 'Restaurant slug is already taken'
        };
      }

      // Create restaurant
      const restaurantData: RestaurantInsert = {
        name: data.name,
        slug: data.slug,
        email: data.email,
        phone_number: data.phone_number || null,
        address: data.address || null,
        commission_rate: data.commission_rate || 10,
        is_active: true,
      };

      const result = await this.queries.createRestaurant(restaurantData);
      
      if (result.error) {
        return {
          success: false,
          error: result.error.message
        };
      }

      // Create default distribution groups for the restaurant
      if (result.data) {
        await this.createDefaultDistributionGroups(result.data.id);
      }

      return {
        success: true,
        data: result.data!
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create restaurant'
      };
    }
  }

  /**
   * Get restaurant by ID
   */
  async getRestaurant(id: string): Promise<{
    success: boolean;
    data?: Restaurant;
    error?: string;
  }> {
    try {
      const result = await this.queries.getRestaurant(id);
      
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
        error: error instanceof Error ? error.message : 'Failed to get restaurant'
      };
    }
  }

  /**
   * Get restaurant by slug
   */
  async getRestaurantBySlug(slug: string): Promise<{
    success: boolean;
    data?: Restaurant;
    error?: string;
  }> {
    try {
      const { data, error } = await this.client
        .from('restaurants')
        .select('*')
        .eq('slug', slug)
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
        error: error instanceof Error ? error.message : 'Failed to get restaurant'
      };
    }
  }

  /**
   * Update restaurant with validation
   */
  async updateRestaurant(id: string, data: UpdateRestaurantRequest): Promise<{
    success: boolean;
    data?: Restaurant;
    error?: string;
  }> {
    try {
      // Validate commission rate if provided
      if (data.commission_rate !== undefined) {
        const commissionValidation = ValidationService.validateCommissionRate(data.commission_rate);
        if (!commissionValidation.isValid) {
          return {
            success: false,
            error: commissionValidation.error
          };
        }
      }

      // Validate phone number if provided
      if (data.phone_number) {
        const phoneValidation = ValidationService.validateAndNormalizeMpesaPhone(data.phone_number);
        if (!phoneValidation.isValid) {
          return {
            success: false,
            error: phoneValidation.error
          };
        }
        data.phone_number = phoneValidation.normalizedPhone;
      }

      const result = await this.queries.updateRestaurant(id, data);
      
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
        error: error instanceof Error ? error.message : 'Failed to update restaurant'
      };
    }
  }

  /**
   * Delete restaurant (soft delete by setting is_active to false)
   */
  async deleteRestaurant(id: string): Promise<{
    success: boolean;
    error?: string;
  }> {
    try {
      const result = await this.queries.updateRestaurant(id, { is_active: false });
      
      if (result.error) {
        return {
          success: false,
          error: result.error.message
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to delete restaurant'
      };
    }
  }

  /**
   * Get restaurant with statistics
   */
  async getRestaurantWithStats(id: string, month?: string): Promise<{
    success: boolean;
    data?: RestaurantWithStats;
    error?: string;
  }> {
    try {
      // Get basic restaurant data
      const restaurantResult = await this.getRestaurant(id);
      if (!restaurantResult.success || !restaurantResult.data) {
        return restaurantResult;
      }

      const restaurant = restaurantResult.data;

      // Get statistics
      const currentMonth = month || new Date().toISOString().slice(0, 7); // YYYY-MM format
      
      // Get total tips
      const { data: totalTipsData } = await this.client
        .from('tips')
        .select('amount')
        .eq('restaurant_id', id)
        .eq('payment_status', 'completed');

      // Get monthly tips
      const { data: monthlyTipsData } = await this.client
        .from('tips')
        .select('amount')
        .eq('restaurant_id', id)
        .eq('payment_status', 'completed')
        .gte('created_at', `${currentMonth}-01`)
        .lt('created_at', `${currentMonth}-32`);

      // Get waiter count
      const { count: waiterCount } = await this.client
        .from('waiters')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', id)
        .eq('is_active', true);

      // Get table count
      const { count: tableCount } = await this.client
        .from('qr_codes')
        .select('*', { count: 'exact', head: true })
        .eq('restaurant_id', id)
        .eq('is_active', true);

      const totalTips = totalTipsData?.reduce((sum, tip) => sum + tip.amount, 0) || 0;
      const monthlyTips = monthlyTipsData?.reduce((sum, tip) => sum + tip.amount, 0) || 0;

      const restaurantWithStats: RestaurantWithStats = {
        ...restaurant,
        total_tips: totalTips,
        total_waiters: waiterCount || 0,
        total_tables: tableCount || 0,
        monthly_tips: monthlyTips,
      };

      return {
        success: true,
        data: restaurantWithStats
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get restaurant statistics'
      };
    }
  }

  /**
   * Create default distribution groups for a new restaurant
   */
  private async createDefaultDistributionGroups(restaurantId: string): Promise<void> {
    try {
      const groups = defaultDistributionGroups.map(group => ({
        restaurant_id: restaurantId,
        group_name: group.group_name,
        percentage: group.percentage,
      }));

      await this.client
        .from('distribution_groups')
        .insert(groups);
    } catch (error) {
      // Log error but don't fail restaurant creation
      console.error('Failed to create default distribution groups:', error);
    }
  }

  /**
   * Validate restaurant slug availability
   */
  async isSlugAvailable(slug: string, excludeId?: string): Promise<{
    available: boolean;
    error?: string;
  }> {
    try {
      let query = this.client
        .from('restaurants')
        .select('id')
        .eq('slug', slug);

      if (excludeId) {
        query = query.neq('id', excludeId);
      }

      const { data, error } = await query.single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned - slug is available
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
        error: error instanceof Error ? error.message : 'Failed to check slug availability'
      };
    }
  }
}