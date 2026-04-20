import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001',
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
    if (error.response && error.response.status === 401) {
      Cookies.remove('access_token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);

export enum ListSource {
  OFAC = "OFAC",
  EU = "EU",
  UN = "UN",
  UK_HMT = "UK_HMT",
  OTHER = "OTHER",
}

export enum RiskLevel {
  CLEAR = "CLEAR",
  LOW = "LOW",
  MEDIUM = "MEDIUM",
  HIGH = "HIGH",
  CRITICAL = "CRITICAL",
}

export interface SanctionedEntity {
  id: string;
  name: string;
  listSource: ListSource;
  country?: string;
  reason?: string;
  createdAt: string;
}

export interface ScreeningQuery {
  id: string;
  searchedName: string;
  status: string;
  riskLevel: RiskLevel;
  matchedCount: number;
  createdAt: string;
}

export default api;
