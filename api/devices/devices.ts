import { IDevice } from '@/types/device';
import { ApiClient } from '../client';
import type { IApiResponse } from '../types';

export class DevicesApi extends ApiClient {
  async getUserDevices(): Promise<IApiResponse<IDevice[]>> {
    return this.get<IDevice[]>('/devices');
  }
}
