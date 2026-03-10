export interface IEsp32Status {
  deviceId: string;
  configured: boolean;
  mode: 'config' | 'normal';
  ssid: string;
  userId: string;
}

export interface IEsp32Network {
  ssid: string;
  rssi: number;
  encrypted: boolean;
}

export interface IEsp32ScanResponse {
  networks: IEsp32Network[];
  count: number;
}

export interface IEsp32ConfigurePayload {
  ssid: string;
  password: string;
  token: string;
}

export interface IEsp32Response {
  message: string;
}
