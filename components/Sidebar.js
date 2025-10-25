// components/Sidebar.js
import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, Platform } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { colors } from "./Styles";
import { Ionicons } from '@expo/vector-icons';
import { useDatabase } from '../contexts/DatabaseContext';

const SIDEBAR_WIDTH = 233;

export default function Sidebar({ isLarge, onClose }) {
  const navigation = useNavigation();
  const {
    databases,
    activeDatabase,
    selectDatabase,
    openCreateModal,
    refresh,
    deleteDatabase,
  } = useDatabase();

  const [expanded, setExpanded] = useState(false);
  const hasDatabases = databases.length > 0;
  const showNav = !!activeDatabase;

  const pickDatabase = async (id) => {
    await selectDatabase(id);
    setExpanded(false);
    onClose?.();
  };

  const confirmDeleteDatabase = (db) => {
    const go = async () => {
      try {
        await deleteDatabase(db.id);
        setExpanded(false);
        try { refresh(); } catch {}
      } catch (e) {
        const msg = e?.message || "Failed to delete database.";
        if (Platform.OS === "web") {
          alert(msg);
        } else {
          Alert.alert("Delete Database", msg);
        }
      }
    };

    const prompt = `Delete database "${db?.name || ""}"?\nThis action cannot be undone.`;
    if (Platform.OS === "web") {
      if (window.confirm(prompt)) go();
    } else {
      Alert.alert(
        "Delete Database",
        prompt,
        [
          { text: "Cancel", style: "cancel" },
          { text: "Delete", style: "destructive", onPress: go },
        ]
      );
    }
  };

  const renderDatabaseSelector = () => (
    <View>
      {hasDatabases ? (
        <>
          <Pressable
            style={styles.dbActiveRow}
            onPress={() => setExpanded((prev) => !prev)}
          >
            <View>
              <Text style={styles.dbLabel}>Database</Text>
              <Text style={styles.dbName}>{activeDatabase?.name ?? "Select database"}</Text>
            </View>
            <Ionicons
              name={expanded ? "chevron-up" : "chevron-down"}
              size={18}
              color="white"
            />
          </Pressable>

          {expanded && (
            <View style={styles.dbList}>
              {databases.map((db) => (
                <View
                  key={db.id}
                  style={[
                    styles.dbOption,
                    styles.dbOptionRow,
                    db.id === activeDatabase?.id && styles.dbOptionActive,
                  ]}
                >
                  <Pressable style={styles.dbOptionName} onPress={() => pickDatabase(db.id)}>
                    <Text
                      style={[
                        styles.dbOptionText,
                        db.id === activeDatabase?.id && styles.dbOptionTextActive,
                      ]}
                      numberOfLines={1}
                    >
                      {db.name}
                    </Text>
                  </Pressable>
                  <Pressable
                    style={styles.dbDeleteBtn}
                    onPress={() => confirmDeleteDatabase(db)}
                    accessibilityLabel={`Delete database ${db?.name || ""}`}
                  >
                    <Ionicons name="trash-outline" size={18} color="#ff5555" />
                  </Pressable>
                </View>
              ))}
              <Pressable style={styles.dbAddRow} onPress={openCreateModal}>
                <Ionicons name="add-circle-outline" size={18} color="#d1d5db" />
                <Text style={styles.dbAddText}>Create new database</Text>
              </Pressable>
            </View>
          )}
        </>
      ) : (
        <Pressable style={styles.dbEmpty} onPress={openCreateModal}>
          <Ionicons name="add-circle-outline" size={20} color="#d1d5db" />
          <Text style={styles.dbEmptyText}>Create your first database</Text>
        </Pressable>
      )}
    </View>
  );

  const navItems = [
    { label: "Assets", icon: "albums-outline", route: "Assets" },
    { label: "Asset Templates", icon: "document-outline", route: "AssetTemplates" },
    { label: "Log Templates", icon: "document-text-outline", route: "LogTemplates" },
    { label: "Warehouse", icon: "archive-outline", route: "Warehouse" },
    { label: "Linked Documents", icon: "link-outline", route: "LinkedDocs" },
    { label: "Team", icon: "people-outline", route: "Team" },
  ];

  const renderNavButtons = () =>
    navItems.map((item) => (
      <Pressable
       key={`${item.route}-${item.label}`}
        onPress={() => {
          navigation.navigate(item.route);
          onClose?.();
        }}
        style={styles.navigationButton}
      >
        <Ionicons name={item.icon} size={22} color="white" style={styles.iconStyle} />
        <Text style={styles.navigationText}>{item.label}</Text>
      </Pressable>
    ));

  const body = (
    <View style={styles.sidebarInner}>
      {renderDatabaseSelector()}
      {showNav ? (
        <View style={styles.navGroup}>{renderNavButtons()}</View>
      ) : (
        <Text style={styles.navDisabledText}>
          Select or create a database to unlock the menu.
        </Text>
      )}
    </View>
  );

  if (isLarge) {
    return <View style={styles.sidebarFixed}>{body}</View>;
  }

  return <View style={styles.sidebarOverlay}>{body}</View>;
}

const styles = StyleSheet.create({
  sidebarFixed: {
    width: SIDEBAR_WIDTH,
    height: "100%",
    backgroundColor: colors.secondary,
  },
  sidebarOverlay: {
    position: "absolute",
    left: 0,
    top: 48,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: colors.secondary,
    zIndex: 1001,
    elevation: 6,
  },
  sidebarInner: {
    flex: 1,
    paddingTop: 24,
  },
  dbActiveRow: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    paddingTop: 4,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dbLabel: {
    color: "#9ca3af",
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dbName: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 4,
  },
  dbList: {
    paddingTop: 6,
    paddingBottom: 12,
  },
  dbOption: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  dbOptionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dbOptionName: {
    flex: 1,
  },
  dbOptionActive: {
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  dbOptionText: {
    color: "#e5e7eb",
    fontSize: 14,
  },
  dbOptionTextActive: {
    color: "white",
    fontWeight: "600",
  },
  dbDeleteBtn: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dbAddRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  dbAddText: {
    color: "#d1d5db",
    fontSize: 14,
    fontWeight: "600",
  },
  dbEmpty: {
    paddingHorizontal: 18,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  dbEmptyText: {
    color: "#d1d5db",
    fontSize: 14,
    fontWeight: "600",
  },
  navGroup: {
    marginTop: 16,
  },
  navDisabledText: {
    color: "#9ca3af",
    paddingHorizontal: 18,
    paddingTop: 18,
    fontSize: 13,
  },
  navigationButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  navigationText: {
    color: "white",
    fontSize: 12,
    flex: 1,
    padding: 16,
  },
  iconStyle: {
    color: "white",
  },
});
