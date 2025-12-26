import { getPlayerData, savePlayerData } from "@/app/lib/server/db";

export async function POST(req) {
  const {
    startingFen,
    moveList,
    mistakes,
  } = await req.json();

  const playerData = await getPlayerData();

  const rootKey = Object.keys(playerData).find(
    key => playerData[key].fen === startingFen
  );

  if (!rootKey) {
    return Response.json(
      { error: "challenge not found" },
      { status: 404 }
    );
  }

  let node = playerData[rootKey];
  let continuations = node.continuations;
  moveList.unshift(rootKey);

  const timestamp = Date.now();

  for (let depth = 0; depth * 2 < moveList.length; depth++) {
    const plyIndex = depth * 2;

    const hasMistake = mistakes.some(
      m => m === plyIndex || m === plyIndex + 1
    );

    node.lastAttempted = timestamp;

    if (hasMistake) {
      node.level = Math.floor((node.level - 1) / 2);
    } else {
      node.level += 1;
      node.lastSolved = timestamp;
    }
    node.level = Math.min(Math.max(node.level, 0), 31);

    const opponentMove = moveList[plyIndex + 2];
    if (!opponentMove || !continuations || !continuations[opponentMove])
      break;

    node = continuations[opponentMove];
    continuations = node.continuations;
  }

  savePlayerData(playerData);

  return Response.json({ success: true });
}
