import React, { useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';
import { ScreenHeader } from '@/components/screen-header';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { RotateCcw } from 'lucide-react-native';
import { CommandsApi } from '@/api/devices/commands';
import { useDevices } from '@/contexts/devices-context/devices-context';

const commandsApi = new CommandsApi();

export default function DeviceSettingsScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { devices } = useDevices();
  const device = devices.find((d) => d.deviceId === deviceId);
  const [resetting, setResetting] = useState(false);

  const handleReset = async () => {
    setResetting(true);
    const response = await commandsApi.sendCommand(deviceId, {
      type: 'device_reset',
    });
    setResetting(false);
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Настройки" />

      <View className="px-6 flex-1">
        <View className="bg-card rounded-2xl p-5 mb-4 mt-4">
          <Text className="text-base font-semibold text-foreground mb-1">
            {device?.name || 'Устройство'}
          </Text>
          <Text className="text-sm text-muted-foreground">ID: {deviceId}</Text>
        </View>

        <View className="flex-1" />

        <Separator className="mb-4" />

        <View className="mb-8">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                variant="destructive"
                className="flex-row items-center justify-center gap-2"
                disabled={resetting}
              >
                <Icon as={RotateCcw} size={16} className="text-destructive-foreground" />
                <Text className="text-sm font-medium text-destructive-foreground">
                  {resetting ? 'Сброс...' : 'Сбросить устройство'}
                </Text>
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  <Text>Сброс устройства</Text>
                </AlertDialogTitle>
                <AlertDialogDescription>
                  <Text>
                    Устройство будет перезагружено и сброшено к заводским настройкам.
                    Это действие нельзя отменить.
                  </Text>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>
                  <Text>Отмена</Text>
                </AlertDialogCancel>
                <AlertDialogAction onPress={handleReset}>
                  <Text>Сбросить</Text>
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </View>
      </View>
    </View>
  );
}
