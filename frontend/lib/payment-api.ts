import apiClient from './api-client';

// Customer API methods
export const customerApi = {
  // Get all customers
  getAll: async () => {
    const response = await apiClient.get('/customers');
    return response.data;
  },
  
  // Get a specific customer
  getById: async (id) => {
    const response = await apiClient.get(`/customers/${id}`);
    return response.data;
  },
  
  // Create a new customer
  create: async (data) => {
    const response = await apiClient.post('/customers', data);
    return response.data;
  }
};

// Payment Methods API methods
export const paymentMethodApi = {
  // Get all payment methods for a customer
  getAllForCustomer: async (customerId) => {
    const response = await apiClient.get(`/customers/${customerId}/payment-methods`);
    return response.data;
  },
  
  // Create a payment method for a customer
  create: async (customerId, data) => {
    const response = await apiClient.post(`/customers/${customerId}/payment-methods`, data);
    return response.data;
  },
  
  // Delete a payment method
  delete: async (customerId, paymentMethodId) => {
    const response = await apiClient.delete(`/customers/${customerId}/payment-methods/${paymentMethodId}`);
    return response.data;
  }
};

// Payments API methods
export const paymentApi = {
  // Create a one-time payment
  create: async (data) => {
    const response = await apiClient.post('/payments', data);
    return response.data;
  },
  
  // Get all payments for a customer
  getAllForCustomer: async (customerId) => {
    const response = await apiClient.get(`/customers/${customerId}/payments`);
    return response.data;
  }
};

// Subscriptions API methods
export const subscriptionApi = {
  // Create a subscription
  create: async (customerId, data) => {
    const response = await apiClient.post(`/customers/${customerId}/subscriptions`, data);
    return response.data;
  },
  
  // Get all subscriptions for a customer
  getAllForCustomer: async (customerId) => {
    const response = await apiClient.get(`/customers/${customerId}/subscriptions`);
    return response.data;
  },
  
  // Cancel a subscription
  cancel: async (subscriptionId) => {
    const response = await apiClient.post(`/subscriptions/${subscriptionId}/cancel`);
    return response.data;
  }
};

// Products and Plans API methods
export const productApi = {
  // Get all products
  getAll: async () => {
    const response = await apiClient.get('/products');
    return response.data;
  },
  
  // Create a product
  create: async (data) => {
    const response = await apiClient.post('/products', data);
    return response.data;
  },
  
  // Get all plans for a product
  getPlans: async (productId) => {
    const response = await apiClient.get(`/products/${productId}/plans`);
    return response.data;
  },
  
  // Create a plan for a product
  createPlan: async (productId, data) => {
    const response = await apiClient.post(`/products/${productId}/plans`, data);
    return response.data;
  }
};