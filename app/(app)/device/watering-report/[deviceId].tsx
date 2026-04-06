import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, Dimensions, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { BarChart, LineChart } from 'react-native-chart-kit';
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
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_WIDTH = SCREEN_WIDTH - 48;
const CHART_CANVAS_COLOR = '#eef6f0';
const CHART_CANVAS_COLOR_ALT = '#f6faf7';
const CHART_LABEL_COLOR = '#4b6353';

type ChartDataset = {
  data: number[];
  color?: (opacity: number) => string;
  strokeWidth?: number;
};

type BasicChartData = {
  labels: string[];
  datasets: ChartDataset[];
};

function getDefaultFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 14);
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
  const sliced = records.slice(-12);

  if (sliced.length === 0) return null;

  const labelStep = sliced.length > 6 ? Math.ceil(sliced.length / 4) : 1;

  return {
    labels: sliced.map((record, index) =>
      index % labelStep === 0 ? formatEventLabel(record.wateredAt) : ''
    ),
    datasets: [{ data: sliced.map((record) => record.level) }],
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

  const averageLevel =
    records.reduce((sum, record) => sum + record.level, 0) / records.length;
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
    const response = await telemetryApi.getWateringHistory(deviceId, 300, from, to);

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
      if (selected) setDateFrom(selected);
      return;
    }

    if (selected) setTempFromDate(selected);
  };

  const onToChange = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') {
      setShowToPicker(false);
      if (selected) setDateTo(selected);
      return;
    }

    if (selected) setTempToDate(selected);
  };

  const confirmFromDate = () => {
    if (tempFromDate) setDateFrom(tempFromDate);
    setShowFromPicker(false);
    setTempFromDate(null);
  };

  const confirmToDate = () => {
    if (tempToDate) setDateTo(tempToDate);
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

  const plantHistoryDesc = history.filter((record) => record.plantIndex === selectedPlant);
  const plantHistoryAsc = [...plantHistoryDesc].reverse();
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
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Отчёты поливов"
        subtitle={
          selectedPlantInfo
            ? `${device?.name || 'Устройство'} • ${selectedPlantInfo.name}`
            : device?.name
        }
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
        <View className="px-6 pt-4">
          <Animated.View entering={FadeInDown.delay(80).springify()} className="flex-row gap-3 mb-5">
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
            <Animated.View entering={FadeIn} className="bg-card rounded-3xl p-8 items-center mb-5">
              <Text className="text-muted-foreground text-center">
                Нет поливов за выбранный период
              </Text>
            </Animated.View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.delay(120).springify()} className="mb-5">
                <View className="flex-row items-center gap-2 mb-3">
                  <Icon as={Droplets} size={18} className="text-primary" />
                  <Text className="text-xl font-bold text-foreground">Сводка по поливам</Text>
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
                  <ChartCard
                    title="Интенсивность поливов"
                    description="Показывает уровень каждого полива во времени."
                    icon={BarChart3}
                    iconColor="text-primary"
                    data={levelChart}
                    yAxisSuffix="/10"
                  />
                </Animated.View>
              ) : null}

              {dailyCountChart ? (
                <Animated.View entering={FadeInDown.delay(200).springify()} className="mb-5">
                  <BarChartCard
                    title="Поливы по дням"
                    description="Сколько раз растение поливалось в каждый день."
                    icon={Calendar}
                    iconColor="text-primary"
                    data={dailyCountChart}
                    yAxisSuffix=""
                  />
                </Animated.View>
              ) : null}

              {dailyAverageLevelChart ? (
                <Animated.View entering={FadeInDown.delay(240).springify()} className="mb-5">
                  <BarChartCard
                    title="Средний уровень по дням"
                    description="Помогает понять, насколько интенсивным был автополив в разные дни."
                    icon={Droplets}
                    iconColor="text-primary"
                    data={dailyAverageLevelChart}
                    yAxisSuffix="/10"
                  />
                </Animated.View>
              ) : null}

              <Animated.View entering={FadeInDown.delay(280).springify()}>
                <View className="flex-row items-center gap-2 mb-3">
                  <Icon as={Clock3} size={18} className="text-primary" />
                  <Text className="text-xl font-bold text-foreground">История</Text>
                </View>
                <View className="gap-4">
                  {Object.entries(historyByDay).map(([day, records]) => (
                    <View key={day} className="bg-card rounded-3xl p-4">
                      <Text className="text-sm font-semibold text-foreground mb-3">
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
                            className="flex-row items-center gap-3 bg-secondary/30 rounded-2xl px-3.5 py-3"
                          >
                            <View className="bg-primary/10 rounded-2xl p-2.5">
                              <Icon as={Droplets} size={16} className="text-primary" />
                            </View>
                            <View className="flex-1">
                              <Text className="text-sm font-semibold text-foreground">
                                Полив в {formatTime(record.wateredAt)}
                              </Text>
                              <Text className="text-xs text-muted-foreground">
                                Уровень {record.level}/10
                              </Text>
                            </View>
                            <View className="bg-primary/10 rounded-full px-2.5 py-1">
                              <Text className="text-xs font-semibold text-primary">{record.level}/10</Text>
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
            }}
          >
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
            }}
          >
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
    <View className="bg-card rounded-3xl p-4 w-[48%]">
      <Text className="text-sm text-muted-foreground">{title}</Text>
      <Text className="text-lg font-bold text-foreground mt-1">{value}</Text>
      <Text className="text-xs text-muted-foreground mt-1">{subtitle}</Text>
    </View>
  );
}

