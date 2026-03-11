import { AxiosRequestConfig } from 'axios';
import { ApiClient } from '@/api/client';
import type { IApiResponse } from '@/api/types';
import { IAuthPayload, IAuthResponse, IRegisterPayload } from '@/api/auth/types';

export class AuthApi extends ApiClient {
  async login(payload: IAuthPayload): Promise<IApiResponse<IAuthResponse>> {
    return this.post<IAuthResponse>('/auth/login', payload);
  }

  async register(payload: IRegisterPayload): Promise<IApiResponse<IAuthResponse>> {
    return this.post<IAuthResponse>('/auth/register', payload);
  }

  async changePassword(payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<IApiResponse<void>> {
    return this.post<void>('/auth/password', payload);
  }

  async logout(): Promise<IApiResponse<void>> {
    return this.post<void>('/auth/logout');
  }

  async validateToken(config?: AxiosRequestConfig): Promise<IApiResponse<{ valid: boolean }>> {
    return this.get<{ valid: boolean }>('/auth/validate', config);
  }
}
