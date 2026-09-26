import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { THEME_COLORS } from '../../../core/constants/theme';

interface ConnectionBottomSheetProps {
  isAvailable: boolean;
  onToggleAvailability: (val: boolean) => void;
}

export const ConnectionBottomSheet = ({ isAvailable, onToggleAvailability }: ConnectionBottomSheetProps) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    setExpanded(!expanded);
  };

  return (
    <View className="absolute bottom-0 w-full bg-obsidian rounded-t-3xl border-t border-charcoal/50 shadow-lg shadow-black/80 z-40">
      
      {/* Header - Always visible */}
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={toggleExpand}
        className="w-full h-16 flex-row items-center justify-between px-6"
      >
        <View className="flex-row items-center">
          <View className={`w-3 h-3 rounded-full mr-3 ${isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
          <Text className="text-platinum font-montserrat-semibold text-lg">
            {isAvailable ? 'Estás conectado' : 'Desconectado'}
          </Text>
        </View>
        <Ionicons 
          name={expanded ? "chevron-down" : "chevron-up"} 
          size={24} 
          color={THEME_COLORS.ash} 
        />
      </TouchableOpacity>

      {/* Expanded Content */}
      {expanded && (
        <View className="px-6 pb-8 pt-2">
          {/* Action Buttons */}
          <View className="w-full flex-row justify-center mt-4">
            {isAvailable ? (
              <TouchableOpacity 
                onPress={() => {
                  onToggleAvailability(false);
                  setExpanded(false);
                }}
                className="w-full bg-[#E53935] py-4 rounded-full items-center justify-center flex-row"
              >
                <Ionicons name="power" size={24} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-montserrat-bold text-lg">DESCONECTARSE</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity 
                onPress={() => {
                  onToggleAvailability(true);
                  setExpanded(false);
                }}
                className="w-full bg-[#4CAF50] py-4 rounded-full items-center justify-center flex-row"
              >
                <Ionicons name="power" size={24} color="white" style={{ marginRight: 8 }} />
                <Text className="text-white font-montserrat-bold text-lg">CONECTARSE</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
};
