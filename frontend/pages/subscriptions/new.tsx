import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { subscriptionApi } from '../../lib/payment-api';
import SubscriptionForm from '../../components/subscriptions/SubscriptionForm';

export default function NewSubscription() {
  const router = useRouter();
  const { customer_id } = router.query;
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    const fetchCustomers = async () => {
      // In a real app, you would fetch customers from your API
      // For this demo, we're using mock data
      const mockCustomers = [
        { id: 'cust_123', email: 'john@example.com', name: 'John Doe' },
        { id: 'cust_456', email: 'jane@example.com', name: 'Jane Smith' },
        { id: 'cust_789', email: 'alice@example.com', name: 'Alice Johnson' }
      ];
      
      setCustomers(mockCustomers);
      
      // If customer_id is provided in the URL, set it as selected
      if (customer_id) {
        setSelectedCustomerId(customer_id as string);
      }
      
      setIsLoading(false);
    };
    
    fetchCustomers();
  }, [customer_id]);
  
  const handleSubscriptionCreated = (subscription: any) => {
    // In a real app, you might redirect to the subscription detail page
    router.push(`/subscriptions/${subscription.id}`);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>New Subscription | FastAPI Payments Demo</title>
      </Head>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">New Subscription</h1>
            <Link href="/subscriptions" className="text-indigo-600 hover:underline">
              Back to Subscriptions
            </Link>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              {isLoading ? (
                <div className="text-center py-4">Loading...</div>
              ) : !selectedCustomerId ? (
                <div>
                  <h2 className="text-lg font-medium text-gray-900 mb-4">Select a Customer</h2>
                  <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
                    <label htmlFor="customerId" className="block text-sm font-medium text-gray-700 mb-2">
                      Customer
                    </label>
                    <select
                      id="customerId"
                      className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                      onChange={(e) => setSelectedCustomerId(e.target.value)}
                      value=""
                    >
                      <option value="" disabled>Select a customer</option>
                      {customers.map((customer) => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} ({customer.email})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-medium text-gray-900">
                      Create Subscription for {customers.find(c => c.id === selectedCustomerId)?.name}
                    </h2>
                    <button
                      onClick={() => setSelectedCustomerId(null)}
                      className="text-sm text-gray-500 hover:text-gray-700"
                    >
                      Change Customer
                    </button>
                  </div>
                  <SubscriptionForm 
                    customerId={selectedCustomerId} 
                    onSuccess={handleSubscriptionCreated} 
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}