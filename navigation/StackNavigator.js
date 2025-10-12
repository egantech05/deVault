import React from "react";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AssetTemplatesScreen from "../screens/AssetTemplatesScreen";
import AssetsScreen from "../screens/AssetsScreen.js";
import LogTemplatesScreen from "../screens/LogTemplatesScreen.js";
import WarehouseScreen from "../screens/WarehouseScreen.js";
import LinkedDocsScreen from "../screens/LinkedDocsScreen.js";
import ResponsiveLayout from "../components/ResponsiveLayout";
import AuthGuard from "../components/AuthGuard";

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



export default function StackNavigator() {
  return (
    <AuthGuard>
      <Stack.Navigator initialRouteName="Assets" screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Assets" component={AssetsScreenWithLayout} />
        <Stack.Screen name="AssetTemplates" component={AssetTemplatesScreenWithLayout} />
        <Stack.Screen name="LogTemplates" component={LogTemplatesScreenWithLayout} />
        <Stack.Screen name="Warehouse" component={WarehouseScreenWithLayout} />
        <Stack.Screen name="LinkedDocs" component={LinkedDocsScreenWithLayout} />
        
      </Stack.Navigator>
    </AuthGuard>
  );
}