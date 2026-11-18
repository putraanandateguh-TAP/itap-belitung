// Navigasi root: 5 tab bawah persisten, masing-masing dengan stack sendiri
// sehingga riwayat layar per tab dipertahankan (recon S27).
import { Ionicons } from "@expo/vector-icons";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { colors } from "../theme";
import type {
  AccountStackParamList,
  ChannelStackParamList,
  ChatStackParamList,
  HomeStackParamList,
  MarketStackParamList,
  RootTabParamList,
} from "./types";
import { HomeScreen } from "../screens/home/HomeScreen";
import {
  EarthquakeScreen,
  FuelScreen,
  PrayerScreen,
  TransportScreen,
  WeatherScreen,
} from "../screens/home/DailyScreens";
import { CctvScreen } from "../screens/home/CctvScreen";
import { PricesScreen } from "../screens/home/PricesScreen";
import { StatsScreen } from "../screens/home/StatsScreen";
import { CultureDetailScreen, CultureListScreen } from "../screens/home/CultureScreens";
import { CreatorScreen } from "../screens/home/CreatorScreen";
import { TranslatorScreen } from "../screens/home/TranslatorScreen";
import { EmergencyScreen } from "../screens/home/EmergencyScreen";
import { AiScreen } from "../screens/home/AiScreen";
import { ChannelListScreen } from "../screens/channels/ChannelListScreen";
import { ArticleDetailScreen } from "../screens/channels/ArticleDetailScreen";
import { SearchScreen } from "../screens/channels/SearchScreen";
import { MarketplaceScreen } from "../screens/marketplace/MarketplaceScreen";
import { ListingDetailScreen } from "../screens/marketplace/ListingDetailScreen";
import { ListingFormScreen } from "../screens/marketplace/ListingFormScreen";
import { MyListingsScreen, SavedScreen } from "../screens/marketplace/MyListingsScreens";
import { ChatListScreen, ChatRoomScreen } from "../screens/chat/ChatScreens";
import { AccountScreen } from "../screens/account/AccountScreen";
import { LoginScreen } from "../screens/account/LoginScreen";
import { VerifyScreen } from "../screens/account/VerifyScreen";
import { RulesScreen } from "../screens/account/RulesScreen";
import { DeleteAccountScreen, SettingsScreen } from "../screens/account/SettingsScreens";
import { NotificationsScreen } from "../screens/account/NotificationsScreen";
import { ReportScreen } from "../screens/account/ReportScreen";

const Tab = createBottomTabNavigator<RootTabParamList>();
const HomeStack = createNativeStackNavigator<HomeStackParamList>();
const ChannelStack = createNativeStackNavigator<ChannelStackParamList>();
const MarketStack = createNativeStackNavigator<MarketStackParamList>();
const ChatStack = createNativeStackNavigator<ChatStackParamList>();
const AccountStack = createNativeStackNavigator<AccountStackParamList>();

const stackOptions = {
  headerStyle: { backgroundColor: colors.surfaceDark },
  headerTintColor: colors.textOnDark,
  headerTitleStyle: { fontWeight: "700" as const },
};

function HomeNavigator() {
  return (
    <HomeStack.Navigator screenOptions={stackOptions}>
      <HomeStack.Screen name="Home" component={HomeScreen} options={{ title: "iTAP Belitung" }} />
      <HomeStack.Screen name="Weather" component={WeatherScreen} options={{ title: "Cuaca" }} />
      <HomeStack.Screen name="Prayer" component={PrayerScreen} options={{ title: "Jadwal Salat" }} />
      <HomeStack.Screen name="Transport" component={TransportScreen} options={{ title: "Pesawat & Kapal" }} />
      <HomeStack.Screen name="Cctv" component={CctvScreen} options={{ title: "CCTV" }} />
      <HomeStack.Screen name="Prices" component={PricesScreen} options={{ title: "Harga & Stok" }} />
      <HomeStack.Screen name="Fuel" component={FuelScreen} options={{ title: "Harga BBM" }} />
      <HomeStack.Screen name="Culture" component={CultureListScreen} options={{ title: "Budaya" }} />
      <HomeStack.Screen name="CultureDetail" component={CultureDetailScreen} options={{ title: "Cerita Budaya" }} />
      <HomeStack.Screen name="Creator" component={CreatorScreen} options={{ title: "Kreator" }} />
      <HomeStack.Screen name="Translator" component={TranslatorScreen} options={{ title: "Penerjemah" }} />
      <HomeStack.Screen name="Earthquake" component={EarthquakeScreen} options={{ title: "Gempa" }} />
      <HomeStack.Screen name="Stats" component={StatsScreen} options={{ title: "Statistik" }} />
      <HomeStack.Screen name="Emergency" component={EmergencyScreen} options={{ title: "Nomor Darurat" }} />
      <HomeStack.Screen name="Ai" component={AiScreen} options={{ title: "AI iTAP" }} />
      <HomeStack.Screen name="ArticleDetail" component={ArticleDetailScreen} options={{ title: "Artikel" }} />
      <HomeStack.Screen name="Search" component={SearchScreen} options={{ title: "Cari" }} />
      <HomeStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifikasi" }} />
    </HomeStack.Navigator>
  );
}

