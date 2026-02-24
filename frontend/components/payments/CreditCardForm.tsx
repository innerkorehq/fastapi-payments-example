import React, { useEffect, useMemo, useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentMethodApi, paymentSetupApi } from '../../lib/payment-api';

interface CreditCardFormProps {
  customerId: string;
  providers?: Array<{
    name: string;
    display_name?: string;
    supports_payment_methods?: boolean;
  }>;
  defaultProvider?: string;
  onSuccess?: (paymentMethod: any) => void;
}

const CreditCardForm: React.FC<CreditCardFormProps> = ({ customerId, providers = [], defaultProvider, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const cardProviders = useMemo(
    () => providers.filter((provider) => provider.supports_payment_methods !== false),
    [providers]
  );
  const [selectedProvider, setSelectedProvider] = useState<string | undefined>(() => {
    if (cardProviders.length === 0) return undefined;
    const preferred = cardProviders.find((p) => p.name === defaultProvider);
    return (preferred || cardProviders[0])?.name;
  });

  useEffect(() => {
    if (cardProviders.length === 0) {
      setSelectedProvider(undefined);
      return;
    }
    const preferred = cardProviders.find((p) => p.name === defaultProvider);
    setSelectedProvider((current) => {
      if (preferred) return preferred.name;
      if (!current || !cardProviders.some((p) => p.name === current)) {
        return cardProviders[0]?.name;
      }
      return current;
    });
  }, [cardProviders, defaultProvider]);
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
      return;
    }
    
    if (!selectedProvider) {
      setError('No providers available for storing payment methods');
      return;
    }

    setIsProcessing(true);
    
    try {
      const cardElement = elements.getElement(CardElement);
      
      if (!cardElement) {
        throw new Error('Card element not found');
      }
      
      // Create a SetupIntent on the backend so we can complete 3DS and
      // attach the card to the customer when necessary (required in India).
      const setup = await paymentSetupApi.createSetupIntent(customerId, { usage: 'off_session', provider: selectedProvider });
      if (!setup?.client_secret) throw new Error('Failed to create setup intent');

      const confirmResult = await stripe.confirmCardSetup(setup.client_secret, {
        payment_method: { card: cardElement },
      });

      if (confirmResult.error) throw confirmResult.error;

      const si: any = confirmResult.setupIntent || {};
      const pmId = si.payment_method;
      const mandateId = si.mandate?.id || si.mandate || undefined;
      if (!pmId) throw new Error('Unable to determine payment method from SetupIntent');

      // Tell the backend about the new payment method (the provider will handle
      // attach/skip if already attached).
      const result = await paymentMethodApi.create(customerId, {
        type: 'card',
        payment_method_id: pmId,
        set_default: true,
        setup_intent_id: si.id,
        mandate_id: mandateId,
        provider: selectedProvider,
      });
      
      if (onSuccess) onSuccess(result);
      
      cardElement.clear();
    } catch (error: any) {
      setError(error.message || 'An error occurred while processing your card');
    } finally {
      setIsProcessing(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        {cardProviders.length > 1 && (
          <div>
            <label htmlFor="provider-selection" className="block text-sm font-medium text-gray-700">
              Payment Provider
            </label>
            <select
              id="provider-selection"
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
              value={selectedProvider}
              onChange={(event) => setSelectedProvider(event.target.value)}
            >
              {cardProviders.map((provider) => (
                <option key={provider.name} value={provider.name}>
                  {provider.display_name || provider.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {cardProviders.length === 0 && (
          <p className="text-sm text-gray-500">
            None of the configured providers support storing payment methods.
          </p>
        )}

        <label htmlFor="card-element" className="block text-sm font-medium text-gray-700">
          Credit or debit card
        </label>
        <div className="mt-1 p-3 border border-gray-300 rounded-md">
          <CardElement
            id="card-element"
            options={{
              style: {
                base: {
                  fontSize: '16px',
                  color: '#424770',
                  '::placeholder': {
                    color: '#aab7c4',
                  },
                },
                invalid: {
                  color: '#9e2146',
                },
              },
            }}
          />
        </div>
        {error && <div className="mt-2 text-sm text-red-600">{error}</div>}
      </div>
      
      <div>
        <button
          type="submit"
          disabled={!stripe || isProcessing || !selectedProvider}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isProcessing ? 'Processing...' : 'Add Payment Method'}
        </button>
      </div>
    </form>
  );
};

export default CreditCardForm;