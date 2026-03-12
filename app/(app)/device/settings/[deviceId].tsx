import React, { useState } from 'react';
import { View, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ArrowLeft, RotateCcw } from 'lucide-react-native';
import { CommandsApi } from '@/api/devices/commands';
import { useDevices } from '@/contexts/devices-context/devices-context';

const commandsApi = new CommandsApi();

export default function DeviceSettingsScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { devices } = useDevices();
  const device = devices.find((d) => d.deviceId === deviceId);
  const [resetting, setResetting] = useState(false);

  const handleReset = () => {
    Alert.alert(
      'Сброс устройства',
      'Вы уверены? Устройство будет перезагружено и сброшено к заводским настройкам.',
      [
        { text: 'Отмена', style: 'cancel' },
        {
          text: 'Сбросить',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            const response = await commandsApi.sendCommand(deviceId, {
              type: 'device_reset',
            });
            setResetting(false);

            if (response.state) {
              Alert.alert('Успешно', 'Команда сброса отправлена');
            } else {
              Alert.alert('Ошибка', response.error?.message || 'Не удалось сбросить устройство');
            }
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-background">
      <View className="flex-row items-center gap-3 px-6 py-4">
        <Button size="icon" variant="ghost" onPress={() => router.back()}>
          <Icon as={ArrowLeft} size={24} className="text-foreground" />
        </Button>
        <Text className="text-xl font-bold text-foreground">Настройки</Text>
      </View>

      <View className="px-6 flex-1">
        <View className="bg-card rounded-2xl p-5 mb-4">
          <Text className="text-base font-semibold text-foreground mb-1">
            {device?.name || 'Устройство'}
          </Text>
          <Text className="text-sm text-muted-foreground">ID: {deviceId}</Text>
        </View>

        <View className="flex-1" />

        <View className="mb-8">
          <Button
            variant="destructive"
            className="flex-row items-center justify-center gap-2"
            onPress={handleReset}
            disabled={resetting}
          >
            <Icon as={RotateCcw} size={16} className="text-destructive-foreground" />
            <Text className="text-sm font-medium text-destructive-foreground">
              {resetting ? 'Сброс...' : 'Сбросить устройство'}
            </Text>
          </Button>
        </View>
      </View>
    </SafeAreaView>
  );
}
