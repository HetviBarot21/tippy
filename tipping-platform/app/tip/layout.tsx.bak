import { Metadata } from 'next';
import { Toaster } from '@/components/ui/Toasts/toaster';
import { PropsWithChildren, Suspense } from 'react';
import { getURL } from '@/utils/helpers';
import 'styles/main.css';

const title = 'Tippy - Digital Tipping Platform';
const description = 'Tip your waiter or restaurant easily with mobile payments.';

export const metadata: Metadata = {
  metadataBase: new URL(getURL()),
  title: title,
  description: description,
  openGraph: {
    title: title,
    description: description
  },
  viewport: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no'
};

export default async function TipLayout({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <body className="bg-zinc-900">
        <main className="min-h-screen">
          {children}
        </main>
        <Suspense>
          <Toaster />
        </Suspense>
      </body>
    </html>
  );
}