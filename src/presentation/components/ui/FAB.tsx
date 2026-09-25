import { Ionicons } from "@expo/vector-icons";
import { StyleProp, TouchableOpacity, View, ViewStyle } from "react-native";
import { THEME_COLORS } from "../../../core/constants/theme";

interface Props {
  iconName: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  style?: StyleProp<ViewStyle>;
}

export const FAB = ({ onPress, style, iconName }: Props) => {
  return (
    <View style={[{ position: 'absolute', zIndex: 1 }, style]}>
      <TouchableOpacity 
        onPress={onPress}
        className="h-12 w-12 rounded-full bg-obsidian border border-charcoal items-center justify-center shadow-lg"
      >
        <Ionicons name={iconName} color={THEME_COLORS.gold} size={24} />
      </TouchableOpacity>
    </View>
  );
};
