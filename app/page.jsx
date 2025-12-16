"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

export default function Home() {
  const gameRef = useRef(null);
  const [fen, setFen] = useState(undefined);
  const [playerColor, setPlayerColor] = useState('');
  const [evaluation, setEvaluation] = useState(null);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(0);
  const [finishedComment, setFinishedComment] = useState('');
  const [moveList, setMoveList] = useState([]);
  const [moveIndex, setMoveIndex] = useState(0);
  const [challengeFinished, setChallengeFinished] = useState(false);
  const [startingFen, setStartingFen] = useState("");
  const [mistakes, setMistakes] = useState([]);
  const [level, setLevel] = useState([]);

  const fetchChallenge = async () => {
    setIsLoading(prev => prev + 1);
    const res = await fetch(`/api/challenge`);
    const data = await res.json();
    if (data.length === 0) {
      setComment("no challenges available");
      setIsLoading(prev => prev - 1);
      return;
    }
    const pos = data[0];

    setPlayerColor(pos.playerColor);
    gameRef.current = new Chess(pos.fen);
    setFen(gameRef.current.fen());
    setMoveList(pos.moveList);
    setIsLoading(prev => prev - 1);
    setMoveIndex(0);
    setFinishedComment("");
    setChallengeFinished(false);
    setComment("");
    setStartingFen(pos.fen);
    setMistakes([]);
    setLevel(pos.level);
  };

  useEffect(() => {
    fetchChallenge();
  }, []);

  const fetchEval = useCallback(async fen => {
    if (fen === undefined) return;

    setIsLoading(prev => prev + 1);
    setEvaluation("");

    const res = await fetch(`/api/stockfish?fen=${encodeURIComponent(fen)}`);
    const data = await res.json();

    setEvaluation(data.eval);
    setIsLoading(prev => prev - 1);
  }, []);

  useEffect(() => {
    fetchEval(fen);
  }, [fen, fetchEval]);

  const opponentMove = async () => {
    console.log('opponent move', moveIndex, moveList.length);

    const nextIndex = moveIndex + 1;

    if (nextIndex >= moveList.length) {
      setFinishedComment("challenge completed");
      setChallengeFinished(true);
      await sendChallengeResult();
      return;
    }

    const expectedMove = moveList[nextIndex];

    try {
      gameRef.current.move(expectedMove);
    } catch {
      setFinishedComment("invalid challenge data");
      setChallengeFinished(true);
      return;
    }

    setMoveIndex(prev => prev + 1);
    setFen(gameRef.current.fen());
  };

  const sendChallengeResult = async () => {
    const payload = {
      playerColor,
      startingFen,
      moveList,
      mistakes,
    };

    try {
      await fetch("/api/challenge/result", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
    } catch (e) {
      console.error("failed to send challenge result", e);
    }
  };


  const onDrop = async ({ sourceSquare, targetSquare }) => {
    if (challengeFinished) return false;

    const isPlayerTurn =
      (gameRef.current.turn() === "w" && playerColor === "w") ||
      (gameRef.current.turn() === "b" && playerColor === "b");

    if (!isPlayerTurn) return false;


    const expectedMove = moveList[moveIndex];

    let move;
    try {
      move = gameRef.current.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: "q",
      });
    } catch {
      return false;
    }

    // Wrong move → revert immediately
    if (move.san !== expectedMove) {
      gameRef.current.undo();

      setMistakes(prev => {
        if (prev.includes(moveIndex)) return prev;
        return [...prev, moveIndex];
      });

      setComment(`expected ${expectedMove}`);
      return false;
    }

    setComment("");
    setMoveIndex(prev => prev + 1);
    setFen(gameRef.current.fen());

    await opponentMove();
    return true;
  };


  const undoMove = () => {
    gameRef.current.undo();
    setFen(gameRef.current.fen());
  };

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>

      <div style={{ display: "flex", gap: "40px" }}>
        <div style={{ opacity: fen === undefined ? 0 : 1, transition: '.3s' }}>
          <Chessboard
            options={{
              position: fen,
              onPieceDrop: onDrop,
              boardOrientation: playerColor === 'b' ? 'black' : 'white',
            }}
          />
        </div>

        <div>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <button onClick={undoMove}> ← </button>
            <div>{comment}</div>
            <div>{finishedComment}</div>
            <div>{isLoading ? '…thinking' : ''}</div>
          </div>
          <br />
          <hr />
          <br />
          <div>Evaluation: {evaluation !== null ? evaluation : "…"}</div>
          <div>Move List: <span className={level > 0 ? "spoiler" : ""}>{moveList.join(', ')}</span></div>
          <div>Level: {level} — <small style={{ opacity: .6 }}>2<sup>{level}</sup> = {2 ** level}s</small></div>
        </div>
      </div>
    </div >
  );
}
