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

  coupleTiming: {
    argueFrameMin: 600,
    argueFrameMax: 1800,
  },

  kissCycleDuration: 1000,
  breathMultiplierMin: 10,

  // Speed tiers use kisses in the CURRENT hold, not total score.
  // Release the button to reset back to the first tier.
  speedTiers: [
    { minScore: 0, maxScore: 10, multiplier: 4.0 },
    { minScore: 11, maxScore: 23, multiplier: 7 },
    { minScore: 24, maxScore: 42, multiplier: 10 },
    { minScore: 43, maxScore: 64, multiplier: 14 },
    { minScore: 65, maxScore: Infinity, multiplier: 20 },
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
    this._lastDEArguing = null;
    this._sadIndex = 0;
    this._sadDeadline = 0;

    this._aIntervalId = null;
    this._deTimeoutId = null;
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
    this._lastDEArguing = null;

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

    this._clearDETimer();

    this._clearCaughtTimer();
    this.hideF();
    this.hideDEBreath();
  }

  _clearDETimer() {
    if (this._deTimeoutId) {
      clearTimeout(this._deTimeoutId);
      this._deTimeoutId = null;
    }
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

    if (!isKissing) {
      this.hideDEBreath();
    }

    ['D', 'E'].forEach((id) => {
      const el = this.elements[id];
      if (!el) return;

      el.classList.toggle('is-kissing', isKissing);
    });

    // 每次切換狀態時重新開始 DE 圖片循環
    this._startDEAnimation(isKissing);
  }

  _startDEAnimation(isKissing) {
    this._clearDETimer();

    this._deIndex = 0;

    const frames = isKissing
      ? this.deKissingFrames
      : this.deArguingFrames;

    if (!frames.length) return;

    // Kiss 圖片切換速度由 KissSystem 的 cycle 控制。
    // 因此 KISS 狀態下不在這裡使用計時器。
    if (isKissing) {
      this._applyDEFrame(frames);
      return;
    }

    // ARGUING 狀態使用隨機抽取圖片 + 隨機時間播放
    this._playNextDEArgue();
  }

  _playNextDEArgue() {
    if (!this.deArguingFrames.length) return;

    const frame = pickRandom(this.deArguingFrames, this._lastDEArguing);
    this._lastDEArguing = frame;
    this.setDEImage(frame);

    const timing = GAME_CONFIG.coupleTiming || {};
    const min = timing.argueFrameMin ?? 600;
    const max = timing.argueFrameMax ?? 1800;
    const duration = randomMs(min, max);

    this._deTimeoutId = setTimeout(() => {
      this._playNextDEArgue();
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

        if (getKissSpeedMultiplier(this.holdKissCount) >= GAME_CONFIG.breathMultiplierMin) {
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
      const emptyText = window.langManager ? window.langManager.get('leaderboardEmpty') : '尚無紀錄';
      this.listEl.innerHTML = `<li class="leaderboard-list__empty">${emptyText}</li>`;
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
    const promptText = window.langManager ? window.langManager.get('clearPrompt') : '請輸入密碼以清除排行榜：';
    const passErrorText = window.langManager ? window.langManager.get('passwordIncorrect') : '密碼錯誤';
    const password = prompt(promptText);
    if (password === null) return;
    if (password !== GAME_CONFIG.leaderboardClearPassword) {
      alert(passErrorText);
      return;
    }
    localStorage.removeItem(GAME_CONFIG.leaderboardKey);
    this.render([]);
  }
}

/* =============================================================================
 * I18N & LANGUAGE MANAGER
 * ============================================================================= */

const I18N = {
  tc: {
    title: 'Office Affair',
    subtitle: '在辦公室偷偷親吻，別被老闆發現！',
    playerNameLabel: '玩家名稱',
    playerNamePlaceholder: '輸入你的名字',
    startBtn: '開始遊戲',
    rulesBtn: '遊戲玩法',
    viewLeaderboardBtn: '排行榜',
    playerHud: '玩家',
    scoreHud: '親吻次數',
    timeHud: '時間',
    kissBtn: 'KISS',
    kissHint: '（按住）',
    gameOverTitle: '遊戲結束',
    endPlayerLabel: '玩家：',
    endScoreLabel: '分數：',
    restartBtn: '再玩一次',
    leaderboardTitle: '排行榜',
    leaderboardEmpty: '尚無紀錄',
    closeBtn: '關閉',
    clearBtn: '清除排行榜',
    clearPrompt: '請輸入密碼以清除排行榜：',
    passwordIncorrect: '密碼錯誤',
    defaultPlayerName: '無名氏',
    rulesTitle: '遊戲玩法說明',
    rulesHowTitle: '💋 如何接吻與得分',
    rulesHowDesc: '按住畫面任意處或 KISS 按鈕，情侶 DE 即開始甜蜜接吻！只要按住不放，每完成一次接吻動作即獲得 1 分。',
    rulesSpeedTitle: '⚡ 連鎖加速機制 (Speed Tiers)',
    rulesSpeedDesc1: '在同一次長按中接吻次數越多，接吻速度會逐步加倍（4倍 → 7倍 → 10倍 → 14倍 → 20倍！）。',
    rulesSpeedDesc2: '當速度達到 10 倍時，將觸發專屬深情喘氣特效！',
    rulesSpeedNote: '※ 只要放開手指或滑鼠，當輪累積次數歸零，下一次接吻速度重置回起始速度。',
    rulesBossTitle: '👀 警戒狀態與老闆巡視',
    rulesBossIdle: 'Boss Idle：老闆正常背對工作，請把握時間接吻累積高分！',
    rulesBossPrep: 'Boss Preparing：老闆即將回頭，請隨時準備放開！',
    rulesBossLook: 'Boss Looking：老闆已回頭盯著！此時絕對不可接吻，否則立即當場抓包！',
    rulesEndingTitle: '🏆 結局判定條件',
    rulesEndingBad: 'BAD END：在老闆盯著看（Looking）時接吻被抓到。',
    rulesEndingNormal: 'NORMAL END：時間結束存活，但得分未達 70 分。',
    rulesEndingGood: 'GOOD END：時間結束存活，且親吻次數達到 70 分以上！',
    tooltipHowTitle: '💋 如何接吻',
    tooltipHowDesc: '按住畫面任意處或 KISS 按鈕開始親吻，持續按住可累積接吻次數。',
    tooltipSpeedTitle: '⚡ 連鎖加速',
    tooltipSpeedDesc: '同一次按住越久速度越快（最高 20 倍）。達 10 倍速時觸發深情喘氣特效。放開則重置速度。',
    tooltipBossTitle: '👀 避開老闆目光',
    tooltipBossIdle: 'Boss Idle：安全工作，把握時間接吻！',
    tooltipBossPrep: 'Boss Preparing：老闆準備回頭，隨時準備放開！',
    tooltipBossLook: 'Boss Looking：老闆正在盯著！絕對不能親吻，否則當場抓包！',
    tooltipEndingTitle: '🏆 結局判定',
    tooltipEndingBad: 'BAD END：接吻被抓包',
    tooltipEndingNormal: 'NORMAL END：存活但未滿 70 分',
    tooltipEndingGood: 'GOOD END：存活且達到 70 分以上',
    bossWarningIdle: 'Boss Idle',
    bossWarningPrepare: '⚠ Boss Preparing!',
    bossWarningLooking: '👀 Boss Looking!',
    bossWarningCaught: 'Caught!',
    endingBad: '被老闆發現了！下次小心一點。',
    endingNormal: '安全過關，但親吻次數還不夠多。',
    endingGood: '完美過關！你是辦公室情場高手！',
    preloadLoading: '資源載入中...',
    preloadComplete: '素材載入完成，隨時可開始！',
    themeDark: '切換為 Dark 背景',
    themeLight: '切換為 Light 背景',
  },
  sc: {
    title: 'Office Affair',
    subtitle: '在办公室偷偷亲吻，别被老板发现！',
    playerNameLabel: '玩家名称',
    playerNamePlaceholder: '输入你的名字',
    startBtn: '开始游戏',
    rulesBtn: '游戏玩法',
    viewLeaderboardBtn: '排行榜',
    playerHud: '玩家',
    scoreHud: '亲吻次数',
    timeHud: '时间',
    kissBtn: 'KISS',
    kissHint: '（按住）',
    gameOverTitle: '游戏结束',
    endPlayerLabel: '玩家：',
    endScoreLabel: '分数：',
    restartBtn: '再玩一次',
    leaderboardTitle: '排行榜',
    leaderboardEmpty: '暂无记录',
    closeBtn: '关闭',
    clearBtn: '清除排行榜',
    clearPrompt: '请输入密码以清除排行榜：',
    passwordIncorrect: '密码错误',
    defaultPlayerName: '无名氏',
    rulesTitle: '游戏玩法说明',
    rulesHowTitle: '💋 如何接吻与得分',
    rulesHowDesc: '按住画面任意处或 KISS 按钮，情侣 DE 即开始甜蜜接吻！只要按住不放，每完成一次接吻动作即获得 1 分。',
    rulesSpeedTitle: '⚡ 连锁加速机制 (Speed Tiers)',
    rulesSpeedDesc1: '在同一次长按中接吻次数越多，接吻速度会逐步加倍（4倍 → 7倍 → 10倍 → 14倍 → 20倍！）。',
    rulesSpeedDesc2: '当速度达到 10 倍时，将触发专属深情喘气特效！',
    rulesSpeedNote: '※ 只要放开手指或鼠标，当轮累积次数归零，下一次接吻速度重置回起始速度。',
    rulesBossTitle: '👀 警戒状态与老板巡视',
    rulesBossIdle: 'Boss Idle：老板正常背对工作，请把握时间接吻累积高分！',
    rulesBossPrep: 'Boss Preparing：老板即将回头，请随时准备放开！',
    rulesBossLook: 'Boss Looking：老板已回头盯着！此时绝对不可接吻，否则立即当场抓包！',
    rulesEndingTitle: '🏆 结局判定条件',
    rulesEndingBad: 'BAD END：在老板盯着看（Looking）时接吻被抓到。',
    rulesEndingNormal: 'NORMAL END：时间结束存活，但得分未达 70 分。',
    rulesEndingGood: 'GOOD END：时间结束存活，且亲吻次数达到 70 分以上！',
    tooltipHowTitle: '💋 如何接吻',
    tooltipHowDesc: '按住画面任意处或 KISS 按钮开始亲吻，持续按住可累积接吻次数。',
    tooltipSpeedTitle: '⚡ 连锁加速',
    tooltipSpeedDesc: '同一次按住越久速度越快（最高 20 倍）。达 10 倍速时触发深情喘气特效。放开则重置速度。',
    tooltipBossTitle: '👀 避开老板目光',
    tooltipBossIdle: 'Boss Idle：安全工作，把握时间接吻！',
    tooltipBossPrep: 'Boss Preparing：老板准备回头，随时准备放开！',
    tooltipBossLook: 'Boss Looking：老板正在盯着！绝对不能亲吻，否则当场抓包！',
    tooltipEndingTitle: '🏆 结局判定',
    tooltipEndingBad: 'BAD END：接吻被抓包',
    tooltipEndingNormal: 'NORMAL END：存活但未满 70 分',
    tooltipEndingGood: 'GOOD END：存活且达到 70 分以上',
    bossWarningIdle: 'Boss Idle',
    bossWarningPrepare: '⚠ Boss Preparing!',
    bossWarningLooking: '👀 Boss Looking!',
    bossWarningCaught: 'Caught!',
    endingBad: '被老板发现了！下次小心一点。',
    endingNormal: '安全过关，但亲吻次数还不够多。',
    endingGood: '完美过关！你是办公室情场高手！',
    preloadLoading: '资源加载中...',
    preloadComplete: '素材加载完成，随时可开始！',
    themeDark: '切换为 Dark 背景',
    themeLight: '切换为 Light 背景',
  },
  en: {
    title: 'Office Affair',
    subtitle: 'Sneak a kiss in the office, don’t get caught by the boss!',
    playerNameLabel: 'Player Name',
    playerNamePlaceholder: 'Enter your name',
    startBtn: 'Start Game',
    rulesBtn: 'How to Play',
    viewLeaderboardBtn: 'Leaderboard',
    playerHud: 'Player',
    scoreHud: 'Kiss Count',
    timeHud: 'Time',
    kissBtn: 'KISS',
    kissHint: ' (Hold)',
    gameOverTitle: 'Game Over',
    endPlayerLabel: 'Player: ',
    endScoreLabel: 'Score: ',
    restartBtn: 'Play Again',
    leaderboardTitle: 'Leaderboard',
    leaderboardEmpty: 'No records yet',
    closeBtn: 'Close',
    clearBtn: 'Clear Leaderboard',
    clearPrompt: 'Enter password to clear leaderboard:',
    passwordIncorrect: 'Incorrect password',
    defaultPlayerName: 'Anonymous',
    rulesTitle: 'How to Play',
    rulesHowTitle: '💋 How to Kiss & Score',
    rulesHowDesc: 'Hold anywhere on the screen or press and hold KISS to start kissing! For every completed kiss motion while holding, you earn 1 point.',
    rulesSpeedTitle: '⚡ Combo Speed Tiers',
    rulesSpeedDesc1: 'The longer you continuously hold and kiss, the faster they go (4x → 7x → 10x → 14x → 20x!).',
    rulesSpeedDesc2: 'Reaching 10x speed triggers an exclusive steamy breath effect!',
    rulesSpeedNote: '* Releasing your finger or mouse resets your current hold streak and returns kiss speed to start.',
    rulesBossTitle: '👀 Boss Alert States',
    rulesBossIdle: 'Boss Idle: Boss is working with back turned. Kiss now to rack up points!',
    rulesBossPrep: 'Boss Preparing: Boss is about to turn around. Get ready to release!',
    rulesBossLook: 'Boss Looking: Boss is watching! Do NOT kiss, or you will get busted!',
    rulesEndingTitle: '🏆 Ending Conditions',
    rulesEndingBad: 'BAD END: Caught kissing while the boss is looking.',
    rulesEndingNormal: 'NORMAL END: Survived until time out, but scored under 70 points.',
    rulesEndingGood: 'GOOD END: Survived until time out and scored 70 points or higher!',
    tooltipHowTitle: '💋 How to Kiss',
    tooltipHowDesc: 'Hold anywhere or press KISS to start kissing. Continuous hold racks up kisses.',
    tooltipSpeedTitle: '⚡ Combo Speed',
    tooltipSpeedDesc: 'Longer continuous hold = faster kissing (up to 20x). 10x triggers breath effect. Releasing resets speed.',
    tooltipBossTitle: '👀 Watch Out for Boss',
    tooltipBossIdle: 'Boss Idle: Safe to kiss! Rack up your score.',
    tooltipBossPrep: 'Boss Preparing: Boss is turning, get ready to stop!',
    tooltipBossLook: 'Boss Looking: Boss is watching! Stop kissing immediately!',
    tooltipEndingTitle: '🏆 Endings',
    tooltipEndingBad: 'BAD END: Caught kissing',
    tooltipEndingNormal: 'NORMAL END: Survived, < 70 pts',
    tooltipEndingGood: 'GOOD END: Survived, ≥ 70 pts',
    bossWarningIdle: 'Boss Idle',
    bossWarningPrepare: '⚠ Boss Preparing!',
    bossWarningLooking: '👀 Boss Looking!',
    bossWarningCaught: 'Caught!',
    endingBad: 'Caught by the boss! Be more careful next time.',
    endingNormal: 'Made it through safely, but not enough kisses.',
    endingGood: 'Perfect run! You are a master of office romance!',
    preloadLoading: 'Loading assets...',
    preloadComplete: 'Assets loaded, ready to play!',
    themeDark: 'Switch to Dark Theme',
    themeLight: 'Switch to Light Theme',
  },
};

class LanguageManager {
  constructor() {
    this.storageKey = 'officeAffairLang';
    this.callbacks = [];
    this.langOrder = ['tc', 'sc', 'en'];
    this.toggleBtn = document.getElementById('lang-toggle-btn');
    this.textEl = document.getElementById('lang-toggle-text');
    this.currentLang = this._getInitialLang();
    this.applyLang(this.currentLang, false);
    this._bindEvents();
  }

  _getInitialLang() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved && (saved === 'en' || saved === 'sc' || saved === 'tc')) {
        return saved;
      }
    } catch (e) {
      /* ignore */
    }
    return 'tc';
  }

  onChange(fn) {
    if (typeof fn === 'function') {
      this.callbacks.push(fn);
    }
  }

  get(key) {
    const dict = I18N[this.currentLang] || I18N.tc;
    return dict[key] !== undefined ? dict[key] : (I18N.tc[key] || key);
  }

  cycleLanguage() {
    const currentIndex = this.langOrder.indexOf(this.currentLang);
    const nextIndex = (currentIndex + 1) % this.langOrder.length;
    this.setLanguage(this.langOrder[nextIndex]);
  }

  setLanguage(lang) {
    if (lang !== 'en' && lang !== 'sc' && lang !== 'tc') return;
    this.currentLang = lang;
    try {
      localStorage.setItem(this.storageKey, lang);
    } catch (e) {
      /* ignore */
    }
    this.applyLang(lang, true);
  }

  applyLang(lang, notify = true) {
    // 1. Update HTML lang tag
    const docLang = lang === 'en' ? 'en' : (lang === 'sc' ? 'zh-Hans' : 'zh-Hant');
    document.documentElement.lang = docLang;

    // 2. Update circular language button text and tooltip
    if (this.textEl) {
      this.textEl.textContent = lang.toUpperCase();
    }
    if (this.toggleBtn) {
      const tooltips = {
        tc: '切換語言 (目前: 繁中)',
        sc: '切换语言 (目前: 简中)',
        en: 'Switch Language (Current: EN)',
      };
      const label = tooltips[lang] || '切換語言 Language';
      this.toggleBtn.setAttribute('title', label);
      this.toggleBtn.setAttribute('aria-label', label);
    }

    // 3. Update text content
    document.querySelectorAll('[data-i18n]').forEach((el) => {
      const key = el.getAttribute('data-i18n');
      const val = this.get(key);
      if (val !== undefined) {
        el.textContent = val;
      }
    });

    // 4. Update placeholder
    document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
      const key = el.getAttribute('data-i18n-placeholder');
      const val = this.get(key);
      if (val !== undefined) {
        el.placeholder = val;
      }
    });

    // 5. Update title & aria-label
    document.querySelectorAll('[data-i18n-title]').forEach((el) => {
      const key = el.getAttribute('data-i18n-title');
      const val = this.get(key);
      if (val !== undefined) {
        el.setAttribute('title', val);
        if (el.hasAttribute('aria-label')) {
          el.setAttribute('aria-label', val);
        }
      }
    });

    // 6. Notify observers
    if (notify) {
      this.callbacks.forEach((fn) => {
        try {
          fn(lang);
        } catch (err) {
          console.error(err);
        }
      });
    }
  }

  _bindEvents() {
    if (!this.toggleBtn) return;
    this.toggleBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.cycleLanguage();
    });
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
    this.gameplayHelp = document.getElementById('gameplay-help-container');
    this.rulesModal = document.getElementById('rules-modal');
    this.lastBossState = 'IDLE';
    this.lastEndData = null;
  }

  showScreen(name) {
    Object.values(this.screens).forEach((el) => el?.classList.remove('screen--active'));
    this.screens[name]?.classList.add('screen--active');

    // "?" gameplay help button is only active during gameplay screen
    if (this.gameplayHelp) {
      this.gameplayHelp.hidden = name !== 'game';
      this.gameplayHelp.classList.remove('is-active');
    }
  }

  openRules() {
    this.rulesModal?.showModal();
  }

  closeRules() {
    this.rulesModal?.close();
  }

  updateHUD({ playerName, score, timer }) {
    if (playerName !== undefined) this.hud.playerName.textContent = playerName;
    if (score !== undefined) this.hud.score.textContent = score;
    if (timer !== undefined) this.hud.timer.textContent = timer;
  }

  updateBossWarning(state) {
    if (!this.bossWarning) return;
    this.lastBossState = state;
    const lm = window.langManager;
    const labels = {
      IDLE: lm ? lm.get('bossWarningIdle') : 'Boss Idle',
      PREPARE: lm ? lm.get('bossWarningPrepare') : '⚠ Boss Preparing!',
      LOOKING: lm ? lm.get('bossWarningLooking') : '👀 Boss Looking!',
      CAUGHT: lm ? lm.get('bossWarningCaught') : 'Caught!',
    };
    this.bossWarning.className = 'boss-warning boss-warning--' + state.toLowerCase();
    if (this.bossWarningText) {
      this.bossWarningText.textContent = labels[state] || state;
    }
  }

  onLanguageChange() {
    this.updateBossWarning(this.lastBossState || 'IDLE');
    if (this.screens.end?.classList.contains('screen--active') && this.lastEndData) {
      document.getElementById('end-message').textContent = getEndingMessage(this.lastEndData.ending);
    }
  }

  setKissButtonEnabled(enabled) {
    if (this.kissBtn) this.kissBtn.disabled = !enabled;
  }

  setKissButtonActive(active) {
    this.kissBtn?.classList.toggle('is-active', active);
  }

  showEndScreen({ playerName, score, ending }) {
    this.lastEndData = { playerName, score, ending };
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
    if (this.gameplayHelp) {
      this.gameplayHelp.hidden = true;
      this.gameplayHelp.classList.remove('is-active');
    }
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
  const lm = window.langManager;
  if (ending === 'BAD END') {
    return lm ? lm.get('endingBad') : '被老闆發現了！下次小心一點。';
  }
  if (ending === 'NORMAL END') {
    return lm ? lm.get('endingNormal') : '安全過關，但親吻次數還不夠多。';
  }
  if (ending === 'GOOD END') {
    return lm ? lm.get('endingGood') : '完美過關！你是辦公室情場高手！';
  }
  return '';
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/* =============================================================================
 * THEME MANAGER
 * ============================================================================= */

class ThemeManager {
  constructor() {
    this.storageKey = 'officeAffairTheme';
    this.toggleBtn = document.getElementById('theme-toggle-btn');
    this.iconEl = document.getElementById('theme-toggle-icon');

    this.currentTheme = this._getInitialTheme();
    this.applyTheme(this.currentTheme);
    this._bindEvents();
  }

  _getInitialTheme() {
    try {
      const saved = localStorage.getItem(this.storageKey);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (e) {
      /* ignore */
    }
    return 'dark';
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    const isLight = theme === 'light';

    document.documentElement.classList.toggle('theme-light', isLight);
    document.body.classList.toggle('theme-light', isLight);

    if (this.iconEl) {
      this.iconEl.textContent = isLight ? '🌙' : '☀️';
    }
    this.updateTitle();

    try {
      localStorage.setItem(this.storageKey, theme);
    } catch (e) {
      /* ignore */
    }
  }

  updateTitle() {
    if (!this.toggleBtn) return;
    const isLight = this.currentTheme === 'light';
    const key = isLight ? 'themeDark' : 'themeLight';
    const label = window.langManager ? window.langManager.get(key) : (isLight ? '切換為 Dark 背景' : '切換為 Light 背景');
    this.toggleBtn.setAttribute('aria-label', label);
    this.toggleBtn.setAttribute('title', label);
  }

  toggleTheme() {
    const nextTheme = this.currentTheme === 'light' ? 'dark' : 'light';
    this.applyTheme(nextTheme);
  }

  _bindEvents() {
    if (!this.toggleBtn) return;
    this.toggleBtn.addEventListener('pointerdown', (e) => e.stopPropagation());
    this.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleTheme();
    });
  }
}

