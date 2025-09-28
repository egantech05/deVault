import { supabase } from "../lib/supabase";

export const fetchLogTemplates = () =>
    supabase.from("log_templates").select("id, name").order("name", { ascending: true });

export const fetchLogs = (asset_id, from = 0, size = 20) =>
    supabase
        .from("log_entries")
        .select("id, template_id, value_map, fields_snapshot, created_at, log_templates(name)")
        .eq("asset_id", asset_id)
        .order("created_at", { ascending: false })
        .range(from, from + size - 1);

export const insertLog = (row) =>
    supabase
        .from("log_entries")
        .insert([row])
        .select("id, template_id, value_map, fields_snapshot, created_at, log_templates(name)")
        .single();

export const updateLog = (id, patch) =>
    supabase
        .from("log_entries")
        .update(patch)
        .eq("id", id)
        .select("id, template_id, value_map, fields_snapshot, created_at, log_templates(name)")
        .single();

export const deleteLogById = (id) =>
    supabase.from("log_entries").delete().eq("id", id);

export const fetchTemplateFields = (template_id) =>
    supabase
        .from("log_template_fields")
        .select("id, property_name, property_type, default_value, display_order")
        .eq("template_id", template_id)
        .order("display_order", { ascending: true });
