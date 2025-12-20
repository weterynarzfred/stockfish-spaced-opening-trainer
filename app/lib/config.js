export const MIN_LEVEL_TO_CONTINUE = 15; // the level a player needs to reach before the branch continues
export const MAX_EVAL = 3; // don't challenge the player if they are already winning by this much. Increase to get more branches.
export const BASE_INTERVAL = 120_000; // base time between repetitions in ms, this will grow exponentially with each level

export const ENGINE_EVAL_DEPTH = 30;
export const ENGINE_PATH = 'C:/Program Files/ChessEngines/stockfish_17.1/stockfish-windows-x86-64-avx2.exe';
export const ENGINE_MAX_THREADS = 24;
export const ENGINE_RAM_USAGE = 16 * 1024; // in megabytes
