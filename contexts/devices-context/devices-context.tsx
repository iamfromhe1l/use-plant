import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/contexts/auth-context/auth-context';
import { DevicesApi } from '@/api/devices/devices';
import { IDevice } from '@/types/device';

interface IDevicesContext {
  devices: IDevice[];
  loading: boolean;
  actions: {
    loadDevices: () => Promise<void>;
    setLoadingState: () => void;
  };
}

const DevicesContext = createContext<IDevicesContext | undefined>(undefined);

export const useDevices = () => {
  const context = useContext(DevicesContext);
  if (!context) {
    throw new Error('useDevices must be used within DevicesProvider');
  }
  return context;
};

const backendApi = new DevicesApi();

export const DevicesProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { session } = useAuth();
  const [devices, setDevices] = useState<IDevice[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session?.token) {
      loadDevices();
    } else {
      setDevices([]);
    }
  }, [session?.token]);

  const loadDevices = async () => {
    if (!session?.token) return;

    try {
      setLoading(true);
      const response = await backendApi.getUserDevices();
      console.log(response)

      if (response.state && response.data) {
        setDevices(response.data);
      }
    } catch (error) {
      console.error('Failed to load devices:', error);
    } finally {
      setLoading(false);
    }
  };

  const setLoadingState = () => {
    setLoading(true);
  }

  const value: IDevicesContext = {
    devices,
    loading,
    actions: {
      loadDevices,
      setLoadingState,
    },
  };

  return (
    <DevicesContext.Provider value={value}>
      {children}
    </DevicesContext.Provider>
  );
};
