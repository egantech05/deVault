import React, { useMemo, useState, useRef } from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import InfoTab from "./InfoTab";
import LogsTab from "./LogsTab";
import DocsTab from "./DocsTab";
import { colors } from "../../../components/Styles";
import styles from "../styles";

const TABS = { INFO: "Info", LOGS: "Logs", DOCS: "Documents", COMPS: "Components" };

export default function AssetDetailsModal({
    visible,
    onClose,
    asset,            // { id, templateId, templateName }
    onAnySave,        // callback to refresh cards when something changes
}) {
    const [tab, setTab] = useState(TABS.INFO);
    const infoRef = useRef(null);  // <— to call InfoTab actions

    const title = useMemo(
        () => (asset?.templateName ? `${asset.templateName}` : "Asset Details"),
        [asset?.templateName]
    );

    if (!asset) return null;

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
            <View style={styles.modalOverlay}>
                <View style={[styles.modal, { height: "80%" }]}>
                    {/* Header */}
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>{title}</Text>
                        <Pressable onPress={onClose}>
                            <Ionicons name="close" size={24} color={colors.brand} />
                        </Pressable>
                    </View>

                    {/* Tabs */}
                    <View style={styles.tabsBar}>
                        {[TABS.INFO, TABS.LOGS, TABS.DOCS, TABS.COMPS].map((t) => (
                            <Pressable
                                key={t}
                                onPress={() => setTab(t)}
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
                                />
                            )}

                            {tab === TABS.LOGS && (
                                <LogsTab asset={asset} styles={styles} colors={colors} />
                            )}

                            {tab === TABS.DOCS && (
                                <DocsTab asset={asset} styles={styles} colors={colors} />
                            )}

                            {tab === TABS.COMPS && (
                                <View style={{ paddingTop: 4 }}>
                                    <Text style={{ color: "#888" }}>Components — coming soon.</Text>
                                </View>
                            )}
                        </View>
                    </ScrollView>

                    {/* Sticky footer for INFO tab ONLY */}
                    {tab === TABS.INFO && (
                        <View style={styles.modalFooter}>
                            <View style={styles.buttonContainer}>
                                <Pressable
                                    style={[styles.cancelButton, { borderColor: "#ff4444" }]}
                                    onPress={() => infoRef.current?.remove()}
                                >
                                    <Text style={[styles.cancelButtonText, { color: "#ff4444" }]}>Delete Asset</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.saveButton, { marginLeft: 8 }]}
                                    onPress={() => infoRef.current?.save()}
                                >
                                    <Text style={styles.saveButtonText}>Save Changes</Text>
                                </Pressable>
                            </View>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
}
