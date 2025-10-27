import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, Pressable, Platform, Alert, Linking } from "react-native";
import { supabase } from "../../../lib/supabase";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system";
import { decode } from "base64-arraybuffer";
import { Ionicons } from "@expo/vector-icons";
import { useDatabase } from "../../../contexts/DatabaseContext";
import ModalSmall from "../../../components/ModalSmall";

function splitStoragePath(storage_path) {
  if (!storage_path) return { bucket: "", path: "" };
  const [bucket, ...rest] = storage_path.split("/");
  return { bucket, path: rest.join("/") };
}

export default function DocsTab({ asset, styles, colors }) {
  const { activeDatabaseId, openCreateModal, canDelete } = useDatabase();

  const [docs, setDocs] = useState([]);
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [linkedDocs, setLinkedDocs] = useState([]);
  const [loadingLinked, setLoadingLinked] = useState(false);

  const webFileInputRef = useRef(null);
  const [pendingDeleteDoc, setPendingDeleteDoc] = useState(null);
  const [deletingDoc, setDeletingDoc] = useState(false);
  const modalStyles = ModalSmall.styles;

  const loadDocuments = useCallback(
    async (assetId) => {
      if (!assetId || !activeDatabaseId) {
        setDocs([]);
        return;
      }
      setLoadingDocs(true);
      const { data, error } = await supabase
        .from("asset_documents")
        .select("id, name, path, mime_type, size_bytes, created_at")
        .eq("database_id", activeDatabaseId)
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("loadDocuments error:", error);
        setDocs([]);
      } else {
        setDocs(data || []);
      }
      setLoadingDocs(false);
    },
    [activeDatabaseId]
  );

  const loadLinkedDocuments = useCallback(
    async (assetId) => {
      if (!assetId || !activeDatabaseId) {
        setLinkedDocs([]);
        return;
      }
      setLoadingLinked(true);
      const { data, error } = await supabase
        .from("v_linked_documents_for_asset")
        .select(
          "document_id, document_name, storage_path, mime_type, size_bytes, rule_created_at, template_id, property_id, value_raw"
        )
        .eq("database_id", activeDatabaseId)
        .eq("asset_id", assetId)
        .order("rule_created_at", { ascending: false });

      if (error) {
        console.error("loadLinkedDocuments error:", error);
        setLinkedDocs([]);
      } else {
        setLinkedDocs(data || []);
      }
      setLoadingLinked(false);
    },
    [activeDatabaseId]
  );

  useEffect(() => {
    if (!asset?.id) {
      setDocs([]);
      setLinkedDocs([]);
      return;
    }
    loadDocuments(asset.id);
    loadLinkedDocuments(asset.id);
  }, [asset?.id, loadDocuments, loadLinkedDocuments]);

  const ensureDatabaseSelected = () => {
    if (!activeDatabaseId) {
      openCreateModal();
      return false;
    }
    return true;
  };

  const openAddDocument = async () => {
    if (!asset?.id) {
      Alert.alert("Open an asset", "Select an asset to attach the document to.");
      return;
    }
    if (!ensureDatabaseSelected()) return;

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
    if (!ensureDatabaseSelected()) return;

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
            database_id: activeDatabaseId,
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

  const openLinkedDocument = useCallback(async (ld) => {
    try {
      const { bucket, path } = splitStoragePath(ld.storage_path);
      if (!bucket || !path) throw new Error("Invalid storage_path");
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 10);
      if (error) throw error;
      const url = data?.signedUrl;
      if (url) Linking.openURL(url);
    } catch (e) {
      console.error("openLinkedDocument error:", e);
      Alert.alert("Error", "Could not open linked document.");
    }
  }, []);

  const requestDeleteDocument = (doc) => {
    if (!canDelete) {
      Alert.alert("Permission", "Only admins can delete documents.");
      return;
    }
    setPendingDeleteDoc(doc);
  };

  const performDeleteDocument = async () => {
    if (!pendingDeleteDoc) return;
    if (!canDelete) {
      Alert.alert("Permission", "Only admins can delete documents.");
      setPendingDeleteDoc(null);
      return;
    }
    if (!ensureDatabaseSelected()) {
      setPendingDeleteDoc(null);
      return;
    }

    const doc = pendingDeleteDoc;
    setDeletingDoc(true);
    try {
      const { error: delObjErr } = await supabase.storage
        .from("asset-docs")
        .remove([doc.path]);
      if (delObjErr) {
        const msg = delObjErr.message || "Storage delete failed";
        const isNotFound = /not\s*found|No such file/i.test(msg);
        if (!isNotFound) throw delObjErr;
      }

      const { error: delRowErr } = await supabase
        .from("asset_documents")
        .delete()
        .eq("id", doc.id)
        .eq("database_id", activeDatabaseId);
      if (delRowErr) throw delRowErr;

      setDocs((prev) => prev.filter((d) => d.id !== doc.id));
      Alert.alert("Deleted", "Document removed.");
      setPendingDeleteDoc(null);
    } catch (e) {
      console.error("deleteDocument error:", e);
      Alert.alert("Error", e.message || "Failed to delete document.");
    } finally {
      setDeletingDoc(false);
    }
  };

  return (
    <View style={{ paddingTop: 4 }}>
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
          <Text style={styles.primaryChipText}>
            {uploading ? "Uploading…" : "Add Document"}
          </Text>
        </Pressable>
      </View>

      {loadingDocs ? (
        <Text style={{ color: "#666", marginTop: 8 }}>Loading documents…</Text>
      ) : docs.length === 0 ? (
        <Text style={{ color: "#888", marginTop: 8 }}>No documents yet.</Text>
      ) : (
        docs.map((doc) => (
          <Pressable
            key={doc.id}
            onPress={() => openDocument(doc)}
            style={styles.docRow}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>{doc.name}</Text>
              <Text style={styles.docMeta}>{doc.mime_type || ""}</Text>
            </View>
            {canDelete ? (
              <Pressable onPress={() => requestDeleteDocument(doc)} style={styles.docDeleteButton}>
                <Ionicons name="trash-outline" size={18} color="#ff5555" />
              </Pressable>
            ) : null}
         </Pressable>
       ))
      )}

      <View style={[styles.docsHeaderRow, { marginTop: 24 }]}>
        <Text style={[styles.label, { marginBottom: 0 }]}>Linked Documents</Text>
      </View>

      {loadingLinked ? (
        <Text style={{ color: "#666", marginTop: 8 }}>Loading linked documents…</Text>
      ) : linkedDocs.length === 0 ? (
        <Text style={{ color: "#888", marginTop: 8 }}>No linked documents yet.</Text>
      ) : (
        linkedDocs.map((ld) => (
          <Pressable
            key={`${ld.document_id}-${ld.template_id}-${ld.property_id}-${ld.value_raw}`}
            onPress={() => openLinkedDocument(ld)}
            style={styles.docRow}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.docName}>{ld.document_name || "Document"}</Text>
              <Text style={styles.docMeta}>
                {(ld.mime_type || "").toUpperCase()} • {ld.value_raw || "-"}
              </Text>
            </View>
            <Ionicons name="open-outline" size={18} color={colors.brand} />
          </Pressable>
        ))
      )}

      <ModalSmall
        visible={!!pendingDeleteDoc}
        onRequestClose={() => !deletingDoc && setPendingDeleteDoc(null)}
        animationType="fade"
      >
        <ModalSmall.Title>Delete Document</ModalSmall.Title>
        <ModalSmall.Subtitle>
          {pendingDeleteDoc ? `Delete "${pendingDeleteDoc.name}"?` : "Delete this document?"}
        </ModalSmall.Subtitle>
        <ModalSmall.Footer>
          <Pressable
            onPress={() => setPendingDeleteDoc(null)}
            disabled={deletingDoc}
            style={modalStyles.cancelButton}
          >
            <Text style={modalStyles.cancelText}>Cancel</Text>
          </Pressable>
          <Pressable
            onPress={performDeleteDocument}
            disabled={deletingDoc}
            style={[
              modalStyles.primaryButton,
              { backgroundColor: "#dc2626" },
              deletingDoc && modalStyles.primaryButtonDisabled,
            ]}
          >
            <Text style={modalStyles.primaryButtonText}>
              {deletingDoc ? "Deleting…" : "Delete"}
            </Text>
          </Pressable>
        </ModalSmall.Footer>
      </ModalSmall>
    </View>
  );
}
