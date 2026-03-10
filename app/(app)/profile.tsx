import React from 'react'
import { View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { Text } from '@/components/ui/text'
import { Icon } from '@/components/ui/icon'
import { Button } from '@/components/ui/button'
import { User, LogOut } from 'lucide-react-native'
import { useAuth } from '@/contexts/auth-context/auth-context'
import { BottomBar } from '@/components/bottom-bar'

export default function ProfileScreen() {
  const { session, signOut } = useAuth()

  const user = session?.user

  if (!user) {
    return null;
  }

  return (
    <View className='flex-1 p-6'>
      <SafeAreaView>
        <View className="items-center gap-4 py-6">
          <View className="rounded-full bg-primary/10 p-6">
            <Icon as={User} size={48} className="text-primary" />
          </View>
          <Text className="text-3xl font-extrabold text-foreground">
            {user.name}
          </Text>
          <Text className="text-muted-foreground">
            {user.email}
          </Text>
        </View>
        <Button
          variant="destructive"
          onPress={signOut}
        >
          <Icon as={LogOut} size={18} className="text-destructive-foreground" />
          <Text className="text-destructive-foreground font-semibold">
            Выйти
          </Text>
        </Button>
      </SafeAreaView>
      <BottomBar />
    </View>
  )
}
