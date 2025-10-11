import React, { useMemo, useState, useRef } from "react";
import { Modal, View, Text, Pressable, ScrollView, Alert } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InfoTab from "./InfoTab";
import LogsTab from "./LogsTab";
import DocsTab from "./DocsTab";
import ComponentsTab from "./ComponentsTab";
import { colors } from "../../../components/Styles";
import styles from "../styles";

const TABS = { INFO: "Info", LOGS: "Logs", DOCS: "Documents", COMPS: "Components" };

export default function AssetDetailsModal({ visible, onClose, asset, onAnySave }) {
    const [tab, setTab] = useState(TABS.INFO);
    const infoRef = useRef(null);

    // NEW: mirror InfoTab states so this component re-renders
    const [isInfoEditing, setIsInfoEditing] = useState(false);
    const [isInfoSaving, setIsInfoSaving] = useState(false);

    const title = useMemo(
        () => (asset?.templateName ? `${asset.templateName}` : "Asset Details"),
        [asset?.templateName]
    );

    if (!asset) return null;

    const guardedSwitchTab = (nextTab) => {
        if (tab === TABS.INFO && isInfoEditing) {
            Alert.alert("Discard changes?", "You have unsaved edits. Switch tabs and discard them?", [
                { text: "Stay", style: "cancel" },
                {
                    text: "Discard",
                    style: "destructive",
                    onPress: () => {
                        infoRef.current?.cancelEdit?.();
                        setTab(nextTab);
                    },
                },
            ]);
            return;
        }
        setTab(nextTab);
    };

    const guardedClose = () => {
        if (tab === TABS.INFO && isInfoEditing) {
            Alert.alert("Discard changes?", "You have unsaved edits. Close and discard them?", [
                { text: "Keep Editing", style: "cancel" },
                {
                    text: "Discard",
                    style: "destructive",
                    onPress: () => {
                        infoRef.current?.cancelEdit?.();
                        onClose?.();
                    },
                },
            ]);
            return;
        }
        onClose?.();
    };

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={guardedClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modal, { height: "80%" }]}>

                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <Pressable onPress={guardedClose}>
                            <Ionicons name="close" size={24} color={colors.brand} />
                        </Pressable>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabsBar}>
                        {[TABS.INFO, TABS.LOGS, TABS.DOCS, TABS.COMPS].map((t) => (
                            <Pressable
                                key={t}
                                onPress={() => guardedSwitchTab(t)}
                                style={[styles.tabItem, tab === t && styles.tabItemActive]}
                            >
                                <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>{t}</Text>
                            </Pressable>
                        ))}
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.modalScrollView}
                        showsVerticalScrollIndicator={false}
                        keyboardShouldPersistTaps="handled"
                        contentContainerStyle={styles.scrollPadBottom}
                    >
                        <View style={styles.modalContent}>
                            {tab === TABS.INFO && (
                                <InfoTab
                                    ref={infoRef}
                                    asset={asset}
                                    styles={styles}
                                    colors={colors}
                                    onSaved={onAnySave}
                                    onDeleted={() => {
                                        onAnySave?.();
                                        onClose?.();
                                    }}
                                    onEditingChange={setIsInfoEditing}  // <— NEW
                                    onSavingChange={setIsInfoSaving}    // <— NEW
                                />
                            )}
                            {tab === TABS.LOGS && <LogsTab asset={asset} styles={styles} colors={colors} />}
                            {tab === TABS.DOCS && <DocsTab asset={asset} styles={styles} colors={colors} />}
                            {tab === TABS.COMPS && <ComponentsTab asset={asset} styles={styles} colors={colors} />}
                        </View>
                    </ScrollView>

                    {/* Footer (uses your existing styles) */}
                    <View style={styles.modalFooter}>
                        <View style={[styles.buttonContainer, { alignItems: "stretch" }]}>

                            {tab === TABS.INFO ? (
                                <>
                                    {/* Left: Delete (Info tab only) */}
                                    <Pressable
                                        style={[styles.cancelButton, { flex: 1, marginRight: 8 }]}
                                        onPress={() => infoRef.current?.remove?.()}
                                    >
                                        <Text style={styles.cancelButtonText}>Delete Asset</Text>
                                    </Pressable>

                                    {/* Right: Edit OR (Cancel + Save) */}
                                    {isInfoEditing ? (
                                        <View style={{ flex: 1, flexDirection: "row" }}>
                                            <Pressable
                                                style={[styles.cancelButton, { flex: 1, marginRight: 8 }]}
                                                onPress={() => infoRef.current?.cancelEdit?.()}
                                            >
                                                <Text style={styles.cancelButtonText}>Cancel</Text>
                                            </Pressable>

                                            <Pressable
                                                style={[styles.saveButton, { flex: 1 }]}
                                                disabled={isInfoSaving}
                                                onPress={() => infoRef.current?.save?.()}
                                            >
                                                <Text style={styles.saveButtonText}>
                                                    {isInfoSaving ? "Saving..." : "Save Changes"}
                                                </Text>
                                            </Pressable>
                                        </View>
                                    ) : (
                                        <Pressable
                                            style={[styles.saveButton, { flex: 1 }]}
                                            onPress={() => infoRef.current?.beginEdit?.()}
                                        >
                                            <Text style={styles.saveButtonText}>Edit</Text>
                                        </Pressable>
                                    )}
                                </>
                            ) : (
                                <>
                                    <View style={{ flex: 1, marginRight: 8 }} />
                                    <View style={{ flex: 1 }} />
                                </>
                            )}
                        </View>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
