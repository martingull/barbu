import { invoke, isTauri } from "@tauri-apps/api/core";
import type { BillingAdapter } from "./premiumFeature";

export const nativeBilling: BillingAdapter = {
  async request(operation, packageId) {
    if (!isTauri()) {
      if (operation === "availability") return { available: false, purchasesEnabled: false };
      throw new Error("Purchases require the Android version of Barbu");
    }
    return invoke("plugin:barbu-purchases|request", { operation, packageId });
  }
};
