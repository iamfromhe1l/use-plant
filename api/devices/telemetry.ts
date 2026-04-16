import { ApiClient } from '@/api/client';
import type { IApiResponse } from '@/api/types';
import type { ITelemetryRecord, IWateringRecord } from './types/telemetry';

export class TelemetryApi extends ApiClient {
  async getLatestTelemetry(deviceId: string): Promise<IApiResponse<ITelemetryRecord | null>> {
    return this.get<ITelemetryRecord | null>('/telemetry/latest', {
      params: { deviceId },
    });
  }

  async getTelemetryHistory(
    deviceId: string,
    limit?: number,
    from?: string,
    to?: string
  ): Promise<IApiResponse<ITelemetryRecord[]>> {
    const params: Record<string, unknown> = { deviceId };
    if (typeof limit === 'number' && limit > 0) params.limit = limit;
    if (from) params.from = from;
    if (to) params.to = to;
    return this.get<ITelemetryRecord[]>('/telemetry/history', { params });
  }

  async getWateringHistory(
    deviceId: string,
    limit?: number,
    from?: string,
    to?: string
  ): Promise<IApiResponse<IWateringRecord[]>> {
    const params: Record<string, unknown> = { deviceId };
    if (typeof limit === 'number' && limit > 0) params.limit = limit;
    if (from) params.from = from;
    if (to) params.to = to;
    return this.get<IWateringRecord[]>('/telemetry/watering', { params });
  }
}
