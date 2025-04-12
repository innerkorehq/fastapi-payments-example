import React from 'react';
import Layout from '../components/layout/Layout';

export default function Home() {
  return (
    <Layout title="FastAPI Payments Demo">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
          FastAPI Payments Demo
        </h1>
        <p className="mt-4 max-w-2xl mx-auto text-xl text-gray-500">
          A demonstration of the fastapi-payments library
        </p>
      </div>

      <div className="mt-12 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Customers</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Create and manage customer accounts.</p>
            </div>
            <div className="mt-3">
              <a href="/customers" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                Go to Customers
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Payments</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Process one-time payments.</p>
            </div>
            <div className="mt-3">
              <a href="/payments" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                Go to Payments
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">Subscriptions</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>Manage recurring subscriptions.</p>
            </div>
            <div className="mt-3">
              <a href="/subscriptions" className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700">
                Go to Subscriptions
              </a>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium leading-6 text-gray-900">API Documentation</h3>
            <div className="mt-2 max-w-xl text-sm text-gray-500">
              <p>View the API documentation.</p>
            </div>
            <div className="mt-3">
              <a 
                href="http://localhost:8000/docs" 
                target="_blank" 
                rel="noopener noreferrer"
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                View API Docs
              </a>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}