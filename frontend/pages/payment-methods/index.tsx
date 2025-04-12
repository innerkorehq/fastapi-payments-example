import React, { useState } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import Layout from '../components/layout/Layout';

// Mock stripePromise - in a real app, use your publishable key from env var
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

export default function PaymentMethodsPage() {
  const [customerId, setCustomerId] = useState('');
  
  return (
    <Layout title="FastAPI Payments Demo">
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Payment Methods | FastAPI Payments Demo</title>
      </Head>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Payment Methods</h1>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900">Find Customer</h2>
              <div className="mt-2 max-w-xl text-sm text-gray-500">
                <p>Enter a customer ID to view and manage their payment methods.</p>
              </div>
              <form className="mt-5 sm:flex sm:items-center" onSubmit={(e) => {
                e.preventDefault();
                if (customerId) {
                  window.location.href = `/customers/${customerId}?tab=paymentMethods`;
                }
              }}>
                <div className="w-full sm:max-w-xs">
                  <label htmlFor="customerId" className="sr-only">Customer ID</label>
                  <input
                    type="text"
                    name="customerId"
                    id="customerId"
                    className="shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md"
                    placeholder="Enter customer ID"
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                  />
                </div>
                <button
                  type="submit"
                  className="mt-3 w-full inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Find
                </button>
              </form>
            </div>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <div className="px-4 py-5 sm:p-6">
              <h2 className="text-lg leading-6 font-medium text-gray-900">About Payment Methods</h2>
              <div className="mt-2 text-sm text-gray-500">
                <p className="mb-2">
                  This demo supports the following payment methods:
                </p>
                <ul className="list-disc pl-5 space-y-1">
                  <li>Credit and debit cards (via Stripe)</li>
                  <li>ACH direct debit (US customers)</li>
                  <li>SEPA direct debit (EU customers)</li>
                </ul>
                <p className="mt-3">
                  Go to a specific customer page to add new payment methods.
                </p>
              </div>
              <div className="mt-5">
                <Link href="/customers" className="text-indigo-600 hover:text-indigo-900">
                  View Customers
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
    </Layout>
  );
}