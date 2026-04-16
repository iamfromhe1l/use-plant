import React, { useCallback, useMemo, useState } from 'react';
import { View, ScrollView, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { Stack, router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import * as Network from 'expo-network';
import { useDeviceLocal } from '@/contexts/device-local-context/device-local-context';
import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { toast } from '@/components/ui/toast';
import { ScreenHeader } from '@/components/screen-header';
import { Wifi, Lock, Unlock, RefreshCw, Radio, ChevronRight } from 'lucide-react-native';
import { cn } from '@/lib/utils';

export default function ConnectDeviceScreen() {
  const { device, actions } = useDeviceLocal();
  const [step, setStep] = useState<'find' | 'networks' | 'password'>('find');
  const [selectedNetwork, setSelectedNetwork] = useState<{ ssid: string; encrypted: boolean } | null>(null);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isAutoSearching, setIsAutoSearching] = useState(false);

  const availableNetworks = useMemo(() => {
    const bySsid = new Map<string, (typeof device.networks)[number]>();

    device.networks
      .filter((network) => network.ssid.trim().length > 0)
      .sort((left, right) => right.rssi - left.rssi)
      .forEach((network) => {
        if (!bySsid.has(network.ssid)) {
          bySsid.set(network.ssid, network);
        }
      });

    return Array.from(bySsid.values());
  }, [device.networks]);

  const findDevice = async (automatic = false) => {
    setIsAutoSearching(automatic);

    try {
      const phoneIp = await Network.getIpAddressAsync();
      const ipParts = phoneIp.split('.');

      if (ipParts.length !== 4) {
        toast.error('Не удалось определить IP адрес телефона');
        return;
      }

      const baseIp = `${ipParts[0]}.${ipParts[1]}.${ipParts[2]}`;
      const possibleIps = ['192.168.4.1', `${baseIp}.1`, `${baseIp}.100`, `${baseIp}.101`];

      for (const ip of possibleIps) {
        const connected = await actions.connectToDevice(ip);
        if (connected) {
          await actions.scanNetworks();
          setStep('networks');
          return;
        }
      }

      toast.error(
        automatic
          ? 'Автопоиск не нашёл устройство. Подключитесь к сети настройки «PlantWatering-ESP32» и вернитесь в приложение, поиск повторится автоматически.'
          : 'Устройство не найдено. Убедитесь, что телефон подключен к Wi‑Fi сети устройства.'
      );
    } catch {
      toast.error(
        automatic
          ? 'Не удалось автоматически найти устройство. Проверьте подключение к сети настройки «PlantWatering-ESP32».'
          : 'Ошибка при поиске устройства'
      );
    } finally {
      setIsAutoSearching(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (step === 'find') {
        void findDevice(true);
      }
    }, [step])
  );

  const handleSelectNetwork = (network: { ssid: string; encrypted: boolean }) => {
    setSelectedNetwork(network);
    setStep('password');
  };

  const handleConfigure = async () => {
    if (!selectedNetwork) return;

    const success = await actions.configureDevice(selectedNetwork.ssid, password);

    if (success) {
      toast.success('Настройки сохранены. Устройство перезагружается и подключится к вашей Wi‑Fi сети.');
      setTimeout(() => {
        router.push('/(app)');
      }, 3000);
    } else {
      toast.error('Ошибка сохранения настроек');
    }
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScreenHeader title="Подключение" subtitle="Подключите устройство к домашней сети" />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
      <ScrollView className="flex-1 bg-background" keyboardShouldPersistTaps="handled">
        <View className="p-6 gap-6">
          <View className="items-center gap-2">
            <View className="rounded-full bg-primary/10 p-4">
              <Icon as={Radio} size={32} className="text-primary" />
            </View>
            <Text className="text-2xl font-bold">Подключение устройства</Text>
            <Text className="text-center text-muted-foreground">
              Настройте подключение к вашей Wi-Fi сети
            </Text>
          </View>
          {step === 'find' && (
            <Card>
              <CardHeader>
                <CardTitle>Шаг 1 из 3</CardTitle>
                <CardDescription>Поиск устройства в сети</CardDescription>
              </CardHeader>
              <CardContent className="gap-4">
                <View className="bg-muted/30 rounded-lg p-4 gap-2">
                  <Text className="font-medium">Инструкция:</Text>
                  <Text className="text-sm text-muted-foreground">
                    1. Откройте настройки Wi-Fi на телефоне
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    2. Подключитесь к сети настройки устройства «PlantWatering-ESP32»
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    3. Вернитесь в приложение и нажмите "Найти устройство"
                  </Text>
                  <Text className="text-sm text-muted-foreground">
                    Поиск запускается автоматически, когда экран открывается или вы возвращаетесь в приложение
                  </Text>
                </View>

                <Button
                  size="lg"
                  onPress={() => findDevice(false)}
                  disabled={device.loading || isAutoSearching}
                  className="flex-row items-center gap-2"
                >
                  {device.loading || isAutoSearching ? (
                    <ActivityIndicator size="small" color="white" />
                  ) : (
                    <Icon as={Radio} size={20} className="text-background" />
                  )}
                  <Text>{isAutoSearching ? 'Ищем устройство...' : 'Найти устройство'}</Text>
                </Button>
              </CardContent>
            </Card>
          )}
          {step === 'networks' && (
            <Card>
              <CardHeader>
                <CardTitle>Шаг 2 из 3</CardTitle>
                <CardDescription>
                  Найдено {availableNetworks.length} Wi-Fi сетей
                </CardDescription>
              </CardHeader>
              <CardContent className="gap-4">
                <Button
                  variant="outline"
                  onPress={actions.scanNetworks}
                  disabled={device.loading}
                  className="flex-row items-center gap-2"
                >
                  {device.loading ? (
                    <ActivityIndicator size="small" />
                  ) : (
                    <Icon as={RefreshCw} size={16} />
                  )}
                  <Text>Обновить список</Text>
                </Button>
                {availableNetworks.length > 0 ? (
                  <View className="gap-2">
                    {availableNetworks.map((network) => {
                      return (
                        <Button
                          key={network.ssid}
                          variant="outline"
                          onPress={() => handleSelectNetwork(network)}
                          className="flex-row items-center justify-between p-2 h-fit"
                        >
                          <View className="flex-row items-center gap-3 flex-1">
                            <View className="w-8 h-8 rounded-full bg-muted items-center justify-center">
                              <Icon
                                as={network.encrypted ? Lock : Unlock}
                                size={16}
                                className={network.encrypted ? 'text-muted-foreground' : 'text-green-500'}
                              />
                            </View>
                            <View className="flex-1">
                              <Text className="font-medium">{network.ssid}</Text>
                              <View className="flex-row items-center gap-1">
                                <Icon as={Wifi} size={12} className="text-muted-foreground" />
                                <Text className="text-xs text-muted-foreground">
                                  {network.rssi} dBm
                                </Text>
                              </View>
                            </View>
                          </View>
                          <Icon as={ChevronRight} size={20} className="text-muted-foreground" />
                        </Button>
                      );
                    })}
                  </View>
                ) : (
                  <View className="items-center py-8 gap-2">
                    <Icon as={Wifi} size={32} className="text-muted-foreground" />
                    <Text className="text-muted-foreground">Сети не найдены</Text>
                  </View>
                )}
              </CardContent>
            </Card>
          )}
          {step === 'password' && selectedNetwork && (
            <Card>
              <CardHeader>
                <CardTitle>Шаг 3 из 3</CardTitle>
                <CardDescription>
                  Подключение к {selectedNetwork.ssid}
                </CardDescription>
              </CardHeader>
              <CardContent className="gap-4">
                <View className="bg-muted/30 rounded-lg p-4 items-center gap-2">
                  <View className="w-12 h-12 rounded-full bg-primary/10 items-center justify-center">
                    <Icon as={selectedNetwork.encrypted ? Lock : Unlock} size={24} className="text-primary" />
                  </View>
                  <Text className="font-medium">{selectedNetwork.ssid}</Text>
                </View>
                {selectedNetwork.encrypted && (
                  <View className="relative">
                    <Input
                      placeholder="Пароль от Wi-Fi"
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={!showPassword}
                      editable={!device.loading}
                      className="pr-20"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0"
                      onPress={() => setShowPassword(!showPassword)}
                    >
                      <Text className="text-sm">{showPassword ? 'Скрыть' : 'Показать'}</Text>
                    </Button>
                  </View>
                )}
                <View className="flex-row gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onPress={() => {
                      setSelectedNetwork(null);
                      setStep('networks');
                      setPassword('');
                    }}
                  >
                    <Text>Назад</Text>
                  </Button>
                  <Button
                    className="flex-1"
                    onPress={handleConfigure}
                    disabled={(selectedNetwork.encrypted && !password) || device.loading}
                  >
                    {device.loading ? (
                      <ActivityIndicator size="small" color="white" />
                    ) : (
                      <Text>Подключить</Text>
                    )}
                  </Button>
                </View>
              </CardContent>
            </Card>
          )}
          <View className="flex-row justify-center gap-2">
            {['find', 'networks', 'password'].map(s => (
              <View
                key={s}
                className={cn("h-2 w-2 rounded-full bg-muted", {
                  'bg-primary w-4': s === step
                })}
              />
            ))}
          </View>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>
    </>
  );
}
