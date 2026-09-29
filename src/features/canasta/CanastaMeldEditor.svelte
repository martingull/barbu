<script lang="ts">
  import CanastaCards from "./CanastaCards.svelte";
  import { canastaRanks, canastaValue, isCanastaWild, initialCanastaMinimum, type MeldRequest } from "../../domain/canastaRules";
  import { canastaObservation, suggestedCanastaMelds } from "../../domain/canastaPolicy";
  import { transitionCanastaSession, type CanastaSession, type CanastaAction } from "../../domain/canastaSession";
  import { formatCardList } from "../../presentation/cardDisplay";
  let { session, pickup = false, onConfirm, onClose }: {
    session: CanastaSession; pickup?: boolean; onConfirm: (action: CanastaAction) => boolean; onClose: () => void;
  } = $props();
  let dialog: HTMLDialogElement;
  let selected = $state<string[]>([]), groups = $state<MeldRequest[]>([]), target = $state(""), localError = $state("");
  const hand = $derived(session.hand.hands[0]);
  const available = $derived(hand.filter(card => !groups.some(group => group.cardIds.includes(card.id))));
  const chosen = $derived(available.filter(card => selected.includes(card.id)));
  const rank = $derived(target || chosen.find(card => !isCanastaWild(card))?.rank || "Wild");
  const top = $derived(session.hand.discards.at(-1));
  const pair = $derived(hand.filter(card => card.rank === top?.rank && !isCanastaWild(card)).slice(0, 2).map(card => card.id));
  const action = $derived<CanastaAction>(pickup ? { type: "pickup", pair, groups } : { type: "meld", groups });
  const validation = $derived.by(() => {
    try { transitionCanastaSession(session, action); return ""; } catch (cause) { return (cause as Error).message; }
  });
  const points = $derived(hand.filter(card => groups.some(group => group.cardIds.includes(card.id))).reduce((sum, card) => sum + canastaValue(card), 0));
  $effect(() => { dialog.showModal(); });
  function stage() {
    if (!selected.length) return;
    const existing = groups.find(group => group.rank === rank);
    groups = existing ? groups.map(group => group.rank === rank ? { ...group, cardIds: [...group.cardIds, ...selected] } : group) : [...groups, { rank, cardIds: [...selected] }];
    selected = []; target = ""; localError = "";
  }
  function suggest() {
    const suggested = suggestedCanastaMelds(canastaObservation(session), pickup ? pair : undefined);
    if (!suggested.length) { localError = "No opening found. You can choose your own groups or draw from stock."; return; }
    groups = suggested; selected = []; localError = "";
  }
</script>

<dialog bind:this={dialog} oncancel={onClose} aria-labelledby="canasta-meld-title">
  <div class="editor">
    <header><h2 id="canasta-meld-title">{pickup ? "Take discard pile" : "Build melds"}</h2><button class="secondary-action" onclick={onClose} type="button">Cancel</button></header>
    <p>{session.hand.sides[0].opened ? "Add to your partnership's melds." : `Opening: ${points} / ${initialCanastaMinimum(session.scores[0])} points`}</p>
    {#if pickup}<p>Top discard: {top ? formatCardList([top]) : "Empty"}. Your matching pair is included when taking the pile.</p>{/if}
    <div class="drafts" aria-label="Staged melds">
      {#each groups as group}
        <div><span><strong>{group.rank}</strong> {formatCardList(hand.filter(card => group.cardIds.includes(card.id)))}</span>
          <button class="secondary-action" onclick={() => { groups = groups.filter(item => item !== group); }} type="button" aria-label={`Remove ${group.rank} group`}>Remove</button></div>
      {:else}<p>No cards staged</p>{/each}
    </div>
    <CanastaCards cards={available} {selected} onSelect={card => { selected = selected.includes(card.id) ? selected.filter(id => id !== card.id) : [...selected, card.id]; target = ""; }} label="Cards for melding" />
    {#if chosen.length && chosen.every(isCanastaWild)}
      <fieldset><legend>Meld rank</legend><div class="ranks">{#each canastaRanks.filter(value => value !== "7") as value}
        <label><input type="radio" name="meld-rank" value={value} checked={rank === value} onchange={() => { target = value; }} />{value}</label>
      {/each}</div></fieldset>
    {/if}
    <div class="controls"><button class="secondary-action" onclick={suggest} type="button">Suggest groups</button>
      <button class="secondary-action" disabled={!selected.length} onclick={stage} type="button">Stage {selected.length || ""} cards</button></div>
    <p class="validation" role="status">{localError || validation || "Ready to meld."}</p>
    <button class="primary-action" disabled={!!validation} onclick={() => { if (onConfirm(action)) onClose(); }} type="button">{pickup ? "Confirm pickup" : "Confirm melds"}</button>
  </div>
</dialog>
<style>
  dialog { width: min(520px, calc(100% - 24px)); max-height: calc(100dvh - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px) - 32px); padding: 14px; border: 1px solid #789c86; border-radius: 8px; background: #183e2e; color: #f7faf3; }
  dialog::backdrop { background: #0009; }
  .editor { display: flex; flex-direction: column; gap: 10px; }
  header, .controls { display: flex; gap: 8px; align-items: center; justify-content: space-between; }
  h2 { font-size: 1.15rem; margin: 0; } p { margin: 0; font-size: 0.82rem; line-height: 1.35; }
  button { min-height: 44px; padding: 8px 12px; font-size: 0.85rem; } .controls button { flex: 1; }
  .drafts { max-height: 110px; min-height: 44px; overflow: auto; border-block: 1px solid #ffffff30; }
  .drafts > div { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 3px 0; font-size: 0.8rem; }
  .drafts p { padding: 12px 0; color: #c4d9cb; }.validation { min-height: 2.7em; color: #f0d998; }
  fieldset { margin: 0; padding: 4px; border: 0; font-size: 0.8rem; }.ranks { display: flex; flex-wrap: wrap; gap: 4px; }.ranks label { display: flex; gap: 3px; align-items: center; min-height: 32px; padding: 3px; }
</style>
