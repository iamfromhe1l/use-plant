import React, { createContext, useContext, useState, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Esp32Api } from '@/api/devices/esp32';
import { IEsp32Status, IEsp32Network } from '@/api/devices/types/esp32';
import { useAuth } from '@/contexts/auth-context/auth-context';
import { useDevices } from '../devices-context/devices-context';

interface IDeviceLocalContext {
  device: {
    api: Esp32Api | null;
    status: IEsp32Status | null;
    networks: IEsp32Network[];
    deviceId: string | null;
    connected: boolean;
    loading: boolean;
  };
  actions: {
    connectToDevice: (ip: string) => Promise<boolean>;
    scanNetworks: () => Promise<void>;
    configureDevice: (ssid: string, password: string) => Promise<boolean>;
    disconnect: () => void;
  };
}

const DeviceLocalContext = createContext<IDeviceLocalContext | undefined>(undefined);

export const useDeviceLocal = () => {
  const context = useContext(DeviceLocalContext);
  if (!context) {
    throw new Error('useDeviceLocal must be used within DeviceLocalProvider');
  }
  return context;
};

export const DeviceLocalProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const { actions: devicesActions } = useDevices();
  const [api, setApi] = useState<Esp32Api | null>(null);
  const [status, setStatus] = useState<IEsp32Status | null>(null);
  const [networks, setNetworks] = useState<IEsp32Network[]>([]);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  const connectToDevice = async (ip: string): Promise<boolean> => {
    try {
      setLoading(true);

      const newApi = new Esp32Api(`http://${ip}`);
      const response = await newApi.getStatus();

      if (response.state && response.data) {
        setApi(newApi);
        setStatus(response.data);
        setDeviceId(response.data.deviceId);
        setConnected(true);

        await AsyncStorage.setItem('deviceId', response.data.deviceId);
        return true;
      }

      return false;
    } catch {
      return false;
    } finally {
      setLoading(false);
    }
  };

  const scanNetworks = async () => {
    if (!api) return;

    try {
      setLoading(true);
      const response = await api.scanNetworks();

      if (response.state && response.data) {
        setNetworks(response.data.networks);
      }
    } finally {
      setLoading(false);
    }
  };

  const configureDevice = async (ssid: string, password: string): Promise<boolean> => {
    if (!api || !session?.user) return false;

    try {
      setLoading(true);
      const response = await api.configure({
        ssid,
        password,
        token: session.token as string,
      });

      if (response.state) {
        devicesActions.setLoadingState();
        setTimeout(() => {
          devicesActions.loadDevices();
        }, 3000);
      }

      return response.state;
    } finally {
      setLoading(false);
    }
  };

  const disconnect = () => {
    setApi(null);
    setStatus(null);
    setNetworks([]);
    setDeviceId(null);
    setConnected(false);
  };

  const value: IDeviceLocalContext = {
    device: { api, status, networks, deviceId, connected, loading },
    actions: { connectToDevice, scanNetworks, configureDevice, disconnect },
  };

  return (
    <DeviceLocalContext.Provider value={value}>
      {children}
    </DeviceLocalContext.Provider>
  );
};
