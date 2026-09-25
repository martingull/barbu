<script lang="ts">
  import CardFace from "../../components/CardFace.svelte";
  import barbuLogo from "../../../src-tauri/icons/128x128@2x.png";
  import type { CatalogCategory, CatalogGameId } from "../../games/tableFactory";
  import type { ContinueGame, SavedGameId } from "./catalogPresentation";
  import type { Card } from "../../domain/types";

  const tableMarkCards: Card[] = [
    { id: "mark-queen", rank: "Q", suit: "S", label: "QS" },
    { id: "mark-king", rank: "K", suit: "H", label: "KH" },
    { id: "mark-ace", rank: "A", suit: "S", label: "AS" }
  ];

  let { categories, savedGames, introduction, onOpen, onContinue, onIntroduction }: {
    categories: CatalogCategory[];
    savedGames: ContinueGame[];
    introduction: { title: string; summary: string; label: string };
    onOpen: (id: CatalogGameId) => void;
    onContinue: (id: SavedGameId) => void;
    onIntroduction: () => void;
  } = $props();
  let latest = $derived(savedGames[0]);
</script>

<div class="catalog-home">
  <header class="catalog-heading">
    <img class="brand-logo" src={barbuLogo} width="56" height="56" alt="" aria-hidden="true" />
    <div class="brand-wordmark"><h1>Barbu</h1><p>The king of cards</p></div>
  </header>

  {#if latest}
    <section class="continue-section" aria-label="Saved games">
      <button class="continue-game" onclick={() => onContinue(latest.id)} type="button" aria-label={`Continue ${latest.title}`}>
        <strong>Continue {latest.title}</strong><span>{latest.summary}</span>
      </button>
      {#if savedGames.length > 1}
        <details>
          <summary>Other saved games ({savedGames.length - 1})</summary>
          {#each savedGames.slice(1) as game (game.id)}
            <button class="saved-game" onclick={() => onContinue(game.id)} type="button" aria-label={`Continue ${game.title}`}>
              <strong>Continue {game.title}</strong><span>{game.summary}</span>
            </button>
          {/each}
        </details>
      {/if}
    </section>
  {/if}

  <section class="first-game" aria-label="Try a game">
    <div><h2>{introduction.title}</h2><p>{introduction.summary}</p></div>
    <button class="{latest ? 'secondary-action' : 'primary-action'}" onclick={onIntroduction} type="button">{introduction.label}</button>
  </section>

  {#each categories as category (category.id)}
    <section class="catalog-group" data-collection={category.id} aria-labelledby={`collection-${category.id}`}>
      <header class="collection-heading">
        <h2 id={`collection-${category.id}`}>{category.title}</h2>
        <p>{category.summary}</p>
      </header>
      <div class="catalog-games">
        {#each category.entries as game (game.id)}
          <button class="catalog-game" aria-label={`Open ${game.title}`} onclick={() => onOpen(game.id)} type="button">
            <span class="game-copy"><strong>{game.title}</strong><span>{game.summary}</span></span>
            {#if game.id === "barbu"}
              <span class="table-mark" aria-hidden="true">
                {#each tableMarkCards as card}<span><CardFace {card} decorative /></span>{/each}
              </span>
            {:else}
              <span class="game-art"><span><CardFace card={{ ...game.card, id: `catalog-${game.id}`, label: `${game.card.rank}${game.card.suit}` }} decorative /></span></span>
            {/if}
          </button>
        {/each}
      </div>
    </section>
  {/each}
</div>

<style>
  .catalog-home { max-width: 880px; margin: 0 auto; color: #f7faf3; }
  .catalog-heading { display: flex; align-items: center; gap: 16px; padding: 10px 4px 22px; }
  .brand-logo {
    display: block; width: 56px; height: 56px; flex: none; object-fit: contain;
    border-radius: 50%; outline: 1px solid #d5c79180; outline-offset: 3px;
    box-shadow: 0 3px 10px #08130d33;
  }
  .brand-wordmark { min-width: 0; }
  h1 { margin: 0; color: #f5f1cf; font-family: Georgia, "Times New Roman", serif; font-size: 2rem; font-weight: 700; line-height: 1.08; }
  .brand-wordmark p { margin-top: 3px; color: #c8d8ca; font-size: 0.8rem; line-height: 1.4; }
  h2 { margin: 0; font-size: 1.05rem; line-height: 1.3; }
  p { margin: 4px 0 0; color: #c8d8ca; font-size: 0.875rem; line-height: 1.4; }
  button, summary { cursor: pointer; }
  button:focus-visible, summary:focus-visible { outline: 2px solid #f5f1cf; outline-offset: 3px; }
  .continue-section { padding: 0 0 12px; }
  .continue-game, .saved-game { display: grid; gap: 4px; width: 100%; text-align: left; padding: 12px; border-radius: 6px; }
  .continue-game { background: #f5f1cf; color: #21372d; border: 1px solid #f5f1cf; }
  .continue-game strong { font-size: 1rem; }
  .continue-game span, .saved-game span { font-size: 0.8rem; line-height: 1.4; overflow-wrap: anywhere; }
  summary { padding: 12px 0; min-height: 44px; color: #c8d8ca; font-size: 0.875rem; }
  .saved-game { background: transparent; color: #f7faf3; border: 0; border-bottom: 1px solid #ffffff26; border-radius: 0; }
  .first-game { display: flex; gap: 12px; justify-content: space-between; align-items: center; padding: 14px 0; border-block: 1px solid #ffffff26; }
  .first-game > div { min-width: 0; }
  .first-game button { flex: none; min-height: 44px; padding: 8px 12px; font-size: 0.875rem; }
  .catalog-group { padding-top: 24px; --collection-accent: #d99b96; }
  .catalog-group[data-collection="partners-tricks"] { --collection-accent: #ddce94; }
  .catalog-group[data-collection="skill-packs"] { --collection-accent: #b3ccd5; }
  .collection-heading { border-left: 3px solid var(--collection-accent); padding-left: 10px; margin-bottom: 12px; }
  .collection-heading h2 { color: #f5f1cf; font-family: Georgia, "Times New Roman", serif; font-size: 1.25rem; line-height: 1.3; }
  .collection-heading p { font-size: 0.8rem; }
  .catalog-games { display: grid; grid-template-columns: minmax(0, 1fr); gap: 8px 12px; }
  .catalog-game { display: grid; grid-template-columns: minmax(0, 1fr) 84px; align-items: center; gap: 12px; min-height: 90px; width: 100%; padding: 12px; border: 1px solid #728a70; border-radius: 6px; background: #285342; color: #f7faf3; text-align: left; }
  .catalog-game:hover { background: #305e4b; }
  .saved-game:hover { background: #ffffff08; }
  .game-art { display: grid; place-items: center; width: 84px; height: 64px; }
  .game-art > span { display: block; width: 34px; height: 48px; transform: rotate(8deg); filter: drop-shadow(0 2px 3px #08130d66); }
  .game-copy { display: grid; gap: 4px; min-width: 0; }
  .game-copy strong { font-size: 1rem; line-height: 1.25; }
  .game-copy > span { color: #e0e9d9; font-size: 0.8rem; line-height: 1.4; }
  .table-mark { position: relative; display: block; flex: none; width: 84px; height: 64px; }
  .table-mark > span { position: absolute; display: block; width: 28px; height: 39.2px; filter: drop-shadow(0 2px 3px #08130d66); }
  .table-mark > span:nth-child(1) { left: 5px; top: 14px; transform: rotate(-12deg); }
  .table-mark > span:nth-child(2) { left: 26px; top: 8px; transform: rotate(2deg); }
  .table-mark > span:nth-child(3) { left: 46px; top: 15px; transform: rotate(13deg); }
  @media (min-width: 640px) {
    .catalog-games { grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); }
    .catalog-group[data-collection="skill-packs"] .catalog-games { max-width: 434px; }
  }
  @media (max-width: 340px) {
    .first-game { align-items: start; flex-direction: column; gap: 8px; }
  }
</style>
