import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      restaurantName,
      restaurantSlug,
      email,
      phoneNumber,
      address,
      adminEmail,
      adminName,
      commissionRate
    } = body;

    // Validate required fields
    if (!restaurantName || !restaurantSlug || !email || !adminEmail || !adminName) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Use service role client to bypass RLS
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Check if slug already exists
    const { data: existingRestaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('slug', restaurantSlug)
      .single();

    if (existingRestaurant) {
      return NextResponse.json(
        { error: 'Restaurant slug already exists' },
        { status: 400 }
      );
    }

    // Create restaurant
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .insert({
        name: restaurantName,
        slug: restaurantSlug,
        email: email,
        phone_number: phoneNumber || null,
        address: address || null,
        commission_rate: commissionRate || 10,
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

    // Create admin user in Supabase Auth and send password reset email
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: adminEmail,
      email_confirm: true,
      user_metadata: {
        name: adminName,
        restaurant_id: restaurant.id,
        role: 'restaurant_admin'
      }
    });

    if (authError) {
      console.error('Error creating admin user:', authError);
      // Rollback restaurant creation
      await supabase.from('restaurants').delete().eq('id', restaurant.id);
      return NextResponse.json(
        { error: 'Failed to create admin user' },
        { status: 500 }
      );
    }

    // Send password reset email to the new admin
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(adminEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/auth/reset_password`
    });

    if (resetError) {
      console.error('Error sending password reset email:', resetError);
      // Don't fail the whole operation, just log it
    }

    // Link admin user to restaurant
    const { error: adminLinkError } = await supabase
      .from('restaurant_admins')
      .insert({
        restaurant_id: restaurant.id,
        user_id: authData.user.id,
        role: 'admin',
        is_active: true
      });

    if (adminLinkError) {
      console.error('Error linking admin to restaurant:', adminLinkError);
    }

    // Create default distribution groups
    const defaultGroups = [
      { group_name: 'Waiters', percentage: 40 },
      { group_name: 'Kitchen', percentage: 30 },
      { group_name: 'Management', percentage: 20 },
      { group_name: 'Support Staff', percentage: 10 }
    ];

    const { error: groupsError } = await supabase
      .from('distribution_groups')
      .insert(
        defaultGroups.map(group => ({
          restaurant_id: restaurant.id,
          ...group
        }))
      );

    if (groupsError) {
      console.error('Error creating distribution groups:', groupsError);
    }

    return NextResponse.json({
      success: true,
      restaurant: restaurant,
      adminUser: {
        id: authData.user.id,
        email: authData.user.email
      },
      message: 'Restaurant created successfully. Password reset email sent to admin.'
    });

  } catch (error) {
    console.error('Error in onboarding:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
