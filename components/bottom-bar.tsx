import { View, Pressable } from 'react-native'
import { router, usePathname } from 'expo-router'
import { Icon } from '@/components/ui/icon'
import { Leaf, Settings, User } from 'lucide-react-native'
import { cn } from '@/lib/utils'

export function BottomBar() {
  const pathname = usePathname()

  const tabs = [
    {
      icon: Settings,
      route: '/settings',
    },
    {
      icon: Leaf,
      route: '/',
    },
    {
      icon: User,
      route: '/profile',
    },
  ]

  return (
    <View className="absolute bottom-6 left-0 right-0 items-center">
      <View className="flex-row items-center gap-6 rounded-full bg-card px-6 py-3 shadow-lg">
        {tabs.map((tab, index) => {
          const active = pathname === tab.route

          return (
            <Pressable
              key={index}
              onPress={() => router.push(tab.route)}
              className={cn(
                'items-center justify-center rounded-full',
                index === 1 ? 'bg-primary p-4' : 'p-3'
              )}
            >
              <Icon
                as={tab.icon}
                size={index === 1 ? 26 : 22}
                className={cn(
                  index === 1
                    ? 'text-primary-foreground'
                    : active
                      ? 'text-primary'
                      : 'text-muted-foreground'
                )}
              />
            </Pressable>
          )
        })}
      </View>
    </View>
  )
}
