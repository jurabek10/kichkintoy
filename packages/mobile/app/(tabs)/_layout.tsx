import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { colors } from '@/constants/theme';

type IoniconName = ComponentProps<typeof Ionicons>['name'];

const TABS: { name: string; navKey: string; icon: IoniconName; iconActive: IoniconName }[] = [
  { name: 'index', navKey: 'items.dashboard', icon: 'home-outline', iconActive: 'home' },
  { name: 'reports', navKey: 'items.reports', icon: 'document-text-outline', iconActive: 'document-text' },
  { name: 'albums', navKey: 'items.albums', icon: 'images-outline', iconActive: 'images' },
  { name: 'notices', navKey: 'items.notices', icon: 'megaphone-outline', iconActive: 'megaphone' },
  { name: 'pickups', navKey: 'items.pickups', icon: 'walk-outline', iconActive: 'walk' },
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
            tabBarIcon: ({ color, focused }) => (
              <Ionicons name={focused ? tab.iconActive : tab.icon} size={24} color={color} />
            ),
          }}
        />
      ))}
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
