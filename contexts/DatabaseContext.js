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
    const [membership, setMembership] = useState(null);
    const [membershipLoading, setMembershipLoading] = useState(false);
  
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
        setMembership(null);
        setMembershipLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
              // Owned databases
              const { data: owned, error: fetchError } = await supabase
                .from('databases')
                .select('id, name, created_at, owner_id')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: true });
              if (fetchError) throw fetchError;

              // Databases where user is a member (not owner)
              const { data: memberRows, error: memberErr } = await supabase
                .from('database_members')
                .select('database_id')
                .eq('user_id', user.id);
              if (memberErr) throw memberErr;

              let memberDbs = [];
              if (memberRows && memberRows.length) {
                const ids = [...new Set(memberRows.map(r => r.database_id))];
                const { data: dbsByMembership, error: dbsErr } = await supabase
                  .from('databases')
                  .select('id, name, created_at, owner_id')
                  .in('id', ids);
                if (dbsErr) throw dbsErr;
                memberDbs = dbsByMembership || [];
              }

              // Merge owned + member and de-duplicate by id
              const seen = new Set();
              const list = [...(owned || []), ...memberDbs].filter(db => {
                if (!db) return false;
                if (seen.has(db.id)) return false;
                seen.add(db.id);
                return true;
              }).sort(
                (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
              );
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
  
    const loadMembership = useCallback(
      async (databaseId, ownerId) => {
        if (!user || !databaseId) {
          setMembership(null);
          setMembershipLoading(false);
          return;
        }

        setMembershipLoading(true);
        try {
          const { data, error } = await supabase
            .from('database_members')
            .select('id, role')
            .eq('database_id', databaseId)
            .eq('user_id', user.id)
            .maybeSingle();

          if (error) {
            throw error;
          }

          if (data) {
            setMembership({ ...data, database_id: databaseId });
          } else if (ownerId && ownerId === user.id) {
            setMembership({ id: null, role: 'admin', database_id: databaseId, isOwnerFallback: true });
          } else {
            setMembership(null);
          }
        } catch (err) {
          console.error('Failed to load membership', err);
          if (ownerId && ownerId === user?.id) {
            setMembership({ id: null, role: 'admin', database_id: databaseId, isOwnerFallback: true });
          } else {
            setMembership(null);
          }
        } finally {
          setMembershipLoading(false);
        }
      },
      [user]
    );

    useEffect(() => {
      loadDatabases();
    }, [loadDatabases]);

    useEffect(() => {
      if (!activeDatabaseId) {
        setMembership(null);
        setMembershipLoading(false);
        return;
      }
      loadMembership(activeDatabaseId, activeDatabase?.owner_id ?? null);
    }, [activeDatabaseId, activeDatabase?.owner_id, loadMembership]);

    const refresh = useCallback(() => {
      loadDatabases();
      if (activeDatabaseId) {
        loadMembership(activeDatabaseId, activeDatabase?.owner_id ?? null);
      }
    }, [loadDatabases, activeDatabaseId, activeDatabase?.owner_id, loadMembership]);
  
    const selectDatabase = useCallback(
      async (databaseId) => {
        if (!databaseId || databaseId === activeDatabaseId) {
          setIsCreateModalOpen(false);
          return;
        }
        setActiveDatabaseId(databaseId);
        await persistActiveDatabase(databaseId);
        const target = databases.find((db) => db.id === databaseId);
        await loadMembership(databaseId, target?.owner_id ?? null);
        setIsCreateModalOpen(false);
      },
      [activeDatabaseId, persistActiveDatabase, databases, loadMembership]
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
          .select('id, name, created_at, owner_id')
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
        try {
          const { data: creatorMembership, error: memberError } = await supabase
            .from('database_members')
            .upsert([
              { database_id: data.id, user_id: user.id, role: 'admin' },
            ], { onConflict: 'database_id,user_id' })
            .select('id, role')
            .single();

          if (memberError) {
            console.error('Failed to ensure creator membership', memberError);
          } else if (creatorMembership) {
            setMembership({ ...creatorMembership, database_id: data.id });
          }
        } catch (memberErr) {
          console.error('Unexpected error creating membership', memberErr);
        }
        setActiveDatabaseId(data.id);
        await persistActiveDatabase(data.id);
        setIsCreateModalOpen(false);
        return data;
      },
      [user, persistActiveDatabase]
    );
  
    const openCreateModal = useCallback(() => setIsCreateModalOpen(true), []);
    const closeCreateModal = useCallback(() => setIsCreateModalOpen(false), []);
  
    const derivedRole = useMemo(() => {
      if (!user || !activeDatabaseId) return null;
      if (membership?.role) return membership.role;
      if (activeDatabase?.owner_id && activeDatabase.owner_id === user.id) return 'admin';
      return null;
    }, [user?.id, activeDatabaseId, membership?.role, activeDatabase?.owner_id]);

    const isAdmin = derivedRole === 'admin';
    const canDelete = isAdmin;
    const canManageTeam = isAdmin;

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
        membership,
        membershipLoading,
        role: derivedRole,
        isAdmin,
        canDelete,
        canManageTeam,
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
        membership,
        membershipLoading,
        derivedRole,
        isAdmin,
        canDelete,
        canManageTeam,
      ]
    );
  
    return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
  };
  
