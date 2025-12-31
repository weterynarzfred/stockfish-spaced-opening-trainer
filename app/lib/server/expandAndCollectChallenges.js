import getEvalFromPlayerPerspective from "@/app/lib/getEvalFromPlayerPerspective";
import getContinuations from "@/app/lib/server/getContinuations";
import { MAX_BRANCH_LEVEL, MIN_LEVEL_TO_CONTINUE } from "@/app/lib/config";

function shouldExpandBranch(branch) {
  return branch.level >= Math.min(
    MIN_LEVEL_TO_CONTINUE + branch.moveList.length - (branch.playerColor === "b" ? 2 : 1),
    MAX_BRANCH_LEVEL
  );
}

function branchToChallenge(branch, startingFen, gameCount) {
  const challenge = {
    playerColor: branch.playerColor,
    moveList: [...branch.moveList],
    fullMoveList: [...branch.moveList],
    bestMove: branch.bestMove,
    evalFromPlayerPerspective: getEvalFromPlayerPerspective(branch),
    level: branch.level,
    fen: startingFen,
    lastSolved: branch.lastSolved,
    lastAttempted: branch.lastAttempted,
    gameCount,
  };

  if (branch.playerColor === 'b') challenge.moveList.shift();

  return challenge;
}

async function ensureBranchHasContinuations(branch) {
  if (branch.continuations === undefined)
    branch.continuations = await getContinuations(branch);
}

export default async function expandAndCollectChallenges(
  branches,
  startingFen,
  parentGameCount = 1
) {
  const challenges = [];

  for (const branchSan in branches) {
    const branch = branches[branchSan];
    const rootFen = startingFen ?? branch.fen;
    const gameCount = (branch.gameCount ?? 0);

    if (shouldExpandBranch(branch)) {
      await ensureBranchHasContinuations(branch);
      challenges.push(
        ...await expandAndCollectChallenges(branch.continuations, rootFen, parentGameCount)
      );
    } else {
      challenges.push(branchToChallenge(branch, rootFen, gameCount));
    }
  }

  return challenges;
}
