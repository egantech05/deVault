import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AssetTemplatesScreen from "../screens/AssetTemplatesScreen";
import AssetsScreen from "../screens/AssetsScreen.js";
import LogTemplatesScreen from "../screens/LogTemplatesScreen.js";
import WarehouseScreen from "../screens/WarehouseScreen.js";
import LinkedDocsScreen from "../screens/LinkedDocsScreen.js";
import LoginScreen from "../screens/LoginScreen.js";
import ResponsiveLayout from "../components/ResponsiveLayout";
import AuthLayout from "../components/AuthLayout";

const Stack = createNativeStackNavigator();

const AssetsScreenWithLayout = () => (
  <ResponsiveLayout>
    <AssetsScreen />
  </ResponsiveLayout>
);

const AssetTemplatesScreenWithLayout = () => (
  <ResponsiveLayout>
    <AssetTemplatesScreen />
  </ResponsiveLayout>
);

const LogTemplatesScreenWithLayout = () => (
  <ResponsiveLayout>
    <LogTemplatesScreen />
  </ResponsiveLayout>
);

const WarehouseScreenWithLayout = () => (
  <ResponsiveLayout>
    <WarehouseScreen />
  </ResponsiveLayout>
);

const LinkedDocsScreenWithLayout = () => (
  <ResponsiveLayout>
    <LinkedDocsScreen />
  </ResponsiveLayout>
);

const LoginScreenWithLayout = () => (
  <AuthLayout>
    <LoginScreen />
  </AuthLayout>
);

export default function StackNavigator() {
  return (
    <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Assets" component={AssetsScreenWithLayout} />
      <Stack.Screen name="AssetTemplates" component={AssetTemplatesScreenWithLayout} />
      <Stack.Screen name="LogTemplates" component={LogTemplatesScreenWithLayout} />
      <Stack.Screen name="Warehouse" component={WarehouseScreenWithLayout} />
      <Stack.Screen name="LinkedDocs" component={LinkedDocsScreenWithLayout} />
      <Stack.Screen name="Login" component={LoginScreenWithLayout} />
    </Stack.Navigator>
  );
}