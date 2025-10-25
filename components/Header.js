import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { commonStyles, colors } from "./Styles";
import UserProfileDropdown from "./UserProfileDropdown";
import { useAuth } from "../contexts/AuthContext";

export const Header = ({ showMenuBtn, onMenuPress, title = "Ssetra" }) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const { user, profile } = useAuth();

  const displayName = (profile?.first_name || profile?.last_name)
    ? [profile?.first_name, profile?.last_name].filter(Boolean).join(" ")
    : user?.email;

  return (
    <View style={styles.header}>
      {showMenuBtn ? (
        <Pressable onPress={onMenuPress} hitSlop={12} style={{ paddingHorizontal: 16 }}>
          <Ionicons name="menu" size={32} color="white" />
        </Pressable>
      ) : (
        <View style={{ width: 32 }} />
      )}

      <View style={{ flex: 1, alignItems: "center" }}>
        <Text style={commonStyles.textTitle}>{title}</Text>
      </View>

      <Pressable
        hitSlop={12}
        style={{ paddingHorizontal: 16 }}
        onPress={() => setShowUserDropdown(true)}
      >
        <View style={styles.userArea}>
        {displayName ? (
            <Text
              style={styles.userName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayName}
            </Text>
          ) : null}
          <Ionicons name="person-circle-outline" size={32} color="white" />

        </View>
      </Pressable>

      {/* User Profile Dropdown */}
      <UserProfileDropdown
        visible={showUserDropdown}
        onClose={() => setShowUserDropdown(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    backgroundColor: colors.primary,
    height: 56,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userArea: {
    flexDirection: "row",
    alignItems: "center",
  },
  userName: {
    color: "white",
    marginRight: 8,
    fontWeight: "600",
    maxWidth: 140,
  },
});
