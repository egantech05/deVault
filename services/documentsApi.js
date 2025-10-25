import { supabase } from "../lib/supabase";

export const fetchDocuments = (databaseId, assetId) => {
  if (!databaseId || !assetId) {
    return Promise.resolve({ data: [], error: null });
  }
  return supabase
    .from("asset_documents")
    .select("id, name, path, mime_type, size_bytes, created_at")
    .eq("database_id", databaseId)
    .eq("asset_id", assetId)
    .order("created_at", { ascending: false });
};

export const signDocUrl = (path, secs = 600) =>
  supabase.storage.from("asset-docs").createSignedUrl(path, secs);

export const deleteDoc = async (databaseId, doc) => {
  const { error: delObjErr } = await supabase.storage
    .from("asset-docs")
    .remove([doc.path]);
  if (delObjErr) {
    const msg = delObjErr.message || "Storage delete failed";
    const isNotFound = /not\s*found|No such file/i.test(msg);
    if (!isNotFound) throw delObjErr;
  }

  return supabase
    .from("asset_documents")
    .delete()
    .eq("id", doc.id)
    .eq("database_id", databaseId);
};
