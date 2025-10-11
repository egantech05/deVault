import { supabase } from "../lib/supabase";

export const fetchDocuments = (asset_id) =>
    supabase
        .from("asset_documents")
        .select("id, name, path, mime_type, size_bytes, created_at")
        .eq("asset_id", asset_id)
        .order("created_at", { ascending: false });

export const signDocUrl = (path, secs = 600) =>
    supabase.storage.from("asset-docs").createSignedUrl(path, secs);

export const deleteDoc = async (doc) => {
    const { error: delObjErr } = await supabase.storage.from("asset-docs").remove([doc.path]);
    if (delObjErr) throw delObjErr;
    return supabase.from("asset_documents").delete().eq("id", doc.id);
};
