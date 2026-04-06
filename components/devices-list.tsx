import React from 'react';
import { View, TouchableOpacity, ScrollView, Dimensions } from 'react-native';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Leaf, ArrowUpRight, Sprout, Clock } from 'lucide-react-native';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { ICON_MAP } from '@/consts/icons';
import { isDeviceOnline } from '@/lib/device-status';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

function formatLastSeen(lastSeen: string) {
  const d = new Date(lastSeen);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'только что';
  if (diffMin < 60) return `${diffMin} мин назад`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `${diffH} ч назад`;
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

export const DevicesList = () => {
  const { devices } = useDevices();

  const handleDevicePress = (deviceId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push(`/(app)/device/${deviceId}`);
  };

  return (
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="gap-5">
          {devices.map((device, index) => {
            const IconComponent = ICON_MAP[device.icon] || Sprout;
            const online = isDeviceOnline(device.lastSeen);

            return (
              <Animated.View
                key={device.deviceId}
                entering={FadeInDown.delay(index * 100).springify()}
              >
                <TouchableOpacity
                  onPress={() => handleDevicePress(device.deviceId)}
                  activeOpacity={0.93}
                >
                  <View className="bg-card rounded-3xl overflow-hidden">
                    {/* Gradient top band */}
                    <View
                      className="px-5 pt-6 pb-5"
                      style={{ backgroundColor: online ? 'rgba(22,163,74,0.07)' : 'rgba(0,0,0,0.03)' }}
                    >
                      <View className="flex-row items-center justify-between">
                        {/* Big icon */}
                        <View
                          className={`rounded-3xl p-5 ${online ? 'bg-primary/15' : 'bg-muted/50'}`}
                        >
                          <Icon
                            as={IconComponent}
                            size={52}
                            className={online ? 'text-primary' : 'text-muted-foreground'}
                          />
                        </View>

                        {/* Right: status + arrow */}
                        <View className="items-end gap-3">
                          <View
                            className={`flex-row items-center gap-2 rounded-full px-3 py-1.5 ${
                              online ? 'bg-emerald-500/15' : 'bg-muted'
                            }`}
                          >
                            <View
                              className={`w-2 h-2 rounded-full ${
                                online ? 'bg-emerald-500' : 'bg-gray-400'
                              }`}
                            />
                            <Text
                              className={`text-xs font-semibold ${
                                online ? 'text-emerald-700' : 'text-gray-500'
                              }`}
                            >
                              {online ? 'В сети' : 'Офлайн'}
                            </Text>
                          </View>

                          <View className="bg-primary rounded-2xl p-2.5">
                            <Icon as={ArrowUpRight} size={18} className="text-primary-foreground" />
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Bottom content */}
                    <View className="px-5 pb-5 pt-4">
                      <Text className="text-xl font-bold text-foreground">{device.name}</Text>

                      <View className="flex-row items-center gap-1.5 mt-1 mb-4">
                        <Icon as={Clock} size={12} className="text-muted-foreground" />
                        <Text className="text-xs text-muted-foreground">
                          {online ? 'Активно' : `Был в сети ${formatLastSeen(device.lastSeen)}`}
                        </Text>
                      </View>

                      {/* Plant chips */}
                      {device.plants.length > 0 && (
                        <View className="flex-row flex-wrap gap-2">
                          {device.plants.map((plant) => {
                            const PlantIcon = ICON_MAP[plant.icon] || Leaf;
                            return (
                              <View
                                key={plant.index}
                                className="flex-row items-center gap-1.5 bg-primary/8 rounded-full px-3 py-1.5"
                              >
                                <Icon as={PlantIcon} size={13} className="text-primary" />
                                <Text className="text-xs font-medium text-foreground">
                                  {plant.name}
                                </Text>
                              </View>
                            );
                          })}
                        </View>
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>
      </ScrollView>
  );
};
