let lastInfo = null; // store last "info" line for eval/pv

export default function parseStockfishResponse(data, startTime, fen) {
  let result = {};

  const sideToMove = fen?.split(" ")[1] || "w";

  data.toString()
    .split("\n")
    .map(line => line.trim())
    .map(line => {
      if (line.startsWith("info")) {
        lastInfo = line;
      }

      if (line.startsWith("bestmove")) {
        const parts = line.split(" ");
        const bestMove = parts[1];

        let evalCp = null;
        let pv = [];

        if (lastInfo) {
          const evalMatch = lastInfo.match(/score cp (-?\d+)/);
          if (evalMatch) {
            const rawCp = parseInt(evalMatch[1], 10);
            const whiteCp =
              sideToMove === "w" ? rawCp : -rawCp;

            evalCp = whiteCp / 100.0;
          }

          const mateMatch = lastInfo.match(/score mate (-?\d+)/);
          if (mateMatch) {
            const rawMate = parseInt(mateMatch[1], 10);
            const whiteMate =
              sideToMove === "w" ? rawMate : -rawMate;

            evalCp = whiteMate > 0
              ? `mate+${whiteMate}`
              : `mate${whiteMate}`;
          }

          const pvIndex = lastInfo.indexOf(" pv ");
          if (pvIndex !== -1)
            pv = lastInfo.slice(pvIndex + 4).split(" ");
        }

        result = {
          bestMove,
          eval: evalCp,
        };
      }
    });

  return result;
}
