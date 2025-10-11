import { supabase } from "../supabase";


export async function suggestValuesForProperty({ template_id, property_id, q = "", limit = 50 }) {
    // Distinct values observed for template+property from asset_property_values
    let query = supabase
        .from("asset_property_values")
        .select("value_text")
        .not("value_text", "is", null)
        .limit(limit);


    // Join via filter on assets.template_id (Supabase cannot express join here; we use in filter via RPC or separate view in future)
    // For now, we apply a subquery filter using in() on asset_ids fetched by template


    const { data: assetsInTemplate, error: assetsErr } = await supabase
        .from("assets")
        .select("id")
        .eq("template_id", template_id)
        .limit(10000);
    if (assetsErr) throw assetsErr;
    const assetIds = (assetsInTemplate ?? []).map(a => a.id);


    if (assetIds.length === 0) return [];


    query = query
        .in("asset_id", assetIds)
        .eq("property_id", property_id);


    if (q?.trim()) {
        query = query.ilike("value_text", `%${q.trim()}%`);
    }


    const { data, error } = await query;
    if (error) throw error;


    // dedupe + normalize
    const set = new Map();
    for (const row of data) {
        const raw = row.value_text ?? "";
        const norm = raw.trim().toLowerCase();
        if (!set.has(norm)) set.set(norm, raw);
    }
    return Array.from(set.values()).slice(0, limit);
}