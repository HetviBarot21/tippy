'use client';

import React, { useState } from 'react';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';

interface Props {
  onClose: () => void;
  onCreate: (tableNumber: string, tableName?: string) => Promise<boolean>;
  existingTableNumbers: string[];
}

export function CreateQRCodeModal({ onClose, onCreate, existingTableNumbers }: Props) {
  const [tableNumber, setTableNumber] = useState('');
  const [tableName, setTableName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!tableNumber.trim()) {
      setError('Table number is required');
      return;
    }

    if (existingTableNumbers.includes(tableNumber.trim())) {
      setError('A QR code already exists for this table number');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await onCreate(
        tableNumber.trim(),
        tableName.trim() || undefined
      );
      
      // Modal will be closed by parent component on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create QR code');
    } finally {
      setLoading(false);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={handleOverlayClick}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-semibold mb-6">Create New QR Code</h2>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Table Number *
            </label>
            <Input
              type="text"
              value={tableNumber}
              onChange={setTableNumber}
              placeholder="e.g., 1, A1, VIP-1"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Table Name (Optional)
            </label>
            <Input
              type="text"
              value={tableName}
              onChange={setTableName}
              placeholder="e.g., Window Table, Patio Corner"
            />
          </div>

          {error && (
            <div className="bg-red-900 border border-red-700 text-red-100 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="submit"
              loading={loading}
              className="flex-1"
            >
              Create QR Code
            </Button>
            <Button
              type="button"
              onClick={onClose}
              className="flex-1 bg-zinc-700 hover:bg-zinc-600"
              variant="slim"
            >
              Cancel
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-zinc-700">
          <h3 className="text-sm font-medium text-zinc-300 mb-2">Tips:</h3>
          <ul className="text-sm text-zinc-400 space-y-1">
            <li>• Use clear, unique table numbers (1, 2, 3 or A1, B2, etc.)</li>
            <li>• Table names help staff identify locations</li>
            <li>• QR codes can be printed and downloaded after creation</li>
          </ul>
        </div>
      </div>
    </div>
  );
}