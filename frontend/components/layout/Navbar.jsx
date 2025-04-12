import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';

export default function Navbar() {
  const router = useRouter();
  
  const isActive = (path) => {
    return router.pathname === path ? 'bg-gray-900 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white';
  };
  
  return (
    <nav className="bg-gray-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <Link href="/" className="text-white font-bold text-xl">
                FastAPI Payments
              </Link>
            </div>
            <div className="hidden md:block">
              <div className="ml-10 flex items-baseline space-x-4">
                <Link href="/" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/')}`}>
                  Home
                </Link>
                <Link href="/customers" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/customers')}`}>
                  Customers
                </Link>
                <Link href="/payments" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/payments')}`}>
                  Payments
                </Link>
                <Link href="/subscriptions" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/subscriptions')}`}>
                  Subscriptions
                </Link>
                <Link href="/products" className={`px-3 py-2 rounded-md text-sm font-medium ${isActive('/products')}`}>
                  Products
                </Link>
              </div>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="ml-4 flex items-center md:ml-6">
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-300 hover:bg-gray-700 hover:text-white px-3 py-2 rounded-md text-sm font-medium"
              >
                API Docs
              </a>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}