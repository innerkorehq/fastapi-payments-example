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
import { customerApi, paymentMethodApi, subscriptionApi, providerApi, customerProviderApi } from '../../../lib/payment-api';

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
  const [providerCatalog, setProviderCatalog] = useState<{ default_provider?: string; providers?: any[] } | null>(null);
  const [providersError, setProvidersError] = useState<string | null>(null);
  const [linkingProvider, setLinkingProvider] = useState<string | null>(null);
  const [linkProviderError, setLinkProviderError] = useState<string | null>(null);

  const providerLinks = (customer?.provider_customers as any[]) || [];
  const catalogProviders = providerCatalog?.providers || [];
  const registeredProviderNames = new Set(
    providerLinks.map((link) => link?.provider).filter(Boolean)
  );
  const activeProviders = catalogProviders.filter((provider) =>
    registeredProviderNames.has(provider.name)
  );
  const inactiveProviders = catalogProviders.filter(
    (provider) => !registeredProviderNames.has(provider.name)
  );
  const activeDefaultProviderName = activeProviders.find(
    (provider) => provider.name === providerCatalog?.default_provider
  )?.name;
  
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

  useEffect(() => {
    const loadProviders = async () => {
      try {
        const catalog = await providerApi.list();
        setProviderCatalog(catalog);
      } catch (err: any) {
        const detail = err?.response?.data?.detail || err?.message || 'Failed to load providers';
        setProvidersError(detail);
      }
    };

    loadProviders();
  }, []);

  const handleLinkProvider = async (providerName: string) => {
    setLinkProviderError(null);
    setLinkingProvider(providerName);
    try {
      const link = await customerProviderApi.link(customerId, providerName);
      setCustomer((prev: any) => {
        if (!prev) return prev;
        const existing = (prev.provider_customers || []).filter(
          (pc: any) => pc.provider !== link.provider
        );
        return {
          ...prev,
          provider_customers: [...existing, link],
        };
      });
    } catch (err: any) {
      const detail = err?.response?.data?.detail || err?.message || 'Failed to enable provider';
      setLinkProviderError(detail);
    } finally {
      setLinkingProvider(null);
    }
  };
  
  const handlePaymentMethodAdded = (paymentMethod: any) => {
    setPaymentMethods((prev) => [...prev, paymentMethod]);
    setActiveTab('paymentMethods');
  };
  
  const handleSubscriptionCreated = (subscription: any) => {
    setSubscriptions((prev) => [...prev, subscription]);
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
        <div className="mt-4 md:mt-0 flex gap-4 items-center">
          <Link href={`/customers/${customer.id}/edit`} className="text-sm px-3 py-1 rounded border bg-white hover:bg-gray-50 text-indigo-600">Edit</Link>
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
              {customer.address && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Address</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {customer.address.line1}{customer.address.line2 ? `, ${customer.address.line2}` : ''}{customer.address.city ? `, ${customer.address.city}` : ''}{customer.address.state ? `, ${customer.address.state}` : ''}{customer.address.postal_code ? `, ${customer.address.postal_code}` : ''}{customer.address.country ? `, ${customer.address.country}` : ''}
                  </dd>
                </div>
              )}
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

            {providerCatalog && (
              <div className="mt-8 border-t border-gray-200 pt-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Payment Providers</h3>
                  {providersError && (
                    <span className="text-sm text-red-500">{providersError}</span>
                  )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {activeProviders.length > 0 ? (
                    activeProviders.map((provider) => (
                      <span
                        key={provider.name}
                        className="px-3 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800"
                      >
                        {provider.display_name || provider.name}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-gray-600">No providers linked yet.</p>
                  )}
                </div>
                {inactiveProviders.length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-sm text-gray-700">
                      Enable additional providers for this customer:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {inactiveProviders.map((provider) => (
                        <button
                          key={provider.name}
                          onClick={() => handleLinkProvider(provider.name)}
                          disabled={linkingProvider === provider.name}
                          className="px-3 py-1 text-sm rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50 disabled:opacity-50"
                        >
                          {linkingProvider === provider.name ? 'Enabling...' : `Enable ${provider.display_name || provider.name}`}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {linkProviderError && (
                  <p className="text-sm text-red-500 mt-2">{linkProviderError}</p>
                )}
              </div>
            )}
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
                              {(method.card?.brand || 'CARD').toUpperCase()}
                            </span>
                          )}
                          {method.provider && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                              {method.provider}
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
                        <div className="ml-auto flex items-center gap-2">
                          {method.is_default ? (
                            <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800">Default</span>
                          ) : (
                            <button
                              onClick={async () => {
                                try {
                                  const updated = await paymentMethodApi.setDefault(customerId, method.id);
                                  // update local state: mark only this method default
                                  setPaymentMethods((prev) => prev.map((m) => ({ ...m, is_default: m.id === method.id })));
                                  alert('Marked as default');
                                } catch (err: any) {
                                  console.error('Failed to set default', err);
                                  alert(err?.response?.data?.detail || 'Failed to set default');
                                }
                              }}
                              className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50 text-indigo-600"
                            >
                              Set default
                            </button>
                          )}

                          <button
                            onClick={async () => {
                              if (!confirm('Are you sure you want to delete this payment method?')) return;
                              try {
                                await paymentMethodApi.delete(customerId, method.id);
                                setPaymentMethods((prev) => prev.filter((m) => m.id !== method.id));
                                alert('Payment method deleted');
                              } catch (err: any) {
                                console.error('Failed to delete', err);
                                alert(err?.response?.data?.detail || 'Failed to delete payment method');
                              }
                            }}
                            className="text-xs px-2 py-1 rounded border bg-white hover:bg-gray-50 text-red-600"
                          >
                            Delete
                          </button>
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
                <CreditCardForm
                  customerId={customerId}
                  providers={activeProviders}
                  defaultProvider={activeDefaultProviderName}
                  onSuccess={handlePaymentMethodAdded}
                />
              </Elements>
              {providersError && (
                <p className="text-sm text-red-500 mt-2">{providersError}</p>
              )}
              {activeProviders.length === 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Link a provider above to start saving payment methods for this customer.
                </p>
              )}
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
                      <Link
                        href={`/subscriptions/${subscription.id}`}
                        className="flex justify-between items-center hover:bg-gray-50 p-3 rounded-md"
                      >
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
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            
            {/* Create Subscription Form */}
            <div className="bg-gray-50 p-4 rounded-md border border-gray-200">
              <h3 className="text-md font-medium text-gray-900 mb-4">Create Subscription</h3>
              <SubscriptionForm 
                customerId={customerId} 
                providers={activeProviders}
                defaultProvider={activeDefaultProviderName}
                onSuccess={handleSubscriptionCreated} 
                onError={setError} 
              />
              {providersError && (
                <p className="text-sm text-red-500 mt-2">{providersError}</p>
              )}
              {activeProviders.length === 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Enable a provider to create subscriptions for this customer.
                </p>
              )}
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
              <OneTimePaymentForm
                customerId={customerId}
                paymentMethods={paymentMethods}
                providers={activeProviders}
                defaultProvider={activeDefaultProviderName}
                customer={customer}
                onSuccess={handlePaymentProcessed}
                onError={setError}
              />
              {providersError && (
                <p className="text-sm text-red-500 mt-2">{providersError}</p>
              )}
              {activeProviders.length === 0 && (
                <p className="text-sm text-gray-600 mt-2">
                  Enable a provider to process payments for this customer.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
