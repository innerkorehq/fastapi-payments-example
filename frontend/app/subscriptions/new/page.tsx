"use client";
import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { subscriptionApi, customerApi, providerApi } from '../../../lib/payment-api';
import SubscriptionForm from '../../../components/subscriptions/SubscriptionForm';
import { ArrowLeft, Users } from 'lucide-react';

function NewSubscriptionContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customer_id = searchParams.get('customer_id');
  
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [providerCatalog, setProviderCatalog] = useState<{ default_provider?: string; providers?: any[] } | null>(null);
  
  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const data = await customerApi.getAll();
        setCustomers(data);
        
        // If customer_id is provided in the URL, set it as selected
        if (customer_id) {
          setSelectedCustomerId(customer_id as string);
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching customers:', error);
        setIsLoading(false);
      }
    };
    
    fetchCustomers();
  }, [customer_id]);

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const catalog = await providerApi.list();
        setProviderCatalog(catalog);
      } catch (err: any) {
        console.error('Error loading providers:', err);
      }
    };

    loadProviders();
  }, []);
  
  const handleSubscriptionCreated = (subscription: any) => {
    // In a real app, you might redirect to the subscription detail page
    router.push(`/subscriptions/${subscription.id}`);
  };
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/subscriptions">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">New Subscription</h1>
          <p className="text-muted-foreground mt-1">
            Create a new subscription for a customer
          </p>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Subscription Details</CardTitle>
          <CardDescription>
            Select a customer and configure their subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !selectedCustomerId ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customerId">Select Customer</Label>
                <Select onValueChange={setSelectedCustomerId}>
                  <SelectTrigger id="customerId">
                    <SelectValue placeholder="Choose a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          <span>{customer.name} ({customer.email})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
                <div>
                  <p className="text-sm font-medium">Selected Customer</p>
                  <p className="text-sm text-mu
                providers={providerCatalog?.providers || []}
                defaultProvider={providerCatalog?.default_provider}ed-foreground">
                    {customers.find(c => c.id === selectedCustomerId)?.name} ({customers.find(c => c.id === selectedCustomerId)?.email})
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedCustomerId(null)}
                >
                  Change
                </Button>
              </div>
              <SubscriptionForm 
                customerId={selectedCustomerId} 
                onSuccess={handleSubscriptionCreated} 
                onError={setError}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function NewSubscription() {
  return (
    <Suspense fallback={
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    }>
      <NewSubscriptionContent />
    </Suspense>
  );
}
