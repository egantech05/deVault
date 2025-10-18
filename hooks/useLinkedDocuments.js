import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { useDatabase } from "../contexts/DatabaseContext";

// ---- LIST HOOK (client-side search) ----
export function useLinkedDocsList() {
  const { activeDatabaseId } = useDatabase();
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [rawRows, setRawRows] = useState([]);

  const load = useCallback(async () => {
    if (!activeDatabaseId) {
      setRawRows([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from("linked_document_rules")
      .select(`
        id,
        database_id,
        value_raw,
        created_at,
        template:asset_templates(id, name),
        property:template_properties(id, property_name),
        document:documents(id, name, storage_path, mime_type, size_bytes)
      `)
      .eq("database_id", activeDatabaseId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("load linked rules error:", error);
      setRawRows([]);
    } else {
      setRawRows(data ?? []);
    }
    setLoading(false);
  }, [activeDatabaseId]);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    if (!q) return rawRows;

    return rawRows.filter((r) => {
      const docName = (r.document?.name || "").toLowerCase();
      const template = (r.template?.name || "").toLowerCase();
      const prop = (r.property?.property_name || "").toLowerCase();
      const val = (r.value_raw || "").toLowerCase();
      return (
        docName.includes(q) ||
        template.includes(q) ||
        prop.includes(q) ||
        val.includes(q)
      );
    });
  }, [rawRows, search]);

  const reload = useCallback(() => load(), [load]);

  return { search, setSearch, rows, loading, reload };
}

// ---- CREATE HOOK ----
export function useCreateLinkedDoc(onCreated) {
  const { activeDatabaseId, openCreateModal } = useDatabase();
  const [saving, setSaving] = useState(false);

  const create = useCallback(
    async ({ docSource, template_id, property_id, value_raw }) => {
      if (!activeDatabaseId) {
        openCreateModal();
        throw new Error("Select a database before linking documents.");
      }

      setSaving(true);
      try {
        const document_id = docSource?.id;
        if (!document_id) throw new Error("Missing document id");

        const value_norm = (value_raw || "").trim().toLowerCase();

        const { error } = await supabase.from("linked_document_rules").insert([
          {
            database_id: activeDatabaseId,
            document_id,
            template_id,
            property_id,
            value_raw,
            value_norm,
          },
        ]);

        if (error) throw error;

        onCreated?.();
      } finally {
        setSaving(false);
      }
    },
    [activeDatabaseId, onCreated, openCreateModal]
  );

  return { saving, create };
}
