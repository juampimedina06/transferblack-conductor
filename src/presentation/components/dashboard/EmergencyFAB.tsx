import React from 'react';
import { TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface EmergencyFABProps {
  onPress: () => void;
}

export const EmergencyFAB = ({ onPress }: EmergencyFABProps) => {
  return (
    <View className="absolute bottom-[96px] left-4 z-50">
      <TouchableOpacity 
        onPress={onPress}
        className="w-14 h-14 rounded-full bg-[#1A73E8] items-center justify-center shadow-lg shadow-black/50 border border-blue-400/30"
      >
        <Ionicons name="shield" size={28} color="white" />
      </TouchableOpacity>
    </View>
  );
};
