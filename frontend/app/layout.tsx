import '../styles/globals.css';
import type { Metadata } from 'next';
import RouteGuard from '../components/RouteGuard';
import NavigationWrapper from '../components/NavigationWrapper';
import { Toaster } from 'react-hot-toast';

export const metadata: Metadata = {
  title: 'BUNK — A World Inside Your College Life',
  description: 'Escape the routine. Enter your world. A social entertainment universe built for college students.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta name="theme-color" content="#0B0C10" />
      </head>
      <body className="bg-[#0B0C10] text-[#F8FAFC] antialiased">
        <RouteGuard>
          <NavigationWrapper>
            <main className="min-h-screen relative overflow-x-hidden">
              {children}
            </main>
          </NavigationWrapper>
        </RouteGuard>

        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#161822',
              color: '#F8FAFC',
              border: '1px solid #2A2F42',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: '600',
            },
          }}
        />
      </body>
    </html>
  );
}
