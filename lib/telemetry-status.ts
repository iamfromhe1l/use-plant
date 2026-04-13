import type {
  IPlant,
  IPlantTelemetryStatusConfig,
  ITelemetryMetricThresholds,
  ITelemetryStatusLevel,
} from '@/types/device';

export type TelemetryMetricKey = keyof IPlantTelemetryStatusConfig;

export const DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG: IPlantTelemetryStatusConfig = {
  temperature: {
    low: { poor: 5, moderate: 12, normal: 18, good: 21 },
    high: { good: 27, normal: 30, moderate: 34, poor: 40 },
  },
  airHumidity: {
    low: { poor: 15, moderate: 25, normal: 35, good: 45 },
    high: { good: 60, normal: 70, moderate: 80, poor: 90 },
  },
  soilMoisture: {
    low: { poor: 10, moderate: 20, normal: 30, good: 40 },
    high: { good: 75, normal: 85, moderate: 92, poor: 100 },
  },
};

const STATUS_LABELS: Record<ITelemetryStatusLevel, string> = {
  poor: 'Плохо',
  moderate: 'Умеренно',
  normal: 'Нормально',
  good: 'Хорошо',
  excellent: 'Отлично',
};

const STATUS_STYLES: Record<
  ITelemetryStatusLevel,
  { badgeClassName: string; textClassName: string; iconClassName: string }
> = {
  poor: {
    badgeClassName: 'border-destructive/25 bg-destructive/10',
    textClassName: 'text-destructive',
    iconClassName: 'text-destructive',
  },
  moderate: {
    badgeClassName: 'border-amber-500/25 bg-amber-500/10',
    textClassName: 'text-amber-700',
    iconClassName: 'text-amber-700',
  },
  normal: {
    badgeClassName: 'border-sky-500/25 bg-sky-500/10',
    textClassName: 'text-sky-700',
    iconClassName: 'text-sky-700',
  },
  good: {
    badgeClassName: 'border-emerald-500/25 bg-emerald-500/10',
    textClassName: 'text-emerald-700',
    iconClassName: 'text-emerald-700',
  },
  excellent: {
    badgeClassName: 'border-primary/25 bg-primary/10',
    textClassName: 'text-primary',
    iconClassName: 'text-primary',
  },
};

export function normalizeTelemetryStatusConfig(
  config?: Partial<IPlantTelemetryStatusConfig> | null
): IPlantTelemetryStatusConfig {
  return {
    temperature: {
      low: {
        poor: Number(
          config?.temperature?.low?.poor ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.temperature.low.poor
        ),
        moderate: Number(
          config?.temperature?.low?.moderate ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.temperature.low.moderate
        ),
        normal: Number(
          config?.temperature?.low?.normal ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.temperature.low.normal
        ),
        good: Number(
          config?.temperature?.low?.good ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.temperature.low.good
        ),
      },
      high: {
        good: Number(
          config?.temperature?.high?.good ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.temperature.high.good
        ),
        normal: Number(
          config?.temperature?.high?.normal ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.temperature.high.normal
        ),
        moderate: Number(
          config?.temperature?.high?.moderate ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.temperature.high.moderate
        ),
        poor: Number(
          config?.temperature?.high?.poor ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.temperature.high.poor
        ),
      },
    },
    airHumidity: {
      low: {
        poor: Number(
          config?.airHumidity?.low?.poor ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.airHumidity.low.poor
        ),
        moderate: Number(
          config?.airHumidity?.low?.moderate ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.airHumidity.low.moderate
        ),
        normal: Number(
          config?.airHumidity?.low?.normal ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.airHumidity.low.normal
        ),
        good: Number(
          config?.airHumidity?.low?.good ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.airHumidity.low.good
        ),
      },
      high: {
        good: Number(
          config?.airHumidity?.high?.good ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.airHumidity.high.good
        ),
        normal: Number(
          config?.airHumidity?.high?.normal ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.airHumidity.high.normal
        ),
        moderate: Number(
          config?.airHumidity?.high?.moderate ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.airHumidity.high.moderate
        ),
        poor: Number(
          config?.airHumidity?.high?.poor ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.airHumidity.high.poor
        ),
      },
    },
    soilMoisture: {
      low: {
        poor: Number(
          config?.soilMoisture?.low?.poor ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.soilMoisture.low.poor
        ),
        moderate: Number(
          config?.soilMoisture?.low?.moderate ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.soilMoisture.low.moderate
        ),
        normal: Number(
          config?.soilMoisture?.low?.normal ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.soilMoisture.low.normal
        ),
        good: Number(
          config?.soilMoisture?.low?.good ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.soilMoisture.low.good
        ),
      },
      high: {
        good: Number(
          config?.soilMoisture?.high?.good ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.soilMoisture.high.good
        ),
        normal: Number(
          config?.soilMoisture?.high?.normal ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.soilMoisture.high.normal
        ),
        moderate: Number(
          config?.soilMoisture?.high?.moderate ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.soilMoisture.high.moderate
        ),
        poor: Number(
          config?.soilMoisture?.high?.poor ??
            DEFAULT_PLANT_TELEMETRY_STATUS_CONFIG.soilMoisture.high.poor
        ),
      },
    },
  };
}

export function getPlantTelemetryConfig(plant?: IPlant | null) {
  return normalizeTelemetryStatusConfig(plant?.telemetryStatusConfig);
}

export function isMetricThresholdsValid(thresholds: ITelemetryMetricThresholds) {
  return (
    thresholds.low.poor <= thresholds.low.moderate &&
    thresholds.low.moderate <= thresholds.low.normal &&
    thresholds.low.normal <= thresholds.low.good &&
    thresholds.low.good <= thresholds.high.good &&
    thresholds.high.good <= thresholds.high.normal &&
    thresholds.high.normal <= thresholds.high.moderate &&
    thresholds.high.moderate <= thresholds.high.poor
  );
}

export function getTelemetryStatus(
  value: number | undefined,
  thresholds: ITelemetryMetricThresholds
): ITelemetryStatusLevel | null {
  if (value === undefined || Number.isNaN(value)) return null;

  if (value < thresholds.low.poor || value > thresholds.high.poor) return 'poor';
  if (value < thresholds.low.moderate || value > thresholds.high.moderate) return 'moderate';
  if (value < thresholds.low.normal || value > thresholds.high.normal) return 'normal';
  if (value < thresholds.low.good || value > thresholds.high.good) return 'good';
  return 'excellent';
}

export function getTelemetryStatusMeta(status: ITelemetryStatusLevel | null) {
  if (!status) return null;

  return {
    status,
    label: STATUS_LABELS[status],
    ...STATUS_STYLES[status],
  };
}
