import React from "react";
import { View, StyleSheet } from "react-native";
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, commonStyles } from "./Styles";

export default function AuthLayout({ children }) {
  return (
    <SafeAreaView style={commonStyles.container}>
      <View style={styles.content}>
        {children}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    backgroundColor: colors.background,
  },
});