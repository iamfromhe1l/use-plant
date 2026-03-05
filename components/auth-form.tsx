import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, FormProvider, Controller } from 'react-hook-form';
import { router } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import { useAuth } from '@/contexts/auth-context/auth-context';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FormField } from '@/components/ui/form-field';
import { loginSchema, registerSchema, LoginForm, RegisterForm } from '@/lib/validations/auth';
import { Text } from './ui/text';

interface AuthFormProps {
  isRegister?: boolean;
}

export const AuthForm = ({ isRegister = false }: AuthFormProps) => {
  const { signIn, signUp, isLoading } = useAuth();

  const form = useForm<LoginForm | RegisterForm>({
    resolver: zodResolver(isRegister ? registerSchema : loginSchema),
    defaultValues: isRegister
      ? { name: '', email: '', password: '' }
      : { email: '', password: '' },
  });

  const { handleSubmit, formState, control } = form;
  const { isSubmitting } = formState;

  const onSubmit = handleSubmit(async (data) => {
    try {
      let response;
      if (isRegister) {
        response = await signUp(data as RegisterForm);
      } else {
        response = await signIn(data as LoginForm);
      }

      if (!response.state) {
        form.setError('password', { message: response.error?.message || 'Произошла ошибка' });
      }
    } catch (err) {
      form.setError('password', { message: 'Произошла ошибка неизвестная ошибка' });
    }
  });

  return (
    <FormProvider {...form}>
      <Card className="w-full max-w-sm">
        <CardHeader className="space-y-1">
          <CardTitle className="text-2xl">
            {isRegister ? 'Создать аккаунт' : 'Войти'}
          </CardTitle>
          <CardDescription>
            {isRegister
              ? 'Введите данные для регистрации'
              : 'Введите email и пароль для входа'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <View className="w-full justify-center gap-4">
            {isRegister && (
              <FormField name="name" label="Имя">
                <Controller
                  control={control}
                  name="name"
                  render={({ field: { onChange, onBlur, value } }) => (
                    <Input
                      id="name"
                      placeholder="Иван Иванов"
                      onBlur={onBlur}
                      onChangeText={onChange}
                      value={value}
                      editable={!isSubmitting && !isLoading}
                    />
                  )}
                />
              </FormField>
            )}
            <FormField name="email" label="Email">
              <Controller
                control={control}
                name="email"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    id="email"
                    placeholder="mail@example.com"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    editable={!isSubmitting && !isLoading}
                  />
                )}
              />
            </FormField>
            <FormField name="password" label="Пароль">
              <Controller
                control={control}
                name="password"
                render={({ field: { onChange, onBlur, value } }) => (
                  <Input
                    id="password"
                    placeholder="••••••••"
                    secureTextEntry
                    onBlur={onBlur}
                    onChangeText={onChange}
                    value={value}
                    editable={!isSubmitting && !isLoading}
                  />
                )}
              />
            </FormField>
          </View>
        </CardContent>
        <CardFooter className="flex-col gap-2 px-6 pb-6">
          <Button
            className="w-full"
            onPress={onSubmit}
            disabled={isSubmitting || isLoading}
          >
            {isSubmitting || isLoading ? (
              <ActivityIndicator color="primary-foreground" size="small" />
            ) : (
              <Text>{isRegister ? 'Зарегистрироваться' : 'Войти'}</Text>
            )}
          </Button>
          <Button
            variant="link"
            className="py-2 active:opacity-70"
            onPress={() => router.push(isRegister ? '/(auth)/sign-in' : '/(auth)/sign-up')}
            disabled={isSubmitting || isLoading}
          >
            <Text className="text-center text-sm font-semibold text-foreground/80">
              {isRegister
                ? 'Уже есть аккаунт? Войти'
                : 'Нет аккаунта? Зарегистрироваться'
              }
            </Text>
          </Button>
        </CardFooter>
      </Card>
    </FormProvider>
  );
};
