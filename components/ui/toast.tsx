import { Icon } from '@/components/ui/icon';
import { Text } from '@/components/ui/text';
import type { LucideIcon } from 'lucide-react-native';
import { CheckCircle2, Info, XCircle } from 'lucide-react-native';
import * as React from 'react';
import { View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { FadeInDown, FadeOutUp } from 'react-native-reanimated';

type ToastVariant = 'default' | 'success' | 'error';

type ToastInput = {
  title?: string;
  description: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastInstance = ToastInput & {
  id: string;
  variant: ToastVariant;
};

const listeners = new Set<(toasts: ToastInstance[]) => void>();
const timers = new Map<string, ReturnType<typeof setTimeout>>();
let toasts: ToastInstance[] = [];

function emit() {
  listeners.forEach((listener) => listener(toasts));
}

function scheduleDismiss(id: string, duration: number) {
  const existingTimer = timers.get(id);

  if (existingTimer) {
    clearTimeout(existingTimer);
  }

  timers.set(
    id,
    setTimeout(() => {
      dismissToast(id);
    }, duration)
  );
}

function createToast({
  title,
  description,
  variant = 'default',
  duration = 3200,
}: ToastInput) {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  toasts = [...toasts, { id, title, description, variant }].slice(-4);
  emit();
  scheduleDismiss(id, duration);

  return id;
}

function dismissToast(id: string) {
  const timer = timers.get(id);

  if (timer) {
    clearTimeout(timer);
    timers.delete(id);
  }

  toasts = toasts.filter((toast) => toast.id !== id);
  emit();
}

function subscribe(listener: (toasts: ToastInstance[]) => void) {
  listeners.add(listener);
  listener(toasts);

  return () => {
    listeners.delete(listener);
  };
}

export const toast = Object.assign(
  (options: ToastInput) => createToast(options),
  {
    success(description: string, title = 'Успешно') {
      return createToast({ title, description, variant: 'success' });
    },
    error(description: string, title = 'Ошибка') {
      return createToast({ title, description, variant: 'error' });
    },
    info(description: string, title = 'Сообщение') {
      return createToast({ title, description, variant: 'default' });
    },
    dismiss(id: string) {
      dismissToast(id);
    },
    dismissAll() {
      timers.forEach((timer) => clearTimeout(timer));
      timers.clear();
      toasts = [];
      emit();
    },
  }
);

function getToastMeta(variant: ToastVariant): {
  icon: LucideIcon;
  iconClassName: string;
  containerClassName: string;
  titleClassName: string;
  descriptionClassName: string;
} {
  switch (variant) {
    case 'success':
      return {
        icon: CheckCircle2,
        iconClassName: 'text-emerald-600',
        containerClassName: 'bg-background',
        titleClassName: 'text-foreground',
        descriptionClassName: 'text-muted-foreground',
      };
    case 'error':
      return {
        icon: XCircle,
        iconClassName: 'text-destructive',
        containerClassName: 'bg-background',
        titleClassName: 'text-foreground',
        descriptionClassName: 'text-muted-foreground',
      };
    default:
      return {
        icon: Info,
        iconClassName: 'text-primary',
        containerClassName: 'bg-background',
        titleClassName: 'text-foreground',
        descriptionClassName: 'text-muted-foreground',
      };
  }
}

function ToastCard({ item }: { item: ToastInstance }) {
  const meta = getToastMeta(item.variant);

  return (
    <Animated.View entering={FadeInDown.duration(180)} exiting={FadeOutUp.duration(160)}>
      <View
        className={`rounded-3xl px-4 py-3.5 shadow-sm shadow-black/5 ${meta.containerClassName}`}
      >
        <View className="flex-row items-start gap-3">
          <View className="rounded-2xl bg-secondary/50 p-2.5">
            <Icon as={meta.icon} size={18} className={meta.iconClassName} />
          </View>

          <View className="flex-1">
            {item.title ? (
              <Text className={`text-sm font-semibold ${meta.titleClassName}`}>{item.title}</Text>
            ) : null}
            <Text className={`text-sm mt-0.5 ${meta.descriptionClassName}`}>{item.description}</Text>
          </View>
        </View>
      </View>
    </Animated.View>
  );
}

export function Toaster() {
  const insets = useSafeAreaInsets();
  const [items, setItems] = React.useState<ToastInstance[]>([]);

  React.useEffect(() => subscribe(setItems), []);

  if (items.length === 0) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={{
        position: 'absolute',
        top: insets.top + 12,
        left: 0,
        right: 0,
        zIndex: 1000,
        elevation: 1000,
      }}
    >
      <View pointerEvents="box-none" className="px-4 gap-3">
        {items.map((item) => (
          <ToastCard key={item.id} item={item} />
        ))}
      </View>
    </View>
  );
}
