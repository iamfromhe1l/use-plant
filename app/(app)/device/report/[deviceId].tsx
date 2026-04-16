import React, { useEffect, useState, useCallback } from 'react';
import { View, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  BarChart3,
  Calendar,
  ChevronDown,
  Droplets,
  Thermometer,
  Wind,
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
import type { ITelemetryRecord } from '@/api/devices/types/telemetry';

const telemetryApi = new TelemetryApi();

type MetricKey = 'temperature' | 'airHumidity' | 'soilMoisture';

type MetricPoint = {
  date: string;
  label: string;
  value: number;
};

type ChartDataset = {
  data: number[];
  color?: string;
  strokeWidth?: number;
  withDots?: boolean;
  label?: string;
  unit?: string;
};

type BasicChartData = {
  labels: string[];
  tooltipTitles?: string[];
  tooltipSubtitles?: string[];
  datasets: ChartDataset[];
  legend?: string[];
};

type RangePreset = 'today' | 'yesterday' | 'week' | 'month' | 'custom';

const CHART_CONFIGS = {
  temperature: {
    title: 'Температура',
    icon: Thermometer,
    unit: '°C',
    iconColor: 'text-orange-600',
    color: '#ea580c',
  },
  airHumidity: {
    title: 'Влажность воздуха',
    icon: Wind,
    unit: '%',
    iconColor: 'text-sky-600',
    color: '#0284c7',
  },
  soilMoisture: {
    title: 'Влажность почвы',
    icon: Droplets,
    unit: '%',
    iconColor: 'text-emerald-600',
    color: '#16a34a',
  },
} satisfies Record<
  MetricKey,
  {
    title: string;
    icon: LucideIcon;
    unit: string;
    iconColor: string;
    color: string;
  }
>;

function getDefaultFrom() {
  const date = new Date();
  date.setDate(date.getDate() - 7);
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
    year: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatChartLabel(dateStr: string) {
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

function formatDayLabel(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
}

function formatSignedValue(value: number, digits: number) {
  const prefix = value > 0 ? '+' : value < 0 ? '-' : '';
  return `${prefix}${Math.abs(value).toFixed(digits)}`;
}

function formatTrendLabel(value: number | null, unit: string, digits: number) {
  if (value === null) return 'Тренд —';
  return `Тренд ${formatSignedValue(value, digits)}${unit}`;
}

function getMetricPoints(history: ITelemetryRecord[], plantIndex: number, key: MetricKey) {
  return history
    .map((record) => {
      const plant = record.plants.find((item) => item.index === plantIndex);
      if (!plant) return null;

      return {
        date: record.receivedAt,
        label: formatChartLabel(record.receivedAt),
        value: plant[key],
      };
    })
    .filter((point): point is MetricPoint => point !== null);
}

function buildChartData(
  points: MetricPoint[],
  metric: { color: string; title: string; unit: string }
): BasicChartData | null {
  if (points.length === 0) return null;

  const labelStep = points.length > 8 ? Math.ceil(points.length / 6) : 1;

  return {
    labels: points.map((point, index) => (index % labelStep === 0 ? point.label : '')),
    tooltipTitles: points.map((point) => formatDateTime(point.date)),
    datasets: [
      {
        data: points.map((point) => point.value),
        color: metric.color,
        label: metric.title,
        unit: metric.unit,
      },
    ],
  };
}

function buildDailyAverageData(
  points: MetricPoint[],
  metric: { color: string; title: string; unit: string }
): BasicChartData | null {
  const grouped = new Map<string, { sum: number; count: number; label: string }>();

  points.forEach((point) => {
    const dayKey = point.date.slice(0, 10);
    const existing = grouped.get(dayKey);

    if (existing) {
      existing.sum += point.value;
      existing.count += 1;
      return;
    }

    grouped.set(dayKey, {
      sum: point.value,
      count: 1,
      label: formatDayLabel(point.date),
    });
  });

  const dailyPoints = Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => ({
      label: value.label,
      value: Number((value.sum / value.count).toFixed(1)),
    }));

  if (dailyPoints.length === 0) return null;

  return {
    labels: dailyPoints.map((point) => point.label),
    tooltipTitles: dailyPoints.map((point) => point.label),
    datasets: [
      {
        data: dailyPoints.map((point) => point.value),
        color: metric.color,
        label: metric.title,
        unit: metric.unit,
      },
    ],
  };
}

function buildDailyRangeData(
  points: MetricPoint[],
  metric: { color: string; unit: string }
): BasicChartData | null {
  const grouped = new Map<string, { min: number; max: number; label: string }>();

  points.forEach((point) => {
    const dayKey = point.date.slice(0, 10);
    const existing = grouped.get(dayKey);

    if (existing) {
      existing.min = Math.min(existing.min, point.value);
      existing.max = Math.max(existing.max, point.value);
      return;
    }

    grouped.set(dayKey, {
      min: point.value,
      max: point.value,
      label: formatDayLabel(point.date),
    });
  });

  const dailyPoints = Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => value);

  if (dailyPoints.length === 0) return null;

  return {
    labels: dailyPoints.map((point) => point.label),
    tooltipTitles: dailyPoints.map((point) => point.label),
    datasets: [
      {
        data: dailyPoints.map((point) => Number(point.min.toFixed(1))),
        color: `${metric.color}80`,
        strokeWidth: 2,
        label: 'Минимум',
        unit: metric.unit,
      },
      {
        data: dailyPoints.map((point) => Number(point.max.toFixed(1))),
        color: metric.color,
        strokeWidth: 2,
        label: 'Максимум',
        unit: metric.unit,
      },
    ],
    legend: ['Минимум', 'Максимум'],
  };
}

function buildDailySpreadData(
  points: MetricPoint[],
  metric: { color: string; title: string; unit: string }
): BasicChartData | null {
  const grouped = new Map<string, { min: number; max: number; label: string }>();

  points.forEach((point) => {
    const dayKey = point.date.slice(0, 10);
    const existing = grouped.get(dayKey);

    if (existing) {
      existing.min = Math.min(existing.min, point.value);
      existing.max = Math.max(existing.max, point.value);
      return;
    }

    grouped.set(dayKey, {
      min: point.value,
      max: point.value,
      label: formatDayLabel(point.date),
    });
  });

  const dailyPoints = Array.from(grouped.entries())
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([, value]) => ({
      label: value.label,
      value: Number((value.max - value.min).toFixed(1)),
    }));

  if (dailyPoints.length === 0) return null;

  return {
    labels: dailyPoints.map((point) => point.label),
    tooltipTitles: dailyPoints.map((point) => point.label),
    datasets: [
      {
        data: dailyPoints.map((point) => point.value),
        color: metric.color,
        label: metric.title,
        unit: metric.unit,
      },
    ],
  };
}

