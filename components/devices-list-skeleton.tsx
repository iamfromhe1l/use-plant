import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Skeleton } from '@/components/ui/skeleton';

export const DevicesListSkeleton = () => {
  return (
    <SafeAreaView className="flex-1 px-6">
      <View className="flex-row justify-between items-center py-2">
        <Skeleton className="h-10 w-56 rounded-xl" />
        <Skeleton className="size-12 rounded-full" />
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View className="gap-6 pt-6 pb-32">
          {[1, 2].map((i) => (
            <View key={i} className="rounded-3xl bg-card p-6">
              <View className="items-center pb-4">
                <Skeleton className="w-28 h-28 rounded-full" />
              </View>
              <View className="gap-2">
                <Skeleton className="h-6 w-40 rounded-xl" />
                <Skeleton className="h-4 w-28 rounded-full" />
                <View className="flex-row gap-2 mt-2">
                  <Skeleton className="h-6 w-24 rounded-full" />
                  <Skeleton className="h-6 w-24 rounded-full" />
                </View>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
