import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentMethodApi, paymentSetupApi } from '../../lib/payment-api';

interface CreditCardFormProps {
  customerId: string;
  onSuccess?: (paymentMethod: any) => void;
}

const CreditCardForm: React.FC<CreditCardFormProps> = ({ customerId, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!stripe || !elements) {
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
      const setup = await paymentSetupApi.createSetupIntent(customerId, { usage: 'off_session' });
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
      <div>
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
          disabled={!stripe || isProcessing}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          {isProcessing ? 'Processing...' : 'Add Payment Method'}
        </button>
      </div>
    </form>
  );
};

export default CreditCardForm;