/**
 * Office Affair — Phase 1 Prototype
 * Vanilla JS modular architecture (stubs + minimal runnable flow)
 */

/* =============================================================================
 * GAME CONFIG
 * ============================================================================= */

const GAME_CONFIG = {
  gameDuration: 90,
  goodEndMinScore: 70,

  bossStates: {
    IDLE: 'IDLE',
    PREPARE: 'PREPARE',
    LOOKING: 'LOOKING',
    CAUGHT: 'CAUGHT',
  },

  coupleStates: {
    ARGUING: 'ARGUING',
    KISSING: 'KISSING',
  },

  bossTiming: {
    idlePoseCountMin: 2,
    idlePoseCountMax: 7,
    idleFrameMin: 700,
    idleFrameMax: 2500,
    preparePhases: [
      { afterElapsedRatio: 0, min: 700, max: 1500 },
      { afterElapsedRatio: 1 / 3, min: 500, max: 1100 },
      { afterElapsedRatio: 2 / 3, min: 300, max: 800 },
    ],
    lookingPoseCountMin: 1,
    lookingPoseCountMax: 4,
    lookingFrameMin: 1000,
    lookingFrameMax: 2000,
  },

  kissCycleDuration: 1000,
  breathHoldMin: 35,

  // Speed tiers use kisses in the CURRENT hold, not total score.
  // Release the button to reset back to the first tier.
  speedTiers: [
    { minScore: 0, maxScore: 15, multiplier: 4.0 },
    { minScore: 16, maxScore: 35, multiplier: 7 },
    { minScore: 36, maxScore: 50, multiplier: 10 },
    { minScore: 51, maxScore: 75, multiplier: 14 },
    { minScore: 76, maxScore: Infinity, multiplier: 20 },
  ],

  caught: {
    triggerDurationMs: 3000,
    sadFrameDurationMs: 700,
    sadSequenceDurationMs: 5000,
    endingOverlayMs: 7000,
  },

  leaderboardKey: 'officeAffairLeaderboard',
  leaderboardMaxEntries: 20,
  leaderboardClearPassword: 'Archspire',

  // Character art — one asset set per group (A solo, BC shared, DE shared)
  characterAssets: {
    A: {
      frames: ['Pics/A01.webp', 'Pics/A02.webp', 'Pics/A03.webp'],
      frameDurationMs: 700,
    },
    BC: {
      idle: [
        'Pics/BC_normal_01.webp',
        'Pics/BC_normal_02.webp',
        'Pics/BC_normal_03.webp',
        'Pics/BC_normal_04.webp',
      ],
      prepare: ['Pics/BC_prepare_01.webp'],
      looking: [
        'Pics/BC_alert_01.webp',
        'Pics/BC_alert_02.webp',
        'Pics/BC_alert_03.webp',
        'Pics/BC_alert_04.webp',
      ],
      trigger: 'Pics/BC_trigger_01.webp',
      sad: ['Pics/BC_sad_01.webp', 'Pics/BC_sad_02.webp'],
    },
    DE: {
      arguingFrames: [
        'Pics/DE_argue_01.webp',
        'Pics/DE_argue_02.webp',
      ],
      kissingFrames: [
        'Pics/DE_kiss_01.webp',
        'Pics/DE_kiss_02.webp',
      ],
      trigger: 'Pics/DE_trigger_01.webp',
      sad: ['Pics/DE_sad_01.webp', 'Pics/DE_sad_02.webp'],
    },
    F: {
      trigger: 'Pics/F_crying_01.webp',
      sad: ['Pics/F_crying_02.webp', 'Pics/F_crying_03.webp'],
    },
    endings: {
      bad: 'Pics/bad_end.webp',
      good: 'Pics/good_end.webp',
      normal: 'Pics/normal_end.webp',
    },
  },
};

function randomInt(min, max) {
  return Math.floor(min + Math.random() * (max - min + 1));
}

function randomMs(min, max) {
  return randomInt(min, max);
}

function getPrepareDurationMs(elapsedRatio) {
  const phases = GAME_CONFIG.bossTiming.preparePhases;
  let phase = phases[0];
  for (const candidate of phases) {
    if (elapsedRatio >= candidate.afterElapsedRatio) phase = candidate;
  }
  return randomMs(phase.min, phase.max);
}

