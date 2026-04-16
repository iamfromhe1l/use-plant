import React, { useMemo, useState } from 'react';
import { type GestureResponderEvent, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useUniwind } from 'uniwind';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import type { LucideIcon } from 'lucide-react-native';

export type InteractiveChartDataset = {
  data: number[];
  color?: string;
  strokeWidth?: number;
  label?: string;
  unit?: string;
};

export type InteractiveChartData = {
  labels: string[];
  tooltipTitles?: string[];
  tooltipSubtitles?: string[];
  datasets: InteractiveChartDataset[];
  legend?: string[];
};

type InteractiveChartProps = {
  title: string;
  description?: string;
  unit: string;
  icon: LucideIcon;
  iconColor: string;
  data: InteractiveChartData;
  variant?: 'line' | 'bar';
  fromZero?: boolean;
  xAxisLabel?: string;
  yAxisLabel?: string;
};

const CHART_HEIGHT = 220;
const PADDING = { top: 16, right: 14, bottom: 28, left: 42 };

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function buildPath(points: { x: number; y: number }[]) {
  if (!points.length) return '';
  return points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
}

function formatValue(value: number, unit: string) {
  const rounded = Math.abs(value) >= 100 ? value.toFixed(0) : value.toFixed(1);
  return `${rounded}${unit}`;
}

