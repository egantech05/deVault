import React from "react";
import { View, Text, Pressable } from "react-native";
import styles from "../styles";
import { colors } from "../../../components/Styles";
import PropertyField from "../components/PropertyField";
import ModalLarge from "../../../components/ModalLarge";

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

  if (!visible) return null;

  return (
    <ModalLarge
      visible={visible}
      onRequestClose={onClose}
      title={log ? log.typeName : "Log Details"}
      closeIconColor={colors.brand}
    >

      <ModalLarge.Body scroll>{renderModalContent()}</ModalLarge.Body>

      {log ? (
        <ModalLarge.Footer>
          {logEditing ? (
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
              <Pressable style={[styles.footerPrimaryButton, { flex: 1 }]} onPress={onStartEdit}>
                <Text style={styles.saveButtonText}>Edit Log</Text>
              </Pressable>
            </View>
          )}
        </ModalLarge.Footer>
      ) : null}
    </ModalLarge>
  );
}
