import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/utils/supabase/tenant-client';
import { z } from 'zod';

const onboardingSchema = z.object({
  restaurantName: z.string().min(1, 'Restaurant name is required'),
  restaurantSlug: z.string().min(1, 'Restaurant slug is required').regex(/^[a-z0-9-]+$/, 'Slug must contain only lowercase letters, numbers, and hyphens'),
  email: z.string().email('Valid email is required'),
  phoneNumber: z.string().optional(),
  address: z.string().optional(),
  adminEmail: z.string().email('Admin email is required'),
  adminName: z.string().min(1, 'Admin name is required'),
  commissionRate: z.number().min(0).max(100).default(10),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validatedData = onboardingSchema.parse(body);

    const supabase = createServiceClient();

    // Check if restaurant slug already exists
    const { data: existingRestaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', validatedData.restaurantSlug)
      .single();

    if (existingRestaurant) {
      return NextResponse.json(
        { error: 'Restaurant slug already exists' },
        { status: 400 }
      );
    }

    // Start transaction by creating restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        name: validatedData.restaurantName,
        slug: validatedData.restaurantSlug,
        email: validatedData.email,
        phone_number: validatedData.phoneNumber,
        address: validatedData.address,
        commission_rate: validatedData.commissionRate,
        is_active: true
      })
      .select()
      .single();

    if (restaurantError) {
      console.error('Error creating restaurant:', restaurantError);
      return NextResponse.json(
        { error: 'Failed to create restaurant' },
        { status: 500 }
      );
    }

    // Create or find admin user
    let adminUserId: string;

    // Check if admin user already exists
    const { data: existingUser } = await supabase.auth.admin.getUserByEmail(validatedData.adminEmail);

    if (existingUser.user) {
      adminUserId = existingUser.user.id;
    } else {
      // Create new admin user
      const { data: newUser, error: userError } = await supabase.auth.admin.createUser({
        email: validatedData.adminEmail,
        email_confirm: true,
        user_metadata: {
          name: validatedData.adminName,
          role: 'restaurant_admin'
        }
      });

      if (userError || !newUser.user) {
        console.error('Error creating admin user:', userError);
        
        // Cleanup: delete the restaurant
        await supabase.from('restaurants').delete().eq('id', restaurant.id);
        
        return NextResponse.json(
          { error: 'Failed to create admin user' },
          { status: 500 }
        );
      }

      adminUserId = newUser.user.id;
    }

    // Create restaurant admin record
    const { error: adminError } = await supabase
      .from('restaurant_admins')
      .insert({
        user_id: adminUserId,
        restaurant_id: restaurant.id,
        role: 'admin',
        is_active: true
      });

    if (adminError) {
      console.error('Error creating restaurant admin:', adminError);
      
      // Cleanup: delete the restaurant
      await supabase.from('restaurants').delete().eq('id', restaurant.id);
      
      return NextResponse.json(
        { error: 'Failed to create restaurant admin' },
        { status: 500 }
      );
    }

    // Create default distribution groups
    const defaultGroups = [
      { group_name: 'cleaners', percentage: 10 },
      { group_name: 'waiters', percentage: 30 },
      { group_name: 'admin', percentage: 40 },
      { group_name: 'owners', percentage: 20 }
    ];

    const { error: groupsError } = await supabase
      .from('distribution_groups')
      .insert(
        defaultGroups.map(group => ({
          restaurant_id: restaurant.id,
          group_name: group.group_name,
          percentage: group.percentage
        }))
      );

    if (groupsError) {
      console.error('Error creating distribution groups:', groupsError);
      // Continue anyway, groups can be created later
    }

    // Log the onboarding event
    await supabase.from('audit_logs').insert({
      user_id: adminUserId,
      restaurant_id: restaurant.id,
      table_name: 'restaurants',
      action: 'onboard',
      record_id: restaurant.id,
      new_values: {
        restaurant_name: restaurant.name,
        admin_email: validatedData.adminEmail,
        onboarded_at: new Date().toISOString()
      }
    });

    return NextResponse.json({
      success: true,
      restaurant: {
        id: restaurant.id,
        name: restaurant.name,
        slug: restaurant.slug,
        email: restaurant.email
      },
      adminUserId,
      message: 'Restaurant onboarded successfully'
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}