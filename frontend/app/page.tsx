"use client";
import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, CreditCard, Package, Repeat, ArrowRight, RefreshCw } from 'lucide-react';
import { syncApi } from '../lib/payment-api';

export default function Home() {
  const [syncJob, setSyncJob] = useState<any | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const isJobActive = !!syncJob && ['pending', 'running', 'in_progress'].includes((syncJob.status || '').toLowerCase());

  const triggerSync = async () => {
    setSyncError(null);
    setIsSyncing(true);
    try {
      const job = await syncApi.trigger();
      setSyncJob(job);
    } catch (error: any) {
      const detail = error?.response?.data?.detail || error?.prettyMessage || error?.message || 'Failed to start sync';
      setSyncError(detail);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (!syncJob?.id) return;
    const status = (syncJob.status || '').toLowerCase();
    if (['completed', 'failed'].includes(status)) return;

    const interval = setInterval(async () => {
      try {
        const updated = await syncApi.getJob(syncJob.id);
        setSyncJob(updated);
      } catch (error: any) {
        console.error('Failed to poll sync job', error);
        const detail = error?.response?.data?.detail || error?.prettyMessage || error?.message || 'Failed to fetch sync status';
        setSyncError(detail);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [syncJob?.id, syncJob?.status]);

  const renderSyncSummary = () => {
    const summary = syncJob?.result?.summary;
    if (!summary) return null;

    return (
      <ul className="mt-3 text-sm text-muted-foreground space-y-1">
        {Object.entries(summary).map(([resource, stats]) => {
          const item = stats as Record<string, number | string | undefined>;
          return (
            <li key={resource} className="flex justify-between">
              <span className="capitalize">{resource}</span>
              <span>
                {item.synced ?? 0} synced · {item.updated ?? 0} updated
              </span>
            </li>
          );
        })}
      </ul>
    );
  };
  const features = [
    {
      title: 'Customers',
      description: 'Manage your customer base and their information',
      icon: Users,
      href: '/customers',
      color: 'text-blue-500',
    },
    {
      title: 'Payments',
      description: 'Process and track one-time payments',
      icon: CreditCard,
      href: '/payments',
      color: 'text-green-500',
    },
    {
      title: 'Subscriptions',
      description: 'Handle recurring subscription billing',
      icon: Repeat,
      href: '/subscriptions',
      color: 'text-purple-500',
    },
    {
      title: 'Products',
      description: 'Create and manage products and pricing plans',
      icon: Package,
      href: '/products',
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="container mx-auto py-12 space-y-12">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
          FastAPI Payments
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          A modern payment processing system built with FastAPI and Next.js
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Button size="lg" asChild>
            <Link href="/customers">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
          <Button size="lg" variant="outline" asChild>
            <a href="http://localhost:8000/docs" target="_blank" rel="noopener noreferrer">
              View API Docs
            </a>
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto w-full">
        <Card className="shadow-sm">
          <CardHeader className="space-y-1">
            <CardTitle className="text-base flex items-center gap-2">
              <RefreshCw className="h-4 w-4" /> Sync provider data
            </CardTitle>
            <CardDescription>
              Kick off a background sync job to refresh local products, customers, plans, subscriptions, and payments from every configured provider.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-sm text-muted-foreground">
                  Status: {syncJob?.status ? syncJob.status : 'Idle'}
                </p>
                {syncJob?.updated_at && (
                  <p className="text-xs text-muted-foreground">Updated at {new Date(syncJob.updated_at).toLocaleTimeString()}</p>
                )}
              </div>
              <Button onClick={triggerSync} disabled={isSyncing || isJobActive} variant="default">
                {isSyncing || isJobActive ? (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Syncing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Start Sync
                  </span>
                )}
              </Button>
            </div>
            {syncError && <p className="text-sm text-red-500">{syncError}</p>}
            {syncJob?.result && renderSyncSummary()}
            {syncJob && !syncJob.result && !isJobActive && (
              <p className="text-sm text-muted-foreground">Waiting for provider responses...</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <Link key={feature.href} href={feature.href}>
              <Card className="h-full hover:shadow-lg transition-all hover:scale-105 cursor-pointer">
                <CardHeader>
                  <div className={`w-12 h-12 rounded-lg bg-muted flex items-center justify-center mb-4`}>
                    <Icon className={`h-6 w-6 ${feature.color}`} />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button variant="ghost" className="w-full justify-between">
                    Explore
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle>Features</CardTitle>
          <CardDescription>Everything you need for payment processing</CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-3 md:grid-cols-2">
            <li className="flex items-start gap-2">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <span className="text-sm">Customer management with detailed profiles</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <span className="text-sm">Secure payment method storage</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <span className="text-sm">Flexible subscription billing</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <span className="text-sm">Product and plan management</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <span className="text-sm">RESTful API with OpenAPI documentation</span>
            </li>
            <li className="flex items-start gap-2">
              <div className="mt-0.5 h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <div className="h-2 w-2 rounded-full bg-primary" />
              </div>
              <span className="text-sm">Modern, responsive UI</span>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
