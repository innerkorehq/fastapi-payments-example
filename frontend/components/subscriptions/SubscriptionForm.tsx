import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import getFriendlyApiError from '../../lib/api-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { subscriptionApi, productApi, razorpayApi } from '../../lib/payment-api';
import { openRazorpayCheckout } from '../../lib/razorpay-checkout';
import { useRouter } from 'next/navigation';

interface SubscriptionFormProps {
  customerId: string;
  onSuccess?: (subscription: any) => void;
  onError?: (message: string | null) => void;
  provider?: string;
  providers?: Array<{
    name: string;
    display_name?: string;
    supports_payment_methods?: boolean;
    supports_hosted_payments?: boolean;
  }>;
  defaultProvider?: string;
}

const SubscriptionForm: React.FC<SubscriptionFormProps> = ({ customerId, onSuccess, onError, provider, providers = [], defaultProvider }) => {
  const router = useRouter();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting }, setValue, watch } = useForm();
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProvider, setSelectedProvider] = useState(() => {
    if (provider) return provider;
    if (providers.length === 0) return 'stripe';
    const preferred = providers.find(p => p.name === defaultProvider);
    return (preferred || providers[0])?.name || 'stripe';
  });
  const [customers, setCustomers] = useState<any[]>([]);
  
  const selectedPlan = watch('planId');
  const planData = plans.find(p => p.id === selectedPlan);
  
  // Reset selected plan when provider changes
  useEffect(() => {
    setValue('planId', '', { shouldDirty: false, shouldValidate: false });
  }, [selectedProvider, setValue]);
  
  // Fetch customer data to get email and name for PayU
  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/customers/${customerId}`);
        const data = await response.json();
        setCustomers([data]);
      } catch (error) {
        console.error('Error fetching customer:', error);
      }
    };
    fetchCustomer();
  }, [customerId]);
  
  // Fetch available plans
  useEffect(() => {
    const fetchPlans = async () => {
      if (!selectedProvider) return;
      
      try {
        // Fetch all products and their plans
        const products = await productApi.getAll();
        const plansPromises = products.map((product: any) => 
          productApi.getPlans(product.id)
        );
        const plansArrays = await Promise.all(plansPromises);
        const allPlans = plansArrays.flat();
        
        // Filter plans by selected provider
        const filteredPlans = allPlans.filter((plan: any) => {
          const planProvider = plan.meta_info?.provider;
          return planProvider === selectedProvider;
        });
        
        // Format plans for the select dropdown
        const formattedPlans = filteredPlans.map(plan => ({
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
  }, [selectedProvider]);
  
  const onSubmit = async (data: any) => {
    try {
      const customerData = customers[0];
      const subscriptionPayload: any = {
        plan_id: data.planId,
        quantity: parseInt(data.quantity, 10) || 1,
        trial_period_days: parseInt(data.trialPeriodDays, 10) || undefined,
        meta_info: {
          provider: selectedProvider,
        },
      };
      
      // Add Razorpay-specific parameters
      if (selectedProvider === 'razorpay') {
        subscriptionPayload.meta_info.razorpay = {
          total_count: parseInt(data.rp_total_count, 10) || 12,
          customer_notify: 1,
        };
      }

      // Add PayU-specific SI parameters
      if (selectedProvider === 'payu') {
        const frontendUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
        subscriptionPayload.meta_info.amount = planData?.price;
        subscriptionPayload.meta_info.description = planData?.name;
        subscriptionPayload.meta_info.customer_context = {
          name: customerData?.name,
          email: customerData?.email,
          phone: data.phone || '',
        };
        subscriptionPayload.meta_info.payu = {
          firstname: customerData?.name || data.firstname,
          email: customerData?.email,
          phone: data.phone || '',
          productinfo: planData?.name || 'Subscription',
          si_start_date: data.si_start_date,  // dd-MM-yyyy format
          si_period: data.si_period || 'monthly',
          si_cycles: data.si_cycles,
          si_end_date: data.si_end_date,
          surl: `${frontendUrl}/payu/success`,
          furl: `${frontendUrl}/payu/failure`,
          curl: `${frontendUrl}/payu/cancel`,
        };

        // Build si_details for payment modes
        subscriptionPayload.meta_info.payu.si_details = {
          payment_modes: [
            data.pm_card ? 'card' : undefined,
            data.pm_netbanking ? 'netbanking' : undefined,
            data.pm_upi ? 'upi' : undefined,
          ].filter(Boolean),
        };

      }
      
      const subscription = await subscriptionApi.create(customerId, subscriptionPayload);
      
      console.log('Subscription created:', subscription);
      console.log('Provider:', selectedProvider);
      console.log('Meta info:', subscription.meta_info);

      // ── Razorpay: open Checkout JS modal ─────────────────────────────────
      // Prefer the embedded checkout_config over the hosted short_url.
      const razorpayCheckoutConfig =
        subscription.checkout_config ?? subscription.meta_info?.checkout_config;

      if (selectedProvider === 'razorpay' && razorpayCheckoutConfig) {
        await openRazorpayCheckout(
          razorpayCheckoutConfig,
          async (paymentResponse) => {
            // Verify the signature on the backend before considering success
            try {
              const verifyResult = await razorpayApi.verifyPayment({
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_subscription_id: paymentResponse.razorpay_subscription_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                subscription_id: subscription.id,
              });
              console.log('Razorpay signature verified — subscription active');
              // Use the updated subscription (status=active) if the backend returned it
              if (onSuccess) onSuccess(verifyResult.subscription ?? subscription);
            } catch (verifyError: any) {
              const message = getFriendlyApiError(verifyError);
              if (onError) onError(`Payment signature verification failed: ${message}`);
            }
          },
          (reason) => {
            if (onError) onError(reason ?? 'Razorpay payment was cancelled or failed.');
          },
        );
        return; // modal handled everything; do not fall through to redirect logic
      }

      const redirectInfo = subscription.meta_info?.redirect;
      // Fallback: some backends surface the authorization URL as a flat redirect_url
      const fallbackUrl: string | undefined = (subscription as any).redirect_url;

      if (redirectInfo?.action_url) {
        if (redirectInfo.method === 'GET') {
          // Simple GET redirect (Razorpay authorization link, etc.)
          console.log('Redirecting (GET) to:', redirectInfo.action_url);
          window.location.href = redirectInfo.action_url;
        } else {
          // Form POST redirect (PayU, Cashfree, etc.)
          console.log('Redirecting (POST) to:', redirectInfo.action_url);
          const form = document.createElement('form');
          form.method = redirectInfo.method || 'POST';
          form.action = redirectInfo.action_url;
          Object.entries(redirectInfo.fields || {}).forEach(([key, value]) => {
            const input = document.createElement('input');
            input.type = 'hidden';
            input.name = key;
            input.value = String(value);
            form.appendChild(input);
          });
          document.body.appendChild(form);
          form.submit();
        }
      } else if (fallbackUrl) {
        // Flat redirect_url fallback (e.g. Razorpay short_url extracted by backend)
        console.log('Redirecting (GET fallback) to:', fallbackUrl);
        window.location.href = fallbackUrl;
      } else {
        console.log('No redirect — calling onSuccess');
        if (onSuccess) onSuccess(subscription);
      }
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
        <Label htmlFor="provider">Payment Provider</Label>
        <Select value={selectedProvider} onValueChange={setSelectedProvider}>
          <SelectTrigger id="provider">
            <SelectValue placeholder="Choose a provider" />
          </SelectTrigger>
          <SelectContent>
            {providers.length > 0 ? (
              providers.map((prov) => (
                <SelectItem key={prov.name} value={prov.name}>
                  {prov.display_name || prov.name}
                </SelectItem>
              ))
            ) : (
              <>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="razorpay">Razorpay</SelectItem>
                <SelectItem value="payu">PayU (SI/Recurring)</SelectItem>
                <SelectItem value="cashfree">Cashfree</SelectItem>
              </>
            )}
          </SelectContent>
        </Select>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="planId">Select a plan</Label>
        <Select 
          onValueChange={(value) => setValue('planId', value, { shouldDirty: true, shouldValidate: true })}
          disabled={isLoading}
        >
          <SelectTrigger id="planId">
            <SelectValue placeholder={isLoading ? "Loading plans..." : "Choose a plan"} />
          </SelectTrigger>
          <SelectContent>
            {plans.length > 0 ? (
              plans.map((plan) => (
                <SelectItem key={plan.id} value={plan.id}>
                  {plan.name} (${plan.price}/{plan.interval})
                </SelectItem>
              ))
            ) : !isLoading ? (
              <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                No plans available for {selectedProvider}
              </div>
            ) : null}
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
      
      {/* Razorpay-specific fields */}
      {selectedProvider === 'razorpay' && (
        <div className="border-t pt-4 space-y-4">
          <h3 className="text-sm font-semibold">Razorpay Subscription Details</h3>
          <div className="space-y-2">
            <Label htmlFor="rp_total_count">Total Billing Cycles</Label>
            <Input
              id="rp_total_count"
              type="number"
              min="1"
              defaultValue="12"
              {...register('rp_total_count')}
            />
            <p className="text-xs text-muted-foreground">Number of billing cycles before the subscription ends (e.g. 12 for 1 year monthly)</p>
          </div>
        </div>
      )}

      {selectedProvider !== 'payu' && (
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
      )}
      
      {/* PayU-specific SI fields */}
      {selectedProvider === 'payu' && (
        <>
          <div className="border-t pt-4 space-y-4">
            <h3 className="text-sm font-semibold">PayU Standing Instruction (SI) Details</h3>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number *</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="9876543210"
                {...register('phone', { required: selectedProvider === 'payu' })}
              />
              {errors.phone && (
                <p className="text-sm text-destructive">Phone number is required for PayU</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="si_start_date">SI Start Date (dd-MM-yyyy) *</Label>
              <Input
                id="si_start_date"
                type="text"
                placeholder="01-02-2025"
                {...register('si_start_date', { 
                  required: selectedProvider === 'payu',
                  pattern: {
                    value: /^\d{2}-\d{2}-\d{4}$/,
                    message: 'Date must be in dd-MM-yyyy format'
                  }
                })}
              />
              {errors.si_start_date && (
                <p className="text-sm text-destructive">{errors.si_start_date.message?.toString() || 'Required'}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="si_period">Billing Period</Label>
              <Select onValueChange={(value) => setValue('si_period', value)} defaultValue="monthly">
                <SelectTrigger id="si_period">
                  <SelectValue placeholder="Choose period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Allowed Payment Modes</Label>
              <div className="flex gap-3">
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked {...register('pm_card')} />
                  <span>Cards</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked {...register('pm_netbanking')} />
                  <span>NetBanking</span>
                </label>
                <label className="flex items-center gap-2">
                  <input type="checkbox" defaultChecked {...register('pm_upi')} />
                  <span>UPI</span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">Choose which payment methods to surface to the customer on PayU checkout</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="si_cycles">Number of Cycles (optional)</Label>
              <Input
                id="si_cycles"
                type="number"
                min="1"
                placeholder="12"
                {...register('si_cycles')}
              />
              <p className="text-xs text-muted-foreground">Leave empty for unlimited cycles</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="si_end_date">SI End Date (dd-MM-yyyy, optional)</Label>
              <Input
                id="si_end_date"
                type="text"
                placeholder="01-02-2026"
                {...register('si_end_date', {
                  pattern: {
                    value: /^\d{2}-\d{2}-\d{4}$/,
                    message: 'Date must be in dd-MM-yyyy format'
                  }
                })}
              />
              {errors.si_end_date && (
                <p className="text-sm text-destructive">{errors.si_end_date.message?.toString()}</p>
              )}
            </div>
          </div>
        </>
      )}
      
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating...' : selectedProvider === 'payu' ? 'Continue to PayU' : selectedProvider === 'razorpay' ? 'Continue to Razorpay' : 'Subscribe'}
      </Button>
    </form>
  );
};

export default SubscriptionForm;