import { supabase } from "../supabase";


const PAGE_SIZE_DEFAULT = 20;


export async function listLinkedDocRules({ search = "", page = 1, pageSize = PAGE_SIZE_DEFAULT } = {}) {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;


    let query = supabase
        .from("linked_document_rules")
        .select(`
id, value_raw, value_norm, created_at,
document:documents(id, name, storage_path, mime_type, size_bytes),
template:asset_templates(id, name),
property:template_properties(id, property_name, property_type)
`, { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);


    if (search?.trim()) {
        const s = `%${search.trim()}%`;
        query = query.ilike("value_raw", s).or(
            [
                `documents.name.ilike.${s}`,
                `asset_templates.name.ilike.${s}`,
                `template_properties.property_name.ilike.${s}`
            ].join(",")
        );
    }


    const { data, error, count } = await query;
    if (error) throw error;
    return { rows: data ?? [], count: count ?? 0 };
}


export async function createLinkedDocRule({ document_id, template_id, property_id, value_raw, notes = null }) {
    const created_by = (await supabase.auth.getUser()).data.user?.id ?? null;
    const value_norm = value_raw?.toString()?.trim()?.toLowerCase() ?? "";
    const { data, error } = await supabase
        .from("linked_document_rules")
        .insert([{ document_id, template_id, property_id, value_raw, value_norm, notes, created_by }])
        .select()
        .single();
    if (error) throw error;
    return data;
}


export async function deleteLinkedDocRule(id) {
    const { error } = await supabase.from("linked_document_rules").delete().eq("id", id);
    if (error) throw error;
    return true;
}


export async function getLinkedDocsForAsset(asset_id) {
    const { data, error } = await supabase
        .from("v_linked_documents_for_asset")
        .select("*")
        .eq("asset_id", asset_id)
        .order("rule_created_at", { ascending: false });
    if (error) throw error;
    return data ?? [];
}