function pickRandom(list, exclude) {
  if (!list.length) return null;
  if (list.length === 1) return list[0];
  const pool = exclude ? list.filter((item) => item !== exclude) : list;
  return pool[Math.floor(Math.random() * pool.length)];
}

/* =============================================================================
 * SPEED TIER (standalone function — ready for Kiss System)
 * ============================================================================= */

function getKissSpeedMultiplier(holdKissCount) {
  const tier = GAME_CONFIG.speedTiers.find(
    (t) => holdKissCount >= t.minScore && holdKissCount <= t.maxScore
  );
  return tier ? tier.multiplier : 1.0;
}

/* =============================================================================
 * ENDING SYSTEM (standalone function — ready for game-over flow)
 * ============================================================================= */

function determineEnding(wasCaught, score) {
  if (wasCaught) return 'BAD END';
  if (score >= GAME_CONFIG.goodEndMinScore) return 'GOOD END';
  return 'NORMAL END';
}

/* =============================================================================
 * SCORE SYSTEM
 * ============================================================================= */

class ScoreSystem {
  constructor() {
    this.score = 0;
  }

  reset() {
    this.score = 0;
  }

  addKiss() {
    this.score += 1;
    return this.score;
  }

  getScore() {
    return this.score;
  }
}

/* =============================================================================
 * TIMER SYSTEM
 * ============================================================================= */

class TimerSystem {
  constructor(durationSec, onTick, onComplete) {
    this.durationSec = durationSec;
    this.remainingSec = durationSec;
    this.onTick = onTick;
    this.onComplete = onComplete;
    this._intervalId = null;
  }

  start() {
    this.stop();
    this.remainingSec = this.durationSec;
    this._intervalId = setInterval(() => {
      this.remainingSec -= 1;
      this.onTick(this.remainingSec);
      if (this.remainingSec <= 0) {
        this.stop();
        this.onComplete();
      }
    }, 1000);
  }

  stop() {
    if (this._intervalId) {
      clearInterval(this._intervalId);
      this._intervalId = null;
    }
  }

  getRemaining() {
    return this.remainingSec;
  }
}

/* =============================================================================
 * BOSS STATE MACHINE
 * IDLE → PREPARE → LOOKING → IDLE ...
 * LOOKING + KISSING → CAUGHT
 * ============================================================================= */

class BossStateMachine {
  constructor({ characterAnim, onStateChange, isKissing, onCaught }) {
    this.characterAnim = characterAnim;
    this.onStateChange = onStateChange;
    this.isKissing = isKissing;
    this.onCaught = onCaught;
    this.state = GAME_CONFIG.bossStates.IDLE;
    this._running = false;
    this._timeoutId = null;
    this._posesRemaining = 0;
  }

  reset() {
    this._clearTimer();
    this.setState(GAME_CONFIG.bossStates.IDLE);
  }

  setState(nextState) {
    this.state = nextState;
    if (this.onStateChange) this.onStateChange(nextState);
  }

  getState() {
    return this.state;
  }

  start() {
    this.stop();
    this._running = true;
    this._runIdle();
  }

  stop() {
    this._running = false;
    this._clearTimer();
  }

  checkCaught() {
    if (!this._running) return false;
    if (this.state !== GAME_CONFIG.bossStates.LOOKING) return false;
    if (!this.isKissing()) return false;
    this._triggerCaught();
    return true;
  }

  _clearTimer() {
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }

  _schedule(ms, fn) {
    this._clearTimer();
    this._timeoutId = setTimeout(() => {
      this._timeoutId = null;
      fn();
    }, ms);
  }

  _runIdle() {
    if (!this._running) return;
    this.setState(GAME_CONFIG.bossStates.IDLE);
    this._posesRemaining = randomInt(
      GAME_CONFIG.bossTiming.idlePoseCountMin,
      GAME_CONFIG.bossTiming.idlePoseCountMax
    );
    this._playNextIdlePose();
  }

  _playNextIdlePose() {
    if (!this._running) return;
    const duration = this.characterAnim.showBCIdle();
    this._posesRemaining -= 1;

    if (this._posesRemaining > 0) {
      this._schedule(duration, () => this._playNextIdlePose());
      return;
    }

    this._schedule(duration, () => this._runPrepare());
  }

  _runPrepare() {
    if (!this._running) return;
    this.setState(GAME_CONFIG.bossStates.PREPARE);
    const duration = this.characterAnim.showBCPrepare();
    this._schedule(duration, () => this._runLooking());
  }