/* =============================================================================
 * ASSET PRELOADER
 * ============================================================================= */

class AssetPreloader {
  constructor({ onProgress, onComplete } = {}) {
    this.onProgress = onProgress || (() => { });
    this.onComplete = onComplete || (() => { });
    this.urls = this._gatherAllUrls();
    this.loadedCount = 0;
    this.totalCount = this.urls.length;
    this.cachedImages = new Map();
    this.isDone = false;
  }

  _gatherAllUrls() {
    const set = new Set();
    function traverse(val) {
      if (typeof val === 'string' && /\.(webp|png|jpg|jpeg|gif)$/i.test(val)) {
        set.add(val);
      } else if (Array.isArray(val)) {
        val.forEach(traverse);
      } else if (val && typeof val === 'object') {
        Object.values(val).forEach(traverse);
      }
    }
    traverse(GAME_CONFIG.characterAssets);
    set.add('Pics/bg.webp');
    set.add('Pics/breath_01.webp');
    return Array.from(set);
  }

  start() {
    if (!this.totalCount) {
      this.isDone = true;
      this.onProgress(1, 0, 0);
      this.onComplete();
      return;
    }

    this.urls.forEach((url) => {
      const img = new Image();
      img.onload = () => this._handleLoad(url, img, false);
      img.onerror = () => this._handleLoad(url, img, true);
      img.src = url;
      if ('decode' in img) {
        img.decode().catch(() => { });
      }
    });
  }

