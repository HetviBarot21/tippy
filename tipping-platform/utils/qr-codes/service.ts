import QRCode from 'qrcode';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../../types_db';

type QRCodeRow = Database['public']['Tables']['qr_codes']['Row'];
type QRCodeInsert = Database['public']['Tables']['qr_codes']['Insert'];
type QRCodeUpdate = Database['public']['Tables']['qr_codes']['Update'];

export interface QRCodeData {
  restaurantId: string;
  tableId: string;
  tableNumber: string;
}

export interface GenerateQRCodeOptions {
  restaurantId: string;
  tableNumber: string;
  tableName?: string;
  baseUrl?: string;
}

export class QRCodeService {
  constructor(private supabase: SupabaseClient<Database>) {}

  /**
   * Generate QR code data URL for a restaurant table
   */
  async generateQRCodeDataURL(data: QRCodeData): Promise<string> {
    const tippingUrl = this.buildTippingUrl(data);
    
    try {
      const qrDataURL = await QRCode.toDataURL(tippingUrl, {
        errorCorrectionLevel: 'M',
        type: 'image/png',
        quality: 0.92,
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });
      
      return qrDataURL;
    } catch (error) {
      throw new Error(`Failed to generate QR code: ${error}`);
    }
  }

  /**
   * Generate QR code as SVG string
   */
  async generateQRCodeSVG(data: QRCodeData): Promise<string> {
    const tippingUrl = this.buildTippingUrl(data);
    
    try {
      const qrSVG = await QRCode.toString(tippingUrl, {
        type: 'svg',
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        },
        width: 256
      });
      
      return qrSVG;
    } catch (error) {
      throw new Error(`Failed to generate QR code SVG: ${error}`);
    }
  }

  /**
   * Create a new QR code record in the database
   */
  async createQRCode(options: GenerateQRCodeOptions): Promise<QRCodeRow> {
    const { restaurantId, tableNumber, tableName, baseUrl } = options;
    
    // Generate unique QR code ID
    const qrCodeId = crypto.randomUUID();
    
    // Build the tipping URL
    const qrData: QRCodeData = {
      restaurantId,
      tableId: qrCodeId,
      tableNumber
    };
    
    const tippingUrl = this.buildTippingUrl(qrData, baseUrl);
    
    const insertData: QRCodeInsert = {
      id: qrCodeId,
      restaurant_id: restaurantId,
      table_number: tableNumber,
      table_name: tableName || null,
      qr_data: tippingUrl,
      is_active: true
    };

    const { data, error } = await this.supabase
      .from('qr_codes')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create QR code: ${error.message}`);
    }

    return data;
  }

  /**
   * Get QR code by ID
   */
  async getQRCode(qrCodeId: string): Promise<QRCodeRow | null> {
    const { data, error } = await this.supabase
      .from('qr_codes')
      .select('*')
      .eq('id', qrCodeId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null; // Not found
      }
      throw new Error(`Failed to get QR code: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all QR codes for a restaurant
   */
  async getRestaurantQRCodes(restaurantId: string): Promise<QRCodeRow[]> {
    const { data, error } = await this.supabase
      .from('qr_codes')
      .select('*')
      .eq('restaurant_id', restaurantId)
      .order('table_number');

    if (error) {
      throw new Error(`Failed to get restaurant QR codes: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update QR code
   */
  async updateQRCode(qrCodeId: string, updates: Partial<QRCodeUpdate>): Promise<QRCodeRow> {
    const { data, error } = await this.supabase
      .from('qr_codes')
      .update(updates)
      .eq('id', qrCodeId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update QR code: ${error.message}`);
    }

    return data;
  }

  /**
   * Activate/deactivate QR code
   */
  async toggleQRCodeStatus(qrCodeId: string, isActive: boolean): Promise<QRCodeRow> {
    return this.updateQRCode(qrCodeId, { is_active: isActive });
  }

  /**
   * Delete QR code
   */
  async deleteQRCode(qrCodeId: string): Promise<void> {
    const { error } = await this.supabase
      .from('qr_codes')
      .delete()
      .eq('id', qrCodeId);

    if (error) {
      throw new Error(`Failed to delete QR code: ${error.message}`);
    }
  }

  /**
   * Regenerate QR code with new URL
   */
  async regenerateQRCode(qrCodeId: string, baseUrl?: string): Promise<QRCodeRow> {
    const existingQRCode = await this.getQRCode(qrCodeId);
    if (!existingQRCode) {
      throw new Error('QR code not found');
    }

    const qrData: QRCodeData = {
      restaurantId: existingQRCode.restaurant_id,
      tableId: qrCodeId,
      tableNumber: existingQRCode.table_number
    };

    const newTippingUrl = this.buildTippingUrl(qrData, baseUrl);

    return this.updateQRCode(qrCodeId, { 
      qr_data: newTippingUrl,
      updated_at: new Date().toISOString()
    });
  }

  /**
   * Build the tipping URL from QR code data
   */
  private buildTippingUrl(data: QRCodeData, baseUrl?: string): string {
    const base = baseUrl || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
    return `${base}/tip/${data.restaurantId}/${data.tableId}`;
  }

  /**
   * Parse QR code data from URL
   */
  static parseQRCodeUrl(url: string): QRCodeData | null {
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      
      // Expected format: /tip/{restaurantId}/{tableId}
      if (pathParts.length >= 4 && pathParts[1] === 'tip') {
        return {
          restaurantId: pathParts[2],
          tableId: pathParts[3],
          tableNumber: '' // Will be filled from database lookup
        };
      }
      
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Validate QR code and get associated data
   */
  async validateQRCode(qrCodeId: string): Promise<{
    isValid: boolean;
    qrCode?: QRCodeRow;
    restaurant?: any;
  }> {
    try {
      const qrCode = await this.getQRCode(qrCodeId);
      
      if (!qrCode || !qrCode.is_active) {
        return { isValid: false };
      }

      // Get restaurant data
      const { data: restaurant, error: restaurantError } = await this.supabase
        .from('restaurants')
        .select('*')
        .eq('id', qrCode.restaurant_id)
        .eq('is_active', true)
        .single();

      if (restaurantError || !restaurant) {
        return { isValid: false };
      }

      return {
        isValid: true,
        qrCode,
        restaurant
      };
    } catch (error) {
      return { isValid: false };
    }
  }
}

// Helper function to create QR code service instance
export function createQRCodeService(supabase: SupabaseClient<Database>): QRCodeService {
  return new QRCodeService(supabase);
}