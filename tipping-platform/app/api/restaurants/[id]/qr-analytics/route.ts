import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const restaurantId = params.id;
    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');

    const supabase = createClient();

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get QR codes with tip statistics
    const { data: qrCodes, error: qrError } = await supabase
      .from('qr_codes')
      .select(`
        *,
        tips (
          id,
          amount,
          net_amount,
          created_at,
          payment_status,
          tip_type
        )
      `)
      .eq('restaurant_id', restaurantId)
      .order('table_number');

    if (qrError) {
      console.error('Error fetching QR codes:', qrError);
      return NextResponse.json({ error: 'Failed to fetch QR codes' }, { status: 500 });
    }

    // Calculate analytics for each QR code
    const qrAnalytics = qrCodes?.map(qrCode => {
      const allTips = qrCode.tips?.filter(tip => tip.payment_status === 'completed') || [];
      const recentTips = allTips.filter(tip => {
        const tipDate = new Date(tip.created_at);
        return tipDate >= startDate && tipDate <= endDate;
      });

      const totalTips = allTips.length;
      const totalAmount = allTips.reduce((sum, tip) => sum + tip.net_amount, 0);
      const recentTipsCount = recentTips.length;
      const recentAmount = recentTips.reduce((sum, tip) => sum + tip.net_amount, 0);

      // Calculate tip type breakdown for recent tips
      const waiterTips = recentTips.filter(tip => tip.tip_type === 'waiter');
      const restaurantTips = recentTips.filter(tip => tip.tip_type === 'restaurant');

      // Calculate daily usage for the last 7 days
      const dailyUsage = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        const dayTips = recentTips.filter(tip => 
          tip.created_at.startsWith(dateStr)
        );
        
        dailyUsage.push({
          date: dateStr,
          tipCount: dayTips.length,
          amount: dayTips.reduce((sum, tip) => sum + tip.net_amount, 0)
        });
      }

      return {
        qrCode: {
          id: qrCode.id,
          table_number: qrCode.table_number,
          table_name: qrCode.table_name,
          is_active: qrCode.is_active,
          created_at: qrCode.created_at
        },
        analytics: {
          totalTips,
          totalAmount,
          recentTipsCount,
          recentAmount,
          waiterTipsCount: waiterTips.length,
          waiterTipsAmount: waiterTips.reduce((sum, tip) => sum + tip.net_amount, 0),
          restaurantTipsCount: restaurantTips.length,
          restaurantTipsAmount: restaurantTips.reduce((sum, tip) => sum + tip.net_amount, 0),
          dailyUsage,
          averageTipAmount: recentTipsCount > 0 ? recentAmount / recentTipsCount : 0,
          lastTipDate: allTips.length > 0 ? allTips[allTips.length - 1].created_at : null
        }
      };
    }) || [];

    // Calculate overall statistics
    const totalQRCodes = qrAnalytics.length;
    const activeQRCodes = qrAnalytics.filter(qr => qr.qrCode.is_active).length;
    const usedQRCodes = qrAnalytics.filter(qr => qr.analytics.totalTips > 0).length;
    const totalRecentTips = qrAnalytics.reduce((sum, qr) => sum + qr.analytics.recentTipsCount, 0);
    const totalRecentAmount = qrAnalytics.reduce((sum, qr) => sum + qr.analytics.recentAmount, 0);

    // Find top performing tables
    const topTables = qrAnalytics
      .sort((a, b) => b.analytics.recentAmount - a.analytics.recentAmount)
      .slice(0, 5);

    return NextResponse.json({
      period: `Last ${days} days`,
      summary: {
        totalQRCodes,
        activeQRCodes,
        usedQRCodes,
        totalRecentTips,
        totalRecentAmount,
        averagePerTable: usedQRCodes > 0 ? totalRecentAmount / usedQRCodes : 0
      },
      qrAnalytics,
      topTables
    });

  } catch (error) {
    console.error('Error fetching QR analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch QR analytics' },
      { status: 500 }
    );
  }
}