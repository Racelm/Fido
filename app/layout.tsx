import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
  weight: ['400', '500', '600', '700', '800'],
})

export const metadata: Metadata = {
  title: 'Tiwizi — Espace cabinet & clients',
  description: 'La plateforme simple pour collaborer avec vos clients.',
  applicationName: 'Tiwizi',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || 'https://tiwizi.raeldata.com'),
  openGraph: { title: 'Tiwizi — Espace cabinet & clients', description: 'La plateforme simple pour collaborer avec vos clients.', siteName: 'Tiwizi', url: process.env.NEXT_PUBLIC_SITE_URL || 'https://tiwizi.raeldata.com' },
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr" className={jakarta.variable}>
      <body>{children}</body>
    </html>
  )
}
