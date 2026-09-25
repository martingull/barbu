<script lang="ts">
  import { guidedLessons } from "../../lessons/catalog";
  import { courseCatalog, courseTargetsGuidedLesson } from "../../lessons/courses";
  export let completedPathSteps: Record<string, boolean>;
  export let onBack: () => void;
  export let onStep: (id: string) => void;
  const courseForLesson = (id: string) => courseCatalog.find(course => courseTargetsGuidedLesson(course, id));
</script>

<header class="topbar" aria-label="Barbu contracts">
  <button class="back-button" onclick={onBack} type="button">Table</button>
  <div>
    <p class="eyebrow">Core game</p>
    <h1>Barbu contracts</h1>
  </div>
  <div class="contract-status">
    <span>Core roster</span>
    <strong>{guidedLessons.length} contracts</strong>
  </div>
</header>

<section class="contract-roster-screen" aria-label="Core Barbu contracts">
  <div class="contract-roster-intro">
    <p class="eyebrow">Contract map</p>
    <h2>Each contract changes what a good card means.</h2>
    <p>
      Use this screen when you want to jump into one contract directly. The main Learn tab keeps the ordered
      path separate so the table does not become a long list of controls.
    </p>
  </div>

  <div class="contract-list">
    {#each guidedLessons as lesson}
      <button class="contract-card" onclick={() => onStep(courseForLesson(lesson.id)?.pathStepId ?? "")} type="button">
        <span>{lesson.contract}</span>
        <strong>{lesson.title}</strong>
        <small>
          {lesson.summary}
          {#if completedPathSteps[courseForLesson(lesson.id)?.pathStepId ?? ""]}
            Complete
          {/if}
        </small>
      </button>
    {/each}
  </div>
</section>
