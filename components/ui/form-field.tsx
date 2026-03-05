
import React, { ReactNode } from 'react';
import { View, Text } from 'react-native';
import { useFormContext, FieldErrors } from 'react-hook-form';
import { Label } from './label';

interface FormFieldProps {
  name: string;
  label: string;
  children: ReactNode;
}

export function FormField({ name, label, children }: FormFieldProps) {
  const formErrors = useFormContext().formState.errors as FieldErrors<any>;

  return (
    <View className="gap-2">
      <Label htmlFor={name}>{label}</Label>
      <View>{children}</View>
      {formErrors[name] && (
        <Text className="text-destructive text-sm">
          {formErrors[name]?.message as string}
        </Text>
      )}
    </View>
  );
}

