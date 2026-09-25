<script lang="ts">
  import BarbuGame from "./features/barbu/BarbuGame.svelte";
  import BridgeGame from "./features/bridge/BridgeGame.svelte";
  import SpadesGame from "./features/spades/SpadesGame.svelte";
  import HeartsGame from "./features/hearts/HeartsGame.svelte";
  import WhistGame from "./features/whist/WhistGame.svelte";
  import CardCountingGame from "./features/card-counting/CardCountingGame.svelte";
  import { createBarbuFeature } from "./features/barbu/barbuFeature";
  import { createBridgeFeature } from "./features/bridge/bridgeFeature";
  import { createSpadesFeature } from "./features/spades/spadesFeature";
  import { createHeartsFeature } from "./features/hearts/heartsFeature";
  import { createWhistFeature } from "./features/whist/whistFeature";
  import type { LearningEntry } from "./features/featureServices";
  import type { PlayBarbuAttempt } from "./lessons/drillReview";
  import { invoke, isTauri } from "@tauri-apps/api/core";
  import CardFace from "./CardFace.svelte";
  import "./games";
  import { referenceCatalog, type GameReference } from "./referenceCatalog";
  import { getCatalogCategories, type ActiveGameTable, type CatalogGameId } from "./tableFactory";
  import type { Card, GuidedCardOutcome, PracticeReason } from "./lessonTypes";

  type AppView = "catalog" | "barbuFeature" | "heartsFeature" | "whistFeature" | "spadesFeature" | "bridgeFeature" | "cardCountingFeature" | "reference";
  const catalogCategories = getCatalogCategories();
  const privacyPolicyUrl = "https://martingull.github.io/barbu/privacy-policy.html";
  let privacyPolicyError = "";
  let openingPrivacyPolicy = false;
  const progressStorageKey = "barbu.courseProgress.v1";
  const practiceSeedStorageKey = "barbu.practiceSeed.v1";
  const playBarbuHistoryStorageKey = "barbu.playHistory.v1";
  const maxStoredPlayBarbuAttempts = 8;
  const cleanDrillOutcomes: Array<GuidedCardOutcome | "illegal"> = ["good"];
  const catalogTableCards: Card[] = [
    { id: "catalog-queen-spades", rank: "Q", suit: "S", label: "QS" },
    { id: "catalog-king-hearts", rank: "K", suit: "H", label: "KH" },
    { id: "catalog-ace-spades", rank: "A", suit: "S", label: "AS" }
  ];

  let appView: AppView = "catalog";
  let activeGameTable: ActiveGameTable = "barbu";
  let activeReferenceId = referenceCatalog[0].id;
  let practiceSeed = loadPracticeSeed();
  let completedPathSteps = loadCourseProgress();
  let playBarbuHistory = loadPlayBarbuHistory();
  let barbuEntry: LearningEntry | undefined;
  let barbuFixedSurface = false;
  let whistFixedSurface = false;
  let heartsFixedSurface = false;
  let spadesFixedSurface = false;
  let bridgeFixedSurface = false;
  let cardCountingFixedSurface = false;
  const services = { storage: () => typeof localStorage === "undefined" ? undefined : localStorage, nextSeed: usePracticeSeed };
  const barbuFeature = createBarbuFeature(services);
  const whistFeature = createWhistFeature(services);
  const heartsFeature = createHeartsFeature(services);
  const spadesFeature = createSpadesFeature(services);
  const bridgeFeature = createBridgeFeature(services);
  $: activeReference = referenceCatalog.find(reference => reference.id === activeReferenceId) ?? referenceCatalog[0];
  $: activeReferenceIsBarbu = activeReference.id === "barbu";

  function loadCourseProgress() {
    try {
      if (typeof localStorage === "undefined") return {};
      const storedProgress = localStorage.getItem(progressStorageKey);
      return storedProgress ? (JSON.parse(storedProgress) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  }


  function saveCourseProgress(nextProgress: Record<string, boolean>) {
    completedPathSteps = nextProgress;

    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(progressStorageKey, JSON.stringify(nextProgress));
    } catch { /* Progress remains available for this session. */ }
  }


  function loadPlayBarbuHistory(): PlayBarbuAttempt[] {
    try {
      if (typeof localStorage === "undefined") return [];
      const storedHistory = localStorage.getItem(playBarbuHistoryStorageKey);
      return storedHistory ? normalizePlayBarbuHistory(JSON.parse(storedHistory) as PlayBarbuAttempt[]) : [];
    } catch {
      return [];
    }
  }


  function normalizePlayBarbuHistory(history: PlayBarbuAttempt[]) {
    return history.map((attempt) => ({
      ...attempt,
      results: attempt.results.map((result) => {
        const outcome = normalizeStoredOutcome(result.outcome);

        return {
          ...result,
          outcome,
          reason: normalizeStoredReason(result.reason, outcome),
          clean: cleanDrillOutcomes.includes(outcome)
        };
      })
    }));
  }


  function normalizeStoredOutcome(outcome: string): GuidedCardOutcome | "illegal" {
    if (outcome === "best" || outcome === "safe" || outcome === "forced" || outcome === "good") {
      return "good";
    }

    if (outcome === "risky" || outcome === "penalty" || outcome === "illegal") {
      return outcome;
    }

    return "risky";
  }


  function normalizeStoredReason(reason: string | undefined, outcome: GuidedCardOutcome | "illegal"): PracticeReason {
    if (
      reason === "followed_suit" ||
      reason === "void_discard" ||
      reason === "avoided_penalty" ||
      reason === "captured_penalty" ||
      reason === "won_clean_trick" ||
      reason === "off_suit"
    ) {
      return reason;
    }

    if (outcome === "illegal") {
      return "off_suit";
    }

    if (outcome === "penalty") {
      return "captured_penalty";
    }

    return outcome === "risky" ? "won_clean_trick" : "followed_suit";
  }


  function savePlayBarbuHistory(nextHistory: PlayBarbuAttempt[]) {
    playBarbuHistory = nextHistory.slice(0, maxStoredPlayBarbuAttempts);

    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(playBarbuHistoryStorageKey, JSON.stringify(playBarbuHistory));
    } catch { /* Review history remains available for this session. */ }
  }


  function loadPracticeSeed() {
    let storedSeed = 0;
    try {
      if (typeof localStorage !== "undefined") storedSeed = Number(localStorage.getItem(practiceSeedStorageKey));
    }
    catch { /* Use a fresh seed when local storage is unavailable. */ }

    if (Number.isInteger(storedSeed) && storedSeed > 0) {
      return storedSeed;
    }

    const dateSeed = Math.floor(Date.now() / 1000) % 1_000_000;
    return Math.max(1, dateSeed);
  }


  function usePracticeSeed() {
    const seed = practiceSeed;
    practiceSeed += 1;

    try {
      if (typeof localStorage !== "undefined") localStorage.setItem(practiceSeedStorageKey, String(practiceSeed));
    } catch { /* The in-memory seed still advances without persistence. */ }

    return seed;
  }


  function openCatalog() {
    appView = "catalog";
  }


  async function openPrivacyPolicy(event: MouseEvent) {
    if (!isTauri()) return;
    event.preventDefault();
    if (openingPrivacyPolicy) return;

    openingPrivacyPolicy = true;
    privacyPolicyError = "";
    try {
      await invoke("open_privacy_policy");
    } catch {
      privacyPolicyError = "Could not open your browser. Please try again.";
    } finally {
      openingPrivacyPolicy = false;
    }
  }


  function openBarbuTable() {
    activeGameTable = "barbu";
    barbuFeature.openTable();
    barbuEntry = undefined;
    appView = "barbuFeature";
  }


  function openHeartsTable() {
    activeGameTable = "hearts";
    heartsFeature.openTable();
    appView = "heartsFeature";
  }


  function openWhistTable() {
    activeGameTable = "whist";
    whistFeature.openTable();
    appView = "whistFeature";
  }


  function openSpadesTable() {
    activeGameTable = "spades";
    spadesFeature.openTable();
    appView = "spadesFeature";
  }


  function openBridgeTable() {
    activeGameTable = "bridge";
    bridgeFeature.openTable();
    appView = "bridgeFeature";
  }


  function openActiveGameTable() {
    if (activeGameTable === "hearts") {
      openHeartsTable();
      return;
    }

    if (activeGameTable === "whist") {
      openWhistTable();
      return;
    }

    if (activeGameTable === "spades") {
      openSpadesTable();
      return;
    }

    if (activeGameTable === "bridge") {
      openBridgeTable();
      return;
    }

    openBarbuTable();
  }


  function openReference(referenceId = "barbu") {
    const reference = referenceCatalog.find((item) => item.id === referenceId);

    if (!reference) {
      return;
    }

    activeReferenceId = reference.id;
    appView = "reference";
  }


  function openGame(gameId: CatalogGameId) {
    if (gameId === "hearts") {
      openHeartsTable();
      return;
    }

    if (gameId === "whist") {
      openWhistTable();
      return;
    }

    if (gameId === "spades") {
      openSpadesTable();
      return;
    }

    if (gameId === "bridge") {
      openBridgeTable();
      return;
    }

    if (gameId === "card-counting") {
      appView = "cardCountingFeature";
      return;
    }

    if (gameId !== "barbu") {
      return;
    }

    barbuFeature.openTable("play");
    openBarbuTable();
  }


  function continueBarbuLearning() {
    openBarbuTable();
    barbuFeature.openTable("learn");
    barbuEntry = { kind: "continue" };
  }


  function factsForSection(section: GameReference["sections"][number]) {
    return section.facts ?? [];
  }

