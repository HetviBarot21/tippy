import { NextRequest, NextResponse } from 'next/server';
import { paymentService } from '@/utils/payments/service';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    const { searchParams } = new URL(request.url);
    
    // Extract query parameters
    const startDate = searchParams.get('startDate') || undefined;
    const endDate = searchParams.get('endDate') || undefined;
    const paymentMethod = searchParams.get('paymentMethod') as 'card' | 'mpesa' | undefined;
    const paymentStatus = searchParams.get('paymentStatus') || undefined;
    const waiterId = searchParams.get('waiterId') || undefined;

    const tips = await paymentService.getRestaurantTips(restaurantId, {
      startDate,
      endDate,
      paymentMethod,
      paymentStatus,
      waiterId
    });

    // Calculate summary statistics
    const totalTips = tips.length;
    const totalAmount = tips.reduce((sum, tip) => sum + tip.amount, 0);
    const totalCommission = tips.reduce((sum, tip) => sum + tip.commission_amount, 0);
    const totalNetAmount = tips.reduce((sum, tip) => sum + tip.net_amount, 0);

    const completedTips = tips.filter(tip => tip.payment_status === 'completed');
    const completedAmount = completedTips.reduce((sum, tip) => sum + tip.amount, 0);

    // Group by payment method
    const byPaymentMethod = tips.reduce((acc, tip) => {
      if (!acc[tip.payment_method]) {
        acc[tip.payment_method] = { count: 0, amount: 0 };
      }
      acc[tip.payment_method].count++;
      acc[tip.payment_method].amount += tip.amount;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    // Group by tip type
    const byTipType = tips.reduce((acc, tip) => {
      if (!acc[tip.tip_type]) {
        acc[tip.tip_type] = { count: 0, amount: 0 };
      }
      acc[tip.tip_type].count++;
      acc[tip.tip_type].amount += tip.amount;
      return acc;
    }, {} as Record<string, { count: number; amount: number }>);

    return NextResponse.json({
      tips,
      summary: {
        totalTips,
        totalAmount,
        totalCommission,
        totalNetAmount,
        completedTips: completedTips.length,
        completedAmount,
        byPaymentMethod,
        byTipType
      }
    });

  } catch (error) {
    console.error('Error fetching restaurant tips:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tips' },
      { status: 500 }
    );
  }
}