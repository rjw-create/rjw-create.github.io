/* The site is the game. Four levels, one per notebook entry, then a Contact finale. Beating a level lays its
   entry over the board; the level path replays any level; "Read without playing" switches to the reading view.
   The entries themselves live once, in the reading view: the sheet borrows an entry and puts it back. */
(function () {
  "use strict";

  const R = window.Rival;
  const LEVELS = R.LEVELS;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const STAR_SVG =
    '<svg class="star" viewBox="0 0 100 100" aria-hidden="true" focusable="false">' +
    '<polygon points="50,6 62,38 96,38 69,59 79,92 50,72 21,92 31,59 4,38 38,38"/></svg>';
  const root = document.documentElement;
  const $ = (id) => document.getElementById(id);

  const els = {
    game: $("game"), board: $("board"), pathList: $("path-list"), title: $("level-title"), rule: $("rule"),
    status: $("status"), hint: $("hint"), retry: $("retry"), skip: $("skip"), hudLevel: $("hud-level"),
    hudScore: $("hud-score"), sound: $("sound"), readToggle: $("read-toggle"), backToGame: $("back-to-game"),
    reading: $("reading"), sheet: $("sheet"), sheetLabel: $("sheet-label"), sheetPage: $("sheet-page"),
    sheetNext: $("sheet-next"), sheetBack: $("sheet-back"),
  };

  // Per-visit progress: "won" or "skipped" for each level, losses on the current level.
  const progress = LEVELS.map(() => "");
  let levelIndex = 0;
  let losses = 0;
  let state = null;
  let trail = [];
  let busy = false;
  let cells = [];
  let youPiece = null;
  let rivalPiece = null;
  let borrowed = null; // { node, home } while an entry sits in the sheet

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
      win() { [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.1, 0.3)); },
      lose() { tone(262, 0, 0.25); tone(196, 0.14, 0.35); },
    };
  })();

  // ------------------------------------------------------------ reading view and its focusable links
  // In game mode the reading view is off screen; its links leave the Tab order (screen-reader browsing
  // still reaches them) so sighted keyboard users never land on something they cannot see.
  function setReadingFocusable(yes) {
    els.reading.querySelectorAll("a, button").forEach((el) => {
      if (el === els.backToGame) return;
      if (yes) el.removeAttribute("tabindex");
      else el.setAttribute("tabindex", "-1");
    });
  }

  function setMode(mode) {
    root.classList.toggle("mode-game", mode === "game");
    root.classList.toggle("mode-reading", mode === "reading");
    els.readToggle.textContent = mode === "game" ? "Read without playing" : "Back to the game";
    els.backToGame.hidden = mode !== "reading";
    setReadingFocusable(mode === "reading");
    if (mode === "reading") {
      window.scrollTo(0, 0);
      els.reading.querySelector(".reading-title").setAttribute("tabindex", "-1");
      els.reading.querySelector(".reading-title").focus();
    } else {
      focusBoard(true);
    }
  }

  // ------------------------------------------------------------ the entry sheet
  function showSheet(label, node, nextText, onNext) {
    putBack();
    borrowed = { node, home: node.nextSibling };
    els.sheetLabel.textContent = label;
    els.sheetPage.appendChild(node);
    node.querySelectorAll("a").forEach((a) => a.removeAttribute("tabindex"));
    els.sheetNext.textContent = nextText;
    els.sheetNext.onclick = () => { els.sheet.close(); onNext(); };
    els.sheet.showModal();
    els.sheetPage.scrollTop = 0;
    els.sheetNext.focus();
  }

  function putBack() {
    if (!borrowed) return;
    els.reading.insertBefore(borrowed.node, borrowed.home);
    borrowed = null;
    setReadingFocusable(root.classList.contains("mode-reading"));
  }

  els.sheet.addEventListener("close", () => {
    // The close event arrives a moment later; if Next already opened the next sheet, leave it alone.
    if (els.sheet.open) return;
    putBack();
    focusBoard(true);
  });
  els.sheetBack.addEventListener("click", () => els.sheet.close());

  function showEntry(i, how) {
    const level = LEVELS[i];
    const isLast = i === LEVELS.length - 1;
    const label = how === "won" ? `Level ${i + 1} won. Entry opened: ${level.name}.` : `Level ${i + 1} skipped. Here is the entry anyway: ${level.name}.`;
    showSheet(label, $(level.id), isLast ? "Finale: contact" : `Next level: ${LEVELS[i + 1].name}`, () => {
      if (isLast) showFinale();
      else startLevel(i + 1);
    });
  }

  function showFinale() {
    const won = progress.filter((p) => p === "won").length;
    showSheet(`Finale. You beat ${won} of ${LEVELS.length} levels.`, $("contact"), "Play again from level 1", () => {
      progress.fill("");
      startLevel(0);
    });
    renderPath(true);
  }

  // ------------------------------------------------------------ level path (D's track list)
  function renderPath(finale) {
    els.pathList.textContent = "";
    const items = LEVELS.map((l, i) => ({ no: String(i + 1).padStart(2, "0"), name: l.name, state: progress[i], go: () => startLevel(i), current: !finale && i === levelIndex }));
    items.push({ no: "05", name: "Contact", state: "finale", go: showFinale, current: !!finale });
    items.forEach((it) => {
      const li = document.createElement("li");
      const b = document.createElement("button");
      b.type = "button";
      b.className = "path-step";
      if (it.state) b.dataset.state = it.state;
      if (it.current) b.setAttribute("aria-current", "step");
      const stateText = it.state === "won" ? "won" : it.state === "skipped" ? "skipped" : it.state === "finale" ? "finale" : it.current ? "playing" : "";
      b.innerHTML = `<span class="path-no">${it.no}</span><span class="path-name">${it.name}</span><span class="path-state">${stateText}</span>`;
      b.setAttribute("aria-label", `${it.state === "finale" ? "Finale" : "Level " + Number(it.no)}: ${it.name}${stateText ? ", " + stateText : ""}`);
      b.addEventListener("click", it.go);
      li.appendChild(b);
      els.pathList.appendChild(li);
    });
  }

  // ------------------------------------------------------------ board
  function buildBoard() {
    for (let sq = 0; sq < R.N * R.N; sq++) {
      const b = document.createElement("button");
      b.type = "button";
      b.className = "cell";
      b.addEventListener("click", () => tryMove(sq));
      els.board.appendChild(b);
      cells.push(b);
    }
    youPiece = document.createElement("span");
    youPiece.className = "piece piece-you";
    rivalPiece = document.createElement("span");
    rivalPiece.className = "piece piece-rival";
    els.board.append(youPiece, rivalPiece);
  }

  function place(el, sq) {
    el.style.setProperty("--r", String(R.rowOf(sq)));
    el.style.setProperty("--c", String(R.colOf(sq)));
  }

  function burst(sq, rival) {
    if (reducedMotion.matches) return;
    const b = document.createElement("span");
    b.className = rival ? "burst burst-rival" : "burst";
    b.innerHTML = STAR_SVG;
    place(b, sq);
    els.board.appendChild(b);
    b.addEventListener("animationend", () => b.remove(), { once: true });
  }

  function cellLabel(sq, move) {
    const parts = [];
    if (move) parts.push(`Step ${move.dir} to`);
    parts.push(R.squareName(sq));
    if (sq === state.you) parts.push("you");
    if (sq === state.rival) parts.push("the rival");
    if (state.stars.includes(sq)) parts.push("star");
    const t = trail.indexOf(sq);
    if (t >= 0) parts.push(t === trail.length - 1 ? "the rival's last square" : "the rival's square before that");
    return parts.join(", ");
  }

  function render() {
    const over = R.isOver(state);
    const legal = over || busy ? [] : R.legalMoves(state.you, state.rival);
    cells.forEach((b, sq) => {
      const move = legal.find((m) => m.to === sq);
      const t = trail.indexOf(sq);
      b.innerHTML = state.stars.includes(sq) ? STAR_SVG
        : t >= 0 ? `<span class="trail${t < trail.length - 1 ? " trail-old" : ""}"></span>` : "";
      b.disabled = !move;
      if (move) b.dataset.legal = move.dir;
      else delete b.dataset.legal;
      b.setAttribute("aria-label", cellLabel(sq, move));
    });
    place(youPiece, state.you);
    place(rivalPiece, state.rival);
    els.hudScore.innerHTML = `Stars: you <b>${state.mine}</b>, rival <b>${state.theirs}</b> · stars left <b>${state.stars.length}</b>`;
  }

  function ruleHtml(level) {
    const goal = `<p class="rule-goal">Take more stars than the red rival. The level ends when all ${level.stars.length} stars are gone.</p>`;
    const keys = '<p class="rule-keys">You are the square. Tap a square next to it, or press the arrow keys.</p>';
    if (!level.hidden) return `${goal}<p class="rule-text">${R.RULES[level.rule].text}</p>${keys}`;
    const list = Object.keys(R.RULES).map((id) => `<li>${R.RULES[id].text}</li>`).join("");
    return `${goal}<p class="rule-text">Its rule is hidden. It is one of these; the red dots are its last two steps.</p><ol class="rule-list" type="A">${list}</ol>${keys}`;
  }

  function startLevel(i) {
    if (i !== levelIndex) losses = 0;
    levelIndex = i;
    const level = LEVELS[i];
    state = R.startState(level);
    trail = level.trail ? level.trail.slice() : [];
    busy = false;
    els.hudLevel.textContent = `Level ${i + 1} of ${LEVELS.length}: ${level.name}`;
    els.title.textContent = `Level ${i + 1}: ${level.name}`;
    els.rule.innerHTML = ruleHtml(level);
    els.status.textContent = "";
    els.status.className = "status";
    showHint();
    renderPath(false);
    render();
  }

  function showHint() {
    if (losses < 2) {
      els.hint.hidden = true;
      return;
    }
    const first = R.winningMoves(R.startState(LEVELS[levelIndex]))[0];
    els.hint.hidden = false;
    els.hint.textContent = `Hint: your first step should be ${first.dir}.`;
  }

  function tryMove(to) {
    if (busy || R.isOver(state)) return;
    const move = R.legalMoves(state.you, state.rival).find((m) => m.to === to);
    if (!move) return;
    const hadFocus = els.game.contains(document.activeElement);
    const before = state;
    const { state: next, events } = R.play(state, to);

    // Show your step first, then the rival's, so its rule can be watched.
    busy = true;
    state = { ...next, rival: before.rival, theirs: before.theirs, stars: events.rivalTook ? next.stars.concat(events.rivalTo) : next.stars };
    render();
    if (events.took) { burst(to, false); sound.star(); } else sound.step();

    window.setTimeout(() => {
      state = next;
      if (events.rivalTo !== events.rivalFrom) trail = [events.rivalFrom];
      else trail = [];
      busy = false;
      render();
      if (events.rivalTook) { burst(events.rivalTo, true); sound.star(); } else sound.rival();
      afterTurn(move, events, hadFocus);
    }, reducedMotion.matches ? 150 : 450);
  }

  function afterTurn(move, events, hadFocus) {
    const said = [`You stepped ${move.dir}${events.took ? " and took a star" : ""}.`];
    if (events.rivalTo === events.rivalFrom) said.push("The rival waited.");
    else said.push(`The rival stepped ${R.dirBetween(events.rivalFrom, events.rivalTo)}${events.rivalTook ? " and took a star" : ""}.`);

    if (!R.isOver(state)) {
      els.status.textContent = said.join(" ");
      if (hadFocus) focusBoard(true);
      return;
    }
    const level = LEVELS[levelIndex];
    const score = `${state.mine} to ${state.theirs}`;
    const ruleNote = level.hidden ? ` Its rule was ${level.rule}.` : "";
    if (state.mine > state.theirs) {
      progress[levelIndex] = "won";
      losses = 0;
      said.push(`You won, ${score}.${ruleNote}`);
      els.status.textContent = said.join(" ");
      els.status.className = "status status-won";
      sound.win();
      renderPath(false);
      window.setTimeout(() => showEntry(levelIndex, "won"), reducedMotion.matches ? 300 : 900);
    } else {
      losses += 1;
      said.push(`${state.mine === state.theirs ? "A draw" : "The rival won"}, ${score}.${ruleNote} Retry, or skip the level.`);
      els.status.textContent = said.join(" ");
      sound.lose();
      showHint();
      els.retry.focus();
    }
  }

  // Keep keyboard play going: focus a legal square (always when forced, else only if focus is in the game).
  function focusBoard(force) {
    if (root.classList.contains("mode-reading") || els.sheet.open) return;
    const first = cells.find((b) => !b.disabled);
    if (first && (force || els.game.contains(document.activeElement))) first.focus();
  }

  // Arrow keys play from anywhere on the game screen, not only once the board has focus (the user, 2026-11-09).
  // Left alone: the reading view, an open entry page, typing in a field, and keys pressed with a modifier.
  document.addEventListener("keydown", (e) => {
    const dir = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" }[e.key];
    if (!dir || e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    if (root.classList.contains("mode-reading") || els.sheet.open) return;
    const t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
    e.preventDefault();
    const move = R.legalMoves(state.you, state.rival).find((m) => m.dir === dir);
    if (move) tryMove(move.to);
  });

  els.retry.addEventListener("click", () => {
    startLevel(levelIndex);
    const first = cells.find((b) => !b.disabled);
    if (first) first.focus();
  });
  els.skip.addEventListener("click", () => {
    if (progress[levelIndex] !== "won") progress[levelIndex] = "skipped";
    renderPath(false);
    showEntry(levelIndex, "skipped");
  });

  if (sound.available) {
    els.sound.hidden = false;
    els.sound.addEventListener("click", () => {
      const on = sound.toggle();
      els.sound.setAttribute("aria-pressed", String(on));
      els.sound.textContent = on ? "Sound: on" : "Sound: off";
    });
  }
  els.readToggle.addEventListener("click", () => setMode(root.classList.contains("mode-game") ? "reading" : "game"));
  els.backToGame.addEventListener("click", () => setMode("game"));

  // A link to an entry (#pathways) opens the reading view there; #level-3 opens that level.
  function route() {
    const hash = location.hash.slice(1);
    const m = /^level-([1-4])$/.exec(hash);
    if (m) return startLevel(Number(m[1]) - 1);
    const target = hash && document.getElementById(hash);
    if (target && els.reading.contains(target)) {
      setMode("reading");
      target.scrollIntoView();
    }
  }

  // Start: the game replaces the plain page.
  els.game.hidden = false;
  els.hudLevel.hidden = false;
  els.hudScore.hidden = false;
  els.readToggle.hidden = false;
  setReadingFocusable(false);
  buildBoard();
  startLevel(0);
  route();
  window.addEventListener("hashchange", route);
})();
