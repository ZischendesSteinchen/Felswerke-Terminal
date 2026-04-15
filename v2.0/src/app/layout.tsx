import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Felswerke Terminal',
  description: 'AI-powered crypto trading terminal',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen bg-terminal-bg text-terminal-text font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
