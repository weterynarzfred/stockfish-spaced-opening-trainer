import expandAndCollectChallenges from "@/app/lib/server/expandAndCollectChallenges";
import { BASE_INTERVAL, MAX_EVAL } from "@/app/lib/config";

function isChallengeViable(challenge) {
  return challenge.evalFromPlayerPerspective <= MAX_EVAL;
}

function getChallengeInterval(challenge) {
  return BASE_INTERVAL * 1.5 ** challenge.level;
}

function annotateChallengeTiming(challenge, now = Date.now()) {
  const interval = getChallengeInterval(challenge);
  const elapsed = now - challenge.lastSolved;
  challenge.overdue = challenge.lastSolved === 0 ? 0 : elapsed - interval;
  challenge.isOverdue = challenge.overdue > 0;
  return challenge;
}

function sortChallenges(a, b) {
  return a.evalFromPlayerPerspective - b.evalFromPlayerPerspective;
}

function isAvailableNow(c) {
  return c.isOverdue || c.lastSolved === 0;
}

function computeStats(challenges) {
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

export async function getNextChallenge(player) {
  const now = Date.now();

  const allChallenges = (await expandAndCollectChallenges(player))
    .filter(isChallengeViable)
    .map(c => annotateChallengeTiming(c, now));

  const stats = computeStats(allChallenges);
  const available = allChallenges.filter(isAvailableNow);
  available.sort(sortChallenges);

  return {
    nextChallenge: available[0],
    stats,
  };
}
