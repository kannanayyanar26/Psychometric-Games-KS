/* ============================================================
   PsychoZone — games.js
   Standalone game logic for Memory Vault & Calculus Rush
   Created by: Kannan & Sriram
   Contact: kannanayyanar007@gmail.com | PH: 9360399257
   ============================================================ */

/* ============================================================
   HOW TO USE THIS FILE
   ============================================================
   Option 1 — Link in your HTML:
     <script src="games.js"></script>

   Option 2 — Run in Node.js (CLI text mode):
     node games.js

   The games auto-detect environment:
   • Browser  → full DOM / UI mode
   • Node.js  → text-based CLI mode
   ============================================================ */

// ─────────────────────────────────────────────
//  ENVIRONMENT DETECTION
// ─────────────────────────────────────────────
const IS_BROWSER = typeof window !== 'undefined' && typeof document !== 'undefined';

// ─────────────────────────────────────────────
//  UTILITY HELPERS
// ─────────────────────────────────────────────

/** Fisher-Yates shuffle */
function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Simple sleep (Promise-based) */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/** Log helper — works in both environments */
function log(...args) {
  console.log(...args);
}

// ─────────────────────────────────────────────
//  SHARED STATE STORE
// ─────────────────────────────────────────────
const GameState = {
  memoryVault: {
    cards: [],
    flipped: [],
    matched: 0,
    moves: 0,
    time: 0,
    timer: null,
    locked: false,
    totalPairs: 8,
  },
  calculusRush: {
    score: 0,
    streak: 0,
    questionIndex: 0,
    active: false,
    timeLeft: 10,
    timerInterval: null,
    totalQuestions: 10,
  }
};

// ─────────────────────────────────────────────
//  ╔══════════════════════════════╗
//  ║    GAME 1 — MEMORY VAULT    ║
//  ╚══════════════════════════════╝
// ─────────────────────────────────────────────

const MEMORY_EMOJIS = ['🌟', '🔮', '💎', '🎭', '🦋', '🔱', '⚜️', '🌙'];

/**
 * MemoryVault — Main Game Object
 */
