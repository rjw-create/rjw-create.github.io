/* The front door: draws the board, plays turns with window.Rival, and opens one notebook entry per move.
   The page never depends on this script: without it every entry is simply open. */
(function () {
  "use strict";

  const R = window.Rival;
  const TRACKS = 4;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const STAR_SVG =
    '<svg class="star" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
    '<polygon points="50,6 62,38 96,38 69,59 79,92 50,72 21,92 31,59 4,38 38,38"/></svg>';

  const board = document.getElementById("board");
  const statusEl = document.getElementById("status");
  const actions = document.getElementById("board-actions");
  const scoreYou = document.getElementById("score-you");
  const scoreRival = document.getElementById("score-rival");
  const scoreMove = document.getElementById("score-move");
  const scoreTurns = document.getElementById("score-turns");
  const soundBtn = document.getElementById("sound");

  let puzzleIndex = 0;
  let state = null;
  let trail = -1;
  let busy = false;
  let cells = [];
  let youPiece = null;
  let rivalPiece = null;

  // ------------------------------------------------------------ entries
  function openEntry(n, announce) {
    const entry = document.querySelector(`.entry[data-track="${n}"]`);
    if (!entry || entry.classList.contains("is-open")) return false;
    entry.classList.add("is-open", "just-opened");
    entry.addEventListener("animationend", () => entry.classList.remove("just-opened"), { once: true });
    const stateEl = document.querySelector(`[data-state-for="${n}"]`);
    if (stateEl) {
      stateEl.textContent = "open";
      stateEl.classList.add("is-open");
    }
    if (announce) sound.page();
    return true;
  }

  function openAll() {
    for (let n = 1; n <= TRACKS; n++) openEntry(n, false);
  }

  document.querySelectorAll("[data-open-all]").forEach((a) => a.addEventListener("click", openAll));
  document.querySelectorAll("[data-track-link]").forEach((a) =>
    a.addEventListener("click", () => openEntry(Number(a.dataset.trackLink), false)));
  document.querySelectorAll(".unseal").forEach((b) =>
    b.addEventListener("click", () => {
      const n = Number(b.dataset.open);
      openEntry(n, false);
      const body = b.closest(".entry").querySelector(".entry-body");
      body.setAttribute("tabindex", "-1");
      body.focus({ preventScroll: true });
    }));

  // A visitor who arrives at #pathways (or any entry) sees it open.
  function openFromHash() {
    const target = location.hash && document.getElementById(location.hash.slice(1));
    const entry = target && target.closest(".entry");
    if (entry) openEntry(Number(entry.dataset.track), false);
  }
  window.addEventListener("hashchange", openFromHash);
  openFromHash();

  // ------------------------------------------------------------ sound (off until the visitor turns it on)
  const sound = (function () {
    let ctx = null;
    let on = false;
    function tone(freq, startS, lengthS, type) {
      if (!on || !ctx) return;
      const t = ctx.currentTime + startS;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type || "triangle";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.exponentialRampToValueAtTime(0.12, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + lengthS);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + lengthS + 0.02);
    }
    return {
      available: typeof window.AudioContext === "function",
      toggle() {
        on = !on;
        if (on && !ctx) ctx = new AudioContext();
        if (on && ctx.state === "suspended") ctx.resume();
        return on;
      },
      step() { tone(392, 0, 0.12); },
      rival() { tone(196, 0, 0.14, "square"); },
      star() { tone(523, 0, 0.1); tone(784, 0.08, 0.16); },
      page() { tone(330, 0, 0.18, "sine"); },
      win() { [523, 659, 784].forEach((f, i) => tone(f, i * 0.11, 0.3)); },
      lose() { tone(262, 0, 0.25); tone(196, 0.14, 0.35); },
    };
  })();

  if (sound.available) {
    soundBtn.hidden = false;
    soundBtn.addEventListener("click", () => {
      const on = sound.toggle();
      soundBtn.setAttribute("aria-pressed", String(on));
      soundBtn.textContent = on ? "Sound: on" : "Sound: off";
    });
  }

  // ------------------------------------------------------------ board
  function build() {
    board.textContent = "";
    cells = [];
    for (let sq = 0; sq < R.N * R.N; sq++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cell";
      b.dataset.sq = String(sq);
      b.addEventListener("click", () => tryMove(sq));
      board.appendChild(b);
      cells.push(b);
    }
    youPiece = document.createElement("span");
    youPiece.className = "piece piece-you";
    rivalPiece = document.createElement("span");
    rivalPiece.className = "piece piece-rival";
    board.append(youPiece, rivalPiece);
  }

  function place(piece, sq) {
    piece.style.setProperty("--r", String(R.rowOf(sq)));
    piece.style.setProperty("--c", String(R.colOf(sq)));
  }

  function cellLabel(sq, move) {
    const parts = [];
    if (move) parts.push(`Step ${move.dir} to`);
    parts.push(R.squareName(sq));
    if (sq === state.you) parts.push("you");
    if (sq === state.rival) parts.push("the rival");
    if (state.stars.includes(sq)) parts.push("star");
    return parts.join(", ");
  }

  function render() {
    const over = R.isOver(state);
    const legal = over ? [] : R.legalMoves(state.you, state.rival);
    cells.forEach((b, sq) => {
      const move = legal.find((m) => m.to === sq);
      b.innerHTML = state.stars.includes(sq) ? STAR_SVG : sq === trail ? '<span class="trail"></span>' : "";
      b.disabled = !move || busy;
      if (move) b.dataset.legal = move.dir;
      else delete b.dataset.legal;
      b.setAttribute("aria-label", cellLabel(sq, move));
    });
    place(youPiece, state.you);
    place(rivalPiece, state.rival);
    scoreYou.textContent = String(state.mine);
    scoreRival.textContent = String(state.theirs);
    scoreMove.textContent = String(Math.min(state.turn + 1, state.turns));
    scoreTurns.textContent = String(state.turns);
  }

  function start(index) {
    puzzleIndex = index % R.PUZZLES.length;
    state = R.startState(R.PUZZLES[puzzleIndex]);
    trail = -1;
    busy = false;
    actions.hidden = true;
    render();
  }

  function tryMove(to) {
    if (busy || R.isOver(state)) return;
    const move = R.legalMoves(state.you, state.rival).find((m) => m.to === to);
    if (!move) return;
    const hadFocus = board.contains(document.activeElement);
    const before = state;
    const { state: next, events } = R.play(state, to);

    // Show your step first, then the rival's, so the rule can be watched.
    busy = true;
    state = { ...next, rival: before.rival, theirs: before.theirs, stars: events.rivalTook ? next.stars.concat(events.rivalTo) : next.stars };
    render();
    if (events.took) sound.star(); else sound.step();

    window.setTimeout(() => {
      state = next;
      trail = events.rivalTo !== events.rivalFrom ? events.rivalFrom : -1;
      busy = false;
      render();
      if (events.rivalTook) sound.star(); else sound.rival();
      const opened = openEntry(state.turn, true);
      finishTurn(move, events, opened);
      if (hadFocus) focusAfterMove();
    }, reducedMotion.matches ? 120 : 420);
  }

  function finishTurn(move, events, opened) {
    const said = [`You stepped ${move.dir}${events.took ? " and took a star" : ""}.`];
    if (events.rivalTo === events.rivalFrom) said.push("The rival waited.");
    else {
      const dir = R.DIRS.find((d) => R.stepTo(events.rivalFrom, d) === events.rivalTo).name;
      said.push(`The rival stepped ${dir}${events.rivalTook ? " and took a star" : ""}.`);
    }
    if (opened) said.push(`Entry ${String(state.turn).padStart(2, "0")} is open below.`);

    if (R.isOver(state)) {
      openAll();
      const score = `${state.mine} to ${state.theirs}`;
      if (state.mine > state.theirs) {
        said.push(`You won, ${score}. You read the rival.`);
        sound.win();
      } else {
        const first = R.winningFirstMoves(R.PUZZLES[puzzleIndex])[0];
        said.push(`${state.mine === state.theirs ? "A draw" : "The rival won"}, ${score}. One first move wins: ${first.dir}. Every entry is open below.`);
        sound.lose();
      }
      actions.hidden = false;
    }
    statusEl.textContent = said.join(" ");
  }

  // Keep keyboard play going: focus a legal square, or the replay button at the end.
  function focusAfterMove() {
    if (R.isOver(state)) {
      document.getElementById("again").focus();
      return;
    }
    const first = cells.find((b) => !b.disabled);
    if (first) first.focus();
  }

  // Arrow keys step your piece while focus is on the board.
  board.addEventListener("keydown", (e) => {
    const dir = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[e.key];
    if (!dir) return;
    e.preventDefault();
    const move = R.legalMoves(state.you, state.rival).find((m) => m.dir === dir);
    if (move) tryMove(move.to);
  });

  document.getElementById("again").addEventListener("click", () => {
    start(puzzleIndex);
    focusAfterMove();
  });
  document.getElementById("another").addEventListener("click", () => {
    start(puzzleIndex + 1);
    focusAfterMove();
  });

  build();
  start(0);
})();
