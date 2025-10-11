import { supabase } from "../supabase";


export async function createDocument({ name, storage_path, mime_type, size_bytes }) {
    const created_by = (await supabase.auth.getUser()).data.user?.id ?? null;
    const { data, error } = await supabase
        .from("documents")
        .insert([{ name, storage_path, mime_type, size_bytes, created_by }])
        .select()
        .single();
    if (error) throw error;
    return data;
}


export async function getDocumentById(id) {
    const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", id)
        .single();
    if (error) throw error;
    return data;
}