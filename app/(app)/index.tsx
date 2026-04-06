import { Stack } from 'expo-router';
import * as React from 'react';
import { Welcome } from '@/components/welcome';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { DevicesList } from '@/components/devices-list';
import { DevicesListSkeleton } from '@/components/devices-list-skeleton';
import { BottomBar } from '@/components/bottom-bar';
import { View } from 'react-native';

export default function HomeScreen() {
  const { devices, loading } = useDevices();

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View className='flex-1 bg-background px-5'>
        {loading
          ? <DevicesListSkeleton />
          : devices.length
            ? <DevicesList />
            : <Welcome />
        }
        <BottomBar />
      </View>
    </>
  );
}
