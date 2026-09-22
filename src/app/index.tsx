import { DesignSystemTest } from "@/presentation/components/DesignSystemTest";
import { SafeAreaView } from "react-native-safe-area-context";

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-obsidian" edges={["top", "left", "right"]}>
      <DesignSystemTest />
    </SafeAreaView>
  );
}
