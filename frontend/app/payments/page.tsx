"use client";
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CreditCard, AlertCircle, DollarSign } from 'lucide-react';
import { paymentApi } from '../../lib/payment-api';

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchPayments = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const data = await paymentApi.getAll();
        setPayments(data);
      } catch (error: any) {
        setError(error.message || 'An error occurred while fetching payments');
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPayments();
  }, []);
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };
  
  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
    switch (status) {
      case 'succeeded':
        return 'default';
      case 'pending':
        return 'secondary';
      case 'failed':
        return 'destructive';
      default:
        return 'outline';
    }
  };
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground mt-1">
            Track and manage payment transactions
          </p>
        </div>
        <Button asChild>
          <Link href="/customers">
            Select Customer
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Recent Payments
          </CardTitle>
          <CardDescription>
            Showing the most recent payment transactions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                <p className="mt-4 text-muted-foreground">Loading payments...</p>
              </div>
            </div>
          ) : payments.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <CreditCard className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No payments found</p>
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell className="font-mono text-sm">
                        {payment.id}
                      </TableCell>
                      <TableCell>
                        <Link 
                          href={`/customers/${payment.customer_id}`}
                          className="text-primary hover:underline"
                        >
                          {payment.customer_email}
                        </Link>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payment.amount, payment.currency)}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {payment.description || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusVariant(payment.status)}>
                          {payment.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(payment.created_at), 'MMM d, yyyy')}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Process Payment</CardTitle>
          <CardDescription>
            To process a payment, please select a customer first
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild>
            <Link href="/customers">
              Select Customer
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
