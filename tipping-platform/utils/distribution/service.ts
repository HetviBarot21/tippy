import { createClient } from '@/utils/supabase/server';
import { Tables, TablesInsert, TablesUpdate } from '@/types_db';

type DistributionGroup = Tables<'distribution_groups'>;
type DistributionGroupInsert = TablesInsert<'distribution_groups'>;
type DistributionGroupUpdate = TablesUpdate<'distribution_groups'>;
type TipDistribution = Tables<'tip_distributions'>;
type TipDistributionInsert = TablesInsert<'tip_distributions'>;

export interface DistributionGroupConfig {
  id?: string;
  groupName: string;
  percentage: number;
}

export interface DistributionValidationResult {
  isValid: boolean;
  errors: string[];
  totalPercentage: number;
}

export class DistributionService {
  /**
   * Get all distribution groups for a restaurant
   */
  async getDistributionGroups(restaurantId: string): Promise<DistributionGroup[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('distribution_groups')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('group_name');

    if (error) {
      console.error('Error fetching distribution groups:', error);
      throw new Error('Failed to fetch distribution groups');
    }

    return data || [];
  }

  /**
   * Validate distribution group configuration
   */
  validateDistributionGroups(groups: DistributionGroupConfig[]): DistributionValidationResult {
    const errors: string[] = [];
    let totalPercentage = 0;

    // Check for empty groups
    if (groups.length === 0) {
      errors.push('At least one distribution group is required');
      return { isValid: false, errors, totalPercentage: 0 };
    }

    // Validate each group
    groups.forEach((group, index) => {
      // Check group name
      if (!group.groupName || group.groupName.trim().length === 0) {
        errors.push(`Group ${index + 1}: Group name is required`);
      } else if (group.groupName.trim().length > 50) {
        errors.push(`Group ${index + 1}: Group name must be 50 characters or less`);
      }

      // Check percentage
      if (typeof group.percentage !== 'number') {
        errors.push(`Group ${index + 1}: Percentage must be a number`);
      } else if (group.percentage < 0) {
        errors.push(`Group ${index + 1}: Percentage cannot be negative`);
      } else if (group.percentage > 100) {
        errors.push(`Group ${index + 1}: Percentage cannot exceed 100%`);
      } else {
        // Check for at most 2 decimal places
        const decimalPlaces = (group.percentage.toString().split('.')[1] || '').length;
        if (decimalPlaces > 2) {
          errors.push(`Group ${index + 1}: Percentage can have at most 2 decimal places`);
        }
      }

      totalPercentage += group.percentage || 0;
    });

    // Check for duplicate group names
    const groupNames = groups.map(g => g.groupName.trim().toLowerCase());
    const duplicates = groupNames.filter((name, index) => groupNames.indexOf(name) !== index);
    if (duplicates.length > 0) {
      errors.push(`Duplicate group names found: ${Array.from(new Set(duplicates)).join(', ')}`);
    }

    // Check total percentage
    const roundedTotal = Math.round(totalPercentage * 100) / 100;
    if (Math.abs(roundedTotal - 100) > 0.01) {
      errors.push(`Total percentage must equal 100% (currently ${roundedTotal}%)`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      totalPercentage: roundedTotal
    };
  }

  /**
   * Update distribution groups for a restaurant
   */
  async updateDistributionGroups(
    restaurantId: string, 
    groups: DistributionGroupConfig[]
  ): Promise<DistributionGroup[]> {
    try {
      const supabase = createClient();
      
      console.log('=== Starting updateDistributionGroups ===');
      console.log('Restaurant ID:', restaurantId);
      console.log('Groups to validate:', JSON.stringify(groups, null, 2));

      // Validate groups first
      const validation = this.validateDistributionGroups(groups);
      console.log('Validation result:', validation);
      
      if (!validation.isValid) {
        const errorMsg = `Validation failed: ${validation.errors.join('; ')}`;
        console.error(errorMsg);
        throw new Error(errorMsg);
      }

      console.log('Validation passed, deleting existing groups...');

      // Start transaction by deleting existing groups and inserting new ones
      const { error: deleteError } = await supabase
        .from('distribution_groups')
        .delete()
        .eq('restaurant_id', restaurantId);

      if (deleteError) {
        console.error('Error deleting existing distribution groups:', deleteError);
        throw new Error(`Failed to delete existing groups: ${deleteError.message}`);
      }

      console.log('Existing groups deleted, inserting new groups...');

      // Insert new groups
      const insertData: DistributionGroupInsert[] = groups.map(group => ({
        restaurant_id: restaurantId,
        group_name: group.groupName.trim(),
        percentage: group.percentage
      }));

      console.log('Insert data:', JSON.stringify(insertData, null, 2));

      const { data, error: insertError } = await supabase
        .from('distribution_groups')
        .insert(insertData)
        .select();

      if (insertError) {
        console.error('Error inserting distribution groups:', insertError);
        console.error('Insert error details:', JSON.stringify(insertError, null, 2));
        throw new Error(`Failed to create distribution groups: ${insertError.message}`);
      }

      console.log('Groups inserted successfully:', data);
      console.log('=== updateDistributionGroups completed ===');

      return data || [];
    } catch (error) {
      console.error('=== updateDistributionGroups failed ===');
      console.error('Error:', error);
      throw error;
    }
  }

  /**
   * Get default distribution groups for a new restaurant
   */
  getDefaultDistributionGroups(): DistributionGroupConfig[] {
    return [
      { groupName: 'Waiters', percentage: 60 },
      { groupName: 'Kitchen Staff', percentage: 20 },
      { groupName: 'Cleaners', percentage: 10 },
      { groupName: 'Management', percentage: 10 }
    ];
  }

  /**
   * Initialize default distribution groups for a restaurant
   */
  async initializeDefaultDistributionGroups(restaurantId: string): Promise<DistributionGroup[]> {
    const defaultGroups = this.getDefaultDistributionGroups();
    return await this.updateDistributionGroups(restaurantId, defaultGroups);
  }

  /**
   * Calculate tip distribution based on restaurant's distribution groups
   */
  async calculateTipDistribution(restaurantId: string, tipAmount: number): Promise<{
    distributions: Array<{
      groupName: string;
      percentage: number;
      amount: number;
    }>;
    totalDistributed: number;
  }> {
    const groups = await this.getDistributionGroups(restaurantId);
    
    if (groups.length === 0) {
      throw new Error('No distribution groups configured for restaurant');
    }

    const distributions = groups.map(group => {
      const amount = Math.round((tipAmount * group.percentage / 100) * 100) / 100;
      return {
        groupName: group.group_name,
        percentage: group.percentage,
        amount
      };
    });

    const totalDistributed = distributions.reduce((sum, dist) => sum + dist.amount, 0);

    return {
      distributions,
      totalDistributed
    };
  }

  /**
   * Create tip distribution records for a restaurant-wide tip
   */
  async createTipDistribution(tipId: string, restaurantId: string, netAmount: number): Promise<TipDistribution[]> {
    try {
      const supabase = createClient();
      
      // Get distribution groups with their IDs
      const groups = await this.getDistributionGroups(restaurantId);
      
      if (groups.length === 0) {
        throw new Error('No distribution groups configured for restaurant');
      }

      // Calculate distribution based on current groups
      const distributionInserts: TipDistributionInsert[] = groups.map(group => {
        const amount = Math.round((netAmount * group.percentage / 100) * 100) / 100;
        return {
          tip_id: tipId,
          restaurant_id: restaurantId,
          distribution_group_id: group.id,
          group_name: group.group_name,
          percentage: group.percentage,
          amount: amount
        };
      });

      const { data: tipDistributions, error } = await supabase
        .from('tip_distributions')
        .insert(distributionInserts)
        .select();

      if (error) {
        console.error('Error creating tip distributions:', error);
        throw new Error('Failed to create tip distributions');
      }

      console.log(`Created ${tipDistributions.length} tip distributions for tip ${tipId}:`, 
        tipDistributions.map((d: TipDistribution) => `${d.group_name}: KES ${d.amount}`).join(', '));

      return tipDistributions || [];

    } catch (error) {
      console.error('Error in createTipDistribution:', error);
      throw error;
    }
  }

  /**
   * Get tip distributions for a specific tip
   */
  async getTipDistributions(tipId: string): Promise<TipDistribution[]> {
    const supabase = createClient();
    const { data, error } = await supabase
      .from('tip_distributions')
      .select('*')
      .eq('tip_id', tipId)
      .order('group_name');

    if (error) {
      console.error('Error fetching tip distributions:', error);
      throw new Error('Failed to fetch tip distributions');
    }

    return data || [];
  }

  /**
   * Get aggregated distributions for a restaurant within a date range
   */
  async getRestaurantDistributionSummary(
    restaurantId: string,
    startDate?: string,
    endDate?: string
  ): Promise<Array<{
    groupName: string;
    totalAmount: number;
    tipCount: number;
  }>> {
    const supabase = createClient();
    let query = supabase
      .from('tip_distributions')
      .select(`
        group_name,
        amount,
        tips!inner(created_at, payment_status)
      `)
      .eq('restaurant_id', restaurantId)
      .eq('tips.payment_status', 'completed');

    if (startDate) {
      query = query.gte('tips.created_at', startDate);
    }

    if (endDate) {
      query = query.lte('tips.created_at', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching distribution summary:', error);
      throw new Error('Failed to fetch distribution summary');
    }

    // Aggregate the results by group
    const summary = (data || []).reduce((acc: Array<{ groupName: string; totalAmount: number; tipCount: number }>, item: any) => {
      const existing = acc.find(g => g.groupName === item.group_name);
      if (existing) {
        existing.totalAmount += item.amount;
        existing.tipCount += 1;
      } else {
        acc.push({
          groupName: item.group_name,
          totalAmount: item.amount,
          tipCount: 1
        });
      }
      return acc;
    }, []);

    return summary;
  }

  /**
   * Process restaurant-wide tip distribution
   * This is the main method called when a restaurant tip is completed
   */
  async processRestaurantTipDistribution(tip: Tables<'tips'>): Promise<{
    success: boolean;
    distributions?: TipDistribution[];
    error?: string;
  }> {
    try {
      // Only process restaurant-wide tips
      if (tip.tip_type !== 'restaurant') {
        return {
          success: true,
          distributions: []
        };
      }

      // Only process completed payments
      if (tip.payment_status !== 'completed') {
        return {
          success: false,
          error: 'Tip payment is not completed'
        };
      }

      // Check if distributions already exist (avoid duplicates)
      const existingDistributions = await this.getTipDistributions(tip.id);
      if (existingDistributions.length > 0) {
        console.log(`Tip ${tip.id} already has distributions, skipping`);
        return {
          success: true,
          distributions: existingDistributions
        };
      }

      // Create distributions based on net amount (after commission)
      const distributions = await this.createTipDistribution(
        tip.id,
        tip.restaurant_id,
        tip.net_amount
      );

      return {
        success: true,
        distributions
      };

    } catch (error) {
      console.error('Error processing restaurant tip distribution:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

// Export singleton instance
export const distributionService = new DistributionService();