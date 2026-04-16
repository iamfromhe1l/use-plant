import type { IWateringCondition } from '@/api/devices/types/conditions';
import { ApiClient } from '@/api/client';
import type { IApiResponse } from '@/api/types';
import { IDevice, IPlantTelemetryStatusConfig } from '@/types/device';

export interface IUpdateDeviceSettingsPlant {
  plantIndex: number;
  name?: string;
  icon?: string;
  presetId?: string | null;
  telemetryStatusConfig?: IPlantTelemetryStatusConfig;
  wateringConditions?: IWateringCondition[];
}

export interface IUpdateDeviceSettingsRequest {
  deviceId: string;
  name?: string;
  telemetryIntervalMinutes?: number;
  plants?: IUpdateDeviceSettingsPlant[];
}

export class DevicesApi extends ApiClient {
  async getUserDevices(): Promise<IApiResponse<IDevice[]>> {
    return this.get<IDevice[]>('/devices');
  }

  async updateDeviceSettings(
    payload: IUpdateDeviceSettingsRequest
  ): Promise<IApiResponse<IDevice>> {
    return this.put<IDevice>('/devices/settings', payload);
  }
}
