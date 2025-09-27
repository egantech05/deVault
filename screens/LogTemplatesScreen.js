import React, { useState, useEffect } from "react";
import { View, Text, StyleSheet, ScrollView, useWindowDimensions, TextInput, Pressable, Modal, Platform, Alert } from "react-native";
import { colors, commonStyles } from "../components/Styles";
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Picker } from '@react-native-picker/picker';

const createLogTemplate = async ({ name, properties }) => {
  const { data: tpl, error: tplError } = await supabase
    .from("log_templates")
    .insert([{ name }])
    .select("id")
    .single();

  if (tplError) return { error: tplError };

  const rows = (properties || []).map((p, idx) => ({
    template_id: tpl.id,
    property_name: p.name?.trim(),
    property_type: p.property_type || "text",
    default_value: p.default_value ?? null,
    display_order: idx,
  })).filter(r => r.property_name);

  if (rows.length) {
    const { error: propError } = await supabase
      .from("log_template_fields")
      .insert(rows);
    if (propError) return { error: propError };
  }

  return { data: { id: tpl.id } };
};



export default function LogTemplatesScreen() {


  const { width } = useWindowDimensions();
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [nameTouched, setNameTouched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState([{
    id: 1,
    name: '',
    property_type: 'text',
    default_value: '',
  }]);
  const [templates, setTemplates] = useState([]);
  const [detailsVisible, setDetailsVisible] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [detailName, setDetailName] = useState('');
  const [detailProps, setDetailProps] = useState([]);
  // === Duplicate name guards (Add Template modal) ===
  const normalizedNewName = templateName.trim().toLowerCase();
  const isDuplicateName = !!normalizedNewName &&
    templates.some(t => (t.name || '').toLowerCase() === normalizedNewName);

  const canSaveNew = !!templateName.trim() && !isDuplicateName && !isLoading;
  const loadTemplates = async () => {
    const { data, error } = await supabase
      .from('log_templates')
      // if FK exists: logs.template_id -> log_templates.id,
      // this nested aggregate works:
      .select('id, name, log_entries(count)')
      .order('name', { ascending: true });

    if (error) {
      console.error('loadTemplates error:', error);
      return;
    }

    const normalized = (data || []).map(t => ({
      id: t.id,
      name: t.name,
      logCount: t.log_entries?.[0]?.count ?? 0, // <- grab the count
    }));

    setTemplates(normalized);
  };



  // load on mount
  useEffect(() => {
    loadTemplates();
  }, []);


  const PROPERTY_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
  ];

  //calculate card size to make it responsive
  const getCardSize = () => {
    const containerPadding = 0;
    const availableWidth = width - containerPadding;
    const margin = 8;

    //calculate how many cards can fit
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

  //adding template
  const handleAddTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    setIsLoading(true);
    const templateData = {
      name: templateName.trim(),
      properties: properties.filter(p => p.name.trim())
    };

    const { error } = await createLogTemplate(templateData);

    if (error) {
      Alert.alert('Error', 'Failed to create template');
      console.error('Error creating template:', error);
    } else {
      Alert.alert('Success', 'Template created successfully');
      setTemplateName('');
      setProperties([{ id: 1, name: '', property_type: 'text', default_value: '' }]);
      setIsModalVisible(false);
      loadTemplates();
    }
    setIsLoading(false);
  };

  const addProperty = () => {
    const newId = Math.max(...properties.map(p => p.id)) + 1;
    setProperties([...properties, {
      id: newId,
      name: '',
      property_type: 'text',
      default_value: '',
    }]);
  };

  const removeProperty = (id) => {
    if (properties.length > 1) {
      setProperties(properties.filter(p => p.id !== id));
    }
  };

  const updateProperty = (id, field, value) => {
    setProperties(properties.map(p =>
      p.id === id ? { ...p, [field]: value } : p
    ));
  };

  const renderPropertyTypeInput = (property) => {
    if (property.property_type === 'date') {
      // Web gets a native date input; native stays a text field users can type.
      if (Platform.OS === 'web') {
        return (
          <input
            type="date"
            value={property.default_value || ''}
            onChange={(e) => updateProperty(property.id, 'default_value', e.target.value)}
            style={{ width: '100%', height: 40, borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, background: '#f9f9f9' }}
          />
        );
      }
      return (
        <TextInput
          style={styles.input}
          value={property.default_value}
          onChangeText={(v) => updateProperty(property.id, 'default_value', v)}
          placeholder="Default date (YYYY-MM-DD)"
          placeholderTextColor="#999"
        />
      );
    }



    // text / number
    return (
      <TextInput
        style={styles.input}
        value={property.default_value}
        onChangeText={(v) => updateProperty(property.id, 'default_value', v)}
        placeholder={`Default ${property.property_type} description`}
        placeholderTextColor="#999"
        keyboardType={property.property_type === 'number' ? 'numeric' : 'default'}
      />
    );
  };

  const filteredTemplates = templates.filter(t =>
    t.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Open details for a template card
  const openDetails = async (tpl) => {
    setSelectedTemplate(tpl);
    setDetailName(tpl.name);

    const { data, error } = await supabase
      .from('log_template_fields')
      .select('id, property_name, property_type, default_value, display_order')
      .eq('template_id', tpl.id)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('fetch props error:', error);
      setDetailProps([]);
    } else {
      const normalized = (data || []).map(r => ({
        id: r.id,                         // keep DB id for updates
        name: r.property_name || '',
        property_type: r.property_type || 'text',
        default_value: r.default_value ?? '',
      }));
      setDetailProps(normalized.length ? normalized : [{
        id: `new-${Date.now()}`, name: '', property_type: 'text', default_value: ''
      }]);
    }

    setDetailsVisible(true);
  };

  // Local editing helpers
  const updateDetailProperty = (id, field, value) => {
    setDetailProps(prev => prev.map(p => p.id === id ? { ...p, [field]: value } : p));
  };

  const addDetailProperty = () => {
    setDetailProps(prev => ([
      ...prev,
      { id: `new-${Date.now()}`, name: '', property_type: 'text', default_value: '' }
    ]));
  };

  const removeDetailProperty = (id) => {
    setDetailProps(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev);
  };


  const saveTemplateEdits = async () => {
    if (!selectedTemplate) return;

    const cleanName = detailName.trim();
    if (!cleanName) {
      Alert.alert('Validation', 'Template name cannot be empty.');
      return;
    }

    try {
      // 1) Update template name
      const { error: updTplErr } = await supabase
        .from('log_templates')
        .update({ name: cleanName })
        .eq('id', selectedTemplate.id);
      if (updTplErr) throw updTplErr;

      // 2) Load existing ids for this template
      const { data: existingRows, error: exErr } = await supabase
        .from('log_template_fields')
        .select('id')
        .eq('template_id', selectedTemplate.id);
      if (exErr) throw exErr;
      const existingIds = new Set((existingRows || []).map(r => String(r.id)));

      // 3) Normalize current editor state
      const normalized = detailProps.map((p, idx) => ({
        rawId: String(p.id), // keep as-is; could be "new-123" or a UUID
        template_id: selectedTemplate.id,
        property_name: (p.name || '').trim(),
        property_type: p.property_type || 'text',
        default_value: p.default_value ?? null,
        display_order: idx,
      })).filter(r => r.property_name); // drop empties

      const updates = normalized.filter(r => !r.rawId.startsWith('new-')); // real rows (UUIDs)
      const inserts = normalized.filter(r => r.rawId.startsWith('new-'));  // brand-new rows

      // 4) Apply updates
      if (updates.length) {
        await Promise.all(
          updates.map(u =>
            supabase
              .from('log_template_fields')
              .update({
                property_name: u.property_name,
                property_type: u.property_type,
                default_value: u.default_value,
                display_order: u.display_order,
              })
              .eq('id', u.rawId)
          )
        );
      }

      // 5) Apply inserts (no id provided; DB should generate it)
      if (inserts.length) {
        const insertRows = inserts.map(i => ({
          template_id: i.template_id,
          property_name: i.property_name,
          property_type: i.property_type,
          default_value: i.default_value,
          display_order: i.display_order,
        }));
        const { error: insErr } = await supabase
          .from('log_template_fields')
          .insert(insertRows);
        if (insErr) throw insErr;
      }

      // 6) Archive removed ones (optional, requires is_active boolean column)
      const keptDbIds = new Set(updates.map(u => u.rawId));
      const toArchive = [...existingIds].filter(id => !keptDbIds.has(id));
      if (toArchive.length) {
        const { error: archErr } = await supabase
          .from('log_template_fields')
          .update({ is_active: false })
          .in('id', toArchive);
        if (archErr) throw archErr;
      }

      Alert.alert('Success', 'Template updated.');
      setDetailsVisible(false);
      setSelectedTemplate(null);
      await loadTemplates();
    } catch (e) {
      console.error('saveTemplateEdits error:', e);
      Alert.alert('Error', e.message || 'Failed to save template changes.');
    }
  };



  // Delete template (cascades properties)
  const deleteTemplate = async () => {
    if (!selectedTemplate) return;

    const { error } = await supabase
      .from('log_templates')
      .delete()
      .eq('id', selectedTemplate.id);

    if (error) {
      console.error('delete template error:', error);
      Alert.alert('Error', 'Failed to delete template.');
      return;
    }

    Alert.alert('Deleted', 'Template removed.');
    setDetailsVisible(false);
    setSelectedTemplate(null);
    await loadTemplates();
  };

  function AutoShrinkText({
    children,
    style,
    maxLines = 2,
    initialSize = 18,
    minSize = 8,
  }) {
    const [fontSize, setFontSize] = React.useState(initialSize);
    const [didFit, setDidFit] = React.useState(false);

    // Reset when text or initial size changes
    React.useEffect(() => {
      setFontSize(initialSize);
      setDidFit(false);
    }, [children, initialSize]);

    const onTextLayout = (e) => {
      if (didFit) return;
      const lines = e?.nativeEvent?.lines?.length ?? 0;
      if (lines > maxLines && fontSize > minSize) {
        // shrink step; you can make it bigger/smaller (e.g., -2)
        setFontSize((s) => Math.max(minSize, s - 1));
      } else {
        setDidFit(true);
      }
    };

    return (
      <Text
        numberOfLines={maxLines}
        onTextLayout={onTextLayout}
        style={[style, { fontSize }]}
      >
        {children}
      </Text>
    );
  }


  return (

    <View style={commonStyles.contentContainer}>
      <Text style={commonStyles.textPrimary}>Log Templates</Text>
      <View style={[styles.searchBar]}>
        <Ionicons name="search" size={16} color={"white"} />
        <TextInput style={styles.searchInput} placeholder="Search..." placeholderTextColor={"white"} value={searchQuery} onChangeText={setSearchQuery} />
      </View>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>


        <View style={styles.displayCardContainer}>

          {/* Add NEW template card */}
          <Pressable
            style={[styles.addCard, { width: cardSize, height: cardSize }]}
            onPress={() => setIsModalVisible(true)}
          >
            <Ionicons name="add" size={addIconSize} color={colors.brand} />
          </Pressable>

          {/* list of templates */}
          {filteredTemplates.map(t => (
            <Pressable
              key={t.id}
              style={[styles.displayCard, { width: cardSize, height: cardSize }]}
              onPress={() => openDetails(t)}
            >

              <View style={styles.nameTextWrap}>
                <AutoShrinkText
                  initialSize={cardSize * 0.15}
                  maxLines={5}
                  minSize={1}
                  style={styles.nameText}
                >
                  {t.name}
                </AutoShrinkText>
              </View>
            </Pressable>
          ))}

        </View>

      </ScrollView>

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
              <Text style={styles.modalTitle}>New Log Template</Text>
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
                  <Text style={styles.label}>Template Name</Text>
                  <TextInput
                    style={styles.input}
                    value={templateName}
                    onChangeText={(v) => { setTemplateName(v); setNameTouched(true); }}
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

                {/* Dynamic Properties */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Description</Text>
                  {properties.map((property, index) => (
                    <View key={property.id} style={styles.propertyContainer}>
                      {/* Property Name and Type Row */}
                      <View style={styles.propertyRow}>
                        <View style={styles.propertyNameContainer}>
                          <TextInput
                            style={[styles.input, styles.propertyNameInput]}
                            value={property.name}
                            onChangeText={(value) => updateProperty(property.id, 'name', value)}
                            placeholder="Description"
                            placeholderTextColor="#999"
                          />
                        </View>

                        <View style={styles.propertyTypeContainer}>
                          <View style={styles.pickerContainer}>
                            {Platform.OS !== 'web' && <Text style={styles.pickerLabel}>Type:</Text>}
                            <View style={styles.pickerWrapper}>
                              {Platform.OS === 'web' ? (
                                <select
                                  value={property.property_type ?? 'text'}
                                  onChange={(e) => updateProperty(property.id, 'property_type', e.target.value)}
                                  style={{ width: '100%', height: 40, border: 'none', background: 'transparent' }}
                                  aria-label="Type"
                                >
                                  {PROPERTY_TYPES.map((t) => (
                                    <option key={t.value} value={t.value}>{t.label}</option>
                                  ))}
                                </select>
                              ) : (
                                <Picker
                                  selectedValue={property.property_type ?? 'text'}
                                  onValueChange={(value) => updateProperty(property.id, 'property_type', value)}
                                  mode="dropdown"
                                  style={styles.picker}
                                >
                                  {PROPERTY_TYPES.map((t) => (
                                    <Picker.Item key={t.value} label={t.label} value={t.value} />
                                  ))}
                                </Picker>
                              )}
                            </View>
                          </View>
                        </View>


                        {properties.length > 1 && (
                          <Pressable
                            style={styles.removeButton}
                            onPress={() => removeProperty(property.id)}
                          >
                            <Ionicons name="trash-outline" size={20} color="#ff4444" />
                          </Pressable>
                        )}
                      </View>
                    </View>
                  ))}

                  <Pressable style={styles.addPropertyButton} onPress={addProperty}>
                    <Ionicons name="add" size={20} color={colors.brand} />
                    <Text style={styles.addPropertyText}>Add Property</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>
            <View style={styles.modalFooter}>
              <View style={styles.buttonContainer}>
                <Pressable style={styles.cancelButton} onPress={() => setIsModalVisible(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </Pressable>
                <Pressable style={styles.saveButton} onPress={handleAddTemplate}>
                  <Text style={styles.saveButtonText}>Save</Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* view template */}
      <Modal
        visible={detailsVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setDetailsVisible(false);
          setSelectedTemplate(null);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modal, { height: '70%' }]}>
            {/* Header */}
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

            {/* Content */}
            <ScrollView
              style={styles.modalScrollView}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <View style={styles.modalContent}>
                {/* Template name */}
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

                {/* Properties */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Properties</Text>

                  {detailProps.map((p) => (
                    <View key={p.id} style={styles.propertyContainer}>
                      <View style={styles.propertyRow}>
                        {/* Name */}
                        <View style={styles.propertyNameContainer}>
                          <TextInput
                            style={[styles.input, styles.propertyNameInput]}
                            value={p.name}
                            onChangeText={(v) => updateDetailProperty(p.id, 'name', v)}
                            placeholder="Property name"
                            placeholderTextColor="#999"
                          />
                        </View>

                        {/* Type */}
                        <View style={styles.propertyTypeContainer}>
                          <View style={styles.pickerContainer}>
                            {Platform.OS !== 'web' && (
                              <Text style={styles.pickerLabel}>Type:</Text>
                            )}
                            <View style={styles.pickerWrapper}>
                              {Platform.OS === 'web' ? (
                                <select
                                  value={p.property_type ?? 'text'}
                                  onChange={(e) =>
                                    updateDetailProperty(p.id, 'property_type', e.target.value)
                                  }
                                  style={{
                                    width: '100%',
                                    height: 40,
                                    border: 'none',
                                    background: 'transparent',
                                  }}
                                  aria-label="Type"
                                >
                                  <option value="text">Text</option>
                                  <option value="number">Number</option>
                                  <option value="date">Date</option>
                                </select>
                              ) : (
                                <Picker
                                  selectedValue={p.property_type ?? 'text'}
                                  onValueChange={(value) =>
                                    updateDetailProperty(p.id, 'property_type', value)
                                  }
                                  mode="dropdown"
                                  style={styles.picker}
                                >
                                  <Picker.Item label="Text" value="text" />
                                  <Picker.Item label="Number" value="number" />
                                  <Picker.Item label="Date" value="date" />
                                </Picker>
                              )}
                            </View>
                          </View>
                        </View>

                        {/* Remove property */}
                        {detailProps.length > 1 && (
                          <Pressable
                            style={styles.removeButton}
                            onPress={() => removeDetailProperty(p.id)}
                          >
                            <Ionicons name="trash-outline" size={20} color="#ff4444" />
                          </Pressable>
                        )}
                      </View>

                      {/* Default value (only for number/date; hide for text) */}
                      {p.property_type === 'date' ? (
                        Platform.OS === 'web' ? (
                          <input
                            type="date"
                            value={p.default_value || ''}
                            onChange={(e) =>
                              updateDetailProperty(p.id, 'default_value', e.target.value)
                            }
                            style={{
                              width: '100%',
                              height: 40,
                              borderWidth: 1,
                              borderColor: '#ddd',
                              borderRadius: 8,
                              padding: 10,
                              background: '#f9f9f9',
                              marginTop: 8,
                            }}
                          />
                        ) : (
                          <TextInput
                            style={[styles.input, { marginTop: 8 }]}
                            value={p.default_value}
                            onChangeText={(v) =>
                              updateDetailProperty(p.id, 'default_value', v)
                            }
                            placeholder="Default date (YYYY-MM-DD)"
                            placeholderTextColor="#999"
                          />
                        )
                      ) : p.property_type === 'number' ? (
                        <TextInput
                          style={[styles.input, { marginTop: 8 }]}
                          value={p.default_value}
                          onChangeText={(v) =>
                            updateDetailProperty(p.id, 'default_value', v)
                          }
                          placeholder="Default number value"
                          placeholderTextColor="#999"
                          keyboardType="numeric"
                        />
                      ) : null}

                    </View>
                  ))}

                  <Pressable
                    style={[styles.addPropertyButton, { marginTop: 8 }]}
                    onPress={addDetailProperty}
                  >
                    <Ionicons name="add" size={20} color={colors.brand} />
                    <Text style={styles.addPropertyText}>Add Property</Text>
                  </Pressable>
                </View>
              </View>
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <View style={styles.buttonContainer}>
                <Pressable
                  style={[styles.cancelButton, { borderColor: '#ff4444' }]}
                  onPress={deleteTemplate}
                >
                  <Text style={[styles.cancelButtonText, { color: '#ff4444' }]}>
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

export const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
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
    flexDirection: 'row',
    marginBottom: 8,
  },

  searchInput: {
    color: 'white',
    marginLeft: 16,
    flex: 1,

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
    justifyContent: 'center',
    alignItems: 'center',
  },

  countText: {
    alignSelf: 'flex-end',
    fontWeight: 'bold',
  },

  nameText: {

    fontWeight: 'bold',
  },

  nameTextWrap: {
    flex: 1,
    justifyContent: 'flex-end',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modal: {
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 16,
    height: '80%',
    flexDirection: 'column',
    overflow: 'visible',
  },
  modalHeader: {
    backgroundColor: colors.primary,
    borderTopLeftRadius: 13,
    borderTopRightRadius: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    flexShrink: 0,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  modalScrollView: {
    flex: 1,
    height: '80%',
    overflow: 'visible',
  },
  modalContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    color: colors.primary,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  modalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
    flexShrink: 0, // Prevent footer from shrinking
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
    textAlign: 'center',
    color: colors.normal,
    fontWeight: 'bold',
  },
  saveButton: {
    flex: 1,
    padding: 12,
    marginLeft: 8,
    borderRadius: 8,
    backgroundColor: colors.primary,
  },
  saveButtonText: {
    textAlign: 'center',
    color: 'white',
    fontWeight: 'bold',
  },

  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  propertyInputs: {
    flex: 1,
    marginRight: 8,
  },
  propertyNameInput: {
    flex: 1,
  },

  removeButton: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: '#ffe6e6',
  },
  addPropertyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderWidth: 2,
    borderColor: colors.brand,
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  addPropertyText: {
    marginLeft: 8,
    color: colors.brand,
    fontWeight: 'bold',
  },

  propertyContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },

  propertyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },

  propertyNameContainer: {
    flex: 2,
    marginRight: 8,
  },

  propertyNameInput: {
    flex: 1,
  },

  propertyTypeContainer: {
    flex: 1,
    marginRight: 8,
    zIndex: 1,
    position: 'relative',
    elevation: 4,
  },

  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  pickerLabel: {
    fontSize: 12,
    color: colors.primary,
    marginRight: 4,
    fontWeight: 'bold',
  },

  pickerWrapper: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
    backgroundColor: '#f9f9f9',
    overflow: 'visible',
  },

  picker: {
    height: 40,
    width: '100%',
  },

  defaultValueSection: {
    marginTop: 8,
  },

  defaultValueLabel: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 4,
    fontWeight: 'bold',
  },

  booleanContainer: {
    flexDirection: 'row',
  },

  booleanButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.brand,
    borderRadius: 6,
    marginRight: 8,
  },

  booleanButtonSelected: {
    backgroundColor: colors.brand,
  },

  booleanButtonText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: 'bold',
  },

  booleanButtonTextSelected: {
    color: 'white',
  },

  selectContainer: {
    marginTop: 4,
  },

  selectLabel: {
    fontSize: 12,
    color: colors.primary,
    marginBottom: 4,
    fontWeight: 'bold',
  },

  selectOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },

  selectOptionInput: {
    flex: 1,
    marginRight: 8,
    fontSize: 12,
  },

  removeOptionButton: {
    padding: 4,
  },

  addOptionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: 'dashed',
    borderRadius: 4,
    backgroundColor: '#f9f9f9',
    marginTop: 4,
  },

  addOptionText: {
    marginLeft: 4,
    color: colors.brand,
    fontSize: 12,
    fontWeight: 'bold',
  },

  fieldError: {
    color: '#ff4444',
    marginTop: 6,
    fontSize: 12,
    fontWeight: '600',
  },


})