</script>

<main class:fixed-play-screen={(appView === "whistFeature" && whistFixedSurface) || (appView === "heartsFeature" && heartsFixedSurface) || (appView === "spadesFeature" && spadesFixedSurface) || (appView === "bridgeFeature" && bridgeFixedSurface) || (appView === "barbuFeature" && barbuFixedSurface) || (appView === "cardCountingFeature" && cardCountingFixedSurface)} class="app-shell">
  {#if appView === "catalog"}
    <section class="welcome-screen" aria-labelledby="catalog-title">
      <div class="welcome-copy">
        <p class="eyebrow">Card game catalog</p>
        <h1 id="catalog-title">Choose a table</h1>
        <p class="intro">
          Learn, practice, and play. Follow the Bridge path from Hearts to Whist, or explore other classic card club games.
        </p>
      </div>

      <div class="welcome-table" aria-hidden="true">
        <div class="mini-card mini-card-one"><CardFace card={catalogTableCards[0]} decorative /></div>
        <div class="mini-card mini-card-two"><CardFace card={catalogTableCards[1]} decorative /></div>
        <div class="mini-card mini-card-three"><CardFace card={catalogTableCards[2]} decorative /></div>
      </div>
    </section>

    <section class="catalog-section" aria-label="Games">
      {#each catalogCategories as category}
        <div class="section-heading">
          <p class="eyebrow">{category.summary}</p>
          <h2>{category.title}</h2>
        </div>

        <div class="game-grid">
          {#each category.entries as game}
            <button
              aria-label={game.status === "Ready" ? `Open ${game.title}` : `${game.title} planned`}
              class:ready={game.status === "Ready"}
              class="game-card"
              disabled={game.status !== "Ready"}
              onclick={() => openGame(game.id)}
              type="button"
            >
              <span class="game-card-meta">
                <span class="game-family">{game.family}</span>
                <span class:free-access={game.access === "Free"} class="game-access">{game.access}</span>
              </span>
              <strong>{game.title}</strong>
              <span class="game-summary">{game.summary}</span>
              <span class="game-footer">
                <span>{game.status}</span>
              </span>
            </button>
          {/each}
        </div>
      {/each}
    </section>

    <footer class="catalog-footer">
      <a href={privacyPolicyUrl} rel="noopener noreferrer" target="_blank" onclick={openPrivacyPolicy} aria-busy={openingPrivacyPolicy}>Privacy policy</a>
      {#if privacyPolicyError}
        <p role="alert">
          {privacyPolicyError}
          <span class="privacy-policy-url">{privacyPolicyUrl}</span>
        </p>
      {/if}
    </footer>
  {:else if appView === "barbuFeature"}
    <BarbuGame feature={barbuFeature} initialEntry={barbuEntry} completedSteps={completedPathSteps} history={playBarbuHistory} nextSeed={usePracticeSeed}
      onBack={openCatalog} onReference={() => openReference("barbu")}
      onCompleteStep={id => saveCourseProgress({ ...completedPathSteps, [id]: true })}
      onExerciseComplete={results => savePlayBarbuHistory([{ id: `${Date.now()}-${results.length}`, completedAt: new Date().toISOString(), results }, ...playBarbuHistory])}
      onSurfaceChange={fixed => { barbuFixedSurface = fixed; }} />
  {:else if appView === "bridgeFeature"}
    <BridgeGame feature={bridgeFeature} completedSteps={completedPathSteps} history={playBarbuHistory} nextSeed={usePracticeSeed}
      onBack={openCatalog} onReference={() => openReference("bridge")}
      onCompleteStep={id => saveCourseProgress({ ...completedPathSteps, [id]: true })}
      onExerciseComplete={results => savePlayBarbuHistory([{ id: `${Date.now()}-${results.length}`, completedAt: new Date().toISOString(), results }, ...playBarbuHistory])}
      onSurfaceChange={fixed => { bridgeFixedSurface = fixed; }} />
  {:else if appView === "spadesFeature"}
    <SpadesGame feature={spadesFeature} completedSteps={completedPathSteps} history={playBarbuHistory} nextSeed={usePracticeSeed}
      onBack={openCatalog} onReference={() => openReference("spades")}
      onCompleteStep={id => saveCourseProgress({ ...completedPathSteps, [id]: true })}
      onExerciseComplete={results => savePlayBarbuHistory([{ id: `${Date.now()}-${results.length}`, completedAt: new Date().toISOString(), results }, ...playBarbuHistory])}
      onSurfaceChange={fixed => { spadesFixedSurface = fixed; }} />
  {:else if appView === "heartsFeature"}
    <HeartsGame feature={heartsFeature} completedSteps={completedPathSteps} history={playBarbuHistory} nextSeed={usePracticeSeed}
      onBack={openCatalog} onReference={() => openReference("hearts")}
      onCompleteStep={id => saveCourseProgress({ ...completedPathSteps, [id]: true })}
      onExerciseComplete={results => savePlayBarbuHistory([{ id: `${Date.now()}-${results.length}`, completedAt: new Date().toISOString(), results }, ...playBarbuHistory])}
      onSurfaceChange={fixed => { heartsFixedSurface = fixed; }} />
  {:else if appView === "whistFeature"}
    <WhistGame feature={whistFeature} completedSteps={completedPathSteps} history={playBarbuHistory} nextSeed={usePracticeSeed}
      onBack={openCatalog} onReference={() => openReference("whist")}
      onCompleteStep={id => saveCourseProgress({ ...completedPathSteps, [id]: true })}
      onExerciseComplete={results => savePlayBarbuHistory([{ id: `${Date.now()}-${results.length}`, completedAt: new Date().toISOString(), results }, ...playBarbuHistory])}
      onSurfaceChange={fixed => { whistFixedSurface = fixed; }} />
  {:else if appView === "cardCountingFeature"}
    <CardCountingGame completedSteps={completedPathSteps} history={playBarbuHistory} nextSeed={usePracticeSeed}
      onBack={openCatalog} onReference={() => {}}
      onCompleteStep={id => saveCourseProgress({ ...completedPathSteps, [id]: true })}
      onExerciseComplete={results => savePlayBarbuHistory([{ id: `${Date.now()}-${results.length}`, completedAt: new Date().toISOString(), results }, ...playBarbuHistory])}
      onSurfaceChange={fixed => { cardCountingFixedSurface = fixed; }} />
  {:else if appView === "reference"}
    <header class="topbar" aria-label={`${activeReference.title} reference`}>
      <button class="back-button" onclick={openActiveGameTable} type="button">Table</button>
      <div>
        <p class="eyebrow">{activeReference.family} family</p>
        <h1>{activeReference.title} reference</h1>
      </div>
      <div class="contract-status">
        <span>Baseline</span>
        <strong>Parlett</strong>
      </div>
    </header>

    <section class="reference-screen" aria-label="Game reference">
      <section class="reference-overview" aria-label={`${activeReference.title} overview`}>
        <p class="eyebrow">Reference source</p>
        <h2>{activeReference.baseline}</h2>
        <p>{activeReference.overview}</p>
      </section>

      <section class="reference-sections" aria-label={`${activeReference.title} reference sections`}>
        {#each activeReference.sections as section}
          <article class="reference-card">
            <p class="eyebrow">{section.title}</p>
            <p>{section.body}</p>
            {#if factsForSection(section).length}
              <dl>
                {#each factsForSection(section) as fact}
                  <div>
                    <dt>{fact.label}</dt>
                    <dd>{fact.value}</dd>
                  </div>
                {/each}
              </dl>
            {/if}
          </article>
        {/each}
      </section>

      <section class="reference-list" aria-label="Contract reference">
        <div class="section-heading">
          <p class="eyebrow">{activeReferenceIsBarbu ? "Core game" : "Current game"}</p>
          <h2>{activeReferenceIsBarbu ? "Barbu contracts" : `${activeReference.title} rules`}</h2>
        </div>
        <div class="reference-list-grid">
          {#each activeReference.contracts as contract}
            <article class="reference-card compact">
              <p class="eyebrow">{contract.title}</p>
              <h3>{contract.objective}</h3>
              <p>{contract.scoring}</p>
              <small>{contract.lesson}</small>
            </article>
          {/each}
        </div>
      </section>

      <section class="reference-list" aria-label="Contract roadmap">
        <div class="section-heading">
          <p class="eyebrow">{activeReferenceIsBarbu ? "Core roadmap" : "Rule boundary"}</p>
          <h2>{activeReferenceIsBarbu ? "Contract status" : "Current and later rules"}</h2>
        </div>
        <div class="contract-roadmap-list">
          {#each activeReference.contractRoadmap as item}
            <article class="contract-roadmap-card">
              <div>
                <p class="eyebrow">{item.coreStatus}</p>
                <h3>{item.title}</h3>
              </div>
              <span>{item.appStatus}</span>
              <p>{item.note}</p>
            </article>
          {/each}
        </div>
      </section>

      <section class="reference-list" aria-label="Variants and varieties">
        <div class="section-heading">
          <p class="eyebrow">Varieties of play</p>
          <h2>Documented variations</h2>
        </div>
        <div class="reference-list-grid">
          {#each activeReference.variants as variant}
            <article class="reference-card compact">
              <p class="eyebrow">{variant.title}</p>
              <p>{variant.note}</p>
            </article>
          {/each}
        </div>
      </section>

      <div class="course-actions">
        <button class="secondary-action" onclick={openActiveGameTable} type="button">Table</button>
        {#if activeReferenceIsBarbu}
          <button class="primary-action" onclick={continueBarbuLearning} type="button">Continue path</button>
        {:else}
          <button class="primary-action" onclick={openActiveGameTable} type="button">Back to {activeReference.title} table</button>
        {/if}
      </div>
    </section>
  {/if}
</main>
