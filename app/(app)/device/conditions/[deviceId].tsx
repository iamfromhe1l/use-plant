import AsyncStorage from '@react-native-async-storage/async-storage';
import Slider from '@react-native-community/slider';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Droplets,
  Leaf,
  Plus,
  Send,
  Thermometer,
  Trash2,
  Wind,
  type LucideIcon,
} from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Platform, ScrollView, Switch as RNSwitch, TouchableOpacity, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { CommandsApi } from '@/api/devices/commands';
import { DevicesApi } from '@/api/devices/devices';
import type {
  ComparisonOperator,
  ISensorRule,
  IWateringCondition,
  SensorField,
} from '@/api/devices/types/conditions';
import { ScreenHeader } from '@/components/screen-header';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Skeleton } from '@/components/ui/skeleton';
import { Text } from '@/components/ui/text';
import { WaterLevelBar } from '@/components/water-level-bar';
import { ICON_MAP } from '@/consts/icons';
import { useDevices } from '@/contexts/devices-context/devices-context';
import {
  describeWateringCondition,
  getWateringConditionsStorageKey,
  normalizeScheduleTimes,
  sortWateringDays,
  WATERING_DAY_OPTIONS,
  WATERING_SENSOR_UNITS,
} from '@/lib/watering-conditions';

const commandsApi = new CommandsApi();
const devicesApi = new DevicesApi();

const SENSOR_OPTIONS: {
  value: SensorField;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
}[] = [
  { value: 'temperature', label: 'Температура', shortLabel: 'Темп.', icon: Thermometer },
  { value: 'airHumidity', label: 'Влажность воздуха', shortLabel: 'Воздух', icon: Wind },
  { value: 'soilMoisture', label: 'Влажность почвы', shortLabel: 'Почва', icon: Droplets },
];

const SENSOR_RANGES: Record<SensorField, { min: number; max: number; step: number }> = {
  temperature: { min: -10, max: 60, step: 1 },
  airHumidity: { min: 0, max: 100, step: 1 },
  soilMoisture: { min: 0, max: 100, step: 1 },
};

const OP_OPTIONS: {
  value: ComparisonOperator;
  label: string;
  shortLabel: string;
}[] = [
  { value: 'lt', label: 'Меньше', shortLabel: '<' },
  { value: 'eq', label: 'Равно', shortLabel: '=' },
  { value: 'gt', label: 'Больше', shortLabel: '>' },
];

const DAY_PRESETS = [
  { label: 'Каждый день', days: [0, 1, 2, 3, 4, 5, 6] },
  { label: 'Будни', days: [1, 2, 3, 4, 5] },
  { label: 'Выходные', days: [0, 6] },
];

let nextId = 1;
const generateId = () => `cond_${Date.now()}_${nextId++}`;
const MAX_SENSOR_INTERVAL_MINUTES = 360;
const MAX_SCHEDULE_TIMES = 6;

