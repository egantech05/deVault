import React from "react";
import { View, Text, Pressable, TextInput, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../components/Styles";
import PropertyRow from "../../components/PropertyRow";
import ModalLarge from "../../components/ModalLarge";

export default function NewTemplateModal({
  visible,
  templateName,
  onChangeTemplateName,
  onBlurTemplateName,
  nameTouched,
  isDuplicateName,
  properties,
  onAddProperty,
  onRemoveProperty,
  onUpdateProperty,
  canSave,
  onSubmit,
  onClose,
}) {
  return (
    <ModalLarge
      visible={visible}
      onRequestClose={onClose}
      title="Create Template"
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
            value={templateName}
            onBlur={onBlurTemplateName}
            onChangeText={onChangeTemplateName}
            placeholder="Template name"
            autoCapitalize="words"
            placeholderTextColor="#999"
          />
          {nameTouched && !templateName.trim() ? (
            <Text style={styles.errorText}>Template name is required.</Text>
          ) : null}
          {isDuplicateName ? (
            <Text style={styles.errorText}>Template name already exists.</Text>
          ) : null}
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Properties</Text>
          {properties.map((prop) => (
            <PropertyRow
              key={prop.id}
              property={prop}
              onChange={(field, value) =>
                onUpdateProperty(prop.id, field, value)
              }
              onRemove={() => onRemoveProperty(prop.id)}
              canRemove={properties.length > 1}
              showDefaultValue={false}
            />
          ))}

          <Pressable style={styles.addRowButton} onPress={onAddProperty}>
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
        <Pressable style={styles.cancelButton} onPress={onClose}>
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </Pressable>
        <Pressable
          style={[styles.primaryButton, !canSave && styles.disabledButton]}
          disabled={!canSave}
          onPress={onSubmit}
        >
          <Text style={styles.primaryButtonText}>Create</Text>
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
  errorText: {
    color: "#f87171",
    marginTop: 6,
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
  cancelButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  cancelButtonText: {
    color: colors.brand,
    fontWeight: "600",
  },
  primaryButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: colors.brand,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  disabledButton: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: "white",
    fontWeight: "700",
  },
});
