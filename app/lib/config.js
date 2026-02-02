// --- Spaced Repetition ---

// Levels represent spaced-repetition mastery. Higher levels increase intervals
// and unlock branches to expand.

// The level a player needs to reach before the branch continues. The
// requirement gets increased by one for each move a player has to make after
// the first one.
export const MIN_LEVEL_TO_CONTINUE = 8;
// The player won't be shown positions where they are already winning by this
// much. Increase to get more branches. It automatically decreases as lines get
// deeper.
export const MAX_EVAL = 2; // pawns
// Max time between repetitions, other intervals are calculated as
// fractions of this.
export const BASE_INTERVAL = 1000 * 60 * 60 * 24 * 365; // ms
// A max level a branch can reach.
export const MAX_BRANCH_LEVEL = 50;
// Minimum "weight" a challenge has to have to be presented to the player. It's
// based on popularity and eval. Decrease to get deeper and weirder positions.
// Weight here doesn't represent anything concrete, it's an internal measure.
export const MIN_CHALLENGE_WEIGHT = 0.01;


// --- Engine Configuration ---

export const ENGINE_EVAL_DEPTH = 30; // plies
export const ENGINE_PATH = 'C:/Program Files/ChessEngines/stockfish_17.1/stockfish-windows-x86-64-avx2.exe';
export const ENGINE_MAX_THREADS = 24;
export const ENGINE_RAM_USAGE = 8 * 1024; // megabytes
