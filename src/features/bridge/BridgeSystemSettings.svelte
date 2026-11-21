<script lang="ts">
  import { bridgeBiddingSystems, type BridgeBiddingSystemId } from "../../domain/bridgeSystems";
  let { system, savedSystem, onSelect }: { system: BridgeBiddingSystemId; savedSystem?: BridgeBiddingSystemId; onSelect: (id: BridgeBiddingSystemId) => void } = $props();
  let profile = $derived(bridgeBiddingSystems[system]);
</script>

<section class="system-settings" aria-label="Bridge bidding system">
  <fieldset>
    <legend>Bidding system</legend>
    <div class="system-options">
      {#each Object.values(bridgeBiddingSystems) as option}
        <button type="button" class="secondary-action" aria-pressed={system === option.id}
          onclick={() => onSelect(option.id)}>{option.name}</button>
      {/each}
    </div>
  </fieldset>
  <details>
    <summary>Partnership agreements</summary>
    <p>{profile.summary}</p>
    <dl>
      <div><dt>Opening 1NT</dt><dd>{profile.oneNt.join("-")} HCP, balanced</dd></div>
      <div><dt>Major opening</dt><dd>{profile.majorLength}+ cards; {profile.openingPoints}+ HCP outside the notrump ranges</dd></div>
      <div><dt>Major support</dt><dd>{profile.raiseSupport}+ cards; raises to 2/3/4 show 6-9/10-12/13+ HCP in these balanced hands</dd></div>
      <div><dt>Strong openings</dt><dd>2NT: {profile.twoNt.join("-")} balanced; 2♣: {profile.strongTwo}+ HCP with 2♦ waiting</dd></div>
      <div><dt>Weak twos</dt><dd>2♦/2♥/2♠: six cards and {profile.weakTwo.join("-")} HCP</dd></div>
      {#if system === "acol-foundation"}
        <div><dt>After 1NT</dt><dd>2♣ Stayman with 11+ HCP and a four-card major. Natural weak takeouts, not transfers.</dd></div>
        <div><dt>Balanced rebids</dt><dd>After a one-level new-suit response: 1NT 15-16, 2NT 17-18, 3NT 19 HCP.</dd></div>
      {/if}
    </dl>
    <p>No transfers, slam conventions or complete competitive convention system. All four seats use this profile.</p>
  </details>
  {#if savedSystem && savedSystem !== system}<p class="saved-system">Saved board: {bridgeBiddingSystems[savedSystem].name}</p>{/if}
</section>

<style>
  .system-settings { margin: 8px 0 16px; padding: 0 0 12px; border-bottom: 1px solid #ffffff26; color: #e7eee1; }
  fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
  legend { padding: 0 0 6px; font-size: 0.875rem; font-weight: 700; }
  .system-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  button { min-width: 0; min-height: 44px; white-space: normal; }
  button[aria-pressed="true"] { background: #f5f1cf; color: #173728; }
  details { margin-top: 8px; font-size: 0.82rem; }
  summary { cursor: pointer; padding: 6px 0; }
  p { margin: 6px 0; line-height: 1.4; }
  dl { margin: 8px 0; }
  dl > div { display: grid; grid-template-columns: minmax(85px, 1fr) minmax(0, 2fr); gap: 8px; padding: 5px 0; border-bottom: 1px solid #ffffff18; }
  dt { font-weight: 700; } dd { margin: 0; }
  .saved-system { font-size: 0.8rem; color: #efb4a9; }
</style>
