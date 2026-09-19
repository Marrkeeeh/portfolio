import CustomDrawerContent from '@/components/drawer/CustomDrawerContent';
import DrawerIcon from '@/components/drawer/DrawerIcon';
import HeaderAvatar from '@/components/header/HeaderAvatar';
import { useAppearance } from '@/contexts/AppearanceContext';
import { DeviceMonitoringProvider } from '@/contexts/DeviceMonitoringContext';
import { DeviceSelectionProvider } from '@/contexts/DeviceSelectionContext';
import { Ionicons } from '@expo/vector-icons';
import { usePathname } from 'expo-router';
import { Drawer } from 'expo-router/drawer';
import React from 'react';
import { Platform, TouchableOpacity, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DrawerLayout() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { theme, colorScheme } = useAppearance();

  // Get title based on pathname
  const getHeaderTitle = () => {
    if (pathname.includes('/home') || pathname.includes('(tabs)')) return 'LettuceGrow';
    if (pathname.includes('/profile')) return 'Profile';
    if (pathname.includes('/settings')) return 'Settings';
    if (pathname.includes('/devices')) return 'Devices';
    if (pathname.includes('/plants')) return 'Plants';
    if (pathname.includes('/analytics')) return 'Analytics';
    if (pathname.includes('/history')) return 'History';
    if (pathname.includes('/device-status')) return 'Device Status';
    return 'LettuceGrow';
  };

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DeviceSelectionProvider>
        <DeviceMonitoringProvider>
          <Drawer
            drawerContent={(props) => <CustomDrawerContent {...props} />}
            screenOptions={({ navigation }) => ({
              headerShown: true,
              drawerStyle: {
                backgroundColor: theme.background,
                width: 240,
              },
              headerStyle: {
                backgroundColor: colorScheme === 'dark' 
                  ? '#1a1f2e' // Distinct dark blue-gray for header in dark mode
                  : theme.primary,
                elevation: colorScheme === 'dark' ? 2 : 0,
                shadowOpacity: colorScheme === 'dark' ? 0.1 : 0,
                borderBottomWidth: colorScheme === 'dark' ? 1 : 0,
                borderBottomColor: colorScheme === 'dark' ? '#2d3748' : 'transparent',
                height: Platform.OS === 'ios' ? insets.top + 60 : undefined,
              },
              headerStatusBarHeight: Platform.OS === 'ios' ? insets.top : undefined,
              headerTintColor: colorScheme === 'dark' ? theme.text : "#ffffff",
              headerTitle: getHeaderTitle(),
              headerTitleStyle: {
                fontSize: 20,
                fontWeight: '700',
                letterSpacing: 0.3,
                color: colorScheme === 'dark' ? theme.text : "#ffffff",
              },
              headerTitleAlign: 'center',
              headerLeftContainerStyle: {
                paddingLeft: 20,
                paddingTop: Platform.OS === 'ios' ? 0 : 0,
              },
              headerRightContainerStyle: {
                paddingRight: 20,
                paddingTop: Platform.OS === 'ios' ? 0 : 0,
              },
              headerLeft: ({ tintColor }: { tintColor?: string }) => (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <TouchableOpacity
                    style={{
                      width: 36,
                      height: 36,
                      justifyContent: 'center',
                      alignItems: 'center',
                    }}
                    onPress={() => navigation.toggleDrawer()}
                  >
                    <Ionicons 
                      name="menu" 
                      size={26} 
                      color={tintColor || (colorScheme === 'dark' ? theme.text : "#ffffff")} 
                    />
                  </TouchableOpacity>
                </View>
              ),
              headerRight: () => <HeaderAvatar />,
              drawerActiveTintColor: theme.primary,
              drawerInactiveTintColor: theme.textSecondary,
              drawerActiveBackgroundColor: theme.backgroundTertiary,
              drawerInactiveBackgroundColor: "transparent",
              drawerLabelStyle: {
                marginLeft: 6,
                fontSize: 14,
                fontWeight: "500",
              },
              drawerItemStyle: {
                borderRadius: 10,
                marginHorizontal: 4,
                marginVertical: 0,
                paddingLeft: 8,
                paddingVertical: 6,
                minHeight: 40,
              },
            })}
          >
            <Drawer.Screen
              name="(tabs)"
              options={{
                drawerLabel: "Home",
                drawerIcon: ({ focused }) => (
                  <DrawerIcon name="home" focused={focused} />
                ),
              }}
            />
            <Drawer.Screen
              name="profile"
              options={{
                drawerLabel: "Profile",
                drawerIcon: ({ focused }) => (
                  <DrawerIcon name="person" focused={focused} />
                ),
              }}
            />
            <Drawer.Screen
              name="settings"
              options={{
                drawerLabel: "Settings",
                drawerIcon: ({ focused }) => (
                  <DrawerIcon name="settings" focused={focused} />
                ),
              }}
            />
            <Drawer.Screen
              name="devices"
              options={{
                drawerLabel: "Devices",
                drawerIcon: ({ focused }) => (
                  <DrawerIcon name="hardware-chip" focused={focused} />
                ),
              }}
            />
            <Drawer.Screen
              name="plants"
              options={{
                drawerLabel: "Plants",
                drawerIcon: ({ focused }) => (
                  <DrawerIcon name="leaf" focused={focused} />
                ),
              }}
            />
            <Drawer.Screen
              name="sensor-values"
              options={{
                drawerLabel: "Sensor Values",
                drawerIcon: ({ focused }) => (
                  <DrawerIcon name="thermometer" focused={focused} />
                ),
              }}
            />
            <Drawer.Screen
              name="device-status"
              options={{
                drawerLabel: "Device Status",
                drawerIcon: ({ focused }) => (
                  <DrawerIcon name="pulse" focused={focused} />
                ),
              }}
            />
            <Drawer.Screen
              name="analytics"
              options={{
                drawerLabel: "Analytics",
                drawerIcon: ({ focused }) => (
                  <DrawerIcon name="stats-chart" focused={focused} />
                ),
              }}
            />
            <Drawer.Screen
              name="history"
              options={{
                drawerLabel: "History",
                drawerIcon: ({ focused }) => (
                  <DrawerIcon name="time" focused={focused} />
                ),
              }}
            />
          </Drawer>
        </DeviceMonitoringProvider>
      </DeviceSelectionProvider>
    </GestureHandlerRootView>
  );
}
