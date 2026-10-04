import React, { useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  Text,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { THEME_COLORS } from '@/core/constants/theme';
import { LiquidGlassContainer } from '@/presentation/components/ui/LiquidGlassContainer';

type BlockedReason = 'in_progress' | 'closed' | null;

const getBlockedLabel = (reason: BlockedReason): string => {
  switch (reason) {
    case 'in_progress':
      return 'Viaje en curso. Chat pausado por seguridad vial al conducir.';
    case 'closed':
      return 'El chat de este viaje se encuentra cerrado.';
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
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onSend(text.trim());
    setText('');
  };

  if (isBlocked) {
    return (
      <LiquidGlassContainer
        variant="default"
        className="w-full px-4 py-3.5 border-t border-white/10 flex-row items-center"
      >
        <View className="flex-1 flex-row items-center gap-2.5 bg-amber-500/10 border border-amber-500/20 rounded-xl px-3 py-2">
          <Ionicons name="shield-checkmark" size={18} color="#FBBF24" />
          <Text
            className="text-amber-200/90 font-montserrat text-xs flex-1 leading-4"
            numberOfLines={2}
          >
            {getBlockedLabel(blockedReason)}
          </Text>
        </View>
      </LiquidGlassContainer>
    );
  }

  return (
    <LiquidGlassContainer
      variant="default"
      className="w-full px-4 py-3 border-t border-white/10 flex-row items-center gap-2.5"
    >
      <TextInput
        ref={inputRef}
        value={text}
        onChangeText={setText}
        placeholder="Escribí un mensaje..."
        placeholderTextColor="#71717A"
        className="flex-1 bg-black/40 border border-white/10 rounded-2xl px-4 py-3 text-white font-montserrat text-sm"
        multiline
        maxLength={1000}
        returnKeyType="send"
        onSubmitEditing={handleSend}
        blurOnSubmit={false}
        accessibilityLabel="Campo de mensaje"
        style={{ maxHeight: 100 }}
      />

      <TouchableOpacity
        onPress={handleSend}
        disabled={!canSend}
        className={`w-12 h-12 rounded-2xl items-center justify-center active:scale-95 ${
          canSend ? 'bg-gold shadow-md shadow-gold/20' : 'bg-charcoal border border-white/5 opacity-50'
        }`}
        accessibilityLabel="Enviar mensaje"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canSend }}
      >
        <Ionicons
          name="send"
          size={18}
          color={canSend ? THEME_COLORS.obsidian : THEME_COLORS.ash}
        />
      </TouchableOpacity>
    </LiquidGlassContainer>
  );
};

