import { useAppearance } from '@/contexts/AppearanceContext';
import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, View } from 'react-native';

interface DrawerIconProps {
  name: string;
  focused: boolean;
  outlineName?: string;
}

export default function DrawerIcon({ name, focused, outlineName }: DrawerIconProps) {
  const { theme } = useAppearance();
  const iconName = focused ? name : (outlineName || `${name}-outline`);
  const iconColor = focused ? "#ffffff" : theme.textSecondary;
  const backgroundColor = focused ? theme.primary : "transparent";

  return (
    <View 
      style={[
        styles.container,
        { backgroundColor: backgroundColor }
      ]}
    >
      <Ionicons 
        name={iconName as any}
        size={18} 
        color={iconColor} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 28,
    height: 28,
    borderRadius: 9999, // Very large value to ensure always circular
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
    overflow: 'hidden',
  },
});

