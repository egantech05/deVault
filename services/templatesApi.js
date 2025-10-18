// services/templatesApi.js
import { supabase } from '../lib/supabase';
import { TEMPLATE_KINDS } from './templateKinds';

const castDefaultByType = (type, v) => {
    if (v == null || v === '') return null;
    if (type === 'number') {
        const n = Number(v);
        return Number.isFinite(n) ? n : null;
    }
    if (type === 'date') return String(v);
    return String(v);
};

export async function listTemplates(kind, databaseId) {
    if (!databaseId) return [];
    const cfg = TEMPLATE_KINDS[kind];
    const { data, error } = await supabase
        .from(cfg.templatesTable)
        .select(`id, name, ${cfg.relation}(count)`)
        .eq('database_id', databaseId)
        .order('name', { ascending: true });

    if (error) throw error;

    return (data || []).map(t => ({
        id: t.id,
        name: t.name,
        [cfg.countAlias]: t[cfg.relation]?.[0]?.count ?? 0,
    }));
}

export async function getTemplateFields(kind, templateId) {
    const cfg = TEMPLATE_KINDS[kind];
    const { data, error } = await supabase
        .from(cfg.fieldsTable)
        .select('id, property_name, property_type, default_value, display_order, is_active')
        .eq('template_id', templateId)
        .order('display_order', { ascending: true });

    if (error) throw error;

    return (data || []).map(r => ({
        id: r.id,
        name: r.property_name || '',
        property_type: r.property_type || 'text',
        default_value: r.default_value ?? '',
        is_active: r.is_active ?? true,
    }));
}

export async function createTemplate(kind, { databaseId, name, properties }) {
    const cfg = TEMPLATE_KINDS[kind];

    const { data: tpl, error: tplError } = await supabase
        .from(cfg.templatesTable)
        .insert([{ name, database_id: databaseId }])
        .select('id')
        .single();
    if (tplError) throw tplError;

    const rows = (properties || [])
        .map((p, idx) => ({
            template_id: tpl.id,
            property_name: (p.name || '').trim(),
            property_type: p.property_type || 'text',
            default_value: castDefaultByType(p.property_type, p.default_value),
            display_order: idx,
        }))
        .filter(r => r.property_name);

    if (rows.length) {
        const { error: fieldsErr } = await supabase.from(cfg.fieldsTable).insert(rows);
        if (fieldsErr) throw fieldsErr;
    }
    return tpl.id;
}

export async function updateTemplateName(kind, id, name, databaseId) {
    const cfg = TEMPLATE_KINDS[kind];
    const { error } = await supabase
        .from(cfg.templatesTable)
        .update({ name })
        .eq('id', id)
        .eq('database_id', databaseId);
    if (error) throw error;
}

export async function upsertTemplateFields(kind, { templateId, updates, inserts }) {
    const cfg = TEMPLATE_KINDS[kind];

    if (updates?.length) {
        await Promise.all(
            updates.map(u =>
                supabase
                    .from(cfg.fieldsTable)
                    .update({
                        property_name: u.property_name,
                        property_type: u.property_type,
                        default_value: castDefaultByType(u.property_type, u.default_value),
                        display_order: u.display_order,
                    })
                    .eq('id', u.rawId)
            )
        );
    }

    if (inserts?.length) {
        const rows = inserts.map(i => ({
            template_id: templateId,
            property_name: i.property_name,
            property_type: i.property_type,
            default_value: castDefaultByType(i.property_type, i.default_value),
            display_order: i.display_order,
        }));
        const { error } = await supabase.from(cfg.fieldsTable).insert(rows);
        if (error) throw error;
    }
}

export async function archiveFields(kind, ids) {
    const cfg = TEMPLATE_KINDS[kind];
    if (!ids?.length) return;
    const { error } = await supabase
        .from(cfg.fieldsTable)
        .update({ is_active: false })
        .in('id', ids);
    if (error) throw error;
}

export async function deleteTemplate(kind, id, databaseId) {
    const cfg = TEMPLATE_KINDS[kind];
    const { error } = await supabase
        .from(cfg.templatesTable)
        .delete()
        .eq('id', id)
        .eq('database_id', databaseId);
    if (error) throw error;
}