  _handleLoad(url, img, isError = false) {
    if (this.cachedImages.has(url)) return;
    this.cachedImages.set(url, img);
    this.loadedCount += 1;

    const ratio = Math.min(1, this.loadedCount / this.totalCount);
    this.onProgress(ratio, this.loadedCount, this.totalCount);

    if (this.loadedCount >= this.totalCount && !this.isDone) {
      this.isDone = true;
      this.onComplete();
    }
  }
}

/* =============================================================================
 * GAME MANAGER
 * ============================================================================= */

class GameManager {
  constructor() {
    this.langManager = new LanguageManager();
    window.langManager = this.langManager;
    this.themeManager = new ThemeManager();
    window.themeManager = this.themeManager;
    this.ui = new UIManager();
    window.uiManager = this.ui;
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

    this.langManager.onChange((lang) => {
      this.themeManager.updateTitle();
      this.ui.onLanguageChange();
      if (this.leaderboard.modal?.open) {
        this.leaderboard.render(this.leaderboard.load());
      }
      if (this.preloader) {
        const startBtn = document.getElementById('start-btn');
        const statusEl = document.getElementById('preload-status');
        if (this.preloader.isDone) {
          if (statusEl) statusEl.textContent = this.langManager.get('preloadComplete');
          if (startBtn) startBtn.textContent = this.langManager.get('startBtn');
        }
      }
    });

    this._initPreloader();
    this._bindEvents();
    this.ui.showScreen('start');
    this.ui.updateBossWarning(GAME_CONFIG.bossStates.IDLE);
  }

