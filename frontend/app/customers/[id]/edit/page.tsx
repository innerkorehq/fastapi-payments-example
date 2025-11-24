"use client";
import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import CustomerForm from '../../../../components/customers/CustomerForm';
import { customerApi } from '../../../../lib/payment-api';

export default function EditCustomerPage() {
  const params = useParams();
  const router = useRouter();
  const customerId = params.id as string;

  const [customer, setCustomer] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCustomer = async () => {
      if (!customerId) return;
      setIsLoading(true);
      setError(null);
      try {
        const data = await customerApi.getById(customerId);
        setCustomer(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load customer');
      } finally {
        setIsLoading(false);
      }
    };
    fetchCustomer();
  }, [customerId]);

  const handleSuccess = (updatedCustomer: any) => {
    // Navigate back to the customer detail page after successful update
    router.push(`/customers/${customerId}`);
  };

  if (isLoading) return <div>Loading…</div>;
  if (error || !customer) return <div>Error: {error || 'Customer not found'}</div>;

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-2xl font-semibold mb-4">Edit Customer</h1>
      <CustomerForm
        initialValues={customer}
        customerId={customerId}
        onSuccess={handleSuccess}
        onError={(m) => setError(m)}
      />
    </div>
  );
}
