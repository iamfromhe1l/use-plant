import React from 'react';
import { View, TouchableOpacity, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Button } from '@/components/ui/button';
import {
  Wifi,
  WifiOff,
  Plus,
  Leaf,
  ArrowRight
} from 'lucide-react-native';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { ICON_MAP } from '@/consts/icons';
import { SafeAreaView } from 'react-native-safe-area-context';

export const DevicesList = () => {
  const { devices } = useDevices();

  const getIconComponent = (iconName: string) => {
    return ICON_MAP[iconName] || Leaf;
  };

  const handleDevicePress = (deviceId: string) => {
    router.push(`/(app)/device/${deviceId}`);
  };

  const onAddDevice = () => {
    router.push('/(app)/connect');
  };

  return (
    <SafeAreaView className="flex-1 px-6">
      <View className="flex-row justify-between items-center py-2">
        <Text className="text-4xl font-extrabold text-foreground">
          Мои устройства
        </Text>

        <Button size="icon" className="size-12 rounded-full" onPress={onAddDevice}>
          <Icon as={Plus} size={22} className="text-primary-foreground" />
        </Button>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-6 pt-6 pb-32">
          {devices.map((device) => {
            const IconComponent = getIconComponent(device.icon);

            return (
              <TouchableOpacity
                key={device.deviceId}
                onPress={() => handleDevicePress(device.deviceId)}
                activeOpacity={0.9}
              >
                <View className="relative rounded-3xl bg-card p-6 overflow-hidden">
                  <View className="items-center pb-4">
                    <Icon
                      as={IconComponent}
                      size={110}
                      className="text-primary"
                    />
                  </View>
                  <View className="gap-1">
                    <Text className="text-xl font-bold text-foreground">
                      {device.name}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      {device.status === 'active' ? (
                        <Icon as={Wifi} size={16} className="text-primary" />
                      ) : (
                        <Icon as={WifiOff} size={16} className="text-destructive" />
                      )}
                      <Text className="text-sm text-muted-foreground">
                        {device.status === 'active'
                          ? 'Подключено'
                          : 'Нет соединения'}
                      </Text>
                    </View>
                    {device.plants && device.plants.length > 0 && (
                      <View className="flex-row items-center gap-2 mt-2">
                        {device.plants.map((plant) => {
                          const PlantIcon = getIconComponent(plant.icon);
                          return (
                            <View key={plant.index} className="flex-row items-center gap-1 bg-secondary rounded-full px-2.5 py-1">
                              <Icon as={PlantIcon} size={12} className="text-secondary-foreground" />
                              <Text className="text-xs text-secondary-foreground">{plant.name}</Text>
                            </View>
                          );
                        })}
                      </View>
                    )}
                  </View>
                  <View className="absolute right-4 bottom-4">
                    <View className="bg-primary rounded-full p-3">
                      <Icon
                        as={ArrowRight}
                        size={18}
                        className="text-primary-foreground"
                      />
                    </View>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
