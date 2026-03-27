import React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { ArrowLeft } from 'lucide-react-native';

interface ScreenHeaderProps {
  title: string;
  rightContent?: React.ReactNode;
}

export function ScreenHeader({ title, rightContent }: ScreenHeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View className="bg-card px-6 pb-4 rounded-b-3xl" style={{ paddingTop: insets.top }}>
      <View className="flex-row items-center justify-between">
        <Button size="icon" variant="ghost" onPress={() => router.back()}>
          <Icon as={ArrowLeft} size={24} className="text-card-foreground" />
        </Button>
        <Text className="text-lg font-bold text-card-foreground">{title}</Text>
        {rightContent || <View style={{ width: 40 }} />}
      </View>
    </View>
  );
}
