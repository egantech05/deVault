// hooks/useLinkedDocuments.js
import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

// ---- LIST HOOK (client-side search) ----
export function useLinkedDocsList() {
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [rawRows, setRawRows] = useState([]);

    const load = useCallback(async () => {
        setLoading(true);

        // Fetch everything we need in one call. No server-side filters here.
        const { data, error } = await supabase
            .from("linked_document_rules")
            .select(`
        id,
        value_raw,
        created_at,
        template:asset_templates(id, name),
        property:template_properties(id, property_name),
        document:documents(id, name, storage_path, mime_type, size_bytes)
      `)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("load linked rules error:", error);
            setRawRows([]);
        } else {
            setRawRows(data || []);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    // Client-side filter
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

// ---- CREATE HOOK (unchanged; keep whatever you already use) ----
export function useCreateLinkedDoc(onCreated) {
    const [saving, setSaving] = useState(false);

    const create = useCallback(
        async ({ docSource, template_id, property_id, value_raw }) => {
            setSaving(true);
            try {
                // If docSource has an id, assume documents row already exists.
                const document_id = docSource?.id;
                if (!document_id) throw new Error("Missing document id");

                // normalize value (mirror your SQL if needed)
                const value_norm = (value_raw || "").trim().toLowerCase();

                const { error } = await supabase.from("linked_document_rules").insert([
                    {
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
        [onCreated]
    );

    return { saving, create };
}
