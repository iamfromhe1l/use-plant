import Constants from 'expo-constants';
import { Platform } from 'react-native';
import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import type { IApiResponse, IApiError } from './types';

const FALLBACK_API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';

const API_BASE_URL = Constants?.expoConfig?.extra?.apiBaseUrl || FALLBACK_API_BASE_URL;

export class ApiClient {
  private static token: string | null = null;
  protected client: AxiosInstance;

  static setToken(token: string | null): void {
    ApiClient.token = token;
  }

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config) => {
        if (ApiClient.token) {
          config.headers.Authorization = `Bearer ${ApiClient.token}`;
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      (error: AxiosError) => Promise.reject(error)
    );
  }

  private isApiResponse<T>(data: any): data is IApiResponse<T> {
    return data && typeof data === 'object' && 'state' in data;
  }

  private handleSuccess<T>(response: AxiosResponse<T>): IApiResponse<T> {
    if (this.isApiResponse<T>(response.data)) {
      return response.data;
    }

    return {
      state: true,
      data: response.data,
    };
  }

  private handleError(error: AxiosError): IApiResponse<never> {
    const errorData = error.response?.data as any;

    if (this.isApiResponse<never>(errorData)) {
      return errorData;
    }

    const apiError: IApiError = {
      message:
        errorData?.message || errorData?.error || error.message || 'Произошла неизвестная ошибка',
      code: errorData?.code || error.response?.status?.toString(),
    };

    return {
      state: false,
      error: apiError,
    };
  }

  async request<T>(config: AxiosRequestConfig): Promise<IApiResponse<T>> {
    try {
      const response = await this.client.request<T>(config);
      return this.handleSuccess<T>(response);
    } catch (error) {
      return this.handleError(error as AxiosError);
    }
  }

  async get<T>(url: string, config?: AxiosRequestConfig): Promise<IApiResponse<T>> {
    return this.request<T>({ method: 'GET', url, ...config });
  }

  async post<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<IApiResponse<T>> {
    return this.request<T>({ method: 'POST', url, data, ...config });
  }

  async put<T>(url: string, data?: any, config?: AxiosRequestConfig): Promise<IApiResponse<T>> {
    return this.request<T>({
      method: 'PUT',
      url,
      data,
      ...config,
    });
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<IApiResponse<T>> {
    return this.request<T>({ method: 'DELETE', url, ...config });
  }
}
