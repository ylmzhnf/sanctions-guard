import axios from "axios";
import Cookies from "js-cookie";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1",
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token =
      Cookies.get("access_token") ||
      (typeof window !== "undefined" ? localStorage.getItem("sg_token") : null);
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
      Cookies.remove("access_token");
      if (typeof window !== "undefined") {
        localStorage.removeItem("sg_token");
        localStorage.removeItem("sg-auth-storage");
        window.location.href = "/auth/login";
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

const handleApiError = (error: any) => {
  if (error instanceof AxiosError) {
    throw new ApiError(
      error.response?.data?.message || "An unexpected error occurred.",
      error.response?.status || 500,
    );
  }
  throw error;
};

export type RiskLevel = "CLEAR" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export type Role = "USER" | "ADMIN" | "API_SERVICE";
export type Plan =
  | "FREE"
  | "STARTER"
  | "BUSINESS"
  | "ENTERPRISE"
  | "SELF_HOSTED";
export type ListSource = "OFAC" | "EU" | "UN" | "UK_HMT" | "OTHER";

export interface Organization {
  id: string;
  name: string;
  plan: Plan;
  queriesUsed: number;
  queriesLimit: number;
  isUnlimited: boolean;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  username?: string | null;
  role: Role;
  orgId: string;
  mustChangePassword?: boolean;
  org?: Organization;
}

export const auth = {
  register: async (data: {
    email: string;
    password: string;
    name?: string;
    orgName?: string;
  }) => {
    try {
      const res = await api.post<{ token: string; user: User }>(
        "/auth/register",
        data,
      );
      return res.data;
    } catch (e) {
      handleApiError(e);
    }
  },

  login: async (data: { email: string; password: string }) => {
    try {
      const res = await api.post<{ token: string; user: User }>(
        "/auth/login",
        data,
      );
      return res.data;
    } catch (e) {
      handleApiError(e);
    }
  },

  me: async () => {
    try {
      const res = await api.get<User>("/auth/me");
      return res.data;
    } catch (e) {
      handleApiError(e);
    }
  },
};

export const admin = {
  stats: async () => {
    try {
      const res = await api.get<{
        orgCount: number;
        userCount: number;
        queryCount: number;
      }>("/admin/stats");
      return res.data;
    } catch (e) {
      handleApiError(e);
    }
  },

  organizations: async () => {
    try {
      const res = await api.get<any[]>("/admin/organizations");
      return res.data;
    } catch (e) {
      handleApiError(e);
    }
  },

  updateLicense: async (
    id: string,
    data: { plan?: Plan; queriesLimit?: number; isUnlimited?: boolean },
  ) => {
    try {
      const res = await api.patch(`/admin/organizations/${id}/license`, data);
      return res.data;
    } catch (e) {
      handleApiError(e);
    }
  },
};

export const screening = {
  screen: async (data: {
    queryName?: string;
    name?: string;
    entityType?: string;
  }) => {
    try {
      const payload = {
        queryName: data.queryName || data.name,
        entityType: data.entityType,
      };
      const res = await api.post("/screening/screen", payload);
      return res.data;
    } catch (e) {
      handleApiError(e);
    }
  },

  bulk: async (names: string[], entityType?: string) => {
    try {
      const res = await api.post("/screening/bulk", { names, entityType });
      return res.data;
    } catch (e) {
      handleApiError(e);
    }
  },

  history: async (
    page = 1,
    limit = 20,
    filters?: { riskLevel?: string; queryName?: string },
  ) => {
    try {
      const res = await api.get("/screening/history", {
        params: { page, limit, ...filters },
      });
      return res.data;
    } catch (e) {
      handleApiError(e);
    }
  },

  downloadReport: async (id: string, name: string) => {
    try {
      const res = await api.get(`/screening/download-report/${id}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(
        new Blob([res.data], { type: "application/pdf" }),
      );
      const a = document.createElement("a");
      a.href = url;
      a.download = `Sanctions-Report-${name.replace(/\s+/g, "-")}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Failed to download PDF report", error);
      throw new Error("Failed to download report");
    }
  },
};

export const audit = {
  logs: async (page = 1) => {
    try {
      const res = await api.get(`/audit/logs`, { params: { page } });
      return res.data;
    } catch (e) {
      handleApiError(e);
    }
  },

  verify: async (id: string) => {
    try {
      const res = await api.get(`/audit/verify/${id}`);
      return res.data;
    } catch (e) {
      handleApiError(e);
    }
  },
};

export const billing = {
  checkout: async (priceId: string) => {
    try {
      const res = await api.post<{ url: string }>("/billing/checkout", {
        priceId,
      });
      return res.data;
    } catch (e) {
      handleApiError(e);
    }
  },

  portal: async () => {
    try {
      const res = await api.post<{ url: string }>("/billing/portal");
      return res.data;
    } catch (e) {
      handleApiError(e);
    }
  },
};

export default api;
