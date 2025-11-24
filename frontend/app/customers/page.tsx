"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import CustomerForm from '../../components/customers/CustomerForm';
import { customerApi } from '../../lib/payment-api';
import { UserPlus, Users, AlertCircle } from 'lucide-react';

export default function Customers() {
  const [customers, setCustomers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const fetchCustomers = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await customerApi.getAll();
      setCustomers(data);
    } catch (error: any) {
      setError(error.message || 'An error occurred while fetching customers');
    } finally {
      setIsLoading(false);
    }
  };
  
  useEffect(() => {
    fetchCustomers();
  }, []);
  
  const handleCustomerCreated = (customer: any) => {
    setCustomers([...customers, customer]);
    setShowForm(false);
  };
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground mt-1">
            Manage your customer base
          </p>
        </div>
        <Button onClick={() => setShowForm(!showForm)}>
          <UserPlus className="mr-2 h-4 w-4" />
          {showForm ? 'Cancel' : 'Add Customer'}
        </Button>
      </div>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Customer</CardTitle>
            <CardDescription>Add a new customer to your database</CardDescription>
          </CardHeader>
          <CardContent>
            <CustomerForm onSuccess={handleCustomerCreated} onError={setError} />
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading customers...</p>
          </div>
        </div>
      ) : customers.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No customers found</p>
            <Button variant="outline" className="mt-4" onClick={() => setShowForm(true)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add your first customer
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {customers.map((customer) => (
            <Card key={customer.id} className="hover:shadow-md transition-shadow">
              <Link href={`/customers/${customer.id}`}>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h3 className="font-semibold text-lg">{customer.email}</h3>
                      <p className="text-sm text-muted-foreground">
                        {customer.name || 'No name provided'}
                      </p>
                      {customer.address && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {customer.address.line1 || ''} {customer.address.city ? `· ${customer.address.city}` : ''} {customer.address.country ? `· ${customer.address.country}` : ''}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {format(new Date(customer.created_at), 'MMM d, yyyy')}
                      </p>
                      <p className="text-xs text-muted-foreground">Created</p>
                    </div>
                  </div>
                </CardContent>
              </Link>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