function formatInterval(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}ч ${mins}м` : `${hours} ч`;
}

function clampInterval(minutes: number) {
  return Math.max(5, Math.min(MAX_SENSOR_INTERVAL_MINUTES, minutes));
}

function clampValue(value: number, field: SensorField) {
  const range = SENSOR_RANGES[field];
  return Math.max(range.min, Math.min(range.max, value));
}

function sameDays(left: number[], right: number[]) {
  const normalizedLeft = sortWateringDays(left);
  const normalizedRight = sortWateringDays(right);

  if (normalizedLeft.length !== normalizedRight.length) return false;
  return normalizedLeft.every((day, index) => day === normalizedRight[index]);
}

function normalizeConditionShape(condition: IWateringCondition): IWateringCondition {
  if (condition.type !== 'schedule' || !condition.schedule) {
    return condition;
  }

  const times = normalizeScheduleTimes(condition.schedule).slice(0, MAX_SCHEDULE_TIMES);

  return {
    ...condition,
    schedule: {
      ...condition.schedule,
      time: times[0] ?? '08:00',
      times,
    },
  };
}

function describeRule(rule: ISensorRule) {
  const sensorLabel =
    SENSOR_OPTIONS.find((option) => option.value === rule.field)?.label ?? 'Датчик';
  const operatorLabel =
    OP_OPTIONS.find((option) => option.value === rule.operator)?.label.toLowerCase() ?? '';
  return `${sensorLabel} ${operatorLabel} ${rule.value}${WATERING_SENSOR_UNITS[rule.field]}`;
}

function ChoiceChip({
  label,
  icon,
  active,
  onPress,
}: {
  label: string;
  icon?: LucideIcon;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity className="flex-1" activeOpacity={0.85} onPress={onPress}>
      <View
        className={`items-center justify-center gap-1.5 rounded-2xl border px-3 py-3 ${
          active ? 'bg-primary border-primary' : 'bg-secondary/45 border-border/70'
        }`}>
        {icon ? (
          <Icon
            as={icon}
            size={16}
            className={active ? 'text-primary-foreground' : 'text-muted-foreground'}
          />
        ) : null}
        <Text
          className={`text-xs font-semibold ${
            active ? 'text-primary-foreground' : 'text-foreground'
          }`}>
          {label}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

function AddConditionCard({
  title,
  description,
  icon,
  iconClassName,
  containerClassName,
  onPress,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  containerClassName: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity activeOpacity={0.88} onPress={onPress}>
      <View className={`rounded-3xl border p-4 ${containerClassName}`}>
        <View className="flex-row items-center gap-3">
          <View className="bg-background/70 rounded-2xl p-3">
            <Icon as={icon} size={20} className={iconClassName} />
          </View>
          <View className="flex-1">
            <Text className="text-foreground text-base font-semibold">{title}</Text>
            <Text className="text-muted-foreground mt-1 text-sm">{description}</Text>
          </View>
          <Icon as={Plus} size={18} className={iconClassName} />
        </View>
      </View>
    </TouchableOpacity>
  );
}

export default function ConditionsScreen() {
  const { deviceId, plantIndex: plantIndexParam } = useLocalSearchParams<{
    deviceId: string;
    plantIndex?: string;
  }>();
  const { devices, actions } = useDevices();
  const device = devices.find((item) => item.deviceId === deviceId);
  const plants = device?.plants || [];
  const selectedPlantIndex = Number(plantIndexParam || plants[0]?.index || 1);
  const selectedPlant =
    plants.find((plant) => plant.index === selectedPlantIndex) || plants[0] || null;
  const PlantIcon = selectedPlant ? ICON_MAP[selectedPlant.icon] || Leaf : Leaf;
  const storageKey = getWateringConditionsStorageKey(deviceId);

  const [conditions, setConditions] = useState<IWateringCondition[]>([]);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [timePickerFor, setTimePickerFor] = useState<{
    conditionId: string;
    timeIndex: number;
  } | null>(null);
  const [tempPickerTime, setTempPickerTime] = useState<Date | null>(null);
  const [intervalDialogFor, setIntervalDialogFor] = useState<string | null>(null);
  const [tempInterval, setTempInterval] = useState(60);

  useEffect(() => {
    let active = true;

    const loadDraft = async () => {
      try {
        const storedConditions = await AsyncStorage.getItem(storageKey);

        if (!active) return;

        if (storedConditions) {
          const parsed = JSON.parse(storedConditions);
          setConditions(
            (Array.isArray(parsed) ? parsed : []).map((condition) =>
              normalizeConditionShape(condition)
            )
          );
        } else {
          const fallbackConditions =
            device?.plants.flatMap((plant) => plant.wateringConditions || []) ?? [];
          setConditions(fallbackConditions.map((condition) => normalizeConditionShape(condition)));
        }
      } catch {
        if (active) {
          const fallbackConditions =
            device?.plants.flatMap((plant) => plant.wateringConditions || []) ?? [];
          setConditions(fallbackConditions.map((condition) => normalizeConditionShape(condition)));
        }
      } finally {
        if (active) {
          setDraftLoaded(true);
        }
      }
    };

    void loadDraft();

    return () => {
      active = false;
    };
  }, [storageKey, device?.plants]);

  useEffect(() => {
    if (!draftLoaded) return;

    const timeoutId = setTimeout(() => {
      void AsyncStorage.setItem(storageKey, JSON.stringify(conditions));
    }, 150);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [conditions, draftLoaded, storageKey]);

  const plantConditions = useMemo(
    () => conditions.filter((condition) => condition.plantIndex === selectedPlantIndex),
    [conditions, selectedPlantIndex]
  );
  const enabledPlantConditions = plantConditions.filter((condition) => condition.enabled);

  const updateCondition = useCallback((id: string, updates: Partial<IWateringCondition>) => {
    setConditions((prev) =>
      prev.map((condition) => (condition.id === id ? { ...condition, ...updates } : condition))
    );
  }, []);

  const addSensorCondition = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConditions((prev) => [
      ...prev,
      {
        id: generateId(),
        plantIndex: selectedPlantIndex,
        type: 'sensor',
        level: 5,
        interval: 60,
        rules: [{ field: 'soilMoisture', operator: 'lt', value: 30 }],
        enabled: true,
      },
    ]);
  };

  const addScheduleCondition = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConditions((prev) => [
      ...prev,
      {
        id: generateId(),
        plantIndex: selectedPlantIndex,
        type: 'schedule',
        level: 5,
        interval: 0,
        rules: [],
        schedule: { time: '08:00', times: ['08:00'], days: [1, 2, 3, 4, 5] },
        enabled: true,
      },
    ]);
  };

  const removeCondition = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConditions((prev) => prev.filter((condition) => condition.id !== id));
  };

  const setConditionEnabled = (id: string, enabled: boolean) => {
    Haptics.selectionAsync();
    updateCondition(id, { enabled });
  };

  const updateRule = (conditionId: string, ruleIndex: number, updates: Partial<ISensorRule>) => {
    setConditions((prev) =>
      prev.map((condition) => {
        if (condition.id !== conditionId || !condition.rules) return condition;

        const nextRules = [...condition.rules];
        nextRules[ruleIndex] = { ...nextRules[ruleIndex], ...updates };

        return { ...condition, rules: nextRules };
      })
    );
  };

  const changeRuleField = (conditionId: string, ruleIndex: number, field: SensorField) => {
    setConditions((prev) =>
      prev.map((condition) => {
        if (condition.id !== conditionId || !condition.rules) return condition;

        const nextRules = [...condition.rules];
        const currentRule = nextRules[ruleIndex];
        nextRules[ruleIndex] = {
          ...currentRule,
          field,
          value: clampValue(currentRule.value, field),
        };

        return { ...condition, rules: nextRules };
      })
    );
  };

  const addRule = (conditionId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConditions((prev) =>
      prev.map((condition) =>
        condition.id === conditionId
          ? {
              ...condition,
              rules: [
                ...(condition.rules || []),
                { field: 'temperature', operator: 'gt', value: 25 },
              ],
            }
          : condition
      )
    );
  };

  const addScheduleTime = (conditionId: string) => {
    Haptics.selectionAsync();
    setConditions((prev) =>
      prev.map((condition) => {
        if (condition.id !== conditionId || !condition.schedule) return condition;

        const times = normalizeScheduleTimes(condition.schedule);
        if (times.length >= MAX_SCHEDULE_TIMES) return condition;

        const nextTimes = [...times, times[times.length - 1] || '08:00'];

        return {
          ...condition,
          schedule: {
            ...condition.schedule,
            time: nextTimes[0],
            times: nextTimes,
          },
        };
      })
    );
  };

  const removeScheduleTime = (conditionId: string, timeIndex: number) => {
    Haptics.selectionAsync();
    setConditions((prev) =>
      prev.map((condition) => {
        if (condition.id !== conditionId || !condition.schedule) return condition;

        const nextTimes = normalizeScheduleTimes(condition.schedule).filter(
          (_, index) => index !== timeIndex
        );
        const safeTimes = nextTimes.length ? nextTimes : ['08:00'];

        return {
          ...condition,
          schedule: {
            ...condition.schedule,
            time: safeTimes[0],
            times: safeTimes,
          },
        };
      })
    );
  };

  const removeRule = (conditionId: string, ruleIndex: number) => {
    Haptics.selectionAsync();
    setConditions((prev) =>
      prev.map((condition) => {
        if (condition.id !== conditionId || !condition.rules) return condition;
        return {
          ...condition,
          rules: condition.rules.filter((_, index) => index !== ruleIndex),
        };
      })
    );
  };

  const toggleDay = (conditionId: string, day: number) => {
    Haptics.selectionAsync();
    setConditions((prev) =>
      prev.map((condition) => {
        if (condition.id !== conditionId || !condition.schedule) return condition;

        const days = condition.schedule.days.includes(day)
          ? condition.schedule.days.filter((value) => value !== day)
          : sortWateringDays([...condition.schedule.days, day]);

        return {
          ...condition,
          schedule: { ...condition.schedule, days },
        };
      })
    );
  };

  const applyDayPreset = (conditionId: string, days: number[]) => {
    Haptics.selectionAsync();
    setConditions((prev) =>
      prev.map((condition) =>
        condition.id === conditionId && condition.schedule
          ? {
              ...condition,
              schedule: { ...condition.schedule, days: sortWateringDays(days) },
            }
          : condition
      )
    );
  };

  const handleSend = async () => {
    if (enabledPlantConditions.length === 0) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);

    const response = await commandsApi.sendCommand(deviceId, {
      type: 'set_conditions',
      payload: {
        conditions: conditions.filter((condition) => condition.enabled),
      },
    });

    setSending(false);

    if (response.state) {
      const settingsResponse = await devicesApi.updateDeviceSettings({
        deviceId,
        plants: [
          {
            plantIndex: selectedPlantIndex,
            presetId: null,
            wateringConditions: plantConditions,
          },
        ],
      });

      if (settingsResponse.state) {
        await actions.loadDevices();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        toast.success(`Условия для ${selectedPlant.name} отправлены на устройство`);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        toast.error(
          settingsResponse.error?.message ||
            'Условия отправлены на устройство, но не сохранены в приложении'
        );
      }

      return;
    }

    toast.error(response.error?.message || 'Не удалось отправить условия');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const openTimePicker = (conditionId: string, timeIndex: number) => {
    const condition = conditions.find((item) => item.id === conditionId);
    const scheduleTimes = normalizeScheduleTimes(condition?.schedule);
    const [hours, minutes] = (scheduleTimes[timeIndex] || '08:00').split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    setTempPickerTime(date);
    setTimePickerFor({ conditionId, timeIndex });
  };

  const applyTimePick = (conditionId: string, timeIndex: number, date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const currentSchedule =
      conditions.find((condition) => condition.id === conditionId)?.schedule || null;
    const nextTimes = [...normalizeScheduleTimes(currentSchedule)];
    nextTimes[timeIndex] = `${hours}:${minutes}`;

    updateCondition(conditionId, {
      schedule: {
        ...currentSchedule!,
        time: nextTimes[0],
        times: nextTimes,
      },
    });
  };

  const onTimePick = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') {
      const targetTimePicker = timePickerFor;
      setTimePickerFor(null);
      setTempPickerTime(null);

      if (selected && targetTimePicker) {
        applyTimePick(targetTimePicker.conditionId, targetTimePicker.timeIndex, selected);
      }

      return;
    }

    if (selected) {
      setTempPickerTime(selected);
    }
  };

  const confirmTimePick = () => {
    if (timePickerFor && tempPickerTime) {
      applyTimePick(timePickerFor.conditionId, timePickerFor.timeIndex, tempPickerTime);
    }

    setTimePickerFor(null);
    setTempPickerTime(null);
  };

  const cancelTimePick = () => {
    setTimePickerFor(null);
    setTempPickerTime(null);
  };

  const openIntervalDialog = (conditionId: string) => {
    setTempInterval(
      clampInterval(conditions.find((condition) => condition.id === conditionId)?.interval || 60)
    );
    setIntervalDialogFor(conditionId);
  };

  const saveInterval = () => {
    if (!intervalDialogFor) return;

    updateCondition(intervalDialogFor, { interval: clampInterval(tempInterval) });
    setIntervalDialogFor(null);
  };

  if (!selectedPlant) {
    return (
      <View className="bg-background flex-1">
        <ScreenHeader title="Условия полива" subtitle={device?.name || 'Устройство'} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-muted-foreground">Нет растений для настройки</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="bg-background flex-1">
      <ScreenHeader
        title="Условия полива"
        subtitle={`${device?.name || 'Устройство'} • ${selectedPlant.name}`}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 136 }}>
        <View className="gap-4 px-5 pt-4">
          <Animated.View entering={FadeInDown.delay(40).springify()} className="gap-3">
            <AddConditionCard
              title="Правило по датчикам"
              description="Полив, когда датчики показывают нужные значения"
              icon={Droplets}
              iconClassName="text-sky-600"
              containerClassName="bg-sky-500/10 border-sky-500/20"
              onPress={addSensorCondition}
            />
            <AddConditionCard
              title="Расписание"
              description="Полив в конкретное время и по выбранным дням"
              icon={Clock}
              iconClassName="text-violet-600"
              containerClassName="bg-violet-500/10 border-violet-500/20"
              onPress={addScheduleCondition}
            />
          </Animated.View>

          {!draftLoaded ? (
            <View className="gap-4">
              <Skeleton className="h-40 rounded-3xl" />
              <Skeleton className="h-40 rounded-3xl" />
            </View>
          ) : plantConditions.length === 0 ? (
            <Animated.View entering={FadeIn} className="bg-card items-center gap-3 rounded-3xl p-8">
              <View className="bg-primary/10 rounded-full p-4">
                <Icon as={PlantIcon} size={30} className="text-primary" />
              </View>
              <Text className="text-foreground text-base font-semibold">
                Для {selectedPlant.name} пока нет условий
              </Text>
              <Text className="text-muted-foreground text-center text-sm">
                Добавьте правило по датчикам или расписание выше. Все изменения сохраняются как
                черновик и не затрагивают второе растение.
              </Text>
            </Animated.View>
          ) : (
            plantConditions.map((condition, conditionIndex) => {
              const isSensor = condition.type === 'sensor';

              return (
                <Animated.View
                  key={condition.id}
                  entering={FadeInDown.delay(100 + conditionIndex * 60).springify()}>
                  <View className="bg-card overflow-hidden rounded-3xl">
                    <View
                      className={`border-border/50 border-b px-4 py-4 ${
                        isSensor ? 'bg-sky-500/6' : 'bg-violet-500/6'
                      }`}>
                      <View className="flex-row items-start gap-3">
                        <View
                          className={`rounded-2xl p-2.5 ${
                            isSensor ? 'bg-sky-500/14' : 'bg-violet-500/14'
                          }`}>
                          <Icon
                            as={isSensor ? Droplets : Clock}
                            size={18}
                            className={isSensor ? 'text-sky-600' : 'text-violet-600'}
                          />
                        </View>

                        <View className="flex-1">
                          <Text className="text-foreground text-base font-semibold">
                            {isSensor ? 'Полив по датчикам' : 'Полив по расписанию'}
                          </Text>
                          <Text className="text-muted-foreground mt-1 text-sm">
                            {describeWateringCondition(condition)}
                          </Text>
                        </View>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <TouchableOpacity activeOpacity={0.85}>
                              <View className="bg-destructive/8 flex-row items-center gap-1.5 rounded-2xl px-3 py-2">
                                <Icon as={Trash2} size={14} className="text-destructive" />
                                <Text className="text-destructive text-sm font-medium">
                                  Удалить
                                </Text>
                              </View>
                            </TouchableOpacity>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                <Text>Удалить условие?</Text>
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                <Text>Это действие нельзя отменить.</Text>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                <Text>Отмена</Text>
                              </AlertDialogCancel>
                              <AlertDialogAction onPress={() => removeCondition(condition.id)}>
                                <Text>Удалить</Text>
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </View>

                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setConditionEnabled(condition.id, !condition.enabled)}
                        className="mt-4">
                        <View className="bg-background flex-row items-center rounded-2xl px-4 py-3">
                          <View className="flex-1">
                            <Text className="text-foreground text-sm font-semibold">
                              {condition.enabled ? 'Условие включено' : 'Условие выключено'}
                            </Text>
                            <Text className="text-muted-foreground mt-1 text-xs">
                              Выключенное условие сохранится, но не отправится на устройство
                            </Text>
                          </View>
                          <RNSwitch
                            value={condition.enabled}
                            onValueChange={(value) => setConditionEnabled(condition.id, value)}
                            trackColor={{ false: '#e5e7eb', true: '#16a34a' }}
                            thumbColor="#fff"
                          />
                        </View>
                      </TouchableOpacity>
                    </View>

                    <View className="gap-4 px-4 py-4">
                      <View>
                        <Text className="text-muted-foreground mb-2 text-xs font-medium">
                          Интенсивность полива
                        </Text>
                        <View className="bg-secondary/30 rounded-2xl p-4">
                          <View className="mb-3 flex-row items-center justify-between">
                            <Text className="text-foreground text-sm">Уровень</Text>
                            <View className="bg-primary/10 rounded-full px-3 py-1">
                              <Text className="text-primary text-xs font-semibold">
                                {condition.level} / 10
                              </Text>
                            </View>
                          </View>
                          <WaterLevelBar
                            value={condition.level}
                            onChange={(value) => updateCondition(condition.id, { level: value })}
                          />
                        </View>
                      </View>

                      {(isSensor || (condition.rules && condition.rules.length > 0)) &&
                      condition.rules ? (
                        <>
                          {isSensor ? (
                            <TouchableOpacity
                              onPress={() => openIntervalDialog(condition.id)}
                              activeOpacity={0.85}>
                              <View className="bg-secondary/30 flex-row items-center rounded-2xl px-4 py-4">
                                <View className="bg-primary/10 rounded-2xl p-3">
                                  <Icon as={Clock} size={18} className="text-primary" />
                                </View>
                                <View className="ml-3 flex-1">
                                  <Text className="text-foreground text-sm font-semibold">
                                    Интервал проверки
                                  </Text>
                                  <Text className="text-muted-foreground mt-1 text-xs">
                                    Как часто устройство сравнивает датчики с условиями
                                  </Text>
                                </View>
                                <View className="bg-primary/10 rounded-full px-3 py-1.5">
                                  <Text className="text-primary text-xs font-semibold">
                                    {formatInterval(condition.interval)}
                                  </Text>
                                </View>
                              </View>
                            </TouchableOpacity>
                          ) : (
                            <View className="bg-secondary/30 rounded-2xl px-4 py-4">
                              <View className="flex-row items-center gap-3">
                                <View className="bg-primary/10 rounded-2xl p-3">
                                  <Icon as={AlertCircle} size={18} className="text-primary" />
                                </View>
                                <View className="flex-1">
                                  <Text className="text-foreground text-sm font-semibold">
                                    Дополнительное ограничение
                                  </Text>
                                  <Text className="text-muted-foreground mt-1 text-xs">
                                    Полив по расписанию сработает только если правило по датчику тоже
                                    выполняется
                                  </Text>
                                </View>
                              </View>
                            </View>
                          )}

                          <View className="gap-3">
                            {condition.rules.map((rule, ruleIndex) => {
                              const range = SENSOR_RANGES[rule.field];

                              return (
                                <View key={ruleIndex} className="bg-secondary/25 rounded-2xl p-4">
                                  <View className="mb-3 flex-row items-center justify-between">
                                    <Text className="text-foreground text-sm font-semibold">
                                      Правило {ruleIndex + 1}
                                    </Text>
                                    {condition.rules && condition.rules.length > 1 ? (
                                      <TouchableOpacity
                                        activeOpacity={0.85}
                                        onPress={() => removeRule(condition.id, ruleIndex)}>
                                        <View className="bg-destructive/8 flex-row items-center gap-1.5 rounded-2xl px-3 py-2">
                                          <Icon
                                            as={Trash2}
                                            size={13}
                                            className="text-destructive"
                                          />
                                          <Text className="text-destructive text-xs font-medium">
                                            Удалить
                                          </Text>
                                        </View>
                                      </TouchableOpacity>
                                    ) : null}
                                  </View>

                                  <Text className="text-muted-foreground mb-2 text-xs font-medium">
                                    Показатель
                                  </Text>
                                  <View className="flex-row gap-2">
                                    {SENSOR_OPTIONS.map((option) => (
                                      <ChoiceChip
                                        key={option.value}
                                        label={option.shortLabel}
                                        icon={option.icon}
                                        active={rule.field === option.value}
                                        onPress={() =>
                                          changeRuleField(condition.id, ruleIndex, option.value)
                                        }
                                      />
                                    ))}
                                  </View>

                                  <Text className="text-muted-foreground mt-4 mb-2 text-xs font-medium">
                                    Сравнение
                                  </Text>
                                  <View className="flex-row gap-2">
                                    {OP_OPTIONS.map((option) => (
                                      <ChoiceChip
                                        key={option.value}
                                        label={`${option.label} ${option.shortLabel}`}
                                        active={rule.operator === option.value}
                                        onPress={() =>
                                          updateRule(condition.id, ruleIndex, {
                                            operator: option.value,
                                          })
                                        }
                                      />
                                    ))}
                                  </View>

                                  <View className="bg-background mt-4 rounded-2xl p-4">
                                    <Text className="text-muted-foreground mb-2 text-xs font-medium">
                                      Порог срабатывания
                                    </Text>
                                    <Text className="text-foreground text-center text-2xl font-bold">
                                      {rule.value}
                                      {WATERING_SENSOR_UNITS[rule.field]}
                                    </Text>
                                    <Text className="text-muted-foreground mt-1 text-center text-xs">
                                      {describeRule(rule)}
                                    </Text>
                                    <Slider
                                      minimumValue={range.min}
                                      maximumValue={range.max}
                                      step={range.step}
                                      value={rule.value}
                                      onValueChange={(value) =>
                                        updateRule(condition.id, ruleIndex, {
                                          value: Math.round(value),
                                        })
                                      }
                                      minimumTrackTintColor="#16a34a"
                                      maximumTrackTintColor="#e5e7eb"
                                      style={{ marginTop: 12 }}
                                    />
                                    <View className="mt-1 flex-row justify-between">
                                      <Text className="text-muted-foreground text-xs">
                                        {range.min}
                                        {WATERING_SENSOR_UNITS[rule.field]}
                                      </Text>
                                      <Text className="text-muted-foreground text-xs">
                                        {range.max}
                                        {WATERING_SENSOR_UNITS[rule.field]}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              );
                            })}
                          </View>

                          <TouchableOpacity
                            activeOpacity={0.85}
                            onPress={() => addRule(condition.id)}>
                            <View className="border-primary/40 bg-primary/5 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-4">
                              <Icon as={Plus} size={16} className="text-primary" />
                              <Text className="text-primary text-sm font-semibold">
                                {isSensor
                                  ? 'Добавить ещё одно правило'
                                  : 'Добавить ещё одно ограничение'}
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </>
                      ) : null}

                      {condition.type === 'schedule' && condition.schedule ? (
                        <>
                          <View className="gap-3">
                            <View className="flex-row items-center justify-between">
                              <Text className="text-muted-foreground text-xs font-medium">
                                Время полива
                              </Text>
                              <Text className="text-muted-foreground text-xs">
                                До {MAX_SCHEDULE_TIMES} запусков в день
                              </Text>
                            </View>

                            {normalizeScheduleTimes(condition.schedule).map((time, timeIndex) => (
                              <View
                                key={`${condition.id}-time-${timeIndex}`}
                                className="bg-primary/8 flex-row items-center rounded-2xl p-4">
                                <TouchableOpacity
                                  className="flex-1"
                                  onPress={() => openTimePicker(condition.id, timeIndex)}
                                  activeOpacity={0.85}>
                                  <View className="flex-row items-center">
                                    <View className="bg-primary/15 rounded-2xl p-3">
                                      <Icon as={Clock} size={20} className="text-primary" />
                                    </View>
                                    <View className="ml-3 flex-1">
                                      <Text className="text-foreground text-sm font-semibold">
                                        Время {timeIndex + 1}
                                      </Text>
                                      <Text className="text-muted-foreground mt-1 text-xs">
                                        Нажмите, чтобы изменить время запуска
                                      </Text>
                                    </View>
                                    <Text className="text-primary text-3xl font-bold tracking-wide">
                                      {time}
                                    </Text>
                                  </View>
                                </TouchableOpacity>

                                {normalizeScheduleTimes(condition.schedule).length > 1 ? (
                                  <TouchableOpacity
                                    activeOpacity={0.85}
                                    onPress={() => removeScheduleTime(condition.id, timeIndex)}
                                    className="ml-3">
                                    <View className="bg-destructive/8 rounded-2xl p-3">
                                      <Icon as={Trash2} size={16} className="text-destructive" />
                                    </View>
                                  </TouchableOpacity>
                                ) : null}
                              </View>
                            ))}

                            {normalizeScheduleTimes(condition.schedule).length < MAX_SCHEDULE_TIMES ? (
                              <TouchableOpacity
                                activeOpacity={0.85}
                                onPress={() => addScheduleTime(condition.id)}>
                                <View className="border-primary/40 bg-primary/5 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-4">
                                  <Icon as={Plus} size={16} className="text-primary" />
                                  <Text className="text-primary text-sm font-semibold">
                                    Добавить ещё одно время
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            ) : null}
                          </View>

                          <View>
                            <Text className="text-muted-foreground mb-2 text-xs font-medium">
                              Быстрый выбор дней
                            </Text>
                            <View className="flex-row gap-2">
                              {DAY_PRESETS.map((preset) => (
                                <ChoiceChip
                                  key={preset.label}
                                  label={preset.label}
                                  active={sameDays(condition.schedule?.days || [], preset.days)}
                                  onPress={() => applyDayPreset(condition.id, preset.days)}
                                />
                              ))}
                            </View>
                          </View>

                          <View>
                            <Text className="text-muted-foreground mb-2 text-xs font-medium">
                              Дни недели
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                              {WATERING_DAY_OPTIONS.map(({ label, value }) => {
                                const isActive = condition.schedule?.days.includes(value);

                                return (
                                  <TouchableOpacity
                                    key={value}
                                    activeOpacity={0.85}
                                    onPress={() => toggleDay(condition.id, value)}
                                    style={{ width: '23%' }}>
                                    <View
                                      className={`items-center rounded-2xl border py-3 ${
                                        isActive
                                          ? 'bg-primary border-primary'
                                          : 'bg-secondary/45 border-border/70'
                                      }`}>
                                      <Text
                                        className={`text-sm font-semibold ${
                                          isActive ? 'text-primary-foreground' : 'text-foreground'
                                        }`}>
                                        {label}
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>

                          {(!condition.rules || condition.rules.length === 0) ? (
                            <TouchableOpacity
                              activeOpacity={0.85}
                              onPress={() => addRule(condition.id)}>
                              <View className="border-primary/40 bg-primary/5 flex-row items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-4">
                                <Icon as={Plus} size={16} className="text-primary" />
                                <Text className="text-primary text-sm font-semibold">
                                  Добавить ограничение по датчику
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ) : null}
                        </>
                      ) : null}
                    </View>
                  </View>
                </Animated.View>
              );
            })
          )}
        </View>
      </ScrollView>

      <View className="bg-background/95 absolute right-0 bottom-0 left-0 px-5 pt-3 pb-8">
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || enabledPlantConditions.length === 0}
          activeOpacity={0.88}>
          <View
            className={`flex-row items-center justify-center gap-2 rounded-2xl py-4 ${
              sending || enabledPlantConditions.length === 0 ? 'bg-muted' : 'bg-primary'
            }`}>
            <Icon as={Send} size={18} className="text-primary-foreground" />
            <Text className="text-primary-foreground text-base font-semibold">
              {sending ? 'Отправка...' : 'Сохранить и отправить'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {Platform.OS === 'ios' ? (
        <Dialog
          open={timePickerFor !== null}
          onOpenChange={(open) => {
            if (!open) cancelTimePick();
          }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Время полива</DialogTitle>
            </DialogHeader>
            {tempPickerTime ? (
              <DateTimePicker
                value={tempPickerTime}
                mode="time"
                is24Hour
                display="spinner"
                minuteInterval={1}
                onChange={onTimePick}
                style={{ height: 200 }}
              />
            ) : null}
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="secondary" onPress={cancelTimePick}>
                  <Text>Отмена</Text>
                </Button>
              </DialogClose>
              <Button onPress={confirmTimePick}>
                <Text className="text-primary-foreground">Готово</Text>
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      ) : null}

      {Platform.OS === 'android' && timePickerFor && tempPickerTime ? (
        <DateTimePicker
          value={tempPickerTime}
          mode="time"
          is24Hour
          display="default"
          minuteInterval={1}
          onChange={onTimePick}
        />
      ) : null}

      <Dialog
        open={intervalDialogFor !== null}
        onOpenChange={(open) => {
          if (!open) {
            setIntervalDialogFor(null);
          }
        }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Интервал проверки</DialogTitle>
          </DialogHeader>
          <View className="py-4">
            <Text className="text-foreground mb-4 text-center text-3xl font-bold">
              {formatInterval(tempInterval)}
            </Text>
            <Slider
              minimumValue={5}
              maximumValue={MAX_SENSOR_INTERVAL_MINUTES}
              step={5}
              value={tempInterval}
              onValueChange={setTempInterval}
              minimumTrackTintColor="#16a34a"
              maximumTrackTintColor="#e5e7eb"
            />
            <View className="mt-2 flex-row justify-between">
              <Text className="text-muted-foreground text-xs">5 мин</Text>
              <Text className="text-muted-foreground text-xs">6 ч</Text>
            </View>
          </View>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary">
                <Text>Отмена</Text>
              </Button>
            </DialogClose>
            <Button onPress={saveInterval}>
              <Text className="text-primary-foreground">Сохранить</Text>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </View>
  );
}
