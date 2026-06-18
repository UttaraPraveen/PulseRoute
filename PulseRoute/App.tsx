import { NavigationContainer } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

import DashboardScreen from './screens/DashboardScreen';
import DetailScreen from './screens/DetailScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen
          name="Dashboard"
          component={DashboardScreen}
        />
        <Stack.Screen
          name="Detail"
          component={DetailScreen}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </GestureHandlerRootView>
  );
}