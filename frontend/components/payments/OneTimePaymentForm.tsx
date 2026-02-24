import React, { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import getFriendlyApiError from '../../lib/api-utils';
import { paymentApi, paymentMethodApi, razorpayApi } from '../../lib/payment-api';
import { openRazorpayCheckout } from '../../lib/razorpay-checkout';

interface OneTimePaymentFormProps {
  customerId: string;
  paymentMethods?: any[];
  providers?: Array<{
    name: string;
    display_name?: string;
    supports_payment_methods?: boolean;
    supports_hosted_payments?: boolean;
  }>;
  defaultProvider?: string;
  customer?: any;
  onSuccess?: (payment: any) => void;
  onError?: (message: string | null) => void;
}

export default function OneTimePaymentForm({
  customerId,
  paymentMethods: paymentMethodsProp,
  providers = [],
  defaultProvider,
  customer,
  onSuccess,
  onError,
}: OneTimePaymentFormProps) {
  const { register, handleSubmit, setError: setFieldError, formState: { errors }, reset, setValue } = useForm({
    defaultValues: {
      amount: '',
      currency: 'USD',
      description: '',
      payment_method_id: '',
      payu_firstname: customer?.name?.split(' ')[0] || '',
      payu_email: customer?.email || '',
      payu_phone: '',
      payu_productinfo: '',
      payu_success_url: '',
      payu_failure_url: '',
      payu_cancel_url: '',
    },
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMethods, setPaymentMethods] = useState<any[]>(paymentMethodsProp || []);
  const [isLoadingMethods, setIsLoadingMethods] = useState(false);
  const providerOptions = useMemo(() => providers, [providers]);
  const [selectedProvider, setSelectedProvider] = useState<string>(() => {
    if (providerOptions.length === 0) return '';
    const preferred = providerOptions.find((provider) => provider.name === defaultProvider);
    return (preferred || providerOptions[0])?.name || '';
  });

  useEffect(() => {
    if (customer?.name) {
      setValue('payu_firstname', customer.name.split(' ')[0] || '');
    }
    if (customer?.email) {
      setValue('payu_email', customer.email);
    }
  }, [customer, setValue]);

    useEffect(() => {
      if (providerOptions.length === 0) {
        setSelectedProvider('');
        return;
      }
      const preferred = providerOptions.find((provider) => provider.name === defaultProvider);
      setSelectedProvider((current) => {
        if (preferred) return preferred.name;
        if (!current || !providerOptions.some((provider) => provider.name === current)) {
          return providerOptions[0]?.name || '';
        }
        return current;
      });
    }, [providerOptions, defaultProvider]);

  const providerMeta = providerOptions.find((provider) => provider.name === selectedProvider);
  const supportsStoredMethods = providerMeta ? providerMeta.supports_payment_methods !== false : false;
  const hostedCheckout = providerMeta ? providerMeta.supports_hosted_payments : false;

  useEffect(() => {
    if (!selectedProvider) {
      setPaymentMethods([]);
      setIsLoadingMethods(false);
      return;
    }

    if (paymentMethodsProp) {
      if (!supportsStoredMethods) {
        setPaymentMethods([]);
      } else {
        const filtered = paymentMethodsProp.filter((method) => {
          const methodProvider = method.provider || defaultProvider;
          return methodProvider === selectedProvider;
        });
        setPaymentMethods(filtered);
      }
      setIsLoadingMethods(false);
      return;
    }
    const fetchPaymentMethods = async () => {
      if (!supportsStoredMethods) {
        setPaymentMethods([]);
        return;
      }
      setIsLoadingMethods(true);
      try {
        const methods = await paymentMethodApi.getAllForCustomer(customerId, { provider: selectedProvider });
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
  }, [customerId, paymentMethodsProp, selectedProvider, supportsStoredMethods, defaultProvider]);
  
  const onSubmit = async (data: any) => {
    setIsSubmitting(true);
    setError(null);
    
    try {
      if (!selectedProvider) {
        throw new Error('Select a provider before processing a payment');
      }

      const payload: any = {
        amount: parseFloat(data.amount),
        currency: data.currency,
        customer_id: customerId,
        description: data.description,
        provider: selectedProvider,
      };

      if (supportsStoredMethods) {
        payload.payment_method_id = data.payment_method_id;
        if (!payload.payment_method_id) {
          throw new Error('Please select a payment method');
        }

        const selectedMethod = paymentMethods.find((m) => m.id === data.payment_method_id);
        if (selectedMethod?.mandate_id) payload.mandate_id = selectedMethod.mandate_id;
      } else {
        delete payload.payment_method_id;
        const payuMetadata: Record<string, any> = {
          firstname: data.payu_firstname || customer?.name,
          email: data.payu_email || customer?.email,
        };

        if (!payuMetadata.firstname) {
          throw new Error('PayU requires the customer first name.');
        }
        if (!payuMetadata.email) {
          throw new Error('PayU requires the customer email address.');
        }

        if (data.payu_phone) payuMetadata.phone = data.payu_phone;
        if (data.payu_productinfo) payuMetadata.productinfo = data.payu_productinfo;
        if (data.payu_success_url) payuMetadata.surl = data.payu_success_url;
        if (data.payu_failure_url) payuMetadata.furl = data.payu_failure_url;
        if (data.payu_cancel_url) payuMetadata.curl = data.payu_cancel_url;

        payload.metadata = {
          ...(payload.metadata || {}),
          payu: payuMetadata,
        };
      }

      const response = await paymentApi.create(payload);

      // ── Razorpay: open Checkout JS modal ─────────────────────────────────
      // Prefer the embedded checkout_config over any hosted redirect.
      const razorpayCheckoutConfig =
        (response as any).checkout_config ??
        response?.meta_info?.checkout_config ??
        response?.metadata?.checkout_config;

      if (selectedProvider === 'razorpay' && razorpayCheckoutConfig) {
        await openRazorpayCheckout(
          razorpayCheckoutConfig,
          async (paymentResponse) => {
            // Verify the signature on the backend before crediting the payment
            try {
              const verifyResult = await razorpayApi.verifyPayment({
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                payment_id: response.id,
              });
              console.log('Razorpay signature verified — payment successful');
              reset({
                amount: '',
                currency: data.currency,
                description: '',
                payment_method_id: supportsStoredMethods ? data.payment_method_id : '',
              });
              // Use the updated payment (status=COMPLETED) if the backend returned it
              if (onSuccess) onSuccess(verifyResult.payment ?? response);
            } catch (verifyError: any) {
              const message = getFriendlyApiError(verifyError);
              if (onError) onError(`Payment signature verification failed: ${message}`);
              setError(`Payment signature verification failed: ${message}`);
            }
          },
          (reason) => {
            if (onError) onError(reason ?? 'Razorpay payment was cancelled or failed.');
            setError(reason ?? 'Razorpay payment was cancelled or failed.');
          },
        );
        setIsSubmitting(false);
        return; // modal handled everything; do not fall through to redirect logic
      }

      // If the provider returned a hosted checkout redirect (e.g. PayU),
      // the library stores it under meta_info.provider_data.<provider>.redirect
      // — detect and submit a hidden form to navigate to the provider checkout.
      // Some APIs return provider metadata under `meta_info` (internal naming)
      // while others use `metadata` (public API). Accept both and use the
      // currently selected provider key rather than hard-coding `payu`.
      const providerKey = selectedProvider;
      const providerData =
        response?.meta_info?.provider_data?.[providerKey] ||
        response?.metadata?.provider_data?.[providerKey];
      const providerRedirect = providerData?.redirect || providerData;
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

      reset({
        amount: '',
        currency: data.currency,
        description: '',
        payment_method_id: supportsStoredMethods ? data.payment_method_id : '',
      });
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

      {providerOptions.length === 0 && (
        <p className="text-sm text-gray-600">
          Link a payment provider to enable one-time charges for this customer.
        </p>
      )}

      {providerOptions.length > 1 && (
        <div>
          <label htmlFor="provider" className="block text-sm font-medium text-gray-700">
            Payment Provider
          </label>
          <select
            id="provider"
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
            value={selectedProvider}
            onChange={(event) => setSelectedProvider(event.target.value)}
          >
            {providerOptions.map((provider) => (
              <option key={provider.name} value={provider.name}>
                {provider.display_name || provider.name}
              </option>
            ))}
          </select>
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
              <option value="INR">INR</option>
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

      {supportsStoredMethods ? (
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
      ) : (
        <div className="space-y-3">
          {hostedCheckout && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 text-sm text-yellow-800">
              This provider collects card details on their hosted checkout. After submitting the form we will
              redirect you to complete the payment.
            </div>
          )}
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer First Name</label>
              <input
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                {...register('payu_firstname', { required: 'Required for PayU' })}
              />
              {errors.payu_firstname && (
                <p className="mt-1 text-sm text-red-600">{errors.payu_firstname.message?.toString()}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Customer Email</label>
              <input
                type="email"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                {...register('payu_email', { required: 'Required for PayU' })}
              />
              {errors.payu_email && (
                <p className="mt-1 text-sm text-red-600">{errors.payu_email.message?.toString()}</p>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700">Phone (optional)</label>
              <input
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                {...register('payu_phone')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Product Info (optional)</label>
              <input
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                {...register('payu_productinfo')}
              />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Success URL</label>
              <input
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Optional override"
                {...register('payu_success_url')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Failure URL</label>
              <input
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Optional override"
                {...register('payu_failure_url')}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Cancel URL</label>
              <input
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                placeholder="Optional override"
                {...register('payu_cancel_url')}
              />
            </div>
          </div>
        </div>
      )}
      
      <div>
        <button
          type="submit"
          disabled={isSubmitting || (supportsStoredMethods && paymentMethods.length === 0)}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-300"
        >
          {isSubmitting ? 'Processing...' : 'Process Payment'}
        </button>
      </div>
    </form>
  );
}