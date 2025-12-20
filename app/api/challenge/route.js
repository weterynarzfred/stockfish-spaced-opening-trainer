import { getPlayerData, savePlayerData } from "@/app/lib/server/db";
import { getNextChallenge } from "@/app/lib/server/getNextChallenge";

export async function GET() {
  const player = await getPlayerData();

  const {
    nextChallenge,
    challengeStats,
    playerStats,
    topChallenges,
  } = await getNextChallenge(player);

  savePlayerData();

  return Response.json({
    challenge: nextChallenge,
    ...challengeStats,
    ...playerStats,
    topChallenges,
  });
}
