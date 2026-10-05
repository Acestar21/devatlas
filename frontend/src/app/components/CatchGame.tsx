"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./WakeUpLoader.module.css";

const WIDTH = 320;
const HEIGHT = 200;
const PADDLE_WIDTH = 56;
const PADDLE_HEIGHT = 8;

type Drop = { x: number; y: number; speed: number; good: boolean };

/** Catch the braces, dodge the bugs. Mouse/finger or arrow keys. */
export default function CatchGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [round, setRound] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = WIDTH * dpr;
    canvas.height = HEIGHT * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const theme = getComputedStyle(document.documentElement);
    const read = (name: string, fallback: string) => theme.getPropertyValue(name).trim() || fallback;
    const colors = { bg: read("--card-bg", "#0c2116"), fg: read("--foreground", "#ffffff"), good: read("--primary", "#52f77d"), bad: "#b34d4d" };

    let paddleX = WIDTH / 2;
    let drops: Drop[] = [];
    let points = 0;
    let remaining = 3;
    let lastSpawn = 0;
    let last = performance.now();
    let over = false;
    let frame = 0;

    const clampPaddle = (x: number) => Math.max(PADDLE_WIDTH / 2, Math.min(WIDTH - PADDLE_WIDTH / 2, x));
    const onPointer = (event: PointerEvent) => {
      const rect = canvas.getBoundingClientRect();
      paddleX = clampPaddle(((event.clientX - rect.left) / rect.width) * WIDTH);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") paddleX = clampPaddle(paddleX - 24);
      if (event.key === "ArrowRight") paddleX = clampPaddle(paddleX + 24);
    };
    canvas.addEventListener("pointermove", onPointer);
    canvas.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50) / 1000;
      last = now;

      if (!over) {
        if (now - lastSpawn > 650) {
          lastSpawn = now;
          drops.push({ x: 14 + Math.random() * (WIDTH - 28), y: -10, speed: 70 + Math.random() * 60 + points * 2, good: Math.random() > 0.3 });
        }
        drops = drops.filter((drop) => {
          drop.y += drop.speed * dt;
          const atPaddle = drop.y >= HEIGHT - PADDLE_HEIGHT - 10 && Math.abs(drop.x - paddleX) <= PADDLE_WIDTH / 2 + 8;
          if (atPaddle) {
            if (drop.good) {
              points += 1;
              setScore(points);
            } else {
              remaining -= 1;
              setLives(remaining);
              if (remaining <= 0) over = true;
            }
            return false;
          }
          return drop.y < HEIGHT + 12;
        });
      }

      ctx.fillStyle = colors.bg;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.font = "bold 16px monospace";
      ctx.textAlign = "center";
      for (const drop of drops) {
        ctx.fillStyle = drop.good ? colors.good : colors.bad;
        ctx.fillText(drop.good ? "{}" : "bug", drop.x, drop.y);
      }
      ctx.fillStyle = colors.fg;
      ctx.fillRect(paddleX - PADDLE_WIDTH / 2, HEIGHT - PADDLE_HEIGHT - 4, PADDLE_WIDTH, PADDLE_HEIGHT);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      canvas.removeEventListener("pointermove", onPointer);
      canvas.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [round]);

  const restart = () => {
    setScore(0);
    setLives(3);
    setRound((n) => n + 1);
  };

  return (
    <div className={styles.game}>
      <div className={styles.hud}>
        <span>Catch {"{}"}, dodge bugs</span>
        <span>Score {score} · Lives {lives}</span>
      </div>
      <div className={styles.canvasBox}>
        <canvas ref={canvasRef} className={styles.canvas} aria-label="Catch the braces mini-game" />
        {lives <= 0 && (
          <div className={styles.over}>
            <span>Game over · {score}</span>
            <button className={styles.play} onClick={restart}>Play again</button>
          </div>
        )}
      </div>
    </div>
  );
}