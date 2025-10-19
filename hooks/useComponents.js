import { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useDatabase } from "../contexts/DatabaseContext";

export function useComponents(assetId) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { activeDatabaseId, openCreateModal } = useDatabase();

  const load = useCallback(async () => {
    if (!assetId || !activeDatabaseId) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: fetchError } = await supabase
      .from("asset_components")
      .select(`
        id,
        asset_id,
        catalog_id,
        model,
        manufacturer,
        description,
        created_at
      `)
      .eq("asset_id", assetId)
      .eq("database_id", activeDatabaseId)
      .order("created_at", { ascending: false });

    if (fetchError) {
      setError(fetchError);
      setItems([]);
    } else {
      setItems(data ?? []);
    }
    setLoading(false);
  }, [assetId, activeDatabaseId]);

  const create = useCallback(
    async ({ catalog_id, model, manufacturer, description }) => {
      if (!activeDatabaseId) {
        openCreateModal();
        throw new Error("Select a database before adding components.");
      }

      // Two modes:
      // 1) Link an existing catalog row (catalog_id provided)
      // 2) Create or reuse by model/manufacturer

      let catalogId = catalog_id;
      let trimmedModel = (model || "").trim();
      let trimmedManufacturer = (manufacturer || "").trim();
      let trimmedDescription = (description || "").trim();

      if (catalogId) {
        // Fetch the catalog row for display fields; also validates DB ownership
        const { data: row, error: catErr } = await supabase
          .from("components_catalog")
          .select("id, database_id, model, manufacturer, description")
          .eq("id", catalogId)
          .maybeSingle();
        if (catErr) throw catErr;
        if (!row) throw new Error("Selected component not found");
        if (row.database_id !== activeDatabaseId) {
          throw new Error("Selected component belongs to a different database.");
        }
        trimmedModel = (row.model || "").trim();
        trimmedManufacturer = (row.manufacturer || "").trim();
        trimmedDescription = (row.description || "").trim();
      } else {
        if (!trimmedModel) throw new Error("Model is required");

        const { data: existing, error: lookupErr } = await supabase
          .from("components_catalog")
          .select("id")
          .eq("database_id", activeDatabaseId)
          .eq("model", trimmedModel)
          .eq("manufacturer", trimmedManufacturer || null)
          .maybeSingle();
        if (lookupErr) throw lookupErr;

        catalogId = existing?.id;

        if (!catalogId) {
          const { data: created, error: catalogErr } = await supabase
            .from("components_catalog")
            .insert([{
              database_id: activeDatabaseId,
              model: trimmedModel,
              manufacturer: trimmedManufacturer || null,
              description: trimmedDescription || null,
            }])
            .select("id")
            .single();
          if (catalogErr) throw catalogErr;
          catalogId = created.id;
        }
      }

      const { data: existingLink, error: linkCheckErr } = await supabase
        .from("asset_components")
        .select("id")
        .eq("asset_id", assetId)
        .eq("catalog_id", catalogId)
        .eq("database_id", activeDatabaseId)
        .maybeSingle();
      if (linkCheckErr) throw linkCheckErr;

      if (!existingLink) {
        const { error: linkErr } = await supabase
          .from("asset_components")
          .insert([{
            database_id: activeDatabaseId,
            asset_id: assetId,
            catalog_id: catalogId,
            model: trimmedModel,
            manufacturer: trimmedManufacturer || null,
            description: trimmedDescription || null,
          }]);
        if (linkErr) throw linkErr;
      }

      await load();
    },
    [activeDatabaseId, assetId, openCreateModal, load]
  );

  const remove = useCallback(
    async (id) => {
      if (!activeDatabaseId) {
        openCreateModal();
        return;
      }
      const { error: deleteErr } = await supabase
        .from("asset_components")
        .delete()
        .eq("id", id)
        .eq("database_id", activeDatabaseId);
      if (deleteErr) throw deleteErr;
      await load();
    },
    [activeDatabaseId, openCreateModal, load]
  );

  const searchCatalog = useCallback(
    async (query) => {
      if (!activeDatabaseId || !query?.trim()) return [];
      const { data, error: searchErr } = await supabase
        .from("components_catalog")
        .select("id, model, manufacturer, description")
        .eq("database_id", activeDatabaseId)
        .or(`model.ilike.%${query}%,manufacturer.ilike.%${query}%`)
        .order("created_at", { ascending: false })
        .limit(10);
      return searchErr ? [] : data ?? [];
    },
    [activeDatabaseId]
  );

  useEffect(() => {
    load();
  }, [load]);

  return { items, loading, error, load, create, remove, searchCatalog };
}
