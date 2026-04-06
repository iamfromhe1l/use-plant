import type {
  ComparisonOperator,
  ISensorRule,
  IWateringCondition,
  SensorField,
} from '@/api/devices/types/conditions';

export const WATERING_CONDITIONS_STORAGE_KEY_PREFIX = 'watering_conditions:';

export const WATERING_DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

export const WATERING_SENSOR_UNITS: Record<SensorField, string> = {
  temperature: '°C',
  airHumidity: '%',
  soilMoisture: '%',
};

export const WATERING_OPERATOR_SYMBOLS: Record<ComparisonOperator, string> = {
  lt: '<',
  eq: '=',
  gt: '>',
};

export function getWateringConditionsStorageKey(deviceId: string) {
  return `${WATERING_CONDITIONS_STORAGE_KEY_PREFIX}${deviceId}`;
}

export function describeWateringRule(rule: ISensorRule) {
  const fieldLabel =
    rule.field === 'temperature'
      ? 'Температура'
      : rule.field === 'airHumidity'
        ? 'Влажность воздуха'
        : 'Влажность почвы';

  return `${fieldLabel} ${WATERING_OPERATOR_SYMBOLS[rule.operator]} ${rule.value}${WATERING_SENSOR_UNITS[rule.field]}`;
}

export function describeWateringCondition(condition: IWateringCondition) {
  if (condition.type === 'sensor' && condition.rules?.length) {
    return condition.rules.map(describeWateringRule).join(' и ');
  }

  if (condition.type === 'schedule' && condition.schedule) {
    const days = condition.schedule.days.map((day) => WATERING_DAY_LABELS[day]).join(', ');
    return `${condition.schedule.time} • ${days || 'дни не выбраны'}`;
  }

  return 'Настройте условие';
}
