import type { Metadata } from 'next';
import './globals.css';
import '@xterm/xterm/css/xterm.css';

export const metadata: Metadata = {
  title: 'eLab',
  description:
    'Practice technologies, master stacks and solve real-world challenges.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}