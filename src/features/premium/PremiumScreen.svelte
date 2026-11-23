<script lang="ts">
  import { onMount } from "svelte";
  import Copy from "@lucide/svelte/icons/copy";
  import Mail from "@lucide/svelte/icons/mail";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import ExternalLink from "@lucide/svelte/icons/external-link";
  import CharacterPortrait from "../../components/CharacterPortrait.svelte";
  import type { createPremiumFeature } from "./premiumFeature";

  let { feature, onBack }: { feature: ReturnType<typeof createPremiumFeature>; onBack: () => void } = $props();
  let selectedOfferId = $state("");
  let supportRequested = $state(false);
  const selectedOffer = $derived($feature.offers.find(offer => offer.id === selectedOfferId)
    ?? $feature.offers.find(offer => offer.period === "month") ?? $feature.offers[0]);
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
    <CharacterPortrait character="barbu" size={48} />
    <div>
      <h2>{$feature.active ? "Premium is active" : "More games for your table"}</h2>
      <p>Canasta and Euchre lessons, guided hands and full games.{$feature.active ? "" : " Your existing free games stay free."}</p>
    </div>
  </div>
  {#if $feature.active}
    <section class="premium-status">
      <p>{$feature.customer?.willRenew ? "Your subscription renews through Google Play." : "Renewal is off. Access continues until the end of your paid period."}</p>
      <p>{$feature.customer?.willRenew ? "Current paid period ends" : "Access until"}: {paidThrough}.</p>
      {#if $feature.verificationNeeded}<p>Access is based on your last verified purchase. Reconnect to refresh your subscription status.</p>{/if}
      <button class="primary-action full-width" type="button" disabled={$feature.busy} onclick={() => feature.manage()}><ExternalLink size={18} aria-hidden="true" />Manage or cancel subscription</button>
      {#if $feature.verificationNeeded}
        <button class="link-action" type="button" disabled={$feature.busy} onclick={() => feature.refresh()}><RefreshCw size={18} aria-hidden="true" />Check access</button>
      {/if}
    </section>
  {:else if !$feature.available}
    <p>Subscriptions are not available in this version.</p>
  {:else if $feature.verificationNeeded}
    <section class="premium-status">
      <h2>{$feature.busy ? "Checking Premium access" : "Reconnect to check Premium"}</h2>
      <p>This does not mean your subscription has ended. Check access before subscribing again. Your games and progress are kept.</p>
      <button class="primary-action full-width" type="button" disabled={$feature.busy} onclick={() => feature.refresh()}><RefreshCw size={18} aria-hidden="true" />Check access</button>
    </section>
  {:else if !$feature.purchasesEnabled}
    <p>New subscriptions are not available yet. You can still restore an existing purchase.</p>
  {:else}
    {#if selectedOffer}
      <fieldset class="premium-plans" aria-label="Subscription plans" disabled={$feature.busy}>
        <legend>Choose a plan</legend>
        {#each $feature.offers as offer (offer.id)}
          <label class="premium-plan" class:chosen={selectedOffer.id === offer.id}>
            <input type="radio" name="premium-plan" value={offer.id} checked={selectedOffer.id === offer.id} onchange={() => { selectedOfferId = offer.id; }} />
            <span>{offer.period === "month" ? "Monthly" : "Yearly"}</span>
            <strong>{offer.price} / {offer.period}</strong>
          </label>
        {/each}
      </fieldset>
      <button class="primary-action full-width" type="button" disabled={$feature.busy} onclick={() => { if (selectedOffer) void feature.purchase(selectedOffer.id); }}>Subscribe for {selectedOffer.price} / {selectedOffer.period}</button>
      <p class="purchase-terms">Charged through Google Play. Renews automatically every {selectedOffer.period} until cancelled. Cancel in Google Play; access continues for the paid period.</p>
    {:else}
      <div class="premium-status">
        <p>{$feature.busy ? "Loading subscription prices..." : "Subscription prices are unavailable."}</p>
        <button class="link-action" type="button" disabled={$feature.busy} onclick={() => feature.loadOffers()}><RefreshCw size={18} aria-hidden="true" />Refresh prices</button>
      </div>
    {/if}
    <p class="purchase-terms">Internet is needed to verify access when you reopen Barbu.</p>
  {/if}
  {#if $feature.message || $feature.error}
    <div class="purchase-feedback" aria-live="polite">
      {#if $feature.message}<p>{$feature.message}</p>{/if}
      {#if $feature.error}<p role="alert">{$feature.error}</p>{/if}
    </div>
  {/if}
  {#if $feature.available}
    {#if !$feature.active}
      <button class="link-action" type="button" disabled={$feature.busy} onclick={() => feature.manage()}><ExternalLink size={18} aria-hidden="true" />Manage or cancel subscription</button>
    {/if}
    <section class="premium-support" aria-label="Purchase support">
      <button class="link-action" type="button" disabled={$feature.busy} onclick={() => { supportRequested = true; void feature.contactSupport(); }}><Mail size={18} aria-hidden="true" />Contact support</button>
      {#if supportRequested && ($feature.supportMessage || $feature.supportError)}
        <div class="purchase-feedback" aria-live="polite">
          {#if $feature.supportMessage}<p role="status">{$feature.supportMessage}</p>{/if}
          {#if $feature.supportError}<p role="alert">{$feature.supportError}</p>{/if}
        </div>
      {/if}
      <details class="premium-help">
        <summary>Purchase help</summary>
        <div class="premium-help-content">
          {#if !supportRequested && ($feature.supportMessage || $feature.supportError)}
            <div class="purchase-feedback" aria-live="polite">
              {#if $feature.supportMessage}<p role="status">{$feature.supportMessage}</p>{/if}
              {#if $feature.supportError}<p role="alert">{$feature.supportError}</p>{/if}
            </div>
          {/if}
          <div class="recovery-actions">
            <button class="link-action" type="button" disabled={$feature.busy} onclick={() => feature.restore()}><RotateCcw size={18} aria-hidden="true" />Restore purchases</button>
            {#if !$feature.verificationNeeded}
              <button class="link-action" type="button" disabled={$feature.busy} onclick={() => feature.refresh()}><RefreshCw size={18} aria-hidden="true" />Check access</button>
            {/if}
          </div>
          <p>Restore an existing subscription using the Google Play account that bought it.</p>
          <p>Premium needs internet when you reopen Barbu. While it stays open, verified access can continue offline for up to 24 hours or until your paid period ends, whichever comes first.</p>
          <p>For billing help or purchase-data requests: <span class="support-address">martin@insilicoveritas.org</span>.</p>
          {#if $feature.supportId}
            <label for="billing-reference">Billing reference</label>
            <div class="billing-reference">
              <input id="billing-reference" type="text" readonly value={$feature.supportId} onfocus={event => event.currentTarget.select()} />
              <button class="secondary-action icon-button" type="button" title="Copy billing reference" aria-label="Copy billing reference" disabled={$feature.busy} onclick={() => feature.copySupportId()}><Copy size={20} aria-hidden="true" /></button>
            </div>
          {:else}
            <button class="link-action" type="button" disabled={$feature.busy} onclick={() => feature.loadSupportInfo()}><RefreshCw size={18} aria-hidden="true" />Load billing reference</button>
          {/if}
          <p>Your support email includes the billing reference and Barbu version, not saved games or payment-card details. Nothing is sent automatically. Share the reference privately. Deleting purchase data does not cancel Google Play billing.</p>
        </div>
      </details>
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
  h1 { font-size: 1.3rem; margin: 0; }
  h2 { font-size: 1.1rem; margin: 0 0 8px; }
  p { font-size: 0.9rem; line-height: 1.5; margin: 6px 0; }
  .premium-intro { display: flex; align-items: center; gap: 12px; padding: 16px 0; border-bottom: 1px solid #ffffff26; }
  .premium-intro > div { min-width: 0; }
  .premium-plans { display: grid; gap: 8px; min-width: 0; margin: 16px 0 12px; padding: 0; border: 0; }
  legend { margin-bottom: 8px; padding: 0; font-size: 0.85rem; color: #d0ddd2; }
  .premium-plan { display: grid; grid-template-columns: 20px minmax(0, 1fr); column-gap: 10px; align-items: center; min-height: 64px; box-sizing: border-box; border: 1px solid #7b9380; border-radius: 6px; padding: 10px 12px; cursor: pointer; }
  .premium-plan.chosen { background: #254c3f; border-color: #f5f1cf; }
  .premium-plan input { grid-row: span 2; width: 18px; height: 18px; margin: 0; accent-color: #f5f1cf; }
  .premium-plan span { font-size: 0.85rem; color: #d0ddd2; }
  .premium-plan strong { font-size: 1rem; color: #f5f1cf; overflow-wrap: anywhere; }
  button { min-height: 44px; white-space: normal; overflow-wrap: anywhere; }
  .full-width { display: flex; align-items: center; justify-content: center; gap: 8px; width: 100%; }
  button :global(svg) { flex-shrink: 0; }
  .purchase-terms { color: #d0ddd2; font-size: 0.8rem; }
  .premium-status { padding: 12px 0; }
  .premium-status button { margin-top: 12px; }
  .purchase-feedback { padding: 4px 0; }
  .link-action { display: flex; align-items: center; gap: 8px; padding: 8px 0; background: none; border: 0; border-radius: 0; color: #f5f1cf; font: inherit; font-size: 0.85rem; text-align: left; cursor: pointer; }
  .link-action:disabled { cursor: default; opacity: 0.55; }
  .premium-support { margin-top: 4px; }
  .premium-help { border-top: 1px solid #ffffff26; border-bottom: 1px solid #ffffff26; }
  summary { min-height: 44px; box-sizing: border-box; padding: 12px 0; color: #d0ddd2; font-size: 0.85rem; cursor: pointer; }
  summary:focus-visible { outline: 2px solid #f5f1cf; outline-offset: 3px; }
  .premium-help-content { padding: 0 0 12px; }
  .premium-help p, .premium-help label { color: #d0ddd2; font-size: 0.8rem; }
  .premium-help p { margin: 8px 0; }
  .recovery-actions { display: flex; flex-wrap: wrap; gap: 0 20px; }
  .support-address { color: #f5f1cf; overflow-wrap: anywhere; }
  .billing-reference { display: grid; grid-template-columns: minmax(0, 1fr) 44px; gap: 8px; margin: 8px 0 12px; }
  .billing-reference input { box-sizing: border-box; width: 100%; min-width: 0; padding: 10px; border: 1px solid #829880; border-radius: 4px; background: #102319; color: #f7faf3; font: 0.8rem monospace; }
  .icon-button { display: grid; place-items: center; width: 44px; height: 44px; padding: 0; }
  footer { display: flex; flex-wrap: wrap; gap: 12px; padding: 8px 0; }
  footer button { background: none; border: 0; color: #d0ddd2; font-size: 0.8rem; text-decoration: underline; cursor: pointer; padding: 8px 0; }
  button:focus-visible { outline: 2px solid #f5f1cf; outline-offset: 3px; }
</style>
