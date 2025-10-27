import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  useWindowDimensions,
  Pressable,
  Alert,
} from "react-native";
import { colors, commonStyles } from "../components/Styles";
import { Ionicons } from "@expo/vector-icons";
import AutoShrinkText from "../components/AutoShrinkText";
import NewTemplateModal from "./AssetTemplatesScreen/NewTemplateModal";
import ViewTemplateModal from "./AssetTemplatesScreen/ViewTemplateModal";
import ModalSmall from "../components/ModalSmall";
import SearchBar from "../components/SearchBar";
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
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(false);
  const modalStyles = ModalSmall.styles;

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

  const requestDeleteTemplate = () => {
    if (!canDelete) {
      Alert.alert('Permission', 'Only admins can delete templates.');
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
      Alert.alert('Permission', 'Only admins can delete templates.');
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
      Alert.alert('Deleted', 'Template removed.');
      setDetailsVisible(false);
      setSelectedTemplate(null);
      setDeleteModalVisible(false);
      await loadTemplates();
    } catch (e) {
      console.error('delete template error:', e);
      Alert.alert('Error', 'Failed to delete template.');
    } finally {
      setDeletingTemplate(false);
    }
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

      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        iconColor="white"
        placeholder="Search..."
      />

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

      <NewTemplateModal
        visible={isModalVisible}
        templateName={templateName}
        onChangeTemplateName={setTemplateName}
        onBlurTemplateName={() => setNameTouched(true)}
        nameTouched={nameTouched}
        isDuplicateName={isDuplicateName}
        properties={properties}
        onAddProperty={addProperty}
        onRemoveProperty={removeProperty}
        onUpdateProperty={updateProperty}
        canSave={canSaveNew}
        onSubmit={handleAddTemplate}
        onClose={() => setIsModalVisible(false)}
      />

      <ViewTemplateModal
        visible={detailsVisible}
        detailName={detailName}
        onChangeDetailName={setDetailName}
        detailProps={detailProps}
        onAddDetailProperty={addDetailProperty}
        onRemoveDetailProperty={removeDetailProperty}
        onUpdateDetailProperty={updateDetailProperty}
        canDelete={canDelete}
        onDelete={requestDeleteTemplate}
        deleteDisabled={deletingTemplate}
        onSave={saveTemplateEdits}
        onClose={() => setDetailsVisible(false)}
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

const styles = StyleSheet.create({
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
});
