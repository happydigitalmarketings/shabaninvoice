import axiosClient from './axiosClient';

export const authApi = {
  login: (email: string, password: string) =>
    axiosClient.post('/auth/login', { email, password }),

  changePassword: (currentPassword: string, newPassword: string) =>
    axiosClient.post('/auth/change-password', { currentPassword, newPassword }),

  me: () => axiosClient.get('/auth/me'),
};
