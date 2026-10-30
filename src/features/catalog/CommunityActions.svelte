<script lang="ts">
  import { invoke, isTauri } from "@tauri-apps/api/core";

  const storeUrl = "https://play.google.com/store/apps/details?id=com.martin.barbu";
  const mapsUrl = "https://www.google.com/maps/search/?api=1&query=card+clubs+near+me";
  let sharing = $state(false);
  let openingMaps = $state(false);
  let showLink = $state(false);
  let shareStatus = $state("");
  let mapsError = $state("");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(storeUrl);
      shareStatus = "Link copied.";
    } catch {
      shareStatus = "Copy is unavailable. You can select the link below.";
    }
    showLink = true;
  }

  async function shareBarbu() {
    if (sharing) return;
    sharing = true;
    shareStatus = "";
    try {
      if (typeof navigator.share === "function") {
        await navigator.share({ title: "Barbu - The king of cards", text: "Learn and play classic card games with Barbu.", url: storeUrl });
      } else {
        await copyLink();
      }
    } catch (error) {
      if (!(error instanceof Error && error.name === "AbortError")) {
        showLink = true;
        shareStatus = "Sharing is unavailable. You can copy the link instead.";
      }
    } finally {
      sharing = false;
    }
  }

  async function findClubs(event: MouseEvent) {
    if (!isTauri()) return;
    event.preventDefault();
    if (openingMaps) return;
    openingMaps = true;
    mapsError = "";
    try {
      await invoke("open_card_clubs");
    } catch {
      mapsError = "Could not open Google Maps. Please try again.";
    } finally {
      openingMaps = false;
    }
  }
</script>

<section class="community-actions" aria-labelledby="community-title">
  <h2 id="community-title">Play with others</h2>
  <div class="actions">
    <button type="button" onclick={shareBarbu} disabled={sharing} aria-busy={sharing}>
      <strong>Share Barbu</strong><span>Google Play</span>
    </button>
    <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onclick={findClubs} aria-busy={openingMaps}>
      <strong>Get out and play</strong><span>Find card clubs on Google Maps</span>
    </a>
  </div>
  {#if shareStatus}<p role="status">{shareStatus}</p>{/if}
  {#if showLink}
    <div class="share-link">
      <label for="barbu-share-link">Google Play link</label>
      <input id="barbu-share-link" type="text" readonly value={storeUrl} onfocus={event => event.currentTarget.select()} />
      <button type="button" onclick={copyLink}>Copy link</button>
    </div>
  {/if}
  {#if mapsError}<p role="alert">{mapsError}</p>{/if}
</section>

<style>
  .community-actions { margin-top: 24px; padding-top: 18px; border-top: 1px solid #ffffff26; }
  h2 { margin: 0 0 12px; color: #f5f1cf; font-size: 1.05rem; }
  .actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
  button, a { min-height: 48px; padding: 12px; border: 1px solid #728a70; border-radius: 6px; background: transparent; color: #f7faf3; cursor: pointer; text-align: left; text-decoration: none; }
  .actions button, .actions a { display: grid; align-content: start; gap: 5px; }
  strong { font-size: 0.9rem; line-height: 1.4; }
  span, p, label { color: #c8d8ca; font-size: 0.8rem; line-height: 1.4; }
  p { margin: 10px 0 0; }
  button, a, input { min-width: 0; overflow-wrap: anywhere; }
  button:hover, a:hover { background: #ffffff08; }
  button:disabled { opacity: 0.6; cursor: wait; }
  button:focus-visible, a:focus-visible, input:focus-visible { outline: 2px solid #f5f1cf; outline-offset: 3px; }
  .share-link { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px; margin-top: 12px; }
  label { grid-column: 1 / -1; }
  input { width: 100%; padding: 10px; border: 1px solid #728a70; border-radius: 4px; background: #102319; color: #f7faf3; font: inherit; font-size: 0.8rem; }
  .share-link button { font-size: 0.8rem; }
  @media (max-width: 340px) { .actions { grid-template-columns: minmax(0, 1fr); } }
</style>
