import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AssetTemplatesScreen from "../screens/AssetTemplatesScreen";
import AssetsScreen from "../screens/AssetsScreen.js";

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  return (
    <Stack.Navigator initialRouteName="AssetTemplates" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Assets" component={AssetsScreen} />
      <Stack.Screen name="AssetTemplates" component={AssetTemplatesScreen} />
    </Stack.Navigator>
  );
}