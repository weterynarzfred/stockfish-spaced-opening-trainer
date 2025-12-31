const START_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
let totalGamesInDb = null;

async function getTotalGamesInDb() {
  if (totalGamesInDb !== null) return totalGamesInDb;

  const url = new URL("https://explorer.lichess.ovh/lichess");
  url.searchParams.set("fen", START_FEN);
  url.searchParams.set("moves", "0");

  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json" },
  });

  if (!res.ok)
    throw new Error(`Lichess API error: ${res.status}`);

  const data = await res.json();
  totalGamesInDb = data.white + data.draws + data.black;
  return totalGamesInDb;
}

export default async function getLichessContinuations(fen) {
  const [totalGames, res] = await Promise.all([
    getTotalGamesInDb(),
    fetch(
      (() => {
        const url = new URL("https://explorer.lichess.ovh/lichess");
        url.searchParams.set("fen", fen);
        url.searchParams.set("moves", "50");
        return url.toString();
      })(),
      { headers: { Accept: "application/json" } }
    ),
  ]);

  if (!res.ok)
    throw new Error(`Lichess API error: ${res.status}`);

  const data = await res.json();

  const countsByUci = {};
  for (const move of data.moves ?? []) {
    const moveGames =
      (move.white ?? 0) +
      (move.draws ?? 0) +
      (move.black ?? 0);

    countsByUci[move.uci] = moveGames / totalGames;
  }

  return countsByUci;
}
