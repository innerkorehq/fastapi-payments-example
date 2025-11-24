import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import getFriendlyApiError from '../../lib/api-utils';
import { paymentApi, paymentMethodApi } from '../../lib/payment-api';

interface OneTimePaymentFormProps {
  customerId: string;
  paymentMethods?: any[];
  onSuccess?: (payment: any) => void;
  onError?: (message: string | null) => void;
}

export default function OneTimePaymentForm({ customerId, paymentMethods: paymentMethodsProp, onSuccess, onError }: OneTimePaymentFormProps) {
  const { register, handleSubmit, setError: setFieldError, formState: { errors }, reset } = useForm({
    defaultValues: {
      amount: '',
      currency: 'USD',
      description: '',
      payment_method_id: '',
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>(paymentMethodsProp || []);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);

  useEffect(() => {
    if (paymentMethodsProp) {
      setPaymentMethods(paymentMethodsProp);
      setIsLoadingMethods(false);
      return;
    }

    const fetchPaymentMethods = async () => {
      setIsLoadingMethods(true);
      try {
        const methods = await paymentMethodApi.getAllForCustomer(customerId);
        setPaymentMethods(methods);
      } catch (err: any) {
        console.error('Failed to load payment methods', err);
        setError(err.response?.data?.detail || 'Failed to load payment methods');
      } finally {
        setIsLoadingMethods(false);
      }
    };

    if (customerId) {
      fetchPaymentMethods();
    }
  }, [customerId, paymentMethodsProp]);
  
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      const payload: any = {
        amount: parseFloat(data.amount),
        currency: data.currency,
        customer_id: customerId,
        description: data.description,
        payment_method_id: data.payment_method_id,
      };

      // If the selected payment method has a mandate id (created via SetupIntent)
      // include it so the backend/provider can use that mandate for off-session
      // payments (required by India rules).
      if (data.payment_method_id) {
        const selected = paymentMethods.find((m) => m.id === data.payment_method_id);
        if (selected?.mandate_id) payload.mandate_id = selected.mandate_id;
      }

      if (!payload.payment_method_id) {
        throw new Error('Please select a payment method');
      }

      const response = await paymentApi.create(payload);

      // If the provider returned a hosted checkout redirect (e.g. PayU),
      // the library stores it under meta_info.provider_data.<provider>.redirect
      // — detect and submit a hidden form to navigate to the provider checkout.
      const providerRedirect = response?.meta_info?.provider_data?.payu?.redirect || response?.meta_info?.provider_data?.payu;
      if (providerRedirect && providerRedirect.action_url && providerRedirect.fields) {
        // Build and submit a form to perform the POST redirect
        const form = document.createElement('form');
        form.method = (providerRedirect.method || 'POST').toUpperCase();
        form.action = providerRedirect.action_url;
        form.style.display = 'none';

        Object.keys(providerRedirect.fields).forEach((key) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          // Ensure value is stringified
          input.value = String((providerRedirect.fields as any)[key] ?? '');
          form.appendChild(input);
        });

        document.body.appendChild(form);
        form.submit();
        return; // We are redirecting away from the app — don't continue
      }

      reset({ amount: '', currency: data.currency, description: '', payment_method_id: data.payment_method_id });
      if (onSuccess) onSuccess(response);

    } catch (err: any) {
      console.error('Payment processing error:', err);
      // Map server validation errors to specific fields
      const details = err?.response?.data?.detail;
      if (Array.isArray(details)) {
        details.forEach((d: any) => {
          const loc = d?.loc;
          if (Array.isArray(loc) && loc.length >= 2) {
            const field = loc[1];
            setFieldError(field as any, { type: 'server', message: d?.msg });
          }
        });
      }

      const message = getFriendlyApiError(err);
      if (onError) onError(message);
      setError(message as any);
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
        <label htmlFor="payment_method_id" className="block text-sm font-medium text-gray-700">
          Payment Method
        </label>
        <div className="mt-1">
          <select
            id="payment_method_id"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            {...register('payment_method_id', { required: 'Please select a payment method' })}
            disabled={isLoadingMethods || paymentMethods.length === 0}
          >
            <option value="">{isLoadingMethods ? 'Loading...' : 'Select a payment method'}</option>
            {paymentMethods.map((method) => (
              <option key={method.id} value={method.id}>
                {method.card ? `${method.card.brand?.toUpperCase()} •••• ${method.card.last4}` : method.id}
              </option>
            ))}
          </select>
          {errors.payment_method_id && (
            <p className="mt-1 text-sm text-red-600">{errors.payment_method_id.message?.toString()}</p>
          )}
          {!isLoadingMethods && paymentMethods.length === 0 && (
            <p className="mt-1 text-sm text-gray-500">Add a payment method before charging this customer.</p>
          )}
        </div>
      </div>
      
      <div>
        <button
          type="submit"
          disabled={isSubmitting || paymentMethods.length === 0}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
        >
          {isSubmitting ? 'Processing...' : 'Process Payment'}
        </button>
      </div>
    </form>
  );
}