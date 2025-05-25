import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'NLP 2 SQL | Todo Manager',
  description: 'Manage your todos using natural language commands',
  openGraph: {
    title: 'NLP 2 SQL | Todo Manager',
    description: 'Manage your todos using natural language commands',
    url: 'https://nlp2sql.drasticcoder.in',
    siteName: 'NLP 2 SQL | Todo Manager',
    images: [
      {
        url: 'https://i.ibb.co/7tKrWsFv/image.png',
        width: 1200,
        height: 630,
        alt: 'NLP 2 SQL Todo Manager',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'NLP 2 SQL | Todo Manager',
    description: 'Manage your todos using natural language commands',
    images: ['https://i.ibb.co/7tKrWsFv/image.png'],
    creator: '@Drastic_Coder',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
