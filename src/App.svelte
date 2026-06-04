<script lang="ts">
  type LessonStep = {
    title: string;
    body: string;
  };

  type Contract = {
    id: string;
    title: string;
    objective: string;
    steps: LessonStep[];
  };

  const contracts: Contract[] = [
    {
      id: "no_hearts",
      title: "No Hearts",
      objective: "Avoid winning tricks that contain hearts.",
      steps: [
        {
          title: "Follow suit first",
          body: "When a suit is led, every player who has that suit must play it."
        },
        {
          title: "Count the danger",
          body: "Every heart in the trick becomes a penalty for the player who wins it."
        },
        {
          title: "Use voids well",
          body: "If you cannot follow suit, you can discard a dangerous card or save control for later."
        }
      ]
    },
    {
      id: "no_queens",
      title: "No Queens",
      objective: "Avoid winning tricks that contain queens.",
      steps: [
        {
          title: "Read loaded tricks",
          body: "A queen only hurts when you capture it, so the winner of the trick matters more than who played it."
        }
      ]
    },
    {
      id: "barbu",
      title: "Barbu",
      objective: "Avoid taking the king of hearts.",
      steps: [
        {
          title: "Track one card",
          body: "The king of hearts is the central threat, so remember whether hearts have been led and who may be void."
        }
      ]
    }
  ];

  let selectedId = contracts[0].id;

  $: selected = contracts.find((contract) => contract.id === selectedId) ?? contracts[0];
</script>

<main class="app-shell">
  <section class="topbar" aria-label="Current game">
    <div>
      <p class="family">Hearts family</p>
      <h1>Barbu</h1>
    </div>
    <div class="score-pill">4 players</div>
  </section>

  <section class="practice-table" aria-label="Guided trick preview">
    <div class="seat north">Tutor</div>
    <div class="seat west">Left</div>
    <div class="trick">
      <button class="card danger" type="button" aria-label="King of hearts">KH</button>
      <button class="card" type="button" aria-label="Nine of clubs">9C</button>
      <button class="card" type="button" aria-label="Ace of clubs">AC</button>
      <button class="card heart" type="button" aria-label="Four of hearts">4H</button>
    </div>
    <div class="seat east">Right</div>
    <div class="seat south">You</div>
  </section>

  <section class="lesson-layout">
    <nav class="contract-list" aria-label="Barbu contracts">
      {#each contracts as contract}
        <button
          class:active={contract.id === selected.id}
          type="button"
          on:click={() => (selectedId = contract.id)}
        >
          <span>{contract.title}</span>
          <small>{contract.objective}</small>
        </button>
      {/each}
    </nav>

    <article class="lesson-panel">
      <p class="mode">Learn</p>
      <h2>{selected.title}</h2>
      <p class="objective">{selected.objective}</p>

      <div class="steps">
        {#each selected.steps as step, index}
          <section class="step">
            <span>{index + 1}</span>
            <div>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </div>
          </section>
        {/each}
      </div>
    </article>
  </section>
</main>
