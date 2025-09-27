import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  useWindowDimensions,
  TextInput,
  Pressable,
  Modal,
  Platform,
  Alert,
} from "react-native";
import { colors, commonStyles } from "../components/Styles";
import { Ionicons } from "@expo/vector-icons";
import { supabase } from "../lib/supabase";
import { Picker } from "@react-native-picker/picker";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Linking } from "react-native";
import { decode } from "base64-arraybuffer"; // npm i base64-arraybuffer
import { useRef } from "react";

export default function AssetsScreen() {
  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState("");

  // Add Asset modal state
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [assetTemplates, setAssetTemplates] = useState([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [propInputs, setPropInputs] = useState([]); // [{property_id, name, type, value}]
  const [isSaving, setIsSaving] = useState(false);
  const [assets, setAssets] = useState([]);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [detailAssetId, setDetailAssetId] = useState(null);
  const [detailTemplateId, setDetailTemplateId] = useState(null);
  const [detailTemplateName, setDetailTemplateName] = useState('');
  const [detailProps, setDetailProps] = useState([]); // [{property_id, name, type, value, display_order}]
  const [isSavingDetails, setIsSavingDetails] = useState(false);

  // Documents tab state
  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // web file input (hidden)
  const webFileInputRef = useRef(null);

  // Tabs
  const TABS = { INFO: 'Info', LOGS: 'Logs', DOCS: 'Documents', COMPS: 'Components' };
  const [detailTab, setDetailTab] = useState(TABS.INFO);

  //Tab state
  const [logTemplates, setLogTemplates] = useState([]);
  const [loadingLogTemplates, setLoadingLogTemplates] = useState(false);

  const [logs, setLogs] = useState([]);               // list of logs for this asset
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [logsPage, setLogsPage] = useState({ from: 0, size: 20, hasMore: true });

  // New Log composer
  const [showTemplateChooser, setShowTemplateChooser] = useState(false);
  const [selectedLogTemplate, setSelectedLogTemplate] = useState(null); // {id, name}
  const [logFields, setLogFields] = useState([]);      // [{id,name,property_type,default_value,display_order, value}]
  const [savingLog, setSavingLog] = useState(false);

  const [selectedLog, setSelectedLog] = useState(null);

  const [logModalVisible, setLogModalVisible] = useState(false);
  const [logForModal, setLogForModal] = useState(null);
  const [editingLogId, setEditingLogId] = useState(null);

  const [logEditing, setLogEditing] = useState(false);
  const [logEditFields, setLogEditFields] = useState([]);

  // Load templates (for the picker)
  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from("asset_templates")
      .select("id, name")
      .order("name", { ascending: true });

    if (error) {
      console.error("loadTemplates error:", error);
      Alert.alert("Error", "Failed to load templates.");
      return;
    }
    setAssetTemplates(data || []);
  };

  // Open modal and preload templates
  const openAddModal = async () => {
    await loadTemplates();
    // reset form
    setSelectedTemplateId(null);
    setPropInputs([]);
    setIsModalVisible(true);
  };

  // When template changes, fetch its properties
  const onTemplateChange = async (templateId) => {
    setSelectedTemplateId(templateId);
    setPropInputs([]);

    if (!templateId) return;

    const { data, error } = await supabase
      .from("template_properties")
      .select(
        "id, property_name, property_type, default_value, display_order"
      )
      .eq("template_id", templateId)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (error) {
      console.error("fetch template props error:", error);
      Alert.alert("Error", "Failed to load template properties.");
      return;
    }

    const inputs = (data || []).map((p) => ({
      property_id: p.id,
      name: p.property_name,
      type: p.property_type || "text",
      value: p.default_value ?? "",
    }));

    setPropInputs(inputs);
  };

  const updatePropInput = (property_id, value) => {
    setPropInputs((prev) =>
      prev.map((p) => (p.property_id === property_id ? { ...p, value } : p))
    );
  };

  // Derive asset name from property values (fallback: template name)
  const deriveAssetName = (tplId, props) => {
    const tpl = assetTemplates.find((t) => t.id === tplId);
    const tplName = tpl?.name || "Asset";
    const values = props
      .map((p) => String(p.value ?? "").trim())
      .filter(Boolean);

    const joined = values.slice(0, 3).join(" • "); // keep it short-ish
    const base = joined.length ? joined : tplName;
    return base.length > 80 ? base.slice(0, 80) : base;
  };

  const getCardSize = () => {
    const availableWidth = width;
    let cardsPerRow = 1;
    if (availableWidth >= 100) cardsPerRow = 2;
    if (availableWidth >= 200) cardsPerRow = 3;
    if (availableWidth >= 600) cardsPerRow = 4;
    if (availableWidth >= 800) cardsPerRow = 5;
    if (availableWidth >= 1000) cardsPerRow = 8;
    const cardSize = width / cardsPerRow + 16;
    return Math.max(cardSize, 60);
  };

  const cardSize = getCardSize();
  const addIconSize = 0.5 * cardSize;

  const filteredAssets = assets.filter(a => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    return (
      (a.templateName || '').toLowerCase().includes(q) ||
      (a.displayName || '').toLowerCase().includes(q)
    );
  });


  const canSave = !!selectedTemplateId && !isSaving;

  const handleSaveAsset = async () => {
    if (!selectedTemplateId) {
      Alert.alert('Validation', 'Please select a template.');
      return;
    }

    setIsSaving(true);

    try {
      // 1) Create the asset with ONLY template_id
      const { data: insertedRows, error: insErr } = await supabase
        .from('assets')
        .insert([{ template_id: selectedTemplateId }])
        .select('id'); // simple shape

      if (insErr) {
        console.error('insert asset error:', JSON.stringify(insErr, null, 2));
        throw new Error(insErr.message || 'Failed to create asset.');
      }

      const assetId = insertedRows?.[0]?.id;
      if (!assetId) throw new Error('No asset id returned from insert.');

      // 2) Save property values (if any)
      if (propInputs.length) {
        const rows = propInputs.map(p => ({
          asset_id: assetId,
          property_id: p.property_id,
          value: (p.value === '' ? null : p.value),
        }));

        const { error: pvErr } = await supabase
          .from('asset_property_values')
          .insert(rows);

        if (pvErr) {
          console.warn('insert property values warning:', JSON.stringify(pvErr, null, 2));
        }
      }

      Alert.alert('Success', 'Asset created.');
      setIsModalVisible(false);
      setSelectedTemplateId(null);
      setPropInputs([]);
      await loadAssets();
    } catch (e) {
      console.error('handleSaveAsset failed:', JSON.stringify(e, null, 2));
      Alert.alert('Error', e.message || 'Could not create asset.');
    } finally {
      setIsSaving(false);
    }
  };



  const renderPropField = (p) => {
    if (p.type === "date") {
      if (Platform.OS === "web") {
        return (
          <input
            type="date"
            value={p.value || ""}
            onChange={(e) => updatePropInput(p.property_id, e.target.value)}
            style={{
              width: "100%",
              height: 40,
              borderWidth: 1,
              borderColor: "#ddd",
              borderRadius: 8,
              padding: 10,
              background: "#f9f9f9",
            }}
          />
        );
      }
      return (
        <TextInput
          style={styles.input}
          value={p.value}
          onChangeText={(v) => updatePropInput(p.property_id, v)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
        />
      );
    }

    return (
      <TextInput
        style={styles.input}
        value={p.value}
        onChangeText={(v) => updatePropInput(p.property_id, v)}
        placeholder={p.type === "number" ? "Enter number" : "Enter value"}
        placeholderTextColor="#999"
        keyboardType={p.type === "number" ? "numeric" : "default"}
      />
    );
  };

  const loadAssets = async () => {
    setLoadingAssets(true);

    const { data: a, error } = await supabase
      .from('assets')
      .select('id, template_id, created_at, asset_templates(name)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('loadAssets error:', error);
      setAssets([]);
      setLoadingAssets(false);
      return;
    }

    const ids = (a || []).map(x => x.id);
    const firstValByAsset = {};

    if (ids.length) {
      const { data: vals, error: vErr } = await supabase
        .from('asset_property_values')
        .select('asset_id, value, template_properties:property_id(display_order, is_active)')
        .in('asset_id', ids);

      if (!vErr && vals) {
        for (const row of vals) {
          if (row.template_properties?.is_active === false) continue;
          const order = row.template_properties?.display_order ?? 999999;
          const val = (row.value ?? '').toString().trim();
          const cur = firstValByAsset[row.asset_id];
          if (!cur || order < cur.order || (!cur.value && val)) {
            firstValByAsset[row.asset_id] = { order, value: val };
          }
        }
      }
    }

    const cards = (a || []).map(row => ({
      id: row.id,
      templateId: row.template_id,                        // <— keep this
      templateName: row.asset_templates?.name || '—',
      firstProp: firstValByAsset[row.id]?.value || '—',
      displayName: firstValByAsset[row.id]?.value || '—',
    }));

    setAssets(cards);
    setLoadingAssets(false);
  };





  useEffect(() => {
    loadAssets();
  }, []);

  const openAssetDetails = async (card) => {
    try {
      setDetailAssetId(card.id);
      setDetailTemplateId(card.templateId);
      setDetailTemplateName(card.templateName);
      setDetailProps([]);

      // a) property definitions for the template
      const { data: defs, error: dErr } = await supabase
        .from('template_properties')
        .select('id, property_name, property_type, display_order')
        .eq('template_id', card.templateId)
        .eq('is_active', true)
        .order('display_order', { ascending: true });

      if (dErr) throw dErr;

      // b) current values for this asset (may be empty)
      const { data: vals, error: vErr } = await supabase
        .from('asset_property_values')
        .select('property_id, value')
        .eq('asset_id', card.id);

      if (vErr) throw vErr;

      const valueMap = Object.fromEntries((vals || []).map(v => [v.property_id, v.value]));

      const merged = (defs || []).map(d => ({
        property_id: d.id,
        name: d.property_name || '',
        type: d.property_type || 'text',
        display_order: d.display_order ?? 0,
        value: valueMap[d.id] ?? '',   // empty string shows nicely in TextInput
      }));

      setDetailProps(merged);
      setDetailsVisible(true);
    } catch (e) {
      console.error('openAssetDetails error:', e);
      Alert.alert('Error', 'Failed to load asset details.');
    }
  };

  const updateDetailProp = (property_id, value) => {
    setDetailProps(prev => prev.map(p => p.property_id === property_id ? { ...p, value } : p));
  };

  const renderDetailField = (p) => {
    if (p.type === 'date') {
      if (Platform.OS === 'web') {
        return (
          <input
            type="date"
            value={p.value || ''}
            onChange={(e) => updateDetailProp(p.property_id, e.target.value)}
            style={{ width: '100%', height: 40, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, background: '#f9f9f9' }}
          />
        );
      }
      return (
        <TextInput
          style={styles.input}
          value={p.value}
          onChangeText={(v) => updateDetailProp(p.property_id, v)}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#999"
        />
      );
    }
    return (
      <TextInput
        style={styles.input}
        value={p.value}
        onChangeText={(v) => updateDetailProp(p.property_id, v)}
        placeholder={p.type === 'number' ? 'Enter number' : 'Enter value'}
        placeholderTextColor="#999"
        keyboardType={p.type === 'number' ? 'numeric' : 'default'}
      />
    );
  };

  const saveAssetEdits = async () => {
    if (!detailAssetId) return;
    setIsSavingDetails(true);
    try {
      const rows = detailProps.map(p => ({
        asset_id: detailAssetId,
        property_id: p.property_id,
        value: (p.value === '' ? null : p.value),
      }));

      // upsert on composite PK (asset_id, property_id)
      const { error: upErr } = await supabase
        .from('asset_property_values')
        .upsert(rows, { onConflict: 'asset_id,property_id' });

      if (upErr) throw upErr;

      Alert.alert('Saved', 'Asset properties updated.');
      closeDetailsModal();
      await loadAssets();
    } catch (e) {
      console.error('saveAssetEdits error:', e);
      Alert.alert('Error', 'Failed to save changes.');
    } finally {
      setIsSavingDetails(false);
    }
  };

  const deleteAsset = async () => {
    if (!detailAssetId) return;

    const runDelete = async () => {
      try {
        const { error } = await supabase
          .from('assets')
          .delete()
          .eq('id', detailAssetId);

        if (error) throw error;

        closeDetailsModal();
        await loadAssets();
        Alert.alert('Deleted', 'Asset removed.');
      } catch (e) {
        console.error('deleteAsset error:', e);
        Alert.alert('Error', e.message || 'Failed to delete asset.');
      }
    };

    if (Platform.OS === 'web') {
      // RN Web: use blocking confirm
      const ok = window.confirm('This will remove the asset and its values. Continue?');
      if (ok) await runDelete();
    } else {
      // iOS/Android: normal Alert with buttons
      Alert.alert('Delete Asset', 'This will remove the asset and its values. Continue?', [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: runDelete },
      ]);
    }
  };

  const loadLogTemplates = async () => {
    setLoadingLogTemplates(true);
    const { data, error } = await supabase
      .from('log_templates')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('loadLogTemplates error:', error);
      setLogTemplates([]);
    } else {
      setLogTemplates(data || []);
    }
    setLoadingLogTemplates(false);
  };

  const loadAssetLogs = async (assetId, from = 0, size = 20) => {
    if (!assetId) return;
    setLoadingLogs(true);

    const { data, error } = await supabase
      .from('log_entries')
      .select('id,template_id, value_map,fields_snapshot, created_at, log_templates(name)')
      .eq('asset_id', assetId)
      .order('created_at', { ascending: false })
      .range(from, from + size - 1);

    if (error) {
      console.error('loadAssetLogs error:', error);
      if (from === 0) setLogs([]);
      setLogsPage(prev => ({ ...prev, hasMore: false }));
    } else {
      const rows = (data || []).map(r => ({
        id: r.id,
        template_id: r.template_id,
        typeName: r.log_templates?.name || 'Log',
        data: r.value_map || {},
        fields_snapshot: r.fields_snapshot || [],
        created_at: r.created_at,
      }));
      if (from === 0) setLogs(rows);
      else setLogs(prev => [...prev, ...rows]);
      setLogsPage({ from, size, hasMore: (data || []).length === size });
    }

    setLoadingLogs(false);
  };


  // ADD — When opening details, also prepare Logs tab
  useEffect(() => {
    if (detailsVisible && detailAssetId) {

      loadLogTemplates();
      loadAssetLogs(detailAssetId, 0, 20);
      loadDocuments(detailAssetId);
    }
  }, [detailsVisible, detailAssetId]);

  const startNewLog = async () => {
    if (!logTemplates.length) await loadLogTemplates(); // ensure we have something to render
    setSelectedLogTemplate(null);
    setLogFields([]);
    setEditingLogId(null);
    setLogEditing(false);
    setLogEditFields([]);
    setLogForModal(null);        // new log
    setShowTemplateChooser(true);
    setLogModalVisible(true);    // open modal
  };

  const chooseLogTemplate = async (tpl) => {
    setSelectedLogTemplate(tpl);
    setShowTemplateChooser(false);

    const { data, error } = await supabase
      .from('log_template_fields')
      .select('id, property_name, property_type, default_value, display_order')
      .eq('template_id', tpl.id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('load template fields error:', error);
      setLogFields([]);
      return;
    }
    const fields = (data || []).map(f => ({
      id: f.id,
      name: f.property_name || '',
      property_type: f.property_type || 'text',
      default_value: f.default_value ?? '',
      display_order: f.display_order ?? 0,
      value: f.default_value ?? '',
    }));
    setLogFields(fields);
  };

  const saveNewLog = async () => {
    if (!detailAssetId || !selectedLogTemplate) {
      Alert.alert('Validation', 'Pick a log template first.');
      return;
    }

    setSavingLog(true);
    try {
      // Build value map from the composer fields
      const value_map = {};
      for (const f of logFields) {
        const key = (f.name || '').trim();
        if (key) value_map[key] = f.value ?? null;
      }

      // Snapshot of field meta (optional but handy)
      const fields_snapshot = logFields.map(
        ({ id, name, property_type, default_value, display_order }) => ({
          id, name, property_type, default_value, display_order,
        })
      );

      if (editingLogId) {
        // UPDATE existing log
        const { data, error } = await supabase
          .from('log_entries')
          .update({
            value_map,
            extras: {},
            fields_snapshot,

          })
          .eq('id', editingLogId)
          .select('id, template_id, value_map,fields_snapshot, created_at, log_templates(name)')
          .single();

        if (error) throw error;

        // Update it in local state
        setLogs(prev =>
          prev.map(l =>
            l.id === data.id
              ? {
                id: data.id,
                template_id: data.template_id,
                typeName: data.log_templates?.name || selectedLogTemplate.name,
                data: data.value_map || {},
                fields_snapshot: data.fields_snapshot || [],
                created_at: data.created_at,
              }
              : l
          )
        );

        Alert.alert('Success', 'Log updated.');
      } else {
        // INSERT new log
        const { data, error } = await supabase
          .from('log_entries')
          .insert([
            {
              asset_id: detailAssetId,
              template_id: selectedLogTemplate.id,
              value_map,
              extras: {},
              fields_snapshot,
            },
          ])
          .select('id, template_id, value_map,fields_snapshot, created_at, log_templates(name)')
          .single();

        if (error) throw error;

        // Prepend to list
        setLogs(prev => [
          {
            id: data.id,
            template_id: data.template_id,
            typeName: data.log_templates?.name || selectedLogTemplate.name,
            data: data.value_map || {},
            fields_snapshot: data.fields_snapshot || fields_snapshot || [],
            created_at: data.created_at,
          },
          ...prev,
        ]);
        setLogModalVisible(false);     // close the modal
        setShowTemplateChooser(false); // reset chooser state
        setSelectedLogTemplate(null);
        setLogFields([]);
        setEditingLogId(null);
        setSelectedLog(null);
        Alert.alert('Success', 'Log saved.');
      }

      // Reset composer / editing state
      setSelectedLogTemplate(null);
      setLogFields([]);
      setEditingLogId(null);
      setSelectedLog(null);
    } catch (e) {
      console.error('saveNewLog error:', e);
      Alert.alert('Error', e.message || 'Failed to save log.');
    } finally {
      setSavingLog(false);
    }
  };



  const closeDetailsModal = () => {
    setDetailsVisible(false);
    setSelectedLogTemplate(null);
    setShowTemplateChooser(false);
    setLogFields([]);
    setDetailTab(TABS.INFO);
  };

  const handleEditLog = (log) => {
    // Reuse composer: preload fields from log.data
    const fields = Object.entries(log.data || {}).map(([k, v], idx) => ({
      id: idx,
      name: k,
      property_type: typeof v === 'number' ? 'number' : 'text',
      value: v
    }));
    setSelectedLogTemplate({ id: log.template_id, name: log.typeName });
    setLogFields(fields);
    setSelectedLog(null);
  };

  const handleDeleteLog = async (logId) => {
    try {
      const { error } = await supabase
        .from('log_entries')
        .delete()
        .eq('id', logId);

      if (error) throw error;

      setLogs(prev => prev.filter(l => l.id !== logId));
      setSelectedLog(null);
      Alert.alert('Deleted', 'Log removed.');
    } catch (e) {
      console.error('delete log error:', e);
      Alert.alert('Error', e.message || 'Failed to delete log.');
    }
  };

  const openEditLog = (log) => {
    const fields = Object.entries(log.data || {}).map(([k, v], idx) => ({
      id: idx,
      name: k,
      property_type: typeof v === 'number' ? 'number' : 'text',
      value: v,
    }));
    setSelectedLogTemplate({ id: log.template_id, name: log.typeName });
    setLogFields(fields);
    setEditingLogId(log.id);
    setShowTemplateChooser(false);
    setSelectedLog(null);
  };

  const beginEditFromModal = () => {
    if (!logForModal) return;
    const fields = getOrderedFieldsForModal(logForModal);
    setLogEditFields(fields);
    setLogEditing(true);
  };

  const saveLogFromDetail = async () => {
    if (!logForModal?.id) return;

    setSavingLog(true);
    try {
      const value_map = {};
      for (const f of logEditFields) {
        const key = (f.name || '').trim();
        if (key) value_map[key] = f.value ?? null;
      }
      const fields_snapshot = logEditFields.map(
        ({ id, name, property_type, display_order }) => ({ id, name, property_type, display_order })
      );

      const { data, error } = await supabase
        .from('log_entries')
        .update({ value_map, fields_snapshot, extras: {} })
        .eq('id', logForModal.id)
        .select('id, template_id, value_map,fields_snapshot, created_at, log_templates(name)')
        .single();

      if (error) throw error;

      // update list
      setLogs(prev =>
        prev.map(l =>
          l.id === data.id
            ? {
              id: data.id,
              template_id: data.template_id,
              typeName: data.log_templates?.name || l.typeName,
              data: data.value_map || {},
              created_at: data.created_at,
            }
            : l
        )
      );

      // update modal content
      setLogForModal(prev =>
        prev ? { ...prev, data: data.value_map, fields_snapshot: data.fields_snapshot || prev.fields_snapshot || [], created_at: data.created_at, template_id: data.template_id } : prev
      );

      setLogEditing(false);
      Alert.alert('Success', 'Log updated.');
    } catch (e) {
      console.error('saveLogFromDetail error:', e);
      Alert.alert('Error', e.message || 'Failed to update log.');
    } finally {
      setSavingLog(false);
    }
  };

  const getOrderedFieldsForModal = (log) => {
    if (!log) return [];
    const snap = Array.isArray(log.fields_snapshot) ? log.fields_snapshot : [];
    if (snap.length) {
      return snap
        .slice()
        .sort((a, b) => (a.display_order ?? 0) - (b.display_order ?? 0))
        .map(f => ({
          id: f.id,
          name: f.name,
          property_type: f.property_type || 'text',
          display_order: f.display_order ?? 0,
          value: (log.value_map || log.data || {})[f.name] ?? '',
        }));
    }
    // Fallback for very old logs with no snapshot: fall back to unsorted entries
    return Object.entries(log.data || {}).map(([k, v], idx) => ({
      id: idx, name: k, property_type: typeof v === 'number' ? 'number' : 'text', display_order: idx, value: v
    }));
  };

  const orderedForView = getOrderedFieldsForModal(logForModal);



  const loadDocuments = async (assetId) => {
    if (!assetId) return;
    setLoadingDocs(true);
    const { data, error } = await supabase
      .from("asset_documents")
      .select("id, name, path, mime_type, size_bytes, created_at")
      .eq("asset_id", assetId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("loadDocuments error:", error);
      setDocs([]);
    } else {
      setDocs(data || []);
    }
    setLoadingDocs(false);
  };

  const openAddDocument = async () => {
    if (!detailAssetId) {
      Alert.alert("Open an asset", "Select an asset to attach the document to.");
      return;
    }
    if (Platform.OS === "web") {
      webFileInputRef.current?.click?.();
      return;
    }

    const res = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (res.canceled) return;
    const file = res.assets?.[0];
    if (!file) return;

    await uploadPickedFile(file);
  };

  const handleWebFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    // reset input so selecting the same file again works
    e.target.value = "";
    await uploadPickedFile({
      name: file.name,
      mimeType: file.type,
      size: file.size,
      uri: URL.createObjectURL(file), // temporary; we’ll fetch the blob next
      _webFile: file,                 // keep a ref to the original File
    });
  };

  const uploadPickedFile = async (file) => {
    try {
      setUploadingDoc(true);

      if (!detailAssetId) {
        Alert.alert("Error", "Open an asset first before adding documents.");
        return;
      }

      const ts = Date.now();
      const safeName = (file.name || "document").replace(/\s+/g, "_");
      const objectKey = `${detailAssetId}/${ts}-${safeName}`;

      // Build the body for upload
      let body;
      let contentType = file.mimeType || file.type || "application/octet-stream";

      if (Platform.OS === "web") {
        // Best: upload the File itself
        body = file._webFile; // native File
      } else {
        // RN/Expo: read as base64, decode -> Uint8Array
        const b64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        const ab = decode(b64);
        body = new Uint8Array(ab); // 👈 important
      }

      // 1) Storage upload
      const { data: upData, error: upErr } = await supabase.storage
        .from("asset-docs")
        .upload(objectKey, body, {
          contentType,
          upsert: false,
          cacheControl: "3600",
        });

      if (upErr) {
        console.error("storage.upload error:", upErr);
        Alert.alert("Upload failed", upErr.message || "Storage error");
        return;
      }

      // 2) DB insert
      const { data: insData, error: insErr } = await supabase
        .from("asset_documents")
        .insert([{
          asset_id: detailAssetId,
          name: file.name || safeName,
          path: objectKey,
          mime_type: contentType,
          size_bytes: file.size ?? null,
        }])
        .select("id")
        .single();

      if (insErr) {
        console.error("asset_documents insert error:", insErr);
        Alert.alert("Error", insErr.message || "DB insert failed");
        return;
      }

      await loadDocuments(detailAssetId);
      Alert.alert("Uploaded", "Document added.");
    } catch (e) {
      console.error("uploadPickedFile exception:", e);
      Alert.alert("Error", e.message || "Failed to upload document.");
    } finally {
      setUploadingDoc(false);
    }
  };


  const openDocument = async (doc) => {
    try {
      // Get a signed URL (safer than public)
      const { data, error } = await supabase.storage
        .from("asset-docs")
        .createSignedUrl(doc.path, 60 * 10); // 10 minutes

      if (error) throw error;

      const url = data?.signedUrl;
      if (url) Linking.openURL(url);
    } catch (e) {
      console.error("openDocument error:", e);
      Alert.alert("Error", "Could not open document.");
    }
  };

  const deleteDocument = async (doc) => {
    const doDelete = async () => {
      try {
        // 1) delete storage object
        const { error: delObjErr } = await supabase.storage
          .from("asset-docs")
          .remove([doc.path]);
        if (delObjErr) throw delObjErr;

        // 2) delete db row
        const { error: delRowErr } = await supabase
          .from("asset_documents")
          .delete()
          .eq("id", doc.id);
        if (delRowErr) throw delRowErr;

        setDocs(prev => prev.filter(d => d.id !== doc.id));
        Alert.alert("Deleted", "Document removed.");
      } catch (e) {
        console.error("deleteDocument error:", e);
        Alert.alert("Error", e.message || "Failed to delete document.");
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm(`Delete "${doc.name}"?`)) await doDelete();
    } else {
      Alert.alert("Delete Document", `Delete "${doc.name}"?`, [
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: doDelete },
      ]);
    }
  };




  return (
    <View style={commonStyles.contentContainer}>
      <Text style={commonStyles.textPrimary}>Assets</Text>

      <View style={[styles.searchBar]}>
        <Ionicons name="search" size={16} color={"white"} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search..."
          placeholderTextColor={"white"}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View className="displayCardContainer" style={styles.displayCardContainer}>
          <Pressable
            style={[styles.addCard, { width: cardSize, height: cardSize }]}
            onPress={openAddModal}
          >
            <Ionicons name="add" size={addIconSize} color={colors.brand} />
          </Pressable>
          {filteredAssets.map(item => (
            <Pressable
              key={item.id}
              style={[styles.displayCard, { width: cardSize, height: cardSize }]}
              onPress={() => openAssetDetails(item)}   // <-- enable details
            >
              <Text style={[styles.templateText, { fontSize: cardSize * 0.10 }]}>
                {item.templateName}
              </Text>
              <View style={styles.nameTextWrap}>
                <Text numberOfLines={2} style={[styles.nameText, { fontSize: cardSize * 0.15 }]} >
                  {item.firstProp}
                </Text>
              </View>
            </Pressable>
          ))}

          {!loadingAssets && filteredAssets.length === 0 && (
            <Text style={{ color: '#888', marginTop: 12 }}>
              No assets found.
            </Text>
          )}

        </View>
      </ScrollView>

      {/* Add Asset Modal */}
      <Modal
        visible={isModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modal}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>New Asset</Text>
              <Pressable onPress={() => setIsModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.brand} />
              </Pressable>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContent}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Template</Text>

                  {Platform.OS === "web" ? (
                    <View style={styles.pickerWrapper}>
                      <select
                        value={selectedTemplateId ?? ""}
                        onChange={(e) => onTemplateChange(e.target.value || null)}
                        style={{ width: "100%", height: 40, border: "none", background: "transparent" }}
                        aria-label="Template"
                      >
                        <option value="">Select a template</option>
                        {assetTemplates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                    </View>
                  ) : (
                    <View style={styles.pickerWrapper}>
                      <Picker
                        selectedValue={selectedTemplateId}
                        onValueChange={(v) => onTemplateChange(v)}
                        mode="dropdown"
                        style={styles.picker}
                      >
                        <Picker.Item label="Select a template" value={null} />
                        {assetTemplates.map((t) => (
                          <Picker.Item key={t.id} label={t.name} value={t.id} />
                        ))}
                      </Picker>
                    </View>
                  )}

                  {assetTemplates.length === 0 && (
                    <Text style={styles.helperText}>
                      No templates yet. Create a template first.
                    </Text>
                  )}
                </View>



                {/* Template property inputs */}
                {!!selectedTemplateId && propInputs.length > 0 && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Properties</Text>
                    {propInputs.map((p) => (
                      <View key={p.property_id} style={styles.propertyContainer}>
                        <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: "600" }}>
                          {p.name} {p.type === "number" ? "(Number)" : p.type === "date" ? "(Date)" : ""}
                        </Text>
                        {renderPropField(p)}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <View style={styles.buttonContainer}>
                <Pressable
                  style={styles.cancelButton}
                  onPress={() => setIsModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveButton, { opacity: canSave ? 1 : 0.6 }]}
                  onPress={handleSaveAsset}
                  disabled={!canSave}
                >
                  <Text style={styles.saveButtonText}>
                    {isSaving ? "Saving..." : "Save"}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Asset Details Modal */}
      <Modal
        visible={detailsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeDetailsModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { height: '80%' }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {detailTemplateName ? `${detailTemplateName}` : 'Asset Details'}
              </Text>
              <Pressable onPress={closeDetailsModal}>
                <Ionicons name="close" size={24} color={colors.brand} />
              </Pressable>
            </View>

            {/* Content */}
            {/* Tabs Bar */}
            <View style={styles.tabsBar}>
              {[TABS.INFO, TABS.LOGS, TABS.DOCS, TABS.COMPS].map(tab => (
                <Pressable
                  key={tab}
                  onPress={() => setDetailTab(tab)}
                  style={[styles.tabItem, detailTab === tab && styles.tabItemActive]}
                >
                  <Text style={[styles.tabText, detailTab === tab && styles.tabTextActive]}>
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </View>

            {/* Tab Content */}
            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContent}>

                {detailTab === TABS.INFO && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Properties</Text>
                    {detailProps.length === 0 && (
                      <Text style={{ color: '#888' }}>No properties available for this template.</Text>
                    )}
                    {detailProps.map((p) => (
                      <View key={p.property_id} style={styles.propertyContainer}>
                        <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: '600' }}>
                          {p.name} {p.type === 'number' ? '(Number)' : p.type === 'date' ? '(Date)' : ''}
                        </Text>
                        {renderDetailField(p)}
                      </View>
                    ))}
                  </View>
                )}

                {detailTab === TABS.LOGS && (
                  <View>
                    {/* Header row */}
                    <View style={styles.logsHeaderRow}>
                      <Text style={[styles.label, { marginBottom: 0 }]}>Logs</Text>
                      <Pressable style={styles.primaryChip} onPress={startNewLog}>
                        <Ionicons name="add" size={16} color="white" />
                        <Text style={styles.primaryChipText}>New Log</Text>
                      </Pressable>
                    </View>



                    {/* Logs list */}
                    <View style={{ marginTop: 12 }}>
                      {/* Logs list (compact) */}
                      <View style={{ marginTop: 12 }}>
                        {logs.map(item => {
                          const ordered = getOrderedFieldsForModal(item);
                          const entries = ordered.map(f => [f.name, f.value]);
                          const MAX_CHIPS = 999;
                          const visible = entries.slice(0, MAX_CHIPS);
                          const more = entries.length - visible.length;
                          return (
                            <Pressable
                              key={item.id}
                              style={styles.logRow}
                              onPress={() => {
                                setLogForModal(item);
                                setLogEditing(false);
                                setLogEditFields([]);
                                setLogModalVisible(true);
                              }}
                            >
                              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                                <Text style={styles.logRowTitle}>{item.typeName}</Text>
                                <Text style={styles.logRowTime}>{new Date(item.created_at).toLocaleString()}</Text>
                              </View>

                              <View style={styles.logValuePills}>
                                {visible.map(([k, v]) => (
                                  <View key={k} style={styles.valuePill}>
                                    <Text style={styles.valuePillText}>
                                      {k}: {String(v ?? '')}
                                    </Text>
                                  </View>
                                ))}

                                {more > 0 && (
                                  <View style={[styles.valuePill, { opacity: 0.7 }]}>
                                    <Text style={styles.valuePillText}>+{more} more</Text>
                                  </View>
                                )}
                              </View>
                            </Pressable>
                          );
                        })}

                        {loadingLogs && <Text style={{ color: '#666', marginTop: 8 }}>Loading…</Text>}
                        {!loadingLogs && logs.length === 0 && (
                          <Text style={{ color: '#888', marginTop: 8 }}>No logs yet.</Text>
                        )}
                        {logsPage.hasMore && !loadingLogs && (
                          <Pressable
                            style={[styles.cancelButton, { marginTop: 12 }]}
                            onPress={() => loadAssetLogs(detailAssetId, logsPage.from + logsPage.size, logsPage.size)}
                          >
                            <Text style={styles.cancelButtonText}>Load more</Text>
                          </Pressable>
                        )}
                      </View>

                    </View>


                  </View>
                )}

                {detailTab === TABS.DOCS && (
                  <View style={{ paddingTop: 4 }}>
                    {/* Hidden input for web */}
                    {Platform.OS === "web" && (
                      <input
                        ref={webFileInputRef}
                        type="file"
                        style={{ display: "none" }}
                        onChange={handleWebFileChange}
                      />
                    )}

                    <View style={styles.docsHeaderRow}>
                      <Text style={[styles.label, { marginBottom: 0 }]}>Documents</Text>
                      <Pressable
                        style={[styles.primaryChip, uploadingDoc && { opacity: 0.6 }]}
                        disabled={uploadingDoc}
                        onPress={openAddDocument}
                      >
                        <Ionicons name="add" size={16} color="white" />
                        <Text style={styles.primaryChipText}>
                          {uploadingDoc ? "Uploading…" : "Add Document"}
                        </Text>
                      </Pressable>
                    </View>

                    {loadingDocs ? (
                      <Text style={{ color: "#666", marginTop: 8 }}>Loading…</Text>
                    ) : docs.length === 0 ? (
                      <Text style={{ color: "#888", marginTop: 8 }}>No documents yet.</Text>
                    ) : (
                      <View style={{ marginTop: 12 }}>
                        {docs.map((d) => (
                          <View key={d.id} style={styles.docRow}>
                            <View style={{ flex: 1 }}>
                              <Text style={styles.docName} numberOfLines={1}>{d.name}</Text>
                              <Text style={styles.docMeta}>
                                {(d.mime_type || "file")} • {new Date(d.created_at).toLocaleString()}
                                {d.size_bytes ? ` • ${(Number(d.size_bytes) / 1024).toFixed(0)} KB` : ""}
                              </Text>
                            </View>

                            <View style={styles.docActions}>
                              <Pressable style={styles.docActionBtn} onPress={() => openDocument(d)}>
                                <Text style={styles.docActionText}>Open</Text>
                              </Pressable>
                              <Pressable style={[styles.docActionBtn, { borderColor: "#ff4444" }]} onPress={() => deleteDocument(d)}>
                                <Text style={[styles.docActionText, { color: "#ff4444" }]}>Delete</Text>
                              </Pressable>
                            </View>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                )}


                {detailTab === TABS.COMPS && (
                  <View style={{ paddingTop: 4 }}>
                    <Text style={{ color: '#888' }}>Components — coming soon.</Text>
                  </View>
                )}
              </View>
            </ScrollView>




            {/* Footer — only show on INFO tab */}
            {detailTab === TABS.INFO && (
              <View style={styles.modalFooter}>
                <View style={styles.buttonContainer}>
                  <Pressable
                    style={[styles.cancelButton, { borderColor: '#ff4444' }]}
                    onPress={deleteAsset}
                  >
                    <Text style={[styles.cancelButtonText, { color: '#ff4444' }]}>
                      Delete Asset
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.saveButton, { marginLeft: 8, opacity: isSavingDetails ? 0.6 : 1 }]}
                    disabled={isSavingDetails}
                    onPress={saveAssetEdits}
                  >
                    <Text style={styles.saveButtonText}>
                      {isSavingDetails ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </View>
        </View>
      </Modal>

      <Modal
        visible={logModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setLogModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { height: '60%' }]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {logForModal ? logForModal.typeName : "New Log"}
              </Text>
              <Pressable onPress={() => setLogModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.brand} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.modalContent}>
                {/* New Log Mode */}
                {!logForModal && (
                  <>
                    {/* Template chooser */}
                    {!selectedLogTemplate && showTemplateChooser && (
                      <View>
                        <Text style={[styles.label, { marginBottom: 8 }]}>Choose a template</Text>
                        {loadingLogTemplates ? (
                          <Text style={{ color: '#666' }}>Loading templates…</Text>
                        ) : (logTemplates.length ? (
                          logTemplates.map(tpl => (
                            <Pressable
                              key={tpl.id}
                              style={styles.templateCard}
                              onPress={() => chooseLogTemplate(tpl)}
                            >
                              <Text style={styles.templateCardTitle}>{tpl.name}</Text>
                            </Pressable>
                          ))
                        ) : (
                          <Text style={{ color: '#888' }}>No log templates yet.</Text>
                        ))}
                      </View>
                    )}

                    {/* Composer (after a template is chosen) */}
                    {!!selectedLogTemplate && (
                      <>
                        <Text style={[styles.label, { marginBottom: 8 }]}>
                          {selectedLogTemplate?.name}
                        </Text>
                        {logFields.map(f => (
                          <View key={f.id} style={styles.propertyContainer}>
                            <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: '600' }}>
                              {f.name}
                            </Text>
                            <TextInput
                              style={styles.input}
                              value={String(f.value ?? '')}
                              onChangeText={(v) =>
                                setLogFields(prev => prev.map(x => x.id === f.id ? { ...x, value: v } : x))
                              }
                              placeholder="Enter value"
                            />
                          </View>
                        ))}
                      </>
                    )}
                  </>
                )}


                {/* Existing Log Mode (your current read/edit UI) */}
                {logForModal && (
                  !logEditing ? (
                    orderedForView.map(f => (
                      <View key={f.name} style={styles.propertyContainer}>
                        <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: "600" }}>
                          {f.name}
                        </Text>
                        <TextInput
                          style={[styles.input, styles.readonlyInput]}
                          value={String(f.value ?? '')}
                          editable={false}
                        />
                      </View>
                    ))
                  ) : (
                    logEditFields.map(f => (
                      <View key={f.id} style={styles.propertyContainer}>
                        <Text style={{ marginBottom: 6, color: colors.primary, fontWeight: "600" }}>
                          {f.name}
                        </Text>
                        <TextInput
                          style={styles.input}
                          value={String(f.value ?? '')}
                          onChangeText={(v) =>
                            setLogEditFields(prev =>
                              prev.map(x => x.id === f.id ? { ...x, value: v } : x)
                            )
                          }
                        />
                      </View>
                    ))
                  )
                )}

              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <View style={styles.buttonContainer}>

                {/* Footer for New Log */}
                {!logForModal && (
                  <>
                    <Pressable
                      style={[styles.cancelButton, { marginRight: 8 }]}
                      onPress={() => setLogModalVisible(false)}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.saveButton, { opacity: savingLog ? 0.6 : 1 }]}
                      disabled={savingLog}
                      onPress={saveNewLog}
                    >
                      <Text style={styles.saveButtonText}>{savingLog ? "Saving…" : "Save Log"}</Text>
                    </Pressable>
                  </>
                )}

                {/* Footer for Existing Log (you already had this) */}
                {logForModal && !logEditing && (
                  <>
                    <Pressable
                      style={[styles.cancelButton, { borderColor: "#ff4444" }]}
                      onPress={() => { handleDeleteLog(logForModal.id); setLogModalVisible(false); }}
                    >
                      <Text style={[styles.cancelButtonText, { color: "#ff4444" }]}>Remove</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.cancelButton, { marginRight: 8 }]}
                      onPress={beginEditFromModal}
                    >
                      <Text style={styles.cancelButtonText}>Edit</Text>
                    </Pressable>
                  </>
                )}

                {logForModal && logEditing && (
                  <>
                    <Pressable
                      style={[styles.cancelButton, { marginRight: 8 }]}
                      onPress={() => { setLogEditing(false); setLogEditFields([]); }}
                    >
                      <Text style={styles.cancelButtonText}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      style={[styles.saveButton, { opacity: savingLog ? 0.6 : 1 }]}
                      disabled={savingLog}
                      onPress={saveLogFromDetail}
                    >
                      <Text style={styles.saveButtonText}>{savingLog ? "Saving…" : "Save"}</Text>
                    </Pressable>
                  </>
                )}

              </View>
            </View>
          </View>
        </View>
      </Modal>


    </View>
  );
}

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
  nameText: { fontWeight: "bold", textTransform: 'uppercase' },
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
  modalScrollView: { flex: 1, height: "80%", overflow: "visible" },
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

  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 6,
    backgroundColor: "#f9f9f9",
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
  previewName: {
    marginTop: -8,
    marginBottom: 12,
    color: "#666",
    fontStyle: "italic",
  },

  // ADD — Tabs
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    backgroundColor: '#fafafa',
  },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  tabItemActive: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  tabText: { color: '#666', fontWeight: '600' },
  tabTextActive: { color: colors.primary },

  // ADD — Logs UI
  logsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  primaryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  primaryChipText: { color: 'white', marginLeft: 6, fontWeight: '700' },

  chooserPanel: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: '#f8f9fa',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateCard: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginRight: 8,
    marginBottom: 8,
    minWidth: 120,
  },
  templateCardTitle: { fontWeight: '700', color: colors.primary },

  composerCard: {
    borderWidth: 1,
    borderColor: '#e9ecef',
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  composerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  composerTitle: { fontWeight: '800', color: colors.primary },

  composerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },

  logItem: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    padding: 12,
    marginBottom: 10,
  },
  logItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  typeBadge: {
    backgroundColor: '#eef3ff',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: { color: colors.primary, fontWeight: '700' },
  logMeta: { color: '#888' },
  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 6, gap: 6 },
  chip: {
    backgroundColor: '#f1f3f5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  chipText: { color: '#333' },

  logListRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 8,
    backgroundColor: 'white',
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logListTitle: { fontWeight: '700', color: colors.primary },
  logListTime: { color: '#888' },


  logRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 10,
    backgroundColor: 'white',
    marginBottom: 10,
  },
  logRowTitle: { fontWeight: '800', color: colors.primary, marginBottom: 6 },
  logRowTime: { color: '#888', marginLeft: 8 },

  logValuePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  valuePill: {
    backgroundColor: '#f1f3f5',
    borderWidth: 1,
    borderColor: '#e9ecef',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  valuePillText: { color: '#333', fontWeight: '600' },

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
  docActions: { flexDirection: "row", alignItems: "center", gap: 8 },
  docActionBtn: {
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  docActionText: { color: colors.normal, fontWeight: "700" },


});
