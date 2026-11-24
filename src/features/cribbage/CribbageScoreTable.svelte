<script lang="ts">
  import { cribbageScoreRows } from "./cribbageScorePresentation";
  import type { CribbageScore } from "../../domain/cribbage";
  let { count }: { count: CribbageScore } = $props();
</script>

<table aria-label="Cribbage scoring breakdown">
  <thead><tr><th scope="col">Combination</th><th scope="col">Points</th></tr></thead>
  <tbody>
    {#each cribbageScoreRows(count) as row}
      <tr><th scope="row">{row.label}<small>{row.calculation}</small></th><td>{row.points}</td></tr>
    {:else}<tr><th scope="row">No combinations</th><td>0</td></tr>{/each}
  </tbody>
  <tfoot><tr><th scope="row">Total</th><td>{count.total}</td></tr></tfoot>
</table>

<style>
  table { width: 100%; table-layout: fixed; border-collapse: collapse; color: #f7faf3; font-size: 0.72rem; line-height: 1.25; font-variant-numeric: tabular-nums; }
  th, td { padding: 4px 2px; border-bottom: 1px solid #ffffff30; text-align: right; overflow-wrap: anywhere; }
  th:first-child { text-align: left; width: 73%; font-weight: 500; }
  thead th { color: #d2dfd1; font-size: 0.65rem; }
  small { display: block; margin-top: 2px; color: #d2dfd1; font-size: 0.65rem; }
  td { font-weight: 700; }
  tfoot th, tfoot td { font-weight: 700; border-top: 2px solid #becfb7; border-bottom: 0; }
</style>
