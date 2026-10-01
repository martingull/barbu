import App from "./App.svelte";
import { mount } from "svelte";
import { isTauri } from "@tauri-apps/api/core";
import "./styles/global.css";
import "./styles/table.css";

function applyPlatformInsets() {
  // Native Android reserves system-bar space around the WebView itself.
  if (/Android/i.test(navigator.userAgent) && !isTauri()) {
    document.documentElement.style.setProperty("--app-safe-area-bottom", "48px");
  }
}

applyPlatformInsets();

const app = mount(App, {
  target: document.getElementById("app") as HTMLElement
});

export default app;
