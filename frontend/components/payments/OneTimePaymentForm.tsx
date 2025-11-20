import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { paymentApi } from '../../lib/payment-api';

interface OneTimePaymentFormProps {
  customerId: string;
  onSuccess?: (payment: any) => void;
}

export default function OneTimePaymentForm({ customerId, onSuccess }: OneTimePaymentFormProps) {
  const { register, handleSubmit, formState: { errors }, reset } = useForm();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      // Format amount as cents/smallest currency unit
      const paymentData = {
        amount: parseFloat(data.amount),
        currency: data.currency,
        customer_id: customerId,
        description: data.description,
        // In a real app, this would use Stripe Elements for secure payment
        payment_method_id: data.payment_method_id || 'pm_card_visa' // Mock payment method ID
      };
      
      const response = await paymentApi.create(paymentData);
      reset();
      if (onSuccess) onSuccess(response);
      
    } catch (err: any) {
      console.error('Payment processing error:', err);
      setError(err.response?.data?.detail || 'Failed to process payment');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border-l-4 border-red-400 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        </div>
      )}
      
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
              min="0.01"
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              {...register('amount', {
                required: 'Amount is required',
                min: { value: 0.01, message: 'Amount must be at least 0.01' }
              })}
            />
            {errors.amount && (
              <p className="mt-1 text-sm text-red-600">{errors.amount.message?.toString()}</p>
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
              className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              {...register('currency', { required: 'Currency is required' })}
              defaultValue="USD"
            >
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
              <option value="GBP">GBP</option>
            </select>
            {errors.currency && (
              <p className="mt-1 text-sm text-red-600">{errors.currency.message?.toString()}</p>
            )}
          </div>
        </div>
      </div>
      
      <div>
        <label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Description
        </label>
        <div className="mt-1">
          <input
            id="description"
            type="text"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            {...register('description')}
            placeholder="Payment description (optional)"
          />
        </div>
      </div>
      
      <div>
        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
        >
          {isSubmitting ? 'Processing...' : 'Process Payment'}
        </button>
      </div>
    </form>
  );
}