"use client";
import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { format } from 'date-fns';
import CreditCardForm from '../../../components/payments/CreditCardForm';
import OneTimePaymentForm from '../../../components/payments/OneTimePaymentForm';
import SubscriptionForm from '../../../components/subscriptions/SubscriptionForm';
import { customerApi, paymentMethodApi, subscriptionApi } from '../../../lib/payment-api';

// Load Stripe outside of render to avoid recreating it on each render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function CustomerDetail() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;
  
  const [customer, setCustomer] = useState<any | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  
  // Fetch customer data
  useEffect(() => {
    const fetchCustomerData = async () => {
      if (!customerId) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch customer, payment methods, and subscriptions in parallel
        const [customerData, paymentMethodsData, subscriptionsData] = await Promise.all([
          customerApi.getById(customerId),
          paymentMethodApi.getAllForCustomer(customerId),
          subscriptionApi.getAllForCustomer(customerId)
        ]);
        
        setCustomer(customerData);
        setPaymentMethods(paymentMethodsData);
        setSubscriptions(subscriptionsData);
      } catch (error: any) {
        setError(error.message || 'An error occurred while fetching customer data');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchCustomerData();
  }, [customerId]);
  
  const handlePaymentMethodAdded = (paymentMethod: any) => {
    setPaymentMethods([...paymentMethods, paymentMethod]);
    setActiveTab('paymentMethods');
  };
  
  const handleSubscriptionCreated = (subscription: any) => {
    setSubscriptions([...subscriptions, subscription]);
    setActiveTab('subscriptions');
  };
  
  const handlePaymentProcessed = (payment: any) => {
    // Show detailed success message with payment information
    const message = `Payment processed successfully!\n\n` +
      `Payment ID: ${payment.id}\n` +
      `Amount: $${payment.amount} ${payment.currency}\n` +
      `Status: ${payment.status}\n` +
      `Description: ${payment.description || 'N/A'}`;
    
    alert(message);
    
    // Navigate to the main payments page to see all payments
    router.push('/payments');
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="spinner">Loading...</div>
      </div>
    );
  }
  
  if (error || !customer) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow text-center max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-4">
            {error || 'Customer not found'}
          </h2>
          <Link href="/customers" className="text-indigo-600 hover:underline">
            Back to Customers
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <>
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{customer.name || 'Customer'}</h1>
          <p className="text-gray-500">{customer.email}</p>
        </div>
        <div className="mt-4 md:mt-0">
          <Link href="/customers" className="text-indigo-600 hover:underline">
            Back to Customers
          </Link>
        </div>
      </div>
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Overview
          </button>
          <button
            onClick={() => setActiveTab('paymentMethods')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'paymentMethods'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Payment Methods
          </button>
          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'subscriptions'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Subscriptions
          </button>
          <button
            onClick={() => setActiveTab('payments')}
            className={`py-4 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'payments'
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Payments
          </button>
        </nav>
      </div>
      
      {/* Tab Content */}
      <div className="bg-white shadow rounded-lg">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Customer Information</h2>
            <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Customer ID</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer.id}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{customer.name || 'Not provided'}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Created</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {format(new Date(customer.created_at), 'MMM d, yyyy')}
                </dd>
              </div>
            </dl>
            
            <div className="mt-8 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <button
                    onClick={() => setActiveTab('paymentMethods')}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Add Payment Method
                  </button>
                </div>
                <div>
                  <button
                    onClick={() => setActiveTab('subscriptions')}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Create Subscription
                  </button>
                </div>
                <div>
                  <button
                    onClick={() => setActiveTab('payments')}
                    className="w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                  >
                    Process Payment
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* Payment Methods Tab */}
        {activeTab === 'paymentMethods' && (
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Payment Methods</h2>
            
            {/* Payment Methods List */}
            {paymentMethods.length > 0 && (
              <div className="mb-8">
                <ul className="divide-y divide-gray-200">
                  {paymentMethods.map((method) => (
                    <li key={method.id} className="py-4">
                      <div className="flex items-center">
                        <div className="mr-4">
                          {method.type === 'card' && (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {method.card.brand.toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          {method.type === 'card' && (
                            <p className="text-sm font-medium text-gray-900">
                              •••• {method.card.last4}
                            </p>
                          )}
                          <p className="text-sm text-gray-500">
                            {method.type === 'card' && `Expires ${method.card.exp_month}/${method.card.exp_year}`}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Add Payment Method Form */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-4">Add Payment Method</h3>
              <Elements stripe={stripePromise}>
                <CreditCardForm customerId={customerId} onSuccess={handlePaymentMethodAdded} />
              </Elements>
            </div>
          </div>
        )}
        
        {/* Subscriptions Tab */}
        {activeTab === 'subscriptions' && (
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">Subscriptions</h2>
            
            {/* Subscriptions List */}
            {subscriptions.length > 0 && (
              <div className="mb-8">
                <ul className="divide-y divide-gray-200">
                  {subscriptions.map((subscription) => (
                    <li key={subscription.id} className="py-4">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {subscription.plan_name}
                          </p>
                          <p className="text-sm text-gray-500">
                            {`Quantity: ${subscription.quantity}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            subscription.status === 'active' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {subscription.status}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            Renews {format(new Date(subscription.current_period_end), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Create Subscription Form */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-4">Create Subscription</h3>
              <SubscriptionForm customerId={customerId} onSuccess={handleSubscriptionCreated} />
            </div>
          </div>
        )}
        
        {/* Payments Tab */}
        {activeTab === 'payments' && (
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">One-time Payments</h2>
            
            {/* Payment Form */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-4">Process Payment</h3>
              <OneTimePaymentForm customerId={customerId} onSuccess={handlePaymentProcessed} />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
