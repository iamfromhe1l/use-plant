import { useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context/auth-context';
import { useRouter } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';

export default function IndexPage() {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        router.replace('/(app)');
      } else {
        router.replace('/(auth)/sign-in');
      }
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return null;
}