  _runLooking() {
    if (!this._running) return;
    this.setState(GAME_CONFIG.bossStates.LOOKING);
    this._posesRemaining = randomInt(
      GAME_CONFIG.bossTiming.lookingPoseCountMin,
      GAME_CONFIG.bossTiming.lookingPoseCountMax
    );

    if (this.isKissing()) {
      this._triggerCaught();
      return;
    }

    this._playNextLookingPose();
  }

  _playNextLookingPose() {
    if (!this._running) return;

    if (this.isKissing()) {
      this._triggerCaught();
      return;
    }

    const duration = this.characterAnim.showBCLooking();
    this._posesRemaining -= 1;

    if (this._posesRemaining > 0) {
      this._schedule(duration, () => this._playNextLookingPose());
      return;
    }

    this._schedule(duration, () => this._runIdle());
  }

  _triggerCaught() {
    if (!this._running) return;
    this._running = false;
    this._clearTimer();
    this.setState(GAME_CONFIG.bossStates.CAUGHT);
    if (this.onCaught) this.onCaught();
  }
}

/* =============================================================================
 * CHARACTER ANIMATION MANAGER (placeholder visuals)
 * ============================================================================= */

class CharacterAnimationManager {
  constructor({ getElapsedRatio } = {}) {
    this.getElapsedRatio = getElapsedRatio || (() => 0);
    this.elements = {
  A: document.getElementById('character-a'),
  BC: document.getElementById('character-bc'),
  DE: document.getElementById('character-de'),
};

    // Art asset groups — swap sprites on these containers when art is ready
    this.groups = {
      A: document.getElementById('character-group-a'),
      BC: document.getElementById('character-group-bc'),
      DE: document.getElementById('character-group-de'),
    };

    this.aFrames = GAME_CONFIG.characterAssets.A.frames;

    this.deArguingFrames = GAME_CONFIG.characterAssets.DE.arguingFrames;
    this.deKissingFrames = GAME_CONFIG.characterAssets.DE.kissingFrames;

    this._aIndex = 0;
    this._deIndex = 0;
    this._lastBCIdle = null;
    this._lastBCLooking = null;
    this._sadIndex = 0;
    this._sadDeadline = 0;

    this._aIntervalId = null;
    this._deIntervalId = null;
    this._caughtTimeoutId = null;
  }

    startInitialKiss() {
  const frames = this.deKissingFrames;

  if (!frames.length) return;

  // 第一次按下 KISS，從 DE_kiss_01.webp 開始
  this._deIndex = 0;
  this._applyDEFrame(frames);
}

  advanceKissFrame() {
  const frames = this.deKissingFrames;

  if (!frames.length) return false;

  // 01 → 02 → 01 → 02 → ...
  this._deIndex =
    (this._deIndex + 1) % frames.length;

  this._applyDEFrame(frames);

  // 只有 01 → 02 才算完成一次 Kiss
  const completedKiss =
    this._deIndex === 1;

  return completedKiss;
}

  start() {
    this.stop();

    this._aIndex = 0;
    this._deIndex = 0;
    this._lastBCIdle = null;
    this._lastBCLooking = null;

    this._startAAnimation();
    this.setCoupleState(GAME_CONFIG.coupleStates.ARGUING);
    this.hideDEBreath();
    this.hideF();
  }

  stop({ includeA = true } = {}) {
    if (includeA && this._aIntervalId) {
      clearInterval(this._aIntervalId);
      this._aIntervalId = null;
    }

    if (this._deIntervalId) {
      clearInterval(this._deIntervalId);
      this._deIntervalId = null;
    }

    this._clearCaughtTimer();
    this.hideF();
    this.hideDEBreath();
  }

  _clearCaughtTimer() {
    if (this._caughtTimeoutId) {
      clearTimeout(this._caughtTimeoutId);
      this._caughtTimeoutId = null;
    }
  }

  _startAAnimation() {
    if (!this.aFrames.length) return;
    if (this._aIntervalId) return;

    this._applyAFrame();
    const duration = GAME_CONFIG.characterAssets.A.frameDurationMs;
    this._aIntervalId = setInterval(() => {
      this._aIndex = (this._aIndex + 1) % this.aFrames.length;
      this._applyAFrame();
    }, duration);
  }

