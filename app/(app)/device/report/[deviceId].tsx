import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, Dimensions, TouchableOpacity, Platform, Modal } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { ScreenHeader } from '@/components/screen-header';
import { Droplets, Calendar, Thermometer, Wind, ChevronDown } from 'lucide-react-native';
import { LineChart } from 'react-native-chart-kit';
import DateTimePicker from '@react-native-community/datetimepicker';
import { TelemetryApi } from '@/api/devices/telemetry';
import { useDevices } from '@/contexts/devices-context/devices-context';
import { ICON_MAP } from '@/consts/icons';
import type { ITelemetryRecord, IWateringRecord } from '@/api/devices/types/telemetry';

const telemetryApi = new TelemetryApi();
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;

const CHART_CONFIGS = {
  temperature: {
    bg: '#fff7ed',
    color: (o = 1) => `rgba(234, 88, 12, ${o})`,
    label: () => '#c2410c',
  },
  airHumidity: {
    bg: '#f0f9ff',
    color: (o = 1) => `rgba(2, 132, 199, ${o})`,
    label: () => '#0369a1',
  },
  soilMoisture: {
    bg: '#f0fdf4',
    color: (o = 1) => `rgba(22, 163, 74, ${o})`,
    label: () => '#15803d',
  },
};

function getDefaultFrom() {
  const d = new Date();
  d.setDate(d.getDate() - 7);
  return d;
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function formatTime(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
}

function formatDateGroup(dateStr: string) {
  const d = new Date(dateStr);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return 'Сегодня';
  if (d.toDateString() === yesterday.toDateString()) return 'Вчера';
  return d.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long' });
}

// Group watering records by day
function groupByDay(records: IWateringRecord[]) {
  const sorted = [...records].sort(
    (a, b) => new Date(b.wateredAt).getTime() - new Date(a.wateredAt).getTime()
  );
  const groups: { label: string; items: IWateringRecord[] }[] = [];
  let lastLabel = '';

  for (const record of sorted) {
    const label = formatDateGroup(record.wateredAt);
    if (label !== lastLabel) {
      groups.push({ label, items: [record] });
      lastLabel = label;
    } else {
      groups[groups.length - 1].items.push(record);
    }
  }
  return groups;
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
  const [tempFromDate, setTempFromDate] = useState<Date | null>(null);
  const [tempToDate, setTempToDate] = useState<Date | null>(null);

  const plants = device?.plants || [
    { index: 1, name: 'Растение 1', icon: 'Leaf' },
    { index: 2, name: 'Растение 2', icon: 'Flower2' },
  ];

  const loadData = useCallback(async () => {
    setLoading(true);
    const from = dateFrom.toISOString();
    const to = dateTo.toISOString();
    const [telRes, waterRes] = await Promise.all([
      telemetryApi.getTelemetryHistory(deviceId, 200, from, to),
      telemetryApi.getWateringHistory(deviceId),
    ]);
    if (telRes.state && telRes.data) setHistory(telRes.data.reverse());
    if (waterRes.state && waterRes.data) setWateringHistory(waterRes.data);
    setLoading(false);
  }, [deviceId, dateFrom, dateTo]);

  useEffect(() => { loadData(); }, [loadData]);

  // Date picker handlers
  const openFromPicker = () => { setTempFromDate(dateFrom); setShowFromPicker(true); };
  const openToPicker = () => { setTempToDate(dateTo); setShowToPicker(true); };
  const onFromChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') { setShowFromPicker(false); if (selected) setDateFrom(selected); }
    else { if (selected) setTempFromDate(selected); }
  };
  const onToChange = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') { setShowToPicker(false); if (selected) setDateTo(selected); }
    else { if (selected) setTempToDate(selected); }
  };
  const confirmFromDate = () => { if (tempFromDate) setDateFrom(tempFromDate); setShowFromPicker(false); setTempFromDate(null); };
  const confirmToDate = () => { if (tempToDate) setDateTo(tempToDate); setShowToPicker(false); setTempToDate(null); };
  const cancelFromDate = () => { setShowFromPicker(false); setTempFromDate(null); };
  const cancelToDate = () => { setShowToPicker(false); setTempToDate(null); };

  const getChartData = (key: 'temperature' | 'airHumidity' | 'soilMoisture') => {
    const values = history
      .map((r) => {
        const plant = r.plants.find((p) => p.index === selectedPlant);
        return plant ? plant[key] : 0;
      })
      .slice(-20);
    if (values.length === 0) return null;
    return { labels: values.map((_, i) => (i % 5 === 0 ? String(i) : '')), datasets: [{ data: values }] };
  };

  // Latest sensor readings from telemetry
  const latestRecord = history[history.length - 1];
  const latestPlant = latestRecord?.plants.find((p) => p.index === selectedPlant);

  const plantWatering = wateringHistory.filter((w) => w.plantIndex === selectedPlant);
  const wateringGroups = groupByDay(plantWatering);

  const tempData = getChartData('temperature');
  const humidityData = getChartData('airHumidity');
  const soilData = getChartData('soilMoisture');

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Отчёты" subtitle={device?.name} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        <View className="px-6 pt-4">

          {/* Plant tabs */}
          <Animated.View entering={FadeInDown.delay(50).springify()} className="flex-row gap-2 mb-4">
            {plants.map((plant) => {
              const PlantIcon = ICON_MAP[plant.icon] || Droplets;
              const isSelected = selectedPlant === plant.index;
              return (
                <TouchableOpacity
                  key={plant.index}
                  className="flex-1"
                  onPress={() => setSelectedPlant(plant.index)}
                  activeOpacity={0.8}
                >
                  <View className={`rounded-2xl p-3.5 flex-row items-center justify-center gap-2 ${isSelected ? 'bg-primary' : 'bg-card'}`}>
                    <Icon
                      as={PlantIcon}
                      size={16}
                      className={isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}
                    />
                    <Text className={`text-sm font-semibold ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                      {plant.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </Animated.View>

          {/* Summary cards */}
          {loading ? (
            <View className="flex-row gap-3 mb-4">
              <Skeleton className="flex-1 h-24 rounded-3xl" />
              <Skeleton className="flex-1 h-24 rounded-3xl" />
              <Skeleton className="flex-1 h-24 rounded-3xl" />
            </View>
          ) : latestPlant ? (
            <Animated.View entering={FadeInDown.delay(100).springify()} className="flex-row gap-3 mb-4">
              <SummaryCard
                icon={Thermometer}
                label="Темп."
                value={`${latestPlant.temperature.toFixed(0)}°`}
                bg="bg-orange-500/10"
                textColor="text-orange-600"
              />
              <SummaryCard
                icon={Wind}
                label="Влажн."
                value={`${latestPlant.airHumidity.toFixed(0)}%`}
                bg="bg-sky-500/10"
                textColor="text-sky-600"
              />
              <SummaryCard
                icon={Droplets}
                label="Почва"
                value={`${latestPlant.soilMoisture.toFixed(0)}%`}
                bg="bg-emerald-500/10"
                textColor="text-emerald-600"
              />
            </Animated.View>
          ) : null}

          {/* Date range selector */}
          <Animated.View entering={FadeInDown.delay(150).springify()} className="flex-row gap-3 mb-5">
            <TouchableOpacity className="flex-1" onPress={openFromPicker} activeOpacity={0.8}>
              <View className="bg-card rounded-2xl p-3.5 flex-row items-center gap-2">
                <Icon as={Calendar} size={15} className="text-primary" />
                <View className="flex-1">
                  <Text className="text-xs text-muted-foreground">От</Text>
                  <Text className="text-sm font-semibold text-foreground">{formatDateShort(dateFrom)}</Text>
                </View>
                <Icon as={ChevronDown} size={14} className="text-muted-foreground" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1" onPress={openToPicker} activeOpacity={0.8}>
              <View className="bg-card rounded-2xl p-3.5 flex-row items-center gap-2">
                <Icon as={Calendar} size={15} className="text-primary" />
                <View className="flex-1">
                  <Text className="text-xs text-muted-foreground">До</Text>
                  <Text className="text-sm font-semibold text-foreground">{formatDateShort(dateTo)}</Text>
                </View>
                <Icon as={ChevronDown} size={14} className="text-muted-foreground" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Android date pickers */}
          {Platform.OS === 'android' && showFromPicker && (
            <DateTimePicker value={dateFrom} mode="date" display="default" maximumDate={dateTo} onChange={onFromChange} />
          )}
          {Platform.OS === 'android' && showToPicker && (
            <DateTimePicker value={dateTo} mode="date" display="default" minimumDate={dateFrom} maximumDate={new Date()} onChange={onToChange} />
          )}

          {/* Charts */}
          {loading ? (
            <View className="gap-4">
              <ChartSkeleton />
              <ChartSkeleton />
              <ChartSkeleton />
            </View>
          ) : history.length === 0 ? (
            <Animated.View entering={FadeIn} className="bg-card rounded-3xl p-8 items-center mb-5">
              <Text className="text-muted-foreground text-center">
                Нет данных за выбранный период
              </Text>
            </Animated.View>
          ) : (
            <View className="gap-4 mb-5">
              {tempData && (
                <Animated.View entering={FadeInDown.delay(200).springify()}>
                  <ChartCard
                    title="Температура"
                    unit="°C"
                    icon={Thermometer}
                    iconColor="text-orange-600"
                    data={tempData}
                    config={CHART_CONFIGS.temperature}
                  />
                </Animated.View>
              )}
              {humidityData && (
                <Animated.View entering={FadeInDown.delay(280).springify()}>
                  <ChartCard
                    title="Влажность воздуха"
                    unit="%"
                    icon={Wind}
                    iconColor="text-sky-600"
                    data={humidityData}
                    config={CHART_CONFIGS.airHumidity}
                  />
                </Animated.View>
              )}
              {soilData && (
                <Animated.View entering={FadeInDown.delay(360).springify()}>
                  <ChartCard
                    title="Влажность почвы"
                    unit="%"
                    icon={Droplets}
                    iconColor="text-emerald-600"
                    data={soilData}
                    config={CHART_CONFIGS.soilMoisture}
                  />
                </Animated.View>
              )}
            </View>
          )}

          {/* Watering history */}
          <Animated.View entering={FadeInDown.delay(400).springify()}>
            <Text className="text-xl font-bold text-foreground mb-3">История поливов</Text>

            {loading ? (
              <View className="gap-2">
                {[0, 1, 2].map((i) => <Skeleton key={i} className="h-16 rounded-2xl" />)}
              </View>
            ) : wateringGroups.length === 0 ? (
              <View className="bg-card rounded-3xl p-6 items-center">
                <Icon as={Droplets} size={32} className="text-muted-foreground mb-2" />
                <Text className="text-muted-foreground text-center">Поливов пока не было</Text>
              </View>
            ) : (
              <View className="gap-4">
                {wateringGroups.map((group, gi) => (
                  <View key={gi}>
                    <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                      {group.label}
                    </Text>
                    <View className="bg-card rounded-3xl overflow-hidden">
                      {group.items.map((record, ri) => (
                        <View key={ri}>
                          {ri > 0 && <View className="h-px bg-border mx-4" />}
                          <View className="flex-row items-center px-4 py-3.5 gap-3">
                            <View className="bg-primary/10 rounded-2xl p-2.5">
                              <Icon as={Droplets} size={16} className="text-primary" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-semibold text-foreground">
                                Полив • уровень {record.level}
                              </Text>
                              <View className="flex-row gap-0.5 mt-1.5">
                                {Array.from({ length: 10 }, (_, j) => (
                                  <View
                                    key={j}
                                    className={`h-1.5 flex-1 rounded-full ${j < record.level ? 'bg-primary' : 'bg-muted'}`}
                                  />
                                ))}
                              </View>
                            </View>
                            <Text className="text-xs text-muted-foreground font-medium">
                              {formatTime(record.wateredAt)}
                            </Text>
                          </View>
                        </View>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}
          </Animated.View>
        </View>
      </ScrollView>

      {/* iOS date picker modals */}
      {Platform.OS === 'ios' && (
        <>
          <Modal visible={showFromPicker} transparent animationType="slide">
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
              <View className="bg-card rounded-t-3xl pb-10">
                <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
                  <TouchableOpacity onPress={cancelFromDate}>
                    <Text className="text-base text-muted-foreground">Отмена</Text>
                  </TouchableOpacity>
                  <Text className="text-base font-semibold text-foreground">Начало периода</Text>
                  <TouchableOpacity onPress={confirmFromDate}>
                    <Text className="text-base font-semibold text-primary">Готово</Text>
                  </TouchableOpacity>
                </View>
                {tempFromDate && (
                  <DateTimePicker
                    value={tempFromDate}
                    mode="date"
                    display="spinner"
                    maximumDate={dateTo}
                    onChange={onFromChange}
                    style={{ height: 200 }}
                  />
                )}
              </View>
            </View>
          </Modal>
          <Modal visible={showToPicker} transparent animationType="slide">
            <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
              <View className="bg-card rounded-t-3xl pb-10">
                <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
                  <TouchableOpacity onPress={cancelToDate}>
                    <Text className="text-base text-muted-foreground">Отмена</Text>
                  </TouchableOpacity>
                  <Text className="text-base font-semibold text-foreground">Конец периода</Text>
                  <TouchableOpacity onPress={confirmToDate}>
                    <Text className="text-base font-semibold text-primary">Готово</Text>
                  </TouchableOpacity>
                </View>
                {tempToDate && (
                  <DateTimePicker
                    value={tempToDate}
                    mode="date"
                    display="spinner"
                    minimumDate={dateFrom}
                    maximumDate={new Date()}
                    onChange={onToChange}
                    style={{ height: 200 }}
                  />
                )}
              </View>
            </View>
          </Modal>
        </>
      )}
    </View>
  );
}

function SummaryCard({ icon, label, value, bg, textColor }: {
  icon: React.ComponentType<any>;
  label: string;
  value: string;
  bg: string;
  textColor: string;
}) {
  return (
    <View className={`flex-1 ${bg} rounded-3xl p-4 items-center`}>
      <Icon as={icon} size={20} className={textColor} />
      <Text className={`text-2xl font-bold mt-1 ${textColor}`}>{value}</Text>
      <Text className="text-xs text-muted-foreground mt-0.5">{label}</Text>
    </View>
  );
}

function ChartCard({ title, unit, icon, iconColor, data, config }: {
  title: string;
  unit: string;
  icon: React.ComponentType<any>;
  iconColor: string;
  data: any;
  config: any;
}) {
  return (
    <View className="bg-card rounded-3xl p-4 overflow-hidden">
      <View className="flex-row items-center gap-2 mb-3">
        <Icon as={icon} size={18} className={iconColor} />
        <Text className="text-base font-semibold text-foreground">{title}</Text>
        <Text className="text-xs text-muted-foreground">({unit})</Text>
      </View>
      <LineChart
        data={data}
        width={CHART_WIDTH - 32}
        height={160}
        chartConfig={{
          backgroundGradientFrom: config.bg,
          backgroundGradientTo: config.bg,
          color: config.color,
          labelColor: config.label,
          strokeWidth: 2,
          decimalPlaces: 1,
          propsForDots: { r: '3', strokeWidth: '1' },
        }}
        bezier
        style={{ borderRadius: 12, marginLeft: -16 }}
        withInnerLines={false}
        withOuterLines={false}
      />
    </View>
  );
}

function ChartSkeleton() {
  return (
    <View className="bg-card rounded-3xl p-4">
      <Skeleton className="h-5 w-40 rounded-full mb-3" />
      <Skeleton className="h-40 rounded-2xl" />
    </View>
  );
}
