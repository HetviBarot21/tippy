'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QRCodeAnalyticsDashboard } from './QRCodeAnalyticsDashboard';
import QRCodeManager from './QRCodeManager';

interface Props {
  restaurantId: string;
  restaurantName: string;
}

export function EnhancedQRCodeManager({ restaurantId, restaurantName }: Props) {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="analytics" className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-zinc-900 border-zinc-700">
          <TabsTrigger 
            value="analytics" 
            className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400"
          >
            Analytics & Usage
          </TabsTrigger>
          <TabsTrigger 
            value="management" 
            className="data-[state=active]:bg-zinc-700 data-[state=active]:text-white text-zinc-400"
          >
            QR Code Management
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="analytics" className="mt-6">
          <QRCodeAnalyticsDashboard restaurantId={restaurantId} />
        </TabsContent>
        
        <TabsContent value="management" className="mt-6">
          <QRCodeManager restaurantId={restaurantId} restaurantName={restaurantName} />
        </TabsContent>
      </Tabs>
    </div>
  );
}