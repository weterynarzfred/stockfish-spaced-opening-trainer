export default function getEvalFromPlayerPerspective(move) {
  if (move.eval.toString().startsWith('mate-')) move.eval = -100;
  if (move.eval.toString().startsWith('mate+')) move.eval = 100;
  if (move.playerColor === "b") return -move.eval;
  return move.eval;
}
