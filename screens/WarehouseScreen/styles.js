// screens/WarehouseScreen/styles.js
import { StyleSheet } from "react-native";
import { colors } from "../../components/Styles";

const styles = StyleSheet.create({
    // ====== Screen layout ======
    scrollContainer: { flex: 1 },

    searchRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
        marginBottom: 8,
    },
    searchBar: {
        padding: 16,
        borderColor: "white",
        borderBottomWidth: 3,
        height: 55,
        flexDirection: "row",
        flex: 1,
    },
    searchInput: { color: "white", marginLeft: 16, flex: 1 },

    histBtn: {
        height: 40,
        paddingHorizontal: 14,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.brand,
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "transparent",
    },
    histBtnActive: { backgroundColor: colors.secondary },
    histBtnText: { color: colors.brand, fontWeight: "bold" },

    displayCardContainer: {
        flex: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
    },
    displayCard: {
        backgroundColor: "white",
        padding: 12,
        borderRadius: 13,
        margin: 8,
        position: "relative",
        flexDirection: "column",
    },

    cardBottom: {
        flex: 1,
        justifyContent: "flex-end",
        gap: 6, // small vertical spacing (RN >= 0.71)
    },

    addCard: {
        backgroundColor: colors.secondary,
        padding: 12,
        borderRadius: 13,
        margin: 8,
        justifyContent: "center",
        alignItems: "center",
    },

    // Card text/badges
    qtyBadge: {
        position: "absolute",
        right: 10,
        top: 10,
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 4,
        backgroundColor: "#f7f7f7",
    },
    qtyBadgeText: { fontWeight: "bold" },
    modelText: { fontWeight: "bold" },
    mfgText: { marginTop: 0, opacity: 0.8 },

    historyRow: {
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: "#222",
        flexDirection: "row",
        justifyContent: "space-between",
        gap: 8,
    },

    // ====== Modal frame (matches Asset modal) ======
    modalOverlay: {
        flex: 1,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        justifyContent: "center",
        alignItems: "center",
    },
    modal: {
        width: "90%",
        backgroundColor: "white",
        borderRadius: 16,
        height: "80%",
        flexDirection: "column",
        overflow: "hidden",
    },
    modalHeader: {
        backgroundColor: colors.primary,
        borderTopLeftRadius: 13,
        borderTopRightRadius: 13,
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
        flexShrink: 0,
    },
    modalTitle: { fontSize: 18, fontWeight: "bold", color: "white" },

    tabsRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
        backgroundColor: "#fafafa",
        paddingHorizontal: 16,
    },
    tabsBar: {
        flexDirection: "row",
    },
    tabItem: { paddingHorizontal: 16, paddingVertical: 12 },
    tabItemActive: { borderBottomWidth: 3, borderBottomColor: colors.primary },
    tabText: { color: "#666", fontWeight: "600" },
    tabTextActive: { color: colors.primary },

    modalScrollView: { flex: 1 },
    modalContent: { padding: 20 },
    scrollPadBottom: { paddingBottom: 20 },

    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: "#e0e0e0",
        flexShrink: 0,
    },
    buttonContainer: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
    },

    // Buttons & inputs used in footer
    cancelButton: {
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.brand,
        alignItems: "center",
        justifyContent: "center",
    },
    cancelButtonText: { textAlign: "center", color: colors.normal, fontWeight: "bold" },
    saveButton: {
        padding: 12,
        borderRadius: 8,
        backgroundColor: colors.primary,
        alignItems: "center",
        justifyContent: "center",
    },
    saveButtonText: { textAlign: "center", color: "white", fontWeight: "bold" },

    deleteInlineBtn: {
        borderRadius: 8,
        borderWidth: 1,
        borderColor: "#dc2626",
        paddingVertical: 8,
        paddingHorizontal: 14,
        backgroundColor: "white",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 12,
    },
    deleteInlineText: { color: "#dc2626", fontWeight: "700" },

    // Shared input look
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 16, color: colors.primary, marginBottom: 8 },
    input: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
        backgroundColor: "#f9f9f9",
    },
    readonlyInput: { opacity: 0.9 },
    helperText: { marginTop: 6, color: "#888" },
});

export default styles;
