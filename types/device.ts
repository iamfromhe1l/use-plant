export interface IPlant {
  index: number;
  name: string;
  icon: string;
}

export interface IDevice {
  deviceId: string;
  status: 'active' | 'inactive' | 'pending';
  registeredAt: string;
  lastSeen: string;
  name: string;
  icon: string;
  plants: IPlant[];
}
