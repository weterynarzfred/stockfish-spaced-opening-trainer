import { spawn } from 'child_process';

import { getCache, setCache } from "@/app/lib/server/db";
import parseStockfishResponse from "@/app/lib/server/parseStockfishResponse";
import {
  ENGINE_EVAL_DEPTH,
  ENGINE_MAX_THREADS,
  ENGINE_PATH,
  ENGINE_RAM_USAGE
} from "@/app/lib/config";

if (!globalThis.engine) {
  console.log("----- starting the engine");
  globalThis.engine = spawn(ENGINE_PATH);
  globalThis.engine.stdin.write('uci\n');
  globalThis.engine.stdin.write(`setoption name Threads value ${ENGINE_MAX_THREADS}\n`);
  globalThis.engine.stdin.write(`setoption name Hash value ${ENGINE_RAM_USAGE}\n`);
  globalThis.engine.stdin.write('setoption name MultiPV value 1\n');
  globalThis.engine.stdin.write('setoption name SyzygyPath value \n');
  globalThis.engine.stdin.write('isready\n');
}

globalThis.listeners = [];

function createDataListener({ resolve, startTime, fen, cacheKey }) {
  const currentListener = function listener(data) {
    const result = parseStockfishResponse(data, startTime, fen);

    // When Stockfish emits "bestmove", resolve this request
    if (result.bestMove) {
      setCache(cacheKey, result);
      console.log(`evaluation done in ${result.timeMs} ms`);
      resolve({ cached: false, ...result });
    }
  };
  globalThis.listeners.push(currentListener);
  return currentListener;
}

let queue = Promise.resolve();

export default function evalFen(fen, log) {
  let cacheKey = `${ENGINE_EVAL_DEPTH}_${fen}`.split(" ");
  cacheKey.splice(-1);
  if (parseInt(cacheKey[cacheKey.length - 1]) < 20) cacheKey.splice(-1);
  cacheKey = cacheKey.join(" ");
  const cached = getCache(cacheKey);
  if (cached) return { cached: true, ...cached };

  queue = queue.then(() => runEval(fen, cacheKey, log));
  return queue;
}

function runEval(fen, cacheKey, log) {
  if (log) console.log(log);
  while (globalThis.listeners.length > 0) globalThis.engine.stdout.off('data', globalThis.listeners.pop());

  return new Promise(resolve => {
    const startTime = Date.now();
    const currentDataListener = createDataListener({ resolve, startTime, fen, cacheKey });
    globalThis.engine.stdout.on('data', currentDataListener);

    if (fen === 'startpos') globalThis.engine.stdin.write('position startpos\n');
    else globalThis.engine.stdin.write(`position fen ${fen}\n`);
    globalThis.engine.stdin.write(`go depth ${ENGINE_EVAL_DEPTH}\n`);
  });
};

process.on("exit", () => {
  console.log("----- exit");
  console.log(globalThis.engine);

  if (globalThis.engine) {
    console.log("----- killing the engine");
    globalThis.engine.kill();
  }
});
