/**
 * Tips API Route
 * 
 * Handles tip creation and retrieval
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@/utils/supabase/admin';
import { createTipSchema, tipQuerySchema } from '@/types/tip';
import { z } from 'zod';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate request body
    const validatedData = createTipSchema.parse(body);
    
    // Calculate commission and net amounts
    const supabase = createAdminClient();
    
    // Get restaurant commission rate
    const { data: restaurant, error: restaurantError } = await supabase
      .from('restaurants')
      .select('commission_rate')
      .eq('id', validatedData.restaurant_id)
      .single();
    
    if (restaurantError || !restaurant) {
      return NextResponse.json({
        success: false,
        message: 'Restaurant not found'
      }, { status: 404 });
    }
    
    // Calculate amounts
    const commissionRate = restaurant.commission_rate || 10.00;
    const commissionAmount = Math.round(validatedData.amount * commissionRate) / 100;
    const netAmount = validatedData.amount - commissionAmount;
    
    // Create tip record
    const { data: tip, error: tipError } = await supabase
      .from('tips')
      .insert({
        restaurant_id: validatedData.restaurant_id,
        waiter_id: validatedData.waiter_id || null,
        table_id: validatedData.table_id || null,
        amount: validatedData.amount,
        commission_amount: commissionAmount,
        net_amount: netAmount,
        tip_type: validatedData.tip_type,
        payment_method: validatedData.payment_method,
        payment_status: 'pending',
        customer_phone: validatedData.customer_phone || null,
        notes: validatedData.notes || null
      })
      .select()
      .single();
    
    if (tipError) {
      console.error('Tip creation error:', tipError);
      return NextResponse.json({
        success: false,
        message: 'Failed to create tip'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: tip,
      message: 'Tip created successfully'
    });
    
  } catch (error) {
    console.error('Tips API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid request data',
        errors: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const queryParams = Object.fromEntries(searchParams.entries());
    
    // Validate query parameters
    const validatedQuery = tipQuerySchema.parse(queryParams);
    
    const supabase = createClient();
    let query = supabase
      .from('tips')
      .select(`
        *,
        waiter:waiters(id, name),
        table:qr_codes(id, table_number),
        restaurant:restaurants(id, name)
      `);
    
    // Apply filters
    if (validatedQuery.restaurant_id) {
      query = query.eq('restaurant_id', validatedQuery.restaurant_id);
    }
    
    if (validatedQuery.waiter_id) {
      query = query.eq('waiter_id', validatedQuery.waiter_id);
    }
    
    if (validatedQuery.table_id) {
      query = query.eq('table_id', validatedQuery.table_id);
    }
    
    if (validatedQuery.tip_type) {
      query = query.eq('tip_type', validatedQuery.tip_type);
    }
    
    if (validatedQuery.payment_method) {
      query = query.eq('payment_method', validatedQuery.payment_method);
    }
    
    if (validatedQuery.payment_status) {
      query = query.eq('payment_status', validatedQuery.payment_status);
    }
    
    // Date filtering
    if (validatedQuery.month) {
      const [year, month] = validatedQuery.month.split('-');
      const startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
      const endDate = new Date(parseInt(year), parseInt(month), 0);
      
      query = query
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
    }
    
    if (validatedQuery.start_date) {
      query = query.gte('created_at', validatedQuery.start_date);
    }
    
    if (validatedQuery.end_date) {
      query = query.lte('created_at', validatedQuery.end_date);
    }
    
    // Order by creation date (newest first)
    query = query.order('created_at', { ascending: false });
    
    const { data: tips, error } = await query;
    
    if (error) {
      console.error('Tips query error:', error);
      return NextResponse.json({
        success: false,
        message: 'Failed to fetch tips'
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      data: tips
    });
    
  } catch (error) {
    console.error('Tips GET API error:', error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        message: 'Invalid query parameters',
        errors: error.errors
      }, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      message: 'Internal server error'
    }, { status: 500 });
  }
}