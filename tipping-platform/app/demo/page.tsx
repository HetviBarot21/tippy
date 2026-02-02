import TippingInterface from '@/components/ui/TippingInterface/TippingInterface';

// Mock data for demo
const mockRestaurant = {
  id: 'restaurant-123',
  name: 'Demo Restaurant',
  slug: 'demo-restaurant',
  email: 'demo@restaurant.com',
  commission_rate: 10.0,
  is_active: true,
  address: '123 Demo Street',
  phone_number: '+254700000000',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockTable = {
  id: 'table-456',
  number: '5',
  name: 'Window Table'
};

const mockWaiters = [
  {
    id: 'waiter-1',
    name: 'John Doe',
    profile_photo_url: null
  },
  {
    id: 'waiter-2',
    name: 'Jane Smith',
    profile_photo_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: 'waiter-3',
    name: 'Mike Johnson',
    profile_photo_url: null
  },
  {
    id: 'waiter-4',
    name: 'Sarah Wilson',
    profile_photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: 'waiter-5',
    name: 'David Brown',
    profile_photo_url: null
  }
];

export default function DemoPage() {
  return (
    <TippingInterface
      restaurant={mockRestaurant}
      table={mockTable}
      waiters={mockWaiters}
    />
  );
}