"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { subscriptionApi } from '../../lib/payment-api';
import { Plus, Repeat, AlertCircle, Calendar, User } from 'lucide-react';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchSubscriptions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await subscriptionApi.getAll();
        setSubscriptions(data);
      } catch (error: any) {
        setError(error.message || 'An error occurred while fetching subscriptions');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchSubscriptions();
  }, []);
  
  const handleCancelSubscription = async (subscriptionId: string) => {
    try {
      await subscriptionApi.cancel(subscriptionId);
      
      // Update local state
      setSubscriptions((prevSubscriptions) =>
        prevSubscriptions.map((sub) =>
          sub.id === subscriptionId
            ? { ...sub, cancel_at_period_end: true }
            : sub
        )
      );
    } catch (error: any) {
      setError(error.message || 'An error occurred while canceling the subscription');
    }
  };
  
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'default';
      case 'canceled':
      case 'cancelled':
        return 'destructive';
      case 'past_due':
        return 'secondary';
      case 'trialing':
        return 'outline';
      default:
        return 'secondary';
    }
  };
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subscriptions</h1>
          <p className="text-muted-foreground mt-1">
            Manage recurring subscription billing
          </p>
        </div>
        <Button asChild>
          <Link href="/subscriptions/new">
            <Plus className="mr-2 h-4 w-4" />
            New Subscription
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading subscriptions...</p>
          </div>
        </div>
      ) : subscriptions.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Repeat className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No subscriptions found</p>
            <Button asChild>
              <Link href="/subscriptions/new">
                <Plus className="mr-2 h-4 w-4" />
                Create your first subscription
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {subscriptions.map((subscription) => (
            <Card key={subscription.id} className="hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Link 
                        href={`/subscriptions/${subscription.id}`}
                        className="hover:underline"
                      >
                        {subscription.plan_name}
                      </Link>
                    </CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <User className="h-3 w-3" />
                      Customer ID: {subscription.customer_id}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(subscription.status)}>
                    {subscription.status}
                    {subscription.cancel_at_period_end && ' (cancels at period end)'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-4 w-4" />
                      <span>
                        {subscription.current_period_start && subscription.current_period_end ? (
                          `${format(new Date(subscription.current_period_start), 'MMM d, yyyy')} - ${format(new Date(subscription.current_period_end), 'MMM d, yyyy')}`
                        ) : (
                          'Pending activation'
                        )}
                      </span>
                    </div>
                    <p className="text-sm">
                      Quantity: <span className="font-medium">{subscription.quantity}</span>
                    </p>
                  </div>
                  {!subscription.cancel_at_period_end && (
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleCancelSubscription(subscription.id)}
                    >
                      Cancel at period end
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
