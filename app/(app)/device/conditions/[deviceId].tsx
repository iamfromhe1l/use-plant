import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  ScrollView,
  TouchableOpacity,
  Platform,
  Modal,
  Switch as RNSwitch,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Slider from '@react-native-community/slider';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
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
import { Button } from '@/components/ui/button';
import { ScreenHeader } from '@/components/screen-header';
import { WaterLevelBar } from '@/components/water-level-bar';
import { ICON_MAP } from '@/consts/icons';
import {
  Plus,
  Trash2,
  Droplets,
  Thermometer,
  Wind,
  Clock,
  Send,
  AlertCircle,
  CheckCircle2,
  Leaf,
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
import * as Haptics from 'expo-haptics';

const commandsApi = new CommandsApi();

const SENSOR_OPTIONS: { value: SensorField; label: string; icon: React.ComponentType<any> }[] = [
  { value: 'temperature',  label: 'Температура',    icon: Thermometer },
  { value: 'airHumidity',  label: 'Влажн. воздуха', icon: Wind },
  { value: 'soilMoisture', label: 'Влажн. почвы',   icon: Droplets },
];

const SENSOR_UNITS: Record<SensorField, string> = {
  temperature:  '°C',
  airHumidity:  '%',
  soilMoisture: '%',
};

const SENSOR_RANGES: Record<SensorField, { min: number; max: number; step: number }> = {
  temperature:  { min: -10, max: 60,  step: 1 },
  airHumidity:  { min: 0,   max: 100, step: 1 },
  soilMoisture: { min: 0,   max: 100, step: 1 },
};

const OP_OPTIONS: { value: ComparisonOperator; label: string }[] = [
  { value: 'lt', label: 'Меньше (<)' },
  { value: 'eq', label: 'Равно (=)'  },
  { value: 'gt', label: 'Больше (>)' },
];

const DAY_LABELS = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const OP_SYMBOLS: Record<ComparisonOperator, string> = { lt: '<', eq: '=', gt: '>' };

let nextId = 1;
const generateId = () => `cond_${Date.now()}_${nextId++}`;

function formatInterval(minutes: number) {
  if (minutes < 60) return `${minutes} мин`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}ч ${m}м` : `${h} ч`;
}

// ─── Compact per-plant summary ─────────────────────────────────────────────
function PlantSummary({
  plants,
  conditions,
}: {
  plants: { index: number; name: string; icon: string }[];
  conditions: IWateringCondition[];
}) {
  if (conditions.length === 0) return null;

  return (
    <Animated.View entering={FadeInDown.delay(50).springify()} className="mb-6">
      <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
        Итог по растениям
      </Text>
      <View className="bg-card rounded-3xl overflow-hidden">
        {plants.map((plant, pi) => {
          const PlantIcon = ICON_MAP[plant.icon] || Leaf;
          const plantConds = conditions.filter((c) => c.plantIndex === plant.index && c.enabled);

          return (
            <View key={plant.index}>
              {pi > 0 && <View className="h-px bg-border mx-4" />}
              <View className="px-4 py-3.5">
                <View className="flex-row items-center gap-2 mb-2">
                  <View className="bg-primary/10 rounded-xl p-1.5">
                    <Icon as={PlantIcon} size={14} className="text-primary" />
                  </View>
                  <Text className="text-sm font-semibold text-foreground">{plant.name}</Text>
                  {plantConds.length > 0 && (
                    <View className="ml-auto bg-primary/10 rounded-full px-2 py-0.5">
                      <Text className="text-xs font-medium text-primary">
                        {plantConds.length} усл.
                      </Text>
                    </View>
                  )}
                </View>

                {plantConds.length === 0 ? (
                  <Text className="text-xs text-muted-foreground pl-1">Нет активных условий</Text>
                ) : (
                  <View className="gap-1">
                    {plantConds.map((cond) => (
                      <View key={cond.id} className="flex-row items-start gap-2">
                        <Icon
                          as={cond.type === 'sensor' ? Droplets : Clock}
                          size={11}
                          className="text-muted-foreground mt-0.5"
                        />
                        {cond.type === 'sensor' && cond.rules && (
                          <Text className="text-xs text-muted-foreground flex-1">
                            {cond.rules.map((r) =>
                              `${SENSOR_OPTIONS.find((o) => o.value === r.field)?.label} ${OP_SYMBOLS[r.operator]} ${r.value}${SENSOR_UNITS[r.field]}`
                            ).join(' & ')} → ур.{cond.level}
                            {cond.interval > 0 ? ` / ${formatInterval(cond.interval)}` : ''}
                          </Text>
                        )}
                        {cond.type === 'schedule' && cond.schedule && (
                          <Text className="text-xs text-muted-foreground flex-1">
                            {cond.schedule.time}  {cond.schedule.days.map((d) => DAY_LABELS[d]).join(' ')} → ур.{cond.level}
                          </Text>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>
    </Animated.View>
  );
}

// ─── Main screen ───────────────────────────────────────────────────────────
export default function ConditionsScreen() {
  const { deviceId } = useLocalSearchParams<{ deviceId: string }>();
  const { devices } = useDevices();
  const device = devices.find((d) => d.deviceId === deviceId);
  const plants = device?.plants || [];

  const [conditions, setConditions]       = useState<IWateringCondition[]>([]);
  const [sending, setSending]             = useState(false);
  const [sent, setSent]                   = useState(false);
  const [error, setError]                 = useState<string | null>(null);
  const [timePickerFor, setTimePickerFor] = useState<string | null>(null);
  const [tempPickerTime, setTempPickerTime] = useState<Date | null>(null);
  const [intervalDialogFor, setIntervalDialogFor] = useState<string | null>(null);
  const [tempInterval, setTempInterval]   = useState(60);

  const plantOptions = useMemo(
    () => plants.map((p) => ({ value: String(p.index), label: p.name })),
    [plants],
  );

  // ── Condition CRUD ────────────────────────────────────────────────
  const addSensorCondition = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const firstPlantIndex = plants[0]?.index || 1;
    setConditions((prev) => [...prev, {
      id: generateId(), plantIndex: firstPlantIndex, type: 'sensor',
      level: 5, interval: 60, rules: [{ field: 'soilMoisture', operator: 'lt', value: 30 }], enabled: true,
    }]);
  };

  const addScheduleCondition = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const firstPlantIndex = plants[0]?.index || 1;
    setConditions((prev) => [...prev, {
      id: generateId(), plantIndex: firstPlantIndex, type: 'schedule',
      level: 5, interval: 0, schedule: { time: '08:00', days: [1, 2, 3, 4, 5] }, enabled: true,
    }]);
  };

  const updateCondition = useCallback((id: string, updates: Partial<IWateringCondition>) => {
    setConditions((prev) => prev.map((c) => c.id === id ? { ...c, ...updates } : c));
  }, []);

  const removeCondition = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConditions((prev) => prev.filter((c) => c.id !== id));
  };

  const updateRule = (condId: string, ruleIdx: number, updates: Partial<ISensorRule>) => {
    setConditions((prev) => prev.map((c) => {
      if (c.id !== condId || !c.rules) return c;
      const newRules = [...c.rules];
      newRules[ruleIdx] = { ...newRules[ruleIdx], ...updates };
      return { ...c, rules: newRules };
    }));
  };

  const addRule = (condId: string) => {
    setConditions((prev) => prev.map((c) => {
      if (c.id !== condId) return c;
      return { ...c, rules: [...(c.rules || []), { field: 'temperature' as SensorField, operator: 'gt' as ComparisonOperator, value: 25 }] };
    }));
  };

  const removeRule = (condId: string, ruleIdx: number) => {
    setConditions((prev) => prev.map((c) => {
      if (c.id !== condId || !c.rules) return c;
      return { ...c, rules: c.rules.filter((_, i) => i !== ruleIdx) };
    }));
  };

  const toggleDay = (condId: string, day: number) => {
    setConditions((prev) => prev.map((c) => {
      if (c.id !== condId || !c.schedule) return c;
      const days = c.schedule.days.includes(day)
        ? c.schedule.days.filter((d) => d !== day)
        : [...c.schedule.days, day].sort();
      return { ...c, schedule: { ...c.schedule, days } };
    }));
  };

  // ── Send ──────────────────────────────────────────────────────────
  const handleSend = async () => {
    const enabledConditions = conditions.filter((c) => c.enabled);
    if (enabledConditions.length === 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setSending(true);
    setError(null);
    setSent(false);
    const response = await commandsApi.sendCommand(deviceId, {
      type: 'set_conditions',
      payload: { conditions: enabledConditions },
    });
    setSending(false);
    if (response.state) {
      setSent(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => setSent(false), 3000);
    } else {
      setError(response.error?.message || 'Не удалось отправить условия');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    }
  };

  // ── Time picker ───────────────────────────────────────────────────
  const openTimePicker = (condId: string) => {
    const cond = conditions.find((c) => c.id === condId);
    const [h, m] = (cond?.schedule?.time || '08:00').split(':').map(Number);
    const d = new Date();
    d.setHours(h, m, 0, 0);
    setTempPickerTime(d);
    setTimePickerFor(condId);
  };

  const applyTimePick = (condId: string, date: Date) => {
    const hours   = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    updateCondition(condId, {
      schedule: { ...conditions.find((c) => c.id === condId)!.schedule!, time: `${hours}:${minutes}` },
    });
  };

  const onTimePick = (_: any, selected?: Date) => {
    if (Platform.OS === 'android') {
      setTimePickerFor(null); setTempPickerTime(null);
      if (selected && timePickerFor) applyTimePick(timePickerFor, selected);
    } else {
      if (selected) setTempPickerTime(selected);
    }
  };

  const confirmTimePick = () => {
    if (timePickerFor && tempPickerTime) applyTimePick(timePickerFor, tempPickerTime);
    setTimePickerFor(null); setTempPickerTime(null);
  };

  const cancelTimePick = () => { setTimePickerFor(null); setTempPickerTime(null); };

  // ── Interval dialog ───────────────────────────────────────────────
  const openIntervalDialog = (condId: string) => {
    setTempInterval(conditions.find((c) => c.id === condId)?.interval || 60);
    setIntervalDialogFor(condId);
  };

  const saveInterval = () => {
    if (intervalDialogFor) { updateCondition(intervalDialogFor, { interval: tempInterval }); setIntervalDialogFor(null); }
  };

  // ── Render ────────────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Условия полива" subtitle="Автоматический полив" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <View className="px-5 pt-4 gap-4">

          {/* Status messages */}
          {error && (
            <Animated.View entering={FadeIn} className="bg-destructive/10 rounded-2xl p-4 flex-row items-center gap-3">
              <Icon as={AlertCircle} size={16} className="text-destructive" />
              <Text className="text-sm text-destructive flex-1">{error}</Text>
            </Animated.View>
          )}
          {sent && (
            <Animated.View entering={FadeIn} className="bg-emerald-500/10 rounded-2xl p-4 flex-row items-center gap-3">
              <Icon as={CheckCircle2} size={16} className="text-emerald-600" />
              <Text className="text-sm text-emerald-700 flex-1">Условия отправлены на устройство!</Text>
            </Animated.View>
          )}

          {/* Empty state */}
          {conditions.length === 0 && (
            <Animated.View entering={FadeIn} className="bg-card rounded-3xl p-8 items-center gap-2">
              <View className="bg-primary/10 rounded-full p-4 mb-2">
                <Icon as={Droplets} size={32} className="text-primary" />
              </View>
              <Text className="text-base font-semibold text-foreground">Нет условий полива</Text>
              <Text className="text-sm text-muted-foreground text-center">
                Добавьте условие по датчикам или расписанию
              </Text>
            </Animated.View>
          )}

          {/* Condition cards */}
          {conditions.map((cond, condIdx) => {
            const plantLabel = plantOptions.find((o) => o.value === String(cond.plantIndex))?.label || '—';
            return (
              <Animated.View
                key={cond.id}
                entering={FadeInDown.delay(condIdx * 60).springify()}
              >
                <View className="bg-card rounded-3xl overflow-hidden">
                  {/* Card header */}
                  <View
                    className={`px-4 py-3 flex-row items-center justify-between ${
                      cond.type === 'sensor' ? 'bg-sky-500/8' : 'bg-purple-500/8'
                    }`}
                  >
                    <View className="flex-row items-center gap-2">
                      <View className={`rounded-xl p-2 ${cond.type === 'sensor' ? 'bg-sky-500/15' : 'bg-purple-500/15'}`}>
                        <Icon
                          as={cond.type === 'sensor' ? Droplets : Clock}
                          size={16}
                          className={cond.type === 'sensor' ? 'text-sky-600' : 'text-purple-600'}
                        />
                      </View>
                      <Text className="text-base font-semibold text-foreground">
                        {cond.type === 'sensor' ? 'По датчикам' : 'По расписанию'}
                      </Text>
                      <Text className="text-xs text-muted-foreground">· {plantLabel}</Text>
                    </View>
                    <View className="flex-row items-center gap-3">
                      <RNSwitch
                        value={cond.enabled}
                        onValueChange={(v) => updateCondition(cond.id, { enabled: v })}
                        trackColor={{ false: '#e5e7eb', true: '#16a34a' }}
                        thumbColor="#fff"
                        style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                      />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <TouchableOpacity>
                            <Icon as={Trash2} size={16} className="text-destructive/70" />
                          </TouchableOpacity>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle><Text>Удалить условие?</Text></AlertDialogTitle>
                            <AlertDialogDescription><Text>Это действие нельзя отменить.</Text></AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel><Text>Отмена</Text></AlertDialogCancel>
                            <AlertDialogAction onPress={() => removeCondition(cond.id)}><Text>Удалить</Text></AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </View>
                  </View>

                  <View className="px-4 py-4 gap-4">
                    {/* Plant selector */}
                    <View>
                      <Text className="text-xs font-medium text-muted-foreground mb-1.5">Растение</Text>
                      <Select
                        value={plantOptions.find((o) => o.value === String(cond.plantIndex)) ?? undefined}
                        onValueChange={(opt) => { if (opt) updateCondition(cond.id, { plantIndex: Number(opt.value) }); }}
                      >
                        <SelectTrigger className="rounded-2xl"><SelectValue placeholder="Выберите растение" /></SelectTrigger>
                        <SelectContent>
                          {plantOptions.map((o) => (
                            <SelectItem key={o.value} value={o.value} label={o.label}><Text>{o.label}</Text></SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </View>

                    {/* Water level */}
                    <View>
                      <Text className="text-xs font-medium text-muted-foreground mb-2">
                        Уровень полива: <Text className="text-foreground font-semibold">{cond.level}</Text>
                      </Text>
                      <WaterLevelBar
                        value={cond.level}
                        onChange={(val) => updateCondition(cond.id, { level: val })}
                      />
                    </View>

                    {/* ── Sensor type ─────────────────────────── */}
                    {cond.type === 'sensor' && (
                      <>
                        {/* Interval */}
                        <TouchableOpacity onPress={() => openIntervalDialog(cond.id)} activeOpacity={0.8}>
                          <View className="bg-secondary/40 rounded-2xl p-3.5 flex-row items-center justify-between">
                            <View className="flex-row items-center gap-2">
                              <Icon as={Clock} size={15} className="text-muted-foreground" />
                              <Text className="text-sm text-foreground">Интервал проверки</Text>
                            </View>
                            <View className="bg-primary/10 rounded-full px-3 py-1">
                              <Text className="text-xs font-semibold text-primary">{formatInterval(cond.interval)}</Text>
                            </View>
                          </View>
                        </TouchableOpacity>

                        {/* Rules */}
                        <View className="gap-3">
                          {cond.rules?.map((rule, ruleIdx) => {
                            const range = SENSOR_RANGES[rule.field];
                            return (
                              <View key={ruleIdx} className="bg-secondary/30 rounded-2xl p-3.5">
                                <View className="flex-row items-center justify-between mb-2.5">
                                  <Text className="text-xs font-semibold text-muted-foreground">Условие {ruleIdx + 1}</Text>
                                  {(cond.rules?.length || 0) > 1 && (
                                    <TouchableOpacity onPress={() => removeRule(cond.id, ruleIdx)}>
                                      <Icon as={Trash2} size={13} className="text-destructive/70" />
                                    </TouchableOpacity>
                                  )}
                                </View>

                                <View className="gap-2">
                                  <Select
                                    value={SENSOR_OPTIONS.find((o) => o.value === rule.field)}
                                    onValueChange={(opt) => { if (opt) updateRule(cond.id, ruleIdx, { field: opt.value as SensorField }); }}
                                  >
                                    <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Показатель" /></SelectTrigger>
                                    <SelectContent>
                                      {SENSOR_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} label={opt.label}><Text>{opt.label}</Text></SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>

                                  <Select
                                    value={OP_OPTIONS.find((o) => o.value === rule.operator)}
                                    onValueChange={(opt) => { if (opt) updateRule(cond.id, ruleIdx, { operator: opt.value as ComparisonOperator }); }}
                                  >
                                    <SelectTrigger className="rounded-xl h-10"><SelectValue placeholder="Оператор" /></SelectTrigger>
                                    <SelectContent>
                                      {OP_OPTIONS.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value} label={opt.label}><Text>{opt.label}</Text></SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </View>

                                <View className="mt-3">
                                  <Text className="text-center text-xl font-bold text-foreground mb-2">
                                    {rule.value}{SENSOR_UNITS[rule.field]}
                                  </Text>
                                  <Slider
                                    minimumValue={range.min} maximumValue={range.max} step={range.step}
                                    value={rule.value}
                                    onValueChange={(val) => updateRule(cond.id, ruleIdx, { value: Math.round(val) })}
                                    minimumTrackTintColor="#16a34a" maximumTrackTintColor="#e5e7eb"
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

                        <TouchableOpacity onPress={() => addRule(cond.id)} activeOpacity={0.8}>
                          <View className="flex-row items-center gap-1.5 py-1">
                            <Icon as={Plus} size={14} className="text-primary" />
                            <Text className="text-sm font-medium text-primary">Добавить условие</Text>
                          </View>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* ── Schedule type ────────────────────────── */}
                    {cond.type === 'schedule' && cond.schedule && (
                      <>
                        {/* Time picker button */}
                        <TouchableOpacity onPress={() => openTimePicker(cond.id)} activeOpacity={0.85}>
                          <View className="bg-primary/8 rounded-2xl p-4 flex-row items-center gap-4">
                            <View className="bg-primary/15 rounded-xl p-2.5">
                              <Icon as={Clock} size={20} className="text-primary" />
                            </View>
                            <Text className="text-3xl font-bold text-primary tracking-wide">
                              {cond.schedule.time}
                            </Text>
                            <Text className="text-xs text-muted-foreground ml-auto">Нажмите изменить</Text>
                          </View>
                        </TouchableOpacity>

                        {/* Day toggles */}
                        <View>
                          <Text className="text-xs font-medium text-muted-foreground mb-2">Дни недели</Text>
                          <View className="flex-row gap-1.5">
                            {DAY_LABELS.map((label, dayIdx) => {
                              const isActive = cond.schedule!.days.includes(dayIdx);
                              return (
                                <TouchableOpacity
                                  key={dayIdx}
                                  className="flex-1"
                                  onPress={() => toggleDay(cond.id, dayIdx)}
                                  activeOpacity={0.8}
                                >
                                  <View
                                    className={`items-center py-2 rounded-xl ${
                                      isActive ? 'bg-primary' : 'bg-secondary/50'
                                    }`}
                                  >
                                    <Text
                                      className={`text-xs font-semibold ${
                                        isActive ? 'text-primary-foreground' : 'text-muted-foreground'
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
                    )}
                  </View>
                </View>
              </Animated.View>
            );
          })}

          {/* Add buttons */}
          <Animated.View entering={FadeInDown.delay(200).springify()} className="flex-row gap-3 mt-1">
            <TouchableOpacity className="flex-1" onPress={addSensorCondition} activeOpacity={0.85}>
              <View className="bg-sky-500/10 border border-sky-500/20 rounded-2xl py-3.5 flex-row items-center justify-center gap-2">
                <Icon as={Droplets} size={16} className="text-sky-600" />
                <Text className="text-sm font-semibold text-sky-700">По датчикам</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity className="flex-1" onPress={addScheduleCondition} activeOpacity={0.85}>
              <View className="bg-purple-500/10 border border-purple-500/20 rounded-2xl py-3.5 flex-row items-center justify-center gap-2">
                <Icon as={Clock} size={16} className="text-purple-600" />
                <Text className="text-sm font-semibold text-purple-700">По расписанию</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>

          {/* Per-plant summary */}
          {plants.length > 0 && conditions.length > 0 && (
            <PlantSummary plants={plants} conditions={conditions} />
          )}
        </View>
      </ScrollView>

      {/* Fixed send button */}
      <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-3 bg-background/95">
        <TouchableOpacity
          onPress={handleSend}
          disabled={sending || conditions.filter((c) => c.enabled).length === 0}
          activeOpacity={0.88}
        >
          <View
            className={`rounded-2xl py-4 flex-row items-center justify-center gap-2 ${
              sending || conditions.filter((c) => c.enabled).length === 0
                ? 'bg-muted'
                : 'bg-primary'
            }`}
          >
            <Icon as={Send} size={18} className="text-primary-foreground" />
            <Text className="text-base font-semibold text-primary-foreground">
              {sending ? 'Отправка...' : 'Отправить на устройство'}
            </Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* ── iOS time picker modal ──────────────────────────────────── */}
      {Platform.OS === 'ios' && (
        <Modal visible={timePickerFor !== null} transparent animationType="slide">
          <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.35)' }}>
            <View className="bg-card rounded-t-3xl pb-10">
              <View className="flex-row items-center justify-between px-6 pt-4 pb-2">
                <TouchableOpacity onPress={cancelTimePick}>
                  <Text className="text-base text-muted-foreground">Отмена</Text>
                </TouchableOpacity>
                <Text className="text-base font-semibold text-foreground">Время полива</Text>
                <TouchableOpacity onPress={confirmTimePick}>
                  <Text className="text-base font-semibold text-primary">Готово</Text>
                </TouchableOpacity>
              </View>
              {tempPickerTime && (
                <DateTimePicker
                  value={tempPickerTime} mode="time" is24Hour display="spinner"
                  onChange={onTimePick} style={{ height: 200 }}
                />
              )}
            </View>
          </View>
        </Modal>
      )}
      {Platform.OS === 'android' && timePickerFor && tempPickerTime && (
        <DateTimePicker value={tempPickerTime} mode="time" is24Hour display="default" onChange={onTimePick} />
      )}

      {/* ── Interval dialog ────────────────────────────────────────── */}
      <Dialog
        open={intervalDialogFor !== null}
        onOpenChange={(open) => { if (!open) setIntervalDialogFor(null); }}
      >
        <DialogContent className="w-80">
          <DialogHeader>
            <DialogTitle><Text>Интервал проверки</Text></DialogTitle>
          </DialogHeader>
          <View className="py-4">
            <Text className="text-center text-3xl font-bold text-foreground mb-4">
              {formatInterval(tempInterval)}
            </Text>
            <Slider
              minimumValue={5} maximumValue={1440} step={5}
              value={tempInterval} onValueChange={setTempInterval}
              minimumTrackTintColor="#16a34a" maximumTrackTintColor="#e5e7eb"
            />
            <View className="flex-row justify-between mt-2">
              <Text className="text-xs text-muted-foreground">5 мин</Text>
              <Text className="text-xs text-muted-foreground">24 ч</Text>
            </View>
          </View>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="secondary"><Text>Отмена</Text></Button>
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
