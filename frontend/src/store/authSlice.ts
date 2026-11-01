import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

interface User {
  _id: string;
  email: string;
  name: string;
  role: 'admin' | 'viewer';
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

const storedToken = localStorage.getItem('stf_token');
const storedUser  = localStorage.getItem('stf_user');

const initialState: AuthState = {
  user:      storedUser  ? JSON.parse(storedUser)  : null,
  token:     storedToken ? storedToken             : null,
  isLoading: false,
  error:     null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials(state, action: PayloadAction<{ user: User; token: string }>) {
      state.user  = action.payload.user;
      state.token = action.payload.token;
      state.error = null;
      localStorage.setItem('stf_token', action.payload.token);
      localStorage.setItem('stf_user', JSON.stringify(action.payload.user));
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload;
    },
    setError(state, action: PayloadAction<string | null>) {
      state.error = action.payload;
    },
    logout(state) {
      state.user  = null;
      state.token = null;
      state.error = null;
      localStorage.removeItem('stf_token');
      localStorage.removeItem('stf_user');
    },
  },
});

export const { setCredentials, setLoading, setError, logout } = authSlice.actions;
export default authSlice.reducer;
