"use client";
import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { useForm, Controller } from 'react-hook-form';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { productApi } from '../../lib/payment-api';
import getFriendlyApiError from '../../lib/api-utils';
import { Package, Plus, AlertCircle, DollarSign } from 'lucide-react';

// Product creation form component
const ProductForm = ({ onSuccess, onError }: { onSuccess: (product: any) => void, onError: (message: string | null) => void }) => {
  type ProductFormData = {
    name?: string;
    description?: string;
    provider?: string;
  };

  const { register, handleSubmit, setError, formState: { errors, isSubmitting }, reset, control } = useForm<ProductFormData>({
    defaultValues: {
      provider: 'stripe',
    }
  });
  
  const onSubmit = async (data: any) => {
    try {
      // Pass provider in meta_info (library expects meta_info, not metadata)
      const payload = {
        name: data.name,
        description: data.description,
        meta_info: {
          provider: data.provider,
        }
      };
      console.log('Creating product with provider:', data.provider, 'Full payload:', payload);
      const product = await productApi.create(payload);
      onSuccess(product);
      reset();
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
      onError(message);
      console.error('Error creating product:', message, error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="provider">Payment Provider</Label>
        <Controller
          name="provider"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select provider" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="razorpay">Razorpay</SelectItem>
                <SelectItem value="payu">PayU (Standing Instructions)</SelectItem>
                <SelectItem value="cashfree">Cashfree</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        {errors.provider && (
          <p className="text-sm text-destructive">{errors.provider.message?.toString()}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="name">Product Name</Label>
        <Input
          id="name"
          placeholder="Enter product name"
          {...register('name', { required: 'Product name is required' })}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message?.toString()}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Describe your product"
          rows={3}
          {...register('description')}
        />
      </div>
      
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating...' : 'Create Product'}
      </Button>
    </form>
  );
};

// Plan creation form component
const PlanForm = ({ productId, onSuccess, onError }: { productId: string, onSuccess: (plan: any) => void, onError: (message: string | null) => void }) => {
  type PlanFormData = {
    name?: string;
    description?: string;
    pricing_model?: string;
    currency?: string;
    amount?: number;
    billing_interval?: string;
    billing_interval_count?: number;
    provider?: string;
  };

  const { register, handleSubmit, setError, formState: { errors, isSubmitting }, reset, control } = useForm<PlanFormData>({
    defaultValues: {
      pricing_model: 'subscription',
      currency: 'USD',
      billing_interval: 'month',
      billing_interval_count: 1,
      provider: 'stripe',
    }
  });
  
  const onSubmit = async (data: any) => {
    try {
      // Ensure numeric values are correct types for the API (FastAPI validation)
      const payload = {
        ...data,
        amount: Number.parseFloat(String(data.amount ?? 0)),
        billing_interval_count: Number.parseInt(String(data.billing_interval_count ?? 1), 10),
        meta_info: {
          provider: data.provider || 'stripe',
        },
      };

      const plan = await productApi.createPlan(productId, payload);
      onSuccess(plan);
      reset();
    } catch (error: any) {
      // If the server returned Pydantic validation errors, map to form fields
      const details = error?.response?.data?.detail;
      if (Array.isArray(details)) {
        details.forEach((d: any) => {
          // Typical shape: { loc: ['body', '<field>'], msg: '...' }
          const loc = d?.loc;
          if (Array.isArray(loc) && loc.length >= 2) {
            const field = loc[1];
            setError(field as any, { type: 'server', message: d?.msg });
          }
        });
      }

      const message = getFriendlyApiError(error);
      onError(message);
      console.error('Error creating plan:', message, error);
    }
  };
  
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Plan Name</Label>
        <Input
          id="name"
          placeholder="e.g., Basic Monthly"
          {...register('name', { required: 'Plan name is required' } as const)}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message?.toString()}</p>
        )}
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          placeholder="Plan description"
          rows={2}
          {...register('description')}
        />
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="provider">Payment Provider</Label>
        <Controller
          name="provider"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="provider">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stripe">Stripe</SelectItem>
                <SelectItem value="razorpay">Razorpay</SelectItem>
                <SelectItem value="payu">PayU (Standing Instructions)</SelectItem>
                <SelectItem value="cashfree">Cashfree</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
        <p className="text-xs text-muted-foreground">Choose the payment provider for this plan</p>
      </div>
      
      <div className="space-y-2">
        <Label htmlFor="pricing_model">Pricing Model</Label>
        <Controller
          name="pricing_model"
          control={control}
          render={({ field }) => (
            <Select
              value={field.value}
              onValueChange={field.onChange}
            >
              <SelectTrigger id="pricing_model">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="subscription">Subscription</SelectItem>
                <SelectItem value="per_user">Per User</SelectItem>
                <SelectItem value="tiered">Tiered</SelectItem>
                <SelectItem value="usage_based">Usage Based</SelectItem>
                <SelectItem value="freemium">Freemium</SelectItem>
              </SelectContent>
            </Select>
          )}
        />
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            step="0.01"
            min="0"
            placeholder="9.99"
            {...register('amount', { required: 'Amount is required' })}
          />
          {errors.amount && (
            <p className="text-sm text-destructive">{errors.amount.message?.toString()}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="currency">Currency</Label>
          <Controller
            name="currency"
            control={control}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="INR">INR</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="billing_interval">Billing Interval</Label>
          <Controller
            name="billing_interval"
            control={control}
            rules={{ required: 'Billing interval is required' }}
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={field.onChange}
              >
                <SelectTrigger id="billing_interval">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="day">Daily</SelectItem>
                  <SelectItem value="week">Weekly</SelectItem>
                  <SelectItem value="month">Monthly</SelectItem>
                  <SelectItem value="year">Yearly</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
          {errors.billing_interval && (
            <p className="text-sm text-destructive">{errors.billing_interval.message?.toString()}</p>
          )}
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="billing_interval_count">Interval Count</Label>
          <Input
            id="billing_interval_count"
            type="number"
            min="1"
            defaultValue="1"
            {...register('billing_interval_count', { 
              required: 'Interval count is required',
              min: { value: 1, message: 'Minimum value is 1' }
            })}
          />
        </div>
      </div>
      
      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Creating...' : 'Create Plan'}
      </Button>
    </form>
  );
};

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showProductForm, setShowProductForm] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchProductsAndPlans = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Fetch products
        const productsData = await productApi.getAll();
        setProducts(productsData);
        
        // Fetch plans for all products
        const plansPromises = productsData.map((product: any) => 
          productApi.getPlans(product.id)
        );
        const plansArrays = await Promise.all(plansPromises);
        const allPlans = plansArrays.flat();
        setPlans(allPlans);
      } catch (error: any) {
        const message = getFriendlyApiError(error);
        setError(message);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchProductsAndPlans();
  }, []);
  
  const handleProductCreated = (product: any) => {
    setProducts([...products, product]);
    setShowProductForm(false);
    setError(null);
  };
  
  const handlePlanCreated = (plan: any) => {
    setPlans([...plans, plan]);
    setSelectedProductId(null);
    setError(null);
  };
  
  const getProductPlans = (productId: string) => {
    return plans.filter(plan => plan.product_id === productId);
  };
  
  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency
    }).format(amount);
  };
  
  return (
    <div className="container mx-auto py-8 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Products & Plans</h1>
          <p className="text-muted-foreground mt-1">
            Manage your products and pricing plans
          </p>
        </div>
        <Button onClick={() => setShowProductForm(!showProductForm)}>
          <Plus className="mr-2 h-4 w-4" />
          {showProductForm ? 'Cancel' : 'Add Product'}
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {showProductForm && (
        <Card>
          <CardHeader>
            <CardTitle>New Product</CardTitle>
            <CardDescription>Create a new product for your catalog</CardDescription>
          </CardHeader>
          <CardContent>
            <ProductForm onSuccess={handleProductCreated} onError={setError} />
          </CardContent>
        </Card>
      )}

      {selectedProductId && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>
                  New Plan for {products.find(p => p.id === selectedProductId)?.name}
                </CardTitle>
                <CardDescription>Configure pricing for this product</CardDescription>
              </div>
              <Button variant="ghost" onClick={() => setSelectedProductId(null)}>
                Cancel
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <PlanForm 
              productId={selectedProductId} 
              onSuccess={handlePlanCreated} 
              onError={setError}
            />
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading products...</p>
          </div>
        </div>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">No products found</p>
            <Button onClick={() => setShowProductForm(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Create your first product
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {products.map(product => (
            <Card key={product.id}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      {product.name}
                    </CardTitle>
                    <CardDescription>{product.description}</CardDescription>
                    <p className="text-xs text-muted-foreground">
                      ID: {product.id} | Created: {format(new Date(product.created_at), 'MMM d, yyyy')}
                    </p>
                  </div>
                  {selectedProductId !== product.id && (
                    <Button
                      onClick={() => setSelectedProductId(product.id)}
                      size="sm"
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Plan
                    </Button>
                  )}
                </div>
              </CardHeader>
              
              <Separator />
              
              <CardContent className="pt-6">
                <h4 className="font-semibold mb-4 flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Pricing Plans
                </h4>
                
                {getProductPlans(product.id).length === 0 ? (
                  <p className="text-sm text-muted-foreground">No plans for this product yet.</p>
                ) : (
                  <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
                    {getProductPlans(product.id).map(plan => (
                      <Card key={plan.id} className="bg-muted/50">
                        <CardHeader className="pb-3">
                          <CardTitle className="text-base">{plan.name}</CardTitle>
                          <CardDescription className="text-xs">{plan.description}</CardDescription>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex items-baseline gap-1">
                              <span className="text-2xl font-bold">
                                {formatCurrency(plan.amount, plan.currency)}
                              </span>
                              <span className="text-sm text-muted-foreground">
                                /{plan.billing_interval}
                                {plan.billing_interval_count > 1 && ` (x${plan.billing_interval_count})`}
                              </span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Model: {plan.pricing_model}
                            </p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
