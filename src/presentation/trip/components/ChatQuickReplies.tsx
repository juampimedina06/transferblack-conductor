import React from 'react';
import { ScrollView, TouchableOpacity, Text } from 'react-native';

const QUICK_REPLIES = [
  'Llegué al punto de encuentro',
  'Estoy a 2 minutos',
  'Estoy esperando en la puerta',
  'Llámame cuando puedas',
  '¿Podés salir ya?',
];

interface ChatQuickRepliesProps {
  disabled?: boolean;
  onSelect: (text: string) => void;
}

export const ChatQuickReplies: React.FC<ChatQuickRepliesProps> = ({ disabled, onSelect }) => {
  if (disabled) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerClassName="px-3 py-2 gap-2"
      keyboardShouldPersistTaps="handled"
    >
      {QUICK_REPLIES.map((reply) => (
        <TouchableOpacity
          key={reply}
          onPress={() => onSelect(reply)}
          disabled={disabled}
          className="bg-[#1C1C1E] border border-[#D4AF3766] px-3 py-1.5 rounded-full"
          accessibilityLabel={reply}
          accessibilityRole="button"
        >
          <Text className="text-[#D4AF37] text-[13px]">{reply}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );
};