const MemoryVault = {

  /** Reset & initialise a new game */
  init() {
    const s = GameState.memoryVault;
    clearInterval(s.timer);
    s.moves    = 0;
    s.matched  = 0;
    s.time     = 0;
    s.flipped  = [];
    s.locked   = false;

    // Create 8 pairs, shuffle
    s.cards = shuffle([...MEMORY_EMOJIS, ...MEMORY_EMOJIS]).map((emoji, i) => ({
      id: i,
      emoji,
      isFlipped: false,
      isMatched: false,
    }));

    log('\n╔════════════════════════════╗');
    log('║      🧠  MEMORY VAULT       ║');
    log('╚════════════════════════════╝');
    log('Match all 8 pairs to win!\n');

    if (IS_BROWSER) {
      this._renderBoard();
      this._updateHUD();
      this._startTimer();
    } else {
      this._cliPlay();
    }
  },

  // ── TIMER ──
  _startTimer() {
    const s = GameState.memoryVault;
    clearInterval(s.timer);
    s.timer = setInterval(() => {
      s.time++;
      this._updateHUD();
    }, 1000);
  },

  // ── HUD ──
  _updateHUD() {
    if (!IS_BROWSER) return;
    const s = GameState.memoryVault;
    const el = id => document.getElementById(id);
    if (el('mem-moves')) el('mem-moves').textContent = s.moves;
    if (el('mem-pairs')) el('mem-pairs').textContent = `${s.matched}/${s.totalPairs}`;
    if (el('mem-time'))  el('mem-time').textContent  = `${s.time}s`;
  },

  // ── BROWSER BOARD RENDER ──
  _renderBoard() {
    const s   = GameState.memoryVault;
    const board = document.getElementById('memory-board');
    if (!board) return;
    board.innerHTML = '';
    document.getElementById('mem-result')?.classList.remove('active');

    s.cards.forEach(card => {
      const el = document.createElement('div');
      el.className = 'mem-card';
      el.dataset.id = card.id;
      el.innerHTML = `
        <div class="card-inner">
          <div class="card-front">◆</div>
          <div class="card-back">${card.emoji}</div>
        </div>`;
      el.addEventListener('click', () => this.flipCard(card.id));
      board.appendChild(el);
    });
  },

  // ── FLIP LOGIC ──
  flipCard(cardId) {
    const s    = GameState.memoryVault;
    const card = s.cards[cardId];

    if (s.locked || card.isFlipped || card.isMatched) return;

    card.isFlipped = true;
    s.flipped.push(card);

    if (IS_BROWSER) {
      const el = document.querySelector(`.mem-card[data-id="${cardId}"]`);
      el?.classList.add('flipped');
    } else {
      log(`  Flipped card ${cardId}: ${card.emoji}`);
    }

    if (s.flipped.length === 2) {
      s.moves++;
      this._updateHUD();
      s.locked = true;
      this._checkMatch();
    }
  },

  // ── MATCH CHECK ──
  _checkMatch() {
    const s = GameState.memoryVault;
    const [a, b] = s.flipped;

    if (a.emoji === b.emoji) {
      // ✅ Match
      a.isMatched = b.isMatched = true;
      s.matched++;
      this._updateHUD();

      if (IS_BROWSER) {
        [a, b].forEach(c => {
          document.querySelector(`.mem-card[data-id="${c.id}"]`)?.classList.add('matched');
        });
      } else {
        log(`  ✅ MATCH! ${a.emoji} — Pairs found: ${s.matched}/${s.totalPairs}`);
      }

      s.flipped = [];
      s.locked  = false;

      if (s.matched === s.totalPairs) {
        clearInterval(s.timer);
        setTimeout(() => this._win(), 400);
      }

    } else {
      // ❌ No match
      setTimeout(() => {
        a.isFlipped = b.isFlipped = false;
        s.flipped   = [];
        s.locked    = false;

        if (IS_BROWSER) {
          [a, b].forEach(c => {
            document.querySelector(`.mem-card[data-id="${c.id}"]`)?.classList.remove('flipped');
          });
        } else {
          log(`  ❌ No match. Try again.`);
        }
      }, 900);
    }
  },

  // ── WIN ──
  _win() {
    const s = GameState.memoryVault;
    const msg = `Completed in ${s.moves} moves & ${s.time}s!`;

    log(`\n🏆 YOU WIN! ${msg}`);

    if (IS_BROWSER) {
      const res = document.getElementById('mem-result');
      if (res) {
        res.querySelector('#mem-result-msg').textContent = msg + ' Amazing recall! 🎉';
        res.classList.add('active');
      }
    }
  },

  // ── CLI MODE ──
  async _cliPlay() {
    const s = GameState.memoryVault;
    log('Running CLI simulation (auto-play demo)...\n');

    // Auto-play: reveal all pairs sequentially as a demo
    const pairs = {};
    s.cards.forEach(c => {
      if (!pairs[c.emoji]) pairs[c.emoji] = [];
      pairs[c.emoji].push(c.id);
    });

    s.timer = setInterval(() => { s.time++; }, 1000);

    for (const [emoji, ids] of Object.entries(pairs)) {
      await sleep(600);
      this.flipCard(ids[0]);
      await sleep(600);
      this.flipCard(ids[1]);
      await sleep(1000);
    }

    clearInterval(s.timer);
    log(`\n📊 FINAL STATS → Moves: ${s.moves} | Time: ${s.time}s | Pairs: ${s.matched}/${s.totalPairs}`);
  },

  // ── PUBLIC RESTART ──
  restart() {
    this.init();
  }
};

// ─────────────────────────────────────────────
//  ╔═══════════════════════════════╗
//  ║   GAME 2 — CALCULUS RUSH     ║
//  ╚═══════════════════════════════╝
// ─────────────────────────────────────────────

const CALCULUS_QUESTIONS = [
  { q: '3² + 4²',            hint: 'Pythagorean squares',  answer: 25,  opts: [20, 25, 30, 35]   },
  { q: '√144',               hint: 'Perfect square root',  answer: 12,  opts: [11, 12, 13, 14]   },
  { q: '5! (Factorial)',      hint: '5×4×3×2×1',           answer: 120, opts: [100, 110, 120, 125]},
  { q: 'log₁₀(1000)',        hint: 'Power of 10',          answer: 3,   opts: [2, 3, 4, 5]       },
  { q: '2⁸ = ?',             hint: 'Power of two',         answer: 256, opts: [128, 256, 512, 64] },
  { q: 'd/dx (x³)',          hint: 'Basic derivative',     answer: '3x²', opts: ['2x', '3x²', 'x³', '3x']},
  { q: '7 × 8 + 6',          hint: 'BODMAS rule',          answer: 62,  opts: [56, 62, 58, 64]   },
  { q: 'Area: circle r=7',   hint: 'π × r² ≈ 22/7 × r²', answer: 154, opts: [144, 154, 164, 174]},
  { q: 'Fibonacci: 8,13,?',  hint: 'Add previous two',    answer: 21,  opts: [18, 20, 21, 23]   },
  { q: '∫ 2x dx at x=3',     hint: 'x² + C, plug in x=3',answer: 9,   opts: [6, 9, 12, 18]     },
];

