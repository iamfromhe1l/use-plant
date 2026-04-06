import React from 'react';
import { View, ScrollView, TouchableOpacity, Switch as RNSwitch } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ScreenHeader } from '@/components/screen-header';
import {
  Bell,
  Moon,
  Globe,
  Shield,
  HelpCircle,
  MessageSquare,
  ChevronRight,
  Wifi,
  Clock,
  Droplets,
  Info,
} from 'lucide-react-native';

interface SettingsRowProps {
  icon: React.ComponentType<any>;
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

function Divider() {
  return <View className="h-px bg-border mx-5" />;
}

export default function SettingsScreen() {
  const [notifications, setNotifications] = React.useState(true);
  const [darkMode, setDarkMode] = React.useState(false);
  const [autoWatering, setAutoWatering] = React.useState(true);

  return (
    <View className="flex-1 bg-background">
      <ScreenHeader title="Настройки" subtitle="Управление приложением" />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>

        {/* Уведомления */}
        <SectionHeader title="Уведомления" />
        <View className="bg-card rounded-3xl mx-4 overflow-hidden">
          <SettingsRow
            icon={Bell}
            iconBg="bg-orange-500/10"
            iconColor="text-orange-500"
            title="Push-уведомления"
            subtitle="Напоминания о поливе и состоянии"
            delay={50}
            rightContent={
              <RNSwitch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: '#e5e7eb', true: '#16a34a' }}
                thumbColor="#fff"
              />
            }
          />
          <Divider />
          <SettingsRow
            icon={Clock}
            iconBg="bg-blue-500/10"
            iconColor="text-blue-500"
            title="Расписание уведомлений"
            subtitle="08:00 — 22:00"
            delay={100}
            onPress={() => {}}
          />
        </View>

        {/* Устройства */}
        <SectionHeader title="Устройства" />
        <View className="bg-card rounded-3xl mx-4 overflow-hidden">
          <SettingsRow
            icon={Droplets}
            iconBg="bg-emerald-500/10"
            iconColor="text-emerald-500"
            title="Автополив"
            subtitle="Выполнять условия автоматически"
            delay={150}
            rightContent={
              <RNSwitch
                value={autoWatering}
                onValueChange={setAutoWatering}
                trackColor={{ false: '#e5e7eb', true: '#16a34a' }}
                thumbColor="#fff"
              />
            }
          />
          <Divider />
          <SettingsRow
            icon={Wifi}
            iconBg="bg-sky-500/10"
            iconColor="text-sky-500"
            title="Интервал опроса"
            subtitle="Каждые 60 секунд"
            delay={200}
            onPress={() => {}}
          />
        </View>

        {/* Внешний вид */}
        <SectionHeader title="Внешний вид" />
        <View className="bg-card rounded-3xl mx-4 overflow-hidden">
          <SettingsRow
            icon={Moon}
            iconBg="bg-indigo-500/10"
            iconColor="text-indigo-500"
            title="Тёмная тема"
            subtitle="Применить тёмный режим"
            delay={250}
            rightContent={
              <RNSwitch
                value={darkMode}
                onValueChange={setDarkMode}
                trackColor={{ false: '#e5e7eb', true: '#16a34a' }}
                thumbColor="#fff"
              />
            }
          />
          <Divider />
          <SettingsRow
            icon={Globe}
            iconBg="bg-purple-500/10"
            iconColor="text-purple-500"
            title="Язык"
            subtitle="Русский"
            delay={300}
            onPress={() => {}}
          />
        </View>

        {/* Поддержка */}
        <SectionHeader title="Поддержка" />
        <View className="bg-card rounded-3xl mx-4 overflow-hidden">
          <SettingsRow
            icon={HelpCircle}
            iconBg="bg-amber-500/10"
            iconColor="text-amber-500"
            title="Помощь"
            subtitle="Документация и FAQ"
            delay={350}
            onPress={() => {}}
          />
          <Divider />
          <SettingsRow
            icon={MessageSquare}
            iconBg="bg-teal-500/10"
            iconColor="text-teal-500"
            title="Обратная связь"
            subtitle="Сообщить о проблеме"
            delay={400}
            onPress={() => {}}
          />
          <Divider />
          <SettingsRow
            icon={Shield}
            iconBg="bg-slate-500/10"
            iconColor="text-slate-500"
            title="Политика конфиденциальности"
            delay={450}
            onPress={() => {}}
          />
        </View>

        {/* О приложении */}
        <SectionHeader title="О приложении" />
        <View className="bg-card rounded-3xl mx-4 overflow-hidden">
          <SettingsRow
            icon={Info}
            iconBg="bg-gray-500/10"
            iconColor="text-gray-500"
            title="Версия"
            subtitle="usePlant v1.0.0"
            delay={500}
          />
        </View>

        <View className="items-center mt-6 mb-4">
          <Text className="text-xs text-muted-foreground">usePlant © 2025</Text>
        </View>
      </ScrollView>
    </View>
  );
}
