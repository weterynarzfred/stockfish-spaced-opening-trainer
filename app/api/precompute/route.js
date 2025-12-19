import evalFen from "@/app/lib/server/evalFen";
import { Chess } from "chess.js";

const MAX_DEPTH = 6; // total number of moves
const TARGET_EVAL = 0.07;

async function calcMoves(startFen) {
  let currentLevel = [startFen];

  for (let depth = 0; depth < MAX_DEPTH; depth++) {
    const nextLevel = [];

    for (let i = 0; i < currentLevel.length; i++) {
      const fen = currentLevel[i];
      const game = new Chess(fen);
      const moves = game.moves({ verbose: true });

      for (let j = 0; j < moves.length; j++) {
        game.move(moves[j]);
        const childFen = game.fen();
        const evaluation = await evalFen(
          childFen,
          `evaluating: ${childFen}`
        );
        game.undo();

        // continue the evaluation if the current player is not winning enough
        if (
          (game.turn() === "w" && evaluation.eval >= -TARGET_EVAL) ||
          (game.turn() === "b" && -evaluation.eval >= -TARGET_EVAL)
        ) {
          console.log(`depth ${depth}, set: ${i + 1} / ${currentLevel.length}, move ${j + 1}/${moves.length}, fen: ${childFen}, eval: ${evaluation.eval}, continuing`);
          nextLevel.push(childFen);
        } else {
          console.log(`depth ${depth}, set: ${i + 1} / ${currentLevel.length}, move ${j + 1}/${moves.length}, fen: ${childFen}, eval: ${evaluation.eval}, stopping`);
        }
      }
    }

    currentLevel = nextLevel;
  }
}

export async function GET() {
  await calcMoves(new Chess().fen());
  return Response.json({ ok: true });
}
