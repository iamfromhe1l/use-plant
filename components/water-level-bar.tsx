import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Text } from '@/components/ui/text';
import { Icon } from '@/components/ui/icon';
import { Minus, Plus } from 'lucide-react-native';

interface WaterLevelBarProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
}

export function WaterLevelBar({ value, onChange, min = 1, max = 10 }: WaterLevelBarProps) {
  return (
    <View className="flex-row items-center gap-2">
      <TouchableOpacity onPress={() => onChange(Math.max(min, value - 1))}>
        <View className="bg-secondary rounded-full p-2">
          <Icon as={Minus} size={16} className="text-secondary-foreground" />
        </View>
      </TouchableOpacity>
      <View className="flex-1 flex-row gap-1">
        {Array.from({ length: max }, (_, i) => (
          <TouchableOpacity key={i} className="flex-1" onPress={() => onChange(i + 1)}>
            <View
              className={`h-3 rounded-full ${i < value ? 'bg-primary' : 'bg-muted'}`}
            />
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={() => onChange(Math.min(max, value + 1))}>
        <View className="bg-secondary rounded-full p-2">
          <Icon as={Plus} size={16} className="text-secondary-foreground" />
        </View>
      </TouchableOpacity>
    </View>
  );
}
