"use client";

export default function ExitButton() {
  function handleExit() {
    window.location.href = "/login/exit";
  }

  return <button onClick={handleExit}>Exit</button>;
}
