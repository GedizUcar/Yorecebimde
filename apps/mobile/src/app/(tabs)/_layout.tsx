import { Tabs } from 'expo-router';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#0a0a0a',
        tabBarInactiveTintColor: '#9a9a9a',
        tabBarStyle: { backgroundColor: '#fff', borderTopColor: '#e5e5e5' },
        headerStyle: { backgroundColor: '#fff' },
        headerTitleStyle: { fontWeight: '600' },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'Anasayfa', tabBarLabel: 'Ana' }}
      />
      <Tabs.Screen
        name="search"
        options={{ title: 'Arama', tabBarLabel: 'Ara' }}
      />
      <Tabs.Screen
        name="orders"
        options={{ title: 'Siparişlerim', tabBarLabel: 'Siparişler' }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarLabel: 'Profil' }}
      />
    </Tabs>
  );
}
