import fs from "fs";
import path from "path";
import type { ValoAccount, AccountsData, VPPackage } from "@/types";

const dataDir = path.join(process.cwd(), "src", "data");

export function getAccountsData(): AccountsData {
  const raw = fs.readFileSync(path.join(dataDir, "accounts.json"), "utf-8");
  return JSON.parse(raw) as AccountsData;
}

export function getAccounts(): ValoAccount[] {
  return getAccountsData().accounts;
}

export function getAccountById(id: string): ValoAccount | undefined {
  return getAccounts().find((a) => a.id === id);
}

export function getFeaturedAccounts(): ValoAccount[] {
  return getAccounts().filter((a) => a.featured && a.status === "available");
}

export function getVPPackages(): VPPackage[] {
  const raw = fs.readFileSync(
    path.join(dataDir, "vp-packages.json"),
    "utf-8"
  );
  const data = JSON.parse(raw);
  return data.packages as VPPackage[];
}
