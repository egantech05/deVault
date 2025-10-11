import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import StackNavigator from "./navigation/StackNavigator";
import ResponsiveLayout from "./components/ResponsiveLayout";
import { SafeAreaProvider } from 'react-native-safe-area-context';


export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
          <StackNavigator />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}