<script lang="ts">
  import { invoke } from "@tauri-apps/api/core";
  import { guidedLessons } from "./lessons/catalog";
  import type { Card, GeneratedPracticeScenario, GuidedTrick, Seat, Suit, TableCard } from "./lessonTypes";

  type AppView = "catalog" | "barbuTable" | "lesson";

  type PathAction = "lesson" | "generated" | "planned";

  type LessonOutcome = "Correct" | "Penalty avoided" | "Legal but risky" | "Illegal";

  type CatalogGame = {
    id: string;
    family: string;
    title: string;
    status: "Ready" | "Planned";
    summary: string;
    lessonCount: number;
  };

  type BarbuPathStep = {
    id: string;
    step: string;
    title: string;
    summary: string;
    action: PathAction;
    lessonId?: string;
  };

  const gameCatalog: CatalogGame[] = [
    {
      id: "barbu",
      family: "Hearts",
      title: "Barbu",
      status: "Ready",
      summary: "Contract trick-taking with focused avoidance lessons.",
      lessonCount: guidedLessons.length
    },
    {
      id: "hearts",
      family: "Hearts",
      title: "Hearts",
      status: "Planned",
      summary: "Plain-trick foundations before the contracts expand.",
      lessonCount: 0
    },
    {
      id: "whist",
      family: "Whist",
      title: "Whist",
      status: "Planned",
      summary: "Partnership trick play and long-suit development.",
      lessonCount: 0
    },
    {
      id: "bridge",
      family: "Bridge",
      title: "Bridge",
      status: "Planned",
      summary: "Declarer play, defense, and bidding concepts.",
      lessonCount: 0
    }
  ];

  const learningSteps = ["Concepts", "Examples", "Guided tricks", "Practice", "Review"];
  const progressStorageKey = "barbu.courseProgress.v1";

  const barbuPathSteps: BarbuPathStep[] = [
    {
      id: "meet-contract",
      step: "Concept",
      title: "Meet the contract",
      summary: "Barbu names the danger cards and the object before play begins.",
      action: "lesson",
      lessonId: "barbu-no-hearts"
    },
    {
      id: "spot-danger",
      step: "Example",
      title: "Spot the danger",
      summary: "Read the table, identify who is likely to take the penalty, then choose.",
      action: "lesson",
      lessonId: "barbu-no-queens"
    },
    {
      id: "play-trick",
      step: "Guided trick",
      title: "Play the trick",
      summary: "Make the legal play and get immediate feedback from Barbu.",
      action: "lesson",
      lessonId: "barbu-king-of-hearts"
    },
    {
      id: "generated-drill",
      step: "Practice",
      title: "Generated drill",
      summary: "Practice fresh No Hearts follow-suit situations from the Rust engine.",
      action: "generated"
    },
    {
      id: "review",
      step: "Review",
      title: "Review the hand",
      summary: "Coming next: summarize mistakes, penalties, and contract habits.",
      action: "planned"
    }
  ];

  const suitNames: Record<Suit, string> = {
    C: "clubs",
    D: "diamonds",
    H: "hearts",
    S: "spades"
  };

  let appView: AppView = "catalog";
  let trickIndex = 0;
  let selectedCardId = "";
  let playedCardId = "";
  let practiceSeed = 1;
  let selectedLessonId = guidedLessons[0].id;
  let activeTricks: GuidedTrick[] = guidedLessons[0].tricks;
  let activePathStepId = "";
  let completedPathSteps: Record<string, boolean> = loadCourseProgress();
  let usingGeneratedPractice = false;
  let generatedPracticeError = "";

  $: selectedLesson = guidedLessons.find((lesson) => lesson.id === selectedLessonId) ?? guidedLessons[0];
  $: familyLabel = usingGeneratedPractice ? "Hearts" : selectedLesson.family;
  $: gameLabel = usingGeneratedPractice ? "Generated practice" : selectedLesson.game;
  $: contractLabel = usingGeneratedPractice ? "No Hearts" : selectedLesson.contract;
  $: currentTrick = activeTricks[trickIndex];
  $: legalCardIds = new Set(currentTrick.legalCardIds);
  $: hand = currentTrick.hand;
  $: selectedCard = hand.find((card) => card.id === selectedCardId);
  $: playedCard = hand.find((card) => card.id === playedCardId);
  $: isSelectedLegal = selectedCard ? legalCardIds.has(selectedCard.id) : false;
  $: completedTable = playedCard
    ? [...currentTrick.tableBeforeChoice, { seat: "You" as const, card: playedCard }, ...currentTrick.tableAfterChoice]
    : currentTrick.tableBeforeChoice;
  $: tutorCard = cardAt(completedTable, "Tutor");
  $: leftCard = cardAt(completedTable, "Left");
  $: rightTableCard = cardAt(completedTable, "Right");
  $: youTableCard = cardAt(completedTable, "You");
  $: explanation = generatedPracticeError || buildExplanation(selectedCard, playedCard);
  $: resultText = playedCard ? currentTrick.afterResult : currentTrick.beforeResult;
  $: isLastTrick = trickIndex === activeTricks.length - 1;
  $: playablePathSteps = barbuPathSteps.filter((step) => step.action !== "planned");
  $: completedCount = playablePathSteps.filter((step) => completedPathSteps[step.id]).length;
  $: nextPathStep = playablePathSteps.find((step) => !completedPathSteps[step.id]) ?? playablePathSteps[0];
  $: lessonOutcome = selectedCard && (playedCard || !isSelectedLegal) ? buildLessonOutcome(selectedCard, playedCard) : "";

  function loadCourseProgress() {
    if (typeof localStorage === "undefined") {
      return {};
    }

    try {
      const storedProgress = localStorage.getItem(progressStorageKey);
      return storedProgress ? (JSON.parse(storedProgress) as Record<string, boolean>) : {};
    } catch {
      return {};
    }
  }

  function saveCourseProgress(nextProgress: Record<string, boolean>) {
    completedPathSteps = nextProgress;

    if (typeof localStorage !== "undefined") {
      localStorage.setItem(progressStorageKey, JSON.stringify(nextProgress));
    }
  }

  function selectCard(card: Card) {
    if (playedCardId) {
      return;
    }

    selectedCardId = card.id;
  }

  function playSelectedCard() {
    if (!selectedCard || !isSelectedLegal) {
      return;
    }

    playedCardId = selectedCard.id;
  }

  function resetTrick() {
    selectedCardId = "";
    playedCardId = "";
  }

  function openCatalog() {
    appView = "catalog";
  }

  function openBarbuTable() {
    appView = "barbuTable";
  }

  function openGame(gameId: string) {
    if (gameId !== "barbu") {
      return;
    }

    openBarbuTable();
  }

  function startLesson(lessonId: string) {
    selectLesson(lessonId);
    activePathStepId = barbuPathSteps.find((step) => step.lessonId === lessonId)?.id ?? "";
    appView = "lesson";
  }

  async function startGeneratedDrill() {
    activePathStepId = "generated-drill";
    appView = "lesson";
    await loadGeneratedDrill();
  }

  function continueCourse() {
    startPathStep(nextPathStep);
  }

  function startPathStep(step: BarbuPathStep) {
    if (step.action === "lesson" && step.lessonId) {
      startLesson(step.lessonId);
      return;
    }

    if (step.action === "generated") {
      void startGeneratedDrill();
    }
  }

  function selectLesson(lessonId: string) {
    const lesson = guidedLessons.find((item) => item.id === lessonId);

    if (!lesson) {
      return;
    }

    selectedLessonId = lesson.id;
    activeTricks = lesson.tricks;
    usingGeneratedPractice = false;
    generatedPracticeError = "";
    trickIndex = 0;
    resetTrick();
  }

  function showFixedLesson() {
    activeTricks = selectedLesson.tricks;
    usingGeneratedPractice = false;
    generatedPracticeError = "";
    trickIndex = 0;
    resetTrick();
  }

  async function loadGeneratedDrill() {
    generatedPracticeError = "";

    try {
      const scenario = await invoke<GeneratedPracticeScenario>("generate_no_hearts_follow_suit", {
        seed: practiceSeed
      });

      practiceSeed += 1;
      activeTricks = [guidedTrickFromGeneratedScenario(scenario)];
      usingGeneratedPractice = true;
      trickIndex = 0;
      resetTrick();
    } catch {
      usingGeneratedPractice = true;
      generatedPracticeError = "Generated drills need the Tauri runtime. Use the fixed lesson here, or run the app with Tauri.";
    }
  }

  function nextTrick() {
    trickIndex = isLastTrick ? 0 : trickIndex + 1;
    resetTrick();
  }

  function finishLesson() {
    if (activePathStepId) {
      saveCourseProgress({ ...completedPathSteps, [activePathStepId]: true });
    }

    openBarbuTable();
  }

  function cardAt(table: TableCard[], seat: Seat) {
    return table.find((play) => play.seat === seat)?.card;
  }

  function cardClasses(card: Card) {
    return {
      heart: card.suit === "H",
      legal: legalCardIds.has(card.id) && !playedCardId,
      illegal: !legalCardIds.has(card.id) && !playedCardId,
      selected: selectedCardId === card.id,
      played: playedCardId === card.id
    };
  }

  function buildExplanation(selected: Card | undefined, played: Card | undefined) {
    if (played) {
      return currentTrick.playedExplanations[played.id] ?? "That legal play completes the trick.";
    }

    if (!selected) {
      return currentTrick.emptyExplanation;
    }

    if (!legalCardIds.has(selected.id)) {
      return `${selected.label} is not legal here because you still have ${suitNames[currentTrick.hand.find((card) => legalCardIds.has(card.id))?.suit ?? selected.suit]}.`;
    }

    return currentTrick.playedExplanations[selected.id] ?? `${selected.label} is legal here.`;
  }

  function buildLessonOutcome(selected: Card, played: Card | undefined): LessonOutcome {
    if (!legalCardIds.has(selected.id)) {
      return "Illegal";
    }

    if (!played) {
      return "Correct";
    }

    const playedExplanation = currentTrick.playedExplanations[played.id]?.toLowerCase() ?? "";

    if (
      playedExplanation.includes("ideal") ||
      playedExplanation.includes("safely") ||
      playedExplanation.includes("clear") ||
      playedExplanation.includes("cannot win") ||
      playedExplanation.includes("stays below") ||
      playedExplanation.includes("acceptable")
    ) {
      return "Penalty avoided";
    }

    if (
      playedExplanation.includes("captures") ||
      playedExplanation.includes("misses") ||
      playedExplanation.includes("keeps") ||
      playedExplanation.includes("wins the trick")
    ) {
      return "Legal but risky";
    }

    return "Correct";
  }

  function guidedTrickFromGeneratedScenario(scenario: GeneratedPracticeScenario): GuidedTrick {
    return {
      title: scenario.title,
      beforeResult: scenario.prompt,
      afterResult: "Generated drill complete. Check the explanation for the winner and penalty.",
      emptyExplanation: scenario.prompt,
      legalCardIds: scenario.legalCardIds,
      hand: scenario.playerHand,
      tableBeforeChoice: scenario.tableBeforeChoice,
      tableAfterChoice: scenario.tableAfterChoice,
      pendingBySeat: pendingSeatsForGeneratedScenario(scenario),
      playedExplanations: Object.fromEntries(
        scenario.outcomes.map((outcome) => [outcome.cardId, outcome.explanation])
      )
    };
  }

  function pendingSeatsForGeneratedScenario(scenario: GeneratedPracticeScenario) {
    const pendingBySeat: Partial<Record<Seat, string>> = { You: "You" };

    for (const play of scenario.tableAfterChoice) {
      pendingBySeat[play.seat] = play.card.label;
    }

    return pendingBySeat;
  }
