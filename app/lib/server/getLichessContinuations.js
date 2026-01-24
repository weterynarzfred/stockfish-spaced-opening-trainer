const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
let totalGamesInDb = null;
let totalGamesPromise = null;

const LICHESS_EXPLORER_URL = "https://explorer.lichess.ovh/lichess";
const MAX_ATTEMPTS = 5;
const ATTEMPT_DELAY_MS = 5000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function shouldRetry(status) {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

async function fetchWithRetry(url, options = {}) {
  let lastErr;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const res = await fetch(url, options);

      if (res.ok) return res;
      if (!shouldRetry(res.status))
        throw new Error(`Lichess API error: ${res.status}`);

      lastErr = new Error(`Lichess API transient error: ${res.status}`);
    } catch (err) {
      lastErr = err;
    }

    if (attempt < MAX_ATTEMPTS) {
      console.log(`attempt failed, will try again after a delay: ${lastErr}`);

      await sleep(ATTEMPT_DELAY_MS);
      continue;
    }

    throw new Error(`Request failed after ${MAX_ATTEMPTS} attempts: ${lastErr}`);
  }
}

function buildExplorerUrl(fen, moves) {
  const url = new URL(LICHESS_EXPLORER_URL);
  url.searchParams.set("fen", fen);
  url.searchParams.set("moves", String(moves));
  return url.toString();
}

async function getTotalGamesInDb() {
  if (totalGamesInDb !== null) return totalGamesInDb;
  if (totalGamesPromise) return totalGamesPromise;

  totalGamesPromise = (async () => {
    const url = buildExplorerUrl(START_FEN, 0);

    const res = await fetchWithRetry(url, {
      headers: { Accept: "application/json" },
    });

    const data = await res.json();
    const total = (data.white ?? 0) + (data.draws ?? 0) + (data.black ?? 0);

    totalGamesInDb = total;
    return totalGamesInDb;
  })();

  try {
    return await totalGamesPromise;
  } finally {
    totalGamesPromise = null;
  }
}

export default async function getLichessContinuations(fen) {
  const url = buildExplorerUrl(fen, 50);

  const [totalGames, res] = await Promise.all([
    getTotalGamesInDb(),
    fetchWithRetry(url, { headers: { Accept: "application/json" } }),
  ]);

  const data = await res.json();

  const countsByUci = {};
  for (const move of data.moves ?? []) {
    const moveGames =
      (move.white ?? 0) + (move.draws ?? 0) + (move.black ?? 0);

    countsByUci[move.uci] = totalGames > 0 ? moveGames / totalGames : 0;
  }

  return countsByUci;
}
