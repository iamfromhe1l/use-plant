import React from 'react'
import { View, TouchableOpacity, ScrollView } from 'react-native'
import Animated, { FadeInDown } from 'react-native-reanimated'
import { Text } from '@/components/ui/text'
import { Icon } from '@/components/ui/icon'
import { User, LogOut, Mail, Leaf } from 'lucide-react-native'
import { useAuth } from '@/contexts/auth-context/auth-context'
import { BottomBar } from '@/components/bottom-bar'
import { ScreenHeader } from '@/components/screen-header'
import * as Haptics from 'expo-haptics'

export default function ProfileScreen() {
  const { session, signOut } = useAuth()
  const user = session?.user

  if (!user) return null;

  const handleSignOut = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
    signOut()
  }

  return (
    <View className='flex-1 bg-background'>
      <ScreenHeader title="Профиль" subtitle="Аккаунт и безопасность" showBack={false} />

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Avatar card */}
        <Animated.View entering={FadeInDown.delay(50).springify()} className="mx-6 mt-5 mb-4">
          <View className="bg-card rounded-3xl p-5 flex-row items-center gap-4">
            <View className="bg-primary/10 rounded-full p-5">
              <Icon as={User} size={36} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-foreground">{user.name}</Text>
              <View className="flex-row items-center gap-1.5 mt-1">
                <Icon as={Mail} size={12} className="text-muted-foreground" />
                <Text className="text-sm text-muted-foreground">{user.email}</Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Stats */}
        <Animated.View entering={FadeInDown.delay(100).springify()} className="mx-6 mb-4">
          <View className="bg-primary/8 rounded-3xl p-5 flex-row items-center gap-4">
            <View className="bg-primary/15 rounded-2xl p-3">
              <Icon as={Leaf} size={22} className="text-primary" />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-muted-foreground">Статус аккаунта</Text>
              <Text className="text-base font-semibold text-foreground">Активен</Text>
            </View>
            <View className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
          </View>
        </Animated.View>

        <View className="flex-1" />
        <Animated.View entering={FadeInDown.delay(150).springify()} className="mx-6 mt-2 mb-4">
          <TouchableOpacity
            onPress={handleSignOut}
            activeOpacity={0.8}
          >
            <View className="bg-destructive/10 rounded-3xl py-4 flex-row items-center justify-center gap-2">
              <Icon as={LogOut} size={18} className="text-destructive" />
              <Text className="text-base font-semibold text-destructive">Выйти из аккаунта</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      </ScrollView>
      <BottomBar />
    </View>
  )
}
