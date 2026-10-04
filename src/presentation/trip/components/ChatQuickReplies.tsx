import React from 'react';
import { ScrollView, TouchableOpacity, Text } from 'react-native';
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSelect(reply);
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="px-4 py-2 gap-2.5 items-center"
      keyboardShouldPersistTaps="handled"
    >
      {QUICK_REPLIES.map((reply) => (
        <TouchableOpacity
          key={reply}
          onPress={() => handlePress(reply)}
          disabled={disabled}
          className="h-11 px-4 rounded-full bg-white/5 border border-gold/40 items-center justify-center active:bg-gold/20"
          accessibilityLabel={reply}
          accessibilityRole="button"
          hitSlop={{ top: 4, bottom: 4, left: 2, right: 2 }}
        >
          <Text className="text-gold font-montserrat-medium text-xs tracking-wide">{reply}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};

