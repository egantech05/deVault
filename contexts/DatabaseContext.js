import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
  } from 'react';
  import { supabase } from '../lib/supabase';
  import { useAuth } from './AuthContext';
  
  const DatabaseContext = createContext(null);
  
  export const useDatabase = () => {
    const ctx = useContext(DatabaseContext);
    if (!ctx) throw new Error('useDatabase must be used within a DatabaseProvider');
    return ctx;
  };
  
  export const DatabaseProvider = ({ children }) => {
    const { user, profile, fetchUserProfile } = useAuth();
    const [databases, setDatabases] = useState([]);
    const [activeDatabaseId, setActiveDatabaseId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
    const activeDatabase = useMemo(
      () => databases.find((db) => db.id === activeDatabaseId) ?? null,
      [databases, activeDatabaseId]
    );
  
    const persistActiveDatabase = useCallback(
      async (databaseId) => {
        if (!user) return;
           try {
                const { error: updateError } = await supabase
                  .from('profiles')
                  .update({ last_active_database_id: databaseId ?? null })
                  .eq('id', user.id);
          
                if (updateError) {
                  console.error('Failed to persist active database', updateError);
                  return;
                }
          
                await fetchUserProfile(user.id);
              } catch (err) {
                console.error('Unexpected error while persisting active database', err);
              }
      },
      [user, fetchUserProfile]
    );
  
    const loadDatabases = useCallback(async () => {
      if (!user) {
        setDatabases([]);
        setActiveDatabaseId(null);
        setLoading(false);
        setError(null);
        return;
      }
  
      setLoading(true);
      setError(null);
  
      try {
              const { data, error: fetchError } = await supabase
                .from('databases')
                .select('id, name, created_at')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: true });
        
              if (fetchError) {
                console.error('Failed to load databases', fetchError);
                setDatabases([]);
                setActiveDatabaseId(null);
                setError(fetchError);
                return;
              }
        
              const list = data ?? [];
              setDatabases(list);
        
              let nextActiveId = null;
              if (profile?.last_active_database_id) {
                const match = list.find((db) => db.id === profile.last_active_database_id);
                if (match) {
                  nextActiveId = match.id;
                }
              }
        
              if (!nextActiveId && list.length) {
                nextActiveId = list[0].id;
                await persistActiveDatabase(nextActiveId);
              }
        
              setActiveDatabaseId(nextActiveId);
            } catch (err) {
              console.error('Unexpected error loading databases', err);
              setDatabases([]);
              setActiveDatabaseId(null);
              setError(err);
            } finally {
              setLoading(false);
            }



    }, [user, profile?.last_active_database_id, persistActiveDatabase]);
  
    useEffect(() => {
      loadDatabases();
    }, [loadDatabases]);
  
    const refresh = useCallback(() => {
      loadDatabases();
    }, [loadDatabases]);
  
    const selectDatabase = useCallback(
      async (databaseId) => {
        if (!databaseId || databaseId === activeDatabaseId) {
          setIsCreateModalOpen(false);
          return;
        }
        setActiveDatabaseId(databaseId);
        await persistActiveDatabase(databaseId);
        setIsCreateModalOpen(false);
      },
      [activeDatabaseId, persistActiveDatabase]
    );
  
    const clearActiveDatabase = useCallback(async () => {
      setActiveDatabaseId(null);
      await persistActiveDatabase(null);
    }, [persistActiveDatabase]);
  
    const createDatabase = useCallback(
      async (name) => {
        if (!user) throw new Error('You must be signed in to create a database.');
        const trimmed = (name || '').trim();
        if (!trimmed) throw new Error('Database name is required.');
  
        setSaving(true);
        const { data, error: insertError } = await supabase
          .from('databases')
          .insert([{ owner_id: user.id, name: trimmed }])
          .select('id, name, created_at')
          .single();
        setSaving(false);
  
        if (insertError) {
          console.error('Failed to create database', insertError);
          throw insertError;
        }
  
        setDatabases((prev) =>
          [...prev, data].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          )
        );
        setActiveDatabaseId(data.id);
        await persistActiveDatabase(data.id);
        setIsCreateModalOpen(false);
        return data;
      },
      [user, persistActiveDatabase]
    );
  
    const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
    const closeCreateModal = useCallback(() => setIsCreateModalOpen(false), []);
  
    const value = useMemo(
      () => ({
        databases,
        activeDatabaseId,
        activeDatabase,
        loading,
        saving,
        error,
        refresh,
        selectDatabase,
        clearActiveDatabase,
        createDatabase,
        isCreateModalOpen,
        openCreateModal,
        closeCreateModal,
      }),
      [
        databases,
        activeDatabaseId,
        activeDatabase,
        loading,
        saving,
        error,
        refresh,
        selectDatabase,
        clearActiveDatabase,
        createDatabase,
        isCreateModalOpen,
        openCreateModal,
        closeCreateModal,
      ]
    );
  
    return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
  };
  