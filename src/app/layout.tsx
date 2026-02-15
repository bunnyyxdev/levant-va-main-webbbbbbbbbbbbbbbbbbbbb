import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import './globals.css';
import SecurityProtector from '@/components/SecurityProtector';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

const outfit = Outfit({
    subsets: ['latin'],
    variable: '--font-outfit',
});

export const metadata: Metadata = {
    title: 'Levant Virtual Airline | The Inspiration of Middle East',
    description: 'Experience the leading virtual airline of the Middle East. Join our advanced flight operations and supportive community.',
    keywords: ['virtual airline', 'flight simulator', 'Middle East', 'aviation', 'VATSIM'],
    icons: {
        icon: [
            { url: '/img/logo.ico', sizes: '16x16 32x32 48x48' },
            { url: '/img/logo-256.png', sizes: '256x256', type: 'image/png' },
        ],
        apple: '/img/logo-256.png',
    },
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${inter.variable} ${outfit.variable}`} data-scroll-behavior="smooth">
            <head>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" />
            </head>
            <body className="antialiased">
                {/* <SecurityProtector /> */}
                <AuthProvider>
                    {children}
                </AuthProvider>
                <Toaster position="top-right" richColors theme="dark" />
            </body>
        </html>
    );
}
