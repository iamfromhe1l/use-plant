import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Clock3,
  Droplets,
  type LucideIcon,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/screen-header';
import { InteractiveChart } from '@/components/interactive-chart';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { TelemetryApi } from '@/api/devices/telemetry';
import { useDevices } from '@/contexts/devices-context/devices-context';
import type { IWateringRecord } from '@/api/devices/types/telemetry';

const telemetryApi = new TelemetryApi();

type ChartDataset = {
  data: number[];
  color?: string;
  strokeWidth?: number;
};

type BasicChartData = {
  labels: string[];
  datasets: ChartDataset[];
};

type RangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

function getDefaultFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 6);
  return date;
}

function toStartOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

function toEndOfDay(date: Date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

function shiftDays(base: Date, days: number) {
  const value = new Date(base);
  value.setDate(value.getDate() + days);
  return value;
}

function formatDateShort(date: Date) {
  return date.toLocaleDateString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString('ru-RU', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDayLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function formatEventLabel(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  return sameDay
    ? date.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })
    : date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function buildLevelChart(records: IWateringRecord[]): BasicChartData | null {
  if (records.length === 0) return null;

  const labelStep = records.length > 8 ? Math.ceil(records.length / 6) : 1;

  return {
    labels: records.map((record, index) =>
      index % labelStep === 0 ? formatEventLabel(record.wateredAt) : ''
    ),
    datasets: [{ data: records.map((record) => record.level) }],
  };
}

function buildDailyCountChart(records: IWateringRecord[]): BasicChartData | null {
  const grouped = new Map<string, { count: number; label: string }>();

  records.forEach((record) => {
    const dayKey = record.wateredAt.slice(0, 10);
    const existing = grouped.get(dayKey);

    if (existing) {
      existing.count += 1;
      return;
    }

    grouped.set(dayKey, { count: 1, label: formatDayLabel(record.wateredAt) });
  });

  const dailyPoints = Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);

  if (dailyPoints.length === 0) return null;

  return {
    labels: dailyPoints.map((point) => point.label),
    datasets: [{ data: dailyPoints.map((point) => point.count) }],
  };
}

function buildDailyAverageLevelChart(records: IWateringRecord[]): BasicChartData | null {
  const grouped = new Map<string, { sum: number; count: number; label: string }>();

  records.forEach((record) => {
    const dayKey = record.wateredAt.slice(0, 10);
    const existing = grouped.get(dayKey);

    if (existing) {
      existing.sum += record.level;
      existing.count += 1;
      return;
    }

    grouped.set(dayKey, { sum: record.level, count: 1, label: formatDayLabel(record.wateredAt) });
  });

  const dailyPoints = Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => ({
      label: value.label,
      level: Number((value.sum / value.count).toFixed(1)),
    }));

  if (dailyPoints.length === 0) return null;

  return {
    labels: dailyPoints.map((point) => point.label),
    datasets: [{ data: dailyPoints.map((point) => point.level) }],
  };
}

function getWateringStats(records: IWateringRecord[]) {
  if (records.length === 0) {
    return {
      averageLevel: null,
      maxLevel: null,
      averageIntervalHours: null,
      lastWateredAt: null,
      dayCount: 0,
    };
  }

  const averageLevel = records.reduce((sum, record) => sum + record.level, 0) / records.length;
  const maxLevel = Math.max(...records.map((record) => record.level));
  const lastWateredAt = records[records.length - 1]?.wateredAt ?? null;
  const dayCount = new Set(records.map((record) => record.wateredAt.slice(0, 10))).size;

  let averageIntervalHours: number | null = null;
  if (records.length > 1) {
    let totalHours = 0;

    for (let index = 1; index < records.length; index += 1) {
      const previous = new Date(records[index - 1].wateredAt).getTime();
      const current = new Date(records[index].wateredAt).getTime();
      totalHours += (current - previous) / (1000 * 60 * 60);
    }

    averageIntervalHours = totalHours / (records.length - 1);
  }

  return {
    averageLevel,
    maxLevel,
    averageIntervalHours,
    lastWateredAt,
    dayCount,
  };
}