/**
 * CalculusRush — Main Game Object
 */
const CalculusRush = {

  /** Reset & initialise */
  init() {
    const s = GameState.calculusRush;
    clearInterval(s.timerInterval);
    s.score         = 0;
    s.streak        = 0;
    s.questionIndex = 0;
    s.active        = false;
    s.timeLeft      = 10;

    log('\n╔════════════════════════════╗');
    log('║    ⚡  CALCULUS RUSH        ║');
    log('╚════════════════════════════╝');
    log('Answer 10 questions as fast as you can!\n');

    if (IS_BROWSER) {
      this._resetUI();
    } else {
      this._cliPlay();
    }
  },

  // ── BROWSER UI RESET ──
  _resetUI() {
    const el = id => document.getElementById(id);
    if (el('calc-score'))     el('calc-score').textContent     = '0';
    if (el('calc-streak'))    el('calc-streak').textContent    = '0🔥';
    if (el('calc-qnum'))      el('calc-qnum').textContent      = '1/10';
    if (el('calc-question'))  el('calc-question').textContent  = 'Ready?';
    if (el('calc-hint'))      el('calc-hint').textContent      = 'Press START to begin';
    if (el('calc-timer-fill'))el('calc-timer-fill').style.width = '100%';
    if (el('calc-options'))   el('calc-options').innerHTML     = '';
    if (el('calc-result'))    el('calc-result').classList.remove('active');
    if (el('calc-start-btn')) el('calc-start-btn').style.display = 'block';
  },

  /** Start the game (called by Start button) */
  start() {
    const s = GameState.calculusRush;
    s.active = true;
    const btn = document.getElementById('calc-start-btn');
    if (btn) btn.style.display = 'none';
    this._showQuestion();
  },

  // ── SHOW QUESTION ──
  _showQuestion() {
    const s = GameState.calculusRush;
    if (s.questionIndex >= CALCULUS_QUESTIONS.length) { this._end(); return; }

    const q = CALCULUS_QUESTIONS[s.questionIndex];

    if (IS_BROWSER) {
      const el = id => document.getElementById(id);
      el('calc-qnum').textContent    = `${s.questionIndex + 1}/10`;
      el('calc-question').textContent = q.q;
      el('calc-hint').textContent     = q.hint;

      // Render options
      const optDiv = el('calc-options');
      optDiv.innerHTML = '';
      shuffle(q.opts).forEach(opt => {
        const btn = document.createElement('button');
        btn.className = 'calc-opt';
        btn.textContent = opt;
        btn.onclick = () => this.answer(btn, opt, q.answer);
        optDiv.appendChild(btn);
      });

      // Timer
      s.timeLeft = 10;
      clearInterval(s.timerInterval);
      el('calc-timer-fill').style.width = '100%';

      s.timerInterval = setInterval(() => {
        s.timeLeft -= 0.1;
        el('calc-timer-fill').style.width = `${(s.timeLeft / 10) * 100}%`;
        if (s.timeLeft <= 0) {
          clearInterval(s.timerInterval);
          s.streak = 0;
          el('calc-streak').textContent = '0🔥';
          log(`  ⏱ Time out on Q${s.questionIndex + 1}`);
          this._disableOptions();
          setTimeout(() => { s.questionIndex++; this._showQuestion(); }, 800);
        }
      }, 100);

    } else {
      log(`Q${s.questionIndex + 1}: ${q.q}  [${q.hint}]`);
      log(`  Options: ${q.opts.join(' | ')}`);
      log(`  Answer: ${q.answer}\n`);
    }
  },

  // ── ANSWER ──
  answer(btn, chosen, correct) {
    const s = GameState.calculusRush;
    if (!s.active) return;

    clearInterval(s.timerInterval);
    this._disableOptions();

    const isCorrect = String(chosen) === String(correct);

    if (isCorrect) {
      const bonus  = s.streak > 1 ? s.streak * 2 : 0;
      const earned = 10 + bonus;
      s.score  += earned;
      s.streak += 1;

      if (IS_BROWSER) {
        btn?.classList.add('correct');
        document.getElementById('calc-score').textContent  = s.score;
        document.getElementById('calc-streak').textContent = `${s.streak}🔥`;
      }
      log(`  ✅ Correct! +${earned} pts (streak: ${s.streak})`);

    } else {
      s.streak = 0;
      if (IS_BROWSER) {
        btn?.classList.add('wrong');
        document.getElementById('calc-streak').textContent = '0🔥';
        // Highlight correct answer
        document.querySelectorAll('.calc-opt').forEach(b => {
          if (String(b.textContent) === String(correct)) b.classList.add('correct');
        });
      }
      log(`  ❌ Wrong! Correct answer was: ${correct}`);
    }

    setTimeout(() => { s.questionIndex++; this._showQuestion(); }, 1000);
  },

  // ── DISABLE OPTIONS ──
  _disableOptions() {
    document.querySelectorAll?.('.calc-opt').forEach(b => {
      b.onclick = null;
      b.style.cursor = 'default';
    });
  },

  // ── END ──
  _end() {
    const s = GameState.calculusRush;
    s.active = false;

    let emoji = '⚡', title = 'Round Complete!';
    if (s.score >= 80)       { emoji = '🏆'; title = 'Genius Level!'; }
    else if (s.score >= 50)  { emoji = '🌟'; title = 'Sharp Mind!';   }
    else                     { emoji = '💪'; title = 'Keep Training!'; }

    const msg = `Score: ${s.score} pts | Best Streak: ${s.streak}🔥`;
    log(`\n${emoji} ${title} — ${msg}`);

    if (IS_BROWSER) {
      const el = id => document.getElementById(id);
      el('calc-result-emoji').textContent = emoji;
      el('calc-result-title').textContent  = title;
      el('calc-result-msg').textContent    = msg;
      el('calc-options').innerHTML         = '';
      el('calc-result').classList.add('active');
    }
  },

  // ── CLI SIMULATION ──
  async _cliPlay() {
    const s = GameState.calculusRush;
    s.active = true;
    log('Running CLI simulation (auto-answer demo)...\n');

    for (let i = 0; i < CALCULUS_QUESTIONS.length; i++) {
      s.questionIndex = i;
      const q = CALCULUS_QUESTIONS[i];
      log(`Q${i + 1}: ${q.q}  → Answer: ${q.answer}`);

      // Randomly answer correctly 70% of the time for demo
      const correct = Math.random() > 0.3;
      const chosen  = correct ? q.answer : q.opts.find(o => o !== q.answer);
      await sleep(300);
      this.answer(null, chosen, q.answer);
      await sleep(300);
    }

    log(`\n📊 FINAL → Score: ${s.score} | Streak Peak: ${s.streak}`);
  },

  /** Public restart */
  restart() { this.init(); }
};