function ChartCard({
  title,
  description,
  icon,
  iconColor,
  data,
  yAxisSuffix,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  data: BasicChartData;
  yAxisSuffix: string;
}) {
  return (
    <View className="bg-card rounded-3xl p-3 overflow-hidden">
      <View className="flex-row items-center gap-2 mb-2">
        <Icon as={icon} size={18} className={iconColor} />
        <Text className="text-base font-semibold text-foreground flex-1">{title}</Text>
      </View>
      <Text className="text-sm text-muted-foreground mb-2.5">{description}</Text>
      <View className="rounded-[20px] overflow-hidden" style={{ backgroundColor: CHART_CANVAS_COLOR }}>
        <LineChart
          data={data}
          width={CHART_WIDTH - 24}
          height={220}
          yAxisSuffix={yAxisSuffix}
          chartConfig={{
            backgroundGradientFrom: CHART_CANVAS_COLOR,
            backgroundGradientTo: CHART_CANVAS_COLOR_ALT,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: () => CHART_LABEL_COLOR,
            strokeWidth: 2,
            decimalPlaces: 1,
            propsForDots: { r: '3', strokeWidth: '1' },
            propsForBackgroundLines: {
              stroke: 'rgba(75, 99, 83, 0.14)',
              strokeDasharray: '',
            },
          }}
          bezier
          withVerticalLines={false}
          withHorizontalLines
          withOuterLines={false}
          fromZero
          style={{ borderRadius: 20, marginLeft: -10 }}
        />
      </View>
      <View className="flex-row items-center justify-between mt-2 px-1">
        <Text className="text-[11px] text-muted-foreground">Ось X: дата / время</Text>
        <Text className="text-[11px] text-muted-foreground">Ось Y: уровень</Text>
      </View>
    </View>
  );
}

function BarChartCard({
  title,
  description,
  icon,
  iconColor,
  data,
  yAxisSuffix,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  iconColor: string;
  data: BasicChartData;
  yAxisSuffix: string;
}) {
  return (
    <View className="bg-card rounded-3xl p-3 overflow-hidden">
      <View className="flex-row items-center gap-2 mb-2">
        <Icon as={icon} size={18} className={iconColor} />
        <Text className="text-base font-semibold text-foreground flex-1">{title}</Text>
      </View>
      <Text className="text-sm text-muted-foreground mb-2.5">{description}</Text>
      <View className="rounded-[20px] overflow-hidden" style={{ backgroundColor: CHART_CANVAS_COLOR }}>
        <BarChart
          data={data}
          width={CHART_WIDTH - 24}
          height={220}
          yAxisLabel=""
          yAxisSuffix={yAxisSuffix}
          fromZero
          withInnerLines
          showBarTops={false}
          chartConfig={{
            backgroundGradientFrom: CHART_CANVAS_COLOR,
            backgroundGradientTo: CHART_CANVAS_COLOR_ALT,
            color: (opacity = 1) => `rgba(37, 99, 235, ${opacity})`,
            labelColor: () => CHART_LABEL_COLOR,
            decimalPlaces: 1,
            barPercentage: 0.55,
            propsForBackgroundLines: {
              stroke: 'rgba(75, 99, 83, 0.14)',
              strokeDasharray: '',
            },
          }}
          style={{ borderRadius: 20, marginLeft: -10 }}
        />
      </View>
      <View className="flex-row items-center justify-between mt-2 px-1">
        <Text className="text-[11px] text-muted-foreground">Ось X: день</Text>
        <Text className="text-[11px] text-muted-foreground">
          Ось Y: {yAxisSuffix ? `уровень ${yAxisSuffix}` : 'количество'}
        </Text>
      </View>
    </View>
  );
}

function SummaryGridSkeleton() {
  return (
    <View className="flex-row flex-wrap gap-3">
      {[0, 1, 2, 3].map((item) => (
        <Skeleton key={item} className="h-24 rounded-3xl w-[48%]" />
      ))}
    </View>
  );
}

function ChartSkeleton() {
  return (
    <View className="bg-card rounded-3xl p-3">
      <Skeleton className="h-5 w-40 rounded-full mb-2.5" />
      <Skeleton className="h-56 rounded-[20px]" />
    </View>
  );
}
