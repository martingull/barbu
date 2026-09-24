import { fullHandContracts } from "../../contractRegistry";
import { barbuSessionComplete, barbuSeatTotals, type BarbuSession, type BarbuHandResult as FullHandRunResult } from "../../domain/barbuSession";
import { formatOrdinal, formatSignedScore, scoreSeatLabel } from "../../scorePresentation";
import { contractIntro } from "./contractIntros";
import { runStandings, runBestContract, runWeakestContract, runResultHeading, runResultSummary, runContractValueLabel } from "./barbuPresentation";

export function barbuRunPresentation(barbuSession: BarbuSession) {
  const { pendingContract: pendingRunContract, results: fullHandRunResults } = barbuSession;
  const fullHandRunRemainingCount = Math.max(fullHandContracts.length - fullHandRunResults.length, 0);
  const pendingRunContractIndex = fullHandContracts.indexOf(pendingRunContract);
  const pendingRunContractIntro = contractIntro(pendingRunContract);
  const pendingRunStatusLabel = `Contract ${pendingRunContractIndex + 1} of ${fullHandContracts.length}`;
  const pendingRunSequenceLabel = `${fullHandRunResults.length} played, ${fullHandRunRemainingCount} to go`;
  const pendingRunSurfaceLabel = pendingRunContractIntro.surface;
  const fullHandRunOrderedResults = fullHandContracts
    .map((contract) => fullHandRunResults.find((result) => result.contract === contract))
    .filter((result): result is FullHandRunResult => Boolean(result));
  const fullHandRunSeatScores = barbuSeatTotals(fullHandRunResults);
  const fullHandRunStandings = runStandings(fullHandRunSeatScores);
  const fullHandRunPlayerStanding = fullHandRunStandings.find((standing) => standing.seat === "You");
  const fullHandRunLeader = fullHandRunStandings[0];
  const fullHandRunBestContract = runBestContract(fullHandRunOrderedResults);
  const fullHandRunWeakestContract = runWeakestContract(fullHandRunOrderedResults);
  const fullHandRunIsComplete = barbuSession !== null && barbuSessionComplete(barbuSession);
  const fullHandRunLeaderLabel = fullHandRunLeader
    ? `${scoreSeatLabel(fullHandRunLeader.seat)} ${formatSignedScore(fullHandRunLeader.score)}`
    : "You 0";
  const fullHandRunPlayerPlaceLabel = fullHandRunPlayerStanding ? formatOrdinal(fullHandRunPlayerStanding.rank) : "1st";
  const fullHandRunRemainingLabel = `${fullHandRunRemainingCount} ${
    fullHandRunRemainingCount === 1 ? "contract" : "contracts"
  }`;
  const fullHandRunResultTitle = fullHandRunIsComplete ? runResultHeading(fullHandRunStandings) : "Game complete";
  const fullHandRunResultSummary = fullHandRunIsComplete
    ? runResultSummary(fullHandRunStandings, fullHandRunResults.length)
    : "";
  const fullHandRunWinnerLabel = fullHandRunLeader
    ? `${scoreSeatLabel(fullHandRunLeader.seat)} wins with ${formatSignedScore(fullHandRunLeader.score)}`
    : "Game complete";
  const fullHandRunBestContractLabel = fullHandRunBestContract
    ? `${fullHandRunBestContract.contract}: ${runContractValueLabel(fullHandRunBestContract)}`
    : "No hands yet";
  const fullHandRunWeakestContractLabel = fullHandRunWeakestContract
    ? `${fullHandRunWeakestContract.contract}: ${runContractValueLabel(fullHandRunWeakestContract)}`
    : "No hands yet";

  return {
    pendingRunContract, pendingRunContractIntro, pendingRunStatusLabel, pendingRunSequenceLabel, pendingRunSurfaceLabel,
    fullHandRunStandings, fullHandRunPlayerStanding, fullHandRunLeaderLabel, fullHandRunPlayerPlaceLabel,
    fullHandRunRemainingLabel, fullHandRunResultTitle, fullHandRunResultSummary, fullHandRunWinnerLabel,
    fullHandRunBestContractLabel, fullHandRunWeakestContractLabel
  };
}
