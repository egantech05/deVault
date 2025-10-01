// hooks/useComponents.js
import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

export function useComponents(assetId) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    /** Load all components linked to this asset */
    const load = useCallback(async () => {
        if (!assetId) return;
        setLoading(true);
        setError(null);

        const { data, error } = await supabase
            .from("asset_components")
            .select(
                `
        id,
        asset_id,
        catalog_id,
        model,
        manufacturer,
        description,
        created_at
      `
            )
            .eq("asset_id", assetId)
            .order("created_at", { ascending: false });

        if (error) {
            setError(error);
            setItems([]);
        } else {
            setItems(data || []);
        }
        setLoading(false);
    }, [assetId]);

    /** Create (or reuse) a component, then link it to the asset */
    const create = useCallback(
        async ({ model, manufacturer, description }) => {
            const m = (model || "").trim();
            const manu = (manufacturer || "").trim();
            const desc = (description || "").trim();

            if (!m) throw new Error("Model is required");

            // 1) Look up existing catalog row by model + manufacturer
            const { data: existing, error: lookupErr } = await supabase
                .from("components_catalog")
                .select("id")
                .eq("model", m)
                .eq("manufacturer", manu || null)
                .maybeSingle();

            if (lookupErr) throw lookupErr;

            let catalogId = existing?.id;

            // 2) If not found, insert into catalog
            if (!catalogId) {
                const { data: created, error: catErr } = await supabase
                    .from("components_catalog")
                    .insert([{ model: m, manufacturer: manu || null, description: desc }])
                    .select("id")
                    .single();

                if (catErr) throw catErr;
                catalogId = created.id;
            }

            // 3) Check if link already exists for this asset
            const { data: existingLink, error: linkCheckErr } = await supabase
                .from("asset_components")
                .select("id")
                .eq("asset_id", assetId)
                .eq("catalog_id", catalogId)
                .maybeSingle();

            if (linkCheckErr) throw linkCheckErr;

            // 4) Insert link if missing
            if (!existingLink) {
                const { error: linkErr } = await supabase.from("asset_components").insert([
                    {
                        asset_id: assetId,
                        catalog_id: catalogId,
                        model: m,
                        manufacturer: manu,
                        description: desc,
                    },
                ]);
                if (linkErr) throw linkErr;
            }

            await load();
        },
        [assetId, load]
    );

    /** Remove a component link from this asset */
    const remove = useCallback(
        async (id) => {
            const { error } = await supabase.from("asset_components").delete().eq("id", id);
            if (error) throw error;
            await load();
        },
        [load]
    );

    /** Search the global catalog by model/manufacturer */
    const searchCatalog = useCallback(async (q) => {
        if (!q?.trim()) return [];
        const { data, error } = await supabase
            .from("components_catalog")
            .select("id, model, manufacturer, description")
            .or(`model.ilike.%${q}%,manufacturer.ilike.%${q}%`)
            .order("created_at", { ascending: false })
            .limit(10);
        if (error) return [];
        return data || [];
    }, []);

    useEffect(() => {
        load();
    }, [load]);

    return { items, loading, error, load, create, remove, searchCatalog };
}
