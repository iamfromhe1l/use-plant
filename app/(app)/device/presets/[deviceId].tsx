import React, { useMemo, useState } from 'react';
import { ScrollView, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Search, ChevronRight, Flower2, BookOpen } from 'lucide-react-native';
import { ScreenHeader } from '@/components/screen-header';
import { Badge } from '@/components/ui/badge';
import { Icon } from '@/components/ui/icon';
import { Input } from '@/components/ui/input';
import { Text } from '@/components/ui/text';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { useUniwind } from 'uniwind';
import {
  findPresetCategories,
  getPlantPresetById,
  getPresetSummaryLabel,
} from '@/lib/plant-presets';

function PlantTargetChip({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} className="flex-1">
      <View
        className={`rounded-2xl px-4 py-3 ${
          active ? 'bg-primary' : 'border-border/60 bg-secondary/35 border'
        }`}>
        <Text
          className={`text-center text-sm font-semibold ${
            active ? 'text-primary-foreground' : 'text-foreground'
          }`}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function DevicePresetsScreen() {
  const { deviceId, plantIndex: plantIndexParam } = useLocalSearchParams<{
    deviceId: string;
    plantIndex?: string;
  }>();
  const { devices } = useDevices();
  const device = devices.find((item) => item.deviceId === deviceId);
  const plants = device?.plants ?? [];
  const [selectedPlantIndex, setSelectedPlantIndex] = useState(
    Number(plantIndexParam || plants[0]?.index || 1)
  );
  const [query, setQuery] = useState('');
  const { theme } = useUniwind();

  const selectedPlant = useMemo(
    () => plants.find((plant) => plant.index === selectedPlantIndex) ?? plants[0] ?? null,
    [plants, selectedPlantIndex]
  );

  const activePreset = getPlantPresetById(selectedPlant?.presetId);
  const categories = useMemo(() => findPresetCategories(query), [query]);

  return (
    <View className="bg-background flex-1">
      <ScreenHeader title="Предустановки" subtitle={device?.name || 'Устройство'} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="gap-4 px-5 pt-4">
          {selectedPlant ? (
            <Animated.View entering={FadeInDown.delay(40).springify()}>
              <View className="bg-card rounded-[30px] p-5">
                <Text className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">
                  Для какого растения
                </Text>
                <View className="mt-3 flex-row gap-3">
                  {plants.map((plant) => (
                    <PlantTargetChip
                      key={plant.index}
                      label={plant.name}
                      active={plant.index === selectedPlantIndex}
                      onPress={() => setSelectedPlantIndex(plant.index)}
                    />
                  ))}
                </View>

                <View className="bg-secondary/25 mt-4 rounded-3xl px-4 py-4">
                  <Text className="text-foreground text-sm font-semibold">Сейчас активно</Text>
                  <Text className="text-muted-foreground mt-1 text-sm">
                    {getPresetSummaryLabel(selectedPlant.presetId)}
                  </Text>
                  <Text className="text-muted-foreground mt-2 text-xs">
                    Сначала выбери общий тип растения, затем открой страницу с конкретными видами и
                    вариантами ухода.
                  </Text>
                  {activePreset ? (
                    <Text className="text-muted-foreground mt-2 text-xs">
                      Сейчас используется вариант: {activePreset.name}
                    </Text>
                  ) : null}
                </View>
              </View>
            </Animated.View>
          ) : null}

          <Animated.View entering={FadeInDown.delay(70).springify()}>
            <View className="bg-card rounded-3xl p-5">
              <View className="mb-3 flex-row items-center gap-2">
                <Icon as={Search} size={16} className="text-primary" />
                <Text className="text-foreground text-sm font-semibold">Поиск по названию</Text>
              </View>
              <Input
                value={query}
                onChangeText={setQuery}
                placeholder="Например: монстера, фикус, орхидея"
              />
              <Text className="text-muted-foreground mt-3 text-xs">
                Можно искать по русскому названию, латинскому названию или группе растений.
              </Text>
            </View>
          </Animated.View>

          {categories.length === 0 ? (
            <Animated.View entering={FadeInDown.delay(90).springify()}>
              <View className="bg-card items-center rounded-3xl p-8">
                <Icon as={BookOpen} size={28} className="text-muted-foreground" />
                <Text className="text-foreground mt-3 text-base font-semibold">
                  Ничего не найдено
                </Text>
                <Text className="text-muted-foreground mt-2 text-center text-sm">
                  Попробуй другое название растения или более общий запрос.
                </Text>
              </View>
            </Animated.View>
          ) : (
            categories.map((categoryItem, index) => {
              const sampleNames = categoryItem.presets
                .slice(0, 3)
                .map((preset) => preset.name)
                .join(', ');

              return (
                <Animated.View
                  key={categoryItem.id}
                  entering={FadeInDown.delay(100 + index * 30).springify()}>
                  <TouchableOpacity
                    activeOpacity={0.88}
                    onPress={() =>
                      router.push(
                        `/(app)/device/presets/category/${deviceId}?plantIndex=${selectedPlantIndex}&categoryId=${categoryItem.id}`
                      )
                    }>
                    <View className="bg-card overflow-hidden rounded-[32px]">
                      <View
                        className="px-5 py-5"
                        style={{
                          backgroundColor:
                            theme === 'dark' ? 'rgba(255,255,255,0.04)' : categoryItem.palette.start,
                        }}>
                        <View className="flex-row items-start gap-4">
                          <View
                            className="items-center justify-center rounded-[28px] px-4 py-5"
                            style={{
                              backgroundColor:
                                theme === 'dark'
                                  ? 'rgba(255,255,255,0.06)'
                                  : categoryItem.palette.end,
                              minWidth: 88,
                            }}>
                            <Text className="text-4xl">{categoryItem.emoji}</Text>
                            <Text
                              className="mt-2 text-[10px] font-semibold uppercase tracking-[1px]"
                              style={{ color: categoryItem.palette.chip }}>
                              тип
                            </Text>
                          </View>

                          <View className="flex-1">
                            <View className="flex-row items-center gap-2">
                              <Text className="text-foreground text-lg font-semibold">
                                {categoryItem.name}
                              </Text>
                              <Badge
                                variant="outline"
                                className={
                                  theme === 'dark'
                                    ? 'border-border/60 bg-secondary/35'
                                    : 'border-border/50 bg-background/70'
                                }>
                                <Text className="text-foreground text-[10px] font-semibold">
                                  {categoryItem.presets.length} варианта
                                </Text>
                              </Badge>
                            </View>
                            <Text className="text-foreground mt-3 text-sm leading-6">
                              {categoryItem.description}
                            </Text>
                            <Text className="text-muted-foreground mt-3 text-xs">
                              Внутри: {sampleNames}
                              {categoryItem.presets.length > 3 ? ' и другие' : ''}
                            </Text>
                          </View>

                          <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
                        </View>
                      </View>

                      <View className="px-5 py-4">
                        <View className="flex-row flex-wrap gap-2">
                          {categoryItem.presets.slice(0, 4).map((preset) => (
                            <Badge
                              key={preset.id}
                              variant="outline"
                              className="border-border/60 bg-secondary/30">
                              <Text className="text-foreground text-[10px] font-semibold">
                                {preset.name}
                              </Text>
                            </Badge>
                          ))}
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </Animated.View>
              );
            })
          )}
        </View>
      </ScrollView>
    </View>
  );
}