  showBCIdle() {
    const frames = GAME_CONFIG.characterAssets.BC.idle;
    const frame = pickRandom(frames, this._lastBCIdle);
    this._lastBCIdle = frame;
    this.setBCImage(frame);
    return randomMs(
      GAME_CONFIG.bossTiming.idleFrameMin,
      GAME_CONFIG.bossTiming.idleFrameMax
    );
  }

  showBCPrepare() {
    const frame = GAME_CONFIG.characterAssets.BC.prepare[0];
    this.setBCImage(frame);
    return getPrepareDurationMs(this.getElapsedRatio());
  }

  showBCLooking() {
    const frames = GAME_CONFIG.characterAssets.BC.looking;
    const frame = pickRandom(frames, this._lastBCLooking);
    this._lastBCLooking = frame;
    this.setBCImage(frame);
    return randomMs(
      GAME_CONFIG.bossTiming.lookingFrameMin,
      GAME_CONFIG.bossTiming.lookingFrameMax
    );
  }

  setBCImage(src) {
    const sprite = document.getElementById('character-bc-sprite');
    if (sprite && src) sprite.src = src;
  }

  setDEImage(src) {
    const sprite = document.getElementById('character-de-sprite');
    if (sprite && src) sprite.src = src;
  }

  setFImage(src) {
    const sprite = document.getElementById('character-f-sprite');
    if (sprite && src) sprite.src = src;
  }

  showF(src) {
    const el = document.getElementById('character-f');
    this.setFImage(src);
    if (el) el.hidden = false;
  }

  hideF() {
    const el = document.getElementById('character-f');
    if (el) el.hidden = true;
  }

  playCaughtSequence(onComplete) {
    this.stop({ includeA: false });
    this.setBCImage(GAME_CONFIG.characterAssets.BC.trigger);
    this.setDEImage(GAME_CONFIG.characterAssets.DE.trigger);
    this.showF(GAME_CONFIG.characterAssets.F.trigger);

    this._sadSequence = [
      { bc: GAME_CONFIG.characterAssets.BC.sad[0] },
      { de: GAME_CONFIG.characterAssets.DE.sad[0] },
      { f: GAME_CONFIG.characterAssets.F.sad[0] },
      { bc: GAME_CONFIG.characterAssets.BC.sad[1] },
      { de: GAME_CONFIG.characterAssets.DE.sad[1] },
      { f: GAME_CONFIG.characterAssets.F.sad[1] },
    ];

    this._caughtTimeoutId = setTimeout(() => {
      this._sadIndex = 0;
      this._sadDeadline = Date.now() + GAME_CONFIG.caught.sadSequenceDurationMs;
      this.setFImage(GAME_CONFIG.characterAssets.F.sad[0]);
      this._playSadStep(onComplete);
    }, GAME_CONFIG.caught.triggerDurationMs);
  }

  _playSadStep(onComplete) {
    const remaining = this._sadDeadline - Date.now();
    if (remaining <= 0) {
      if (onComplete) onComplete();
      return;
    }

    const step = this._sadSequence[this._sadIndex % this._sadSequence.length];
    if (step.bc) this.setBCImage(step.bc);
    if (step.de) this.setDEImage(step.de);
    if (step.f) this.setFImage(step.f);
    this._sadIndex += 1;

    const wait = Math.min(GAME_CONFIG.caught.sadFrameDurationMs, remaining);
    this._caughtTimeoutId = setTimeout(() => {
      this._playSadStep(onComplete);
    }, wait);
  }

  setCoupleState(state) {
    const isKissing =
      state === GAME_CONFIG.coupleStates.KISSING;

    ['D', 'E'].forEach((id) => {
      const el = this.elements[id];
      if (!el) return;

      el.classList.toggle('is-kissing', isKissing);
    });

    // 每次切換狀態時重新開始 DE 圖片循環
    this._startDEAnimation(isKissing);
  }

  _startDEAnimation(isKissing) {
    if (this._deIntervalId) {
      clearInterval(this._deIntervalId);
      this._deIntervalId = null;
    }

    this._deIndex = 0;

    const frames = isKissing
      ? this.deKissingFrames
      : this.deArguingFrames;

    if (!frames.length) return;

    this._applyDEFrame(frames);

    // Kiss 圖片切換速度由 KissSystem 的 cycle 控制。
    // 因此 KISS 狀態下不在這裡使用固定 interval。
    if (isKissing) return;

    // ARGUING 狀態使用固定速度輪播。
    const duration = 1000;

    this._deIntervalId = setInterval(() => {
      if (this._deIndex >= frames.length - 1) {
        this._deIndex = 0;
      } else {
        this._deIndex += 1;
      }

      this._applyDEFrame(frames);
    }, duration);
  }

