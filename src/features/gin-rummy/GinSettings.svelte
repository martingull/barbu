<script lang="ts">
  import { defaultGinSettings, type GinSettings } from "../../domain/ginRummyRules";
  import { ginProfileNames, ginScoringAgreement, ginSettingsSummary } from "../../presentation/ginRummyDisplay";
  let { settings, savedSettings, hasSaved = false, onSelect }: {
    settings: GinSettings; savedSettings?: GinSettings; hasSaved?: boolean; onSelect: (settings: GinSettings) => void;
  } = $props();
  let saved = $derived(savedSettings ?? defaultGinSettings);
  const profiles = ["classic", "american"] as const;
</script>

<section class="gin-settings" aria-label="Gin Rummy scoring settings">
  <fieldset><legend>Scoring</legend>
    <div class="options">
      {#each profiles as profile}
        <button class="secondary-action" type="button" aria-pressed={settings.profile === profile}
          onclick={() => onSelect({ profile })}>{ginProfileNames[profile]}</button>
      {/each}
    </div>
  </fieldset>
  <details><summary>Scoring agreement</summary><p>{ginScoringAgreement(settings)}</p>
    <p>Both profiles use ten cards, a ten-point knock limit and no immediate return of a taken upcard. These are scoring agreements, not Oklahoma Gin or association tournament rules.</p>
  </details>
  {#if hasSaved && saved.profile !== settings.profile}
    <p class="saved-settings">Saved game: {ginSettingsSummary(saved)}.</p>
  {/if}
</section>

<style>
  .gin-settings { display: grid; gap: 10px; color: #e7eee1; }
  fieldset { margin: 0; padding: 0; border: 0; min-width: 0; }
  legend { padding: 0 0 6px; font-size: 0.875rem; font-weight: 700; }
  .options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 6px; }
  button { min-width: 0; min-height: 44px; white-space: normal; }
  button[aria-pressed="true"] { background: #f5f1cf; color: #173728; }
  details, .saved-settings { font-size: 0.82rem; }
  summary { cursor: pointer; padding: 4px 0; }
  p { margin: 6px 0; line-height: 1.4; }
  .saved-settings { margin: 0; color: #efb4a9; }
</style>
