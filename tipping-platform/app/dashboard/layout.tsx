import { ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

export default function DashboardLayout({ children }: Props) {
  return (
    <div className="min-h-screen bg-black">
      {children}
    </div>
  );
}