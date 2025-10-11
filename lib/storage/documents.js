import { supabase } from "../supabase";


// Uploads a File/Blob (web) or base64/fileUri (native) depending on your existing upload helpers.
// Returns { storage_path, size, mime }
export async function uploadDocumentToStorage({ bucket = "documents", path, file, contentType }) {
    // path example: `${userId}/${Date.now()}_${fileName}`
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { contentType, upsert: false });
    if (error) throw error;


    return {
        storage_path: `${bucket}/${data.path}`,
        size: file.size ?? null,
        mime: contentType ?? null,
    };
}


export function getPublicUrlForPath(storage_path) {
    const [bucket, ...rest] = storage_path.split("/");
    const relative = rest.join("/");
    const { data } = supabase.storage.from(bucket).getPublicUrl(relative);
    return data.publicUrl;
}