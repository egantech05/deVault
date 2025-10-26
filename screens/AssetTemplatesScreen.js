import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, FlatList, useWindowDimensions,
  TextInput, Pressable, Modal, Alert, ScrollView
} from "react-native";
import { colors, commonStyles } from "../components/Styles";
import { Ionicons } from '@expo/vector-icons';
import AutoShrinkText from '../components/AutoShrinkText';
import PropertyRow from '../components/PropertyRow';
import { getCardSize } from '../utils/cardLayout';
import {
  listTemplates, createTemplate, getTemplateFields, updateTemplateName,
  upsertTemplateFields, archiveFields, deleteTemplate as deleteTemplateApi
} from '../services/templatesApi';
import { useDatabase } from "../contexts/DatabaseContext";

const KIND = 'asset';

export default function AssetTemplatesScreen() {
  const { width } = useWindowDimensions();
  const { activeDatabaseId, openCreateModal, canDelete } = useDatabase();

  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const [properties, setProperties] = useState([{
    id: 1, name: '', property_type: 'text', default_value: '',
  }]);

  const [templates, setTemplates] = useState([]);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [detailName, setDetailName] = useState('');
  const [detailProps, setDetailProps] = useState([]);

  const normalizedNewName = templateName.trim().toLowerCase();
  const isDuplicateName = !!normalizedNewName &&
    templates.some(t => (t.name || '').toLowerCase() === normalizedNewName);
  const canSaveNew = !!templateName.trim() && !isDuplicateName && !isLoading;

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
  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const cardSize = getCardSize(width);

  const numColumns = useMemo(() => Math.max(1, Math.floor(width / (cardSize + 16))), [width, cardSize]);
  const listKey = useMemo(() => `asset-templates-cols-${numColumns}`, [numColumns]);

  const nextIdRef = useRef(2);
  const addProperty = () => {
    setProperties(prev => [
      ...prev,
      { id: nextIdRef.current++, name: '', property_type: 'text', default_value: '' }
    ]);
  };
  const removeProperty = (id) => {
    if (properties.length > 1) {
      setProperties(prev => prev.filter(p => p.id !== id));
    }
  };
  const updateProperty = (id, field, value) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const filteredTemplates = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(t => (t.name || '').toLowerCase().includes(q));
  }, [templates, searchQuery]);

  const handleAddTemplate = async () => {
    if (!activeDatabaseId) {
      openCreateModal();
      return;
    }
    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }
    setIsLoading(true);
    try {
      await createTemplate(KIND, {
        databaseId: activeDatabaseId,
        name: templateName.trim(),
        properties: properties.filter(p => p.name.trim()),
      });
      Alert.alert('Success', 'Template created successfully');
      setTemplateName('');
      setProperties([{ id: 1, name: '', property_type: 'text', default_value: '' }]);
      setIsModalVisible(false);
      loadTemplates();
    } catch (e) {
      Alert.alert('Error', 'Failed to create template');
      console.error('Error creating template:', e);
    }
    setIsLoading(false);
  };

  const openDetails = async (tpl) => {
    setSelectedTemplate(tpl);
    setDetailName(tpl.name);
    try {
      const fields = await getTemplateFields(KIND, tpl.id);
      const normalized = fields.map(r => ({
        id: r.id, name: r.name, property_type: r.property_type, default_value: r.default_value,
      }));
      setDetailProps(normalized.length ? normalized : [{
        id: `new-${Date.now()}`, name: '', property_type: 'text', default_value: ''
      }]);
    } catch (e) {
      console.error('fetch props error:', e);
      setDetailProps([]);
    }
    setDetailsVisible(true);
  };

  const updateDetailProperty = (id, field, value) => {
    setDetailProps(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };
  const addDetailProperty = () => {
    setDetailProps(prev => ([...prev, {
      id: `new-${Date.now()}`, name: '', property_type: 'text', default_value: ''
    }]));
  };
  const removeDetailProperty = (id) => {
    setDetailProps(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev);
  };

  const saveTemplateEdits = async () => {
    if (!selectedTemplate) return;
    if (!activeDatabaseId) {
      openCreateModal();
      return;
    }

    const cleanName = detailName.trim();
    if (!cleanName) {
      Alert.alert('Validation', 'Template name cannot be empty.');
      return;
    }

    try {
      await updateTemplateName(KIND, selectedTemplate.id, cleanName, activeDatabaseId);

      const existing = await getTemplateFields(KIND, selectedTemplate.id);
      const existingIds = new Set(existing.map(r => String(r.id)));

      const normalized = detailProps.map((p, idx) => ({
        rawId: String(p.id),
        template_id: selectedTemplate.id,
        property_name: (p.name || '').trim(),
        property_type: p.property_type || 'text',
        default_value: p.default_value ?? null,
        display_order: idx,
      })).filter(r => r.property_name);

      const updates = normalized.filter(r => !r.rawId.startsWith('new-'));
      const inserts = normalized.filter(r => r.rawId.startsWith('new-'));

      await upsertTemplateFields(KIND, { templateId: selectedTemplate.id, updates, inserts });

      const keptDbIds = new Set(updates.map(u => u.rawId));
      const toArchive = [...existingIds].filter(id => !keptDbIds.has(id));
      if (toArchive.length) await archiveFields(KIND, toArchive);

      Alert.alert('Success', 'Template updated.');
      setDetailsVisible(false);
      setSelectedTemplate(null);
      await loadTemplates();
    } catch (e) {
      console.error('saveTemplateEdits error:', e);
      Alert.alert('Error', e.message || 'Failed to save template changes.');
    }
  };

  const deleteTemplate = async () => {
    if (!canDelete) {
      Alert.alert('Permission', 'Only admins can delete templates.');
      return;
    }
    if (!selectedTemplate) return;
    if (!activeDatabaseId) {
      openCreateModal();
      return;
    }
    try {
      await deleteTemplateApi(KIND, selectedTemplate.id, activeDatabaseId);
    } catch (e) {
      console.error('delete template error:', e);
      Alert.alert('Error', 'Failed to delete template.');
      return;
    }
    Alert.alert('Deleted', 'Template removed.');
    setDetailsVisible(false);
    setSelectedTemplate(null);
    await loadTemplates();
  };

  if (!activeDatabaseId) {
    return (
      <View style={commonStyles.contentContainer}>
        <Text style={commonStyles.textPrimary}>Asset Templates</Text>
        <Text style={{ color: "#9ca3af", marginTop: 12 }}>
          Select or create a database to manage asset templates.
        </Text>
        <Pressable style={{ marginTop: 16 }} onPress={openCreateModal}>
          <Text style={{ color: colors.brand, fontWeight: "600" }}>Create database</Text>
        </Pressable>
      </View>
    );
  }
  return (
    <View style={commonStyles.contentContainer}>
      <Text style={commonStyles.textPrimary}>Asset Templates</Text>

      <View style={styles.searchBar}>
        <Ionicons name="search" size={16} color={"white"} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor={"white"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <FlatList
        key={listKey}
        data={[{ _key: "__add" }, ...filteredTemplates]}
        keyExtractor={(item) => item._key || item.id}
        numColumns={numColumns}
        columnWrapperStyle={numColumns > 1 ? styles.rowWrap : null}
        contentContainerStyle={numColumns === 1 ? styles.rowWrap : undefined}
        renderItem={({ item }) =>
          item._key === "__add" ? (
            <Pressable
              style={[styles.addCard, { width: cardSize, height: cardSize }]}
              onPress={() => {
                setTemplateName("");
                setProperties([{ id: 1, name: "", property_type: "text", default_value: "" }]);
                setIsModalVisible(true);
              }}
            >
              <Ionicons name="add" size={cardSize * 0.35} color={colors.brand} />
            </Pressable>
          ) : (
            <Pressable
              style={[styles.displayCard, { width: cardSize, height: cardSize }]}
              onPress={() => openDetails(item)}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardMeta}>{item.assetCount ?? 0} </Text>
              </View>
              <AutoShrinkText
                style={styles.cardTitle}
                initialSize={cardSize * 0.14}
                maxLines={3}
              >
                {item.name}
              </AutoShrinkText>
            </Pressable>
          )
        }
      />

      <Modal visible={isModalVisible} transparent animationType="fade" onRequestClose={() => setIsModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create Template</Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.brand} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Template Name</Text>
              <TextInput
                style={styles.input}
                value={templateName}
                onBlur={() => setNameTouched(true)}
                onChangeText={setTemplateName}
                placeholder="Template name"
                autoCapitalize="words"
                placeholderTextColor={'#999'}
              />
              {nameTouched && !templateName.trim() && (
                <Text style={styles.errorText}>Template name is required.</Text>
              )}
              {isDuplicateName && (
                <Text style={styles.errorText}>Template name already exists.</Text>
              )}

              <Text style={[styles.label, { marginTop: 20 }]}>Properties</Text>
              {properties.map((prop) => (
                <PropertyRow
                  key={prop.id}
                  property={prop}
                  onChange={(field, value) => updateProperty(prop.id, field, value)}
                  onRemove={() => removeProperty(prop.id)}
                  canRemove={properties.length > 1}
                  showDefaultValue={false}
                />
              ))}

              <Pressable style={styles.addRowButton} onPress={addProperty}>
                <Ionicons name="add-circle-outline" size={18} color={colors.brand} />
                <Text style={styles.addRowText}>Add property</Text>
              </Pressable>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Pressable style={styles.cancelButton} onPress={() => setIsModalVisible(false)}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.primaryButton, !canSaveNew && { opacity: 0.6 }]}
                disabled={!canSaveNew}
                onPress={handleAddTemplate}
              >
                <Text style={styles.primaryButtonText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={detailsVisible} transparent animationType="fade" onRequestClose={() => setDetailsVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Template</Text>
              <Pressable onPress={() => setDetailsVisible(false)}>
                <Ionicons name="close" size={24} color={colors.brand} />
              </Pressable>
            </View>

            <ScrollView
              style={styles.modalScrollView}
              contentContainerStyle={styles.modalContent}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.label}>Template Name</Text>
              <TextInput
                style={styles.input}
                value={detailName}
                onChangeText={setDetailName}
                placeholder="Template name"
                autoCapitalize="words"
              />

              <Text style={[styles.label, { marginTop: 20 }]}>Properties</Text>
              {detailProps.map((prop) => (
                <PropertyRow
                  key={prop.id}
                  property={prop}
                  onChange={(field, value) => updateDetailProperty(prop.id, field, value)}
                  onRemove={() => removeDetailProperty(prop.id)}
                  canRemove={detailProps.length > 1}
                />
              ))}

              <Pressable style={styles.addRowButton} onPress={addDetailProperty}>
                <Ionicons name="add-circle-outline" size={18} color={colors.brand} />
                <Text style={styles.addRowText}>Add property</Text>
              </Pressable>
            </ScrollView>

            <View style={styles.modalFooter}>
              {canDelete ? (
                <Pressable style={styles.dangerButton} onPress={deleteTemplate}>
                  <Text style={styles.dangerButtonText}>Delete</Text>
                </Pressable>
              ) : null}
              <Pressable style={styles.primaryButton} onPress={saveTemplateEdits}>
                <Text style={styles.primaryButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    padding: 16,
    borderColor: "white",
    borderBottomWidth: 3,
    height: 55,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  searchInput: { color: "white", marginLeft: 16, flex: 1 },

  rowWrap: {
    gap: 16,
    paddingVertical: 12,
    justifyContent: "center",
  },

  addCard: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: colors.secondary,
    padding: 12,
    borderRadius: 13,
    margin: 8,
  },
  displayCard: {
    backgroundColor: "white",
    borderRadius: 13,
    padding: 12,
    justifyContent: "space-between",
    margin: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  cardMeta: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "600",
  },
  cardTitle: {
    color: colors.primary,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.8)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modal: {
    width: 540,
    maxWidth: "100%",
    maxHeight: "90%",
    borderRadius: 24,
    backgroundColor: "#111827",
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },
  modalTitle: {
    color: "white",
    fontSize: 20,
    fontWeight: "700",
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    gap: 20,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  label: {
    color: "#d1d5db",
    fontWeight: "600",
    marginBottom: 8,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: "white",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  errorText: { color: "#f87171", marginTop: 6 },

  addRowButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  addRowText: {
    color: colors.brand,
    fontWeight: "600",
  },
  primaryButton: {
    backgroundColor: colors.brand,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  primaryButtonText: { color: "white", fontWeight: "700" },
  cancelButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  cancelButtonText: {
    color: "#d1d5db",
    fontWeight: "600",
  },
  dangerButton: {
    backgroundColor: "#dc2626",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
  },
  dangerButtonText: { color: "white", fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    width: "90%",
    maxWidth: 520,
    backgroundColor: "white",
    borderRadius: 16,
    height: "80%",
    flexDirection: "column",
    overflow: "hidden",
  },
  modalHeader: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  modalScrollView: { flex: 1 },
  modalContent: {
    padding: 20,
    flexGrow: 1,
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    flexShrink: 0,
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
  primaryButtonText: {
    color: "white",
    fontWeight: "700",
  },

});
