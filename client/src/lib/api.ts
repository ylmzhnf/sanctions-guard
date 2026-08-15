import axios, { AxiosError } from "axios";
import Cookies from "js-cookie";
import { useAuthStore } from "@/lib/store";

const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1",
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token =
    Cookies.get("access_token") ||
    (typeof window !== "undefined" ? localStorage.getItem("sg_token") : null);
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      useAuthStore.getState().logout();
      const currentPath = window.location.pathname;
      if (!currentPath.startsWith("/auth/")) {
        window.location.assign("/auth/login");
      }
    }
    return Promise.reject(error);
  },
);

export class ApiError extends Error {
  constructor(
    public message: string,
    public status: number = 500,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

const handleApiError = (e: any): never => {
  if (e instanceof AxiosError) {
    throw new ApiError(
      e.response?.data?.message || "Server Error",
      e.response?.status || 500,
    );
  }
  throw new ApiError("Network error. Please check your connection.", 0);
};

export type RiskLevel = "CLEAR" | "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
export interface Organization {
  id: string;
  name: string;
}
export interface User {
  id: string;
  email: string;
  name?: string;
  role: string;
  org?: Organization;
  organization?: Organization;
  mustChangePassword?: boolean;
}

export const auth = {
  login: async (data: any) =>
    api
      .post("/auth/login", data)
      .then((r) => r.data)
      .catch(handleApiError),
  me: async () =>
    api
      .get<User>("/auth/me")
      .then((r) => r.data)
      .catch(handleApiError),
  register: async (data: {
    name: string;
    orgName: string;
    email: string;
    password: string;
  }) =>
    api
      .post("/auth/register", data)
      .then((r) => r.data)
      .catch(handleApiError),
};

export const screening = {
  screen: async (name: string) =>
    api
      .post("/screening/screen", { name })
      .then((r) => r.data)
      .catch(handleApiError),
  history: async (
    p = 1,
    l = 20,
    filters?: { riskLevel?: string; queryName?: string },
  ) =>
    api
      .get(`/screening/history`, { params: { page: p, limit: l, ...filters } })
      .then((r) => r.data)
      .catch(handleApiError),
  downloadReport: async (queryId: string, queryName: string) => {
    const response = await api.get(`/screening/download-report/${queryId}`, {
      responseType: "blob",
    });
    const url = URL.createObjectURL(
      new Blob([response.data], { type: "application/pdf" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `report_${queryName.replace(/\s+/g, "_")}_${queryId.slice(0, 8)}.pdf`;
    link.click();
    URL.revokeObjectURL(url);
  },
};

export const notifications = {
  getAll: async () =>
    api
      .get("/notifications")
      .then((r) => r.data)
      .catch(handleApiError),
  markAsRead: async (id: string) =>
    api
      .post(`/notifications/${id}/read`)
      .then((r) => r.data)
      .catch(handleApiError),
  markAllAsRead: async () =>
    api
      .post("/notifications/mark-all-read")
      .then((r) => r.data)
      .catch(handleApiError),
  delete: async (id: string) =>
    api
      .delete(`/notifications/${id}`)
      .then((r) => r.data)
      .catch(handleApiError),
};

export default api;
