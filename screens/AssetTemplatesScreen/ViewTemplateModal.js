import React from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../components/Styles";
import PropertyRow from "../../components/PropertyRow";
import ModalLarge from "../../components/ModalLarge";

export default function ViewTemplateModal({
  visible,
  detailName,
  onChangeDetailName,
  detailProps,
  onAddDetailProperty,
  onRemoveDetailProperty,
  onUpdateDetailProperty,
  canDelete,
  onDelete,
  onSave,
  onClose,
}) {
  return (
    <ModalLarge
      visible={visible}
      onRequestClose={onClose}
      title="Edit Template"
      closeIconColor={colors.brand}
    >
      <ModalLarge.Body
        scroll
        contentContainerStyle={styles.bodyContent}
        style={styles.body}
      >
        <View style={styles.section}>
          <Text style={styles.label}>Template Name</Text>
          <TextInput
            style={styles.input}
            value={detailName}
            onChangeText={onChangeDetailName}
            placeholder="Template name"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Properties</Text>
          {detailProps.map((prop) => (
            <PropertyRow
              key={prop.id}
              property={prop}
              onChange={(field, value) =>
                onUpdateDetailProperty(prop.id, field, value)
              }
              onRemove={() => onRemoveDetailProperty(prop.id)}
              canRemove={detailProps.length > 1}
            />
          ))}

          <Pressable style={styles.addRowButton} onPress={onAddDetailProperty}>
            <Ionicons
              name="add-circle-outline"
              size={18}
              color={colors.brand}
            />
            <Text style={styles.addRowText}>Add property</Text>
          </Pressable>
        </View>
      </ModalLarge.Body>

      <ModalLarge.Footer style={styles.footer}>
        {canDelete ? (
          <Pressable style={styles.dangerButton} onPress={onDelete}>
            <Text style={styles.dangerButtonText}>Delete</Text>
          </Pressable>
        ) : null}
        <Pressable style={styles.primaryButton} onPress={onSave}>
          <Text style={styles.primaryButtonText}>Save</Text>
        </Pressable>
      </ModalLarge.Footer>
    </ModalLarge>
  );
}

const styles = StyleSheet.create({
  body: {
    backgroundColor: "white",
  },
  bodyContent: {
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    color: colors.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#f9f9f9",
  },
  addRowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  addRowText: {
    color: colors.brand,
    fontWeight: "600",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  dangerButton: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  dangerButtonText: {
    color: "white",
    fontWeight: "700",
  },
  primaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.brand,
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "700",
  },
});
