import React from 'react';
import { ScrollView, TouchableOpacity, Text, View } from 'react-native';
import * as Haptics from 'expo-haptics';

const QUICK_REPLIES = [
  'Llegué al punto de encuentro',
  'Estoy a 2 minutos',
  'Estoy esperando en la puerta',
  '¿Podés salir ya?',
  'Llámame cuando puedas',
];

interface ChatQuickRepliesProps {
  disabled?: boolean;
  onSelect: (text: string) => void;
}

export const ChatQuickReplies: React.FC<ChatQuickRepliesProps> = ({ disabled, onSelect }) => {
  if (disabled) return null;

  const handlePress = (reply: string) => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(reply);
  };

  return (
    <View className="shrink-0 bg-[#0A0A0C] border-t border-white/[0.06] py-2">
      <ScrollView
        horizontal
        style={{ flexGrow: 0 }}
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8, alignItems: 'center' }}
        keyboardShouldPersistTaps="handled"
      >
        {QUICK_REPLIES.map((reply) => (
          <TouchableOpacity
            key={reply}
            onPress={() => handlePress(reply)}
            disabled={disabled}
            className="h-9 px-3.5 rounded-full bg-white/[0.06] border border-gold/35 items-center justify-center active:bg-gold/20"
            accessibilityLabel={reply}
            accessibilityRole="button"
            hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
          >
            <Text className="text-gold font-montserrat-medium text-xs">{reply}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
};

