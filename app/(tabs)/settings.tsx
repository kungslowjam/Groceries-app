// app/(tabs)/history.tsx
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Currency, useI18n } from "../../lib/i18n";
import { supabase } from "../../lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const { t, language, setLanguage, currency, setCurrency } = useI18n();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [currencyModalVisible, setCurrencyModalVisible] = useState(false);

  const currencies = [
    { code: 'THB', label: t('currencyTHB') },
    { code: 'USD', label: t('currencyUSD') },
    { code: 'EUR', label: t('currencyEUR') },
    { code: 'AUD', label: t('currencyAUD') },
    { code: 'JPY', label: t('currencyJPY') },
    { code: 'NZD', label: t('currencyNZD') },
  ];

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace("/(tabs)/index" as any);
    } catch (error) {
      console.error('Error signing out:', error);
      Alert.alert("Error", "Failed to sign out");
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      t('deleteAccount'),
      "Are you sure you want to delete your account? This action cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const { error } = await supabase.auth.admin.deleteUser(
                (await supabase.auth.getUser()).data.user?.id || ""
              );
              if (error) throw error;
              router.replace("/(tabs)/index" as any);
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert("Error", "Failed to delete account");
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.title}>⚙️ {t('settings')}</Text>

      <ScrollView style={styles.scroll}>
        {/* User Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('userSettings')}</Text>
          <Pressable style={styles.row} onPress={() => setProfileModalVisible(true)}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="account" size={24} color="#60A5FA" />
              <Text style={styles.rowText}>{t('profile')}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
          </Pressable>
          <Pressable style={styles.row} onPress={handleSignOut}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="logout" size={24} color="#EF4444" />
              <Text style={[styles.rowText, { color: "#EF4444" }]}>{t('signOut')}</Text>
            </View>
          </Pressable>
        </View>

        {/* App Settings */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('appSettings')}</Text>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="bell" size={24} color="#60A5FA" />
              <Text style={styles.rowText}>{t('notifications')}</Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: "#334155", true: "#60A5FA" }}
              thumbColor="#FFF"
            />
          </View>
          <View style={styles.row}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="theme-light-dark" size={24} color="#60A5FA" />
              <Text style={styles.rowText}>{t('darkMode')}</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={setDarkMode}
              trackColor={{ false: "#334155", true: "#60A5FA" }}
              thumbColor="#FFF"
            />
          </View>
          <Pressable
            style={styles.row}
            onPress={() => setCurrencyModalVisible(true)}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="currency-usd" size={24} color="#60A5FA" />
              <Text style={styles.rowText}>{t('currency')}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{currency}</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
            </View>
          </Pressable>
          <Pressable
            style={styles.row}
            onPress={() => setLanguage(language === 'th' ? 'en' : 'th')}
          >
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="translate" size={24} color="#60A5FA" />
              <Text style={styles.rowText}>{t('language')}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{language === 'th' ? 'ไทย' : 'EN'}</Text>
              <MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
            </View>
          </Pressable>
        </View>

        {/* About */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('about')}</Text>
          <Pressable style={styles.row} onPress={() => Alert.alert(t('version'), "1.0.0")}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="information" size={24} color="#60A5FA" />
              <Text style={styles.rowText}>{t('version')}</Text>
            </View>
            <Text style={styles.rowValue}>1.0.0</Text>
          </Pressable>
          <Pressable style={styles.row} onPress={() => Alert.alert(t('termsOfService'), "Terms of Service")}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="file-document" size={24} color="#60A5FA" />
              <Text style={styles.rowText}>{t('termsOfService')}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
          </Pressable>
          <Pressable style={styles.row} onPress={() => Alert.alert(t('privacyPolicy'), "Privacy Policy")}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="shield-account" size={24} color="#60A5FA" />
              <Text style={styles.rowText}>{t('privacyPolicy')}</Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={24} color="#94A3B8" />
          </Pressable>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dangerZone')}</Text>
          <Pressable style={styles.row} onPress={handleDeleteAccount}>
            <View style={styles.rowLeft}>
              <MaterialCommunityIcons name="delete" size={24} color="#EF4444" />
              <Text style={[styles.rowText, { color: "#EF4444" }]}>{t('deleteAccount')}</Text>
            </View>
          </Pressable>
        </View>
      </ScrollView>

      {/* Profile Modal */}
      <Modal
        visible={profileModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('profile')}</Text>
              <Pressable onPress={() => setProfileModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#94A3B8" />
              </Pressable>
            </View>
            <TextInput
              style={styles.input}
              placeholder={t('name')}
              placeholderTextColor="#94A3B8"
              value={name}
              onChangeText={setName}
            />
            <TextInput
              style={styles.input}
              placeholder={t('email')}
              placeholderTextColor="#94A3B8"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <Pressable style={styles.saveButton} onPress={() => setProfileModalVisible(false)}>
              <Text style={styles.saveButtonText}>{t('saveChanges')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Currency Modal */}
      <Modal
        visible={currencyModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setCurrencyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('selectCurrency')}</Text>
              <Pressable onPress={() => setCurrencyModalVisible(false)}>
                <MaterialCommunityIcons name="close" size={24} color="#94A3B8" />
              </Pressable>
            </View>
            {currencies.map((curr) => (
              <Pressable
                key={curr.code}
                style={[
                  styles.currencyOption,
                  currency === curr.code && styles.currencyOptionSelected,
                ]}
                onPress={() => {
                  setCurrency(curr.code as Currency);
                  setCurrencyModalVisible(false);
                }}
              >
                <Text
                  style={[
                    styles.currencyOptionText,
                    currency === curr.code && styles.currencyOptionTextSelected,
                  ]}
                >
                  {curr.label}
                </Text>
                {currency === curr.code && (
                  <MaterialCommunityIcons name="check" size={20} color="#60A5FA" />
                )}
              </Pressable>
            ))}
          </View>
    </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F172A" },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFF",
    margin: 16,
  },
  scroll: { flex: 1 },
  section: {
    backgroundColor: "#1E293B",
    borderRadius: 12,
    margin: 16,
    marginTop: 0,
    overflow: "hidden",
  },
  sectionTitle: {
    color: "#94A3B8",
    fontSize: 14,
    fontWeight: "600",
    margin: 16,
    marginBottom: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#334155",
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  rowText: {
    color: "#FFF",
    fontSize: 16,
  },
  rowValue: {
    color: "#94A3B8",
    fontSize: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#1E293B",
    borderRadius: 16,
    padding: 20,
    width: "90%",
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    color: "#FFF",
    fontSize: 20,
    fontWeight: "600",
  },
  input: {
    backgroundColor: "#334155",
    borderRadius: 8,
    padding: 12,
    color: "#FFF",
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: "#60A5FA",
    borderRadius: 8,
    padding: 12,
    alignItems: "center",
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
  },
  currencyOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  currencyOptionSelected: {
    backgroundColor: "#1E293B",
  },
  currencyOptionText: {
    color: "#FFF",
    fontSize: 16,
  },
  currencyOptionTextSelected: {
    color: "#60A5FA",
    fontWeight: "700",
  },
});
