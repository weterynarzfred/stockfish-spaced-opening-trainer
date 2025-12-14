import { Chess } from "chess.js";

import { getPlayerData, savePlayerData } from "@/app/lib/db";
import evalFen from "@/app/lib/evalFen";

const MIN_LEVEL_TO_CONTINUE = 17; // the level a player needs to reach before the branch continues
const MAX_EVAL = 1; // don't challenge the player if they are already winning by this much. Increase to get more branches.
const BASE_INTERVAL = 1000; // base time between repetitions in ms, this will grow exponentially with each level

function getEvalFromPlayerPerspective(move) {
  if (move.eval.toString().startsWith('mate-')) move.eval = -100;
  if (move.eval.toString().startsWith('mate+')) move.eval = 100;
  if (move.playerColor === "b") return -move.eval;
  return move.eval;
}

async function getContinuations(branch) {
  const game = new Chess(branch.fen);
  game.move(branch.moveList[branch.moveList.length - 1]);
  const possibleMoves = game.moves({ verbose: true });
  const continuations = {};

  for (let i = 0; i < possibleMoves.length; i++) {
    const move = possibleMoves[i];
    game.move(move);
    const evaluation = await evalFen(game.fen());

    if (getEvalFromPlayerPerspective({
      playerColor: game.turn(),
      eval: evaluation.eval
    }) > MAX_EVAL) {
      game.undo();
      continue;
    }

    game.move(evaluation.bestMove);
    const bestMove = game.history().pop();
    game.undo();

    continuations[move.san] = {
      level: 0,
      playerColor: game.turn(),
      fen: game.fen(),
      lastSolved: 0,
      lastAttempted: 0,
      eval: evaluation.eval,
      moveList: [...branch.moveList, move.san, bestMove],
    };
    game.undo();
  }

  return continuations;
}

async function challengesFromBranch(branches, startingFen) {
  const challenges = [];
  for (const branchSan in branches) {
    const branch = branches[branchSan];
    const currentStartingFen = startingFen ?? branch.fen;

    if (branch.level >= MIN_LEVEL_TO_CONTINUE) {
      if (branch.continuations === undefined)
        branch.continuations = await getContinuations(branch);
      challenges.push(...await challengesFromBranch(
        branch.continuations,
        currentStartingFen
      ));
    } else {
      const challenge = {
        playerColor: branch.playerColor,
        moveList: [...branch.moveList],
        bestMove: branch.bestMove,
        evalFromPlayerPerspective: getEvalFromPlayerPerspective(branch),
        level: branch.level,
        fen: currentStartingFen,
        lastSolved: branch.lastSolved,
        lastAttempted: branch.lastAttempted,
      };
      if (branch.playerColor === 'b') challenge.moveList.shift();

      challenges.push(challenge);
    }
  }

  return challenges;
}

export async function GET() {
  const player = getPlayerData();
  const game = new Chess();

  if (Object.keys(player).length === 0) {
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

  const now = Date.now();

  const challenges = (await challengesFromBranch(player))
    .filter(c => {
      const interval = BASE_INTERVAL * 2 ** c.level;
      const elapsed = now - c.lastSolved;
      c.overdue = c.lastSolved === 0 ? 0 : elapsed - interval;
      c.isOverdue = c.overdue > 0;
      if (!c.isOverdue && c.lastSolved > 0) return false;
      if (!c.isOverdue && now - c.lastAttempted < 1000 * 60) return false;

      return c.evalFromPlayerPerspective <= MAX_EVAL;
    });

  challenges.sort((a, b) => {
    // Overdue challenges first
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;

    // Both overdue: more overdue first
    if (a.isOverdue && b.isOverdue) {
      if (a.overdue !== b.overdue)
        return b.overdue - a.overdue;
    } else {
      // Neither overdue: lower level first
      if (a.level !== b.level)
        return a.level - b.level;
    }

    // Same level: lower eval first
    return a.evalFromPlayerPerspective - b.evalFromPlayerPerspective;
  });

  savePlayerData();

  return Response.json(challenges);
}
