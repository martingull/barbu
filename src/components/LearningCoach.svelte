<script lang="ts">
  import CharacterPortrait from "./CharacterPortrait.svelte";
  import { formatCardText } from "../presentation/cardDisplay";
  import { learningCharacters, type LearningCharacterId } from "../presentation/learningCharacters";
  let { character = "barbu", message, compact = false }: { character?: LearningCharacterId; message: string; compact?: boolean } = $props();
</script>

<div class="learning-coach" class:compact>
  <CharacterPortrait {character} size={compact ? 36 : 64} />
  <div><strong>{learningCharacters[character].name}</strong><p>{formatCardText(message)}</p></div>
</div>

<style>
  .learning-coach { display: flex; align-items: center; gap: 14px; min-width: 0; color: #f7faf3; }
  .learning-coach > div { min-width: 0; }
  strong { display: block; font-size: 0.75rem; color: #e7c766; margin-bottom: 4px; }
  p { margin: 0; font-size: 0.94rem; line-height: 1.45; overflow-wrap: anywhere; }
  .compact { gap: 10px; align-items: flex-start; }
  .compact p { font-size: 0.85rem; }
</style>
