// LogTemplatesScreen.js
import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  useWindowDimensions,
  TextInput,
  Pressable,
  Alert,
  StyleSheet,
} from "react-native";
import { colors, commonStyles } from "../components/Styles";
import { Ionicons } from "@expo/vector-icons";
import AutoShrinkText from "../components/AutoShrinkText";
import { getCardSize } from "../utils/cardLayout";
import ModalSmall from "../components/ModalSmall";
import SearchBar from "../components/SearchBar";
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
import NewLogTemplateModal from "./LogTemplatesScreen/NewLogTemplateModal";
import ViewLogTemplatesModal from "./LogTemplatesScreen/ViewLogTemplatesModal";



const KIND = "log";

export default function LogTemplatesScreen() {
  const { width } = useWindowDimensions();

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [nameTouched, setNameTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { activeDatabaseId, openCreateModal, canDelete } = useDatabase();

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
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const modalStyles = ModalSmall.styles;

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

  const requestDeleteTemplate = () => {
    if (!canDelete) {
      Alert.alert("Permission", "Only admins can delete templates.");
      return;
    }
    if (!selectedTemplate) return;
    setDeleteModalVisible(true);
  };

  const performDeleteTemplate = async () => {
    if (!selectedTemplate) {
      setDeleteModalVisible(false);
      return;
    }
    if (!canDelete) {
      Alert.alert("Permission", "Only admins can delete templates.");
      setDeleteModalVisible(false);
      return;
    }
    if (!activeDatabaseId) {
      openCreateModal();
      setDeleteModalVisible(false);
      return;
    }

    setDeletingTemplate(true);
    try {
      await deleteTemplateApi(KIND, selectedTemplate.id, activeDatabaseId);
      Alert.alert("Deleted", "Template removed.");
      setDetailsVisible(false);
      setSelectedTemplate(null);
      setDeleteModalVisible(false);
      await loadTemplates();
    } catch (e) {
      console.error("delete template error:", e);
      Alert.alert("Error", "Failed to delete template.");
    } finally {
      setDeletingTemplate(false);
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

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Search..."
        autoCapitalize="none"
        autoCorrect={false}
      />

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
      <NewLogTemplateModal
        visible={isModalVisible}
        onClose={() => setIsModalVisible(false)}
        templateName={templateName}
        onTemplateNameChange={(value) => {
          setTemplateName(value);
          setNameTouched(true);
        }}
        onTemplateNameBlur={() => setNameTouched(true)}
        showDuplicateNameError={nameTouched && isDuplicateName}
        nameTouched={nameTouched}
        properties={properties}
        onAddProperty={addProperty}
        onUpdateProperty={updateProperty}
        onRemoveProperty={removeProperty}
        canSave={canSaveNew}
        onSave={handleAddTemplate}
      />

      {/* Details Modal */}
      <ViewLogTemplatesModal
        visible={detailsVisible}
        onClose={() => {
          setDetailsVisible(false);
          setSelectedTemplate(null);
        }}
        detailName={detailName}
        onChangeDetailName={setDetailName}
        detailProps={detailProps}
        onAddDetailProperty={addDetailProperty}
        onUpdateDetailProperty={updateDetailProperty}
        onRemoveDetailProperty={removeDetailProperty}
        canDelete={canDelete}
        onDelete={requestDeleteTemplate}
        deleteDisabled={deletingTemplate}
        onSave={saveTemplateEdits}
      />

      <ModalSmall
        visible={deleteModalVisible}
        onRequestClose={() => !deletingTemplate && setDeleteModalVisible(false)}
        animationType="fade"
      >
        <ModalSmall.Title>Delete Template</ModalSmall.Title>
        <ModalSmall.Subtitle>
          {selectedTemplate ? `Delete "${selectedTemplate.name}"?` : "Delete this template?"}
        </ModalSmall.Subtitle>
        <ModalSmall.Footer>
          <Pressable
            onPress={() => setDeleteModalVisible(false)}
            disabled={deletingTemplate}
            style={modalStyles.cancelButton}
          >
            <Text style={modalStyles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={performDeleteTemplate}
            disabled={deletingTemplate}
            style={[
              modalStyles.primaryButton,
              { backgroundColor: "#dc2626" },
              deletingTemplate && modalStyles.primaryButtonDisabled,
            ]}
          >
            <Text style={modalStyles.primaryButtonText}>
              {deletingTemplate ? "Deleting…" : "Delete"}
            </Text>
          </Pressable>
        </ModalSmall.Footer>
      </ModalSmall>
    </View>
  );
}

export const styles = StyleSheet.create({
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
  },
  addCard: {
    backgroundColor: colors.secondary,
    padding: 12,
    borderRadius: 13,
    margin: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  nameText: { fontWeight: "bold" },
  nameTextWrap: { flex: 1, justifyContent: "flex-end" },
});
