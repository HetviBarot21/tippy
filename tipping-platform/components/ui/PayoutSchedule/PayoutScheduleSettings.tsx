'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Calendar, Bell, CheckCircle2 } from 'lucide-react';

interface Props {
  restaurantId: string;
}

export function PayoutScheduleSettings({ restaurantId }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [payoutDay, setPayoutDay] = useState(28);
  const [notificationDays, setNotificationDays] = useState(3);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSchedule();
  }, [restaurantId]);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/restaurants/${restaurantId}/payout-schedule`);
      const data = await response.json();
      
      if (data.success) {
        setEnabled(data.schedule.enabled);
        setPayoutDay(data.schedule.payout_day);
        setNotificationDays(data.schedule.notification_days);
      }
    } catch (error) {
      console.error('Error fetching payout schedule:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setMessage(null);

      const response = await fetch(`/api/restaurants/${restaurantId}/payout-schedule`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          enabled,
          payout_day: payoutDay,
          notification_days: notificationDays
        })
      });

      const data = await response.json();

      if (data.success) {
        setMessage({ type: 'success', text: 'Payout schedule updated successfully' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: data.error || 'Failed to update schedule' });
      }
    } catch (error) {
      console.error('Error saving payout schedule:', error);
      setMessage({ type: 'error', text: 'Failed to update schedule' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card className="bg-zinc-900 border-zinc-700">
        <CardContent className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-white" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-zinc-900 border-zinc-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center space-x-2">
          <Calendar className="h-5 w-5" />
          <span>Automated Payout Schedule</span>
        </CardTitle>
        <CardDescription className="text-zinc-400">
          Configure when payouts are automatically processed and sent to staff members
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enable/Disable Toggle */}
        <div className="flex items-center justify-between p-4 bg-zinc-800 rounded-lg">
          <div className="space-y-1">
            <Label htmlFor="enabled" className="text-white font-medium">
              Enable Automated Payouts
            </Label>
            <p className="text-sm text-zinc-400">
              Automatically process and send payouts each month
            </p>
          </div>
          <Switch
            id="enabled"
            checked={enabled}
            onCheckedChange={setEnabled}
          />
        </div>

        {/* Payout Day Selection */}
        <div className="space-y-3">
          <Label htmlFor="payout-day" className="text-white">
            Payout Day of Month
          </Label>
          <select
            id="payout-day"
            value={payoutDay}
            onChange={(e) => setPayoutDay(Number(e.target.value))}
            disabled={!enabled}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {Array.from({ length: 28 }, (_, i) => i + 1).map((day) => (
              <option key={day} value={day}>
                Day {day} of each month
              </option>
            ))}
          </select>
          <p className="text-xs text-zinc-400">
            Payouts will be processed on this day each month
          </p>
        </div>

        {/* Notification Days */}
        <div className="space-y-3">
          <Label htmlFor="notification-days" className="text-white flex items-center space-x-2">
            <Bell className="h-4 w-4" />
            <span>Notification Days Before Payout</span>
          </Label>
          <select
            id="notification-days"
            value={notificationDays}
            onChange={(e) => setNotificationDays(Number(e.target.value))}
            disabled={!enabled}
            className="w-full px-3 py-2 bg-zinc-800 border border-zinc-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <option value={0}>No notification</option>
            <option value={1}>1 day before</option>
            <option value={2}>2 days before</option>
            <option value={3}>3 days before</option>
            <option value={5}>5 days before</option>
            <option value={7}>7 days before</option>
          </select>
          <p className="text-xs text-zinc-400">
            Staff will receive SMS notifications before payout is processed
          </p>
        </div>

        {/* Summary */}
        {enabled && (
          <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-start space-x-3">
              <CheckCircle2 className="h-5 w-5 text-blue-400 mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm text-blue-400 font-medium">Schedule Active</p>
                <p className="text-xs text-zinc-300">
                  Payouts will be processed on day {payoutDay} of each month.
                  {notificationDays > 0 && ` Staff will be notified ${notificationDays} day${notificationDays > 1 ? 's' : ''} before.`}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Success/Error Message */}
        {message && (
          <div className={`p-3 rounded-lg ${
            message.type === 'success' 
              ? 'bg-green-500/10 border border-green-500/30 text-green-400' 
              : 'bg-red-500/10 border border-red-500/30 text-red-400'
          }`}>
            <p className="text-sm">{message.text}</p>
          </div>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={saving}
          className="w-full bg-blue-600 hover:bg-blue-700"
        >
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            'Save Schedule Settings'
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
