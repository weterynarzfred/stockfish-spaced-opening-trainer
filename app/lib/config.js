export const MIN_LEVEL_TO_CONTINUE = 8; // the level a player needs to reach before the branch continues, it gets increased with move count
export const MAX_EVAL = 3; // don't challenge the player if they are already winning by this much. Increase to get more branches.
export const BASE_INTERVAL = 1000 * 60 * 60 * 24 * 365; // base time between repetitions in ms

export const ENGINE_EVAL_DEPTH = 30;
export const ENGINE_PATH = 'C:/Program Files/ChessEngines/stockfish_17.1/stockfish-windows-x86-64-avx2.exe';
export const ENGINE_MAX_THREADS = 24;
export const ENGINE_RAM_USAGE = 16 * 1024; // in megabytes

export const MAX_BRANCH_LEVEL = 50; // max level a branch can reach
