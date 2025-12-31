import { Chess } from "chess.js";

import evalFen from "@/app/lib/server/evalFen";
import getLichessContinuations from "@/app/lib/server/getLichessContinuations";

export default async function initPlayer(player) {
  const game = new Chess();

  const possibleMoves = game.moves({ verbose: true });
  const lichessStats = await getLichessContinuations(game.fen());
  const evaluation = await evalFen(game.fen());
  game.move(evaluation.bestMove);
  const bestMove = game.history().pop();
  game.undo();
  player["0"] = {
    level: 0,
    playerColor: game.turn(),
    fen: game.fen(),
    lastSolved: 0,
    lastAttempted: 0,
    eval: evaluation.eval,
    moveList: [bestMove],
    gameCount: Object.values(lichessStats).reduce((sum, e) => sum + (e ?? 0), 0),
  };

  for (let i = 0; i < possibleMoves.length; i++) {
    const move = possibleMoves[i];
    game.move(move);
    const evaluation = await evalFen(game.fen());
    game.move(evaluation.bestMove);
    const bestMove = game.history().pop();
    game.undo();
    player[move.san] = {
      level: 0,
      playerColor: game.turn(),
      fen: game.fen(),
      lastSolved: 0,
      lastAttempted: 0,
      eval: evaluation.eval,
      moveList: [move.san, bestMove],
      gameCount: lichessStats[move.lan] ?? 0,
    };
    game.undo();
  }
}
