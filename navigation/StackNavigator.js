import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AssetTemplatesScreen from "../screens/AssetTemplatesScreen";
import AssetsScreen from "../screens/AssetsScreen.js";
import LogTemplatesScreen from "../screens/LogTemplatesScreen.js";
import WarehouseScreen from "../screens/WarehouseScreen.js";

const Stack = createNativeStackNavigator();

export default function StackNavigator() {
  return (
    <Stack.Navigator initialRouteName="Assets" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Assets" component={AssetsScreen} />
      <Stack.Screen name="AssetTemplates" component={AssetTemplatesScreen} />
      <Stack.Screen name="LogTemplates" component={LogTemplatesScreen} />
      <Stack.Screen name="Warehouse" component={WarehouseScreen} />
    </Stack.Navigator>
  );
}