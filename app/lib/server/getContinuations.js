import { Chess } from "chess.js";

import evalFen from "@/app/lib/server/evalFen";
import getLichessContinuations from "@/app/lib/server/getLichessContinuations";

function reconstructGameFromBranch(branch) {
  const game = new Chess(branch.fen);
  const lastMove = branch.moveList.at(-1);
  game.move(lastMove);
  return game;
}

function createContinuationBranch({ branch, game, move, evaluation, gameCount }) {
  game.move(evaluation.bestMove);
  const bestMove = game.history().pop();
  game.undo();

  return {
    level: 0,
    playerColor: game.turn(),
    fen: game.fen(),
    lastSolved: 0,
    lastAttempted: 0,
    eval: evaluation.eval,
    moveList: [...branch.moveList, move.san, bestMove],
    gameCount,
  };
}

export default async function getContinuations(branch) {
  const game = reconstructGameFromBranch(branch);
  const possibleMoves = game.moves({ verbose: true });
  const continuations = {};
  const lichessStats = await getLichessContinuations(game.fen());

  for (const move of possibleMoves) {
    game.move(move);

    const evaluation = await evalFen(game.fen());

    continuations[move.san] = createContinuationBranch({
      branch,
      game,
      move,
      evaluation,
      gameCount: lichessStats[move.lan] ?? 0,
    });

    game.undo();
  }

  return continuations;
}
