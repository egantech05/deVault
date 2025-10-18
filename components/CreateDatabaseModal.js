import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { colors } from './Styles';
import { useDatabase } from '../contexts/DatabaseContext';

export default function CreateDatabaseModal() {
  const { isCreateModalOpen, closeCreateModal, createDatabase, saving } = useDatabase();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isCreateModalOpen) {
      setName('');
      setError('');
    }
  }, [isCreateModalOpen]);

  const handleCreate = async () => {
    try {
      setError('');
      await createDatabase(name);
      setName('');
    } catch (err) {
      setError(err?.message || 'Failed to create database.');
    }
  };

  const disabled = saving || !name.trim();

  return (
    <Modal visible={isCreateModalOpen} transparent animationType="fade" onRequestClose={closeCreateModal}>
      <View style={styles.backdrop}>
        <View style={styles.container}>
          <Text style={styles.title}>Create Database</Text>
          <Text style={styles.subtitle}>
            Enter a name for your database. You can add more later from the sidebar.
          </Text>

          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Database name"
            placeholderTextColor="#b5b5b5"
            style={styles.input}
            autoFocus
            editable={!saving}
          />

          {!!error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.footer}>
            <Pressable onPress={closeCreateModal} style={styles.cancel}>
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>

            <Pressable
              onPress={handleCreate}
              disabled={disabled}
              style={[styles.create, disabled && styles.createDisabled]}
            >
              {saving ? (
                <ActivityIndicator color="white" size="small" />
              ) : (
                <Text style={styles.createText}>Create</Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  container: {
    width: 420,
    maxWidth: '100%',
    backgroundColor: '#111827',
    borderRadius: 20,
    padding: 24,
    gap: 16,
  },
  title: {
    color: 'white',
    fontSize: 22,
    fontWeight: '700',
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 14,
    lineHeight: 18,
  },
  input: {
    backgroundColor: '#1f2937',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: 'white',
    borderWidth: 1,
    borderColor: '#374151',
  },
  error: {
    color: '#f87171',
    fontSize: 13,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
  },
  cancel: {
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  cancelText: {
    color: '#f3f4f6',
    fontWeight: '600',
  },
  create: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
  },
  createDisabled: {
    opacity: 0.6,
  },
  createText: {
    color: 'white',
    fontWeight: '700',
  },
});
