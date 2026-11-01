import axiosClient from './axiosClient';
import type { Customer } from '../types/customer.types';

export const customersApi = {
  getAll: (search?: string) =>
    axiosClient.get('/customers', { params: { search } }),

  getById: (id: string) => axiosClient.get(`/customers/${id}`),

  getInvoices: (id: string) => axiosClient.get(`/customers/${id}/invoices`),

  create: (data: Omit<Customer, '_id' | 'createdAt' | 'updatedAt'>) =>
    axiosClient.post('/customers', data),

  update: (id: string, data: Partial<Customer>) =>
    axiosClient.put(`/customers/${id}`, data),

  delete: (id: string) => axiosClient.delete(`/customers/${id}`),
};
