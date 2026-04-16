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
  leftContent?: React.ReactNode;
  rightContent?: React.ReactNode;
  showBack?: boolean;
}

export function ScreenHeader({
  title,
  subtitle,
  leftContent,
  rightContent,
  showBack = true,
}: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-card rounded-b-3xl px-6 pb-4" style={{ paddingTop: insets.top + 4 }}>
      <View className="flex-row items-center justify-between">
        <View className="w-11 items-start">
          {leftContent ? (
            leftContent
          ) : showBack ? (
            <TouchableOpacity
              onPress={() => router.back()}
              className="bg-background/70 rounded-2xl p-2.5"
              activeOpacity={0.7}>
              <Icon as={ArrowLeft} size={20} className="text-foreground" />
            </TouchableOpacity>
          ) : (
            <View style={{ width: 40, height: 40 }} />
          )}
        </View>

        <View className="mx-3 flex-1 items-center">
          <Text className="text-foreground text-lg font-bold" numberOfLines={1}>
            {title}
          </Text>
          {subtitle && <Text className="text-muted-foreground mt-0.5 text-xs">{subtitle}</Text>}
        </View>

        <View className="w-11 items-end">
          {rightContent || <View style={{ width: 40, height: 40 }} />}
        </View>
      </View>
    </View>
  );
}