  _initPreloader() {
    const startBtn = document.getElementById('start-btn');
    const fillEl = document.getElementById('preload-fill');
    const statusEl = document.getElementById('preload-status');
    const container = document.getElementById('preload-container');

    const loadingText = this.langManager ? this.langManager.get('preloadLoading') : '資源載入中...';
    if (startBtn) {
      startBtn.disabled = true;
      startBtn.textContent = loadingText;
    }

    this.preloader = new AssetPreloader({
      onProgress: (ratio, loaded, total) => {
        const percent = Math.round(ratio * 100);
        if (fillEl) fillEl.style.width = percent + '%';
        const loadTxt = this.langManager ? this.langManager.get('preloadLoading') : '資源載入中...';
        if (statusEl) statusEl.textContent = `${loadTxt} ${percent}% (${loaded}/${total})`;
        if (startBtn && !this.preloader.isDone) {
          startBtn.disabled = true;
          startBtn.textContent = `${loadTxt} (${percent}%)`;
        }
      },
      onComplete: () => {
        if (fillEl) fillEl.style.width = '100%';
        const completeTxt = this.langManager ? this.langManager.get('preloadComplete') : '素材載入完成，隨時可開始！';
        const startTxt = this.langManager ? this.langManager.get('startBtn') : '開始遊戲';
        if (statusEl) statusEl.textContent = completeTxt;
        if (startBtn) {
          startBtn.disabled = false;
          startBtn.textContent = startTxt;
        }
        setTimeout(() => {
          container?.classList.add('is-hidden');
        }, 700);
      },
    });

    this.preloader.start();
  }

