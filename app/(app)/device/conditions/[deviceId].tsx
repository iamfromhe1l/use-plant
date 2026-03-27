import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
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
import { Toggle } from '@/components/ui/toggle';
import { ScreenHeader } from '@/components/screen-header';
import { WaterLevelBar } from '@/components/water-level-bar';
import {
  Plus,
  Trash2,
  Droplets,
  Thermometer,
  Wind,
  Clock,
  Send,
  AlertCircle,
} from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { CommandsApi } from '@/api/devices/commands';
import { useDevices } from '@/contexts/devices-context/devices-context';
import type {
  IWateringCondition,
  ISensorRule,
  SensorField,
  ComparisonOperator,
} from '@/api/devices/types/conditions';

const commandsApi = new CommandsApi();

const SENSOR_OPTIONS: { value: SensorField; label: string }[] = [
  { value: 'temperature', label: 'Температура' },
  { value: 'airHumidity', label: 'Влажн. воздуха' },
  { value: 'soilMoisture', label: 'Влажн. почвы' },
];

const SENSOR_UNITS: Record<SensorField, string> = {
  temperature: '°C',
  airHumidity: '%',
  soilMoisture: '%',
};

const SENSOR_RANGES: Record<SensorField, { min: number; max: number; step: number }> = {
  temperature: { min: -10, max: 60, step: 1 },
  airHumidity: { min: 0, max: 100, step: 1 },
  soilMoisture: { min: 0, max: 100, step: 1 },
};

const OP_OPTIONS: { value: ComparisonOperator; label: string }[] = [
  { value: 'lt', label: 'Меньше (<)' },
  { value: 'eq', label: 'Равно (=)' },
  { value: 'gt', label: 'Больше (>)' },
];

const DAY_LABELS = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

let nextId = 1;
function generateId() {
  return `cond_${Date.now()}_${nextId++}`;
}

