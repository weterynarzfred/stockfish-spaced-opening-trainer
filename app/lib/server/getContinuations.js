import { Chess } from "chess.js";

import evalFen from "@/app/lib/server/evalFen";
import getEvalFromPlayerPerspective from "@/app/lib/getEvalFromPlayerPerspective";
import { MAX_EVAL } from "@/app/lib/config";

function reconstructGameFromBranch(branch) {
  const game = new Chess(branch.fen);
  const lastMove = branch.moveList.at(-1);
  game.move(lastMove);
  return game;
}

function isOpponentMoveWorthTraining(game, evaluation) {
  return getEvalFromPlayerPerspective({
    playerColor: game.turn(),
    eval: evaluation.eval
  }) <= MAX_EVAL;
}

function createContinuationBranch(branch, game, move, evaluation) {
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
  };
}

export default async function getContinuations(branch) {
  const game = reconstructGameFromBranch(branch);
  const possibleMoves = game.moves({ verbose: true });
  const continuations = {};

  for (const move of possibleMoves) {
    game.move(move);

    const evaluation = await evalFen(game.fen());

    if (!isOpponentMoveWorthTraining(game, evaluation)) {
      game.undo();
      continue;
    }

    continuations[move.san] = createContinuationBranch(
      branch,
      game,
      move,
      evaluation
    );

    game.undo();
  }

  return continuations;
}
