// Navigasi minimal yang dipakai layar yang dipakai di dua stack sekaligus
// (mis. ArticleDetail di HomeStack + ChannelStack). Union dua tipe navigasi
// React Navigation tidak bisa dipanggil langsung (TS2349), jadi layar
// bersama memakai antarmuka struktural ini lewat cast lokal.
export interface SharedNavigation {
  navigate: (screen: string, params?: Record<string, unknown>) => void;
  goBack: () => void;
}

export function asSharedNavigation(
  navigation: unknown,
): SharedNavigation {
  return navigation as SharedNavigation;
}
import type { NavigatorScreenParams } from "@react-navigation/native";

export type HomeStackParamList = {
  Home: undefined;
  Weather: undefined;
  Prayer: undefined;
  Transport: undefined;
  Cctv: undefined;
  Prices: undefined;
  Fuel: undefined;
  Culture: undefined;
  CultureDetail: { slug: string };
  Creator: undefined;
  Translator: undefined;
  Earthquake: undefined;
  Stats: undefined;
  Emergency: undefined;
  Ai: undefined;
  ArticleDetail: { slug: string };
  Search: undefined;
  Notifications: undefined;
};

export type ChannelStackParamList = {
  Channels: { channel?: string };
  ArticleDetail: { slug: string };
  Search: undefined;
};

export type MarketStackParamList = {
  Marketplace: undefined;
  ListingDetail: { id: string };
  ListingForm: { id?: string };
  MyListings: undefined;
  Saved: undefined;
  ChatRoom: { threadId: string; listingTitle?: string; listingId?: string };
  Report: { targetType: "listing" | "account" | "comment"; targetId: string; label: string };
};

export type ChatStackParamList = {
  ChatList: undefined;
  ChatRoom: { threadId: string; listingTitle?: string; listingId?: string };
  ListingDetail: { id: string };
};

export type AccountStackParamList = {
  Account: undefined;
  Login: undefined;
  Verify: undefined;
  Rules: undefined;
  Settings: undefined;
  DeleteAccount: undefined;
  MyListings: undefined;
  Saved: undefined;
  Notifications: undefined;
  Report: { targetType: "listing" | "account" | "comment"; targetId: string; label: string };
};

export type RootTabParamList = {
  HomeTab: NavigatorScreenParams<HomeStackParamList>;
  ChannelTab: NavigatorScreenParams<ChannelStackParamList>;
  MarketTab: NavigatorScreenParams<MarketStackParamList>;
  ChatTab: NavigatorScreenParams<ChatStackParamList>;
  AccountTab: NavigatorScreenParams<AccountStackParamList>;
};