function formatInterval(minutes: number): string {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h} ч ${m} мин` : `${h} ч`;
}

export default function ConditionsScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { devices } = useDevices();
  const device = devices.find((d) => d.deviceId === deviceId);
  const plants = device?.plants || [];

  const [conditions, setConditions] = useState<IWateringCondition[]>([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timePickerFor, setTimePickerFor] = useState<string | null>(null);
  const [intervalDialogFor, setIntervalDialogFor] = useState<string | null>(null);
  const [tempInterval, setTempInterval] = useState(60);

  const plantOptions = useMemo(
    () => plants.map((p) => ({ value: String(p.index), label: p.name })),
    [plants],
  );

  const addSensorCondition = () => {
    const firstPlantIndex = plants[0]?.index || 1;
    setConditions((prev) => [
      ...prev,
      {
        id: generateId(),
        plantIndex: firstPlantIndex,
        type: 'sensor',
        level: 5,
        interval: 60,
        rules: [{ field: 'soilMoisture', operator: 'lt', value: 30 }],
        enabled: true,
      },
    ]);
  };

  const addScheduleCondition = () => {
    const firstPlantIndex = plants[0]?.index || 1;
    setConditions((prev) => [
      ...prev,
      {
        id: generateId(),
        plantIndex: firstPlantIndex,
        type: 'schedule',
        level: 5,
        interval: 0,
        schedule: { time: '08:00', days: [1, 2, 3, 4, 5] },
        enabled: true,
      },
    ]);
  };

  const updateCondition = useCallback(
    (id: string, updates: Partial<IWateringCondition>) => {
      setConditions((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
      );
    },
    [],
  );

  const removeCondition = (id: string) => {
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const updateRule = (condId: string, ruleIdx: number, updates: Partial<ISensorRule>) => {
    setConditions((prev) =>
      prev.map((c) => {
        if (c.id !== condId || !c.rules) return c;
        const newRules = [...c.rules];
        newRules[ruleIdx] = { ...newRules[ruleIdx], ...updates };
        return { ...c, rules: newRules };
      }),
    );
  };

  const addRule = (condId: string) => {
    setConditions((prev) =>
      prev.map((c) => {
        if (c.id !== condId) return c;
        const rules = [
          ...(c.rules || []),
          { field: 'temperature' as SensorField, operator: 'gt' as ComparisonOperator, value: 25 },
        ];
        return { ...c, rules };
      }),
    );
  };

  const removeRule = (condId: string, ruleIdx: number) => {
    setConditions((prev) =>
      prev.map((c) => {
        if (c.id !== condId || !c.rules) return c;
        return { ...c, rules: c.rules.filter((_, i) => i !== ruleIdx) };
      }),
    );
  };

  const toggleDay = (condId: string, day: number) => {
    setConditions((prev) =>
      prev.map((c) => {
        if (c.id !== condId || !c.schedule) return c;
        const days = c.schedule.days.includes(day)
          ? c.schedule.days.filter((d) => d !== day)
          : [...c.schedule.days, day].sort();
        return { ...c, schedule: { ...c.schedule, days } };
      }),
    );
  };

  const handleSend = async () => {
    const enabledConditions = conditions.filter((c) => c.enabled);
    if (enabledConditions.length === 0) return;

    setSending(true);
    setError(null);
    const response = await commandsApi.sendCommand(deviceId, {
      type: 'set_conditions',
      payload: { conditions: enabledConditions },
    });
    setSending(false);

    if (!response.state) {
      setError(response.error?.message || 'Не удалось отправить условия');
    }
  };

  const onTimePick = (_: any, selected?: Date) => {
    if (Platform.OS !== 'ios') setTimePickerFor(null);
    if (!selected || !timePickerFor) return;
    const hours = String(selected.getHours()).padStart(2, '0');
    const minutes = String(selected.getMinutes()).padStart(2, '0');
    updateCondition(timePickerFor, {
      schedule: {
        ...conditions.find((c) => c.id === timePickerFor)!.schedule!,
        time: `${hours}:${minutes}`,
      },
    });
  };

  const openIntervalDialog = (condId: string) => {
    const cond = conditions.find((c) => c.id === condId);
    setTempInterval(cond?.interval || 60);
    setIntervalDialogFor(condId);
  };

  const saveInterval = () => {
    if (intervalDialogFor) {
      updateCondition(intervalDialogFor, { interval: tempInterval });
      setIntervalDialogFor(null);
    }
  };

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Условия полива" />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        <View className="px-6 pt-4">
          {/* Error alert */}
          {error && (
            <Alert icon={AlertCircle} variant="destructive" className="mb-4">
              <AlertTitle>Ошибка</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {conditions.length === 0 && (
            <View className="bg-card rounded-2xl p-6 items-center mb-4">
              <Text className="text-muted-foreground text-center">
                Нет условий полива.{'\n'}Добавьте условие по датчикам или расписанию.
              </Text>
            </View>
          )}

          {conditions.map((cond) => (
            <View key={cond.id} className="bg-card rounded-3xl p-5 mb-4">
              {/* Header row */}
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center gap-2">
                  <Icon
                    as={cond.type === 'sensor' ? Droplets : Clock}
                    size={18}
                    className="text-primary"
                  />
                  <Text className="text-base font-semibold text-foreground">
                    {cond.type === 'sensor' ? 'По датчикам' : 'По расписанию'}
                  </Text>
                </View>
                <View className="flex-row items-center gap-3">
                  <Switch
                    checked={cond.enabled}
                    onCheckedChange={(v) => updateCondition(cond.id, { enabled: v })}
                  />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <TouchableOpacity>
                        <Icon as={Trash2} size={18} className="text-destructive" />
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
                        <AlertDialogAction onPress={() => removeCondition(cond.id)}>
                          <Text>Удалить</Text>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </View>
              </View>

              <Separator className="mb-3" />

              {/* Plant selector */}
              <View className="mb-3">
                <Text className="text-xs text-muted-foreground mb-1.5">Растение</Text>
                <Select
                  value={plantOptions.find((o) => o.value === String(cond.plantIndex)) ?? undefined}
                  onValueChange={(opt) => {
                    if (opt) updateCondition(cond.id, { plantIndex: Number(opt.value) });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите растение" />
                  </SelectTrigger>
                  <SelectContent>
                    {plantOptions.map((o) => (
                      <SelectItem key={o.value} value={o.value} label={o.label}>
                        <Text>{o.label}</Text>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </View>

              {/* Level selector - unified design */}
              <View className="mb-3">
                <Text className="text-xs text-muted-foreground mb-1.5">
                  Степень полива: {cond.level}
                </Text>
                <WaterLevelBar
                  value={cond.level}
                  onChange={(val) => updateCondition(cond.id, { level: val })}
                />
              </View>

              {/* Sensor rules */}
              {cond.type === 'sensor' && (
                <>
                  {/* Interval via Dialog */}
                  <TouchableOpacity onPress={() => openIntervalDialog(cond.id)}>
                    <View className="flex-row items-center justify-between mb-3 bg-secondary/50 rounded-2xl p-3">
                      <Text className="text-sm text-foreground">Интервал</Text>
                      <Badge variant="outline">
                        <Text className="text-xs">{formatInterval(cond.interval)}</Text>
                      </Badge>
                    </View>
                  </TouchableOpacity>

                  {/* Rules */}
                  <View className="gap-3 mb-2">
                    {cond.rules?.map((rule, ruleIdx) => {
                      const range = SENSOR_RANGES[rule.field];
                      return (
                        <View
                          key={ruleIdx}
                          className="bg-secondary/30 rounded-2xl p-3"
                        >
                          <View className="flex-row items-center justify-between mb-2">
                            <Text className="text-xs text-muted-foreground">Условие {ruleIdx + 1}</Text>
                            {(cond.rules?.length || 0) > 1 && (
                              <TouchableOpacity onPress={() => removeRule(cond.id, ruleIdx)}>
                                <Icon as={Trash2} size={14} className="text-destructive" />
                              </TouchableOpacity>
                            )}
                          </View>

                          {/* Sensor select */}
                          <View className="mb-2">
                            <Select
                              value={SENSOR_OPTIONS.find((o) => o.value === rule.field)}
                              onValueChange={(opt) => {
                                if (opt) updateRule(cond.id, ruleIdx, { field: opt.value as SensorField });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Показатель" />
                              </SelectTrigger>
                              <SelectContent>
                                {SENSOR_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                                    <Text>{opt.label}</Text>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </View>

                          {/* Operator select */}
                          <View className="mb-3">
                            <Select
                              value={OP_OPTIONS.find((o) => o.value === rule.operator)}
                              onValueChange={(opt) => {
                                if (opt) updateRule(cond.id, ruleIdx, { operator: opt.value as ComparisonOperator });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Оператор" />
                              </SelectTrigger>
                              <SelectContent>
                                {OP_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} label={opt.label}>
                                    <Text>{opt.label}</Text>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </View>

                          {/* Value slider */}
                          <View>
                            <Text className="text-sm font-semibold text-foreground text-center mb-2">
                              {rule.value}{SENSOR_UNITS[rule.field]}
                            </Text>
                            <Slider
                              minimumValue={range.min}
                              maximumValue={range.max}
                              step={range.step}
                              value={rule.value}
                              onValueChange={(val) => updateRule(cond.id, ruleIdx, { value: Math.round(val) })}
                              minimumTrackTintColor="#16a34a"
                              maximumTrackTintColor="#e5e7eb"
                            />
                            <View className="flex-row justify-between mt-1">
                              <Text className="text-xs text-muted-foreground">{range.min}{SENSOR_UNITS[rule.field]}</Text>
                              <Text className="text-xs text-muted-foreground">{range.max}{SENSOR_UNITS[rule.field]}</Text>
                            </View>
                          </View>
                        </View>
                      );
                    })}
                  </View>

                  <TouchableOpacity onPress={() => addRule(cond.id)}>
                    <View className="flex-row items-center gap-1 py-1">
                      <Icon as={Plus} size={14} className="text-primary" />
                      <Text className="text-xs font-medium text-primary">Добавить условие</Text>
                    </View>
                  </TouchableOpacity>
                </>
              )}

              {/* Schedule */}
              {cond.type === 'schedule' && cond.schedule && (
                <>
                  {/* Time picker */}
                  <TouchableOpacity onPress={() => setTimePickerFor(cond.id)}>
                    <View className="bg-secondary/50 rounded-2xl p-3 flex-row items-center gap-3 mb-3">
                      <Icon as={Clock} size={18} className="text-primary" />
                      <Text className="text-2xl font-bold text-foreground">
                        {cond.schedule.time}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {/* Days of week with Toggle */}
                  <View className="flex-row gap-1.5">
                    {DAY_LABELS.map((label, dayIdx) => {
                      const isActive = cond.schedule!.days.includes(dayIdx);
                      return (
                        <Toggle
                          key={dayIdx}
                          pressed={isActive}
                          onPressedChange={() => toggleDay(cond.id, dayIdx)}
                          variant="outline"
                          size="sm"
                          className="flex-1 items-center justify-center"
                        >
                          <Text
                            className={`text-xs font-medium text-center ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
                          >
                            {label}
                          </Text>
                        </Toggle>
                      );
                    })}
                  </View>
                </>
              )}
            </View>
          ))}

          {/* Add buttons */}
          <View className="gap-3 mt-2">
            <Button
              variant="outline"
              className="flex-row items-center justify-center gap-2"
              onPress={addSensorCondition}
            >
              <Icon as={Droplets} size={16} className="text-foreground" />
              <Text className="text-sm font-medium text-foreground">По датчикам</Text>
            </Button>
            <Button
              variant="outline"
              className="flex-row items-center justify-center gap-2"
              onPress={addScheduleCondition}
            >
              <Icon as={Clock} size={16} className="text-foreground" />
              <Text className="text-sm font-medium text-foreground">По расписанию</Text>
            </Button>
          </View>
        </View>
      </ScrollView>

      {timePickerFor && (
        <DateTimePicker
          value={(() => {
            const cond = conditions.find((c) => c.id === timePickerFor);
            const [h, m] = (cond?.schedule?.time || '08:00').split(':').map(Number);
            const d = new Date();
            d.setHours(h, m, 0, 0);
            return d;
          })()}
          mode="time"
          is24Hour
          onChange={onTimePick}
        />
      )}

      {/* Interval dialog */}
      <Dialog
        open={intervalDialogFor !== null}
        onOpenChange={(open) => { if (!open) setIntervalDialogFor(null); }}
      >
        <DialogContent className="w-80">
          <DialogHeader>
            <DialogTitle>
              <Text>Интервал проверки</Text>
            </DialogTitle>
          </DialogHeader>
          <View className="py-4">
            <Text className="text-center text-2xl font-bold text-foreground mb-4">
              {formatInterval(tempInterval)}
            </Text>
            <Slider
              minimumValue={5}
              maximumValue={1440}
              step={5}
              value={tempInterval}
              onValueChange={setTempInterval}
              minimumTrackTintColor="#16a34a"
              maximumTrackTintColor="#e5e7eb"
            />
            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-muted-foreground">5 мин</Text>
              <Text className="text-xs text-muted-foreground">24 ч</Text>
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

      {/* Bottom send button - always visible */}
      <View className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-4 bg-background">
        <Button
          size="lg"
          className="flex-row items-center justify-center gap-2"
          onPress={handleSend}
          disabled={sending || conditions.length === 0}
        >
          <Icon as={Send} size={18} className="text-primary-foreground" />
          <Text className="text-base font-semibold text-primary-foreground">
            {sending ? 'Отправка...' : 'Отправить на устройство'}
          </Text>
        </Button>
      </View>
    </View>
  );
}
