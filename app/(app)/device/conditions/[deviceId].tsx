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
  WATERING_DAY_LABELS,
  WATERING_SENSOR_UNITS,
} from '@/lib/watering-conditions';

const commandsApi = new CommandsApi();

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
  if (left.length !== right.length) return false;
  return left.every((day, index) => day === right[index]);
}

function describeRule(rule: ISensorRule) {
  const sensorLabel = SENSOR_OPTIONS.find((option) => option.value === rule.field)?.label ?? 'Датчик';
  const operatorLabel = OP_OPTIONS.find((option) => option.value === rule.operator)?.label.toLowerCase() ?? '';
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
        className={`rounded-2xl px-3 py-3 items-center justify-center gap-1.5 border ${
          active
            ? 'bg-primary border-primary'
            : 'bg-secondary/45 border-border/70'
        }`}
      >
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
          }`}
        >
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
          <View className="rounded-2xl bg-background/70 p-3">
            <Icon as={icon} size={20} className={iconClassName} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-semibold text-foreground">{title}</Text>
            <Text className="text-sm text-muted-foreground mt-1">{description}</Text>
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
  const { devices } = useDevices();
  const device = devices.find((item) => item.deviceId === deviceId);
  const plants = device?.plants || [];
  const selectedPlantIndex = Number(plantIndexParam || plants[0]?.index || 1);
  const selectedPlant = plants.find((plant) => plant.index === selectedPlantIndex) || plants[0] || null;
  const PlantIcon = selectedPlant ? (ICON_MAP[selectedPlant.icon] || Leaf) : Leaf;
  const storageKey = getWateringConditionsStorageKey(deviceId);

  const [conditions, setConditions] = useState<IWateringCondition[]>([]);
  const [draftLoaded, setDraftLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [timePickerFor, setTimePickerFor] = useState<string | null>(null);
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
          setConditions(Array.isArray(parsed) ? parsed : []);
        } else {
          setConditions([]);
        }
      } catch {
        if (active) {
          setConditions([]);
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
  }, [storageKey]);

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
        schedule: { time: '08:00', days: [1, 2, 3, 4, 5] },
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
          : [...condition.schedule.days, day].sort();

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
              schedule: { ...condition.schedule, days },
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
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      toast.success(`Условия для ${selectedPlant.name} отправлены на устройство`);
      return;
    }

    toast.error(response.error?.message || 'Не удалось отправить условия');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
  };

  const openTimePicker = (conditionId: string) => {
    const condition = conditions.find((item) => item.id === conditionId);
    const [hours, minutes] = (condition?.schedule?.time || '08:00').split(':').map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    setTempPickerTime(date);
    setTimePickerFor(conditionId);
  };

  const applyTimePick = (conditionId: string, date: Date) => {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');

    updateCondition(conditionId, {
      schedule: {
        ...conditions.find((condition) => condition.id === conditionId)?.schedule!,
        time: `${hours}:${minutes}`,
      },
    });
  };

  const onTimePick = (_: unknown, selected?: Date) => {
    if (Platform.OS === 'android') {
      const targetConditionId = timePickerFor;
      setTimePickerFor(null);
      setTempPickerTime(null);

      if (selected && targetConditionId) {
        applyTimePick(targetConditionId, selected);
      }

      return;
    }

    if (selected) {
      setTempPickerTime(selected);
    }
  };

  const confirmTimePick = () => {
    if (timePickerFor && tempPickerTime) {
      applyTimePick(timePickerFor, tempPickerTime);
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
      <View className="flex-1 bg-background">
        <ScreenHeader title="Условия полива" subtitle={device?.name || 'Устройство'} />
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-muted-foreground">Нет растений для настройки</Text>
        </View>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader
        title="Условия полива"
        subtitle={`${device?.name || 'Устройство'} • ${selectedPlant.name}`}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 136 }}>
        <View className="px-5 pt-4 gap-4">
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
            <Animated.View entering={FadeIn} className="bg-card rounded-3xl p-8 items-center gap-3">
              <View className="bg-primary/10 rounded-full p-4">
                <Icon as={PlantIcon} size={30} className="text-primary" />
              </View>
              <Text className="text-base font-semibold text-foreground">
                Для {selectedPlant.name} пока нет условий
              </Text>
              <Text className="text-sm text-muted-foreground text-center">
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
                  entering={FadeInDown.delay(100 + conditionIndex * 60).springify()}
                >
                  <View className="bg-card rounded-3xl overflow-hidden">
                    <View
                      className={`px-4 py-4 border-b border-border/50 ${
                        isSensor ? 'bg-sky-500/6' : 'bg-violet-500/6'
                      }`}
                    >
                      <View className="flex-row items-start gap-3">
                        <View
                          className={`rounded-2xl p-2.5 ${
                            isSensor ? 'bg-sky-500/14' : 'bg-violet-500/14'
                          }`}
                        >
                          <Icon
                            as={isSensor ? Droplets : Clock}
                            size={18}
                            className={isSensor ? 'text-sky-600' : 'text-violet-600'}
                          />
                        </View>

                        <View className="flex-1">
                          <Text className="text-base font-semibold text-foreground">
                            {isSensor ? 'Полив по датчикам' : 'Полив по расписанию'}
                          </Text>
                          <Text className="text-sm text-muted-foreground mt-1">
                            {describeWateringCondition(condition)}
                          </Text>
                        </View>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <TouchableOpacity activeOpacity={0.85}>
                              <View className="bg-destructive/8 rounded-2xl px-3 py-2 flex-row items-center gap-1.5">
                                <Icon as={Trash2} size={14} className="text-destructive" />
                                <Text className="text-sm font-medium text-destructive">Удалить</Text>
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
                        className="mt-4"
                      >
                        <View className="bg-background rounded-2xl px-4 py-3 flex-row items-center">
                          <View className="flex-1">
                            <Text className="text-sm font-semibold text-foreground">
                              {condition.enabled ? 'Условие включено' : 'Условие выключено'}
                            </Text>
                            <Text className="text-xs text-muted-foreground mt-1">
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

                    <View className="px-4 py-4 gap-4">
                      <View>
                        <Text className="text-xs font-medium text-muted-foreground mb-2">
                          Интенсивность полива
                        </Text>
                        <View className="bg-secondary/30 rounded-2xl p-4">
                          <View className="flex-row items-center justify-between mb-3">
                            <Text className="text-sm text-foreground">Уровень</Text>
                            <View className="bg-primary/10 rounded-full px-3 py-1">
                              <Text className="text-xs font-semibold text-primary">
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

                      {isSensor && condition.rules ? (
                        <>
                          <TouchableOpacity
                            onPress={() => openIntervalDialog(condition.id)}
                            activeOpacity={0.85}
                          >
                            <View className="bg-secondary/30 rounded-2xl px-4 py-4 flex-row items-center">
                              <View className="bg-primary/10 rounded-2xl p-3">
                                <Icon as={Clock} size={18} className="text-primary" />
                              </View>
                              <View className="flex-1 ml-3">
                                <Text className="text-sm font-semibold text-foreground">
                                  Интервал проверки
                                </Text>
                                <Text className="text-xs text-muted-foreground mt-1">
                                  Как часто устройство сравнивает датчики с условиями
                                </Text>
                              </View>
                              <View className="bg-primary/10 rounded-full px-3 py-1.5">
                                <Text className="text-xs font-semibold text-primary">
                                  {formatInterval(condition.interval)}
                                </Text>
                              </View>
                            </View>
                          </TouchableOpacity>

                          <View className="gap-3">
                            {condition.rules.map((rule, ruleIndex) => {
                              const range = SENSOR_RANGES[rule.field];

                              return (
                                <View key={ruleIndex} className="bg-secondary/25 rounded-2xl p-4">
                                  <View className="flex-row items-center justify-between mb-3">
                                    <Text className="text-sm font-semibold text-foreground">
                                      Правило {ruleIndex + 1}
                                    </Text>
                                    {condition.rules && condition.rules.length > 1 ? (
                                      <TouchableOpacity
                                        activeOpacity={0.85}
                                        onPress={() => removeRule(condition.id, ruleIndex)}
                                      >
                                        <View className="bg-destructive/8 rounded-2xl px-3 py-2 flex-row items-center gap-1.5">
                                          <Icon as={Trash2} size={13} className="text-destructive" />
                                          <Text className="text-xs font-medium text-destructive">
                                            Удалить
                                          </Text>
                                        </View>
                                      </TouchableOpacity>
                                    ) : null}
                                  </View>

                                  <Text className="text-xs font-medium text-muted-foreground mb-2">
                                    Показатель
                                  </Text>
                                  <View className="flex-row gap-2">
                                    {SENSOR_OPTIONS.map((option) => (
                                      <ChoiceChip
                                        key={option.value}
                                        label={option.shortLabel}
                                        icon={option.icon}
                                        active={rule.field === option.value}
                                        onPress={() => changeRuleField(condition.id, ruleIndex, option.value)}
                                      />
                                    ))}
                                  </View>

                                  <Text className="text-xs font-medium text-muted-foreground mt-4 mb-2">
                                    Сравнение
                                  </Text>
                                  <View className="flex-row gap-2">
                                    {OP_OPTIONS.map((option) => (
                                      <ChoiceChip
                                        key={option.value}
                                        label={`${option.label} ${option.shortLabel}`}
                                        active={rule.operator === option.value}
                                        onPress={() =>
                                          updateRule(condition.id, ruleIndex, { operator: option.value })
                                        }
                                      />
                                    ))}
                                  </View>

                                  <View className="mt-4 bg-background rounded-2xl p-4">
                                    <Text className="text-xs font-medium text-muted-foreground mb-2">
                                      Порог срабатывания
                                    </Text>
                                    <Text className="text-center text-2xl font-bold text-foreground">
                                      {rule.value}
                                      {WATERING_SENSOR_UNITS[rule.field]}
                                    </Text>
                                    <Text className="text-center text-xs text-muted-foreground mt-1">
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
                                    <View className="flex-row justify-between mt-1">
                                      <Text className="text-xs text-muted-foreground">
                                        {range.min}
                                        {WATERING_SENSOR_UNITS[rule.field]}
                                      </Text>
                                      <Text className="text-xs text-muted-foreground">
                                        {range.max}
                                        {WATERING_SENSOR_UNITS[rule.field]}
                                      </Text>
                                    </View>
                                  </View>
                                </View>
                              );
                            })}
                          </View>

                          <TouchableOpacity activeOpacity={0.85} onPress={() => addRule(condition.id)}>
                            <View className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 px-4 py-4 flex-row items-center justify-center gap-2">
                              <Icon as={Plus} size={16} className="text-primary" />
                              <Text className="text-sm font-semibold text-primary">
                                Добавить ещё одно правило
                              </Text>
                            </View>
                          </TouchableOpacity>
                        </>
                      ) : null}

                      {condition.type === 'schedule' && condition.schedule ? (
                        <>
                          <TouchableOpacity
                            onPress={() => openTimePicker(condition.id)}
                            activeOpacity={0.85}
                          >
                            <View className="bg-primary/8 rounded-2xl p-4 flex-row items-center">
                              <View className="bg-primary/15 rounded-2xl p-3">
                                <Icon as={Clock} size={20} className="text-primary" />
                              </View>
                              <View className="flex-1 ml-3">
                                <Text className="text-sm font-semibold text-foreground">
                                  Время полива
                                </Text>
                                <Text className="text-xs text-muted-foreground mt-1">
                                  Нажмите, чтобы изменить время запуска
                                </Text>
                              </View>
                              <Text className="text-3xl font-bold text-primary tracking-wide">
                                {condition.schedule.time}
                              </Text>
                            </View>
                          </TouchableOpacity>

                          <View>
                            <Text className="text-xs font-medium text-muted-foreground mb-2">
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
                            <Text className="text-xs font-medium text-muted-foreground mb-2">
                              Дни недели
                            </Text>
                            <View className="flex-row flex-wrap gap-2">
                              {WATERING_DAY_LABELS.map((label, dayIndex) => {
                                const isActive = condition.schedule?.days.includes(dayIndex);

                                return (
                                  <TouchableOpacity
                                    key={label}
                                    activeOpacity={0.85}
                                    onPress={() => toggleDay(condition.id, dayIndex)}
                                    style={{ width: '23%' }}
                                  >
                                    <View
                                      className={`rounded-2xl py-3 items-center border ${
                                        isActive
                                          ? 'bg-primary border-primary'
                                          : 'bg-secondary/45 border-border/70'
                                      }`}
                                    >
                                      <Text
                                        className={`text-sm font-semibold ${
                                          isActive ? 'text-primary-foreground' : 'text-foreground'
                                        }`}
                                      >
                                        {label}
                                      </Text>
                                    </View>
                                  </TouchableOpacity>
                                );
                              })}
                            </View>
                          </View>
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

      <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-3 bg-background/95">
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || enabledPlantConditions.length === 0}
          activeOpacity={0.88}
        >
          <View
            className={`rounded-2xl py-4 flex-row items-center justify-center gap-2 ${
              sending || enabledPlantConditions.length === 0 ? 'bg-muted' : 'bg-primary'
            }`}
          >
            <Icon as={Send} size={18} className="text-primary-foreground" />
            <Text className="text-base font-semibold text-primary-foreground">
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
          }}
        >
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
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Интервал проверки</DialogTitle>
          </DialogHeader>
          <View className="py-4">
            <Text className="text-center text-3xl font-bold text-foreground mb-4">
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
            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-muted-foreground">5 мин</Text>
              <Text className="text-xs text-muted-foreground">6 ч</Text>
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
