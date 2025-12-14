import evalFen from "@/app/lib/evalFen";
import { Chess } from "chess.js";

export async function GET(req) {
  const { searchParams } = new URL(req.url);
  const fen = searchParams.get('fen') || new Chess().fen();
  const result = await evalFen(fen);

  return Response.json(result);
}