  _applyDEFrame(frames) {
  if (!frames || !frames.length) return;

  const frame = frames[this._deIndex % frames.length];

  const sprite = document.getElementById('character-de-sprite');

  if (!sprite) return;

  sprite.src = frame;
}

  _applyAFrame() {
    const sprite = document.getElementById('character-a-sprite');
    if (sprite && this.aFrames[this._aIndex]) {
      sprite.src = this.aFrames[this._aIndex];
    }
  }

  showDEBreath() {
    const el = document.getElementById('character-de-breath');
    if (el) el.hidden = false;
  }

  hideDEBreath() {
    const el = document.getElementById('character-de-breath');
    if (el) el.hidden = true;
  }
}

/* =============================================================================
 * KISS SYSTEM
 * ============================================================================= */

class KissSystem {
  constructor(scoreSystem, characterAnim, onScoreChange) {
    this.scoreSystem = scoreSystem;
    this.characterAnim = characterAnim;
    this.onScoreChange = onScoreChange;

    this.isKissing = false;
    this.holdKissCount = 0;
    this._cycleTimeoutId = null;
  }

  /**
   * Start the Kiss Cycle.
   *
   * 玩家按住 KISS 後：
   * ARGUING → KISSING
   *
   * 每完成一個完整 Kiss Cycle：
   * score + 1
   *
   * Cycle 完成後會自動開始下一個 Cycle。
   */
  startKissing() {
  if (this.isKissing) return;

  this.isKissing = true;
  this.holdKissCount = 0;
  this.characterAnim.hideDEBreath();

  this.characterAnim.setCoupleState(
    GAME_CONFIG.coupleStates.KISSING
  );

  // 第一次按下 KISS，先顯示 DE_kiss_01.webp
  this.characterAnim.startInitialKiss();

  this._scheduleNextCycle();
}

  /**
   * Schedule one Kiss Cycle.
   *
   * 實際 cycle 時間：
   *
   * kissCycleDuration / speedMultiplier
   *
   * 例如：
   * 1000ms / 1.0  = 1000ms
   * 1000ms / 1.25 = 800ms
   * 1000ms / 1.5  = 666.67ms
   * 1000ms / 1.75 = 571.43ms
   * 1000ms / 2.0  = 500ms
   */
  _scheduleNextCycle() {
    if (!this.isKissing) return;

    const speedMultiplier = getKissSpeedMultiplier(this.holdKissCount);

    const cycleDuration =
      GAME_CONFIG.kissCycleDuration / speedMultiplier;

    this._cycleTimeoutId = setTimeout(() => {
  this._cycleTimeoutId = null;

  // 切換 Kiss 圖片：
  // DE_kiss_01.webp → DE_kiss_02.webp
  // DE_kiss_02.webp → DE_kiss_01.webp
  const completedKiss =
    this.characterAnim.advanceKissFrame();

  // 只有 DE_kiss_01.webp → DE_kiss_02.webp 才加分
  if (completedKiss) {
    this.holdKissCount += 1;

    if (this.holdKissCount > GAME_CONFIG.breathHoldMin) {
      this.characterAnim.showDEBreath();
    }

    const newScore =
      this.scoreSystem.addKiss();

    // 通知 GameManager / UI 更新 HUD
    if (this.onScoreChange) {
      this.onScoreChange(newScore);
    }
  }

  // 下一個 Cycle
  this._scheduleNextCycle();

}, cycleDuration);
  }

  /**
   * Stop Kiss Cycle immediately.
   *
   * 玩家放開 KISS：
   * KISSING → ARGUING
   *
   * 尚未完成的 cycle 不會計分。
   */
  stopKissing() {
    this.characterAnim.hideDEBreath();
    if (!this.isKissing) return;

    this.isKissing = false;
    this.holdKissCount = 0;

    if (this._cycleTimeoutId) {
      clearTimeout(this._cycleTimeoutId);
      this._cycleTimeoutId = null;
    }

    this.characterAnim.setCoupleState(
      GAME_CONFIG.coupleStates.ARGUING
    );
  }