  _getElapsedRatio() {
    const duration = GAME_CONFIG.gameDuration;
    if (!duration || !this.timerSystem) return 0;
    const remaining = this.timerSystem.getRemaining();
    return Math.min(1, Math.max(0, 1 - remaining / duration));
  }

  _bindEvents() {
    document.getElementById('start-btn')?.addEventListener('click', () => {
      if (!this.preloader?.isDone) return;
      this.startGame();
    });
    document.getElementById('restart-btn')?.addEventListener('click', () => this.returnToMenu());
    document.getElementById('view-leaderboard-btn')?.addEventListener('click', () => this.leaderboard.open());
    document.getElementById('end-leaderboard-btn')?.addEventListener('click', () => this.leaderboard.open());
    document.getElementById('close-leaderboard-btn')?.addEventListener('click', () => this.leaderboard.close());
    document.getElementById('clear-leaderboard-btn')?.addEventListener('click', () => this.leaderboard.clear());

    document.getElementById('rules-btn')?.addEventListener('click', () => this.ui.openRules());
    document.getElementById('close-rules-btn')?.addEventListener('click', () => this.ui.closeRules());
    this.ui.rulesModal?.addEventListener('click', (e) => {
      if (e.target === this.ui.rulesModal) {
        this.ui.closeRules();
      }
    });

    const helpContainer = document.getElementById('gameplay-help-container');
    if (helpContainer) {
      helpContainer.addEventListener('pointerdown', (e) => e.stopPropagation());
      helpContainer.addEventListener('click', (e) => e.stopPropagation());
    }

    document.getElementById('ending-overlay')?.addEventListener('click', (e) => {
      if (
        e.target.closest('#theme-toggle-btn') ||
        e.target.closest('#lang-toggle-btn') ||
        e.target.closest('#gameplay-help-container')
      ) return;
      if (this.gamePhase === 'ending') {
        this._clearOverlayTimer();
        this._endGame(this.wasCaught);
      }
    });

    const gameScreen = document.getElementById('game-screen');
    if (gameScreen) {
      gameScreen.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        if (this.gamePhase !== 'playing') return;

        // 限定只有遊戲畫面（office-scene）或 KISS 按鈕才可以按來觸發 kiss，點擊 HUD/Boss 狀態 bar 不觸發
        const isKissArea = e.target.closest('#office-scene') || e.target.closest('#kiss-btn');
        if (!isKissArea) return;
        if (e.target.closest('#gameplay-help-container')) return;

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
      if (e.key === 'Enter') {
        if (!this.preloader?.isDone) return;
        this.startGame();
      }
    });
  }

  startGame() {
    if (!this.preloader?.isDone) return;
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
 * GAME SCENE SCALER — responsive scale-to-fit for mobile
 * ============================================================================= */

class GameSceneScaler {
  constructor() {
    this.scene = document.getElementById('office-scene');
    this.gameScreen = document.getElementById('game-screen');
    this.designWidth = 960; // px — the width the scene layout was designed for

    this._onResize = this._onResize.bind(this);
    window.addEventListener('resize', this._onResize);

    // Also handle orientation change on mobile
    window.addEventListener('orientationchange', () => {
      setTimeout(this._onResize, 150);
    });
  }

  apply() {
    this._onResize();
  }

  _onResize() {
    if (!this.scene) return;
    const containerWidth = this.scene.parentElement?.clientWidth
      || this.gameScreen?.clientWidth
      || window.innerWidth;

    const scale = Math.min(1, containerWidth / this.designWidth);

    if (scale < 1) {
      this.scene.style.transform = `scale(${scale})`;
      this.scene.style.transformOrigin = 'top left';
      this.scene.style.width = `${this.designWidth}px`;
      this.scene.style.height = `620px`;
      // Adjust container height to match scaled height
      this.scene.style.marginBottom = `${-(620 * (1 - scale)) + 12}px`;
    } else {
      this.scene.style.transform = '';
      this.scene.style.transformOrigin = '';
      this.scene.style.width = '';
      this.scene.style.height = '';
      this.scene.style.marginBottom = '';
    }
  }
}

/* =============================================================================
 * IMAGE PROTECTION — prevent saving / downloading game images
 * ============================================================================= */

function initImageProtection() {
  // Block right-click context menu on images
  document.addEventListener('contextmenu', (e) => {
    if (e.target.tagName === 'IMG' || e.target.closest('.office-scene') || e.target.closest('.ending-overlay')) {
      e.preventDefault();
    }
  });

  // Block drag on all images
  document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG') {
      e.preventDefault();
    }
  });
}

/* =============================================================================
 * BOOT
 * ============================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // Image protection
  initImageProtection();

  // Game scene responsive scaler
  window.gameSceneScaler = new GameSceneScaler();

  // Boot game
  window.gameManager = new GameManager();

  // Apply scene scaling after first render
  requestAnimationFrame(() => {
    window.gameSceneScaler.apply();
  });

  console.log('[Office Affair] Phase 1 prototype loaded.');
  console.log('[Office Affair] Kiss speed at hold count 0:', getKissSpeedMultiplier(0));
  console.log('[Office Affair] Kiss speed at hold count 31:', getKissSpeedMultiplier(31));
});
