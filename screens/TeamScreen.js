import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ActivityIndicator,
  Pressable,
  Alert,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";

import { commonStyles } from "../components/Styles";
import DashedRowButton from "../components/DashedRowButton";
import { supabase } from "../lib/supabase";
import { useDatabase } from "../contexts/DatabaseContext";
import { useAuth } from "../contexts/AuthContext";

const rowBaseStyle = {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  borderWidth: 1,
  borderColor: "#eee",
  borderRadius: 12,
  paddingVertical: 10,
  paddingHorizontal: 14,
  marginVertical: 6,
  backgroundColor: "#fafafa",
};

const rowShadowStyle = Platform.select({
  web: {
    boxShadow: "0px 1px 4px rgba(0,0,0,0.05)",
  },
  default: {
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
});

const webSelectStyle = {
  appearance: "none",
  WebkitAppearance: "none",
  MozAppearance: "none",
  backgroundColor: "#f5f5f5",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  padding: 8,
  paddingRight: 28,
  height: 40,
};

export default function TeamScreen() {
  const { activeDatabaseId, openCreateModal, canManageTeam } = useDatabase();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [members, setMembers] = useState([]); // [{ membershipId, user_id, role, email, profile, isOwner }]

  const [adding, setAdding] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [addError, setAddError] = useState("");

  const canManage = !!canManageTeam;

  const ensureDatabaseSelected = () => {
    if (!activeDatabaseId) {
      openCreateModal();
      return false;
    }
    return true;
  };

  const loadTeam = useCallback(async () => {
    if (!activeDatabaseId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Get owner for this database
      const { data: db, error: dbErr } = await supabase
        .from("databases")
        .select("id, owner_id")
        .eq("id", activeDatabaseId)
        .single();
      if (dbErr) throw dbErr;

      const ownerId = db?.owner_id;
      let ownerProfile = null;
      if (ownerId) {
        const { data: prof, error: ownerErr } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .eq("id", ownerId)
          .single();
        if (!ownerErr) ownerProfile = prof;
      }

      // Load members from join table
      const { data: rows, error: mErr } = await supabase
        .from("database_members")
        .select("id, user_id, role, email, profiles:user_id(id, first_name, last_name, email)")
        .eq("database_id", activeDatabaseId)
        .order("created_at", { ascending: true });
      if (mErr) throw mErr;

      let normalized = (rows || [])
        .map((r) => ({
          membershipId: r.id,
          user_id: r.user_id,
          role: r.role,
          email: r.email || r.profiles?.email || "",
          profile: r.profiles,
          isOwner: ownerId ? r.user_id === ownerId : false,
        }));

      const hasOwnerMembership = !!normalized.find((m) => ownerId && m.user_id === ownerId);
      if (ownerId && !hasOwnerMembership) {
        normalized = [
          {
            membershipId: null,
            user_id: ownerId,
            role: "admin",
            email: ownerProfile?.email || "",
            profile: ownerProfile,
            isOwner: true,
          },
          ...normalized,
        ];
      }

      const sorted = [...normalized].sort((a, b) => {
        const rank = (member) => {
          if (member.user_id === user?.id) return 0;
          const isAdmin = (member.role || "").toLowerCase() === "admin" || member.isOwner;
          return isAdmin ? 1 : 2;
        };
        const rA = rank(a);
        const rB = rank(b);
        if (rA !== rB) return rA - rB;

        const nameA = `${a?.profile?.first_name || ""} ${a?.profile?.last_name || ""}`.trim().toLowerCase();
        const nameB = `${b?.profile?.first_name || ""} ${b?.profile?.last_name || ""}`.trim().toLowerCase();
        if (nameA && nameB && nameA !== nameB) return nameA.localeCompare(nameB);

        const emailA = (a?.profile?.email || a?.email || "").toLowerCase();
        const emailB = (b?.profile?.email || b?.email || "").toLowerCase();
        if (emailA && emailB && emailA !== emailB) return emailA.localeCompare(emailB);

        return 0;
      });

      setMembers(sorted);
    } catch (e) {
      console.error("loadTeam error:", e);
      setMembers([]);
      Alert.alert("Error", e.message || "Failed to load team.");
    } finally {
      setLoading(false);
    }
  }, [activeDatabaseId, user?.id]);

  useEffect(() => {
    loadTeam();
  }, [loadTeam]);

  const addMember = async () => {
    if (!ensureDatabaseSelected()) return;
    if (!canManage) {
      Alert.alert("Permission", "Only admins can manage the team.");
      return;
    }
    const email = (newEmail || "").trim().toLowerCase();
    if (!email) {
      Alert.alert("Validation", "Enter an email address.");
      return;
    }
    setAddError("");
    setSaving(true);
    try {
      // Look up the registered user via RPC (enforces permissions server-side)
      const { data: profileId, error: lookupErr } = await supabase.rpc(
        "lookup_profile_id",
        {
          target_database: activeDatabaseId,
          user_email: email,
        }
      );
      if (lookupErr) {
        throw lookupErr;
      }
      if (!profileId) {
        setAddError("user does not exist");
        return;
      }

      const userId = profileId;

      // If user already member, update role; else insert
      const { data: existing, error: exErr } = await supabase
        .from("database_members")
        .select("id")
        .eq("database_id", activeDatabaseId)
        .eq("user_id", userId);
      if (exErr) throw exErr;

      if (existing && existing.length) {
        const { error: uErr } = await supabase
          .from("database_members")
          .update({ role: newRole, user_id: userId, email })
          .eq("id", existing[0].id);
        if (uErr) throw uErr;
      } else {
        const { error: iErr } = await supabase
          .from("database_members")
          .insert([
            { database_id: activeDatabaseId, user_id: userId, email, role: newRole },
          ]);
        if (iErr) throw iErr;
      }

      setAdding(false);
      setNewEmail("");
      setNewRole("user");
      setAddError("");
      await loadTeam();
    } catch (e) {
      console.error("addMember error:", e);
      setAddError(e.message || "Failed to add member");
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (member, role) => {
    if (!canManage) {
      Alert.alert("Permission", "Only admins can manage the team.");
      return;
    }
    if (!member?.user_id) return;
    if (member.user_id === user?.id) {
      Alert.alert("Unavailable", "You cannot change your own role.");
      return;
    }
    setSaving(true);
    try {
      if (member.membershipId) {
        const { error } = await supabase
          .from("database_members")
          .update({ role })
          .eq("id", member.membershipId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("database_members")
          .insert([
            {
              database_id: activeDatabaseId,
              user_id: member.user_id,
              email: member.email || member.profile?.email || null,
              role,
            },
          ]);
        if (error) throw error;
      }
      await loadTeam();
    } catch (e) {
      console.error("changeRole error:", e);
      Alert.alert("Error", e.message || "Failed to update role.");
    } finally {
      setSaving(false);
    }
  };

  const removeMember = async (member) => {
    if (!canManage) {
      Alert.alert("Permission", "Only admins can manage the team.");
      return;
    }
    if (member?.user_id === user?.id) {
      Alert.alert("Unavailable", "You cannot remove yourself from the team.");
      return;
    }
    if (member?.isOwner) {
      setSaving(true);
      try {
        const { error: transferErr } = await supabase.rpc("transfer_database_owner", {
          target_database: activeDatabaseId,
          new_owner: user?.id,
          keep_previous: false,
          previous_role: "user",
        });
        if (transferErr) throw transferErr;
        await loadTeam();
      } catch (e) {
        console.error("remove owner error:", e);
        Alert.alert("Error", e.message || "Failed to remove owner.");
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!member?.membershipId) {
      Alert.alert("Unavailable", "This member cannot be removed.");
      return;
    }
    const go = async () => {
      setSaving(true);
      try {
        const { error } = await supabase
          .from("database_members")
          .delete()
          .eq("id", member.membershipId);
        if (error) throw error;
        await loadTeam();
      } catch (e) {
        console.error("removeMember error:", e);
        Alert.alert("Error", e.message || "Failed to remove member.");
      } finally {
        setSaving(false);
      }
    };

    if (Platform.OS === "web") {
      if (window.confirm("Remove this member from the database?")) await go();
    } else {
      Alert.alert("Remove Member", "Remove this member from the database?", [
        { text: "Cancel", style: "cancel" },
        { text: "Remove", style: "destructive", onPress: go },
      ]);
    }
  };

  const renderRolePicker = (value, onChange, disabled = false) => (
    <View style={{ flexDirection: "row", alignItems: "center" }}>
      <View style={{ position: "relative", minWidth: 140 }}>
        <Picker
          selectedValue={value}
          onValueChange={onChange}
          enabled={!disabled && !saving}
          mode="dropdown"
          style={Platform.OS === "web" ? webSelectStyle : undefined}
        >
          <Picker.Item label="User" value="user" />
          <Picker.Item label="Admin" value="admin" />
        </Picker>
        {Platform.OS === "web" && (
          <View pointerEvents="none" style={styles.webPickerIcon}>
            <Ionicons name="chevron-down" size={16} color="#555" />
          </View>
        )}
      </View>
    </View>
  );

  return (
    <View style={commonStyles.contentContainer}>
      <Text style={commonStyles.textPrimary}>Team</Text>

      {/* Add Member dashed button */}
      {canManage && (!adding ? (
        <DashedRowButton
          label="Add User to Team"
          onPress={() => {
            setAdding(true);
            setAddError("");
          }}
        />
      ) : (
        <View style={[rowBaseStyle, rowShadowStyle, styles.addContainer]}>
          <Text style={styles.addHeaderLabel}>Add team member</Text>

          <View style={styles.inlineRow}>
            <TextInput
              value={newEmail}
              onChangeText={(value) => {
                setNewEmail(value);
                if (addError) setAddError("");
              }}
              placeholder="user@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              style={[styles.input, styles.inlineInput]}
            />

            <View style={styles.rolePickerWrapper}>{renderRolePicker(newRole, setNewRole)}</View>

            <Pressable
              onPress={() => {
                setAdding(false);
                setNewEmail("");
                setNewRole("user");
                setAddError("");
              }}
              style={[styles.iconBtn, styles.actionBtn]}
            >
              <Ionicons name="close" size={20} color="#999" />
            </Pressable>
            <Pressable onPress={addMember} disabled={saving} style={[styles.iconBtn, styles.actionBtn]}>
              <Ionicons name="checkmark" size={20} color={saving ? "#aaa" : "#28a745"} />
            </Pressable>
          </View>

          {!!addError && <Text style={styles.errorText}>{addError}</Text>}
        </View>
      ))}

      {/* Team list */}
      {loading ? (
        <ActivityIndicator style={{ marginTop: 12 }} />
      ) : (
        <View style={{ marginTop: 12 }}>
          {members.length === 0 ? (
            <Text style={{ color: "#888", marginTop: 12 }}>No other team members yet.</Text>
          ) : (
            members.map((m) => {
              const canEditMember = canManage;
              const canDelete = canManage && m.user_id !== user?.id && !!m.membershipId;
              const isSelf = m.user_id === user?.id;
              return (
                <View key={m.membershipId || m.user_id} style={[rowBaseStyle, rowShadowStyle]}>
                  <View style={{ flex: 1, paddingRight: 10 }}>
                    <Text style={{ fontWeight: "700" }} numberOfLines={1}>
                      {`${m?.profile?.first_name || ""} ${m?.profile?.last_name || ""}`.trim() || ""}
                    </Text>
                    <Text style={{ color: "#555", marginTop: 2 }} numberOfLines={1}>
                      {m?.profile?.email || m?.email || ""}
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: 8 }}>
                    {renderRolePicker(
                      m.role || "user",
                      (val) => changeRole(m, val),
                      !canEditMember || isSelf
                    )}
                  </View>
                  {canDelete ? (
                    <Pressable onPress={() => removeMember(m)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={20} color="#ff5555" />
                    </Pressable>
                  ) : (
                    <View style={{ width: 36 }} />
                  )}
                </View>
              );
            })
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#f9f9f9",
    marginTop: 6,
    minWidth: 260,
  },
  iconBtn: {
    padding: 8,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addContainer: {
    flexDirection: "column",
    gap: 6,
  },
  addHeaderLabel: {
    fontWeight: "700",
    textAlign: "left",
    alignSelf: "flex-start",
  },
  inlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
    flexWrap: "nowrap",
  },
  roleLabel: {
    fontWeight: "700",
    color: "#333",
  },
  rolePickerWrapper: {
    minWidth: 150,
    marginHorizontal: 8,
    height: 40,
    justifyContent: "center",
  },
  inlineInput: { height: 40, paddingVertical: 8, flex: 1, marginTop: 0 },
  actionBtn: {
    height: 40,
    width: 40,
  },
  errorText: {
    color: "#f87171",
    marginTop: 6,
    fontSize: 12,
    fontWeight: "600",
  },
  webPickerIcon: {
    position: "absolute",
    right: 8,
    top: 10,
  },
});
