import axios from "axios";
import { API_BASE_URL } from "@/config/env";

const isClient = typeof window !== "undefined" && window.location.pathname.includes("/client");
const ACCESS_KEY = isClient ? "client_access_token" : "staff_access_token";
const REFRESH_KEY = isClient ? "client_refresh_token" : "staff_refresh_token";

let accessToken: string | null = typeof window !== "undefined" ? localStorage.getItem(ACCESS_KEY) : null;
let refreshToken: string | null = typeof window !== "undefined" ? localStorage.getItem(REFRESH_KEY) : null;
let onUnauthorized: (() => void) | null = null;

export function setTokens(access: string | null, refresh: string | null) {
  accessToken = access;
  refreshToken = refresh;
  if (typeof window !== "undefined") {
    if (access) {
      localStorage.setItem(ACCESS_KEY, access);
    } else {
      localStorage.removeItem(ACCESS_KEY);
    }
    if (refresh) {
      localStorage.setItem(REFRESH_KEY, refresh);
    } else {
      localStorage.removeItem(REFRESH_KEY);
    }
  }
}

export function getAccessToken() {
  return accessToken;
}

export function getRefreshToken() {
  return refreshToken;
}

export function setOnUnauthorized(cb: () => void) {
  onUnauthorized = cb;
}

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

function processQueue(error: unknown, token: string | null = null) {
  failedQueue.forEach((p) => {
    if (error) p.reject(error);
    else if (token) p.resolve(token);
  });
  failedQueue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status !== 401 || original._retry) {
      return Promise.reject(error);
    }
    if (!refreshToken) {
      onUnauthorized?.();
      return Promise.reject(error);
    }
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        failedQueue.push({
          resolve: (token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original));
          },
          reject,
        });
      });
    }
    original._retry = true;
    isRefreshing = true;
    try {
      const { data } = await axios.post(`${API_BASE_URL}/auth/refresh/`, {
        refresh: refreshToken,
      });
      accessToken = data.access;
      if (typeof window !== "undefined") {
        localStorage.setItem(ACCESS_KEY, data.access);
      }
      if (data.refresh) {
        refreshToken = data.refresh;
        if (typeof window !== "undefined") {
          localStorage.setItem(REFRESH_KEY, data.refresh);
        }
      }
      processQueue(null, accessToken);
      original.headers.Authorization = `Bearer ${accessToken}`;
      return api(original);
    } catch (err) {
      processQueue(err, null);
      onUnauthorized?.();
      return Promise.reject(err);
    } finally {
      isRefreshing = false;
    }
  },
);
