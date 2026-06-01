export type AccountStatus = "available" | "sold";

export type Rarity =
  | "Select"
  | "Deluxe"
  | "Premium"
  | "Ultra"
  | "Exclusive"
  | "Edition";

export interface AccountSkin {
  uuid: string;
  weaponName: string;
  displayName: string;
  displayIcon: string;
  fullRender?: string;
  rarity: Rarity;
  rarityColor: string;
  vpCost?: number;
  chromas?: { uuid: string; swatch?: string; streamedVideo?: string }[];
}

export interface AccountAgent {
  uuid: string;
  displayName: string;
  displayIcon: string;
  fullPortrait?: string;
  role: string;
  roleIcon?: string;
}

export interface AccountBuddy {
  uuid: string;
  displayName: string;
  displayIcon: string;
}

export interface AccountSpray {
  uuid: string;
  displayName: string;
  displayIcon: string;
  animationGif?: string;
}

export interface AccountCard {
  uuid: string;
  displayName: string;
  smallArt: string;
  wideArt?: string;
  largeArt?: string;
}

export interface AccountTitle {
  uuid: string;
  displayName: string;
  titleText: string;
}

export interface AccountFlex {
  uuid: string;
  displayName: string;
  displayIcon: string;
}

export interface ValoAccount {
  id: string;
  title: string;
  description?: string;
  price: number;
  currency: string;
  status: AccountStatus;
  region: string;
  rank?: string;
  skins: AccountSkin[];
  agents: AccountAgent[];
  buddies: AccountBuddy[];
  sprays: AccountSpray[];
  cards: AccountCard[];
  titles: AccountTitle[];
  flex?: AccountFlex[];
  featured: boolean;
  battlePassCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface VPPackage {
  id: string;
  amount: number;
  bonus: number;
  price: number;
  currency: string;
  popular: boolean;
}

export interface AccountsData {
  accounts: ValoAccount[];
  lastUpdated: string;
}

// valorant-api.com response shapes
export interface ValoApiWeapon {
  uuid: string;
  displayName: string;
  displayIcon: string;
  skins: ValoApiSkin[];
}

export interface ValoApiSkin {
  uuid: string;
  displayName: string;
  contentTierUuid: string;
  displayIcon?: string;
  wallpaper?: string;
  levels: ValoApiSkinLevel[];
  chromas: ValoApiSkinChroma[];
}

export interface ValoApiSkinLevel {
  uuid: string;
  displayName: string;
  displayIcon?: string;
}

export interface ValoApiSkinChroma {
  uuid: string;
  displayName: string;
  displayIcon?: string;
  fullRender?: string;
  swatch?: string;
}

export interface ValoApiAgent {
  uuid: string;
  displayName: string;
  displayIcon: string;
  fullPortrait?: string;
  role: {
    uuid: string;
    displayName: string;
    displayIcon: string;
  };
}

export interface ValoApiBuddy {
  uuid: string;
  displayName: string;
  displayIcon: string;
  levels: { uuid: string; displayName: string; displayIcon?: string }[];
}

export interface ValoApiSpray {
  uuid: string;
  displayName: string;
  displayIcon: string;
  animationGif?: string;
}

export interface ValoApiCard {
  uuid: string;
  displayName: string;
  smallArt: string;
  wideArt?: string;
  largeArt?: string;
}

export interface ValoApiTitle {
  uuid: string;
  displayName: string;
  titleText: string;
}

export interface ValoApiContentTier {
  uuid: string;
  displayName: string;
  devName: string;
  highlightColor: string;
  displayIcon: string;
}
