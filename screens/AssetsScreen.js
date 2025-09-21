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
            style={{ width:'100%', height:40, borderWidth:1, borderColor:'#ddd', borderRadius:8, padding:10, background:'#f9f9f9' }}
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
      setDetailsVisible(false);
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
  
        setDetailsVisible(false);
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
                <Text  numberOfLines={2} style={[styles.nameText, { fontSize: cardSize * 0.15 }]} >
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
        onRequestClose={() => setDetailsVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { height: '75%' }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {detailTemplateName ? `${detailTemplateName} • Asset` : 'Asset Details'}
              </Text>
              <Pressable onPress={() => setDetailsVisible(false)}>
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
              </View>
            </ScrollView>

            {/* Footer */}
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
});
