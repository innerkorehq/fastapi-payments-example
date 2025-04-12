import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns';
import { subscriptionApi } from '../../lib/payment-api';

export default function Subscriptions() {
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchSubscriptions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // In a real app, you would have an API endpoint to list subscriptions
        // This is a simplified example using mock data
        const mockSubscriptions = [
          {
            id: 'sub_123',
            customer_id: 'cust_123',
            plan_name: 'Basic Plan',
            status: 'active',
            quantity: 1,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
            cancel_at_period_end: false,
            created_at: new Date().toISOString()
          },
          {
            id: 'sub_456',
            customer_id: 'cust_456',
            plan_name: 'Pro Plan',
            status: 'active',
            quantity: 2,
            current_period_start: new Date().toISOString(),
            current_period_end: new Date(Date.now() + 30*24*60*60*1000).toISOString(),
            cancel_at_period_end: false,
            created_at: new Date().toISOString()
          }
        ];
        setSubscriptions(mockSubscriptions);
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
      await subscriptionApi.cancelSubscription(subscriptionId, true);
      
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
  
  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'canceled':
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'past_due':
        return 'bg-yellow-100 text-yellow-800';
      case 'trialing':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Subscriptions | FastAPI Payments Demo</title>
      </Head>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Subscriptions</h1>
            <Link href="/subscriptions/new" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
              New Subscription
            </Link>
          </div>
          
          {error && (
            <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              </div>
            </div>
          )}
          
          {isLoading ? (
            <div className="text-center py-6">Loading...</div>
          ) : subscriptions.length === 0 ? (
            <div className="text-center py-6 text-gray-500">No subscriptions found</div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {subscriptions.map((subscription) => (
                  <li key={subscription.id}>
                    <div className="px-4 py-4 sm:px-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <Link href={`/subscriptions/${subscription.id}`} className="text-sm font-medium text-indigo-600 truncate hover:text-indigo-900">
                            {subscription.plan_name}
                          </Link>
                          <p className="text-sm text-gray-500">
                            Customer ID: {subscription.customer_id}
                          </p>
                        </div>
                        <div className="ml-2 flex-shrink-0 flex">
                          <p className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusBadgeColor(subscription.status)}`}>
                            {subscription.status}
                            {subscription.cancel_at_period_end && ' (cancels at period end)'}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 sm:flex sm:justify-between">
                        <div className="sm:flex">
                          <p className="flex items-center text-sm text-gray-500">
                            Quantity: {subscription.quantity}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center text-sm text-gray-500 sm:mt-0">
                          <p>
                            Current period: {format(new Date(subscription.current_period_start), 'MMM d, yyyy')} - {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end">
                        {!subscription.cancel_at_period_end && (
                          <button
                            onClick={() => handleCancelSubscription(subscription.id)}
                            className="text-sm text-red-600 hover:text-red-900"
                          >
                            Cancel at period end
                          </button>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}