import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import getFriendlyApiError from '../../lib/api-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { subscriptionApi, productApi } from '../../lib/payment-api';

interface SubscriptionFormProps {
  customerId: string;
  onSuccess?: (subscription: any) => void;
  onError?: (message: string | null) => void;
}

const SubscriptionForm: React.FC<SubscriptionFormProps> = ({ customerId, onSuccess, onError }) => {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting }, setValue } = useForm();
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      try {
        // Fetch all products and their plans
        const products = await productApi.getAll();
        const plansPromises = products.map((product: any) => 
          productApi.getPlans(product.id)
        );
        const plansArrays = await Promise.all(plansPromises);
        const allPlans = plansArrays.flat();
        
        // Format plans for the select dropdown
        const formattedPlans = allPlans.map(plan => ({
          id: plan.id,
          name: plan.name,
          price: plan.amount,
          interval: plan.billing_interval,
          product_id: plan.product_id
        }));
        
        setPlans(formattedPlans);
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
      const subscription = await subscriptionApi.create(customerId, {
        plan_id: data.planId,
        quantity: parseInt(data.quantity, 10) || 1,
        trial_period_days: parseInt(data.trialPeriodDays, 10) || undefined,
      });
      
      if (onSuccess) onSuccess(subscription);
    } catch (error: any) {
      const details = error?.response?.data?.detail;
      if (Array.isArray(details)) {
        details.forEach((d: any) => {
          const loc = d?.loc;
          if (Array.isArray(loc) && loc.length >= 2) {
            const field = loc[1];
            setError(field as any, { type: 'server', message: d?.msg });
          }
        });
      }

      const message = getFriendlyApiError(error);
      if (onError) onError(message);
      console.error('Error creating subscription:', message, error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="planId">Select a plan</Label>
        <Select onValueChange={(value) => setValue('planId', value, { shouldDirty: true, shouldValidate: true })}>
          <SelectTrigger id="planId">
            <SelectValue placeholder="Choose a plan" />
          </SelectTrigger>
          <SelectContent>
            {plans.map((plan) => (
              <SelectItem key={plan.id} value={plan.id}>
                {plan.name} (${plan.price}/{plan.interval})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.planId && (
          <p className="text-sm text-destructive">{errors.planId.message?.toString()}</p>
        )}
        <input type="hidden" {...register('planId', { required: 'Please select a plan' })} />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="quantity">Quantity</Label>
        <Input
          id="quantity"
          type="number"
          min="1"
          defaultValue="1"
          {...register('quantity')}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="trialPeriodDays">Trial Period (days)</Label>
        <Input
          id="trialPeriodDays"
          type="number"
          min="0"
          placeholder="0"
          {...register('trialPeriodDays')}
        />
      </div>
      
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating...' : 'Subscribe'}
      </Button>
    </form>
  );
};

export default SubscriptionForm;