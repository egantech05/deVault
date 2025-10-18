// LogTemplatesScreen.js
import React, { useState, useEffect, useRef, useMemo,useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  useWindowDimensions,
  TextInput,
  Pressable,
  Modal,
  Alert,
  StyleSheet,
} from "react-native";
import { colors, commonStyles } from "../components/Styles";
import { Ionicons } from "@expo/vector-icons";
import AutoShrinkText from "../components/AutoShrinkText";
import PropertyRow from "../components/templates/PropertyRow";
import { getCardSize } from "../utils/cardLayout";
import {
  listTemplates,
  createTemplate,
  getTemplateFields,
  updateTemplateName,
  upsertTemplateFields,
  archiveFields,
  deleteTemplate as deleteTemplateApi,
} from "../services/templatesApi";
import { useDatabase } from "../contexts/DatabaseContext";



const KIND = "log";

export default function LogTemplatesScreen() {
  const { width } = useWindowDimensions();

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { activeDatabaseId, openCreateModal } = useDatabase();

  // Create modal fields
  const [properties, setProperties] = useState([
    { id: 1, name: "", property_type: "text", default_value: "" },
  ]);

  // Templates list + details editor
  const [templates, setTemplates] = useState([]);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [detailName, setDetailName] = useState("");
  const [detailProps, setDetailProps] = useState([]);

  // Duplicate name guard
  const normalizedNewName = templateName.trim().toLowerCase();
  const isDuplicateName =
    !!normalizedNewName &&
    templates.some((t) => (t.name || "").toLowerCase() === normalizedNewName);
  const canSaveNew = !!templateName.trim() && !isDuplicateName && !isLoading;

  // Load templates
  const loadTemplates = useCallback(async () => {
    if (!activeDatabaseId) {
      setTemplates([]);
      return;
    }
  
    try {
      const rows = await listTemplates(KIND, activeDatabaseId);
      setTemplates(rows);
    } catch (e) {
      console.error('loadTemplates error:', e);
    }
  }, [activeDatabaseId]);
  
  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  // Layout
  const cardSize = getCardSize(width);
  const addIconSize = 0.5 * cardSize;
  const numColumns = useMemo(() => Math.max(1, Math.floor(width / (cardSize + 16))), [width, cardSize]);
  const listKey = useMemo(() => `log-templates-cols-${numColumns}`, [numColumns]);
  const rowStyle = { justifyContent: "center" };

  // Create-modal helpers
  const nextIdRef = useRef(2);
  const addProperty = () => {
    setProperties((prev) => [
      ...prev,
      {
        id: nextIdRef.current++,
        name: "",
        property_type: "text",
        default_value: "",
      },
    ]);
  };
  const removeProperty = (id) => {
    if (properties.length > 1) {
      setProperties((prev) => prev.filter((p) => p.id !== id));
    }
  };
  const updateProperty = (id, field, value) => {
    setProperties((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Search
  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter((t) => (t.name || "").toLowerCase().includes(q));
  }, [templates, searchQuery]);

  // Create template
  const handleAddTemplate = async () => {
    if (!activeDatabaseId) {
      openCreateModal();
      return;
    }

    if (!templateName.trim()) {
      Alert.alert("Error", "Please enter a template name");
      return;
    }
    setIsLoading(true);
    try {
      await createTemplate(KIND, {
        name: templateName.trim(),
        properties: properties.filter((p) => p.name.trim()),
        databaseId:activeDatabaseId,
      });
      Alert.alert("Success", "Template created successfully");
      setTemplateName("");
      setProperties([
        { id: 1, name: "", property_type: "text", default_value: "" },
      ]);
      setIsModalVisible(false);
      loadTemplates();
    } catch (e) {
      Alert.alert("Error", "Failed to create template");
      console.error("Error creating template:", e);
    }
    setIsLoading(false);
  };

  // Open details
  const openDetails = async (tpl) => {
    setSelectedTemplate(tpl);
    setDetailName(tpl.name);
    try {
      const fields = await getTemplateFields(KIND, tpl.id);
      const normalized = fields.map((r) => ({
        id: r.id,
        name: r.name,
        property_type: r.property_type,
        default_value: r.default_value,
      }));
      setDetailProps(
        normalized.length
          ? normalized
          : [
            {
              id: `new-${Date.now()}`,
              name: "",
              property_type: "text",
              default_value: "",
            },
          ]
      );
    } catch (e) {
      console.error("fetch props error:", e);
      setDetailProps([]);
    }
    setDetailsVisible(true);
  };

  // Details editor helpers
  const updateDetailProperty = (id, field, value) => {
    setDetailProps((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };
  const addDetailProperty = () => {
    setDetailProps((prev) => [
      ...prev,
      {
        id: `new-${Date.now()}`,
        name: "",
        property_type: "text",
        default_value: "",
      },
    ]);
  };
  const removeDetailProperty = (id) => {
    setDetailProps((prev) =>
      prev.length > 1 ? prev.filter((p) => p.id !== id) : prev
    );
  };

  // Save edits
  const saveTemplateEdits = async () => {
    if (!selectedTemplate) return;

    const cleanName = detailName.trim();
    if (!cleanName) {
      Alert.alert("Validation", "Template name cannot be empty.");
      return;
    }

    try {
      await updateTemplateName(KIND, selectedTemplate.id, cleanName, activeDatabaseId);

      const existing = await getTemplateFields(KIND, selectedTemplate.id);
      const existingIds = new Set(existing.map((r) => String(r.id)));

      const normalized = detailProps
        .map((p, idx) => ({
          rawId: String(p.id),
          template_id: selectedTemplate.id,
          property_name: (p.name || "").trim(),
          property_type: p.property_type || "text",
          default_value: p.default_value ?? null,
          display_order: idx,
        }))
        .filter((r) => r.property_name);

      const updates = normalized.filter((r) => !r.rawId.startsWith("new-"));
      const inserts = normalized.filter((r) => r.rawId.startsWith("new-"));

      await upsertTemplateFields(KIND, {
        templateId: selectedTemplate.id,
        updates,
        inserts,
      });

      const keptDbIds = new Set(updates.map((u) => u.rawId));
      const toArchive = [...existingIds].filter((id) => !keptDbIds.has(id));
      if (toArchive.length) await archiveFields(KIND, toArchive);

      Alert.alert("Success", "Template updated.");
      setDetailsVisible(false);
      setSelectedTemplate(null);
      await loadTemplates();
    } catch (e) {
      console.error("saveTemplateEdits error:", e);
      Alert.alert("Error", e.message || "Failed to save template changes.");
    }
  };

  // Main grid (Add tile + templates)
  const mainListData = useMemo(
    () => [{ _type: "add", id: "__add__" }, ...filteredTemplates],
    [filteredTemplates]
  );

  const renderMainItem = ({ item }) => {
    if (item._type === "add") {
      return (
        <Pressable
          style={[styles.addCard, { width: cardSize, height: cardSize }]}
          onPress={() => setIsModalVisible(true)}
          accessibilityRole="button"
        >
          <Ionicons name="add" size={addIconSize} color={colors.brand} />
        </Pressable>
      );
    }
    return (
      <Pressable
        style={[styles.displayCard, { width: cardSize, height: cardSize }]}
        onPress={() => openDetails(item)}
        accessibilityRole="button"
      >
        <View style={styles.nameTextWrap}>
          <AutoShrinkText
            style={styles.nameText}
            initialSize={cardSize * 0.15}
            maxLines={5}
            minSize={1}
          >
            {item.name}
          </AutoShrinkText>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={commonStyles.contentContainer}>
      <Text style={commonStyles.textPrimary}>Log Templates</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color="white" />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor="white"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        key={listKey}
        data={mainListData}
        keyExtractor={(item) =>
          item._type === "add" ? "__add__" : String(item.id)
        }
        renderItem={renderMainItem}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? rowStyle : null}
        contentContainerStyle={
          numColumns === 1 ? styles.displayCardContainer : undefined
        }
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={
          <Text style={{ color: "#888", marginTop: 12 }}>
            No templates found.
          </Text>
        }
        initialNumToRender={12}
        windowSize={5}
        removeClippedSubviews
      />

      {/* Add Template Modal */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Log Template</Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.brand} />
              </Pressable>
            </View>

            <FlatList
              data={properties}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <PropertyRow
                  property={item}
                  onChange={(field, value) =>
                    updateProperty(item.id, field, value)
                  }
                  onRemove={() => removeProperty(item.id)}
                  canRemove={properties.length > 1}
                  namePlaceholder="Property Name"
                />
              )}
              ListHeaderComponent={
                <View style={styles.modalContent}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Template Name</Text>
                    <TextInput
                      style={styles.input}
                      value={templateName}
                      onChangeText={(v) => {
                        setTemplateName(v);
                        setNameTouched(true);
                      }}
                      onBlur={() => setNameTouched(true)}
                      placeholder="Enter template name"
                      placeholderTextColor="#999"
                    />
                    {nameTouched && isDuplicateName && (
                      <Text style={styles.fieldError}>
                        A template with this name already exists.
                      </Text>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Properties</Text>
                  </View>
                </View>
              }
              ListFooterComponent={
                <View style={[styles.modalContent, { paddingTop: 0 }]}>
                  <Pressable style={styles.addPropertyButton} onPress={addProperty}>
                    <Ionicons name="add" size={20} color={colors.brand} />
                    <Text style={styles.addPropertyText}>Add Property</Text>
                  </Pressable>
                </View>
              }
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={false}
            />

            <View style={styles.modalFooter}>
              <View style={styles.buttonContainer}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveButton, !canSaveNew && { opacity: 0.6 }]}
                  onPress={canSaveNew ? handleAddTemplate : undefined}
                  accessibilityState={{ disabled: !canSaveNew }}
                >
                  <Text style={styles.saveButtonText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setDetailsVisible(false);
          setSelectedTemplate(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { height: "70%" }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Template Details</Text>
              <Pressable
                onPress={() => {
                  setDetailsVisible(false);
                  setSelectedTemplate(null);
                }}
              >
                <Ionicons name="close" size={24} color={colors.brand} />
              </Pressable>
            </View>

            <FlatList
              data={detailProps}
              keyExtractor={(item) => String(item.id)}
              renderItem={({ item }) => (
                <PropertyRow
                  property={item}
                  onChange={(field, value) =>
                    updateDetailProperty(item.id, field, value)
                  }
                  onRemove={() => removeDetailProperty(item.id)}
                  canRemove={detailProps.length > 1}
                />
              )}
              ListHeaderComponent={
                <View style={styles.modalContent}>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Template Name</Text>
                    <TextInput
                      style={styles.input}
                      value={detailName}
                      onChangeText={setDetailName}
                      placeholder="Enter template name"
                      placeholderTextColor="#999"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Properties</Text>
                  </View>
                </View>
              }
              ListFooterComponent={
                <View style={[styles.modalContent, { paddingTop: 0 }]}>
                  <Pressable
                    style={[styles.addPropertyButton, { marginTop: 8 }]}
                    onPress={addDetailProperty}
                  >
                    <Ionicons name="add" size={20} color={colors.brand} />
                    <Text style={styles.addPropertyText}>Add Property</Text>
                  </Pressable>
                </View>
              }
              contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              removeClippedSubviews={false}
            />

            <View style={styles.modalFooter}>
              <View style={styles.buttonContainer}>
                <Pressable
                  style={[styles.cancelButton, { borderColor: "#ff4444" }]}
                  onPress={async () => {
                    if (!selectedTemplate) return;
                    try {
                      await deleteTemplateApi(KIND, selectedTemplate.id,activeDatabaseId);
                    } catch (e) {
                      console.error("delete template error:", e);
                      Alert.alert("Error", "Failed to delete template.");
                      return;
                    }
                    Alert.alert("Deleted", "Template removed.");
                    setDetailsVisible(false);
                    setSelectedTemplate(null);
                    await loadTemplates();
                  }}
                >
                  <Text style={[styles.cancelButtonText, { color: "#ff4444" }]}>
                    Delete Template
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.saveButton, { marginLeft: 8 }]}
                  onPress={saveTemplateEdits}
                >
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

/* Styles (kept from your original) */
export const styles = StyleSheet.create({
  scrollContainer: { flex: 1 },
  displayCardContainer: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "center",
  },

  searchBar: {
    padding: 16,
    borderColor: "white",
    borderBottomWidth: 3,
    height: 55,
    flexDirection: "row",
    marginBottom: 8,
  },
  searchInput: { color: "white", marginLeft: 16, flex: 1 },

  displayCard: {
    backgroundColor: "white",
    padding: 12,
    borderRadius: 13,
    margin: 8,
  },
  addCard: {
    backgroundColor: colors.secondary,
    padding: 12,
    borderRadius: 13,
    margin: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  countText: { alignSelf: "flex-end", fontWeight: "bold" },
  nameText: { fontWeight: "bold" },
  nameTextWrap: { flex: 1, justifyContent: "flex-end" },

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
  modalScrollView: { flex: 1, height: "80%", overflow: "visible" }, // legacy ref if used elsewhere
  modalContent: { padding: 20 },

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

  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    flexShrink: 0,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  cancelButtonText: {
    textAlign: "center",
    color: colors.normal,
    fontWeight: "bold",
  },
  saveButton: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    textAlign: "center",
    color: "white",
    fontWeight: "bold",
  },

  propertyRow: { flexDirection: "row", alignItems: "center", marginBottom: 12 },
  propertyInputs: { flex: 1, marginRight: 8 },
  propertyNameInput: { flex: 1 },

  removeButton: { padding: 8, borderRadius: 6, backgroundColor: "#ffe6e6" },
  addPropertyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderWidth: 2,
    borderColor: colors.brand,
    borderStyle: "dashed",
    borderRadius: 8,
    backgroundColor: "#f9f9f9",
  },
  addPropertyText: { marginLeft: 8, color: colors.brand, fontWeight: "bold" },

  propertyContainer: {
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e9ecef",
  },

  propertyNameContainer: { flex: 2, marginRight: 8 },
  propertyTypeContainer: {
    flex: 1,
    marginRight: 8,
    zIndex: 1,
    position: "relative",
    elevation: 4,
  },

  pickerContainer: { flexDirection: "row", alignItems: "center" },
  pickerLabel: {
    fontSize: 12,
    color: colors.primary,
    marginRight: 4,
    fontWeight: "bold",
  },
  pickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    backgroundColor: "#f9f9f9",
    overflow: "visible",
  },
  picker: { height: 40, width: "100%" },

  defaultValueSection: { marginTop: 8 },
  defaultValueLabel: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 4,
    fontWeight: "bold",
  },

  booleanContainer: { flexDirection: "row" },
  booleanButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 6,
    marginRight: 8,
  },
  booleanButtonSelected: { backgroundColor: colors.brand },
  booleanButtonText: { color: colors.brand, fontSize: 12, fontWeight: "bold" },
  booleanButtonTextSelected: { color: "white" },

  selectContainer: { marginTop: 4 },
  selectLabel: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 4,
    fontWeight: "bold",
  },
  selectOptionRow: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  selectOptionInput: { flex: 1, marginRight: 8, fontSize: 12 },
  removeOptionButton: { padding: 4 },
  addOptionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 8,
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: "dashed",
    borderRadius: 4,
    backgroundColor: "#f9f9f9",
    marginTop: 4,
  },
  addOptionText: { marginLeft: 4, color: colors.brand, fontSize: 12, fontWeight: "bold" },

  fieldError: { color: "#ff4444", marginTop: 6, fontSize: 12, fontWeight: "600" },
});
