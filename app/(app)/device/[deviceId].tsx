import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Alert,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  FlatList,
  RefreshControl,
} from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import {
  ArrowLeft,
  Droplets,
  Thermometer,
  Wind,
  Flower2,
  Minus,
  Plus,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Clock,
} from 'lucide-react-native';
import { CommandsApi } from '@/api/devices/commands';
import { TelemetryApi } from '@/api/devices/telemetry';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { ICON_MAP } from '@/consts/icons';
import type { CommandType } from '@/api/devices/types/commands';
import type { ITelemetryRecord, IWateringRecord } from '@/api/devices/types/telemetry';
import type { IPlant } from '@/types/device';

const commandsApi = new CommandsApi();
const telemetryApi = new TelemetryApi();
const { width: SCREEN_WIDTH } = Dimensions.get('window');

export default function DeviceScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { devices } = useDevices();
  const device = devices.find((d) => d.deviceId === deviceId);
  const insets = useSafeAreaInsets();
  const sliderRef = useRef<FlatList>(null);
  const scrollRef = useRef<ScrollView>(null);

  const [selectedPlantIndex, setSelectedPlantIndex] = useState(0);
  const [telemetry, setTelemetry] = useState<ITelemetryRecord | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [wateringHistory, setWateringHistory] = useState<IWateringRecord[]>([]);
  const [sendingCommand, setSendingCommand] = useState<CommandType | null>(null);
  const [waterLevels, setWaterLevels] = useState<Record<number, number>>({ 1: 5, 2: 5 });
  const [loading, setLoading] = useState(true);

  const plants: IPlant[] = device?.plants || [
    { index: 1, name: 'Растение 1', icon: 'Leaf' },
    { index: 2, name: 'Растение 2', icon: 'Flower2' },
  ];

  const currentPlant = plants[selectedPlantIndex];

  const fetchData = useCallback(async () => {
    const [telRes, waterRes] = await Promise.all([
      telemetryApi.getLatestTelemetry(deviceId),
      telemetryApi.getWateringHistory(deviceId),
    ]);
    if (telRes.state && telRes.data) {
      setTelemetry(telRes.data);
    }
    if (waterRes.state && waterRes.data) {
      setWateringHistory(waterRes.data);
    }
  }, [deviceId]);

  useEffect(() => {
    fetchData().then(() => setLoading(false));
  }, [fetchData]);

  const onRefresh = async () => {
    setRefreshing(true);
    scrollRef.current?.scrollTo({ y: 0, animated: true });
    await fetchData();
    setRefreshing(false);
  };

  const handleWater = async () => {
    const plantIndex = currentPlant.index;
    const commandType = plantIndex === 1 ? 'water_plant_1' : 'water_plant_2';
    const level = waterLevels[plantIndex] || 5;

    setSendingCommand(commandType as CommandType);
    const response = await commandsApi.sendCommand(deviceId, {
      type: commandType as CommandType,
      payload: { level },
    });
    setSendingCommand(null);

    if (response.state) {
      Alert.alert('Успешно', `Полив запущен (уровень ${level})`);
      fetchData();
    } else {
      Alert.alert('Ошибка', response.error?.message || 'Не удалось отправить команду');
    }
  };

  const setLevel = (delta: number) => {
    const plantIndex = currentPlant.index;
    setWaterLevels((prev) => ({
      ...prev,
      [plantIndex]: Math.min(10, Math.max(1, (prev[plantIndex] || 5) + delta)),
    }));
  };

  const getPlantTelemetry = (plantIndex: number) => {
    return telemetry?.plants.find((p) => p.index === plantIndex);
  };

  const getLastWatering = (plantIndex: number): IWateringRecord | undefined => {
    return wateringHistory.find((w) => w.plantIndex === plantIndex);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const switchPlant = (direction: number) => {
    const next = selectedPlantIndex + direction;
    if (next >= 0 && next < plants.length) {
      setSelectedPlantIndex(next);
      sliderRef.current?.scrollToIndex({ index: next, animated: true });
    }
  };

  const onSliderScroll = (e: any) => {
    const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (index !== selectedPlantIndex && index >= 0 && index < plants.length) {
      setSelectedPlantIndex(index);
    }
  };

  const level = waterLevels[currentPlant?.index] || 5;
  const plantTelemetry = getPlantTelemetry(currentPlant?.index);
  const lastWatering = getLastWatering(currentPlant?.index);
  const commandType = currentPlant?.index === 1 ? 'water_plant_1' : 'water_plant_2';
  const isSending = sendingCommand === commandType;

  return (
    <View className="flex-1 bg-background">
      <ScrollView
        ref={scrollRef}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Hero slider */}
        <FlatList
          ref={sliderRef}
          data={plants}
          horizontal
          pagingEnabled
          scrollEnabled
          nestedScrollEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={onSliderScroll}
          keyExtractor={(item) => String(item.index)}
          style={{ flexGrow: 0 }}
          renderItem={({ item: plant }) => {
            const PlantIcon = ICON_MAP[plant.icon] || Flower2;
            const pt = getPlantTelemetry(plant.index);
            const lw = getLastWatering(plant.index);

            return (
              <View style={{ width: SCREEN_WIDTH }}>
                <View className="bg-card rounded-b-[40px] pb-8 px-6" style={{ paddingTop: insets.top }}>
                  {/* Header */}
                  <View className="flex-row items-center justify-between mb-4">
                    <Button size="icon" variant="ghost" onPress={() => router.back()}>
                      <Icon as={ArrowLeft} size={24} className="text-card-foreground" />
                    </Button>
                    <Text className="text-lg font-bold text-card-foreground">
                      {device?.name || 'Устройство'}
                    </Text>
                    <View className="flex-row gap-2">
                      <TouchableOpacity onPress={() => router.push(`/(app)/device/report/${deviceId}`)}>
                        <View className="bg-primary rounded-full p-2">
                          <Icon as={BarChart3} size={18} className="text-primary-foreground" />
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => router.push(`/(app)/device/settings/${deviceId}`)}>
                        <View className="bg-primary rounded-full p-2">
                          <Icon as={Settings} size={18} className="text-primary-foreground" />
                        </View>
                      </TouchableOpacity>
                    </View>
                  </View>

                  {/* Plant icon & name */}
                  <View className="items-center mb-5">
                    <View className="bg-primary/10 rounded-full p-7 mb-3">
                      <Icon as={PlantIcon} size={72} className="text-primary" />
                    </View>
                    <Text className="text-2xl font-bold text-card-foreground">{plant.name}</Text>
                    {loading ? (
                      <Skeleton className="h-4 w-32 mt-2 rounded-full" />
                    ) : lw ? (
                      <View className="flex-row items-center gap-1 mt-1">
                        <Icon as={Clock} size={12} className="text-muted-foreground" />
                        <Text className="text-xs text-muted-foreground">
                          Полив: {formatDate(lw.wateredAt)}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          }}
        />

        {/* Dots */}
        <View className="flex-row justify-center gap-2 py-4">
          {plants.map((_, i) => (
            <TouchableOpacity key={i} onPress={() => switchPlant(i - selectedPlantIndex)}>
              <View
                className={`h-2 rounded-full ${i === selectedPlantIndex ? 'bg-primary w-6' : 'bg-muted w-2'
                  }`}
              />
            </TouchableOpacity>
          ))}
        </View>

        <View className="px-6">
          {/* Navigation arrows + plant name */}
          <View className="flex-row items-center justify-between mb-5">
            <TouchableOpacity
              onPress={() => switchPlant(-1)}
              disabled={selectedPlantIndex === 0}
              style={{ opacity: selectedPlantIndex === 0 ? 0.3 : 1 }}
            >
              <Icon as={ChevronLeft} size={28} className="text-foreground" />
            </TouchableOpacity>
            <Text className="text-xl font-bold text-foreground">{currentPlant.name}</Text>
            <TouchableOpacity
              onPress={() => switchPlant(1)}
              disabled={selectedPlantIndex === plants.length - 1}
              style={{ opacity: selectedPlantIndex === plants.length - 1 ? 0.3 : 1 }}
            >
              <Icon as={ChevronRight} size={28} className="text-foreground" />
            </TouchableOpacity>
          </View>

          {/* Sensor detail cards - larger separate blocks */}
          {loading ? (
            <View className="gap-5 mb-6">
              <SensorCardSkeleton />
              <SensorCardSkeleton />
              <SensorCardSkeleton />
            </View>
          ) : (
            <View className="gap-5 mb-6">
              <SensorCard
                icon={Thermometer}
                title="Температура воздуха"
                value={plantTelemetry?.temperature}
                unit="°C"
                color="bg-orange-500/10"
                iconColor="text-orange-600"
              />
              <SensorCard
                icon={Wind}
                title="Влажность воздуха"
                value={plantTelemetry?.airHumidity}
                unit="%"
                color="bg-sky-500/10"
                iconColor="text-sky-600"
              />
              <SensorCard
                icon={Droplets}
                title="Влажность почвы"
                value={plantTelemetry?.soilMoisture}
                unit="%"
                color="bg-emerald-500/10"
                iconColor="text-emerald-600"
              />
            </View>
          )}

          {/* Water level */}
          <View className="bg-card rounded-3xl p-5 mb-4">
            <Text className="text-base font-semibold text-foreground mb-3">
              Уровень полива: {level}
            </Text>
            <View className="flex-row items-center gap-2 mb-4">
              <TouchableOpacity onPress={() => setLevel(-1)}>
                <View className="bg-secondary rounded-full p-2">
                  <Icon as={Minus} size={16} className="text-secondary-foreground" />
                </View>
              </TouchableOpacity>
              <View className="flex-1 flex-row gap-1">
                {Array.from({ length: 10 }, (_, i) => (
                  <View
                    key={i}
                    className={`flex-1 h-3 rounded-full ${i < level ? 'bg-primary' : 'bg-muted'}`}
                  />
                ))}
              </View>
              <TouchableOpacity onPress={() => setLevel(1)}>
                <View className="bg-secondary rounded-full p-2">
                  <Icon as={Plus} size={16} className="text-secondary-foreground" />
                </View>
              </TouchableOpacity>
            </View>

            <Button
              className="flex-row items-center justify-center gap-2"
              onPress={handleWater}
              disabled={sendingCommand !== null}
            >
              <Icon as={Droplets} size={16} className="text-primary-foreground" />
              <Text className="text-sm font-medium text-primary-foreground">
                {isSending ? 'Полив...' : 'Полить'}
              </Text>
            </Button>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function MiniStat({
  icon,
  value,
  label,
}: {
  icon: React.ComponentType<any>;
  value: string;
  label: string;
}) {
  return (
    <View className="items-center gap-1 flex-1">
      <View className="bg-primary/15 rounded-full p-2.5">
        <Icon as={icon} size={18} className="text-primary" />
      </View>
      <Text className="text-sm font-bold text-card-foreground">{value}</Text>
      <Text className="text-xs text-muted-foreground">{label}</Text>
    </View>
  );
}

function MiniStatSkeleton() {
  return (
    <View className="items-center gap-1 flex-1">
      <Skeleton className="w-10 h-10 rounded-full" />
      <Skeleton className="w-10 h-4 rounded-full" />
      <Skeleton className="w-12 h-3 rounded-full" />
    </View>
  );
}

function SensorCard({
  icon,
  title,
  value,
  unit,
  color,
  iconColor,
}: {
  icon: React.ComponentType<any>;
  title: string;
  value?: number;
  unit: string;
  color: string;
  iconColor: string;
}) {
  return (
    <View className="bg-card rounded-3xl p-6 flex-row items-center gap-4">
      <View className={`${color} rounded-2xl p-5`}>
        <Icon as={icon} size={32} className={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-sm text-muted-foreground mb-1">{title}</Text>
        <Text className="text-4xl font-bold text-foreground">
          {value !== undefined ? `${value.toFixed(1)}${unit}` : '—'}
        </Text>
      </View>
    </View>
  );
}

function SensorCardSkeleton() {
  return (
    <View className="bg-card rounded-3xl p-6 flex-row items-center gap-4">
      <Skeleton className="w-16 h-16 rounded-2xl" />
      <View className="flex-1 gap-2">
        <Skeleton className="w-32 h-4 rounded-full" />
        <Skeleton className="w-20 h-9 rounded-full" />
      </View>
    </View>
  );
}
