import React from 'react';
import { useForm } from 'react-hook-form';
import getFriendlyApiError from '../../lib/api-utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { customerApi } from '../../lib/payment-api';

interface CustomerFormProps {
  onSuccess?: (customer: any) => void;
  onError?: (message: string | null) => void;
  // optional initial values when editing an existing customer
  initialValues?: any;
  // when provided, the form will update the customer instead of creating
  customerId?: string;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ onSuccess, onError, initialValues, customerId }) => {
  const { register, handleSubmit, setError, formState: { errors, isSubmitting }, reset } = useForm({ defaultValues: initialValues || {} });

  // If initialValues are provided (editing mode), ensure form is populated
  React.useEffect(() => {
    if (initialValues) reset(initialValues);
  }, [initialValues, reset]);
  
  const onSubmit = async (data: any) => {
    try {
      let customer;
      if (customerId) {
        customer = await customerApi.update(customerId, data);
      } else {
        customer = await customerApi.create(data);
      }
      if (onSuccess) onSuccess(customer);
      // if this is an edit, reset form errors/state to the server-updated values
      reset(customer);
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
      console.error(customerId ? 'Error updating customer:' : 'Error creating customer:', message, error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="customer@example.com"
          {...register('email', { required: 'Email is required' })}
        />
        {errors.email && (
          <p className="text-sm text-destructive">{errors.email.message?.toString()}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          type="text"
          placeholder="John Doe"
          {...register('name')}
        />
      </div>

      {/* Optional address fields - required by some export rules (eg: India) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="address.line1">Address 1</Label>
          <Input id="address.line1" placeholder="123 Main St" {...register('address.line1')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address.line2">Address 2</Label>
          <Input id="address.line2" placeholder="Apt, suite, etc. (optional)" {...register('address.line2')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address.city">City</Label>
          <Input id="address.city" placeholder="City" {...register('address.city')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address.state">State / Province</Label>
          <Input id="address.state" placeholder="State" {...register('address.state')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address.postal_code">Postal Code</Label>
          <Input id="address.postal_code" placeholder="Postal / ZIP code" {...register('address.postal_code')} />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address.country">Country</Label>
          <Input id="address.country" placeholder="Country (ISO code or name)" {...register('address.country')} />
        </div>
      </div>
      <div className="text-xs text-muted-foreground mt-2">
        <p>
          Note: When creating customers for India exports, Stripe requires a customer name and address for export compliance. See Stripe docs: <a className="text-primary underline" href="https://stripe.com/docs/india-exports" target="_blank" rel="noreferrer">stripe.com/docs/india-exports</a>
        </p>
      </div>
      
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? (customerId ? 'Saving...' : 'Creating...') : (customerId ? 'Save changes' : 'Create Customer')}
      </Button>
    </form>
  );
};

export default CustomerForm;