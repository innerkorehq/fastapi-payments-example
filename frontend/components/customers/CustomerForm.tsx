import React from 'react';
import { useForm } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { customerApi } from '../../lib/payment-api';

interface CustomerFormProps {
  onSuccess?: (customer: any) => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ onSuccess }) => {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm();
  
  const onSubmit = async (data: any) => {
    try {
      const customer = await customerApi.create(data);
      if (onSuccess) onSuccess(customer);
    } catch (error) {
      console.error('Error creating customer:', error);
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
      
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating...' : 'Create Customer'}
      </Button>
    </form>
  );
};

export default CustomerForm;