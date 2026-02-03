import TippingInterface from '@/components/ui/TippingInterface/TippingInterface';

// Mock data for demo - using real restaurant from database
const mockRestaurant = {
  id: '12345678-1234-4567-8901-123456789012', // Real restaurant ID from database
  name: 'Mama Mia Italian Restaurant',
  slug: 'mama-mia-italian',
  email: 'demo@restaurant.com',
  commission_rate: 10.0,
  is_active: true,
  address: '123 Demo Street',
  phone_number: '+254700000000',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString()
};

const mockTable = {
  id: '12345678-1234-4567-8901-123456789014', // Real table ID from database
  number: '1',
  name: 'Demo Table'
};

const mockWaiters = [
  {
    id: '12345678-1234-4567-8901-123456789013', // Real waiter IDs from database
    name: 'John Doe',
    profile_photo_url: null
  },
  {
    id: '12345678-1234-4567-8901-123456789020',
    name: 'John Kamau',
    profile_photo_url: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face'
  },
  {
    id: '12345678-1234-4567-8901-123456789021',
    name: 'Mary Wanjiku',
    profile_photo_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face'
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