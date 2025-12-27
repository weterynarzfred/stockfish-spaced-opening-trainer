import { spawn } from 'child_process';

import { getCache, setCache } from "@/app/lib/server/db";
import parseStockfishResponse from "@/app/lib/server/parseStockfishResponse";
import {
  ENGINE_EVAL_DEPTH,
  ENGINE_MAX_THREADS,
  ENGINE_PATH,
  ENGINE_RAM_USAGE
} from "@/app/lib/config";

if (!globalThis.stockfish) {
  globalThis.stockfish = {
    engine: spawn(ENGINE_PATH),
    evalInProgress: false,
    awaitingReady: false,
    resolveEval: null,
    readyToken: 0,
  };

  const engine = globalThis.stockfish.engine;

  engine.stdin.write('uci\n');
  engine.stdin.write(`setoption name Threads value ${ENGINE_MAX_THREADS}\n`);
  engine.stdin.write(`setoption name Hash value ${ENGINE_RAM_USAGE}\n`);
  engine.stdin.write('setoption name MultiPV value 1\n');
  engine.stdin.write('isready\n');

  engine.stdout.on('data', data => {
    const text = data.toString();

    if (text.includes('readyok') && globalThis.stockfish.awaitingReady)
      globalThis.stockfish.awaitingReady = false;

    if (text.includes('bestmove') && globalThis.stockfish.resolveEval) {
      globalThis.stockfish.resolveEval(data);
      globalThis.stockfish.resolveEval = null;
      globalThis.stockfish.evalInProgress = false;
    }
  });
}

function makeCacheKey(fen) {
  let key = `${ENGINE_EVAL_DEPTH}_${fen}`.split(' ');
  key.splice(-1);
  if (parseInt(key[key.length - 1]) < 20) key.splice(-1);
  return key.join(' ');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function evalWithStockfish(fen) {
  const sf = globalThis.stockfish;

  while (sf.evalInProgress) await sleep(5);
  sf.evalInProgress = true;

  const token = ++sf.readyToken;
  sf.awaitingReady = token;
  sf.engine.stdin.write('ucinewgame\n');
  sf.engine.stdin.write('isready\n');
  while (sf.awaitingReady === token) await sleep(5);

  sf.engine.stdin.write(
    fen === 'startpos'
      ? 'position startpos\n'
      : `position fen ${fen}\n`
  );
  sf.engine.stdin.write(`go depth ${ENGINE_EVAL_DEPTH}\n`);

  return new Promise(resolve => {
    const startTime = Date.now();
    sf.resolveEval = output =>
      resolve(parseStockfishResponse(output, startTime, fen));
  });
}

export default async function evalFen(fen) {
  const cacheKey = makeCacheKey(fen);
  const cached = getCache(cacheKey);
  if (cached) return { cached: true, ...cached };
  const result = await evalWithStockfish(fen);
  setCache(cacheKey, result);

  return { cached: false, ...result };
}

process.on("exit", () => {
  if (globalThis.stockfish?.engine)
    globalThis.stockfish.engine.kill();
});
