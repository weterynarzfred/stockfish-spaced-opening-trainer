# Stockfish Spaced Opening Trainer

A highly opinionated chess opening trainer built for personal use.

This project is a Next.js application that uses Stockfish to generate and drill opening positions using spaced repetition. It deliberately ignores opening names and instead focuses exclusively on engine evaluation and popularity (via Lichess API).

The goal is not to memorize theory, but to build intuition for a set of opening positions by repeatedly finding the move Stockfish determines to be the best.

## How it works

On first run, the application initializes a set of challenges:

- One starting position where you play White
- Twenty starting positions where you play Black (one for each legal first move by White)

For each position, Stockfish is used to calculate the best move at a fixed search depth. Positions where the player’s side is already winning by a configurable margin (100 centipawns by default) are discarded. The remaining positions are ordered and presented as training challenges

Each challenge asks you to play the exact move Stockfish considers best. Any other move is treated as a mistake, even if it is strong.

Challenges use a spaced repetition system. Every successful attempt increases the challenge’s level, mistakes lower it. The level determines how long it takes before the challenge is shown again

Once a challenge reaches a sufficiently high level, it is expanded. All reasonable opponent replies are generated. Clearly bad opponent moves are discarded using the same filtering as before. The resulting positions are added as new challenges. Over time, this turns single-move drills into deeper opening trees, but only along lines where both sides play sensibly according to the engine.

## Non-goals

This project intentionally does not:
- teach opening names or classifications
- accept “good enough” moves
- explain *why* a move is good

If a move is not the best move according to Stockfish, it is treated as incorrect.

## Running locally

Requirements:
- Node.js
- Stockfish (installed locally)

Before running, update the hardcoded Stockfish path in: `app/lib/evalFen.js`.

Clone the repository and install dependencies:
```
npm install
npm run dev
```