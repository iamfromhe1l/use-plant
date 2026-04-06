import React from 'react';
import { View, ScrollView, TouchableOpacity } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/screen-header';
import { BottomBar } from '@/components/bottom-bar';
import {
  ChevronRight,
  Info,
  type LucideIcon,
} from 'lucide-react-native';

interface SettingsRowProps {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  onPress?: () => void;
  delay?: number;
}

function SettingsRow({ icon, iconBg, iconColor, title, subtitle, rightContent, onPress, delay = 0 }: SettingsRowProps) {
  return (
    <Animated.View entering={FadeInDown.delay(delay).springify()}>
      <TouchableOpacity
        activeOpacity={onPress ? 0.7 : 1}
        onPress={onPress}
      >
        <View className="flex-row items-center px-5 py-3.5 gap-4">
          <View className={`${iconBg} rounded-2xl p-2.5`}>
            <Icon as={icon} size={20} className={iconColor} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-medium text-foreground">{title}</Text>
            {subtitle && (
              <Text className="text-xs text-muted-foreground mt-0.5">{subtitle}</Text>
            )}
          </View>
          {rightContent || (onPress && (
            <Icon as={ChevronRight} size={18} className="text-muted-foreground" />
          ))}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <Text className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-5 pt-5 pb-1">
      {title}
    </Text>
  );
}

export default function SettingsScreen() {
  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Настройки" subtitle="Управление приложением" showBack={false} />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        <SectionHeader title="О приложении" />
        <View className="bg-card rounded-3xl mx-4 overflow-hidden">
          <SettingsRow
            icon={Info}
            iconBg="bg-gray-500/10"
            iconColor="text-gray-500"
            title="Версия"
            subtitle="usePlant v1.0.0"
            delay={50}
          />
        </View>
      </ScrollView>
      <BottomBar />
    </View>
  );
}
