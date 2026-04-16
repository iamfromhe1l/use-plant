import type {
  ComparisonOperator,
  ISensorRule,
  IWateringCondition,
  SensorField,
} from '@/api/devices/types/conditions';

export const WATERING_CONDITIONS_STORAGE_KEY_PREFIX = 'watering_conditions:';

export const WATERING_DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
export const WATERING_DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
export const WATERING_DAY_OPTIONS = WATERING_DAY_ORDER.map((value) => ({
  value,
  label: WATERING_DAY_LABELS[value],
}));

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

export function sortWateringDays(days: number[]) {
  return [...days].sort(
    (left, right) => WATERING_DAY_ORDER.indexOf(left) - WATERING_DAY_ORDER.indexOf(right)
  );
}

export function normalizeScheduleTimes(
  schedule?: { time?: string; times?: string[] | null } | null
) {
  const rawTimes = Array.isArray(schedule?.times)
    ? schedule?.times
    : schedule?.time
      ? [schedule.time]
      : ['08:00'];

  return Array.from(
    new Set(
      rawTimes.filter((time): time is string => typeof time === 'string' && /^\d{2}:\d{2}$/.test(time))
    )
  );
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
    const times = normalizeScheduleTimes(condition.schedule).join(', ');
    const days = sortWateringDays(condition.schedule.days)
      .map((day) => WATERING_DAY_LABELS[day])
      .join(', ');

    if (condition.rules?.length) {
      return `${times || 'время не выбрано'} • ${days || 'дни не выбраны'} • если ${condition.rules.map(describeWateringRule).join(' и ')}`;
    }

    return `${times || 'время не выбрано'} • ${days || 'дни не выбраны'}`;
  }

  return 'Настройте условие';
}
