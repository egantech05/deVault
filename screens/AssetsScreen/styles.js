
import { StyleSheet } from "react-native";
import { colors } from "../../components/Styles";

const styles = StyleSheet.create({
    // ====== Assets grid (screen) ======
    scrollContainer: { flex: 1 },
    displayCardContainer: {
        flex: 1,
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "center",
    },
    displayCard: { backgroundColor: "white", padding: 12, borderRadius: 13, margin: 8 },
    addCard: {
        backgroundColor: colors.secondary,
        padding: 12,
        borderRadius: 13,
        margin: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    templateText: { alignSelf: "flex-end", fontWeight: "bold" },
    nameText: { fontWeight: "bold", textTransform: "uppercase" },
    nameTextWrap: { flex: 1, justifyContent: "flex-end" },

    // ====== Modal frame ======
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
        overflow: "visible",
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
    modalScrollView: { flex: 1, height: "80%", overflow: "visible" },
    modalContent: { padding: 20 },

    // ====== Inputs / form ======
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

    modalFooter: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: "#e0e0e0",
        flexShrink: 0,
    },
    buttonContainer: { flexDirection: "row", justifyContent: "space-between" },
    cancelButton: {
        flex: 1,
        padding: 12,
        marginRight: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.brand,
    },
    cancelButtonText: { textAlign: "center", color: colors.normal, fontWeight: "bold" },
    saveButton: {
        flex: 1,
        padding: 12,
        marginLeft: 8,
        borderRadius: 8,
        backgroundColor: colors.primary,
    },
    saveButtonText: { textAlign: "center", color: "white", fontWeight: "bold" },
    footerPrimaryButton: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 8,
        backgroundColor: colors.primary,
        minWidth: 120,
    },

    pickerWrapper: {
        borderWidth: 1,
        borderColor: "#ddd",
        borderRadius: 6,
        backgroundColor: "#f9f9f9",
        position: "relative",
    },
    webPickerIcon: {
        position: "absolute",
        right: 10,
        top: 0,
        bottom: 0,
        justifyContent: "center",
        alignItems: "center",
    },
    picker: { height: 40, width: "100%" },
    propertyContainer: {
        backgroundColor: "#f8f9fa",
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
    },
    helperText: { marginTop: 6, color: "#888" },
    

    // ====== Tabs bar ======
    tabsBar: {
        flexDirection: "row",
        alignItems: "center",
        borderBottomWidth: 1,
        borderBottomColor: "#e0e0e0",
        backgroundColor: "#fafafa",
        paddingRight: 8,
    },
    tabsList: {
        flexDirection: "row",
        flex: 1,
    },
    tabActionButton: {
        marginLeft: 12,
        paddingHorizontal: 8,
        paddingVertical: 8,
        justifyContent: "center",
        alignItems: "center",
    },
    tabItem: { paddingHorizontal: 16, paddingVertical: 12 },
    tabItemActive: { borderBottomWidth: 3, borderBottomColor: colors.primary },
    tabText: { color: "#666", fontWeight: "600" },
    tabTextActive: { color: colors.primary },

    // ====== Logs ======
    logsHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    primaryChip: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
    },
    primaryChipText: { color: "white", marginLeft: 6, fontWeight: "700" },


    templateGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    templateCard: {
        backgroundColor: "white",
        borderWidth: 1,
        borderColor: "#e9ecef",
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 12,
        marginRight: 8,
        marginBottom: 8,
        minWidth: 120,
    },
    templateCardTitle: { fontWeight: "700", color: colors.primary },

    logRow: {
        flexDirection: "row",
        alignItems: "stretch",
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
        borderRadius: 10,
        backgroundColor: "white",
        marginBottom: 10,
    },
    logRowContent: { flex: 1, paddingRight: 12 },

    logRowTitle: { fontWeight: "800", color: colors.primary, marginBottom: 8 },
    logRowActionColumn: {
        alignItems: "center",
        justifyContent: "flex-start",
        paddingLeft: 12,
        minWidth: 90,
    },
    logRowTime: { color: "#888", marginBottom: 16, textAlign: "center", width: "100%" },
    deleteLogButton: {
        padding: 6,
        borderRadius: 999,
        alignSelf: "flex-end",
    },
    logValuePills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
    valuePill: {
        backgroundColor: "#f1f3f5",
        borderWidth: 1,
        borderColor: "#e9ecef",
        borderRadius: 999,
        paddingHorizontal: 10,
        paddingVertical: 6,
    },
    valuePillText: { color: "#333", fontWeight: "600" },

    // ====== Docs ======
    docsHeaderRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    docRow: {
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderWidth: 1,
        borderColor: "#e9ecef",
        borderRadius: 10,
        backgroundColor: "white",
        marginBottom: 10,
        flexDirection: "row",
        alignItems: "center",
        gap: 12,
    },
    docName: { fontWeight: "700", color: colors.primary },
    docMeta: { color: "#888", marginTop: 2 },

    scrollPadBottom: { paddingBottom: 20 },
    docDeleteButton: {
        padding: 6,
        borderRadius: 999,
        justifyContent: "center",
        alignItems: "center",
    },
});

export default styles;