</script>

<main class="app-shell">
  {#if appView === "catalog"}
    <section class="welcome-screen" aria-labelledby="catalog-title">
      <div class="welcome-copy">
        <p class="eyebrow">Card game catalog</p>
        <h1 id="catalog-title">Choose a table</h1>
        <p class="intro">
          Start with Barbu, then branch into related trick-taking games as the curriculum grows.
        </p>
      </div>

      <div class="welcome-table" aria-hidden="true">
        <div class="mini-card mini-card-one"><b>Q</b><small>H</small></div>
        <div class="mini-card mini-card-two"><b>K</b><small>C</small></div>
        <div class="mini-card mini-card-three"><b>A</b><small>S</small></div>
      </div>
    </section>

    <section class="catalog-section" aria-label="Games">
      <div class="section-heading">
        <p class="eyebrow">Games</p>
        <h2>Learning paths</h2>
      </div>

      <div class="game-grid">
        {#each gameCatalog as game}
          <button
            class:ready={game.status === "Ready"}
            class="game-card"
            disabled={game.status !== "Ready"}
            onclick={() => openGame(game.id)}
            type="button"
          >
            <span class="game-family">{game.family}</span>
            <strong>{game.title}</strong>
            <span class="game-summary">{game.summary}</span>
            <span class="game-footer">
              <span>{game.status}</span>
              <span>{game.lessonCount} lessons</span>
            </span>
          </button>
        {/each}
      </div>
    </section>

    <section class="progression-section" aria-label="Lesson progression">
      {#each learningSteps as step, index}
        <div class="progression-step">
          <span>{index + 1}</span>
          <strong>{step}</strong>
        </div>
      {/each}
    </section>
  {:else if appView === "barbuTable"}
    <header class="topbar" aria-label="Barbu table">
      <button class="back-button" onclick={openCatalog} type="button">Games</button>
      <div>
        <p class="eyebrow">Hearts family</p>
        <h1>Barbu's table</h1>
      </div>
      <div class="contract-status">
        <span>King of Cards</span>
        <strong>{completedCount} of {playablePathSteps.length} complete</strong>
      </div>
    </header>

    <section class="table-room" aria-labelledby="barbu-table-title">
      <div class="barbu-card">
        <p class="eyebrow">Coach and opponent</p>
        <h2 id="barbu-table-title">Barbu sets the contract. You learn by playing the decision.</h2>
        <p>
          Start with compact guided tricks, then move into generated drills as the rules become automatic.
        </p>
        <div class="course-progress" aria-label="Course progress">
          <span>{completedCount} / {playablePathSteps.length} complete</span>
          <div class="progress-track">
            <div class="progress-fill" style={`width: ${(completedCount / playablePathSteps.length) * 100}%`}></div>
          </div>
        </div>
        <button class="continue-action" onclick={continueCourse} type="button">
          Continue: {nextPathStep.title}
        </button>
      </div>

      <div class="contract-list" aria-label="Available contracts">
        {#each guidedLessons as lesson}
          <button class="contract-card" onclick={() => startLesson(lesson.id)} type="button">
            <span>{lesson.contract}</span>
            <strong>{lesson.title}</strong>
            <small>{lesson.summary}</small>
          </button>
        {/each}
      </div>
    </section>

    <section class="path-section" aria-label="Barbu lesson path">
      <div class="section-heading">
        <p class="eyebrow">Training path</p>
        <h2>Learn the table in five passes</h2>
      </div>

      <div class="path-grid">
        {#each barbuPathSteps as step, index}
          <button
            class:active={step.id === nextPathStep.id && !completedPathSteps[step.id]}
            class:complete={completedPathSteps[step.id]}
            class:planned={step.action === "planned"}
            class="path-card"
            disabled={step.action === "planned"}
            onclick={() => startPathStep(step)}
            type="button"
          >
            <span class="path-index">{index + 1}</span>
            <span class="path-step">{step.step}</span>
            <strong>{step.title}</strong>
            <small>{step.summary}</small>
            <span class="path-status">
              {#if completedPathSteps[step.id]}
                Complete
              {:else if step.action === "planned"}
                Planned
              {:else if step.id === nextPathStep.id}
                Next
              {:else}
                Open
              {/if}
            </span>
          </button>
        {/each}
      </div>
    </section>
  {:else}
    <header class="topbar" aria-label="Current game">
      <button class="back-button" onclick={openBarbuTable} type="button">Table</button>
      <div>
        <p class="eyebrow">{familyLabel} family</p>
        <h1>{gameLabel}</h1>
      </div>
      <div class="contract-status">
        <span>{contractLabel}</span>
        <strong>Trick {trickIndex + 1} of {activeTricks.length}</strong>
      </div>
    </header>

    <section class="lesson-row" aria-label="Guided Barbu lessons">
      {#each guidedLessons as lesson}
        <button
          class:active={!usingGeneratedPractice && selectedLessonId === lesson.id}
          class="lesson-chip"
          onclick={() => selectLesson(lesson.id)}
          type="button"
        >
          <span>{lesson.contract}</span>
          <small>{lesson.summary}</small>
        </button>
      {/each}
    </section>

    <section class="mode-row" aria-label="Learning mode">
      <button class:active={!usingGeneratedPractice} class="mode-tab" onclick={showFixedLesson} type="button">Practice</button>
      <button class:active={usingGeneratedPractice} class="mode-tab" onclick={loadGeneratedDrill} type="button">Generated</button>
      <button class="mode-tab" type="button">Learn</button>
      <button class="mode-tab" type="button">Rules</button>
    </section>

    <section class="learning-surface" aria-label="Guided trick">
      <section class="practice-table" aria-label="Card table">
        <div class="seat north">Tutor</div>
        <div class="seat west">Left</div>
        <div class="seat east">Right</div>
        <div class="seat south">You</div>

        <div class="played-slot tutor-slot">
          {#if tutorCard}
            <div class:heart={tutorCard.suit === "H"} class="card table-card">
              <b>{tutorCard.rank}</b>
              <small>{tutorCard.suit}</small>
            </div>
          {/if}
        </div>

        <div class="played-slot left-slot">
          {#if leftCard}
            <div class:heart={leftCard.suit === "H"} class="card table-card">
              <b>{leftCard.rank}</b>
              <small>{leftCard.suit}</small>
            </div>
          {/if}
        </div>

        <div class="played-slot right-slot">
          {#if rightTableCard}
            <div class:heart={rightTableCard.suit === "H"} class="card table-card">
              <b>{rightTableCard.rank}</b>
              <small>{rightTableCard.suit}</small>
            </div>
          {:else if currentTrick.pendingBySeat.Right}
            <div class="pending-card">{currentTrick.pendingBySeat.Right}</div>
          {/if}
        </div>

        <div class="played-slot you-slot">
          {#if youTableCard}
            <div class:heart={youTableCard.suit === "H"} class="card table-card">
              <b>{youTableCard.rank}</b>
              <small>{youTableCard.suit}</small>
            </div>
          {:else if currentTrick.pendingBySeat.You}
            <div class="pending-card">{currentTrick.pendingBySeat.You}</div>
          {/if}
        </div>
      </section>

      <section class="lesson-panel" aria-label="Current lesson">
        <div class="lesson-heading">
          <p class="eyebrow">{contractLabel}</p>
          <h2>{currentTrick.title}</h2>
        </div>

        <p class="result">{resultText}</p>
        <p class="explanation">{explanation}</p>
        {#if lessonOutcome}
          <p class:warning={lessonOutcome === "Illegal" || lessonOutcome === "Legal but risky"} class="outcome">
            {lessonOutcome}
          </p>
        {/if}

        <div class="hand" aria-label="Your hand">
          {#each hand as card}
            <button
              aria-pressed={selectedCardId === card.id}
              class:heart={card.suit === "H"}
              class:illegal={cardClasses(card).illegal}
              class:legal={cardClasses(card).legal}
              class:played={cardClasses(card).played}
              class:selected={cardClasses(card).selected}
              class="card hand-card"
              onclick={() => selectCard(card)}
              type="button"
            >
              <b>{card.rank}</b>
              <small>{card.suit}</small>
            </button>
          {/each}
        </div>

        <div class="action-row">
          {#if playedCard}
            <button class="secondary-action" onclick={resetTrick} type="button">Reset</button>
            {#if isLastTrick}
              <button class="primary-action" onclick={finishLesson} type="button">Finish lesson</button>
            {:else}
              <button class="primary-action" onclick={nextTrick} type="button">Next trick</button>
            {/if}
          {:else}
            <button class="secondary-action" onclick={resetTrick} type="button">Reset</button>
            <button class="primary-action" disabled={!isSelectedLegal} onclick={playSelectedCard} type="button">
              Play selected
            </button>
          {/if}
        </div>
      </section>
    </section>
  {/if}
</main>
