import expandAndCollectChallenges from "@/app/lib/server/expandAndCollectChallenges";
import { MAX_EVAL, MIN_CHALLENGE_WEIGHT } from "@/app/lib/config";
import getEvalFromPlayerPerspective from "@/app/lib/getEvalFromPlayerPerspective";
import getChallengeInterval from "@/app/lib/getChallengeInterval";
import shouldExpandBranch, { branchLevelNeededToExpand } from "@/app/lib/shouldBranchExpand";

function positionKeyFromFen(fen) {
  let key = `${fen}`.split(' ');
  key.splice(-1);
  if (parseInt(key[key.length - 1]) < 20) key.splice(-1);
  return key.join(' ');
}

function dedupeChallengesByPosition(challenges) {
  const bestByPosition = new Map();

  for (const ch of challenges) {
    const key = positionKeyFromFen(ch.currentFen);
    const existing = bestByPosition.get(key);

    if (!existing || ch.level > existing.level)
      bestByPosition.set(key, ch);
  }

  return [...bestByPosition.values()];
}

function isChallengeViable(challenge) {
  return challenge.evalFromPlayerPerspective <= Math.max(MAX_EVAL - challenge.moveList.length / 5, 0.6) &&
    ((MAX_EVAL - challenge.evalFromPlayerPerspective) * challenge.gameCount) * 100 > MIN_CHALLENGE_WEIGHT;
}

function annotateChallengeTiming(challenge, now = Date.now()) {
  const interval = getChallengeInterval(challenge);
  const elapsed = now - challenge.lastSolved;
  challenge.overdue = challenge.lastSolved === 0 ? 0 : elapsed - interval;
  challenge.isOverdue = challenge.overdue > 0;
  return challenge;
}

function sortChallenges(a, b) {
  return ((MAX_EVAL - b.evalFromPlayerPerspective) * b.gameCount) -
    ((MAX_EVAL - a.evalFromPlayerPerspective) * a.gameCount);
}

function isAvailableNow(c) {
  return c.isOverdue || c.lastSolved === 0;
}

function computeChallengeStats(challenges) {
  let waitingCount = 0;
  let waitingMinDelay = Infinity;
  let overdueCount = 0;
  let notAttemptedCount = 0;

  for (const c of challenges) {
    if (c.isOverdue) overdueCount++;
    else if (c.lastSolved === 0) notAttemptedCount++;

    if (!c.isOverdue && c.lastSolved > 0) {
      waitingCount++;
      waitingMinDelay = Math.min(waitingMinDelay, -c.overdue);
    }
  }

  return {
    overdueCount,
    notAttemptedCount,
    waitingCount,
    waitingMinDelay,
  };
}

function getBranches(branch) {
  const acc = [];
  for (const branchSan in branch) {
    const move = branch[branchSan];
    if (move.continuations !== undefined)
      acc.push(...getBranches(move.continuations));

    acc.push({
      moveList: move.moveList,
      level: move.level,
      evalFromPlayerPerspective: getEvalFromPlayerPerspective(move),
      fen: move.fen,
    });
  }

  return acc;
}

function computePlayerStats(player) {
  const branches = getBranches(player);

  return {
    expandedLevels: branches.reduce((sum, e) => sum + (shouldExpandBranch(e) ? 1 : 0), 0),
    levelProgress: branches.reduce((sum, e) => sum + Math.min(e.level / branchLevelNeededToExpand(e), 1), 0),
  };
}

export async function getNextChallenge(player) {
  const now = Date.now();

  const allChallenges = (await expandAndCollectChallenges(player))
    .filter(isChallengeViable)
    .map(c => annotateChallengeTiming(c, now));

  const playerStats = computePlayerStats(player);
  allChallenges.sort(sortChallenges);
  const dedupedChallenges = dedupeChallengesByPosition(allChallenges);
  const challengeStats = computeChallengeStats(dedupedChallenges);
  const available = dedupedChallenges.filter(isAvailableNow);

  return {
    nextChallenge: available[0],
    challengeStats,
    playerStats,
    topChallenges: dedupedChallenges.slice(0, 512),
  };
}
