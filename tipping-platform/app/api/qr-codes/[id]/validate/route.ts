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

    // Validate QR code and get associated data
    const validation = await qrService.validateQRCode(qrCodeId);

    if (!validation.isValid) {
      return NextResponse.json(
        { 
          isValid: false,
          error: 'Invalid or inactive QR code' 
        },
        { status: 404 }
      );
    }

    // Return validation result with restaurant and QR code data
    return NextResponse.json({
      isValid: true,
      qrCode: {
        id: validation.qrCode!.id,
        table_number: validation.qrCode!.table_number,
        table_name: validation.qrCode!.table_name
      },
      restaurant: {
        id: validation.restaurant!.id,
        name: validation.restaurant!.name,
        slug: validation.restaurant!.slug
      }
    });

  } catch (error) {
    console.error('Error validating QR code:', error);
    return NextResponse.json(
      { 
        isValid: false,
        error: 'Failed to validate QR code' 
      },
      { status: 500 }
    );
  }
}