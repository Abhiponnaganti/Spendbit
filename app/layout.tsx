import type { Metadata } from 'next';
import { Providers } from './providers';
import './globals.css';
import Chatbot from '@/components/Chatbot';

export const metadata: Metadata = {
  title: 'Spendbit - Smart Personal Finance Tracker',
  description: 'Track your finances with AI-powered insights and intelligent budgeting',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {children}
          <Chatbot />
        </Providers>
      </body>
    </html>
  );
}

