import { Chess } from "chess.js";

import evalFen from "@/app/lib/server/evalFen";

export default async function initPlayer(player) {
  const game = new Chess();

  const possibleMoves = game.moves({ verbose: true });
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
    };
    game.undo();
  }
}
