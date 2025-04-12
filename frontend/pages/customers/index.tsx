import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns';
import CustomerForm from '../../components/customers/CustomerForm';
import { customerApi } from '../../lib/payment-api';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // In a real app, you would have an API endpoint to list customers
      // This is a simplified example using mock data
      const mockCustomers = [
        { 
          id: 'cust_123', 
          email: 'john@example.com', 
          name: 'John Doe',
          created_at: new Date().toISOString() 
        },
        { 
          id: 'cust_456', 
          email: 'jane@example.com', 
          name: 'Jane Smith',
          created_at: new Date().toISOString() 
        }
      ];
      setCustomers(mockCustomers);
    } catch (error: any) {
      setError(error.message || 'An error occurred while fetching customers');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCustomers();
  }, []);
  
  const handleCustomerCreated = (customer: any) => {
    setCustomers([...customers, customer]);
    setShowForm(false);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Customers | FastAPI Payments Demo</title>
      </Head>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Customers</h1>
            <button
              onClick={() => setShowForm(!showForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {showForm ? 'Cancel' : 'Add Customer'}
            </button>
          </div>
          
          {showForm && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">New Customer</h2>
              <CustomerForm onSuccess={handleCustomerCreated} />
            </div>
          )}
          
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
          ) : customers.length === 0 ? (
            <div className="text-center py-6 text-gray-500">No customers found</div>
          ) : (
            <div className="bg-white shadow overflow-hidden sm:rounded-md">
              <ul className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <li key={customer.id}>
                    <Link href={`/customers/${customer.id}`} className="block hover:bg-gray-50">
                      <div className="px-4 py-4 sm:px-6">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="ml-3">
                              <p className="text-sm font-medium text-indigo-600 truncate">{customer.email}</p>
                              <p className="text-sm text-gray-500">{customer.name || 'No name'}</p>
                            </div>
                          </div>
                          <div className="ml-2 flex-shrink-0 flex">
                            <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                              {format(new Date(customer.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>
                    </Link>
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