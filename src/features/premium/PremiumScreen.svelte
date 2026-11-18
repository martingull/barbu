<script lang="ts">
  import { onMount } from "svelte";
  import Copy from "@lucide/svelte/icons/copy";
  import Mail from "@lucide/svelte/icons/mail";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import CharacterPortrait from "../../components/CharacterPortrait.svelte";
  import type { createPremiumFeature } from "./premiumFeature";

  let { feature, onBack }: { feature: ReturnType<typeof createPremiumFeature>; onBack: () => void } = $props();
  const paidThrough = $derived($feature.customer?.expiresAt
    ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format($feature.customer.expiresAt)
    : "");
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
      <p>{$feature.customer?.willRenew ? "Current paid period ends" : "Access until"}: {paidThrough}.</p>
      {#if $feature.verificationNeeded}<p>Access is based on your last verified purchase. Reconnect to refresh your subscription status.</p>{/if}
      <button class="primary-action" type="button" disabled={$feature.busy} onclick={() => feature.manage()}>Manage subscription</button>
    </section>
  {:else if !$feature.available}
    <p>Subscriptions are not available in this version.</p>
  {:else if $feature.verificationNeeded}
    <section class="premium-status">
      <h2>{$feature.busy ? "Checking Premium access" : "Reconnect to check Premium"}</h2>
      <p>We have not confirmed your current subscription status. This does not mean your subscription has ended. Check access before subscribing again.</p>
      <p>Your saved games and learning progress are kept. Your free games remain available.</p>
    </section>
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
  {#if $feature.available}
    <p class="purchase-terms">Premium needs an internet connection when you reopen Barbu. While Barbu stays open, verified access can continue offline for up to 24 hours, or until your paid period ends, whichever comes first.</p>
  {/if}
  <div class="purchase-feedback" aria-live="polite">
    {#if $feature.message}<p>{$feature.message}</p>{/if}
    {#if $feature.error}<p role="alert">{$feature.error}</p>{/if}
  </div>
  {#if $feature.available}
    <div class="premium-actions">
      <button class="secondary-action" type="button" disabled={$feature.busy} onclick={() => feature.refresh()}>Check access</button>
      <button class="secondary-action" type="button" disabled={$feature.busy} onclick={() => feature.restore()}>Restore purchases</button>
      <button class="secondary-action" type="button" disabled={$feature.busy} onclick={() => feature.loadOffers()}>Refresh prices</button>
      {#if !$feature.active}
        <button class="secondary-action" type="button" disabled={$feature.busy} onclick={() => feature.manage()}>Manage subscription</button>
      {/if}
    </div>
    <section class="premium-support" aria-labelledby="premium-support-title">
      <h2 id="premium-support-title">Purchase support</h2>
      <p>For billing help or a purchase-data deletion request, contact <span class="support-address">martin@insilicoveritas.org</span>. Share your reference privately, not in public bug reports.</p>
      {#if $feature.supportId}
        <label for="billing-reference">Billing reference</label>
        <div class="billing-reference">
          <input id="billing-reference" type="text" readonly value={$feature.supportId} onfocus={event => event.currentTarget.select()} />
          <button class="secondary-action icon-button" type="button" title="Copy billing reference" aria-label="Copy billing reference" disabled={$feature.busy} onclick={() => feature.copySupportId()}><Copy size={20} aria-hidden="true" /></button>
        </div>
      {:else}
        <button class="secondary-action support-action" type="button" disabled={$feature.busy} onclick={() => feature.loadSupportInfo()}><RefreshCw size={18} aria-hidden="true" />Load billing reference</button>
      {/if}
      <button class="secondary-action support-action" type="button" disabled={$feature.busy || !$feature.supportId} onclick={() => feature.contactSupport()}><Mail size={18} aria-hidden="true" />Contact support</button>
      <p>Your email draft includes this reference and the installed Barbu version, not saved games or payment-card details. Nothing is sent automatically. Deleting purchase data does not cancel Google Play billing.</p>
      <div aria-live="polite">
        {#if $feature.supportMessage}<p role="status">{$feature.supportMessage}</p>{/if}
        {#if $feature.supportError}<p role="alert">{$feature.supportError}</p>{/if}
      </div>
    </section>
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
  .premium-support { padding-top: 20px; margin-top: 20px; border-top: 1px solid #7b9380; }
  .premium-support p, .premium-support label { color: #d0ddd2; font-size: 0.8rem; }
  .support-address { color: #f5f1cf; overflow-wrap: anywhere; }
  .billing-reference { display: grid; grid-template-columns: minmax(0, 1fr) 44px; gap: 8px; margin: 8px 0 12px; }
  .billing-reference input { box-sizing: border-box; width: 100%; min-width: 0; padding: 10px; border: 1px solid #829880; border-radius: 4px; background: #102319; color: #f7faf3; font: 0.8rem monospace; }
  .icon-button { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; }
  .support-action { display: inline-flex; align-items: center; justify-content: center; gap: 8px; margin: 0 0 8px; }
  .support-action :global(svg) { flex-shrink: 0; }
  footer { display: flex; flex-wrap: wrap; gap: 12px; padding: 16px 0; }
  footer button { background: none; border: 0; color: #f5f1cf; text-decoration: underline; cursor: pointer; padding: 8px 0; }
  button:focus-visible { outline: 2px solid #f5f1cf; outline-offset: 3px; }
</style>
