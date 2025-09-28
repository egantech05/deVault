import React, { useEffect, useRef, useState } from "react";
import { View, Text, Pressable, Platform, Alert } from "react-native";
import { supabase } from "../../../lib/supabase";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { Linking } from "react-native";
import { decode } from "base64-arraybuffer";
import { Ionicons } from "@expo/vector-icons";

export default function DocsTab({ asset, styles, colors }) {
    const [docs, setDocs] = useState([]);
    const [loadingDocs, setLoadingDocs] = useState(false);
    const [uploading, setUploading] = useState(false);
    const webFileInputRef = useRef(null);

    useEffect(() => {
        if (!asset?.id) return;
        loadDocuments(asset.id);
    }, [asset?.id]);

    const loadDocuments = async (assetId) => {
        if (!assetId) return;
        setLoadingDocs(true);
        const { data, error } = await supabase
            .from("asset_documents")
            .select("id, name, path, mime_type, size_bytes, created_at")
            .eq("asset_id", assetId)
            .order("created_at", { ascending: false });

        if (error) {
            console.error("loadDocuments error:", error);
            setDocs([]);
        } else {
            setDocs(data || []);
        }
        setLoadingDocs(false);
    };

    const openAddDocument = async () => {
        if (!asset?.id) {
            Alert.alert("Open an asset", "Select an asset to attach the document to.");
            return;
        }
        if (Platform.OS === "web") {
            webFileInputRef.current?.click?.();
            return;
        }

        const res = await DocumentPicker.getDocumentAsync({
            copyToCacheDirectory: true,
            multiple: false,
        });

        if (res.canceled) return;
        const file = res.assets?.[0];
        if (!file) return;

        await uploadPickedFile(file);
    };

    const handleWebFileChange = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        e.target.value = "";
        await uploadPickedFile({
            name: file.name,
            mimeType: file.type,
            size: file.size,
            uri: URL.createObjectURL(file),
            _webFile: file,
        });
    };

    const uploadPickedFile = async (file) => {
        try {
            setUploading(true);

            const ts = Date.now();
            const safeName = (file.name || "document").replace(/\s+/g, "_");
            const objectKey = `${asset.id}/${ts}-${safeName}`;

            let body;
            let contentType = file.mimeType || file.type || "application/octet-stream";

            if (Platform.OS === "web") {
                body = file._webFile;
            } else {
                const b64 = await FileSystem.readAsStringAsync(file.uri, {
                    encoding: FileSystem.EncodingType.Base64,
                });
                const ab = decode(b64);
                body = new Uint8Array(ab);
            }

            const { error: upErr } = await supabase.storage
                .from("asset-docs")
                .upload(objectKey, body, {
                    contentType,
                    upsert: false,
                    cacheControl: "3600",
                });
            if (upErr) {
                console.error("storage.upload error:", upErr);
                Alert.alert("Upload failed", upErr.message || "Storage error");
                return;
            }

            const { error: insErr } = await supabase
                .from("asset_documents")
                .insert([
                    {
                        asset_id: asset.id,
                        name: file.name || safeName,
                        path: objectKey,
                        mime_type: contentType,
                        size_bytes: file.size ?? null,
                    },
                ]);
            if (insErr) {
                console.error("asset_documents insert error:", insErr);
                Alert.alert("Error", insErr.message || "DB insert failed");
                return;
            }

            await loadDocuments(asset.id);
            Alert.alert("Uploaded", "Document added.");
        } catch (e) {
            console.error("uploadPickedFile exception:", e);
            Alert.alert("Error", e.message || "Failed to upload document.");
        } finally {
            setUploading(false);
        }
    };

    const openDocument = async (doc) => {
        try {
            const { data, error } = await supabase.storage
                .from("asset-docs")
                .createSignedUrl(doc.path, 60 * 10);
            if (error) throw error;
            const url = data?.signedUrl;
            if (url) Linking.openURL(url);
        } catch (e) {
            console.error("openDocument error:", e);
            Alert.alert("Error", "Could not open document.");
        }
    };

    const deleteDocument = async (doc) => {
        const doDelete = async () => {
            try {
                const { error: delObjErr } = await supabase.storage.from("asset-docs").remove([doc.path]);
                if (delObjErr) throw delObjErr;

                const { error: delRowErr } = await supabase.from("asset_documents").delete().eq("id", doc.id);
                if (delRowErr) throw delRowErr;

                setDocs((prev) => prev.filter((d) => d.id !== doc.id));
                Alert.alert("Deleted", "Document removed.");
            } catch (e) {
                console.error("deleteDocument error:", e);
                Alert.alert("Error", e.message || "Failed to delete document.");
            }
        };

        if (Platform.OS === "web") {
            if (window.confirm(`Delete "${doc.name}"?`)) await doDelete();
        } else {
            Alert.alert("Delete Document", `Delete "${doc.name}"?`, [
                { text: "Cancel", style: "cancel" },
                { text: "Delete", style: "destructive", onPress: doDelete },
            ]);
        }
    };

    return (
        <View style={{ paddingTop: 4 }}>
            {/* Hidden input for web */}
            {Platform.OS === "web" && (
                <input
                    ref={webFileInputRef}
                    type="file"
                    style={{ display: "none" }}
                    onChange={handleWebFileChange}
                />
            )}

            <View style={styles.docsHeaderRow}>
                <Text style={[styles.label, { marginBottom: 0 }]}>Documents</Text>
                <Pressable
                    style={[styles.primaryChip, uploading && { opacity: 0.6 }]}
                    disabled={uploading}
                    onPress={openAddDocument}
                >
                    <Ionicons name="add" size={16} color="white" />
                    <Text style={styles.primaryChipText}>{uploading ? "Uploading…" : "Add Document"}</Text>
                </Pressable>
            </View>

            {loadingDocs ? (
                <Text style={{ color: "#666", marginTop: 8 }}>Loading…</Text>
            ) : docs.length === 0 ? (
                <Text style={{ color: "#888", marginTop: 8 }}>No documents yet.</Text>
            ) : (
                <View style={{ marginTop: 12 }}>
                    {docs.map((d) => (
                        <View key={d.id} style={styles.docRow}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.docName} numberOfLines={1}>
                                    {d.name}
                                </Text>
                                <Text style={styles.docMeta}>
                                    {(d.mime_type || "file")} • {new Date(d.created_at).toLocaleString()}
                                    {d.size_bytes ? ` • ${(Number(d.size_bytes) / 1024).toFixed(0)} KB` : ""}
                                </Text>
                            </View>

                            <View style={styles.docActions}>
                                <Pressable style={styles.docActionBtn} onPress={() => openDocument(d)}>
                                    <Text style={styles.docActionText}>Open</Text>
                                </Pressable>
                                <Pressable
                                    style={[styles.docActionBtn, { borderColor: "#ff4444" }]}
                                    onPress={() => deleteDocument(d)}
                                >
                                    <Text style={[styles.docActionText, { color: "#ff4444" }]}>Delete</Text>
                                </Pressable>
                            </View>
                        </View>
                    ))}
                </View>
            )}
        </View>
    );
}
