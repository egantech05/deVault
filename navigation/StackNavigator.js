import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AssetTemplatesScreen from '../screens/AssetTemplatesScreen';


const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  return (
    <Stack.Navigator initialRouteName="AssetTemplate" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="AssetTemplate" component={AssetTemplatesScreen} />

    </Stack.Navigator>
  );
}
