"use client";
import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import apiClient from '@/lib/api-client';

export default function SubscriptionDetail() {
  const params = useParams();
  const router = useRouter();
  const subscriptionId = params.id as string;

  const [subscription, setSubscription] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!subscriptionId) return;
      setIsLoading(true);
      setError(null);
      try {
        const res = await apiClient.get(`/subscriptions/${subscriptionId}`);
        setSubscription(res.data);
      } catch (err: any) {
        setError(err?.message || 'Failed to fetch subscription');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSubscription();
  }, [subscriptionId]);

  const handleCancel = async () => {
    if (!subscriptionId) return;
    if (!confirm('Cancel this subscription?')) return;
    setIsCancelling(true);
    setError(null);
    try {
      await apiClient.post(`/subscriptions/${subscriptionId}/cancel`);
      // After cancel, navigate back to list
      router.push('/subscriptions');
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  if (isLoading) {
    return <div className="py-12 text-center">Loading subscription...</div>;
  }

  if (error || !subscription) {
    return (
      <div className="py-12">
        <div className="max-w-xl mx-auto">
          <Alert variant="destructive">
            <AlertDescription>{error || 'Subscription not found'}</AlertDescription>
          </Alert>
          <div className="mt-4">
            <Link href="/subscriptions" className="text-indigo-600 hover:underline">Back to Subscriptions</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Subscription</h1>
          <p className="text-gray-500">ID: {subscription.id}</p>
        </div>
        <div>
          <Link href="/subscriptions" className="mr-4 text-indigo-600 hover:underline">Back</Link>
          {subscription.status === 'active' && (
            <Button variant="destructive" onClick={handleCancel} disabled={isCancelling}>
              {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
            <div>
              <dt className="text-sm font-medium text-gray-500">Customer</dt>
              <dd className="mt-1 text-sm text-gray-900">{subscription.customer_id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Plan</dt>
              <dd className="mt-1 text-sm text-gray-900">{subscription.plan_name || subscription.plan_id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Quantity</dt>
              <dd className="mt-1 text-sm text-gray-900">{subscription.quantity}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Status</dt>
              <dd className="mt-1 text-sm text-gray-900">{subscription.status}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Current Period End</dt>
              <dd className="mt-1 text-sm text-gray-900">{subscription.current_period_end ? format(new Date(subscription.current_period_end), 'PPP') : 'N/A'}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">{subscription.created_at ? format(new Date(subscription.created_at), 'PPP') : 'N/A'}</dd>
            </div>
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}
