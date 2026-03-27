import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { ScreenHeader } from '@/components/screen-header';
import { Droplets, Calendar } from 'lucide-react-native';
import { LineChart, BarChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TelemetryApi } from '@/api/devices/telemetry';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { ICON_MAP } from '@/consts/icons';
import type { ITelemetryRecord, IWateringRecord } from '@/api/devices/types/telemetry';

const telemetryApi = new TelemetryApi();
const screenWidth = Dimensions.get('window').width - 48;

const chartConfig = {
  backgroundGradientFrom: '#e8f5e9',
  backgroundGradientTo: '#e8f5e9',
  color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
  labelColor: () => '#5f6b5e',
  strokeWidth: 2,
  decimalPlaces: 1,
  propsForDots: { r: '3', strokeWidth: '1', stroke: '#2e7d32' },
};

function getDefaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export default function ReportScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { devices } = useDevices();
  const device = devices.find((d) => d.deviceId === deviceId);

  const [selectedPlant, setSelectedPlant] = useState(1);
  const [history, setHistory] = useState<ITelemetryRecord[]>([]);
  const [wateringHistory, setWateringHistory] = useState<IWateringRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState(getDefaultFrom);
  const [dateTo, setDateTo] = useState(() => new Date());
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);

  const plants = device?.plants || [];

  useEffect(() => {
    if (plants.length > 0 && !plants.find((p) => p.index === selectedPlant)) {
      setSelectedPlant(plants[0].index);
    }
  }, [plants]);

  const loadData = useCallback(async () => {
    setLoading(true);
    const from = dateFrom.toISOString();
    const to = dateTo.toISOString();
    const [telRes, waterRes] = await Promise.all([
      telemetryApi.getTelemetryHistory(deviceId, 200, from, to),
      telemetryApi.getWateringHistory(deviceId),
    ]);
    if (telRes.state && telRes.data) {
      setHistory(telRes.data.reverse());
    }
    if (waterRes.state && waterRes.data) {
      setWateringHistory(waterRes.data);
    }
    setLoading(false);
  }, [deviceId, dateFrom, dateTo]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onFromChange = (_: any, selected?: Date) => {
    setShowFromPicker(Platform.OS === 'ios');
    if (selected) setDateFrom(selected);
  };

  const onToChange = (_: any, selected?: Date) => {
    setShowToPicker(Platform.OS === 'ios');
    if (selected) setDateTo(selected);
  };

  const getChartData = (key: 'temperature' | 'airHumidity' | 'soilMoisture') => {
    const values = history
      .map((r) => {
        const plant = r.plants.find((p) => p.index === selectedPlant);
        return plant ? plant[key] : 0;
      })
      .slice(-20);

    if (values.length === 0) return null;

    const labels = values.map((_, i) => (i % 5 === 0 ? String(i) : ''));

    return { labels, datasets: [{ data: values }] };
  };

  const getWateringChartData = () => {
    const plantWatering = wateringHistory.filter((w) => w.plantIndex === selectedPlant);
    if (plantWatering.length === 0) return null;

    const recent = plantWatering.slice(0, 10).reverse();
    const labels = recent.map((w) => {
      const d = new Date(w.wateredAt);
      return `${d.getDate()}.${d.getMonth() + 1}`;
    });
    const data = recent.map((w) => w.level);

    return { labels, datasets: [{ data }] };
  };

  const tempData = getChartData('temperature');
  const humidityData = getChartData('airHumidity');
  const soilData = getChartData('soilMoisture');
  const wateringChartData = getWateringChartData();

  const plantWatering = wateringHistory.filter((w) => w.plantIndex === selectedPlant);

  const formatDateTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Отчёты" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ flexGrow: 1, paddingBottom: 40 }}>
        <View className="px-6 pb-8">
          {/* Plant switcher */}
          {plants.length > 0 && (
            <View className="flex-row gap-3 mb-4">
              {plants.map((plant) => {
                const PlantIcon = ICON_MAP[plant.icon] || Droplets;
                const isSelected = selectedPlant === plant.index;

                return (
                  <TouchableOpacity
                    key={plant.index}
                    className="flex-1"
                    onPress={() => setSelectedPlant(plant.index)}
                  >
                    <View
                      className={`rounded-2xl p-4 flex-row items-center gap-2 ${
                        isSelected ? 'bg-primary' : 'bg-card'
                      }`}
                    >
                      <Icon
                        as={PlantIcon}
                        size={20}
                        className={isSelected ? 'text-primary-foreground' : 'text-foreground'}
                      />
                      <Text
                        className={`text-sm font-medium ${
                          isSelected ? 'text-primary-foreground' : 'text-foreground'
                        }`}
                      >
                        {plant.name}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}

          {/* Date picker */}
          <View className="flex-row gap-3 mb-6">
            <TouchableOpacity className="flex-1" onPress={() => setShowFromPicker(true)}>
              <View className="bg-card rounded-2xl p-3 flex-row items-center gap-2">
                <Icon as={Calendar} size={16} className="text-muted-foreground" />
                <View>
                  <Text className="text-xs text-muted-foreground">От</Text>
                  <Text className="text-sm font-medium text-foreground">{formatDateShort(dateFrom)}</Text>
                </View>
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1" onPress={() => setShowToPicker(true)}>
              <View className="bg-card rounded-2xl p-3 flex-row items-center gap-2">
                <Icon as={Calendar} size={16} className="text-muted-foreground" />
                <View>
                  <Text className="text-xs text-muted-foreground">До</Text>
                  <Text className="text-sm font-medium text-foreground">{formatDateShort(dateTo)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>

          {showFromPicker && (
            <DateTimePicker
              value={dateFrom}
              mode="date"
              maximumDate={dateTo}
              onChange={onFromChange}
            />
          )}
          {showToPicker && (
            <DateTimePicker
              value={dateTo}
              mode="date"
              minimumDate={dateFrom}
              maximumDate={new Date()}
              onChange={onToChange}
            />
          )}

          {loading ? (
            <View className="gap-5">
              <ChartBlockSkeleton />
              <ChartBlockSkeleton />
              <ChartBlockSkeleton />
            </View>
          ) : history.length === 0 ? (
            <View className="bg-card rounded-2xl p-6 items-center">
              <Text className="text-muted-foreground">Нет данных телеметрии</Text>
            </View>
          ) : (
            <>
              {tempData && (
                <ChartBlock title="Температура (°C)">
                  <LineChart
                    data={tempData}
                    width={screenWidth}
                    height={180}
                    chartConfig={chartConfig}
                    bezier
                    style={{ borderRadius: 16 }}
                  />
                </ChartBlock>
              )}

              {humidityData && (
                <ChartBlock title="Влажность воздуха (%)">
                  <LineChart
                    data={humidityData}
                    width={screenWidth}
                    height={180}
                    chartConfig={{
                      ...chartConfig,
                      color: (opacity = 1) => `rgba(0, 150, 136, ${opacity})`,
                    }}
                    bezier
                    style={{ borderRadius: 16 }}
                  />
                </ChartBlock>
              )}

              {soilData && (
                <ChartBlock title="Влажность почвы (%)">
                  <LineChart
                    data={soilData}
                    width={screenWidth}
                    height={180}
                    chartConfig={{
                      ...chartConfig,
                      color: (opacity = 1) => `rgba(121, 85, 72, ${opacity})`,
                    }}
                    bezier
                    style={{ borderRadius: 16 }}
                  />
                </ChartBlock>
              )}
            </>
          )}

          {/* Watering history chart */}
          <Text className="text-lg font-bold text-foreground mt-4 mb-3">История поливов</Text>
          {loading ? (
            <View className="gap-2">
              <ChartBlockSkeleton />
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-12 rounded-xl" />
              ))}
            </View>
          ) : wateringChartData ? (
            <>
              <View className="mb-4">
                <View className="rounded-2xl overflow-hidden">
                  <BarChart
                    data={wateringChartData}
                    width={screenWidth}
                    height={180}
                    yAxisLabel=""
                    yAxisSuffix=""
                    chartConfig={{
                      backgroundGradientFrom: '#e0f2fe',
                      backgroundGradientTo: '#e0f2fe',
                      color: (opacity = 1) => `rgba(14, 165, 233, ${opacity})`,
                      labelColor: () => '#5f6b5e',
                      decimalPlaces: 0,
                      barPercentage: 0.6,
                    }}
                    style={{ borderRadius: 16 }}
                  />
                </View>
              </View>

              <View className="gap-2">
                {plantWatering.map((record, i) => (
                  <View key={i} className="bg-card rounded-xl p-3 flex-row items-center justify-between">
                    <View className="flex-row items-center gap-2">
                      <Icon as={Droplets} size={14} className="text-primary" />
                      <Text className="text-sm text-foreground">Уровень {record.level}</Text>
                    </View>
                    <View className="flex-row gap-1">
                      {Array.from({ length: 10 }, (_, j) => (
                        <View
                          key={j}
                          className={`w-2 h-2 rounded-full ${j < record.level ? 'bg-primary' : 'bg-muted'}`}
                        />
                      ))}
                    </View>
                    <Text className="text-xs text-muted-foreground">{formatDateTime(record.wateredAt)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <View className="bg-card rounded-2xl p-4 items-center">
              <Text className="text-sm text-muted-foreground">Нет записей</Text>
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

function ChartBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-5">
      <Text className="text-base font-semibold text-foreground mb-2">{title}</Text>
      <View className="rounded-2xl overflow-hidden">{children}</View>
    </View>
  );
}

function ChartBlockSkeleton() {
  return (
    <View className="mb-5">
      <Skeleton className="h-5 w-40 rounded-full mb-2" />
      <Skeleton className="h-[180px] rounded-2xl" />
    </View>
  );
}