  freeze() {
    this.isKissing = false;
    this.holdKissCount = 0;

    if (this._cycleTimeoutId) {
      clearTimeout(this._cycleTimeoutId);
      this._cycleTimeoutId = null;
    }

    this.characterAnim.hideDEBreath();
  }

  reset() {
    this.stopKissing();
  }

  getIsKissing() {
    return this.isKissing;
  }
}

/* =============================================================================
 * LEADERBOARD SYSTEM
 * ============================================================================= */

class LeaderboardSystem {
  constructor() {
    this.listEl = document.getElementById('leaderboard-list');
    this.modal = document.getElementById('leaderboard-modal');
  }

  load() {
    try {
      const raw = localStorage.getItem(GAME_CONFIG.leaderboardKey);
      const data = raw ? JSON.parse(raw) : [];
      return Array.isArray(data) ? data : [];
    } catch (err) {
      return [];
    }
  }

  _persist(entries) {
    localStorage.setItem(GAME_CONFIG.leaderboardKey, JSON.stringify(entries));
  }

  /**
   * Insert at the first rank this score can occupy.
   * Equal-or-higher scores take that slot and everyone from there shifts down.
   * Only the top 20 are kept.
   */
  saveEntry(entry) {
    const max = GAME_CONFIG.leaderboardMaxEntries;
    const entries = this.load();
    const insertAt = entries.findIndex((existing) => entry.score >= existing.score);
    const rankIndex = insertAt === -1 ? entries.length : insertAt;

    if (rankIndex >= max) return;

    entries.splice(rankIndex, 0, {
      playerName: entry.playerName,
      score: entry.score,
      ending: entry.ending,
      date: entry.date,
    });

    if (entries.length > max) entries.length = max;
    this._persist(entries);
  }

  render(entries) {
    if (!this.listEl) return;
    if (!entries.length) {
      this.listEl.innerHTML = '<li class="leaderboard-list__empty">尚無紀錄</li>';
      return;
    }
    this.listEl.innerHTML = entries
      .map(
        (e, i) => `
        <li>
          <span class="leaderboard-list__rank">${i + 1}</span>
          <span class="leaderboard-list__name">${escapeHtml(e.playerName)}</span>
          <span class="leaderboard-list__score">${e.score}</span>
          <span class="leaderboard-list__ending">${escapeHtml(e.ending)}</span>
        </li>`
      )
      .join('');
  }

  open() {
    this.render(this.load());
    this.modal?.showModal();
  }

  close() {
    this.modal?.close();
  }

  clear() {
    const password = prompt('請輸入密碼以清除排行榜：');
    if (password === null) return;
    if (password !== GAME_CONFIG.leaderboardClearPassword) {
      alert('密碼錯誤');
      return;
    }
    localStorage.removeItem(GAME_CONFIG.leaderboardKey);
    this.render([]);
  }
}

/* =============================================================================
 * UI MANAGER
 * ============================================================================= */

class UIManager {
  constructor() {
    this.screens = {
      start: document.getElementById('start-screen'),
      game: document.getElementById('game-screen'),
      end: document.getElementById('end-screen'),
    };
    this.hud = {
      playerName: document.getElementById('hud-player-name'),
      score: document.getElementById('hud-score'),
      timer: document.getElementById('hud-timer'),
    };
    this.bossWarning = document.getElementById('boss-warning');
    this.bossWarningText = document.getElementById('boss-warning-text');
    this.kissBtn = document.getElementById('kiss-btn');
    this.playerNameInput = document.getElementById('player-name-input');
    this.endingOverlay = document.getElementById('ending-overlay');
    this.endingOverlayImage = document.getElementById('ending-overlay-image');
  }

  showScreen(name) {
    Object.values(this.screens).forEach((el) => el?.classList.remove('screen--active'));
    this.screens[name]?.classList.add('screen--active');
  }

  updateHUD({ playerName, score, timer }) {
    if (playerName !== undefined) this.hud.playerName.textContent = playerName;
    if (score !== undefined) this.hud.score.textContent = score;
    if (timer !== undefined) this.hud.timer.textContent = timer;
  }

  updateBossWarning(state) {
    if (!this.bossWarning) return;
    const labels = {
      IDLE: 'Boss Idle',
      PREPARE: '⚠ Boss Preparing!',
      LOOKING: '👀 Boss Looking!',
      CAUGHT: 'Caught!',
    };
    this.bossWarning.className = 'boss-warning boss-warning--' + state.toLowerCase();
    if (this.bossWarningText) {
      this.bossWarningText.textContent = labels[state] || state;
    }
  }

