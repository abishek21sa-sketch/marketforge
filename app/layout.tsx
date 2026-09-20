import type { Metadata } from 'next';
import './globals.css';
import './research.css';
export const metadata: Metadata = { title: 'MarketForge · Execution Lab', description: 'Market microstructure and execution intelligence for paper trading research.' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
