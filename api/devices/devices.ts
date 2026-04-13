import { IDevice, IPlantTelemetryStatusConfig } from '@/types/device';
import { ApiClient } from '@/api/client';
import type { IApiResponse } from '@/api/types';

export class DevicesApi extends ApiClient {
  async getUserDevices(): Promise<IApiResponse<IDevice[]>> {
    return this.get<IDevice[]>('/devices');
  }

  async updateDeviceTelemetrySettings(
    deviceId: string,
    plantConfigs: { plantIndex: number; telemetryStatusConfig: IPlantTelemetryStatusConfig }[]
  ): Promise<IApiResponse<IDevice>> {
    return this.put<IDevice>('/devices/settings', { deviceId, plantConfigs });
  }
}
