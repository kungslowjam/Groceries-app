// app/(tabs)/_layout.tsx
import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import React from 'react';
import { Text, View } from 'react-native';

type IconName = ComponentProps<typeof Feather>['name'];
type RouteName = 'index' | 'history' | 'analyse' | 'settings';

const icons: Record<RouteName, IconName> = {
  index: 'home',
  history: 'clock',
  analyse: 'bar-chart-2',
  settings: 'settings',
};

const labels: Record<RouteName, string> = {
  index: 'Scan',
  history: 'History',
  analyse: 'Analyse',
  settings: 'Settings',
};

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => {
        const name = route.name as RouteName;
        return {
          headerShown: false,
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: '#0F172A',
            height: 70,
            borderTopWidth: 0,
            elevation: 8,
          },
          tabBarIcon: ({ focused }) => {
            return (
              <View
                style={{
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 3,
                }}
              >
                <Feather
                  name={icons[name]}
                  size={22}
                  color={focused ? '#6366F1' : '#94A3B8'}
                />
                <Text
                  style={{
                    fontSize: 8,
                    color: focused ? '#6366F1' : '#94A3B8',
                    fontWeight: focused ? '600' : '400',
                  }}
                >
                  {labels[name]}
                </Text>
              </View>
            );
          },
        };
      }}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="history" />
      <Tabs.Screen name="analyse" />
      <Tabs.Screen name="settings" />
    </Tabs>
  );
}
