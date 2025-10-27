import React from "react";
import { Modal, View, Text, Pressable, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import styles from "../styles";
import { colors } from "../../../components/Styles";
import PropertyField from "../components/PropertyField";

export default function ViewLogModal({
  visible,
  log,
  detailFields = [],
  logEditing = false,
  logEditFields = [],
  savingLog = false,
  onClose,
  onStartEdit,
  onCancelEdit,
  onChangeField,
  onSave,
}) {
  const renderEditingFields = () =>
    logEditFields.map((field, idx) => (
      <View key={`${field.id}-${idx}`} style={styles.propertyContainer}>
        <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: "600" }}>
          {field.name}
        </Text>
        <PropertyField
          type={field.property_type}
          value={field.value}
          onChange={(val) => onChangeField?.(field, idx, val)}
          style={styles.input}
        />
      </View>
    ));

  const renderReadonlyFields = () =>
    detailFields.map((field, idx) => (
      <View key={`${field.id}-${idx}`} style={styles.propertyContainer}>
        <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: "600" }}>
          {field.name}
        </Text>
        <PropertyField
          type={field.property_type}
          value={field.value}
          editable={false}
          readOnly
          disabled
          style={[styles.input, styles.readonlyInput]}
        />
      </View>
    ));

  const renderModalContent = () => {
    if (!log) {
      return <Text style={{ color: "#888" }}>No log selected.</Text>;
    }

    if (logEditing) {
      return renderEditingFields();
    }

    if (detailFields.length) {
      return renderReadonlyFields();
    }

    return <Text style={{ color: "#888" }}>No values recorded for this log.</Text>;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={[styles.modal, { height: "60%" }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{log ? log.typeName : "Log Details"}</Text>
            <Pressable onPress={onClose}>
              <Ionicons name="close" size={24} color={colors.brand} />
            </Pressable>
          </View>

          <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
            <View style={styles.modalContent}>{renderModalContent()}</View>
          </ScrollView>

          <View style={styles.modalFooter}>
            {log ? (
              logEditing ? (
                <View style={[styles.buttonContainer, { alignItems: "stretch" }]}>
                  <Pressable
                    style={[styles.cancelButton, { flex: 1, marginRight: 8 }]}
                    onPress={onCancelEdit}
                    disabled={savingLog}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    style={[styles.saveButton, { flex: 1, opacity: savingLog ? 0.6 : 1 }]}
                    onPress={onSave}
                    disabled={savingLog}
                  >
                    <Text style={styles.saveButtonText}>{savingLog ? "Saving…" : "Save"}</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={[styles.buttonContainer, { alignItems: "center" }]}>
                  <Pressable
                    style={[styles.footerPrimaryButton, { flex: 1 }]}
                    onPress={onStartEdit}
                  >
                    <Text style={styles.saveButtonText}>Edit Log</Text>
                  </Pressable>
                </View>
              )
            ) : null}
          </View>
        </View>
      </View>
    </Modal>
  );
}