// ─────────────────────────────────────────────
//  PUBLIC API (attach to window in browser)
// ─────────────────────────────────────────────
if (IS_BROWSER) {
  window.MemoryVault    = MemoryVault;
  window.CalculusRush   = CalculusRush;
  window.GameState      = GameState;

  // Convenience wrappers used by the HTML buttons
  window.initMemory     = ()       => MemoryVault.init();
  window.memFlipCard    = (id)     => MemoryVault.flipCard(id);
  window.initCalc       = ()       => CalculusRush.init();
  window.startCalc      = ()       => CalculusRush.start();
  window.answerCalc     = (b,c,a)  => CalculusRush.answer(b, c, a);

  log('[PsychoZone] games.js loaded ✅ — MemoryVault & CalculusRush ready.');
} else {
  // ── NODE.JS ENTRY POINT ──
  (async () => {
    log('==============================================');
    log('  PsychoZone CLI — games.js');
    log('  by Kannan & Sriram');
    log('  kannanayyanar007@gmail.com | 9360399257');
    log('==============================================\n');

    // Run Memory Vault demo
    MemoryVault.init();
    await sleep(6000); // let it auto-play

    // Run Calculus Rush demo
    CalculusRush.init();
    await sleep(4000);

    log('\n==============================================');
    log('  Both games completed. Thanks for playing!');
    log('==============================================');
  })();
}
