import apiClient from './api-client';

// Customer API methods
export const customerApi = {
  // Get all customers
  getAll: async () => {
    const response = await apiClient.get('/customers');
    return response.data;
  },

  // Get a specific customer
  getById: async (id: string) => {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data;
  },

  // Create a new customer
  create: async (data: any) => {
    const response = await apiClient.post('/customers', data);
    return response.data;
  }
  ,
  // Update an existing customer
  update: async (id: string, data: any) => {
    const response = await apiClient.patch(`/customers/${id}`, data);
    return response.data;
  }
};

export const customerProviderApi = {
  link: async (customerId: string, provider: string) => {
    const response = await apiClient.post(`/customers/${customerId}/providers/${provider}`);
    return response.data;
  },
};

// Payment Methods API methods
export const paymentMethodApi = {
  // Get all payment methods for a customer
  getAllForCustomer: async (customerId: string, options?: { provider?: string }) => {
    const qs = options?.provider ? `?provider=${encodeURIComponent(options.provider)}` : '';
    const response = await apiClient.get(`/customers/${customerId}/payment-methods${qs}`);
    return response.data;
  },

  // Create a payment method for a customer
  create: async (customerId: string, data: any) => {
    const response = await apiClient.post(`/customers/${customerId}/payment-methods`, data);
    return response.data;
  },

  // Delete a payment method
  delete: async (customerId: string, paymentMethodId: string) => {
    const response = await apiClient.delete(`/customers/${customerId}/payment-methods/${paymentMethodId}`);
    return response.data;
  }
  ,
  // Update a stored payment method
  update: async (customerId: string, paymentMethodId: string, data: any) => {
    const response = await apiClient.patch(`/customers/${customerId}/payment-methods/${paymentMethodId}`, data);
    return response.data;
  },

  // Mark a saved payment method as default for the customer
  setDefault: async (customerId: string, paymentMethodId: string) => {
    const response = await apiClient.post(`/customers/${customerId}/payment-methods/${paymentMethodId}/default`);
    return response.data;
  }
};

// Payments API methods
export const paymentApi = {
  // Create a one-time payment
  create: async (data: any) => {
    const response = await apiClient.post('/payments', data);
    return response.data;
  },

  // Get all payments
  getAll: async () => {
    const response = await apiClient.get('/payments');
    return response.data;
  },

  // Get all payments for a customer
  getAllForCustomer: async (customerId: string) => {
    const response = await apiClient.get(`/customers/${customerId}/payments`);
    return response.data;
  }
};

// Subscriptions API methods
export const subscriptionApi = {
  // Create a subscription
  create: async (customerId: string, data: any) => {
    const response = await apiClient.post(`/customers/${customerId}/subscriptions`, data);
    return response.data;
  },

  // Get all subscriptions for a customer
  getAllForCustomer: async (customerId: string) => {
    const response = await apiClient.get(`/customers/${customerId}/subscriptions`);
    return response.data;
  },

  // Get all subscriptions
  getAll: async () => {
    const response = await apiClient.get('/subscriptions');
    return response.data;
  },

  // Get a subscription by id
  getById: async (subscriptionId: string) => {
    const response = await apiClient.get(`/subscriptions/${subscriptionId}`);
    return response.data;
  },

  // Cancel a subscription
  cancel: async (subscriptionId: string) => {
    const response = await apiClient.post(`/subscriptions/${subscriptionId}/cancel`);
    return response.data;
  }
};

// Payment method helper for SetupIntent flows
export const paymentSetupApi = {
  // Create a SetupIntent for a customer (returns client_secret and id)
  createSetupIntent: async (customerId: string, options?: { usage?: string; provider?: string }) => {
    const searchParams = new URLSearchParams();
    if (options?.usage) searchParams.set('usage', options.usage);
    if (options?.provider) searchParams.set('provider', options.provider);
    const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';
    const response = await apiClient.post(`/customers/${customerId}/payment-methods/setup-intent${qs}`);
    return response.data;
  },
};

export const providerApi = {
  list: async () => {
    const response = await apiClient.get('/providers');
    return response.data;
  },
};

// Razorpay-specific API methods
export const razorpayApi = {
  /**
   * Verify the Razorpay payment signature on the backend.
   *
   * Call this from the Razorpay Checkout JS `handler` callback before
   * crediting the payment in your UI.
   *
   * @param data  The object received from Razorpay Checkout JS handler.
   */
  verifyPayment: async (data: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_subscription_id?: string;
    razorpay_signature: string;
    /** Internal DB subscription ID — backend uses this to mark it active */
    subscription_id?: string;
    /** Internal DB payment ID — backend uses this to mark it completed */
    payment_id?: string;
  }): Promise<{ verified: boolean; subscription?: any; payment?: any }> => {
    const response = await apiClient.post('/razorpay/verify-payment', data);
    return response.data;
  },
};

export const syncApi = {
  trigger: async (payload: any = {}) => {
    const response = await apiClient.post('/sync', payload);
    return response.data;
  },
  getJob: async (jobId: string) => {
    const response = await apiClient.get(`/sync/${jobId}`);
    return response.data;
  },
};

// Products and Plans API methods
export const productApi = {
  // Get all products
  getAll: async () => {
    const response = await apiClient.get('/products');
    return response.data;
  },

  // Create a product
  create: async (data: any) => {
    const response = await apiClient.post('/products', data);
    return response.data;
  },

  // Get all plans for a product
  getPlans: async (productId: string) => {
    const response = await apiClient.get(`/products/${productId}/plans`);
    return response.data;
  },

  // Create a plan for a product
  createPlan: async (productId: string, data: any) => {
    const response = await apiClient.post(`/products/${productId}/plans`, data);
    return response.data;
  }
};