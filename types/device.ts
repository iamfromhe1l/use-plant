import type { IWateringCondition } from '@/api/devices/types/conditions';

export type ITelemetryStatusLevel = 'poor' | 'moderate' | 'normal' | 'good' | 'excellent';

export interface ITelemetryMetricThresholds {
  low: {
    poor: number;
    moderate: number;
    normal: number;
    good: number;
  };
  high: {
    good: number;
    normal: number;
    moderate: number;
    poor: number;
  };
}

export interface IPlantTelemetryStatusConfig {
  temperature: ITelemetryMetricThresholds;
  airHumidity: ITelemetryMetricThresholds;
  soilMoisture: ITelemetryMetricThresholds;
}

export interface IPlant {
  index: number;
  name: string;
  icon: string;
  presetId: string | null;
  wateringConditions: IWateringCondition[];
  telemetryStatusConfig: IPlantTelemetryStatusConfig;
}

export interface IDevice {
  deviceId: string;
  status: 'active' | 'inactive' | 'pending';
  registeredAt: string;
  lastSeen: string;
  name: string;
  icon: string;
  telemetryIntervalMinutes: number;
  plants: IPlant[];
}