  setKissButtonEnabled(enabled) {
    if (this.kissBtn) this.kissBtn.disabled = !enabled;
  }

  setKissButtonActive(active) {
    this.kissBtn?.classList.toggle('is-active', active);
  }

  showEndScreen({ playerName, score, ending }) {
    document.getElementById('end-title').textContent = ending;
    document.getElementById('end-message').textContent = getEndingMessage(ending);
    document.getElementById('end-player-name').textContent = playerName;
    document.getElementById('end-score').textContent = score;
    this.showScreen('end');
  }

  getPlayerNameInput() {
    const name = this.playerNameInput?.value.trim();
    return name || 'Anonymous';
  }

  clearPlayerNameInput() {
    if (this.playerNameInput) this.playerNameInput.value = '';
  }

  showEndingOverlay(src) {
    if (!this.endingOverlay || !this.endingOverlayImage) return;
    this.endingOverlayImage.src = src;
    this.endingOverlay.hidden = false;
  }

  hideEndingOverlay() {
    if (!this.endingOverlay) return;
    this.endingOverlay.hidden = true;
    if (this.endingOverlayImage) this.endingOverlayImage.src = '';
  }
}

function getEndingMessage(ending) {
  const messages = {
    'BAD END': '被老闆發現了！下次小心一點。',
    'NORMAL END': '安全過關，但親吻次數還不夠多。',
    'GOOD END': '完美過關！你是辦公室情場高手！',
  };
  return messages[ending] || '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* =============================================================================
 * GAME MANAGER
 * ============================================================================= */

class GameManager {
  constructor() {
    this.ui = new UIManager();
    this.scoreSystem = new ScoreSystem();
    this.characterAnim = new CharacterAnimationManager({
      getElapsedRatio: () => this._getElapsedRatio(),
    });
    this.kissSystem = new KissSystem(
      this.scoreSystem,
      this.characterAnim,
      (score) => {
        this.ui.updateHUD({ score });
      }
    );
    this.leaderboard = new LeaderboardSystem();

    this.bossStateMachine = new BossStateMachine({
      characterAnim: this.characterAnim,
      onStateChange: (state) => this.ui.updateBossWarning(state),
      isKissing: () => this.kissSystem.getIsKissing(),
      onCaught: () => this._onCaught(),
    });

    this.timerSystem = null;
    this.playerName = '';
    this.gamePhase = 'menu'; // menu | playing | caught | ending | ended
    this.wasCaught = false;
    this._overlayTimeoutId = null;

    this._bindEvents();
    this.ui.showScreen('start');
    this.ui.updateBossWarning(GAME_CONFIG.bossStates.IDLE);
  }

  _getElapsedRatio() {
    const duration = GAME_CONFIG.gameDuration;
    if (!duration || !this.timerSystem) return 0;
    const remaining = this.timerSystem.getRemaining();
    return Math.min(1, Math.max(0, 1 - remaining / duration));
  }

  _bindEvents() {
    document.getElementById('start-btn')?.addEventListener('click', () => this.startGame());
    document.getElementById('restart-btn')?.addEventListener('click', () => this.returnToMenu());
    document.getElementById('view-leaderboard-btn')?.addEventListener('click', () => this.leaderboard.open());
    document.getElementById('end-leaderboard-btn')?.addEventListener('click', () => this.leaderboard.open());
    document.getElementById('close-leaderboard-btn')?.addEventListener('click', () => this.leaderboard.close());
    document.getElementById('clear-leaderboard-btn')?.addEventListener('click', () => this.leaderboard.clear());

    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) {
      gameScreen.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (this.gamePhase !== 'playing') return;
        e.preventDefault();
        try {
          gameScreen.setPointerCapture(e.pointerId);
        } catch (err) {
          /* ignore */
        }
        this._onKissStart();
      });
      gameScreen.addEventListener('pointerup', (e) => {
        if (gameScreen.hasPointerCapture?.(e.pointerId)) {
          gameScreen.releasePointerCapture(e.pointerId);
        }
        this._onKissStop();
      });
      gameScreen.addEventListener('pointercancel', () => this._onKissStop());
    }

    this.ui.playerNameInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.startGame();
    });
  }

  startGame() {
    this.playerName = this.ui.getPlayerNameInput();
    this.gamePhase = 'playing';
    this.wasCaught = false;

    this.scoreSystem.reset();
    this.kissSystem.reset();
    this.ui.hideEndingOverlay();
    this._clearOverlayTimer();
    this.characterAnim.start();
    this.bossStateMachine.reset();
    this.bossStateMachine.start();

    this.ui.showScreen('game');
    this.ui.updateHUD({
      playerName: this.playerName,
      score: 0,
      timer: GAME_CONFIG.gameDuration,
    });
    this.ui.setKissButtonEnabled(true);

    this.timerSystem = new TimerSystem(
      GAME_CONFIG.gameDuration,
      (remaining) => this.ui.updateHUD({ timer: remaining }),
      () => this._onTimeUp()
    );
    this.timerSystem.start();
  }

  _onKissStart() {
    if (this.gamePhase !== 'playing') return;
    this.kissSystem.startKissing();
    this.ui.setKissButtonActive(true);
    this.bossStateMachine.checkCaught();
  }

  _onKissStop() {
    if (this.gamePhase !== 'playing') return;
    this.kissSystem.stopKissing();
    this.ui.setKissButtonActive(false);
  }

  _onTimeUp() {
    if (this.gamePhase !== 'playing') return;
    this._freezePlay();
    this._showEndingThenSettle(false);
  }

  _onCaught() {
    if (this.gamePhase !== 'playing') return;
    this.gamePhase = 'caught';
    this.wasCaught = true;

    this._freezePlay();

    this.characterAnim.playCaughtSequence(() => {
      if (this.gamePhase !== 'caught') return;
      this._showEndingThenSettle(true);
    });
  }

  _freezePlay() {
    this.timerSystem?.stop();
    this.bossStateMachine.stop();
    this.kissSystem.freeze();
    this.ui.setKissButtonEnabled(false);
    this.ui.setKissButtonActive(false);
  }

  _endingImageSrc(caught, score) {
    const assets = GAME_CONFIG.characterAssets.endings;
    if (caught) return assets.bad;
    if (score >= GAME_CONFIG.goodEndMinScore) return assets.good;
    return assets.normal;
  }

  _showEndingThenSettle(caught) {
    if (this.gamePhase === 'ended' || this.gamePhase === 'ending') return;
    this.gamePhase = 'ending';
    this.wasCaught = caught;

    const score = this.scoreSystem.getScore();
    this.ui.showEndingOverlay(this._endingImageSrc(caught, score));
    this._clearOverlayTimer();
    this._overlayTimeoutId = setTimeout(() => {
      this._endGame(caught);
    }, GAME_CONFIG.caught.endingOverlayMs);
  }

  _clearOverlayTimer() {
    if (this._overlayTimeoutId) {
      clearTimeout(this._overlayTimeoutId);
      this._overlayTimeoutId = null;
    }
  }

  _endGame(caught) {
    if (this.gamePhase === 'ended') return;
    this.gamePhase = 'ended';
    this.wasCaught = caught;

    this._clearOverlayTimer();
    this._freezePlay();
    this.characterAnim.stop();

    const score = this.scoreSystem.getScore();
    const ending = determineEnding(caught, score);

    this.leaderboard.saveEntry({
      playerName: this.playerName,
      score,
      ending,
      date: new Date().toISOString(),
    });

    this.ui.showEndScreen({ playerName: this.playerName, score, ending });
  }

  returnToMenu() {
    this.gamePhase = 'menu';
    this._clearOverlayTimer();
    this.ui.hideEndingOverlay();
    this.timerSystem?.stop();
    this.bossStateMachine.stop();
    this.characterAnim.stop();
    this.kissSystem.reset();
    this.ui.setKissButtonEnabled(false);
    this.ui.clearPlayerNameInput();
    this.playerName = '';
    this.ui.showScreen('start');
    this.ui.updateBossWarning(GAME_CONFIG.bossStates.IDLE);
  }
}

/* =============================================================================
 * BOOT
 * ============================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  window.gameManager = new GameManager();
  console.log('[Office Affair] Phase 1 prototype loaded.');
  console.log('[Office Affair] Kiss speed at hold count 0:', getKissSpeedMultiplier(0));
  console.log('[Office Affair] Kiss speed at hold count 31:', getKissSpeedMultiplier(31));
});
