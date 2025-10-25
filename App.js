// App.js
import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import StackNavigator from "./navigation/StackNavigator";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from './contexts/AuthContext';
import { DatabaseProvider } from './contexts/DatabaseContext';
import CreateDatabaseModal from './components/CreateDatabaseModal';

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <DatabaseProvider>
          <NavigationContainer documentTitle={{ formatter: () => 'sSETRA' }}>
            <StackNavigator />
          </NavigationContainer>
          <CreateDatabaseModal />
        </DatabaseProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
