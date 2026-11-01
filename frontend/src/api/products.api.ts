import axiosClient from './axiosClient';
import type { Product } from '../types/product.types';

export const productsApi = {
  getAll: (search?: string) =>
    axiosClient.get('/products', { params: { search } }),

  getById: (id: string) => axiosClient.get(`/products/${id}`),

  create: (data: Omit<Product, '_id' | 'createdAt' | 'updatedAt'>) =>
    axiosClient.post('/products', data),

  update: (id: string, data: Partial<Product>) =>
    axiosClient.put(`/products/${id}`, data),

  delete: (id: string) => axiosClient.delete(`/products/${id}`),
};
