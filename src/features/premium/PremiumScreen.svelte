<script lang="ts">
  import { onMount } from "svelte";
  import CharacterPortrait from "../../components/CharacterPortrait.svelte";
  import type { createPremiumFeature } from "./premiumFeature";

  let { feature, onBack }: { feature: ReturnType<typeof createPremiumFeature>; onBack: () => void } = $props();
  onMount(() => { void feature.loadOffers(); });
</script>

<section class="premium-screen" aria-label="Barbu Premium">
  <header class="topbar">
    <button class="back-button" type="button" onclick={onBack}>Table</button>
    <h1>Barbu Premium</h1>
  </header>
  <div class="premium-intro">
    <CharacterPortrait character="barbu" size={64} />
    <div><h2>More games for your table</h2><p>Canasta lessons, guided hands and full games. Your existing free games stay free.</p></div>
  </div>
  {#if $feature.active}
    <section class="premium-status">
      <h2>Premium is active</h2>
      <p>{$feature.customer?.willRenew ? "Your subscription renews through Google Play." : "Renewal is off. Access continues until the end of your paid period."}</p>
      <button class="primary-action" type="button" disabled={$feature.busy} onclick={() => feature.manage()}>Manage subscription</button>
    </section>
  {:else if !$feature.available}
    <p>Subscriptions are not available in this version.</p>
  {:else if !$feature.purchasesEnabled}
    <p>New subscriptions are not available yet. You can still restore an existing purchase.</p>
  {:else}
    <div class="premium-plans" aria-label="Subscription plans">
      {#each $feature.offers as offer (offer.id)}
        <div class="premium-plan">
          <h2>{offer.period === "month" ? "Monthly" : "Yearly"}</h2>
          <p class="price">{offer.price} / {offer.period}</p>
          <p>Renews automatically every {offer.period} until cancelled.</p>
          <button class="primary-action" type="button" disabled={$feature.busy} onclick={() => feature.purchase(offer.id)}>Subscribe for {offer.price} / {offer.period}</button>
        </div>
      {:else}
        <p>{$feature.busy ? "Loading subscription prices..." : "Subscription prices are unavailable. Please try again."}</p>
      {/each}
    </div>
    <p class="purchase-terms">Payment is charged to your Google Play account. Manage or cancel your subscription in Google Play. Cancellation stops future renewal; access continues for the paid period.</p>
  {/if}
  <div class="purchase-feedback" aria-live="polite">
    {#if $feature.message}<p>{$feature.message}</p>{/if}
    {#if $feature.error}<p role="alert">{$feature.error}</p>{/if}
  </div>
  {#if $feature.available}
    <div class="premium-actions">
      <button class="secondary-action" type="button" disabled={$feature.busy} onclick={() => feature.restore()}>Restore purchases</button>
      <button class="secondary-action" type="button" disabled={$feature.busy} onclick={() => feature.loadOffers()}>Refresh prices</button>
    </div>
    <footer>
      <button type="button" disabled={$feature.busy} onclick={() => feature.openLegal("terms")}>Terms of Service</button>
      <button type="button" disabled={$feature.busy} onclick={() => feature.openLegal("privacy")}>Privacy policy</button>
    </footer>
  {/if}
</section>

<style>
  .premium-screen { max-width: 640px; margin: 0 auto; color: #f7faf3; }
  .topbar { display: flex; justify-content: start; gap: 12px; }
  h1 { font-size: 1.4rem; margin: 0; }
  h2 { font-size: 1.1rem; margin: 0 0 8px; }
  p { font-size: 0.9rem; line-height: 1.5; margin: 6px 0; }
  .premium-intro { display: flex; align-items: center; gap: 16px; padding: 20px 0; border-bottom: 1px solid #7b9380; }
  .premium-intro > div { min-width: 0; }
  .premium-plans { display: grid; gap: 12px; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); padding: 20px 0; }
  .premium-plan { border: 1px solid #829880; border-radius: 6px; padding: 16px; background: #254c3f; }
  .price { font-size: 1.4rem; color: #f5f1cf; }
  .premium-plan button { width: 100%; margin-top: 12px; }
  button { min-height: 44px; white-space: normal; overflow-wrap: anywhere; }
  .purchase-terms { color: #d0ddd2; font-size: 0.8rem; }
  .premium-status { padding: 20px 0; }
  .premium-status button { margin-top: 12px; }
  .purchase-feedback { min-height: 48px; padding: 8px 0; }
  .premium-actions { display: flex; flex-wrap: wrap; gap: 12px; }
  footer { display: flex; flex-wrap: wrap; gap: 12px; padding: 16px 0; }
  footer button { background: none; border: 0; color: #f5f1cf; text-decoration: underline; cursor: pointer; padding: 8px 0; }
  button:focus-visible { outline: 2px solid #f5f1cf; outline-offset: 3px; }
</style>
