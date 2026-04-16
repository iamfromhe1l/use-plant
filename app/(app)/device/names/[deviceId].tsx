import React, { useEffect, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams } from 'expo-router';
import { Check, Cpu, Flower2, Save } from 'lucide-react-native';
import { DevicesApi } from '@/api/devices/devices';
import { ScreenHeader } from '@/components/screen-header';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { toast } from '@/components/ui/toast';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { ICON_MAP } from '@/consts/icons';

const devicesApi = new DevicesApi();
const PLANT_ICON_OPTIONS = [
  'Leaf',
  'Flower2',
  'Sprout',
  'Trees',
  'Apple',
  'Citrus',
  'Cherry',
  'Sun',
  'Droplets',
  'Mountain',
  'Cloud',
  'Sparkles',
] as const;

export default function DeviceNamesScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { devices, actions } = useDevices();
  const device = devices.find((item) => item.deviceId === deviceId);
  const [deviceName, setDeviceName] = useState('');
  const [plantNames, setPlantNames] = useState<Record<number, string>>({});
  const [plantIcons, setPlantIcons] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!device) return;

    setDeviceName(device.name);
    setPlantNames(
      Object.fromEntries(device.plants.map((plant) => [plant.index, plant.name])) as Record<
        number,
        string
      >
    );
    setPlantIcons(
      Object.fromEntries(device.plants.map((plant) => [plant.index, plant.icon])) as Record<
        number,
        string
      >
    );
  }, [device]);

  const handleSave = async () => {
    if (!device) return;

    const trimmedDeviceName = deviceName.trim();
    if (!trimmedDeviceName) {
      toast.error('Название устройства не может быть пустым');
      return;
    }

    if (device.plants.some((plant) => !plantNames[plant.index]?.trim())) {
      toast.error('У каждого растения должно быть название');
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSaving(true);

    const response = await devicesApi.updateDeviceSettings({
      deviceId: device.deviceId,
      name: trimmedDeviceName,
      plants: device.plants.map((plant) => ({
        plantIndex: plant.index,
        name: plantNames[plant.index].trim(),
        icon: plantIcons[plant.index] || plant.icon,
      })),
    });

    setSaving(false);

    if (response.state) {
      await actions.loadDevices();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success('Настройки сохранены');
      return;
    }

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    toast.error(response.error?.message || 'Не удалось сохранить настройки');
  };

  return (
    <View className="bg-background flex-1">
      <ScreenHeader title="Названия и иконки" subtitle={device?.name || 'Устройство'} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="gap-4 px-5 pt-4">
          <Animated.View entering={FadeInDown.delay(40).springify()}>
            <View className="bg-card rounded-3xl p-5">
              <View className="mb-3 flex-row items-center gap-3">
                <View className="bg-primary/10 rounded-2xl p-3">
                  <Icon as={Cpu} size={18} className="text-primary" />
                </View>
                <View className="flex-1">
                  <Text className="text-foreground text-base font-semibold">Устройство</Text>
                  <Text className="text-muted-foreground text-sm">
                    Название будет видно в списке устройств и в верхней части экрана.
                  </Text>
                </View>
              </View>

              <Input value={deviceName} onChangeText={setDeviceName} placeholder="Моё устройство" />
            </View>
          </Animated.View>

          {device?.plants.map((plant, index) => (
            <Animated.View
              key={plant.index}
              entering={FadeInDown.delay(90 + index * 50).springify()}>
              <View className="bg-card rounded-3xl p-5">
                <View className="mb-3 flex-row items-center gap-3">
                  <View className="rounded-2xl bg-emerald-500/10 p-3">
                    <Icon as={Flower2} size={18} className="text-emerald-700" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-foreground text-base font-semibold">
                      Растение {plant.index}
                    </Text>
                    <Text className="text-muted-foreground text-sm">
                      Название и иконка для карточки растения, условий и отчётов.
                    </Text>
                  </View>
                </View>

                <Input
                  value={plantNames[plant.index] ?? ''}
                  onChangeText={(value) =>
                    setPlantNames((prev) => ({
                      ...prev,
                      [plant.index]: value,
                    }))
                  }
                  placeholder={`Растение ${plant.index}`}
                />

                <View className="mt-4 gap-2">
                  <Text className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                    Иконка растения
                  </Text>
                  <View className="flex-row flex-wrap gap-2">
                    {PLANT_ICON_OPTIONS.map((iconName) => {
                      const PlantIcon = ICON_MAP[iconName];
                      const selected = (plantIcons[plant.index] || plant.icon) === iconName;

                      return (
                        <TouchableOpacity
                          key={`${plant.index}-${iconName}`}
                          activeOpacity={0.85}
                          onPress={() =>
                            setPlantIcons((prev) => ({
                              ...prev,
                              [plant.index]: iconName,
                            }))
                          }>
                          <View
                            className={`rounded-2xl border px-3 py-3 ${
                              selected ? 'border-primary bg-primary/10' : 'border-border bg-card'
                            }`}>
                            <View className="flex-row items-center gap-2">
                              <Icon
                                as={PlantIcon}
                                size={18}
                                className={selected ? 'text-primary' : 'text-muted-foreground'}
                              />
                              {selected ? (
                                <Icon as={Check} size={14} className="text-primary" />
                              ) : null}
                            </View>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            </Animated.View>
          ))}
        </View>
      </ScrollView>

      <View className="bg-background/95 absolute right-0 bottom-0 left-0 px-5 pt-3 pb-8">
        <Button onPress={handleSave} disabled={saving}>
          <Icon as={Save} size={18} className="text-primary-foreground" />
          <Text className="text-primary-foreground">
            {saving ? 'Сохранение...' : 'Сохранить изменения'}
          </Text>
        </Button>
      </View>
    </View>
  );
}
