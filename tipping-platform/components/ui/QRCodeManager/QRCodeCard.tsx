'use client';

import React, { useState } from 'react';
import { Database } from '@/types_db';
import Button from '@/components/ui/Button';

type QRCode = Database['public']['Tables']['qr_codes']['Row'];

interface QRCodeWithImages extends QRCode {
  qrImageDataURL?: string;
  qrSVG?: string;
}

interface Props {
  qrCode: QRCodeWithImages;
  onUpdate: (qrCodeId: string, updates: {
    tableNumber?: string;
    tableName?: string;
    isActive?: boolean;
  }) => Promise<boolean>;
  onDelete: (qrCodeId: string) => Promise<boolean>;
  onRegenerate: (qrCodeId: string) => Promise<boolean>;
}

export function QRCodeCard({ qrCode, onUpdate, onDelete, onRegenerate }: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editData, setEditData] = useState({
    tableNumber: qrCode.table_number,
    tableName: qrCode.table_name || ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleSave = async () => {
    try {
      setLoading(true);
      await onUpdate(qrCode.id, {
        tableNumber: editData.tableNumber,
        tableName: editData.tableName || undefined
      });
      setIsEditing(false);
    } catch (err) {
      console.error('Failed to update QR code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      tableNumber: qrCode.table_number,
      tableName: qrCode.table_name || ''
    });
    setIsEditing(false);
  };

  const handleToggleActive = async () => {
    try {
      setLoading(true);
      await onUpdate(qrCode.id, {
        isActive: !qrCode.is_active
      });
    } catch (err) {
      console.error('Failed to toggle QR code status:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      setLoading(true);
      await onDelete(qrCode.id);
    } catch (err) {
      console.error('Failed to delete QR code:', err);
      setLoading(false);
    }
  };

  const handleRegenerate = async () => {
    try {
      setLoading(true);
      await onRegenerate(qrCode.id);
    } catch (err) {
      console.error('Failed to regenerate QR code:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = (format: 'png' | 'svg') => {
    const data = format === 'png' ? qrCode.qrImageDataURL : qrCode.qrSVG;
    if (!data) return;

    const link = document.createElement('a');
    link.download = `table-${qrCode.table_number}-qr.${format}`;
    
    if (format === 'png') {
      link.href = data;
    } else {
      const blob = new Blob([data], { type: 'image/svg+xml' });
      link.href = URL.createObjectURL(blob);
    }
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    if (format === 'svg') {
      URL.revokeObjectURL(link.href);
    }
  };

  const handlePrint = () => {
    if (!qrCode.qrImageDataURL) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <html>
        <head>
          <title>QR Code - Table ${qrCode.table_number}</title>
          <style>
            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              text-align: center;
            }
            .qr-container {
              max-width: 400px;
              margin: 0 auto;
              border: 2px solid #000;
              padding: 20px;
            }
            .qr-image {
              width: 100%;
              max-width: 300px;
              height: auto;
            }
            .table-info {
              margin-top: 15px;
              font-size: 18px;
              font-weight: bold;
            }
            .instructions {
              margin-top: 10px;
              font-size: 14px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .qr-container { border: 2px solid #000; }
            }
          </style>
        </head>
        <body>
          <div class="qr-container">
            <img src="${qrCode.qrImageDataURL}" alt="QR Code" class="qr-image" />
            <div class="table-info">
              Table ${qrCode.table_number}
              ${qrCode.table_name ? `<br/>${qrCode.table_name}` : ''}
            </div>
            <div class="instructions">
              Scan to tip your waiter or restaurant
            </div>
          </div>
        </body>
      </html>
    `);
    
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.close();
  };

  return (
    <div className={`border rounded-lg p-4 ${qrCode.is_active ? 'border-zinc-700' : 'border-red-700 bg-red-900/10'}`}>
      {/* QR Code Image */}
      <div className="flex justify-center mb-4">
        {qrCode.qrImageDataURL ? (
          <img
            src={qrCode.qrImageDataURL}
            alt={`QR Code for Table ${qrCode.table_number}`}
            className="w-32 h-32 border border-zinc-600 rounded"
          />
        ) : (
          <div className="w-32 h-32 border border-zinc-600 rounded flex items-center justify-center bg-zinc-800">
            <span className="text-zinc-400 text-sm">Loading...</span>
          </div>
        )}
      </div>

      {/* Table Information */}
      <div className="space-y-2 mb-4">
        {isEditing ? (
          <>
            <input
              type="text"
              value={editData.tableNumber}
              onChange={(e) => setEditData(prev => ({ ...prev, tableNumber: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
              placeholder="Table number"
            />
            <input
              type="text"
              value={editData.tableName}
              onChange={(e) => setEditData(prev => ({ ...prev, tableName: e.target.value }))}
              className="w-full bg-zinc-800 border border-zinc-600 rounded px-3 py-2 text-white"
              placeholder="Table name (optional)"
            />
          </>
        ) : (
          <>
            <div className="font-semibold text-lg">Table {qrCode.table_number}</div>
            {qrCode.table_name && (
              <div className="text-zinc-400">{qrCode.table_name}</div>
            )}
          </>
        )}
        
        <div className={`text-sm ${qrCode.is_active ? 'text-green-400' : 'text-red-400'}`}>
          {qrCode.is_active ? 'Active' : 'Inactive'}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-2">
        {isEditing ? (
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              loading={loading}
              className="flex-1 text-sm py-2"
              variant="slim"
            >
              Save
            </Button>
            <Button
              onClick={handleCancel}
              className="flex-1 text-sm py-2 bg-zinc-700 hover:bg-zinc-600"
              variant="slim"
            >
              Cancel
            </Button>
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <Button
                onClick={() => setIsEditing(true)}
                className="flex-1 text-sm py-2"
                variant="slim"
              >
                Edit
              </Button>
              <Button
                onClick={handleToggleActive}
                loading={loading}
                className={`flex-1 text-sm py-2 ${
                  qrCode.is_active 
                    ? 'bg-red-700 hover:bg-red-600' 
                    : 'bg-green-700 hover:bg-green-600'
                }`}
                variant="slim"
              >
                {qrCode.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </div>

            {/* Download and Print Options */}
            {qrCode.qrImageDataURL && (
              <div className="flex gap-2">
                <Button
                  onClick={handlePrint}
                  className="flex-1 text-sm py-2 bg-blue-700 hover:bg-blue-600"
                  variant="slim"
                >
                  Print
                </Button>
                <Button
                  onClick={() => handleDownload('png')}
                  className="flex-1 text-sm py-2 bg-purple-700 hover:bg-purple-600"
                  variant="slim"
                >
                  PNG
                </Button>
                <Button
                  onClick={() => handleDownload('svg')}
                  className="flex-1 text-sm py-2 bg-purple-700 hover:bg-purple-600"
                  variant="slim"
                >
                  SVG
                </Button>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleRegenerate}
                loading={loading}
                className="flex-1 text-sm py-2 bg-yellow-700 hover:bg-yellow-600"
                variant="slim"
              >
                Regenerate
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex-1 text-sm py-2 bg-red-700 hover:bg-red-600"
                variant="slim"
              >
                Delete
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Delete QR Code</h3>
            <p className="text-zinc-300 mb-6">
              Are you sure you want to delete the QR code for Table {qrCode.table_number}? 
              This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <Button
                onClick={handleDelete}
                loading={loading}
                className="flex-1 bg-red-700 hover:bg-red-600"
                variant="slim"
              >
                Delete
              </Button>
              <Button
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 bg-zinc-700 hover:bg-zinc-600"
                variant="slim"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}