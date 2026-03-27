export type SensorField = 'temperature' | 'airHumidity' | 'soilMoisture';
export type ComparisonOperator = 'eq' | 'gt' | 'lt';

export interface ISensorRule {
  field: SensorField;
  operator: ComparisonOperator;
  value: number;
}

export interface ISchedule {
  time: string; // HH:MM
  days: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

export interface IWateringCondition {
  id: string;
  plantIndex: number;
  type: 'sensor' | 'schedule';
  level: number; // 1-10
  interval: number; // minutes between watering (for sensor type)
  rules?: ISensorRule[];
  schedule?: ISchedule;
  enabled: boolean;
}
