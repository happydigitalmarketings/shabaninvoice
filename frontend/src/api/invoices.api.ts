import axiosClient from './axiosClient';

export const invoicesApi = {
  getAll: (params?: {
    search?: string;
    status?: string;
    paymentStatus?: string;
    from?: string;
    to?: string;
    page?: number;
    limit?: number;
  }) => axiosClient.get('/invoices', { params }),

  getById: (id: string)  => axiosClient.get(`/invoices/${id}`),
  getByNumber: (num: string) => axiosClient.get(`/invoices/number/${num}`),

  create: (data: unknown)  => axiosClient.post('/invoices', data),
  update: (id: string, data: unknown) => axiosClient.put(`/invoices/${id}`, data),

  issue: (id: string) => axiosClient.post(`/invoices/${id}/issue`),
  cancel: (id: string, reason: string) =>
    axiosClient.post(`/invoices/${id}/cancel`, { reason }),

  addPayment: (id: string, payment: unknown) =>
    axiosClient.post(`/invoices/${id}/payments`, payment),

  getNextNumber: () => axiosClient.get('/invoices/next-number'),

  getReportSummary: (from: string, to: string) =>
    axiosClient.get('/invoices/reports/summary', { params: { from, to } }),

  uploadPdf: (id: string, file: File) => {
    const formData = new FormData();
    formData.append('pdf', file);
    return axiosClient.post(`/invoices/${id}/upload-pdf`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  uploadNewPdfInvoice: (formData: FormData) =>
    axiosClient.post('/invoices/upload-new', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  parsePdf: (file: File) => {
    const formData = new FormData();
    formData.append('pdf', file);
    return axiosClient.post('/invoices/parse-pdf', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  deletePdf: (id: string) => axiosClient.delete(`/invoices/${id}/pdf`),

  delete: (id: string) => axiosClient.delete(`/invoices/${id}`),
};
