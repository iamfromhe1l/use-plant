import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import { router } from 'expo-router';
import { Leaf, Calendar, Droplets, Plus, Zap, type LucideIcon } from 'lucide-react-native';
import * as React from 'react';
import { TouchableOpacity, View } from 'react-native';
import Animated, { FadeInDown, FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

function FeatureRow({
  icon,
  bg,
  color,
  title,
  subtitle,
  delay,
}: {
  icon: LucideIcon;
  bg: string;
  color: string;
  title: string;
  subtitle: string;
  delay: number;
}) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <View className="bg-card flex-row items-center gap-4 rounded-3xl p-4">
        <View className={`${bg} rounded-2xl p-3`}>
          <Icon as={icon} size={22} className={color} />
        </View>
        <View className="flex-1">
          <Text className="text-foreground text-base font-semibold">{title}</Text>
          <Text className="text-muted-foreground mt-0.5 text-sm">{subtitle}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

export const Welcome = () => {
  const handleAddPlant = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(app)/connect');
  };

  return (
    <View className="flex-1 justify-center gap-5">
      {/* Hero */}
      <Animated.View entering={FadeIn.delay(50)} className="items-center gap-3 py-4">
        <View className="bg-primary/10 mb-1 rounded-full p-8">
          <Icon as={Leaf} size={56} className="text-primary" />
        </View>
        <Text className="text-foreground text-4xl font-extrabold">usePlant</Text>
        <Text className="text-muted-foreground px-6 text-center text-base">
          Умный уход за растениями — полив, контроль и расписание в одном месте
        </Text>
      </Animated.View>

      {/* Features */}
      <View className="gap-3">
        <FeatureRow
          icon={Calendar}
          bg="bg-blue-500/10"
          color="text-blue-600"
          title="График полива"
          subtitle="Автоматически по расписанию"
          delay={150}
        />
        <FeatureRow
          icon={Droplets}
          bg="bg-emerald-500/10"
          color="text-emerald-600"
          title="Умные датчики"
          subtitle="Влажность, температура, почва"
          delay={220}
        />
        <FeatureRow
          icon={Zap}
          bg="bg-purple-500/10"
          color="text-purple-600"
          title="Автополив"
          subtitle="Условия по данным датчиков"
          delay={290}
        />
      </View>

      {/* CTA */}
      <Animated.View entering={FadeInDown.delay(380).springify()}>
        <TouchableOpacity onPress={handleAddPlant} activeOpacity={0.85}>
          <View className="bg-primary flex-row items-center justify-center gap-2 rounded-3xl py-4">
            <Icon as={Plus} size={20} className="text-primary-foreground" />
            <Text className="text-primary-foreground text-base font-bold">Добавить устройство</Text>
          </View>
        </TouchableOpacity>
        <Text className="text-muted-foreground mt-3 text-center text-xs">
          Подключите устройство и начните заботу о растениях
        </Text>
      </Animated.View>
    </View>
  );
};
