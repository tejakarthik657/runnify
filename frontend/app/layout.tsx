import '../styles/globals.css'
import type { Metadata } from 'next'
import { Nunito } from 'next/font/google'
import RouteGuard from '../components/RouteGuard'
import NavigationWrapper from '../components/NavigationWrapper'
import { Toaster } from 'react-hot-toast'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  variable: '--font-nunito'
})

export const metadata: Metadata = {
  title: 'TerritoryRun // Command Center ✨ Live v2',
  description: 'Soft competition. Hard gains.',
}

const COLORS = {
  sageGreen: '#A8D5BA',
  pageBg: '#F4F7F4',
  textPrimary: '#1a1a2e',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={`${nunito.variable}`}>
      <head>
        <style>{`
          body { background-color: ${COLORS.pageBg}; color: ${COLORS.textPrimary}; margin: 0; font-family: 'Nunito', sans-serif; }
          ::selection { background-color: ${COLORS.sageGreen}; color: ${COLORS.textPrimary}; }
        `}</style>
      </head>
      <body className="bg-[#F4F7F4] text-[#1a1a2e] antialiased">

        <RouteGuard>
          <NavigationWrapper>
            <main className="min-h-screen relative overflow-x-hidden">
              {children}
            </main>
          </NavigationWrapper>
        </RouteGuard>

        {/* 5.8 Notification System Styling */}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: '#14141F',
              color: '#E8E8F0',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '0px',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              fontFamily: 'Inter, sans-serif',
            },
            success: {
              iconTheme: {
                primary: '#00C896',
                secondary: '#0D0D1A',
              },
              style: {
                borderLeft: '4px solid #00C896',
              }
            },
            error: {
              iconTheme: {
                primary: '#FF2244',
                secondary: '#0D0D1A',
              },
              style: {
                borderLeft: '4px solid #FF2244',
              }
            }
          }}
        />

        {/* 5.1 Global Background Texture (Optional subtle grid) */}
        <div className="fixed inset-0 pointer-events-none opacity-[0.03] z-[-1]"
          style={{
            backgroundImage: `linear-gradient(to right, #6B7280 1px, transparent 1px), linear-gradient(to bottom, #6B7280 1px, transparent 1px)`,
            backgroundSize: '40px 40px'
          }}
        />
      </body>
    </html>
  )
}