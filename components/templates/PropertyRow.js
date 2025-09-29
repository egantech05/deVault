
import React from 'react';
import { View, Text, TextInput, Platform, Pressable, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../Styles'; // relative to /components/templates/

const PROPERTY_TYPES = [
    { value: 'text', label: 'Text' },
    { value: 'number', label: 'Number' },
    { value: 'date', label: 'Date' },
];

export default function PropertyRow({
    property,                 // { id, name, property_type, default_value }
    onChange,                 // (field, value) => void
    onRemove,                 // () => void
    canRemove = true,
    namePlaceholder = 'Property name',
}) {
    const { name, property_type, default_value } = property || {};

    return (
        <View style={s.container}>
            <View style={s.row}>
                {/* name */}
                <View style={s.nameCol}>
                    <TextInput
                        style={[s.input, s.nameInput]}
                        value={name}
                        onChangeText={(v) => onChange('name', v)}
                        placeholder={namePlaceholder}
                        placeholderTextColor="#999"
                    />
                </View>

                {/* type */}
                <View style={s.typeCol}>
                    <View style={s.pickerContainer}>
                        {Platform.OS !== 'web' && <Text style={s.pickerLabel}>Type:</Text>}
                        <View style={s.pickerWrapper}>
                            {Platform.OS === 'web' ? (
                                <select
                                    value={property_type ?? 'text'}
                                    onChange={(e) => onChange('property_type', e.target.value)}
                                    style={{ width: '100%', height: 40, border: 'none', background: 'transparent' }}
                                    aria-label="Type"
                                >
                                    {PROPERTY_TYPES.map((t) => (
                                        <option key={t.value} value={t.value}>{t.label}</option>
                                    ))}
                                </select>
                            ) : (
                                <Picker
                                    selectedValue={property_type ?? 'text'}
                                    onValueChange={(v) => onChange('property_type', v)}
                                    mode="dropdown"
                                    style={s.picker}
                                >
                                    {PROPERTY_TYPES.map((t) => (
                                        <Picker.Item key={t.value} label={t.label} value={t.value} />
                                    ))}
                                </Picker>
                            )}
                        </View>
                    </View>
                </View>

                {/* remove */}
                {canRemove && (
                    <Pressable style={s.removeBtn} onPress={onRemove}>
                        <Ionicons name="trash-outline" size={20} color="#ff4444" />
                    </Pressable>
                )}
            </View>

            {/* default value (date/number only) */}
            {property_type === 'date' ? (
                Platform.OS === 'web' ? (
                    <input
                        type="date"
                        value={default_value || ''}
                        onChange={(e) => onChange('default_value', e.target.value)}
                        style={s.dateInputWeb}
                    />
                ) : (
                    <TextInput
                        style={[s.input, { marginTop: 8 }]}
                        value={default_value}
                        onChangeText={(v) => onChange('default_value', v)}
                        placeholder="Default date (YYYY-MM-DD)"
                        placeholderTextColor="#999"
                    />
                )
            ) : property_type === 'number' ? (
                <TextInput
                    style={[s.input, { marginTop: 8 }]}
                    value={default_value}
                    onChangeText={(v) => onChange('default_value', v)}
                    placeholder="Default number value"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                />
            ) : null}
        </View>
    );
}

const s = StyleSheet.create({
    container: {
        backgroundColor: '#f8f9fa',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    nameCol: { flex: 2, marginRight: 8 },
    typeCol: { flex: 1, marginRight: 8, zIndex: 1, position: 'relative', elevation: 4 },
    input: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 12, fontSize: 16, backgroundColor: '#f9f9f9',
    },
    nameInput: { flex: 1 },
    pickerContainer: { flexDirection: 'row', alignItems: 'center' },
    pickerLabel: { fontSize: 12, color: colors.primary, marginRight: 4, fontWeight: 'bold' },
    pickerWrapper: { flex: 1, borderWidth: 1, borderColor: '#ddd', borderRadius: 6, backgroundColor: '#f9f9f9', overflow: 'visible' },
    picker: { height: 40, width: '100%' },
    removeBtn: { padding: 8, borderRadius: 6, backgroundColor: '#ffe6e6' },
    dateInputWeb: {
        width: '100%', height: 40, borderWidth: 1, borderColor: '#ddd',
        borderRadius: 8, padding: 10, backgroundColor: '#f9f9f9', marginTop: 8,
    },
});