export function InteractiveChart({
  title,
  description,
  unit,
  icon,
  iconColor,
  data,
  variant = 'line',
  fromZero = false,
  xAxisLabel = 'Ось X',
  yAxisLabel = 'Ось Y',
}: InteractiveChartProps) {
  const { theme } = useUniwind();
  const [width, setWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  const palette =
    theme === 'dark'
      ? {
          card: '#15231d',
          cardAlt: '#1a2c24',
          grid: 'rgba(187, 214, 196, 0.12)',
          axis: '#a7b7ae',
          cursor: 'rgba(123, 210, 155, 0.8)',
          tooltip: '#203228',
          tooltipBorder: 'rgba(123, 210, 155, 0.18)',
        }
      : {
          card: '#eef6f0',
          cardAlt: '#f6faf7',
          grid: 'rgba(75, 99, 83, 0.14)',
          axis: '#4b6353',
          cursor: 'rgba(22, 163, 74, 0.72)',
          tooltip: '#ffffff',
          tooltipBorder: 'rgba(22, 163, 74, 0.14)',
        };

  const pointCount = data.labels.length;
  const plotWidth = Math.max(width - PADDING.left - PADDING.right, 1);
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom;
  const lineStep = pointCount > 1 ? plotWidth / (pointCount - 1) : 0;
  const barStep = pointCount > 0 ? plotWidth / pointCount : 0;

  const { min, max, yTicks } = useMemo(() => {
    const allValues = data.datasets.flatMap((dataset) => dataset.data);
    let localMin = Math.min(...allValues);
    let localMax = Math.max(...allValues);

    if (!Number.isFinite(localMin) || !Number.isFinite(localMax)) {
      localMin = 0;
      localMax = 1;
    }

    if (fromZero) {
      localMin = Math.min(0, localMin);
    }

    if (localMin === localMax) {
      localMin -= 1;
      localMax += 1;
    }

    const padding = Math.max((localMax - localMin) * 0.08, 1);
    localMin -= padding;
    localMax += padding;

    const ticks = Array.from(
      { length: 5 },
      (_, index) => localMin + ((localMax - localMin) / 4) * index
    );
    return { min: localMin, max: localMax, yTicks: ticks };
  }, [data.datasets, fromZero]);

  const getX = (index: number) =>
    variant === 'bar'
      ? PADDING.left + barStep * index + barStep / 2
      : pointCount <= 1
        ? PADDING.left + plotWidth / 2
        : PADDING.left + lineStep * index;

  const getY = (value: number) => {
    const ratio = (value - min) / (max - min);
    return PADDING.top + plotHeight - ratio * plotHeight;
  };

  const activeIndex = selectedIndex ?? (pointCount > 0 ? pointCount - 1 : null);
  const selectedX = activeIndex !== null ? getX(activeIndex) : 0;
  const labelStep = pointCount > 8 ? Math.ceil(pointCount / 6) : 1;
  const tooltipTitle =
    activeIndex !== null
      ? data.tooltipTitles?.[activeIndex] || data.labels[activeIndex] || 'Точка'
      : null;
  const tooltipSubtitle = activeIndex !== null ? data.tooltipSubtitles?.[activeIndex] : null;

  const handleTouch = (event: GestureResponderEvent) => {
    if (pointCount === 0 || width === 0) return;

    const x = clamp(event.nativeEvent.locationX, PADDING.left, width - PADDING.right);
    let closestIndex = 0;
    let minDistance = Number.POSITIVE_INFINITY;

    for (let index = 0; index < pointCount; index += 1) {
      const distance = Math.abs(getX(index) - x);
      if (distance < minDistance) {
        minDistance = distance;
        closestIndex = index;
      }
    }

    setSelectedIndex(closestIndex);
  };

  return (
    <View className="bg-card overflow-hidden rounded-3xl p-3">
      <View className="mb-2.5 flex-row items-center gap-2">
        <Icon as={icon} size={18} className={iconColor} />
        <Text className="text-foreground flex-1 text-base font-semibold">{title}</Text>
        <Text className="text-muted-foreground text-xs">({unit})</Text>
      </View>

      {description ? (
        <Text className="text-muted-foreground mb-2.5 text-sm">{description}</Text>
      ) : null}

      {data.legend?.length ? (
        <View className="mb-2.5 flex-row flex-wrap gap-2">
          {data.legend.map((item, index) => (
            <View
              key={item}
              className="bg-secondary/45 flex-row items-center gap-2 rounded-full px-2.5 py-1">
              <View
                className="h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: data.datasets[index]?.color || '#16a34a' }}
              />
              <Text className="text-muted-foreground text-[11px]">{item}</Text>
            </View>
          ))}
        </View>
      ) : null}

      <View
        className="overflow-hidden rounded-[22px]"
        style={{ backgroundColor: palette.card }}
        onLayout={(event) => setWidth(event.nativeEvent.layout.width)}
        onStartShouldSetResponder={() => true}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={handleTouch}
        onResponderMove={handleTouch}
        onResponderRelease={() => setSelectedIndex(null)}
        onResponderTerminate={() => setSelectedIndex(null)}>
        {activeIndex !== null && tooltipTitle ? (
          <View
            className="mx-3 mt-3 mb-2 rounded-2xl px-3 py-2.5"
            style={{
              backgroundColor: palette.tooltip,
              borderWidth: 1,
              borderColor: palette.tooltipBorder,
            }}>
            <Text className="text-foreground text-xs font-semibold">{tooltipTitle}</Text>
            {tooltipSubtitle ? (
              <Text className="text-muted-foreground mt-1 text-[11px]">{tooltipSubtitle}</Text>
            ) : null}
            <View className="mt-2 gap-1.5">
              {data.datasets.map((dataset, datasetIndex) => (
                <View key={`tooltip-${datasetIndex}`} className="flex-row items-center gap-2">
                  <View
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: dataset.color || '#16a34a' }}
                  />
                  <Text className="text-foreground text-xs">
                    {dataset.label || data.legend?.[datasetIndex]
                      ? `${dataset.label || data.legend?.[datasetIndex]}: `
                      : ''}
                    {formatValue(dataset.data[activeIndex], dataset.unit || unit)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        ) : (
          <View className="mx-3 mt-3 mb-2 rounded-2xl px-3 py-2.5 opacity-0">
            <Text className="text-xs font-semibold">placeholder</Text>
            <Text className="mt-1 text-[11px]">placeholder</Text>
            <View className="mt-2 gap-1.5">
              <Text className="text-xs">placeholder</Text>
            </View>
          </View>
        )}

        <Svg width={width || 1} height={CHART_HEIGHT}>
          <Rect
            x={0}
            y={0}
            width={width || 1}
            height={CHART_HEIGHT}
            fill={palette.cardAlt}
            opacity={0.4}
          />

          {yTicks.map((tick) => {
            const y = getY(tick);
            return (
              <React.Fragment key={tick}>
                <Line
                  x1={PADDING.left}
                  y1={y}
                  x2={width - PADDING.right}
                  y2={y}
                  stroke={palette.grid}
                  strokeWidth={1}
                />
                <SvgText
                  x={PADDING.left - 8}
                  y={y + 4}
                  fontSize="10"
                  fill={palette.axis}
                  textAnchor="end">
                  {Math.round(tick)}
                </SvgText>
              </React.Fragment>
            );
          })}

          {data.labels.map((label, index) =>
            index % labelStep === 0 || index === pointCount - 1 ? (
              <SvgText
                key={`${label}-${index}`}
                x={getX(index)}
                y={CHART_HEIGHT - 8}
                fontSize="10"
                fill={palette.axis}
                textAnchor="middle">
                {label}
              </SvgText>
            ) : null
          )}

          {variant === 'line'
            ? data.datasets.map((dataset, datasetIndex) => {
                const points = dataset.data.map((value, index) => ({
                  x: getX(index),
                  y: getY(value),
                }));

                return (
                  <React.Fragment key={`line-${datasetIndex}`}>
                    <Path
                      d={buildPath(points)}
                      fill="none"
                      stroke={dataset.color || '#16a34a'}
                      strokeWidth={dataset.strokeWidth || 2.5}
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {pointCount <= 60
                      ? points.map((point, index) => (
                          <Circle
                            key={`${datasetIndex}-${index}`}
                            cx={point.x}
                            cy={point.y}
                            r={activeIndex === index ? 4 : 2.5}
                            fill={dataset.color || '#16a34a'}
                            opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                          />
                        ))
                      : null}
                  </React.Fragment>
                );
              })
            : data.datasets[0]?.data.map((value, index) => {
                const barWidth = Math.max(barStep * 0.56, 6);
                const x = getX(index) - barWidth / 2;
                const y = getY(value);
                const baseY = getY(fromZero ? 0 : min);

                return (
                  <Rect
                    key={`bar-${index}`}
                    x={x}
                    y={Math.min(y, baseY)}
                    width={barWidth}
                    height={Math.abs(baseY - y)}
                    rx={6}
                    fill={data.datasets[0]?.color || '#2563eb'}
                    opacity={activeIndex === null || activeIndex === index ? 1 : 0.45}
                  />
                );
              })}

          {activeIndex !== null ? (
            <>
              <Line
                x1={selectedX}
                y1={PADDING.top}
                x2={selectedX}
                y2={CHART_HEIGHT - PADDING.bottom}
                stroke={palette.cursor}
                strokeWidth={1.2}
                strokeDasharray="4 4"
              />
              {variant === 'line'
                ? data.datasets.map((dataset, datasetIndex) => (
                    <Circle
                      key={`selected-${datasetIndex}`}
                      cx={selectedX}
                      cy={getY(dataset.data[activeIndex])}
                      r={5}
                      fill={dataset.color || '#16a34a'}
                      stroke={palette.card}
                      strokeWidth={2}
                    />
                  ))
                : null}
            </>
          ) : null}
        </Svg>
      </View>

      <View className="mt-2 flex-row items-center justify-between px-1">
        <Text className="text-muted-foreground text-[11px]">{xAxisLabel}</Text>
        <Text className="text-muted-foreground text-[11px]">{yAxisLabel}</Text>
      </View>
    </View>
  );
}
