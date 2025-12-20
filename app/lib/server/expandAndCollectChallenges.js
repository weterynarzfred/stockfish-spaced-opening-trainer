import getEvalFromPlayerPerspective from "@/app/lib/getEvalFromPlayerPerspective";
import getContinuations from "@/app/lib/server/getContinuations";
import { MIN_LEVEL_TO_CONTINUE } from "@/app/lib/config";

function shouldExpandBranch(branch) {
  return branch.level >= MIN_LEVEL_TO_CONTINUE + branch.moveList.length / 2;
}

function branchToChallenge(branch, startingFen) {
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
  };

  if (branch.playerColor === 'b') challenge.moveList.shift();

  return challenge;
}

async function ensureBranchHasContinuations(branch) {
  if (branch.continuations === undefined)
    branch.continuations = await getContinuations(branch);
}

export default async function expandAndCollectChallenges(branches, startingFen) {
  const challenges = [];

  for (const branchSan in branches) {
    const branch = branches[branchSan];
    const rootFen = startingFen ?? branch.fen;

    if (shouldExpandBranch(branch)) {
      await ensureBranchHasContinuations(branch);
      challenges.push(
        ...await expandAndCollectChallenges(branch.continuations, rootFen)
      );
    } else {
      challenges.push(branchToChallenge(branch, rootFen));
    }
  }

  return challenges;
}