export default function WateringReportScreen() {
  const { deviceId, plantIndex: plantIndexParam } = useLocalSearchParams<{
    deviceId: string;
    plantIndex?: string;
  }>();
  const { devices } = useDevices();
  const device = devices.find((item) => item.deviceId === deviceId);
  const [history, setHistory] = useState<IWateringRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const [dateFrom, setDateFrom] = useState(getDefaultFrom);
  const [dateTo, setDateTo] = useState(() => new Date());
  const [activeRangePreset, setActiveRangePreset] = useState<RangePreset>('week');
  const [showFromPicker, setShowFromPicker] = useState(false);
  const [showToPicker, setShowToPicker] = useState(false);
  const [tempFromDate, setTempFromDate] = useState<Date | null>(null);
  const [tempToDate, setTempToDate] = useState<Date | null>(null);

  const plants = device?.plants || [
    { index: 1, name: 'Растение 1', icon: 'Leaf' },
    { index: 2, name: 'Растение 2', icon: 'Flower2' },
  ];
  const selectedPlant = Number(plantIndexParam || plants[0]?.index || 1);
  const selectedPlantInfo =
    plants.find((plant) => plant.index === selectedPlant) || plants[0] || null;

  const loadData = useCallback(async () => {
    setLoading(true);
    const from = toStartOfDay(dateFrom).toISOString();
    const to = toEndOfDay(dateTo).toISOString();
    const response = await telemetryApi.getWateringHistory(deviceId, 5000, from, to);

    if (response.state && response.data) {
      setHistory(response.data);
    } else {
      setHistory([]);
    }

    setLoading(false);
  }, [deviceId, dateFrom, dateTo]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const openFromPicker = () => {
    setTempFromDate(dateFrom);
    setShowFromPicker(true);
  };

  const openToPicker = () => {
    setTempToDate(dateTo);
    setShowToPicker(true);
  };

  const onFromChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowFromPicker(false);
      if (selected) {
        setDateFrom(selected);
        setActiveRangePreset('custom');
      }
      return;
    }

    if (selected) setTempFromDate(selected);
  };

  const onToChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowToPicker(false);
      if (selected) {
        setDateTo(selected);
        setActiveRangePreset('custom');
      }
      return;
    }

    if (selected) setTempToDate(selected);
  };

  const confirmFromDate = () => {
    if (tempFromDate) {
      setDateFrom(tempFromDate);
      setActiveRangePreset('custom');
    }
    setShowFromPicker(false);
    setTempFromDate(null);
  };

  const confirmToDate = () => {
    if (tempToDate) {
      setDateTo(tempToDate);
      setActiveRangePreset('custom');
    }
    setShowToPicker(false);
    setTempToDate(null);
  };

  const cancelFromDate = () => {
    setShowFromPicker(false);
    setTempFromDate(null);
  };

  const cancelToDate = () => {
    setShowToPicker(false);
    setTempToDate(null);
  };

  const applyRangePreset = (preset: RangePreset) => {
    const today = new Date();

    if (preset === 'today') {
      setDateFrom(today);
      setDateTo(today);
    } else if (preset === 'yesterday') {
      const yesterday = shiftDays(today, -1);
      setDateFrom(yesterday);
      setDateTo(yesterday);
    } else if (preset === 'week') {
      setDateFrom(shiftDays(today, -6));
      setDateTo(today);
    } else if (preset === 'month') {
      setDateFrom(shiftDays(today, -29));
      setDateTo(today);
    }

    setActiveRangePreset(preset);
  };

  const plantHistoryDesc = history.filter((record) => record.plantIndex === selectedPlant);
  const plantHistoryAsc = plantHistoryDesc;
  const wateringStats = getWateringStats(plantHistoryAsc);
  const levelChart = buildLevelChart(plantHistoryAsc);
  const dailyCountChart = buildDailyCountChart(plantHistoryAsc);
  const dailyAverageLevelChart = buildDailyAverageLevelChart(plantHistoryAsc);

  const historyByDay = plantHistoryDesc.reduce<Record<string, IWateringRecord[]>>((acc, record) => {
    const key = record.wateredAt.slice(0, 10);
    if (!acc[key]) acc[key] = [];
    acc[key].push(record);
    return acc;
  }, {});

  return (
    <View className="bg-background flex-1">
      <ScreenHeader
        title="Отчёты поливов"
        subtitle={
          selectedPlantInfo
            ? `${device?.name || 'Устройство'} • ${selectedPlantInfo.name}`
            : device?.name
        }
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-4">
          <Animated.View
            entering={FadeInDown.delay(80).springify()}
            className="mb-5 flex-row gap-3">
            <TouchableOpacity className="flex-1" onPress={openFromPicker} activeOpacity={0.8}>
              <View className="bg-card flex-row items-center gap-2 rounded-2xl p-3.5">
                <Icon as={Calendar} size={15} className="text-primary" />
                <View className="flex-1">
                  <Text className="text-muted-foreground text-xs">От</Text>
                  <Text className="text-foreground text-sm font-semibold">
                    {formatDateShort(dateFrom)}
                  </Text>
                </View>
                <Icon as={ChevronDown} size={14} className="text-muted-foreground" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1" onPress={openToPicker} activeOpacity={0.8}>
              <View className="bg-card flex-row items-center gap-2 rounded-2xl p-3.5">
                <Icon as={Calendar} size={15} className="text-primary" />
                <View className="flex-1">
                  <Text className="text-muted-foreground text-xs">До</Text>
                  <Text className="text-foreground text-sm font-semibold">
                    {formatDateShort(dateTo)}
                  </Text>
                </View>
                <Icon as={ChevronDown} size={14} className="text-muted-foreground" />
              </View>
            </TouchableOpacity>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.delay(100).springify()}
            className="mb-5 flex-row flex-wrap gap-2">
            {[
              { key: 'today' as const, label: 'Сегодня' },
              { key: 'yesterday' as const, label: 'Вчера' },
              { key: 'week' as const, label: 'Неделя' },
              { key: 'month' as const, label: 'Месяц' },
            ].map((preset) => (
              <TouchableOpacity
                key={preset.key}
                activeOpacity={0.85}
                onPress={() => applyRangePreset(preset.key)}>
                <View
                  className={`rounded-full px-4 py-2 ${
                    activeRangePreset === preset.key ? 'bg-primary' : 'bg-card'
                  }`}>
                  <Text
                    className={`text-sm font-semibold ${
                      activeRangePreset === preset.key
                        ? 'text-primary-foreground'
                        : 'text-foreground'
                    }`}>
                    {preset.label}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </Animated.View>

          {Platform.OS === 'android' && showFromPicker ? (
            <DateTimePicker
              value={dateFrom}
              mode="date"
              display="default"
              maximumDate={dateTo}
              onChange={onFromChange}
            />
          ) : null}
          {Platform.OS === 'android' && showToPicker ? (
            <DateTimePicker
              value={dateTo}
              mode="date"
              display="default"
              minimumDate={dateFrom}
              maximumDate={new Date()}
              onChange={onToChange}
            />
          ) : null}

          {loading ? (
            <View className="gap-4">
              <SummaryGridSkeleton />
              <ChartSkeleton />
              <ChartSkeleton />
            </View>
          ) : plantHistoryAsc.length === 0 ? (
            <Animated.View entering={FadeIn} className="bg-card mb-5 items-center rounded-3xl p-8">
              <Text className="text-muted-foreground text-center">
                Нет поливов за выбранный период
              </Text>
            </Animated.View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.delay(120).springify()} className="mb-5">
                <View className="mb-3 flex-row items-center gap-2">
                  <Icon as={Droplets} size={18} className="text-primary" />
                  <Text className="text-foreground text-xl font-bold">Сводка по поливам</Text>
                </View>
                <View className="flex-row flex-wrap gap-3">
                  <SummaryMiniCard
                    title="Поливов"
                    value={String(plantHistoryAsc.length)}
                    subtitle="За период"
                  />
                  <SummaryMiniCard
                    title="Средний уровень"
                    value={`${wateringStats.averageLevel?.toFixed(1) ?? '—'}/10`}
                    subtitle={`Пик ${wateringStats.maxLevel ?? '—'}/10`}
                  />
                  <SummaryMiniCard
                    title="Средний интервал"
                    value={
                      wateringStats.averageIntervalHours !== null
                        ? `${wateringStats.averageIntervalHours.toFixed(1)} ч`
                        : '—'
                    }
                    subtitle="Между поливами"
                  />
                  <SummaryMiniCard
                    title="Последний полив"
                    value={
                      wateringStats.lastWateredAt
                        ? formatDateTime(wateringStats.lastWateredAt)
                        : '—'
                    }
                    subtitle={`${wateringStats.dayCount} дней с поливом`}
                  />
                </View>
              </Animated.View>

              {levelChart ? (
                <Animated.View entering={FadeInDown.delay(160).springify()} className="mb-5">
                  <InteractiveChart
                    title="Интенсивность поливов"
                    description="Показывает уровень каждого полива во времени."
                    unit="/10"
                    icon={BarChart3}
                    iconColor="text-primary"
                    data={levelChart}
                    xAxisLabel="Ось X: дата / время"
                    yAxisLabel="Ось Y: уровень"
                  />
                </Animated.View>
              ) : null}

              {dailyCountChart ? (
                <Animated.View entering={FadeInDown.delay(200).springify()} className="mb-5">
                  <InteractiveChart
                    title="Поливы по дням"
                    description="Сколько раз растение поливалось в каждый день."
                    unit=""
                    icon={Calendar}
                    iconColor="text-primary"
                    data={dailyCountChart}
                    variant="bar"
                    fromZero
                    xAxisLabel="Ось X: день"
                    yAxisLabel="Ось Y: количество"
                  />
                </Animated.View>
              ) : null}

              {dailyAverageLevelChart ? (
                <Animated.View entering={FadeInDown.delay(240).springify()} className="mb-5">
                  <InteractiveChart
                    title="Средний уровень по дням"
                    description="Помогает понять, насколько интенсивным был автополив в разные дни."
                    unit="/10"
                    icon={Droplets}
                    iconColor="text-primary"
                    data={dailyAverageLevelChart}
                    variant="bar"
                    fromZero
                    xAxisLabel="Ось X: день"
                    yAxisLabel="Ось Y: уровень"
                  />
                </Animated.View>
              ) : null}

              <Animated.View entering={FadeInDown.delay(280).springify()}>
                <View className="mb-3 flex-row items-center gap-2">
                  <Icon as={Clock3} size={18} className="text-primary" />
                  <Text className="text-foreground text-xl font-bold">История</Text>
                </View>
                <View className="gap-4">
                  {Object.entries(historyByDay).map(([day, records]) => (
                    <View key={day} className="bg-card rounded-3xl p-4">
                      <Text className="text-foreground mb-3 text-sm font-semibold">
                        {new Date(day).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </Text>
                      <View className="gap-2.5">
                        {records.map((record, index) => (
                          <View
                            key={`${record.wateredAt}-${index}`}
                            className="bg-secondary/30 flex-row items-center gap-3 rounded-2xl px-3.5 py-3">
                            <View className="bg-primary/10 rounded-2xl p-2.5">
                              <Icon as={Droplets} size={16} className="text-primary" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-foreground text-sm font-semibold">
                                Полив в {formatTime(record.wateredAt)}
                              </Text>
                              <Text className="text-muted-foreground text-xs">
                                Уровень {record.level}/10 •{' '}
                                {record.source === 'manual'
                                  ? 'ручной'
                                  : record.source === 'condition_schedule'
                                    ? 'по расписанию'
                                    : 'по условию'}
                              </Text>
                            </View>
                            <View className="bg-primary/10 rounded-full px-2.5 py-1">
                              <Text className="text-primary text-xs font-semibold">
                                {record.level}/10
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    </View>
                  ))}
                </View>
              </Animated.View>
            </>
          )}
        </View>
      </ScrollView>

      {Platform.OS === 'ios' ? (
        <>
          <Dialog
            open={showFromPicker}
            onOpenChange={(open) => {
              if (!open) cancelFromDate();
            }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Начало периода</DialogTitle>
              </DialogHeader>
              {tempFromDate ? (
                <DateTimePicker
                  value={tempFromDate}
                  mode="date"
                  display="spinner"
                  maximumDate={dateTo}
                  onChange={onFromChange}
                  style={{ height: 200 }}
                />
              ) : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary" onPress={cancelFromDate}>
                    <Text>Отмена</Text>
                  </Button>
                </DialogClose>
                <Button onPress={confirmFromDate}>
                  <Text className="text-primary-foreground">Готово</Text>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog
            open={showToPicker}
            onOpenChange={(open) => {
              if (!open) cancelToDate();
            }}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Конец периода</DialogTitle>
              </DialogHeader>
              {tempToDate ? (
                <DateTimePicker
                  value={tempToDate}
                  mode="date"
                  display="spinner"
                  minimumDate={dateFrom}
                  maximumDate={new Date()}
                  onChange={onToChange}
                  style={{ height: 200 }}
                />
              ) : null}
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="secondary" onPress={cancelToDate}>
                    <Text>Отмена</Text>
                  </Button>
                </DialogClose>
                <Button onPress={confirmToDate}>
                  <Text className="text-primary-foreground">Готово</Text>
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </>
      ) : null}
    </View>
  );
}

function SummaryMiniCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <View className="bg-card w-[48%] rounded-3xl p-4">
      <Text className="text-muted-foreground text-sm">{title}</Text>
      <Text className="text-foreground mt-1 text-lg font-bold">{value}</Text>
      <Text className="text-muted-foreground mt-1 text-xs">{subtitle}</Text>
    </View>
  );
}

function SummaryGridSkeleton() {
  return (
    <View className="flex-row flex-wrap gap-3">
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-24 w-[48%] rounded-3xl" />
      ))}
    </View>
  );
}

function ChartSkeleton() {
  return (
    <View className="bg-card rounded-3xl p-3">
      <Skeleton className="mb-2.5 h-5 w-40 rounded-full" />
      <Skeleton className="h-56 rounded-[20px]" />
    </View>
  );
}
