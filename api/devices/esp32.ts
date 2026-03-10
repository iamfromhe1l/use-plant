import { AxiosRequestConfig } from 'axios';
import { ApiClient } from '../client';
import type { IApiResponse } from '../types';
import {
  IEsp32Status,
  IEsp32ScanResponse,
  IEsp32ConfigurePayload,
  IEsp32Response,
} from './types/esp32';

export class Esp32Api extends ApiClient {
  constructor(baseURL: string) {
    super();
    this.client.defaults.baseURL = baseURL;
    this.client.defaults.timeout = 5000;
  }

  async getStatus(config?: AxiosRequestConfig): Promise<IApiResponse<IEsp32Status>> {
    return this.get<IEsp32Status>('/status', {
      ...config,
      timeout: 3000,
    });
  }

  async scanNetworks(config?: AxiosRequestConfig): Promise<IApiResponse<IEsp32ScanResponse>> {
    return this.get<IEsp32ScanResponse>('/scan', {
      ...config,
      timeout: 10000,
    });
  }

  async configure(
    payload: IEsp32ConfigurePayload,
    config?: AxiosRequestConfig
  ): Promise<IApiResponse<IEsp32Response>> {
    return this.post<IEsp32Response>('/configure', payload, {
      ...config,
      timeout: 5000,
    });
  }

  async checkConnection(): Promise<boolean> {
    try {
      const response = await this.getStatus();
      return response.state && !!response.data;
    } catch {
      return false;
    }
  }

  setBaseURL(url: string) {
    this.client.defaults.baseURL = url;
  }
}
