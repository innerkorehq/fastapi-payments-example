import React, { useState } from 'react';
import { CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { paymentMethodApi } from '../../lib/payment-api';

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
      
      const { error, paymentMethod } = await stripe.createPaymentMethod({
        type: 'card',
        card: cardElement,
      });
      
      if (error) {
        throw error;
      }
      
      // Add payment method to the customer
      const result = await paymentMethodApi.createPaymentMethod(customerId, {
        type: 'card',
        token: paymentMethod?.id,
        set_default: true,
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