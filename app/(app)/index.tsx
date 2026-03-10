import { Stack } from 'expo-router';
import * as React from 'react';
import { Welcome } from '@/components/welcome';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { Loading } from '@/components/loading';
import { DevicesList } from '@/components/devices-list';
import { BottomBar } from '@/components/bottom-bar';
import { View } from 'react-native';

const SCREEN_OPTIONS = {
  title: 'usePlant',
  headerTransparent: true,
};

export default function HomeScreen() {
  const { devices, loading } = useDevices();

  return (
    <>
      <Stack.Screen options={SCREEN_OPTIONS} />
      <View className='flex-1 bg-background p-6'>
        {loading
          ? <Loading />
          : devices.length
            ? <DevicesList />
            : <Welcome />
        }
        <BottomBar />
      </View>
    </>
  );
}
