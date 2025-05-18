import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, ReactNode, useContext, useEffect, useState } from 'react';

type Language = 'th' | 'en';

type Translations = {
  [key: string]: string;
};

type TranslationSet = {
  th: Translations;
  en: Translations;
};

export type Currency = 'THB' | 'USD' | 'EUR' | 'AUD' | 'JPY' | 'NZD';

interface I18nContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  currency: Currency;
  setCurrency: (currency: Currency) => void;
}

const translations: TranslationSet = {
  th: {
    settings: 'ตั้งค่า',
    userSettings: 'ตั้งค่าผู้ใช้',
    profile: 'โปรไฟล์',
    signOut: 'ออกจากระบบ',
    appSettings: 'ตั้งค่าแอพ',
    notifications: 'การแจ้งเตือน',
    darkMode: 'โหมดมืด',
    currency: 'สกุลเงิน',
    language: 'ภาษา',
    about: 'เกี่ยวกับ',
    version: 'เวอร์ชัน',
    termsOfService: 'เงื่อนไขการใช้งาน',
    privacyPolicy: 'นโยบายความเป็นส่วนตัว',
    dangerZone: 'โซนอันตราย',
    deleteAccount: 'ลบบัญชีผู้ใช้',
    saveChanges: 'บันทึกการเปลี่ยนแปลง',
    name: 'ชื่อ',
    email: 'อีเมล',
    scan: 'สแกน',
    history: 'ประวัติ',
    analyse: 'วิเคราะห์',
    monthlySpend: 'ค่าใช้จ่ายรายเดือน',
    total: 'รวม',
    sessions: 'จำนวนครั้ง',
    average: 'เฉลี่ย',
    budgetStatus: 'สถานะงบประมาณ',
    setBudget: 'ตั้งงบประมาณ',
    saveBudget: 'บันทึกงบประมาณ',
    removeBudget: 'ลบงบประมาณ',
    inBudget: 'อยู่ในงบประมาณ',
    overBudget: 'เกินงบประมาณ',
    scannedItems: 'รายการที่สแกน',
    clearAll: 'ลบทั้งหมด',
    noSavedSessions: 'ไม่มีประวัติการบันทึก',
    store: 'ร้านค้า',
    unknownStore: 'ร้านค้าไม่ทราบ',
    deleteSession: 'ลบประวัติ',
    confirmDelete: 'คุณแน่ใจหรือไม่ที่จะลบรายการนี้?',
    monthlySpending: 'ค่าใช้จ่ายรายเดือน',
    spendingByCategory: 'ค่าใช้จ่ายตามหมวดหมู่',
    noData: 'ไม่มีข้อมูล',
    hello: 'สวัสดี',
    hiShopper: 'สวัสดีนักช้อป',
    selectCurrency: 'เลือกสกุลเงิน',
    currencyTHB: 'บาท (THB)',
    currencyUSD: 'ดอลลาร์สหรัฐ (USD)',
    currencyEUR: 'ยูโร (EUR)',
    currencyAUD: 'ดอลลาร์ออสเตรเลีย (AUD)',
    currencyJPY: 'เยน (JPY)',
    currencyNZD: 'ดอลลาร์นิวซีแลนด์ (NZD)',
    monthlySpendChart: 'ยอดใช้จ่ายรายเดือน',
    categorySpendChart: 'สรุปยอดใช้จ่ายแต่ละหมวด',
    top3Items: '3 อันดับที่ใช้จ่ายมากสุด',
  },
  en: {
    settings: 'Settings',
    userSettings: 'User Settings',
    profile: 'Profile',
    signOut: 'Sign Out',
    appSettings: 'App Settings',
    notifications: 'Notifications',
    darkMode: 'Dark Mode',
    currency: 'Currency',
    language: 'Language',
    about: 'About',
    version: 'Version',
    termsOfService: 'Terms of Service',
    privacyPolicy: 'Privacy Policy',
    dangerZone: 'Danger Zone',
    deleteAccount: 'Delete Account',
    saveChanges: 'Save Changes',
    name: 'Name',
    email: 'Email',
    scan: 'Scan',
    history: 'History',
    analyse: 'Analyse',
    monthlySpend: 'Monthly Spend',
    total: 'Total',
    sessions: 'Sessions',
    average: 'Average',
    budgetStatus: 'Budget Status',
    setBudget: 'Set Budget',
    saveBudget: 'Save Budget',
    removeBudget: 'Remove Budget',
    inBudget: 'In Budget',
    overBudget: 'Over Budget',
    scannedItems: 'Scanned Items',
    clearAll: 'Clear All',
    noSavedSessions: 'No saved sessions',
    store: 'Store',
    unknownStore: 'Unknown Store',
    deleteSession: 'Delete Session',
    confirmDelete: 'Are you sure you want to delete this session?',
    monthlySpending: 'Monthly Spending',
    spendingByCategory: 'Spending by Category',
    noData: 'No data',
    hello: 'Hello',
    hiShopper: 'Hi Shopper',
    selectCurrency: 'Select Currency',
    currencyTHB: 'Thai Baht (THB)',
    currencyUSD: 'US Dollar (USD)',
    currencyEUR: 'Euro (EUR)',
    currencyAUD: 'Australian Dollar (AUD)',
    currencyJPY: 'Japanese Yen (JPY)',
    currencyNZD: 'New Zealand Dollar (NZD)',
    monthlySpendChart: 'Monthly Spending',
    categorySpendChart: 'Spending by Category',
    top3Items: 'Top 3 Items',
  },
};

const I18nContext = createContext<I18nContextType | undefined>(undefined);

interface I18nProviderProps {
  children: ReactNode;
}

const defaultCurrency: Currency = 'THB';

export function I18nProvider({ children }: I18nProviderProps) {
  const [language, setLanguage] = useState<Language>('th');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);

  useEffect(() => {
    AsyncStorage.getItem('APP_LANGUAGE').then((savedLang) => {
      if (savedLang === 'th' || savedLang === 'en') {
        setLanguage(savedLang);
      }
    });
    AsyncStorage.getItem('APP_CURRENCY').then((savedCurrency) => {
      if (savedCurrency && ['THB', 'USD', 'EUR', 'AUD', 'JPY', 'NZD'].includes(savedCurrency)) {
        setCurrency(savedCurrency as Currency);
      }
    });
  }, []);

  const handleSetLanguage = (lang: Language) => {
    setLanguage(lang);
    AsyncStorage.setItem('APP_LANGUAGE', lang);
  };

  const handleSetCurrency = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    AsyncStorage.setItem('APP_CURRENCY', newCurrency);
  };

  const t = (key: string): string => {
    return translations[language][key] || key;
  };

  const value: I18nContextType = {
    language,
    setLanguage: handleSetLanguage,
    t,
    currency,
    setCurrency: handleSetCurrency,
  };

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (context === undefined) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
} 