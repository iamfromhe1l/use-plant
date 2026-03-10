import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { Leaf, Calendar, Droplets, Sprout, Plus } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { Card, CardContent, CardTitle, CardDescription } from '@/components/ui/card';

export const Welcome = () => {
  const handleAddPlant = () => {
    router.push('/(app)/connect');
  };

  return (
    <View className="flex-1 items-center justify-center gap-8">
      <View className="items-center gap-4">
        <View className="rounded-full bg-primary/10 p-6">
          <Icon as={Leaf} size={48} className="text-primary" />
        </View>
        <Text className="text-4xl font-extrabold text-foreground">usePlant</Text>
        <Text className="text-center font-semibold text-lg text-muted-foreground">
          Заботьтесь о своих растениях с умом
        </Text>
      </View>
      <Card className="w-full">
        <CardContent className="flex-row items-center gap-4 px-4 py-0">
          <View className="rounded-full bg-blue-100 p-3 dark:bg-blue-900">
            <Icon as={Calendar} size={24} className="text-blue-600 dark:text-blue-300" />
          </View>
          <View className="flex-1">
            <CardTitle className="text-lg">График полива</CardTitle>
            <CardDescription>
              Никогда не забывайте поливать свои растения
            </CardDescription>
          </View>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardContent className="flex-row items-center gap-4 px-4 py-0">
          <View className="rounded-full bg-green-100 p-3 dark:bg-green-900">
            <Icon as={Droplets} size={24} className="text-green-600 dark:text-green-300" />
          </View>
          <View className="flex-1">
            <CardTitle className="text-lg">Умные датчики</CardTitle>
            <CardDescription>
              Влажность почвы, освещение, температура и другие показатели
            </CardDescription>
          </View>
        </CardContent>
      </Card>
      <Card className="w-full">
        <CardContent className="flex-row items-center gap-4 px-4 py-0">
          <View className="rounded-full bg-purple-100 p-3 dark:bg-purple-900">
            <Icon as={Sprout} size={24} className="text-purple-600 dark:text-purple-300" />
          </View>
          <View className="flex-1">
            <CardTitle className="text-lg">Автополив</CardTitle>
            <CardDescription>
              Настройка автоматического полива по расписанию
            </CardDescription>
          </View>
        </CardContent>
      </Card>
      <View className="w-full gap-2">
        <Button
          size="lg"
          className="w-full"
          onPress={handleAddPlant}
        >
          <Icon as={Plus} size={20} className="text-primary-foreground" />
          <Text className="font-semibold text-primary-foreground">
            Добавить устройство
          </Text>
        </Button>
        <Text className="text-center text-sm text-muted-foreground">
          Подключите устройство и начните заботу
        </Text>
      </View>
    </View>
  );
}
