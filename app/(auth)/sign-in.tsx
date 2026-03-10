import { AuthForm } from '@/components/auth-form';
import * as React from 'react';
import { View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignIn() {
  return <View className='flex-1 justify-center p-6'>
    <SafeAreaView>
      <AuthForm />
    </SafeAreaView>
  </View>
}
