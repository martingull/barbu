import App from "./App.svelte";
import { mount } from "svelte";
import "./styles.css";

function applyPlatformInsets() {
  if (/Android/i.test(navigator.userAgent)) {
    document.documentElement.style.setProperty("--app-safe-area-bottom", "48px");
  }
}

applyPlatformInsets();

const app = mount(App, {
  target: document.getElementById("app") as HTMLElement
});

export default app;