function buildCombinedChartData(
  history: ITelemetryRecord[],
  plantIndex: number
): BasicChartData | null {
  const points = history
    .map((record) => {
      const plant = record.plants.find((item) => item.index === plantIndex);
      if (!plant) return null;

      return {
        date: record.receivedAt,
        label: formatChartLabel(record.receivedAt),
        temperature: plant.temperature,
        airHumidity: plant.airHumidity,
        soilMoisture: plant.soilMoisture,
      };
    })
    .filter(
      (
        point
      ): point is {
        date: string;
        label: string;
        temperature: number;
        airHumidity: number;
        soilMoisture: number;
      } => point !== null
    );

  if (points.length === 0) return null;

  const labelStep = points.length > 8 ? Math.ceil(points.length / 6) : 1;

  return {
    labels: points.map((point, index) => (index % labelStep === 0 ? point.label : '')),
    tooltipTitles: points.map((point) => formatDateTime(point.date)),
    datasets: [
      {
        data: points.map((point) => point.temperature),
        color: CHART_CONFIGS.temperature.color,
        label: CHART_CONFIGS.temperature.title,
        unit: CHART_CONFIGS.temperature.unit,
      },
      {
        data: points.map((point) => point.airHumidity),
        color: CHART_CONFIGS.airHumidity.color,
        label: CHART_CONFIGS.airHumidity.title,
        unit: CHART_CONFIGS.airHumidity.unit,
      },
      {
        data: points.map((point) => point.soilMoisture),
        color: CHART_CONFIGS.soilMoisture.color,
        label: CHART_CONFIGS.soilMoisture.title,
        unit: CHART_CONFIGS.soilMoisture.unit,
      },
    ],
    legend: [
      CHART_CONFIGS.temperature.title,
      CHART_CONFIGS.airHumidity.title,
      CHART_CONFIGS.soilMoisture.title,
    ],
  };
}

