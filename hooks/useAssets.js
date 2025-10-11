import { useCallback, useEffect, useState } from "react";
import {
    fetchAssets, fetchAssetFirstValues,
    createAsset as apiCreateAsset,
    upsertAssetPropValues, deleteAssetById, fetchTemplateProps
} from "../services/assetsApi";

export function useAssets() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);

    const load = useCallback(async () => {
        setLoading(true);
        const { data: a, error } = await fetchAssets();
        if (error) { setItems([]); setLoading(false); return; }

        const ids = (a || []).map(x => x.id);
        const firstValByAsset = {};
        if (ids.length) {
            const { data: vals, error: vErr } = await fetchAssetFirstValues(ids);
            if (!vErr && vals) {
                for (const row of vals) {
                    if (row.template_properties?.is_active === false) continue;
                    const order = row.template_properties?.display_order ?? 999999;
                    const val = (row.value ?? '').toString().trim();
                    const cur = firstValByAsset[row.asset_id];
                    if (!cur || order < cur.order || (!cur.value && val)) {
                        firstValByAsset[row.asset_id] = { order, value: val };
                    }
                }
            }
        }

        const cards = (a || []).map(r => ({
            id: r.id,
            templateId: r.template_id,
            templateName: r.asset_templates?.name || "—",
            firstProp: firstValByAsset[r.id]?.value || "—",
            displayName: firstValByAsset[r.id]?.value || "—",
        }));

        setItems(cards);
        setLoading(false);
    }, []);

    useEffect(() => { load(); }, [load]);

    const createAsset = useCallback(async (template_id, propInputs = []) => {
        const { data, error } = await apiCreateAsset(template_id);
        if (error) throw error;
        const assetId = data?.id;

        if (assetId && propInputs.length) {
            const rows = propInputs.map(p => ({
                asset_id: assetId,
                property_id: p.property_id,
                value: p.value === "" ? null : p.value
            }));
            await upsertAssetPropValues(rows);
        }
        await load();
    }, [load]);

    const removeAsset = useCallback(async (id) => {
        await deleteAssetById(id);
        await load();
    }, [load]);

    return { items, loading, load, createAsset, removeAsset };
}

export function useTemplateProps(templateId) {
    const [props, setProps] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let active = true;
        (async () => {
            if (!templateId) { setProps([]); return; }
            setLoading(true);
            const { data } = await fetchTemplateProps(templateId);
            if (!active) return;
            setProps((data || []).map(p => ({
                property_id: p.id,
                name: p.property_name,
                type: p.property_type || "text",
                value: p.default_value ?? ""
            })));
            setLoading(false);
        })();
        return () => { active = false; };
    }, [templateId]);

    return { props, loading, setProps };
}
