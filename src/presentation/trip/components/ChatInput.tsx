import React, { useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type BlockedReason = 'in_progress' | 'closed' | null;

const getBlockedLabel = (reason: BlockedReason): string => {
  switch (reason) {
    case 'in_progress':
      return 'El viaje ya comenzó. Chat deshabilitado por seguridad vial.';
    case 'closed':
      return 'El chat está cerrado.';
    default:
      return '';
  }
};

interface ChatInputProps {
  blockedReason: BlockedReason;
  onSend: (text: string) => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({ blockedReason, onSend }) => {
  const [text, setText] = React.useState('');
  const inputRef = useRef<TextInput>(null);

  const isBlocked = blockedReason !== null;
  const canSend = !isBlocked && text.trim().length > 0;

  const handleSend = () => {
    if (!canSend) return;
    onSend(text.trim());
    setText('');
  };

  if (isBlocked) {
    return (
      <View className="w-full px-4 py-3 bg-[#141416] border-t border-[#2C2C2E] flex-row items-center">
        <View className="flex-1 flex-row items-center gap-2">
          <Ionicons name="lock-closed-outline" size={16} color="rgba(255,255,255,0.3)" />
          <Text
            className="text-[rgba(255,255,255,0.35)] text-[13px] flex-1"
            numberOfLines={2}
          >
            {getBlockedLabel(blockedReason)}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View
      className="w-full px-4 py-3 bg-[#141416] border-t border-[#2C2C2E] flex-row items-center"
      style={{ gap: 10 }}
    >
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        placeholder="Escribí un mensaje..."
        placeholderTextColor="rgba(255,255,255,0.3)"
        className="flex-1 bg-[#1C1C1E] rounded-2xl px-4 py-2.5 text-[#E4E4E5] text-[15px]"
        multiline
        maxLength={1000}
        returnKeyType="send"
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
        accessibilityLabel="Campo de mensaje"
        style={{ maxHeight: 120 }}
      />

      <TouchableOpacity
        onPress={handleSend}
        disabled={!canSend}
        className={`w-10 h-10 rounded-full items-center justify-center ${
          canSend ? 'bg-[#D4AF37]' : 'bg-[#2C2C2E]'
        }`}
        accessibilityLabel="Enviar mensaje"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend }}
      >
        <Ionicons
          name="send"
          size={18}
          color={canSend ? '#0A0A0C' : 'rgba(255,255,255,0.2)'}
        />
      </TouchableOpacity>
    </View>
  );
};
