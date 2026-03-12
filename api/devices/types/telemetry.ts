export interface IPlantSensorData {
  index: number;
  temperature: number;
  airHumidity: number;
  soilMoisture: number;
}

export interface ITelemetryRecord {
  deviceId: string;
  plants: IPlantSensorData[];
  receivedAt: string;
}

export interface IWateringRecord {
  deviceId: string;
  userId: string;
  plantIndex: number;
  level: number;
  wateredAt: string;
}
