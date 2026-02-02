'use client';

import React, { useState, useEffect } from 'react';
import { Database } from '@/types_db';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import { QRCodeCard } from './QRCodeCard';
import { CreateQRCodeModal } from './CreateQRCodeModal';

type QRCode = Database['public']['Tables']['qr_codes']['Row'];

interface QRCodeWithImages extends QRCode {
  qrImageDataURL?: string;
  qrSVG?: string;
}

interface Props {
  restaurantId: string;
  restaurantName: string;
}

export default function QRCodeManager({ restaurantId, restaurantName }: Props) {
  const [qrCodes, setQRCodes] = useState<QRCodeWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Filter QR codes based on search term
  const filteredQRCodes = qrCodes.filter(qr => 
    qr.table_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (qr.table_name && qr.table_name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Load QR codes
  const loadQRCodes = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/qr-codes?restaurantId=${restaurantId}`);
      
      if (!response.ok) {
        throw new Error('Failed to load QR codes');
      }

      const data = await response.json();
      setQRCodes(data.qrCodes || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load QR codes');
    } finally {
      setLoading(false);
    }
  };

  // Create new QR code
  const handleCreateQRCode = async (tableNumber: string, tableName?: string) => {
    try {
      const response = await fetch('/api/qr-codes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          restaurantId,
          tableNumber,
          tableName,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create QR code');
      }

      const data = await response.json();
      
      // Add the new QR code with images to the list
      setQRCodes(prev => [...prev, {
        ...data.qrCode,
        qrImageDataURL: data.qrImageDataURL,
        qrSVG: data.qrSVG
      }]);
      
      setShowCreateModal(false);
      return true;
    } catch (err) {
      throw err;
    }
  };

  // Update QR code
  const handleUpdateQRCode = async (qrCodeId: string, updates: {
    tableNumber?: string;
    tableName?: string;
    isActive?: boolean;
  }) => {
    try {
      const response = await fetch(`/api/qr-codes/${qrCodeId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error('Failed to update QR code');
      }

      const data = await response.json();
      
      // Update the QR code in the list
      setQRCodes(prev => prev.map(qr => 
        qr.id === qrCodeId ? { ...qr, ...data.qrCode } : qr
      ));
      
      return true;
    } catch (err) {
      throw err;
    }
  };

  // Delete QR code
  const handleDeleteQRCode = async (qrCodeId: string) => {
    try {
      const response = await fetch(`/api/qr-codes/${qrCodeId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete QR code');
      }

      // Remove the QR code from the list
      setQRCodes(prev => prev.filter(qr => qr.id !== qrCodeId));
      
      return true;
    } catch (err) {
      throw err;
    }
  };

  // Regenerate QR code
  const handleRegenerateQRCode = async (qrCodeId: string) => {
    try {
      const response = await fetch(`/api/qr-codes/${qrCodeId}/regenerate`, {
        method: 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to regenerate QR code');
      }

      const data = await response.json();
      
      // Update the QR code with new images
      setQRCodes(prev => prev.map(qr => 
        qr.id === qrCodeId ? {
          ...qr,
          ...data.qrCode,
          qrImageDataURL: data.qrImageDataURL,
          qrSVG: data.qrSVG
        } : qr
      ));
      
      return true;
    } catch (err) {
      throw err;
    }
  };

  // Load QR code images for existing codes
  const loadQRCodeImages = async (qrCode: QRCode) => {
    try {
      const response = await fetch(`/api/qr-codes/${qrCode.id}`);
      if (response.ok) {
        const data = await response.json();
        return {
          qrImageDataURL: data.qrImageDataURL,
          qrSVG: data.qrSVG
        };
      }
    } catch (err) {
      console.error('Failed to load QR code images:', err);
    }
    return {};
  };

  useEffect(() => {
    loadQRCodes();
  }, [restaurantId]);

  // Load images for QR codes that don't have them
  useEffect(() => {
    const loadMissingImages = async () => {
      const codesNeedingImages = qrCodes.filter(qr => !qr.qrImageDataURL);
      
      for (const qrCode of codesNeedingImages) {
        const images = await loadQRCodeImages(qrCode);
        if (images.qrImageDataURL) {
          setQRCodes(prev => prev.map(qr => 
            qr.id === qrCode.id ? { ...qr, ...images } : qr
          ));
        }
      }
    };

    if (qrCodes.length > 0) {
      loadMissingImages();
    }
  }, [qrCodes.length]);

  if (loading) {
    return (
      <Card title="QR Code Management" description="Loading QR codes...">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card 
        title="QR Code Management" 
        description={`Manage QR codes for ${restaurantName}`}
      >
        <div className="space-y-4 mt-6">
          {/* Search and Create Controls */}
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex-1 max-w-md">
              <Input
                type="text"
                placeholder="Search by table number or name..."
                value={searchTerm}
                onChange={setSearchTerm}
              />
            </div>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="whitespace-nowrap"
            >
              Create QR Code
            </Button>
          </div>

          {/* Error Display */}
          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* QR Codes Grid */}
          {filteredQRCodes.length === 0 ? (
            <div className="text-center py-8 text-zinc-400">
              {searchTerm ? 'No QR codes match your search.' : 'No QR codes created yet.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredQRCodes.map((qrCode) => (
                <QRCodeCard
                  key={qrCode.id}
                  qrCode={qrCode}
                  onUpdate={handleUpdateQRCode}
                  onDelete={handleDeleteQRCode}
                  onRegenerate={handleRegenerateQRCode}
                />
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Create QR Code Modal */}
      {showCreateModal && (
        <CreateQRCodeModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateQRCode}
          existingTableNumbers={qrCodes.map(qr => qr.table_number)}
        />
      )}
    </div>
  );
}