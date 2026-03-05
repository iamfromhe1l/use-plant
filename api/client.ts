import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { IApiResponse, IApiError } from './types';
import Constants from 'expo-constants';

const API_BASE_URL = Constants?.expoConfig?.extra?.apiBaseUrl || 'http://192.168.0.105:4000';

export class ApiClient {
  protected client: AxiosInstance;

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
      async (config) => {
        const token = await AsyncStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
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
