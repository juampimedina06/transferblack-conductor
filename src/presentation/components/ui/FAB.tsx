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
    <View style={[{ position: 'relative', zIndex: 1 }, style]}>
      <TouchableOpacity 
        activeOpacity={0.8}
        onPress={onPress}
        className="h-12 w-12 rounded-2xl bg-[#0A0B10]/85 border border-white/20 items-center justify-center shadow-xl shadow-black relative overflow-hidden"
      >
        {/* Top Specular Edge Glass Highlight */}
        <View className="absolute top-0 left-2 right-2 h-[1px] bg-white/25 pointer-events-none" />
        <Ionicons name={iconName} color={THEME_COLORS.gold} size={22} />
      </TouchableOpacity>
    </View>
  );
};
