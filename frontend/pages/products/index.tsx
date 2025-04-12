import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Link from 'next/link';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { productApi } from '../../lib/payment-api';

// Product creation form component
const ProductForm = ({ onSuccess }: { onSuccess: (product: any) => void }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();
  
  const onSubmit = async (data: any) => {
    try {
      // In a real app, you'd call productApi.createProduct(data)
      // For this demo, we'll simulate a successful API call
      const mockProduct = {
        id: `prod_${Math.floor(Math.random() * 10000)}`,
        name: data.name,
        description: data.description,
        active: true,
        created_at: new Date().toISOString()
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onSuccess(mockProduct);
      reset(); // Reset form fields
    } catch (error) {
      console.error('Error creating product:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Product Name
        </label>
        <div className="mt-1">
          <input
            id="name"
            type="text"
            {...register('name', { required: 'Product name is required' })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.name && (
            <p className="mt-2 text-sm text-red-600">{errors.name.message?.toString()}</p>
          )}
        </div>
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <div className="mt-1">
          <textarea
            id="description"
            rows={3}
            {...register('description')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>
      
      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isSubmitting ? 'Creating...' : 'Create Product'}
        </button>
      </div>
    </form>
  );
};

// Plan creation form component
const PlanForm = ({ productId, onSuccess }: { productId: string, onSuccess: (plan: any) => void }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting }, reset } = useForm();
  
  const onSubmit = async (data: any) => {
    try {
      // In a real app, you'd call productApi.createPlan(productId, data)
      // For this demo, we'll simulate a successful API call
      const mockPlan = {
        id: `plan_${Math.floor(Math.random() * 10000)}`,
        product_id: productId,
        name: data.name,
        description: data.description,
        pricing_model: data.pricing_model,
        amount: parseFloat(data.amount),
        currency: data.currency,
        billing_interval: data.billing_interval,
        billing_interval_count: parseInt(data.billing_interval_count, 10),
        created_at: new Date().toISOString()
      };
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onSuccess(mockPlan);
      reset(); // Reset form fields
    } catch (error) {
      console.error('Error creating plan:', error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="name" className="block text-sm font-medium text-gray-700">
          Plan Name
        </label>
        <div className="mt-1">
          <input
            id="name"
            type="text"
            {...register('name', { required: 'Plan name is required' })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
          {errors.name && (
            <p className="mt-2 text-sm text-red-600">{errors.name.message?.toString()}</p>
          )}
        </div>
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <div className="mt-1">
          <textarea
            id="description"
            rows={2}
            {...register('description')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="pricing_model" className="block text-sm font-medium text-gray-700">
          Pricing Model
        </label>
        <div className="mt-1">
          <select
            id="pricing_model"
            {...register('pricing_model', { required: 'Pricing model is required' })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="subscription">Subscription</option>
            <option value="per_user">Per User</option>
            <option value="tiered">Tiered</option>
            <option value="usage_based">Usage Based</option>
            <option value="freemium">Freemium</option>
          </select>
          {errors.pricing_model && (
            <p className="mt-2 text-sm text-red-600">{errors.pricing_model.message?.toString()}</p>
          )}
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
            Amount
          </label>
          <div className="mt-1">
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0"
              {...register('amount', { required: 'Amount is required' })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.amount && (
              <p className="mt-2 text-sm text-red-600">{errors.amount.message?.toString()}</p>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="currency" className="block text-sm font-medium text-gray-700">
            Currency
          </label>
          <div className="mt-1">
            <select
              id="currency"
              {...register('currency', { required: 'Currency is required' })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
            {errors.currency && (
              <p className="mt-2 text-sm text-red-600">{errors.currency.message?.toString()}</p>
            )}
          </div>
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="billing_interval" className="block text-sm font-medium text-gray-700">
            Billing Interval
          </label>
          <div className="mt-1">
            <select
              id="billing_interval"
              {...register('billing_interval', { required: 'Billing interval is required' })}
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            >
              <option value="day">Daily</option>
              <option value="week">Weekly</option>
              <option value="month">Monthly</option>
              <option value="year">Yearly</option>
            </select>
            {errors.billing_interval && (
              <p className="mt-2 text-sm text-red-600">{errors.billing_interval.message?.toString()}</p>
            )}
          </div>
        </div>
        
        <div>
          <label htmlFor="billing_interval_count" className="block text-sm font-medium text-gray-700">
            Interval Count
          </label>
          <div className="mt-1">
            <input
              id="billing_interval_count"
              type="number"
              min="1"
              {...register('billing_interval_count', { 
                required: 'Interval count is required',
                min: { value: 1, message: 'Minimum value is 1' }
              })}
              defaultValue="1"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            />
            {errors.billing_interval_count && (
              <p className="mt-2 text-sm text-red-600">{errors.billing_interval_count.message?.toString()}</p>
            )}
          </div>
        </div>
      </div>
      
      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isSubmitting ? 'Creating...' : 'Create Plan'}
        </button>
      </div>
    </form>
  );
};

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchProductsAndPlans = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // In a real app, these would be API calls
        // For this demo, we'll use mock data
        const mockProducts = [
          {
            id: 'prod_basic',
            name: 'Basic Plan',
            description: 'Basic features for individuals',
            active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'prod_premium',
            name: 'Premium Plan',
            description: 'Advanced features for professionals',
            active: true,
            created_at: new Date().toISOString()
          },
          {
            id: 'prod_enterprise',
            name: 'Enterprise Solution',
            description: 'Complete solution for businesses',
            active: true,
            created_at: new Date().toISOString()
          }
        ];
        
        const mockPlans = [
          {
            id: 'plan_basic_monthly',
            product_id: 'prod_basic',
            name: 'Basic Monthly',
            description: 'Monthly billing for basic plan',
            pricing_model: 'subscription',
            amount: 9.99,
            currency: 'USD',
            billing_interval: 'month',
            billing_interval_count: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 'plan_basic_yearly',
            product_id: 'prod_basic',
            name: 'Basic Yearly',
            description: 'Yearly billing for basic plan (save 15%)',
            pricing_model: 'subscription',
            amount: 99.99,
            currency: 'USD',
            billing_interval: 'year',
            billing_interval_count: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 'plan_premium_monthly',
            product_id: 'prod_premium',
            name: 'Premium Monthly',
            description: 'Monthly billing for premium plan',
            pricing_model: 'subscription',
            amount: 19.99,
            currency: 'USD',
            billing_interval: 'month',
            billing_interval_count: 1,
            created_at: new Date().toISOString()
          },
          {
            id: 'plan_enterprise_monthly',
            product_id: 'prod_enterprise',
            name: 'Enterprise Monthly',
            description: 'Monthly billing for enterprise plan',
            pricing_model: 'per_user',
            amount: 49.99,
            currency: 'USD',
            billing_interval: 'month',
            billing_interval_count: 1,
            created_at: new Date().toISOString()
          }
        ];
        
        setProducts(mockProducts);
        setPlans(mockPlans);
      } catch (error: any) {
        setError(error.message || 'An error occurred while fetching products');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProductsAndPlans();
  }, []);
  
  const handleProductCreated = (product: any) => {
    setProducts([...products, product]);
    setShowProductForm(false);
  };
  
  const handlePlanCreated = (plan: any) => {
    setPlans([...plans, plan]);
    setSelectedProductId(null);
  };
  
  const getProductPlans = (productId: string) => {
    return plans.filter(plan => plan.product_id === productId);
  };
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };
  
  return (
    <div className="min-h-screen bg-gray-50">
      <Head>
        <title>Products & Plans | FastAPI Payments Demo</title>
      </Head>
      
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-semibold text-gray-900">Products & Plans</h1>
            <button
              onClick={() => setShowProductForm(!showProductForm)}
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              {showProductForm ? 'Cancel' : 'Add Product'}
            </button>
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
          
          {showProductForm && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">New Product</h2>
              <ProductForm onSuccess={handleProductCreated} />
            </div>
          )}
          
          {selectedProductId && (
            <div className="bg-white shadow overflow-hidden sm:rounded-lg mb-6 p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-lg font-medium text-gray-900">
                  New Plan for {products.find(p => p.id === selectedProductId)?.name}
                </h2>
                <button
                  onClick={() => setSelectedProductId(null)}
                  className="text-sm text-gray-500"
                >
                  Cancel
                </button>
              </div>
              <PlanForm 
                productId={selectedProductId} 
                onSuccess={handlePlanCreated} 
              />
            </div>
          )}
          
          {isLoading ? (
            <div className="text-center py-6">Loading...</div>
          ) : products.length === 0 ? (
            <div className="text-center py-6 text-gray-500">No products found</div>
          ) : (
            <div className="space-y-6">
              {products.map(product => (
                <div key={product.id} className="bg-white shadow overflow-hidden sm:rounded-lg">
                  <div className="px-4 py-5 sm:px-6 flex justify-between items-center">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        {product.name}
                      </h3>
                      <p className="mt-1 max-w-2xl text-sm text-gray-500">
                        {product.description}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        ID: {product.id} | Created: {format(new Date(product.created_at), 'MMM d, yyyy')}
                      </p>
                    </div>
                    <div>
                      {selectedProductId !== product.id && (
                        <button
                          onClick={() => setSelectedProductId(product.id)}
                          className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200"
                        >
                          Add Plan
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="border-t border-gray-200">
                    <div className="px-4 py-5 sm:px-6">
                      <h4 className="text-md font-medium text-gray-900">Plans</h4>
                      
                      {getProductPlans(product.id).length === 0 ? (
                        <p className="mt-2 text-sm text-gray-500">No plans for this product yet.</p>
                      ) : (
                        <ul className="mt-2 divide-y divide-gray-200">
                          {getProductPlans(product.id).map(plan => (
                            <li key={plan.id} className="py-3">
                              <div className="flex justify-between">
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{plan.name}</p>
                                  <p className="text-sm text-gray-500">{plan.description}</p>
                                  <p className="text-xs text-gray-400">Model: {plan.pricing_model}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-medium text-gray-900">
                                    {formatCurrency(plan.amount, plan.currency)}
                                    <span className="text-gray-500">
                                      /{plan.billing_interval}
                                      {plan.billing_interval_count > 1 && `(x${plan.billing_interval_count})`}
                                    </span>
                                  </p>
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}