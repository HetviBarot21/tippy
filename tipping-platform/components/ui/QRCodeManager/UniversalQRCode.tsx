'use client';

import React, { useState, useEffect } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import QRCode from 'qrcode';

interface Props {
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
}

export function UniversalQRCode({ restaurantId, restaurantSlug, restaurantName }: Props) {
  const [qrDataURL, setQrDataURL] = useState<string>('');
  const [loading, setLoading] = useState(true);

  // Generate the universal tipping URL
  const tippingUrl = `${window.location.origin}/tip/${restaurantSlug}`;

  useEffect(() => {
    generateQRCode();
  }, [tippingUrl]);

  const generateQRCode = async () => {
    try {
      setLoading(true);
      const dataURL = await QRCode.toDataURL(tippingUrl, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF',
        },
      });
      setQrDataURL(dataURL);
    } catch (err) {
      console.error('Failed to generate QR code:', err);
    } finally {
      setLoading(false);
    }
  };

  const downloadQRCode = () => {
    const link = document.createElement('a');
    link.href = qrDataURL;
    link.download = `${restaurantSlug}-qr-code.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const printQRCode = () => {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>QR Code - ${restaurantName}</title>
            <style>
              body {
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                margin: 0;
                font-family: Arial, sans-serif;
              }
              .container {
                text-align: center;
                padding: 40px;
              }
              h1 {
                font-size: 32px;
                margin-bottom: 10px;
                color: #000;
              }
              p {
                font-size: 18px;
                color: #666;
                margin-bottom: 30px;
              }
              img {
                max-width: 400px;
                height: auto;
              }
              .url {
                margin-top: 20px;
                font-size: 14px;
                color: #999;
              }
              @media print {
                body {
                  background: white;
                }
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>${restaurantName}</h1>
              <p>Scan to Tip Our Staff</p>
              <img src="${qrDataURL}" alt="QR Code" />
              <div class="url">${tippingUrl}</div>
            </div>
          </body>
        </html>
      `);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 250);
    }
  };

  if (loading) {
    return (
      <Card title="Universal QR Code" description="Generating QR code...">
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        </div>
      </Card>
    );
  }

  return (
    <Card 
      title="Universal QR Code" 
      description="One QR code for all tables - customers select their table after scanning"
    >
      <div className="space-y-6 mt-6">
        {/* QR Code Display */}
        <div className="flex flex-col items-center justify-center bg-white p-8 rounded-lg">
          <img 
            src={qrDataURL} 
            alt="Restaurant QR Code" 
            className="w-64 h-64"
          />
          <div className="mt-4 text-center">
            <p className="text-sm text-zinc-600 font-mono break-all">
              {tippingUrl}
            </p>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-zinc-900 border border-zinc-700 rounded-lg p-4">
          <h3 className="text-lg font-semibold mb-2">How it works:</h3>
          <ol className="list-decimal list-inside space-y-2 text-zinc-300">
            <li>Print this QR code and place it on all your tables</li>
            <li>Customers scan the QR code with their phone</li>
            <li>They select their table number and waiter</li>
            <li>They complete the tip payment</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Button
            onClick={downloadQRCode}
            className="flex-1"
            variant="slim"
          >
            Download QR Code
          </Button>
          <Button
            onClick={printQRCode}
            className="flex-1"
            variant="slim"
          >
            Print QR Code
          </Button>
        </div>

        {/* Additional Info */}
        <div className="bg-blue-900/20 border border-blue-700/50 rounded-lg p-4">
          <p className="text-sm text-blue-200">
            <strong>Tip:</strong> You can print multiple copies of this QR code and place them on each table, 
            or create table tent cards with the QR code for better visibility.
          </p>
        </div>
      </div>
    </Card>
  );
}
