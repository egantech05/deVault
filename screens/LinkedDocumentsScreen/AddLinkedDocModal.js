// screens/LinkedDocumentsScreen/AddLinkedDocModal.js
import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Modal, View, Text, Pressable, ScrollView, ActivityIndicator, Platform, Alert, TextInput } from "react-native";
import { supabase } from "../../lib/supabase";
import { useCreateLinkedDoc } from "../../hooks/useLinkedDocuments";
import { usePropertyValuesSuggestions } from "../../hooks/usePropertyValuesSuggestions";

/* =========================
   Small helpers / UI atoms
   ========================= */
const DOCS_BUCKET = "linkedDocs"; // <-- match your bucket exactly (case-sensitive)

const FieldLabel = ({ children, style }) => (
    <Text style={[{ fontSize: 12, color: "#6b7280", marginBottom: 6 }, style]}>{children}</Text>
);

const Box = ({ children, style }) => (
    <View style={[{ borderWidth: 1, borderColor: "#ddd", borderRadius: 10, backgroundColor: "#fff" }, style]}>{children}</View>
);

/** Generic autocomplete input with dropdown below */
function AutocompleteInput({
    value,
    onChangeText,
    placeholder,
    loading = false,
    options = [],       // array of items
    getKey = (x) => x.id ?? x,
    getLabel = (x) => x.name ?? String(x),
    onPick,             // (item) => void
    disabled = false,
}) {
    const [open, setOpen] = useState(false);
    const inputRef = useRef(null);

    // close list shortly after blur so option onPress can run first
    const scheduleClose = () => setTimeout(() => setOpen(false), 120);

    return (
        <View style={{ marginBottom: 12 }}>
            <Box>
                <TextInput
                    ref={inputRef}
                    value={value}
                    onChangeText={(t) => { onChangeText?.(t); setOpen(true); }}
                    onFocus={() => setOpen(true)}
                    onBlur={scheduleClose}
                    placeholder={loading ? "Loading…" : placeholder}
                    editable={!disabled}
                    style={{ paddingVertical: 10, paddingHorizontal: 12 }}
                />
            </Box>

            {/* dropdown */}
            {open && !disabled && (
                <View
                    style={{
                        borderWidth: 1,
                        borderColor: "#ddd",
                        borderRadius: 10,
                        marginTop: 6,
                        maxHeight: 240,
                        overflow: "hidden",
                        backgroundColor: "white",
                    }}
                >
                    {loading ? (
                        <View style={{ padding: 12 }}>
                            <ActivityIndicator />
                        </View>
                    ) : options.length === 0 ? (
                        <View style={{ padding: 12 }}>
                            <Text style={{ color: "#888" }}>No results.</Text>
                        </View>
                    ) : (
                        <ScrollView style={{ maxHeight: 240 }}>
                            {options.map((it) => (
                                <Pressable
                                    key={getKey(it)}
                                    onPress={() => {
                                        onPick?.(it);
                                        setOpen(false);
                                    }}
                                    {...(Platform.OS === "web" ? { onClick: () => { onPick?.(it); setOpen(false); } } : {})}
                                    style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: "#f1f1f1" }}
                                >
                                    <Text style={{ fontWeight: "600" }}>{getLabel(it)}</Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    )}
                </View>
            )}
        </View>
    );
}

/* =========================
   Main Modal
   ========================= */
export default function AddLinkedDocModal({ visible, onClose, onCreated }) {
    // document row (created/selected)
    const [doc, setDoc] = useState(null);
    const [uploadingDoc, setUploadingDoc] = useState(false);
    const webFileRef = useRef(null);

    // cascade selections
    const [templateId, setTemplateId] = useState("");
    const [templateQuery, setTemplateQuery] = useState("");

    const [propertyId, setPropertyId] = useState("");
    const [propertyQuery, setPropertyQuery] = useState("");

    const [valueRaw, setValueRaw] = useState("");
    const [valueQuery, setValueQuery] = useState("");

    // datasets
    const [templates, setTemplates] = useState([]);
    const [properties, setProperties] = useState([]);
    const [loadingTpl, setLoadingTpl] = useState(false);
    const [loadingProps, setLoadingProps] = useState(false);

    // value suggestions
    const { values: allValueSuggestions, loading: loadingVals } = usePropertyValuesSuggestions({
        template_id: templateId,
        property_id: propertyId,
        query: valueQuery,
    });

    const valueOptions = useMemo(() => {
        const q = (valueQuery || "").toLowerCase().trim();
        const base = allValueSuggestions || [];
        if (!q) return base.slice(0, 50).map((v) => ({ id: v, label: v }));
        return base
            .filter((v) => v.toLowerCase().includes(q))
            .slice(0, 50)
            .map((v) => ({ id: v, label: v }));
    }, [allValueSuggestions, valueQuery]);

    const { saving, create } = useCreateLinkedDoc(onCreated);

    const canConfirm = useMemo(
        () => !!doc && !!templateId && !!propertyId && valueRaw.trim().length > 0,
        [doc, templateId, propertyId, valueRaw]
    );

    /* ----- Effects ----- */

    // when opening, load all templates
    useEffect(() => {
        if (!visible) return;
        (async () => {
            setLoadingTpl(true);
            const { data, error } = await supabase.from("asset_templates").select("id, name").order("name");
            setLoadingTpl(false);
            if (!error) setTemplates(data ?? []);
        })();
    }, [visible]);

    // when template chosen or query typed, compute filtered template options
    const templateOptions = useMemo(() => {
        const q = templateQuery.toLowerCase().trim();
        const base = templates || [];
        const list = q ? base.filter((t) => (t.name || "").toLowerCase().includes(q) || t.id.includes(q)) : base;
        return list.slice(0, 50);
    }, [templates, templateQuery]);

    // load properties for selected template
    useEffect(() => {
        if (!templateId) {
            setProperties([]);
            setPropertyId("");
            setPropertyQuery("");
            setValueRaw("");
            setValueQuery("");
            return;
        }
        (async () => {
            setLoadingProps(true);
            const { data, error } = await supabase
                .from("template_properties")
                .select("id, property_name, property_type, display_order")
                .eq("template_id", templateId)
                .order("display_order", { ascending: true });
            setLoadingProps(false);
            if (!error) setProperties(data ?? []);
        })();
    }, [templateId]);

    const propertyOptions = useMemo(() => {
        const q = propertyQuery.toLowerCase().trim();
        const base = properties || [];
        const list = q
            ? base.filter(
                (p) => (p.property_name || "").toLowerCase().includes(q) || (p.id || "").toLowerCase().includes(q)
            )
            : base;
        return list.slice(0, 80);
    }, [properties, propertyQuery]);

    /* ----- Handlers ----- */

    const resetAndClose = useCallback(() => {
        setDoc(null);
        setTemplateId(""); setTemplateQuery("");
        setPropertyId(""); setPropertyQuery("");
        setValueRaw(""); setValueQuery("");
        setUploadingDoc(false);
        onClose?.();
    }, [onClose]);

    const handleConfirm = useCallback(async () => {
        if (!canConfirm) return;
        await create({
            docSource: doc, // has id from upload/selection
            template_id: templateId,
            property_id: propertyId,
            value_raw: valueRaw,
        });
    }, [canConfirm, create, doc, templateId, propertyId, valueRaw]);

    // Upload (web)
    const handlePickWeb = useCallback(async (e) => {
        try {
            const file = e?.target?.files?.[0];
            if (!file) return;
            e.target.value = ""; // reset

            setUploadingDoc(true);
            const safe = (file.name || "document").replace(/\s+/g, "_");
            const objectKey = `${Date.now()}-${safe}`;

            const { error: upErr } = await supabase.storage.from(DOCS_BUCKET).upload(objectKey, file, {
                contentType: file.type || "application/octet-stream",
                upsert: false,
            });
            if (upErr) throw upErr;

            const { data, error: insErr } = await supabase
                .from("documents")
                .insert([
                    {
                        name: file.name || safe,
                        storage_path: `${DOCS_BUCKET}/${objectKey}`,
                        mime_type: file.type || "application/octet-stream",
                        size_bytes: file.size ?? null,
                    },
                ])
                .select()
                .single();
            if (insErr) throw insErr;

            setDoc(data);
        } catch (err) {
            console.error("upload document error", err);
            Alert.alert("Upload failed", err.message || "Could not upload document.");
        } finally {
            setUploadingDoc(false);
        }
    }, []);

    /* ----- UI ----- */

    return (
        <Modal visible={visible} transparent animationType="fade" onRequestClose={resetAndClose}>
            <View style={{ flex: 1, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}>
                <View style={{ width: 720, maxWidth: "95%", backgroundColor: "white", borderRadius: 20, padding: 22 }}>
                    <Text style={{ fontSize: 22, fontWeight: "800", marginBottom: 16 }}>Add Linked Document</Text>

                    {/* Hidden file input (web) */}
                    {Platform.OS === "web" && (
                        <input type="file" style={{ display: "none" }} onChange={handlePickWeb} id="ld-file-input" />
                    )}

                    {/* Document */}
                    <FieldLabel>Document</FieldLabel>
                    <Pressable
                        onPress={() => {
                            if (Platform.OS === "web") document.getElementById("ld-file-input")?.click();
                            else Alert.alert("Upload on device", "Hook up native DocumentPicker when needed.");
                        }}
                        style={{
                            borderWidth: 1, borderColor: "#eee", borderRadius: 12, padding: 14, marginBottom: 14, backgroundColor: "#f8f8f8",
                        }}
                    >
                        <Text style={{ fontWeight: "600" }}>
                            {uploadingDoc ? "Uploading…" : (doc?.name || "Click to upload a document")}
                        </Text>
                        {!!doc?.storage_path && (
                            <Text style={{ color: "#888", marginTop: 4, fontSize: 12 }}>{doc.storage_path}</Text>
                        )}
                    </Pressable>

                    {/* Template autocomplete */}
                    <FieldLabel>Template</FieldLabel>
                    <AutocompleteInput
                        value={templateId ? (templates.find((t) => t.id === templateId)?.name ?? templateId) : templateQuery}
                        onChangeText={(t) => { setTemplateQuery(t); setTemplateId(""); }}
                        placeholder={loadingTpl ? "Loading…" : "Type to search templates"}
                        loading={loadingTpl}
                        options={templateOptions}
                        getKey={(t) => t.id}
                        getLabel={(t) => `${t.name}`}
                        onPick={(t) => {
                            setTemplateId(t.id);
                            setTemplateQuery(t.name);
                            // reset dependents
                            setPropertyId(""); setPropertyQuery("");
                            setValueRaw(""); setValueQuery("");
                        }}
                    />

                    {/* Property autocomplete (visible after template) */}
                    {templateId ? (
                        <>
                            <FieldLabel>Property</FieldLabel>
                            <AutocompleteInput
                                value={propertyId ? (properties.find((p) => p.id === propertyId)?.property_name ?? propertyId) : propertyQuery}
                                onChangeText={(t) => { setPropertyQuery(t); setPropertyId(""); }}
                                placeholder={loadingProps ? "Loading…" : "Type to search properties"}
                                loading={loadingProps}
                                options={propertyOptions}
                                getKey={(p) => p.id}
                                getLabel={(p) => `${p.property_name}`}
                                onPick={(p) => {
                                    setPropertyId(p.id);
                                    setPropertyQuery(p.property_name);
                                    setValueRaw(""); setValueQuery("");
                                }}
                            />
                        </>
                    ) : null}

                    {/* Value autocomplete (visible after property) */}
                    {propertyId ? (
                        <>
                            <FieldLabel>Value</FieldLabel>
                            <AutocompleteInput
                                value={valueRaw || valueQuery}
                                onChangeText={(t) => { setValueQuery(t); setValueRaw(""); }}
                                placeholder={loadingVals ? "Loading…" : "Type to search values (or pick below)"}
                                loading={loadingVals}
                                options={valueOptions}
                                getKey={(v) => v.id}
                                getLabel={(v) => v.label}
                                onPick={(v) => {
                                    setValueRaw(v.label);
                                    setValueQuery(v.label);
                                }}
                            />
                        </>
                    ) : null}

                    {/* Footer */}
                    <View style={{ flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 6 }}>
                        <Pressable onPress={resetAndClose} style={{ paddingVertical: 10, paddingHorizontal: 14 }}>
                            <Text style={{ color: "#374151", fontWeight: "700" }}>Cancel</Text>
                        </Pressable>
                        <Pressable
                            disabled={!canConfirm || saving}
                            onPress={handleConfirm}
                            {...(Platform.OS === "web" ? { onClick: handleConfirm } : {})}
                            style={{
                                backgroundColor: canConfirm ? "#2e7d32" : "#bbb",
                                paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10,
                                opacity: saving ? 0.8 : 1,
                            }}
                        >
                            <Text style={{ color: "white", fontWeight: "800" }}>{saving ? "Saving…" : "Confirm"}</Text>
                        </Pressable>
                    </View>
                </View>
            </View>
        </Modal>
    );
}
