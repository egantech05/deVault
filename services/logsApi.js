import { supabase } from "../lib/supabase";

export const fetchLogTemplates = async (databaseId) => {
  if (!databaseId) return [];
  const { data, error } = await supabase
    .from("log_templates")
    .select("id, name")
    .eq("database_id", databaseId)
    .order("name", { ascending: true });

  if (error) throw error;
  return data ?? [];
};

export const fetchLogs = (databaseId, assetId, from = 0, size = 20) => {
  if (!databaseId || !assetId) {
    return Promise.resolve({ data: [], error: null });
  }
  return supabase
    .from("log_entries")
    .select("id, template_id, value_map, fields_snapshot, created_at, log_templates(name)")
    .eq("database_id", databaseId)
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false })
    .range(from, from + size - 1);
};

export const insertLog = (databaseId, row) =>
  supabase
    .from("log_entries")
    .insert([{ ...row, database_id: databaseId }])
    .select("id, template_id, value_map, fields_snapshot, created_at, log_templates(name)")
    .single();

export const updateLog = (databaseId, id, patch) =>
  supabase
    .from("log_entries")
    .update(patch)
    .eq("id", id)
    .eq("database_id", databaseId)
    .select("id, template_id, value_map, fields_snapshot, created_at, log_templates(name)")
    .single();

export const deleteLogById = (databaseId, id) =>
  supabase
    .from("log_entries")
    .delete()
    .eq("id", id)
    .eq("database_id", databaseId);

export const fetchTemplateFields = (templateId) =>
  supabase
    .from("log_template_fields")
    .select("id, property_name, property_type, default_value, display_order")
    .eq("template_id", templateId)
    .order("display_order", { ascending: true });
