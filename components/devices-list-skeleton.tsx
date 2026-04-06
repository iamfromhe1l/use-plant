import React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/ui/skeleton';

export const DevicesListSkeleton = () => {
  return (
    <SafeAreaView className="flex-1">
      {/* Header */}
      <View className="flex-row justify-between items-center pt-2 pb-4">
        <View className="gap-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-4 w-28 rounded-full" />
        </View>
        <Skeleton className="w-12 h-12 rounded-2xl" />
      </View>

      {/* Cards */}
      <View className="gap-4">
        {[1, 2].map((i) => (
          <View key={i} className="rounded-3xl bg-card overflow-hidden">
            <View className="p-5 gap-3">
              <View className="flex-row items-start justify-between">
                <Skeleton className="w-16 h-16 rounded-2xl" />
                <Skeleton className="h-7 w-20 rounded-full" />
              </View>
            </View>
            <View className="px-5 pb-5 gap-3">
              <View className="flex-row items-center justify-between">
                <View className="gap-2">
                  <Skeleton className="h-6 w-36 rounded-xl" />
                  <Skeleton className="h-4 w-24 rounded-full" />
                </View>
                <Skeleton className="w-10 h-10 rounded-2xl" />
              </View>
              <View className="flex-row gap-2">
                <Skeleton className="h-7 w-24 rounded-full" />
                <Skeleton className="h-7 w-24 rounded-full" />
              </View>
            </View>
          </View>
        ))}
      </View>
    </SafeAreaView>
  );
};
