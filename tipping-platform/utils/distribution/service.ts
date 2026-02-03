import { createClient } from '@/utils/supabase/server';
import { Tables, TablesInsert, TablesUpdate } from '@/types_db';

type DistributionGroup = Tables<'distribution_groups'>;
type DistributionGroupInsert = TablesInsert<'distribution_groups'>;
type DistributionGroupUpdate = TablesUpdate<'distribution_groups'>;

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
  private supabase = createClient();

  /**
   * Get all distribution groups for a restaurant
   */
  async getDistributionGroups(restaurantId: string): Promise<DistributionGroup[]> {
    const { data, error } = await this.supabase
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
      } else if (group.percentage % 0.01 !== 0) {
        errors.push(`Group ${index + 1}: Percentage can have at most 2 decimal places`);
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
    // Validate groups first
    const validation = this.validateDistributionGroups(groups);
    if (!validation.isValid) {
      throw new Error(`Validation failed: ${validation.errors.join('; ')}`);
    }

    // Start transaction by deleting existing groups and inserting new ones
    const { error: deleteError } = await this.supabase
      .from('distribution_groups')
      .delete()
      .eq('restaurant_id', restaurantId);

    if (deleteError) {
      console.error('Error deleting existing distribution groups:', deleteError);
      throw new Error('Failed to update distribution groups');
    }

    // Insert new groups
    const insertData: DistributionGroupInsert[] = groups.map(group => ({
      restaurant_id: restaurantId,
      group_name: group.groupName.trim(),
      percentage: group.percentage
    }));

    const { data, error: insertError } = await (this.supabase as any)
      .from('distribution_groups')
      .insert(insertData)
      .select();

    if (insertError) {
      console.error('Error inserting distribution groups:', insertError);
      throw new Error('Failed to create distribution groups');
    }

    return data || [];
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
}

// Export singleton instance
export const distributionService = new DistributionService();