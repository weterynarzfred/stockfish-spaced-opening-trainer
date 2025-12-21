"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";
import formatDuration from "@/app/lib/formatDuration";
import classNames from "classnames";

export default function Home() {
  const gameRef = useRef(null);
  const [fen, setFen] = useState(undefined);
  const [evaluation, setEvaluation] = useState(null);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(0);
  const [finishedComment, setFinishedComment] = useState('');
  const [moveIndex, setMoveIndex] = useState(0);
  const [challengeFinished, setChallengeFinished] = useState(false);
  const [mistakes, setMistakes] = useState([]);
  const [playerData, setPlayerData] = useState({
    challenge: {
      playerColor: '',
      moveList: [],
    },
    topChallenges: [],
  });

  const fetchChallenge = async () => {
    setIsLoading(prev => prev + 1);
    const res = await fetch(`/api/challenge`);
    const data = await res.json();
    setPlayerData(data);
    if (data?.challenge === undefined) {
      setComment("no challenges available");
      setIsLoading(prev => prev - 1);
      return;
    }
    const pos = data.challenge;

    gameRef.current = new Chess(pos.fen);
    setFen(gameRef.current.fen());
    setIsLoading(prev => prev - 1);
    setMoveIndex(0);
    setFinishedComment("");
    setChallengeFinished(false);
    setComment("");
    setMistakes([]);
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
    console.log('opponent move', moveIndex, playerData.challenge.moveList.length);

    const nextIndex = moveIndex + 1;

    if (nextIndex >= playerData.challenge.moveList.length) {
      setFinishedComment("challenge completed");
      setChallengeFinished(true);
      await sendChallengeResult();
      return;
    }

    const expectedMove = playerData.challenge.moveList[nextIndex];

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
      playerColor: playerData.challenge.playerColor,
      startingFen: playerData.challenge.fen,
      moveList: playerData.challenge.moveList,
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
      (gameRef.current.turn() === "w" && playerData.challenge.playerColor === "w") ||
      (gameRef.current.turn() === "b" && playerData.challenge.playerColor === "b");

    if (!isPlayerTurn) return false;

    const expectedMove = playerData.challenge.moveList[moveIndex];

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

  const delay = 120 * 1.5 ** playerData.challenge.level;
  const now = Date.now();

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>

      <div style={{ display: "flex", gap: "40px", alignItems: 'flex-start' }}>
        <div style={{ opacity: fen === undefined ? 0 : 1, transition: '.3s' }}>
          <Chessboard
            options={{
              position: fen,
              onPieceDrop: onDrop,
              boardOrientation: playerData.challenge?.playerColor === 'b' ? 'black' : 'white',
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
          <hr />
          <div>Evaluation: {evaluation !== null ? evaluation : "…"}</div>
          <div>Move List: <span className={playerData.challenge.level > 0 ? "spoiler" : ""}>{playerData.challenge?.moveList?.join(', ')}</span></div>
          <div>Level: {playerData.challenge.level} — <small style={{ opacity: .6 }}>120 × 1.5<sup>{playerData.challenge.level}</sup> = {formatDuration(delay)}</small></div>
          <hr />
          <small>
            <div>Overdue challenges count: {playerData.overdueCount}</div>
            <div>Unseen challenges count: {playerData.notAttemptedCount}</div>
            <div>Waiting challenges count: {playerData.waitingCount}</div>
            {playerData.waitingCount > 0 ? <div style={{ opacity: .6 }}>Next waiting challenge will be due in: {formatDuration(playerData.waitingMinDelay / 1000)}</div> : null}
            <div>Branch level sum: {playerData.levelSum}</div>
            <div>Top branches list:
              <div style={{ paddingLeft: '.5rem', display: 'grid', gridTemplateColumns: 'auto auto auto auto', gap: '0 1rem' }}>
                {playerData.topChallenges.map(e => {
                  const overdue = 120 * 1.5 ** e.level - (now - e.lastSolved) / 1000;
                  return <div
                    key={e.fullMoveList.join()}
                    style={{ display: "contents" }}
                    className={classNames("branch", { "branch--seen": e.level > 0, "branch--overdue": overdue < 0 })}
                  >
                    <div>{e.playerColor}: {e.fullMoveList.join(' ')}</div>
                    <div>{e.evalFromPlayerPerspective}</div>
                    <div>lvl {e.level}</div>
                    <div>{formatDuration(overdue)}</div>
                  </div>;
                })}
              </div>
            </div>
          </small>
        </div>
      </div>

    </div >
  );
}