function getMetricStats(points: MetricPoint[]) {
  if (points.length === 0) return null;

  const values = points.map((point) => point.value);
  const average = values.reduce((sum, value) => sum + value, 0) / values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);

  return {
    average,
    min,
    max,
  };
}

function getMetricTrend(points: MetricPoint[]) {
  if (points.length < 2) return null;
  return Number((points[points.length - 1].value - points[0].value).toFixed(1));
}

export default function ReportScreen() {
  const { deviceId, plantIndex: plantIndexParam } = useLocalSearchParams<{
    deviceId: string;
    plantIndex?: string;
  }>();
  const { devices } = useDevices();
  const device = devices.find((item) => item.deviceId === deviceId);
  const [history, setHistory] = useState<ITelemetryRecord[]>([]);
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
    const response = await telemetryApi.getTelemetryHistory(deviceId, 5000, from, to);

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

  const temperaturePoints = getMetricPoints(history, selectedPlant, 'temperature');
  const airHumidityPoints = getMetricPoints(history, selectedPlant, 'airHumidity');
  const soilMoisturePoints = getMetricPoints(history, selectedPlant, 'soilMoisture');

  const rawCharts = {
    temperature: buildChartData(temperaturePoints, CHART_CONFIGS.temperature),
    airHumidity: buildChartData(airHumidityPoints, CHART_CONFIGS.airHumidity),
    soilMoisture: buildChartData(soilMoisturePoints, CHART_CONFIGS.soilMoisture),
  };
  const combinedChart = buildCombinedChartData(history, selectedPlant);

  const dailyAverageCharts = {
    temperature: buildDailyAverageData(temperaturePoints, CHART_CONFIGS.temperature),
    airHumidity: buildDailyAverageData(airHumidityPoints, CHART_CONFIGS.airHumidity),
    soilMoisture: buildDailyAverageData(soilMoisturePoints, CHART_CONFIGS.soilMoisture),
  };

  const dailyRangeCharts = {
    temperature: buildDailyRangeData(temperaturePoints, CHART_CONFIGS.temperature),
    airHumidity: buildDailyRangeData(airHumidityPoints, CHART_CONFIGS.airHumidity),
    soilMoisture: buildDailyRangeData(soilMoisturePoints, CHART_CONFIGS.soilMoisture),
  };

  const dailySpreadCharts = {
    temperature: buildDailySpreadData(temperaturePoints, CHART_CONFIGS.temperature),
    airHumidity: buildDailySpreadData(airHumidityPoints, CHART_CONFIGS.airHumidity),
    soilMoisture: buildDailySpreadData(soilMoisturePoints, CHART_CONFIGS.soilMoisture),
  };

  const metricStats = {
    temperature: getMetricStats(temperaturePoints),
    airHumidity: getMetricStats(airHumidityPoints),
    soilMoisture: getMetricStats(soilMoisturePoints),
  };

  const metricTrends = {
    temperature: getMetricTrend(temperaturePoints),
    airHumidity: getMetricTrend(airHumidityPoints),
    soilMoisture: getMetricTrend(soilMoisturePoints),
  };

  const selectedPlantMeasureCount = temperaturePoints.length;
  const dayCount = new Set(temperaturePoints.map((item) => item.date.slice(0, 10))).size;
  const lastRecordedAt = temperaturePoints[temperaturePoints.length - 1]?.date;

  return (
    <View className="bg-background flex-1">
      <ScreenHeader
        title="Графики"
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
              <HighlightsSkeleton />
              <SummarySkeleton />
              <ChartSkeleton />
              <ChartSkeleton />
              <ChartSkeleton />
            </View>
          ) : history.length === 0 ? (
            <Animated.View entering={FadeIn} className="bg-card mb-5 items-center rounded-3xl p-8">
              <Text className="text-muted-foreground text-center">
                Нет данных за выбранный период
              </Text>
            </Animated.View>
          ) : (
            <>
              <Animated.View entering={FadeInDown.delay(120).springify()} className="mb-5">
                <View className="mb-3 flex-row items-center gap-2">
                  <Icon as={Calendar} size={18} className="text-primary" />
                  <Text className="text-foreground text-xl font-bold">Период наблюдения</Text>
                </View>
                <View className="gap-3">
                  <CompactInfoCard
                    title="Замеров"
                    value={String(selectedPlantMeasureCount)}
                    subtitle="Точек на графиках"
                  />
                  <CompactInfoCard
                    title="Дней"
                    value={String(dayCount)}
                    subtitle="Дней с показаниями"
                  />
                  <CompactInfoCard
                    title="Последний замер"
                    value={lastRecordedAt ? formatDateTime(lastRecordedAt) : '—'}
                    subtitle="Конец доступных данных"
                  />
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(150).springify()} className="mb-5">
                <View className="mb-3 flex-row items-center gap-2">
                  <Icon as={BarChart3} size={18} className="text-primary" />
                  <Text className="text-foreground text-xl font-bold">Сводка за период</Text>
                </View>
                <View className="gap-3">
                  <SummaryCard
                    title="Температура"
                    value={`${metricStats.temperature?.average.toFixed(1) ?? '—'}°C`}
                    subtitle={
                      metricStats.temperature
                        ? `Мин ${metricStats.temperature.min.toFixed(1)}° • Макс ${metricStats.temperature.max.toFixed(1)}° • ${formatTrendLabel(metricTrends.temperature, '°', 1)}`
                        : 'Нет данных'
                    }
                    icon={Thermometer}
                    iconColor="text-orange-600"
                  />
                  <SummaryCard
                    title="Влажность воздуха"
                    value={`${metricStats.airHumidity?.average.toFixed(0) ?? '—'}%`}
                    subtitle={
                      metricStats.airHumidity
                        ? `Мин ${metricStats.airHumidity.min.toFixed(0)}% • Макс ${metricStats.airHumidity.max.toFixed(0)}% • ${formatTrendLabel(metricTrends.airHumidity, '%', 0)}`
                        : 'Нет данных'
                    }
                    icon={Wind}
                    iconColor="text-sky-600"
                  />
                  <SummaryCard
                    title="Влажность почвы"
                    value={`${metricStats.soilMoisture?.average.toFixed(0) ?? '—'}%`}
                    subtitle={
                      metricStats.soilMoisture
                        ? `Мин ${metricStats.soilMoisture.min.toFixed(0)}% • Макс ${metricStats.soilMoisture.max.toFixed(0)}% • ${formatTrendLabel(metricTrends.soilMoisture, '%', 0)}`
                        : 'Нет данных'
                    }
                    icon={Droplets}
                    iconColor="text-emerald-600"
                  />
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(180).springify()} className="mb-5">
                <Text className="text-foreground mb-3 text-xl font-bold">Измерения</Text>
                <View className="gap-4">
                  {(Object.keys(rawCharts) as MetricKey[]).map((key) => {
                    const chartData = rawCharts[key];
                    const config = CHART_CONFIGS[key];

                    if (!chartData) return null;

                    return (
                      <InteractiveChart
                        key={key}
                        title={config.title}
                        description="Интерактивный график: проведи пальцем, чтобы посмотреть точные значения."
                        unit={config.unit}
                        icon={config.icon}
                        iconColor={config.iconColor}
                        data={chartData}
                        xAxisLabel="Ось X: дата / время"
                        yAxisLabel={`Ось Y: ${config.unit}`}
                      />
                    );
                  })}

                  {combinedChart ? (
                    <InteractiveChart
                      title="Комбинированный график среды"
                      description="Один график для температуры, влажности воздуха и влажности почвы. При касании показываются все значения сразу."
                      unit="% / °C"
                      icon={BarChart3}
                      iconColor="text-primary"
                      data={combinedChart}
                      xAxisLabel="Ось X: дата / время"
                      yAxisLabel="Ось Y: °C и %"
                    />
                  ) : null}
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(220).springify()} className="mb-5">
                <Text className="text-foreground mb-3 text-xl font-bold">Суточные средние</Text>
                <Text className="text-muted-foreground mb-3 text-sm">
                  Эти графики помогают увидеть общий тренд среды без шума от отдельных замеров.
                </Text>
                <View className="gap-4">
                  {(Object.keys(dailyAverageCharts) as MetricKey[]).map((key) => {
                    const chartData = dailyAverageCharts[key];
                    const config = CHART_CONFIGS[key];

                    if (!chartData) return null;

                    return (
                      <InteractiveChart
                        key={`daily-average-${key}`}
                        title={`${config.title} • среднее по дням`}
                        description="Средние значения по дням без шума от отдельных замеров."
                        unit={config.unit}
                        icon={config.icon}
                        iconColor={config.iconColor}
                        data={chartData}
                        xAxisLabel="Ось X: день"
                        yAxisLabel={`Ось Y: ${config.unit}`}
                      />
                    );
                  })}
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(260).springify()} className="mb-5">
                <Text className="text-foreground mb-3 text-xl font-bold">Дневной диапазон</Text>
                <Text className="text-muted-foreground mb-3 text-sm">
                  Минимумы и максимумы по дням помогают заметить перепады и нестабильность условий.
                </Text>
                <View className="gap-4">
                  {(Object.keys(dailyRangeCharts) as MetricKey[]).map((key) => {
                    const chartData = dailyRangeCharts[key];
                    const config = CHART_CONFIGS[key];

                    if (!chartData) return null;

                    return (
                      <InteractiveChart
                        key={`daily-range-${key}`}
                        title={`${config.title} • минимум и максимум`}
                        description="Диапазон значений внутри каждого дня."
                        unit={config.unit}
                        icon={config.icon}
                        iconColor={config.iconColor}
                        data={chartData}
                        xAxisLabel="Ось X: день"
                        yAxisLabel={`Ось Y: ${config.unit}`}
                      />
                    );
                  })}
                </View>
              </Animated.View>

              <Animated.View entering={FadeInDown.delay(300).springify()}>
                <Text className="text-foreground mb-3 text-xl font-bold">Разброс по дням</Text>
                <Text className="text-muted-foreground mb-3 text-sm">
                  Чем выше столбец, тем сильнее показатель менялся в течение дня.
                </Text>
                <View className="gap-4">
                  {(Object.keys(dailySpreadCharts) as MetricKey[]).map((key) => {
                    const chartData = dailySpreadCharts[key];
                    const config = CHART_CONFIGS[key];

                    if (!chartData) return null;

                    return (
                      <InteractiveChart
                        key={`daily-spread-${key}`}
                        title={`${config.title} • разброс`}
                        description="Насколько сильно показатель менялся внутри дня."
                        unit={config.unit}
                        icon={config.icon}
                        iconColor={config.iconColor}
                        data={chartData}
                        variant="bar"
                        xAxisLabel="Ось X: день"
                        yAxisLabel={`Ось Y: ${config.unit}`}
                      />
                    );
                  })}
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

function CompactInfoCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle: string;
}) {
  return (
    <View className="bg-card rounded-3xl p-4">
      <Text className="text-muted-foreground text-sm">{title}</Text>
      <Text className="text-foreground mt-1 text-lg font-bold">{value}</Text>
      <Text className="text-muted-foreground mt-1 text-xs">{subtitle}</Text>
    </View>
  );
}

function SummaryCard({
  title,
  value,
  subtitle,
  icon,
  iconColor,
}: {
  title: string;
  value: string;
  subtitle: string;
  icon: LucideIcon;
  iconColor: string;
}) {
  return (
    <View className="bg-card flex-row items-center gap-3 rounded-3xl p-4">
      <View className="bg-secondary/35 rounded-2xl p-3">
        <Icon as={icon} size={18} className={iconColor} />
      </View>
      <View className="flex-1">
        <Text className="text-muted-foreground text-sm">{title}</Text>
        <Text className="text-foreground mt-0.5 text-xl font-bold">{value}</Text>
        <Text className="text-muted-foreground mt-1 text-xs">{subtitle}</Text>
      </View>
    </View>
  );
}

function HighlightsSkeleton() {
  return (
    <View className="gap-3">
      {[0, 1, 2].map((item) => (
        <Skeleton key={item} className="h-20 rounded-3xl" />
      ))}
    </View>
  );
}

function SummarySkeleton() {
  return (
    <View className="gap-3">
      {[0, 1, 2].map((item) => (
        <Skeleton key={item} className="h-24 rounded-3xl" />
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
