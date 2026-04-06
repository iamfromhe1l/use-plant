import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { ArrowLeft } from 'lucide-react-native';

interface ScreenHeaderProps {
  title: string;
  subtitle?: string;
  rightContent?: React.ReactNode;
  showBack?: boolean;
}

export function ScreenHeader({ title, subtitle, rightContent, showBack = true }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      className="bg-card px-6 pb-4 rounded-b-3xl"
      style={{ paddingTop: insets.top + 4 }}
    >
      <View className="flex-row items-center justify-between">
        <View className="w-11 items-start">
          {showBack ? (
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-background/70 rounded-2xl p-2.5"
              activeOpacity={0.7}
            >
              <Icon as={ArrowLeft} size={20} className="text-foreground" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40, height: 40 }} />
          )}
        </View>

        <View className="flex-1 items-center mx-3">
          <Text className="text-lg font-bold text-foreground" numberOfLines={1}>
            {title}
          </Text>
          {subtitle && (
            <Text className="text-xs text-muted-foreground mt-0.5">{subtitle}</Text>
          )}
        </View>

        <View className="w-11 items-end">
          {rightContent || <View style={{ width: 40, height: 40 }} />}
        </View>
      </View>
    </View>
  );
}
