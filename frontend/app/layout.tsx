import React from 'react';
import '../styles/globals.css';
import Navbar from '../components/layout/Navbar';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'FastAPI Payments Demo',
  description: 'NextJS demo for FastAPI Payments',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {children}
          </div>
        </main>
        <footer className="bg-white border-t border-gray-200 py-4">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <p className="text-center text-gray-500 text-sm">
              &copy; {new Date().getFullYear()} FastAPI Payments Demo
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