function ChannelNavigator() {
  return (
    <ChannelStack.Navigator screenOptions={stackOptions}>
      <ChannelStack.Screen name="Channels" component={ChannelListScreen} options={{ title: "Kanal" }} />
      <ChannelStack.Screen name="ArticleDetail" component={ArticleDetailScreen} options={{ title: "Artikel" }} />
      <ChannelStack.Screen name="Search" component={SearchScreen} options={{ title: "Cari" }} />
    </ChannelStack.Navigator>
  );
}

function MarketNavigator() {
  return (
    <MarketStack.Navigator screenOptions={stackOptions}>
      <MarketStack.Screen name="Marketplace" component={MarketplaceScreen} options={{ title: "Jual Beli" }} />
      <MarketStack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: "Penawaran" }} />
      <MarketStack.Screen name="ListingForm" component={ListingFormScreen} options={{ title: "Pasang Penawaran" }} />
      <MarketStack.Screen name="MyListings" component={MyListingsScreen} options={{ title: "Penawaranku" }} />
      <MarketStack.Screen name="Saved" component={SavedScreen} options={{ title: "Tersimpan" }} />
      <MarketStack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: "Chat" }} />
      <MarketStack.Screen name="Report" component={ReportScreen} options={{ title: "Laporkan" }} />
    </MarketStack.Navigator>
  );
}

function ChatNavigator() {
  return (
    <ChatStack.Navigator screenOptions={stackOptions}>
      <ChatStack.Screen name="ChatList" component={ChatListScreen} options={{ title: "Chat" }} />
      <ChatStack.Screen name="ChatRoom" component={ChatRoomScreen} options={{ title: "Chat" }} />
      <ChatStack.Screen name="ListingDetail" component={ListingDetailScreen} options={{ title: "Penawaran" }} />
    </ChatStack.Navigator>
  );
}

function AccountNavigator() {
  return (
    <AccountStack.Navigator screenOptions={stackOptions}>
      <AccountStack.Screen name="Account" component={AccountScreen} options={{ title: "Akun" }} />
      <AccountStack.Screen name="Login" component={LoginScreen} options={{ title: "Masuk / Daftar" }} />
      <AccountStack.Screen name="Verify" component={VerifyScreen} options={{ title: "Verifikasi Akun" }} />
      <AccountStack.Screen name="Rules" component={RulesScreen} options={{ title: "Aturan Marketplace" }} />
      <AccountStack.Screen name="Settings" component={SettingsScreen} options={{ title: "Pengaturan" }} />
      <AccountStack.Screen name="DeleteAccount" component={DeleteAccountScreen} options={{ title: "Hapus Akun" }} />
      <AccountStack.Screen name="MyListings" component={MyListingsScreen} options={{ title: "Penawaranku" }} />
      <AccountStack.Screen name="Saved" component={SavedScreen} options={{ title: "Tersimpan" }} />
      <AccountStack.Screen name="Notifications" component={NotificationsScreen} options={{ title: "Notifikasi" }} />
      <AccountStack.Screen name="Report" component={ReportScreen} options={{ title: "Laporkan" }} />
    </AccountStack.Navigator>
  );
}

const TAB_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  HomeTab: "home",
  ChannelTab: "newspaper",
  MarketTab: "storefront",
  ChatTab: "chatbubbles",
  AccountTab: "person",
};

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarActiveTintColor: colors.accent,
          tabBarInactiveTintColor: colors.textMuted,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name={TAB_ICONS[route.name] ?? "ellipse"} size={size} color={color} />
          ),
        })}
      >
        <Tab.Screen name="HomeTab" component={HomeNavigator} options={{ title: "Beranda" }} />
        <Tab.Screen name="ChannelTab" component={ChannelNavigator} options={{ title: "Kanal" }} />
        <Tab.Screen name="MarketTab" component={MarketNavigator} options={{ title: "Jual Beli" }} />
        <Tab.Screen name="ChatTab" component={ChatNavigator} options={{ title: "Chat" }} />
        <Tab.Screen name="AccountTab" component={AccountNavigator} options={{ title: "Akun" }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
