import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import NavBar from '@/components/NavBar';
import { ThemeProvider } from '@/components/ThemeProvider';
import { Toaster } from '@/components/ui/toaster';
import Background from '@/components/Background';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
title: 'EarthWise Coach - Sustainable Living & Wellness',
description: 'Your personal AI coach for sustainable living and holistic wellness',
};

export default function RootLayout({
children,
}: {
children: React.ReactNode;
}) {
return (
<html lang="en">
<body className={inter.className}>
<ThemeProvider>
<div className="relative min-h-screen">
<Background />
<NavBar />
{children}
<Toaster />
</div>
</ThemeProvider>
</body>
</html>
);
}