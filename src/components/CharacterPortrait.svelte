<script lang="ts">
  import { learningCharacters, type LearningCharacterId } from "../presentation/learningCharacters";
  let { character = "barbu", size = 48 }: { character?: LearningCharacterId; size?: number } = $props();
  let guide = $derived(learningCharacters[character]);
</script>

<span class="character-portrait" style={`--portrait-size: ${size}px; --portrait-accent: ${guide.accent}`}>
  <img src={guide.portrait} alt={guide.name} draggable="false" />
</span>

<style>
  .character-portrait { display: block; flex: none; position: relative; width: var(--portrait-size); height: var(--portrait-size); overflow: hidden; border: 2px solid var(--portrait-accent); border-radius: 50%; background: #fff; }
  img { display: block; width: 100%; height: 100%; object-fit: contain; pointer-events: none; }
</style>
