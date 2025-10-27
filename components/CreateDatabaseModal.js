import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, TextInput } from 'react-native';
import ModalSmall from './ModalSmall';
import { useDatabase } from '../contexts/DatabaseContext';

const modalStyles = ModalSmall.styles;

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
    <ModalSmall visible={isCreateModalOpen} onRequestClose={closeCreateModal}>
      <ModalSmall.Title>Create Database</ModalSmall.Title>
      <ModalSmall.Subtitle>
        Enter a name for your database. You can add more later from the sidebar.
      </ModalSmall.Subtitle>

      <ModalSmall.Body>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Database name"
          placeholderTextColor="#b5b5b5"
          style={modalStyles.input}
          autoFocus
          editable={!saving}
        />

        {!!error && <Text style={modalStyles.error}>{error}</Text>}
      </ModalSmall.Body>

      <ModalSmall.Footer>
        <Pressable onPress={closeCreateModal} style={modalStyles.cancelButton}>
          <Text style={modalStyles.cancelText}>Cancel</Text>
        </Pressable>

        <Pressable
          onPress={handleCreate}
          disabled={disabled}
          style={[modalStyles.primaryButton, disabled && modalStyles.primaryButtonDisabled]}
        >
          {saving ? (
            <ActivityIndicator color="white" size="small" />
          ) : (
            <Text style={modalStyles.primaryButtonText}>Create</Text>
          )}
        </Pressable>
      </ModalSmall.Footer>
    </ModalSmall>
  );
}
