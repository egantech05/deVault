import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
  } from 'react';
import { AppState, Platform } from 'react-native';
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
    const [initialized, setInitialized] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [membership, setMembership] = useState(null);
    const [membershipLoading, setMembershipLoading] = useState(false);
  
    const activeDatabase = useMemo(
      () => databases.find((db) => db.id === activeDatabaseId) ?? null,
      [databases, activeDatabaseId]
    );

    // Guard long-hanging network requests to avoid stuck spinners after idle
    const withTimeout = useCallback((promise, ms = 60000) => {
      return Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), ms)),
      ]);
    }, []);
  
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
  
    const loadDatabases = useCallback(async ({ background = false } = {}) => {
      if (!user) {
        setDatabases([]);
        setActiveDatabaseId(null);
        setLoading(false);
        setError(null);
        setMembership(null);
        setMembershipLoading(false);
        setInitialized(true);
        return;
      }

      // Only show blocking loading if no active DB yet and not a background refresh
      if (!background && !activeDatabaseId) setLoading(true);
      setError(null);

      try {
              // Owned databases
              const { data: owned, error: fetchError } = await withTimeout(
                supabase
                .from('databases')
                .select('id, name, created_at, owner_id')
                .eq('owner_id', user.id)
                .order('created_at', { ascending: true })
              );
              if (fetchError) throw fetchError;

              // Databases where user is a member (not owner)
              const { data: memberRows, error: memberErr } = await withTimeout(
                supabase
                .from('database_members')
                .select('database_id')
                .eq('user_id', user.id)
              );
              if (memberErr) throw memberErr;

              let memberDbs = [];
              if (memberRows && memberRows.length) {
                const ids = [...new Set(memberRows.map(r => r.database_id))];
                const { data: dbsByMembership, error: dbsErr } = await withTimeout(
                  supabase
                  .from('databases')
                  .select('id, name, created_at, owner_id')
                  .in('id', ids)
                );
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

              // Keep current active if it still exists
              if (activeDatabaseId && list.some((db) => db.id === activeDatabaseId)) {
                nextActiveId = activeDatabaseId;
              } else if (profile?.last_active_database_id) {
                const match = list.find((db) => db.id === profile.last_active_database_id);
                if (match) {
                  nextActiveId = match.id;
                }
              }
        
              // Prefer last active from profile; otherwise default to first
              if (!nextActiveId && list.length) {
                nextActiveId = list[0].id;
                // Set immediately to unblock UI; persist in background
                setActiveDatabaseId(nextActiveId);
                persistActiveDatabase(nextActiveId).catch((e) =>
                  console.warn('Persist default active DB failed:', e?.message || e)
                );
              } else {
                // Only update if changed
                if (nextActiveId !== activeDatabaseId) setActiveDatabaseId(nextActiveId);
              }
            } catch (err) {
              if (err && err.message === 'timeout') {
                console.warn('loadDatabases timed out; will retry on resume/network');
                // Do not set error state for transient timeouts
              } else {
                console.error('Unexpected error loading databases', err);
                // On non-timeout failure, keep previous state; surface error
                if (!activeDatabaseId) setDatabases([]);
                setError(err);
              }
            } finally {
              setLoading(false);
              setInitialized(true);
            }



    }, [user, profile?.last_active_database_id, persistActiveDatabase, activeDatabaseId]);
  
    const loadMembership = useCallback(
      async (databaseId, ownerId) => {
        if (!user || !databaseId) {
          setMembership(null);
          setMembershipLoading(false);
          return;
        }

        setMembershipLoading(true);
        try {
          const { data, error } = await withTimeout(
            supabase
            .from('database_members')
            .select('id, role')
            .eq('database_id', databaseId)
            .eq('user_id', user.id)
            .maybeSingle()
          );

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
          if (err && err.message === 'timeout') {
            console.warn('loadMembership timed out; keeping previous membership');
            // Keep previous membership on timeout; avoid flipping state
          } else {
            console.error('Failed to load membership', err);
            if (ownerId && ownerId === user?.id) {
              setMembership({ id: null, role: 'admin', database_id: databaseId, isOwnerFallback: true });
            } else {
              setMembership(null);
            }
          }
        } finally {
          setMembershipLoading(false);
        }
      },
      [user]
    );

    useEffect(() => {
      loadDatabases({ background: false });
    }, [loadDatabases]);

    useEffect(() => {
      if (!activeDatabaseId) {
        setMembership(null);
        setMembershipLoading(false);
        return;
      }
      loadMembership(activeDatabaseId, activeDatabase?.owner_id ?? null);
    }, [activeDatabaseId, activeDatabase?.owner_id, loadMembership]);

    // Realtime: refresh list only when there are changes relevant to the user
    useEffect(() => {
      if (!user?.id) return;
      const ch = supabase
        .channel(`dblist:${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'databases', filter: `owner_id=eq.${user.id}` },
          () => loadDatabases({ background: true })
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'database_members', filter: `user_id=eq.${user.id}` },
          () => loadDatabases({ background: true })
        )
        .subscribe();

      return () => {
        try { supabase.removeChannel(ch); } catch {}
      };
    }, [user?.id, loadDatabases]);

    const refresh = useCallback(() => {
      loadDatabases({ background: true });
      if (activeDatabaseId) {
        loadMembership(activeDatabaseId, activeDatabase?.owner_id ?? null);
      }
    }, [loadDatabases, activeDatabaseId, activeDatabase?.owner_id, loadMembership]);
    
    // Refresh on app resume and when network/visibility changes to recover from idle
    useEffect(() => {
      const onlineHandler = () => {
        try { refresh(); } catch {}
      };
      const visHandler = () => {
        try { if (typeof document !== 'undefined' && document.visibilityState === 'visible') refresh(); } catch {}
      };

      if (typeof window !== 'undefined') {
        window.addEventListener('online', onlineHandler);
      }
      if (typeof document !== 'undefined') {
        document.addEventListener('visibilitychange', visHandler);
      }

      let appStateSub;
      try {
        if (Platform && Platform.OS !== 'web' && AppState?.addEventListener) {
          appStateSub = AppState.addEventListener('change', (state) => {
            if (state === 'active') {
              refresh();
            }
          });
        }
      } catch {}

      return () => {
        if (typeof window !== 'undefined') {
          window.removeEventListener('online', onlineHandler);
        }
        if (typeof document !== 'undefined') {
          document.removeEventListener('visibilitychange', visHandler);
        }
        if (appStateSub && typeof appStateSub.remove === 'function') {
          appStateSub.remove();
        }
      };
    }, [refresh]);
  
    const selectDatabase = useCallback(
      async (databaseId) => {
        if (!databaseId || databaseId === activeDatabaseId) {
          setIsCreateModalOpen(false);
          return;
        }
        setActiveDatabaseId(databaseId);
        // Persist in background; don't block UI
        persistActiveDatabase(databaseId).catch((e) =>
          console.warn('Persist active DB failed:', e?.message || e)
        );
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
        const { data, error: insertError } = await withTimeout(
          supabase
          .from('databases')
          .insert([{ owner_id: user.id, name: trimmed }])
          .select('id, name, created_at, owner_id')
          .single()
        );
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
          const { data: creatorMembership, error: memberError } = await withTimeout(
            supabase
            .from('database_members')
            .upsert([
              { database_id: data.id, user_id: user.id, role: 'admin' },
            ], { onConflict: 'database_id,user_id' })
            .select('id, role')
            .single()
          );

          if (memberError) {
            console.error('Failed to ensure creator membership', memberError);
          } else if (creatorMembership) {
            setMembership({ ...creatorMembership, database_id: data.id });
          }
        } catch (memberErr) {
          console.error('Unexpected error creating membership', memberErr);
        }
        setActiveDatabaseId(data.id);
        // Persist in background to avoid blocking UI
        persistActiveDatabase(data.id).catch((e) =>
          console.warn('Persist new active DB failed:', e?.message || e)
        );
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

    const deleteDatabase = useCallback(
      async (databaseId) => {
        if (!user) throw new Error('You must be signed in.');
        if (!databaseId) throw new Error('No database specified.');

        // Fetch database owner
        const { data: db, error: dbErr } = await withTimeout(
          supabase
            .from('databases')
            .select('id, owner_id, name')
            .eq('id', databaseId)
            .single()
        );
        if (dbErr) throw dbErr;
        if (!db) throw new Error('Database not found.');

        // Collect admin users for this database (membership admins + owner)
        const { data: adminRows, error: adminErr } = await withTimeout(
          supabase
            .from('database_members')
            .select('user_id, role')
            .eq('database_id', databaseId)
            .eq('role', 'admin')
        );
        if (adminErr) throw adminErr;

        const adminSet = new Set();
        if (db.owner_id) adminSet.add(db.owner_id);
        (adminRows || []).forEach((r) => {
          if (r?.user_id) adminSet.add(r.user_id);
        });

        const isAdminUser = adminSet.has(user.id);
        if (!isAdminUser) {
          throw new Error('Only admins can delete this database.');
        }

        // If any other admin exists (besides current user), block deletion
        adminSet.delete(user.id);
        if (adminSet.size > 0) {
          throw new Error('Cannot delete: other admins exist for this database.');
        }

        setSaving(true);
        try {
          const { error: delErr } = await withTimeout(
            supabase
              .from('databases')
              .delete()
              .eq('id', databaseId)
          );
          if (delErr) throw delErr;

          // Refresh local state
          await loadDatabases({ background: true });
          if (activeDatabaseId === databaseId) {
            // Clear active selection if it was deleted
            try { await persistActiveDatabase(null); } catch {}
            setActiveDatabaseId(null);
            setMembership(null);
          }
          return true;
        } finally {
          setSaving(false);
        }
      },
      [user, activeDatabaseId, withTimeout, loadDatabases, persistActiveDatabase]
    );

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
        deleteDatabase,
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
        deleteDatabase,
      ]
    );

    return <DatabaseContext.Provider value={value}>{children}</DatabaseContext.Provider>;
  };
  
  
