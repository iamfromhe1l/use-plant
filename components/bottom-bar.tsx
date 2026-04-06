import { View, Pressable } from 'react-native'
import { router, usePathname } from 'expo-router'
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
} from 'react-native-reanimated'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { Text } from '@/components/ui/text'
import { Icon } from '@/components/ui/icon'
import { Leaf, Settings, User } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'

const TABS = [
  { icon: Settings, label: 'Настройки', route: '/(app)/settings' },
  { icon: Leaf,     label: 'Главная',   route: '/',               isCenter: true },
  { icon: User,     label: 'Профиль',   route: '/profile' },
]

function TabItem({
  icon,
  label,
  route,
  isCenter,
  active,
}: {
  icon: React.ComponentType<any>
  label: string
  route: string
  isCenter?: boolean
  active: boolean
}) {
  const scale = useSharedValue(1)
  const dotOpacity = useSharedValue(active ? 1 : 0)

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }))

  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotOpacity.value,
  }))

  const handlePress = () => {
    scale.value = withSpring(0.82, { damping: 15 }, () => {
      scale.value = withSpring(1, { damping: 15 })
    })
    dotOpacity.value = withTiming(1, { duration: 150 })
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    router.push(route as any)
  }

  if (isCenter) {
    return (
      <Pressable onPress={handlePress} className="flex-1 items-center">
        <Animated.View style={animStyle}>
          <View
            className="bg-primary rounded-full items-center justify-center"
            style={{ width: 60, height: 60, marginTop: -28 }}
          >
            <Icon as={icon} size={28} className="text-primary-foreground" />
          </View>
        </Animated.View>
      </Pressable>
    )
  }

  return (
    <Pressable onPress={handlePress} className="flex-1 items-center py-2 gap-1">
      <Animated.View style={animStyle} className="items-center gap-1">
        <Icon
          as={icon}
          size={22}
          className={active ? 'text-primary' : 'text-muted-foreground'}
        />
        <Text
          className={`text-xs font-medium ${active ? 'text-primary' : 'text-muted-foreground'}`}
        >
          {label}
        </Text>
        <Animated.View
          style={[dotStyle, { width: 4, height: 4, borderRadius: 2, backgroundColor: '#16a34a' }]}
        />
      </Animated.View>
    </Pressable>
  )
}

export function BottomBar() {
  const pathname = usePathname()
  const insets = useSafeAreaInsets()

  const isActive = (route: string) => {
    if (route === '/') return pathname === '/'
    if (route === '/(app)/settings') return pathname.includes('settings') && !pathname.includes('device')
    return pathname === route || pathname.startsWith(route)
  }

  return (
    <View
      className="absolute bottom-0 left-0 right-0 bg-card"
      style={{
        paddingBottom: insets.bottom,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.06,
        shadowRadius: 16,
        elevation: 16,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
      }}
    >
      <View className="flex-row items-end px-4" style={{ height: 72 }}>
        {TABS.map((tab) => (
          <TabItem
            key={tab.route}
            icon={tab.icon}
            label={tab.label}
            route={tab.route}
            isCenter={!!tab.isCenter}
            active={isActive(tab.route)}
          />
        ))}
      </View>
    </View>
  )
}
