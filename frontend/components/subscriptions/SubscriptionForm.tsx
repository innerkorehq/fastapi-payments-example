import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { subscriptionApi, productApi } from '../../lib/payment-api';

interface SubscriptionFormProps {
  customerId: string;
  onSuccess?: (subscription: any) => void;
}

const SubscriptionForm: React.FC<SubscriptionFormProps> = ({ customerId, onSuccess }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // In a real app, you would have an API endpoint to list plans
        // This is a simplified example using mock data
        setPlans([
          { id: 'plan_basic', name: 'Basic Plan', price: '9.99', interval: 'month' },
          { id: 'plan_pro', name: 'Pro Plan', price: '19.99', interval: 'month' },
          { id: 'plan_enterprise', name: 'Enterprise', price: '49.99', interval: 'month' }
        ]);
      } catch (error) {
        console.error('Error fetching plans:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPlans();
  }, []);
  
  const onSubmit = async (data: any) => {
    try {
      const subscription = await subscriptionApi.createSubscription(customerId, {
        plan_id: data.planId,
        quantity: parseInt(data.quantity, 10) || 1,
        trial_period_days: parseInt(data.trialPeriodDays, 10) || undefined,
      });
      
      if (onSuccess) onSuccess(subscription);
    } catch (error) {
      console.error('Error creating subscription:', error);
    }
  };
  
  if (isLoading) {
    return <div>Loading plans...</div>;
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div>
        <label htmlFor="planId" className="block text-sm font-medium text-gray-700">
          Select a plan
        </label>
        <div className="mt-1">
          <select
            id="planId"
            {...register('planId', { required: 'Plan is required' })}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          >
            <option value="">Select a plan</option>
            {plans.map((plan) => (
              <option key={plan.id} value={plan.id}>
                {plan.name} (${plan.price}/{plan.interval})
              </option>
            ))}
          </select>
          {errors.planId && (
            <p className="mt-2 text-sm text-red-600">{errors.planId.message?.toString()}</p>
          )}
        </div>
      </div>
      
      <div>
        <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
          Quantity
        </label>
        <div className="mt-1">
          <input
            id="quantity"
            type="number"
            min="1"
            defaultValue="1"
            {...register('quantity')}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
          />
        </div>
      </div>
      
      <div>
        <label htmlFor="trialPeriodDays" className="block text-sm font-medium text-gray-700">
          Trial Period (days)
        </label>
        <div className="mt-1">
          <input
            id="trialPeriodDays"
            type="number"
            min="0"
            {...register('trialPeriodDays')}
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
          {isSubmitting ? 'Processing...' : 'Subscribe'}
        </button>
      </div>
    </form>
  );
};

export default SubscriptionForm;