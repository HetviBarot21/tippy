import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createQRCodeService } from '@/utils/qr-codes';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const qrService = createQRCodeService(supabase);
    
    const qrCodeId = params.id;

    // Get QR code
    const qrCode = await qrService.getQRCode(qrCodeId);
    
    if (!qrCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      );
    }

    // Check authentication for admin operations
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      // Verify user is admin of this restaurant
      const { data: adminCheck } = await supabase
        .from('restaurant_admins')
        .select('id')
        .eq('restaurant_id', qrCode.restaurant_id)
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (adminCheck) {
        // Return full QR code data for admins
        const qrData = {
          restaurantId: qrCode.restaurant_id,
          tableId: qrCode.id,
          tableNumber: qrCode.table_number
        };

        const qrImageDataURL = await qrService.generateQRCodeDataURL(qrData);
        const qrSVG = await qrService.generateQRCodeSVG(qrData);

        return NextResponse.json({
          qrCode,
          qrImageDataURL,
          qrSVG
        });
      }
    }

    // For public access (customers scanning QR codes), return limited data
    return NextResponse.json({
      qrCode: {
        id: qrCode.id,
        restaurant_id: qrCode.restaurant_id,
        table_number: qrCode.table_number,
        table_name: qrCode.table_name,
        is_active: qrCode.is_active
      }
    });

  } catch (error) {
    console.error('Error fetching QR code:', error);
    return NextResponse.json(
      { error: 'Failed to fetch QR code' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const qrService = createQRCodeService(supabase);
    
    const qrCodeId = params.id;
    const body = await request.json();

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get existing QR code
    const existingQRCode = await qrService.getQRCode(qrCodeId);
    if (!existingQRCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      );
    }

    // Verify user is admin of this restaurant
    const { data: adminCheck } = await supabase
      .from('restaurant_admins')
      .select('id')
      .eq('restaurant_id', existingQRCode.restaurant_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminCheck) {
      return NextResponse.json(
        { error: 'Unauthorized to update QR code' },
        { status: 403 }
      );
    }

    // Update QR code
    const updatedQRCode = await qrService.updateQRCode(qrCodeId, {
      table_number: body.tableNumber,
      table_name: body.tableName,
      is_active: body.isActive,
      updated_at: new Date().toISOString()
    });

    return NextResponse.json({ qrCode: updatedQRCode });

  } catch (error) {
    console.error('Error updating QR code:', error);
    return NextResponse.json(
      { error: 'Failed to update QR code' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient();
    const qrService = createQRCodeService(supabase);
    
    const qrCodeId = params.id;

    // Check authentication
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get existing QR code
    const existingQRCode = await qrService.getQRCode(qrCodeId);
    if (!existingQRCode) {
      return NextResponse.json(
        { error: 'QR code not found' },
        { status: 404 }
      );
    }

    // Verify user is admin of this restaurant
    const { data: adminCheck } = await supabase
      .from('restaurant_admins')
      .select('id')
      .eq('restaurant_id', existingQRCode.restaurant_id)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    if (!adminCheck) {
      return NextResponse.json(
        { error: 'Unauthorized to delete QR code' },
        { status: 403 }
      );
    }

    // Delete QR code
    await qrService.deleteQRCode(qrCodeId);

    return NextResponse.json({ message: 'QR code deleted successfully' });

  } catch (error) {
    console.error('Error deleting QR code:', error);
    return NextResponse.json(
      { error: 'Failed to delete QR code' },
      { status: 500 }
    );
  }
}