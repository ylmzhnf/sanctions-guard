import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(
  (config) => {
    const token = Cookies.get('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      Cookies.remove('access_token');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sg-auth-storage');
        window.location.href = '/auth/login';
      }
    }
    return Promise.reject(error);
  },
);

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number = 500) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

export const billing = {
  checkout: async (priceId: string) => {
    try {
      const res = await api.post('/billing/checkout', { priceId });
      return res.data;
    } catch (error: any) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to start checkout',
        error.response?.status
      );
    }
  },
  portal: async () => {
    try {
      const res = await api.post('/billing/portal');
      return res.data;
    } catch (error: any) {
      throw new ApiError(
        error.response?.data?.message || 'Failed to open billing portal',
        error.response?.status
      );
    }
  }
};

export enum RiskLevel {
  CLEAR = "CLEAR", 
  LOW = "LOW", 
  MEDIUM = "MEDIUM", 
  HIGH = "HIGH", 
  CRITICAL = "CRITICAL"
}

export interface User {
  id: string;
  email: string;
  name?: string;
  username?: string | null;
  role: 'USER' | 'ADMIN';
  orgId: string;
  mustChangePassword?: boolean;
  organization?: Organization;
  org?: Organization;
}

export interface Organization {
  id?: string;
  name?: string;
  plan: 'FREE' | 'STARTER' | 'BUSINESS' | 'ENTERPRISE';
  queriesUsed: number;
  queriesLimit: number;
  isLifetime: boolean; 
}

export interface ScreeningQuery {
  id: string;
  queryName: string;
  riskLevel: RiskLevel;
  matchedCount: number;
  aiExplanation?: string;
  createdAt: string;
}

export default api;