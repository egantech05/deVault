import { supabase } from "../lib/supabase";

export const fetchAssets = () =>
    supabase
        .from("assets")
        .select("id, template_id, created_at, asset_templates(name)")
        .order("created_at", { ascending: false });

export const fetchAssetFirstValues = (ids) =>
    supabase
        .from("asset_property_values")
        .select("asset_id, value, template_properties:property_id(display_order, is_active)")
        .in("asset_id", ids);

export const createAsset = (template_id) =>
    supabase.from("assets").insert([{ template_id }]).select("id").single();

export const upsertAssetPropValues = (rows) =>
    supabase.from("asset_property_values").upsert(rows, { onConflict: "asset_id,property_id" });

export const deleteAssetById = (id) =>
    supabase.from("assets").delete().eq("id", id);

export const fetchTemplateProps = (templateId) =>
    supabase
        .from("template_properties")
        .select("id, property_name, property_type, default_value, display_order")
        .eq("template_id", templateId)
        .eq("is_active", true)
        .order("display_order", { ascending: true });
