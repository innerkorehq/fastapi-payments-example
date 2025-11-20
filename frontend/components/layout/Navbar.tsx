"use client";
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path;
  };

  const navItems = [
    { href: '/', label: 'Home' },
    { href: '/customers', label: 'Customers' },
    { href: '/payments', label: 'Payments' },
    { href: '/subscriptions', label: 'Subscriptions' },
    { href: '/products', label: 'Products' },
  ];

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <Link href="/" className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              FastAPI Payments
            </Link>
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => (
                <Button
                  key={item.href}
                  variant={isActive(item.href) ? "default" : "ghost"}
                  size="sm"
                  asChild
                >
                  <Link href={item.href}>
                    {item.label}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
          <div className="hidden md:block">
            <Button variant="outline" size="sm" asChild>
              <a
                href="http://localhost:8000/docs"
                target="_blank"
                rel="noopener noreferrer"
              >
                API Docs
              </a>
            </Button>
          </div>
        </div>
      </div>
    </nav>
  );
}