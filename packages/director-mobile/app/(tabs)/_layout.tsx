import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { colors } from '@/constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];
type MaterialCommunityName = ComponentProps<typeof MaterialCommunityIcons>['name'];

const TABS: {
  name: string;
  navKey: string;
  icon: IoniconName;
  iconActive: IoniconName;
  /** Override with a MaterialCommunityIcons glyph (e.g. parent + child for pickup). */
  mciIcon?: MaterialCommunityName;
}[] = [
  { name: 'index', navKey: 'items.dashboard', icon: 'home-outline', iconActive: 'home' },
  { name: 'reports', navKey: 'items.reports', icon: 'document-text-outline', iconActive: 'document-text' },
  { name: 'chat', navKey: 'items.ai', icon: 'sparkles-outline', iconActive: 'sparkles' },
  { name: 'albums', navKey: 'items.albums', icon: 'images-outline', iconActive: 'images' },
  { name: 'pickups', navKey: 'items.pickups', icon: 'walk-outline', iconActive: 'walk', mciIcon: 'human-male-child' },
];

export default function TabsLayout() {
  const { t } = useTranslation('nav');

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarLabelStyle: styles.tabLabel,
        tabBarStyle: styles.tabBar,
      }}>
      {TABS.map((tab) => (
        <Tabs.Screen
          key={tab.name}
          name={tab.name}
          options={{
            title: t(tab.navKey),
            tabBarIcon: ({ color, focused }) =>
              tab.mciIcon ? (
                <MaterialCommunityIcons name={tab.mciIcon} size={26} color={color} />
              ) : (
                <Ionicons name={focused ? tab.iconActive : tab.icon} size={24} color={color} />
              ),
          }}
        />
      ))}
      <Tabs.Screen name="notices" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    height: 84,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopColor: '#EFEFF1',
  },
  tabLabel: {
    fontSize: 11,
    marginTop: 2,
  },
});
