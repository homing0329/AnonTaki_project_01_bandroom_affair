/**
 * Office Affair — Phase 1 Prototype
 * Vanilla JS modular architecture (stubs + minimal runnable flow)
 */

/* =============================================================================
 * GAME CONFIG
 * ============================================================================= */

const GAME_CONFIG = {
  gameDuration: 90,
  goodEndMinScore: 800,

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
    idlePoseCountMin: 4,
    idlePoseCountMax: 8,
    idleFrameMin: 800,
    idleFrameMax: 2000,
    preparePhases: [
      { afterElapsedRatio: 0, min: 800, max: 1500 },
      { afterElapsedRatio: 1 / 3, min: 600, max: 1100 },
      { afterElapsedRatio: 2 / 3, min: 500, max: 900 },
    ],
    lookingPoseCountMin: 2,
    lookingPoseCountMax: 6,
    lookingFrameMin: 800,
    lookingFrameMax: 1700,
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
    { minScore: 0, maxScore: 6, multiplier: 4.0, scoreMult: 1 },
    { minScore: 7, maxScore: 12, multiplier: 6, scoreMult: 2 },
    { minScore: 13, maxScore: 18, multiplier: 8, scoreMult: 3 },
    { minScore: 19, maxScore: 24, multiplier: 11, scoreMult: 4 },
    { minScore: 25, maxScore: Infinity, multiplier: 14, scoreMult: 5 },
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

function randomBimodalMs(min, max) {
  if (min >= max) return min;
  const roll = Math.random();
  const range = max - min;

  if (roll < 0.4) {
    // 40% 機率：偏快 (前 33% 區間)
    return Math.floor(min + Math.random() * (range * 0.33));
  } else if (roll < 0.6) {
    // 20% 機率：中等過渡 (中間 34% 區間，保留自然過渡)
    return Math.floor(min + range * 0.33 + Math.random() * (range * 0.34));
  } else {
    // 40% 機率：偏慢 (後 33% 區間)
    return Math.floor(max - Math.random() * (range * 0.33));
  }
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
 * SPEED & SCORE TIERS
 * ============================================================================= */

function getKissTier(holdKissCount) {
  const tier = GAME_CONFIG.speedTiers.find(
    (t) => holdKissCount >= t.minScore && holdKissCount <= t.maxScore
  );
  return tier || GAME_CONFIG.speedTiers[0];
}

function getKissSpeedMultiplier(holdKissCount) {
  return getKissTier(holdKissCount).multiplier;
}

function getKissScoreMultiplier(holdKissCount) {
  return getKissTier(holdKissCount).scoreMult || 1;
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
    this.kissCount = 0;
  }

  reset() {
    this.score = 0;
    this.kissCount = 0;
  }

  // 每一輪親吻分數不用一同顯示親吻次數：只增加親吻次數，分數維持不變
  addKiss() {
    this.kissCount += 1;
    return { score: this.score, kissCount: this.kissCount };
  }

  addBonusScore(points) {
    this.score += points;
    return { score: this.score, kissCount: this.kissCount };
  }

  getScore() {
    return this.score;
  }

  getKissCount() {
    return this.kissCount;
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
    return randomBimodalMs(
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
    return randomBimodalMs(
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
  constructor(scoreSystem, characterAnim, onScoreChange, scorePopup) {
    this.scoreSystem = scoreSystem;
    this.characterAnim = characterAnim;
    this.onScoreChange = onScoreChange;
    this.scorePopup = scorePopup;

    this.isKissing = false;
    this.holdKissCount = 0;
    this.pendingBonus = 0;
    this._cycleTimeoutId = null;
  }

  /**
   * Start the Kiss Cycle.
   *
   * 玩家按住 KISS 後：
   * ARGUING → KISSING
   *
   * 每完成一個完整 Kiss Cycle：
   * score + 1（先顯示每次親吻次數*1的分數）
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

        // 每一輪親吻分數不用一同顯示親吻次數：只增加親吻次數，分數不變
        const scoreData = this.scoreSystem.addKiss();

        // Show live kiss counter above DE
        if (this.scorePopup) {
          this.scorePopup.showKissCounter(this.holdKissCount);
        }

        // 通知 GameManager / UI 更新 HUD
        if (this.onScoreChange) {
          this.onScoreChange(scoreData);
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
   */
  stopKissing() {
    this.characterAnim.hideDEBreath();
    if (!this.isKissing) return;

    const prevCount = this.holdKissCount;
    const prevMult = getKissScoreMultiplier(prevCount);
    const roundScore = prevCount * prevMult;

    this.isKissing = false;
    this.holdKissCount = 0;

    if (this._cycleTimeoutId) {
      clearTimeout(this._cycleTimeoutId);
      this._cycleTimeoutId = null;
    }

    this.characterAnim.setCoupleState(
      GAME_CONFIG.coupleStates.ARGUING
    );

    // Play combo merge animation above DE, then float to HUD score and stack score upon arrival
    if (this.scorePopup && prevCount > 0) {
      this.pendingBonus += roundScore;
      this.scorePopup.playComboMerge(prevCount, prevMult, roundScore, (scoreToAdd) => {
        if (this.pendingBonus >= scoreToAdd) {
          this.pendingBonus -= scoreToAdd;
          const updated = this.scoreSystem.addBonusScore(scoreToAdd);
          if (this.onScoreChange) {
            this.onScoreChange(updated);
          }
        }
      });
    }
  }

  freeze() {
    const prevCount = this.holdKissCount;
    const prevMult = getKissScoreMultiplier(prevCount);
    const roundScore = prevCount * prevMult;

    this.isKissing = false;
    this.holdKissCount = 0;

    if (this._cycleTimeoutId) {
      clearTimeout(this._cycleTimeoutId);
      this._cycleTimeoutId = null;
    }

    this.characterAnim.hideDEBreath();

    // Play combo merge even on freeze (caught)
    if (this.scorePopup && prevCount > 0) {
      this.pendingBonus += roundScore;
      this.scorePopup.playComboMerge(prevCount, prevMult, roundScore, (scoreToAdd) => {
        if (this.pendingBonus >= scoreToAdd) {
          this.pendingBonus -= scoreToAdd;
          const updated = this.scoreSystem.addBonusScore(scoreToAdd);
          if (this.onScoreChange) {
            this.onScoreChange(updated);
          }
        }
      });
    }
  }

  commitPendingScore() {
    if (this.pendingBonus > 0) {
      const toAdd = this.pendingBonus;
      this.pendingBonus = 0;
      const updated = this.scoreSystem.addBonusScore(toAdd);
      if (this.onScoreChange) {
        this.onScoreChange(updated);
      }
    }
  }

  reset() {
    this.stopKissing();
    if (this.scorePopup) this.scorePopup.clear();
    this.pendingBonus = 0;
  }

  getIsKissing() {
    return this.isKissing;
  }
}

/* =============================================================================
 * SCORE POPUP MANAGER — floating combo / score animation above DE
 * ============================================================================= */

class ScorePopupManager {
  constructor() {
    this.layer = document.getElementById('de-score-popup-layer');
    this.hudScore = document.getElementById('hud-score');
    this._currentCounterEl = null;
    this._animTimeoutId = null;
    this._flyTimeoutIds = [];
  }

  /** Clear all popups and pending animations */
  clear() {
    if (this._animTimeoutId) {
      clearTimeout(this._animTimeoutId);
      this._animTimeoutId = null;
    }
    if (this._flyTimeoutIds && this._flyTimeoutIds.length) {
      this._flyTimeoutIds.forEach((id) => clearTimeout(id));
      this._flyTimeoutIds = [];
    }
    if (this.hudScore) {
      this.hudScore.classList.remove('hud__value--bump');
    }
    if (this.layer) this.layer.innerHTML = '';
    this._currentCounterEl = null;
    document.querySelectorAll('.de-score-fly').forEach((el) => el.remove());
  }

  /**
   * Show or update the live kiss counter while player is holding.
   * Called on every completed kiss cycle.
   */
  showKissCounter(holdKissCount) {
    if (!this.layer) return;

    // Remove previous counter (re-trigger animation)
    if (this._currentCounterEl) {
      this._currentCounterEl.remove();
    }

    const el = document.createElement('span');
    el.className = 'de-kiss-counter';
    el.textContent = holdKissCount;
    this.layer.appendChild(el);
    this._currentCounterEl = el;
  }

  /**
   * On kiss release: play the combo merge sequence.
   *
   * 1. If scoreMult > 1: Show "count × mult" merge animation colliding into result pop
   * 2. If scoreMult <= 1: Direct float
   * 3. Float "+roundScore" up-left towards HUD score
   * 4. When it arrives: bump HUD score and call onArrive callback to stack score
   */
  playComboMerge(holdKissCount, scoreMult, totalPoints, onArrive) {
    if (!this.layer || holdKissCount <= 0) {
      this.clear();
      return;
    }

    // Step 0: remove live counter
    if (this._currentCounterEl) {
      this._currentCounterEl.remove();
      this._currentCounterEl = null;
    }

    // Clear any stale popups in layer
    this.layer.innerHTML = '';

    // If multiplier is 1, skip merge animation, launch fly directly
    if (scoreMult <= 1) {
      this._launchFly(totalPoints, onArrive);
      return;
    }

    // Step 1: combo merge "count × mult"
    const mergeEl = document.createElement('span');
    mergeEl.className = 'de-combo-merge';
    mergeEl.innerHTML = `<span class="de-combo-merge__count">${holdKissCount}</span><span class="de-combo-merge__times">×</span><span class="de-combo-merge__mult">${scoreMult}</span>`;
    this.layer.appendChild(mergeEl);

    // Step 2: after 450ms, replace with result pop
    this._animTimeoutId = setTimeout(() => {
      mergeEl.remove();

      const resultEl = document.createElement('span');
      resultEl.className = 'de-combo-result';
      resultEl.textContent = totalPoints;
      this.layer.appendChild(resultEl);

      // Step 3: after 350ms, replace with float-to-HUD
      this._animTimeoutId = setTimeout(() => {
        resultEl.remove();
        this._launchFly(totalPoints, onArrive);
      }, 350);
    }, 450);
  }

  _launchFly(totalPoints, onArrive) {
    const floatEl = document.createElement('div');
    floatEl.className = 'de-score-fly';
    floatEl.textContent = `+${totalPoints}`;

    const layerRect = this.layer ? this.layer.getBoundingClientRect() : null;
    const hudRect = this.hudScore ? this.hudScore.getBoundingClientRect() : null;

    const startX = layerRect ? (layerRect.left + layerRect.width / 2) : (window.innerWidth * 0.75);
    const startY = layerRect ? (layerRect.top + layerRect.height / 2) : (window.innerHeight * 0.55);

    const targetX = hudRect ? (hudRect.left + hudRect.width / 2) : (startX - 350);
    const targetY = hudRect ? (hudRect.top + hudRect.height / 2) : (startY - 280);

    const deltaX = targetX - startX;
    const deltaY = targetY - startY;

    floatEl.style.left = `${startX}px`;
    floatEl.style.top = `${startY}px`;
    floatEl.style.setProperty('--fly-x', `${deltaX}px`);
    floatEl.style.setProperty('--fly-y', `${deltaY}px`);

    document.body.appendChild(floatEl);

    // Flight duration matches CSS animation (800ms)
    const flyTimeoutId = setTimeout(() => {
      floatEl.remove();
      this._bumpHudScore();
      if (typeof onArrive === 'function') {
        onArrive(totalPoints);
      }
    }, 800);
    if (!this._flyTimeoutIds) this._flyTimeoutIds = [];
    this._flyTimeoutIds.push(flyTimeoutId);
  }

  _bumpHudScore() {
    if (!this.hudScore) return;
    this.hudScore.classList.remove('hud__value--bump');
    // Force reflow to re-trigger animation
    void this.hudScore.offsetWidth;
    this.hudScore.classList.add('hud__value--bump');
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
    kissCountHud: '親吻次數',
    scoreHud: '分數',
    timeHud: '時間',
    kissBtn: 'KISS',
    kissHint: '（按住）',
    gameOverTitle: '遊戲結束',
    endPlayerLabel: '玩家：',
    endKissCountLabel: '親吻次數：',
    endScoreLabel: '累積分數：',
    restartBtn: '再玩一次',
    leaderboardTitle: '排行榜',
    leaderboardEmpty: '尚無紀錄',
    closeBtn: '關閉',
    clearBtn: '清除排行榜',
    clearPrompt: '請輸入密碼以清除排行榜：',
    passwordIncorrect: '密碼錯誤',
    defaultPlayerName: '無名氏',
    exitGameBtn: '離開遊戲（返回開始畫面）',
    rulesTitle: '遊戲玩法說明',
    rulesHowTitle: '💋 如何接吻與得分',
    rulesHowDesc: '按住畫面任意處或 KISS 按鈕，情侶 DE 即開始甜蜜接吻！只要按住不放，隨著連鎖次數增加將累積倍數；放開後數字將飄移至上方疊加成總分！',
    rulesSpeedTitle: '⚡ 連鎖加速與倍數得分機制 (Speed & Score Multipliers)',
    rulesSpeedDesc1: '在同一次長按中接吻次數越多，接吻速度與得分倍率同步加倍（最高達 5 倍加成！）。',
    rulesSpeedDesc2: '當速度達到 10 倍時，將觸發專屬深情喘氣特效！',
    rulesSpeedNote: '※ 只要放開手指或滑鼠，當輪累積次數歸零，下一次接吻速度重置回起始速度。',
    rulesBossTitle: '👀 觀察老闆與同事動作',
    rulesBossIdle: '專心工作：老闆背對著辦公，請把握時間接吻累積次數！',
    rulesBossPrep: '準備轉頭：老闆即將回頭（有轉身預兆動作），隨時準備放手！',
    rulesBossLook: '回頭盯著：老闆已轉身盯著！此時絕對不可接吻，否則立即當場抓包！',
    rulesEndingTitle: '🏆 結局判定條件',
    rulesEndingBad: 'BAD END：在老闆回頭盯著時接吻被抓到。',
    rulesEndingNormal: 'NORMAL END：時間結束存活，但累積分數未達 300 分。',
    rulesEndingGood: 'GOOD END：時間結束存活，且累積分數達到 300 分以上！',
    tooltipHowTitle: '💋 如何接吻',
    tooltipHowDesc: '按住畫面任意處或 KISS 按鈕開始親吻，持續按住可累積接吻次數。',
    tooltipSpeedTitle: '⚡ 連鎖加速',
    tooltipSpeedDesc: '同一次按住越久速度越快（最高 20 倍）。達 10 倍速時觸發深情喘氣特效。放開則重置速度。',
    tooltipBossTitle: '👀 觀察老闆動作',
    tooltipBossIdle: '專心工作：安全辦公，把握時間接吻！',
    tooltipBossPrep: '準備轉頭：老闆即將轉身，隨時準備放開！',
    tooltipBossLook: '回頭盯著：老闆正在盯著！絕對不能接吻，否則當場抓包！',
    tooltipEndingTitle: '🏆 結局判定',
    tooltipEndingBad: 'BAD END：在老闆回頭時接吻被抓包',
    tooltipEndingNormal: 'NORMAL END：存活但未滿 300 分',
    tooltipEndingGood: 'GOOD END：存活且達到 300 分以上',
    bossWarningIdle: 'Boss Idle',
    bossWarningPrepare: '⚠ Boss Preparing!',
    bossWarningLooking: '👀 Boss Looking!',
    bossWarningCaught: 'Caught!',
    endingBad: '被老闆發現了！下次小心一點。',
    endingNormal: '安全過關，但累積分數未達 300 分。',
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
    kissCountHud: '亲吻次数',
    scoreHud: '分数',
    timeHud: '时间',
    kissBtn: 'KISS',
    kissHint: '（按住）',
    gameOverTitle: '游戏结束',
    endPlayerLabel: '玩家：',
    endKissCountLabel: '亲吻次数：',
    endScoreLabel: '累积分数：',
    restartBtn: '再玩一次',
    leaderboardTitle: '排行榜',
    leaderboardEmpty: '暂无记录',
    closeBtn: '关闭',
    clearBtn: '清除排行榜',
    clearPrompt: '请输入密码以清除排行榜：',
    passwordIncorrect: '密码错误',
    defaultPlayerName: '无名氏',
    exitGameBtn: '离开游戏（返回开始画面）',
    rulesTitle: '游戏玩法说明',
    rulesHowTitle: '💋 如何接吻与得分',
    rulesHowDesc: '按住画面任意处或 KISS 按钮，情侣 DE 即开始甜蜜接吻！只要按住不放，随着连锁次数增加将累积倍数；放开后数字将飘移至上方叠加成总分！',
    rulesSpeedTitle: '⚡ 连锁加速与倍数得分机制 (Speed & Score Multipliers)',
    rulesSpeedDesc1: '在同一次长按中接吻次数越多，接吻速度与得分倍率同步加倍（最高达 5 倍加成！）。',
    rulesSpeedDesc2: '当速度达到 10 倍时，将触发专属深情喘气特效！',
    rulesSpeedNote: '※ 只要放开手指或鼠标，当轮累积次数归零，下一次接吻速度重置回起始速度。',
    rulesBossTitle: '👀 观察老板与同事动作',
    rulesBossIdle: '专心工作：老板背对着办公，请把握时间接吻累积次数！',
    rulesBossPrep: '准备回头：老板即将回头（有转身预兆动作），随时准备放手！',
    rulesBossLook: '回头盯着：老板已转身盯着！此时绝对不可接吻，否则立即当场抓包！',
    rulesEndingTitle: '🏆 结局判定条件',
    rulesEndingBad: 'BAD END：在老板回头盯着时接吻被抓到。',
    rulesEndingNormal: 'NORMAL END：时间结束存活，但累积分数未达 300 分。',
    rulesEndingGood: 'GOOD END：时间结束存活，且累积分数达到 300 分以上！',
    tooltipHowTitle: '💋 如何接吻',
    tooltipHowDesc: '按住画面任意处或 KISS 按钮开始亲吻，持续按住可累积接吻次数。',
    tooltipSpeedTitle: '⚡ 连锁加速',
    tooltipSpeedDesc: '同一次按住越久速度越快（最高 20 倍）。达 10 倍速时触发深情喘气特效。放开则重置速度。',
    tooltipBossTitle: '👀 观察老板动作',
    tooltipBossIdle: '专心工作：安全办公，把握时间接吻！',
    tooltipBossPrep: '准备回头：老板即将转身，随时准备放开！',
    tooltipBossLook: '回头盯着：老板正在盯着！绝对不能接吻，否则当场抓包！',
    tooltipEndingTitle: '🏆 结局判定',
    tooltipEndingBad: 'BAD END：在老板回头时接吻被抓包',
    tooltipEndingNormal: 'NORMAL END：存活但未满 300 分',
    tooltipEndingGood: 'GOOD END：存活且达到 300 分以上',
    bossWarningIdle: 'Boss Idle',
    bossWarningPrepare: '⚠ Boss Preparing!',
    bossWarningLooking: '👀 Boss Looking!',
    bossWarningCaught: 'Caught!',
    endingBad: '被老板发现了！下次小心一点。',
    endingNormal: '安全过关，但累积分数未达 300 分。',
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
    kissCountHud: 'Kiss Count',
    scoreHud: 'Score',
    timeHud: 'Time',
    kissBtn: 'KISS',
    kissHint: ' (Hold)',
    gameOverTitle: 'Game Over',
    endPlayerLabel: 'Player: ',
    endKissCountLabel: 'Kiss Count: ',
    endScoreLabel: 'Total Score: ',
    restartBtn: 'Play Again',
    leaderboardTitle: 'Leaderboard',
    leaderboardEmpty: 'No records yet',
    closeBtn: 'Close',
    clearBtn: 'Clear Leaderboard',
    clearPrompt: 'Enter password to clear leaderboard:',
    passwordIncorrect: 'Incorrect password',
    defaultPlayerName: 'Anonymous',
    exitGameBtn: 'Exit Game (Return to Menu)',
    rulesTitle: 'How to Play',
    rulesHowTitle: '💋 How to Kiss & Score',
    rulesHowDesc: 'Hold anywhere on the screen or press and hold KISS to kiss! Build up combos while holding; upon release the score floats up to stack into your total score!',
    rulesSpeedTitle: '⚡ Speed & Score Multipliers',
    rulesSpeedDesc1: 'The longer you continuously hold and kiss, the faster you kiss and the higher your score multiplier (up to 5x points!).',
    rulesSpeedDesc2: 'Reaching 10x speed triggers an exclusive steamy breath effect!',
    rulesSpeedNote: '* Releasing your finger or mouse resets your current hold streak and returns kiss speed to start.',
    rulesBossTitle: '👀 Watch the Boss',
    rulesBossIdle: 'Working: Boss is facing away working. Kiss now to build up combos!',
    rulesBossPrep: 'Turning: Boss is about to turn around. Get ready to release!',
    rulesBossLook: 'Watching: Boss is watching directly! Do NOT kiss, or you will get busted!',
    rulesEndingTitle: '🏆 Ending Conditions',
    rulesEndingBad: 'BAD END: Caught kissing while the boss is watching.',
    rulesEndingNormal: 'NORMAL END: Survived until time out, but scored under 300 points.',
    rulesEndingGood: 'GOOD END: Survived until time out and scored 300 points or higher!',
    tooltipHowTitle: '💋 How to Kiss',
    tooltipHowDesc: 'Hold anywhere or press KISS to start kissing. Continuous hold racks up kisses.',
    tooltipSpeedTitle: '⚡ Combo Speed',
    tooltipSpeedDesc: 'Longer continuous hold = faster kissing (up to 20x). 10x triggers breath effect. Releasing resets speed.',
    tooltipBossTitle: '👀 Watch the Boss',
    tooltipBossIdle: 'Working: Safe to kiss! Rack up combos.',
    tooltipBossPrep: 'Turning: Boss is turning, get ready to release!',
    tooltipBossLook: 'Watching: Boss is watching! Stop kissing immediately!',
    tooltipEndingTitle: '🏆 Endings',
    tooltipEndingBad: 'BAD END: Caught kissing while boss is watching',
    tooltipEndingNormal: 'NORMAL END: Survived, < 300 pts',
    tooltipEndingGood: 'GOOD END: Survived, ≥ 300 pts',
    bossWarningIdle: 'Boss Idle',
    bossWarningPrepare: '⚠ Boss Preparing!',
    bossWarningLooking: '👀 Boss Looking!',
    bossWarningCaught: 'Caught!',
    endingBad: 'Caught by the boss! Be more careful next time.',
    endingNormal: 'Made it through safely, but score is under 300.',
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
 * END PANEL CONTROLLER — Draggable & Collapsible settlement window
 * ============================================================================= */

class EndPanelController {
  constructor() {
    this.panel = document.getElementById('end-panel');
    this.header = document.getElementById('end-panel-header');
    this.collapseBtn = document.getElementById('end-collapse-btn');
    this.collapseIcon = document.getElementById('end-collapse-icon');
    this.content = document.getElementById('end-panel-content');

    this.isCollapsed = false;
    this.currentX = 0;
    this.currentY = 0;
    this.isDragging = false;
    this.startX = 0;
    this.startY = 0;
    this.initialX = 0;
    this.initialY = 0;
    this.dragDistance = 0;

    this._bind();
  }

  reset() {
    this.isCollapsed = false;
    this.currentX = 0;
    this.currentY = 0;
    if (this.panel) {
      this.panel.classList.remove('panel--end--collapsed');
      this.panel.classList.remove('is-dragging');
      this.panel.style.transform = '';
    }
    if (this.collapseIcon) {
      this.collapseIcon.textContent = '−';
    }
  }

  toggleCollapse() {
    this.isCollapsed = !this.isCollapsed;
    if (this.panel) {
      this.panel.classList.toggle('panel--end--collapsed', this.isCollapsed);
    }
    if (this.collapseIcon) {
      this.collapseIcon.textContent = this.isCollapsed ? '+' : '−';
    }
  }

  _bind() {
    if (!this.panel) return;

    // Toggle collapse button click
    this.collapseBtn?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggleCollapse();
    });

    // If collapsed, clicking anywhere on the mini pill expands it (unless it was a drag)
    this.panel.addEventListener('click', (e) => {
      if (this.isCollapsed && this.dragDistance < 6) {
        if (!e.target.closest('button')) {
          this.toggleCollapse();
        }
      }
    });

    // Draggable functionality via Pointer Events
    const onPointerDown = (e) => {
      if (e.target.closest('button') || e.target.closest('a') || e.target.closest('input')) return;
      if (e.pointerType === 'mouse' && e.button !== 0) return;

      this.isDragging = true;
      this.dragDistance = 0;
      this.startX = e.clientX;
      this.startY = e.clientY;
      this.initialX = this.currentX;
      this.initialY = this.currentY;

      try {
        this.panel.setPointerCapture(e.pointerId);
      } catch (err) { }

      this.panel.classList.add('is-dragging');
    };

    const onPointerMove = (e) => {
      if (!this.isDragging) return;
      const deltaX = e.clientX - this.startX;
      const deltaY = e.clientY - this.startY;
      this.dragDistance = Math.hypot(deltaX, deltaY);

      // Clamp within viewport
      const rect = this.panel.getBoundingClientRect();
      const maxOffsetX = Math.max(20, (window.innerWidth - rect.width) / 2 + rect.width * 0.35);
      const maxOffsetY = Math.max(20, (window.innerHeight - rect.height) / 2 + rect.height * 0.35);

      let nextX = this.initialX + deltaX;
      let nextY = this.initialY + deltaY;

      nextX = Math.max(-maxOffsetX, Math.min(maxOffsetX, nextX));
      nextY = Math.max(-maxOffsetY, Math.min(maxOffsetY, nextY));

      this.currentX = nextX;
      this.currentY = nextY;
      this.panel.style.transform = `translate3d(${nextX}px, ${nextY}px, 0)`;
    };

    const onPointerUp = (e) => {
      if (!this.isDragging) return;
      this.isDragging = false;
      this.panel.classList.remove('is-dragging');
      if (this.panel.hasPointerCapture?.(e.pointerId)) {
        this.panel.releasePointerCapture(e.pointerId);
      }
    };

    this.panel.addEventListener('pointerdown', onPointerDown);
    this.panel.addEventListener('pointermove', onPointerMove);
    this.panel.addEventListener('pointerup', onPointerUp);
    this.panel.addEventListener('pointercancel', onPointerUp);
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
      kissCount: document.getElementById('hud-kiss-count'),
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
    this.endPanelController = new EndPanelController();
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

  updateHUD({ playerName, score, kissCount, timer }) {
    if (playerName !== undefined && this.hud.playerName) this.hud.playerName.textContent = playerName;
    if (kissCount !== undefined && this.hud.kissCount) this.hud.kissCount.textContent = kissCount;
    if (score !== undefined && this.hud.score) this.hud.score.textContent = score;
    if (timer !== undefined && this.hud.timer) this.hud.timer.textContent = timer;
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

  showEndScreen({ playerName, score, kissCount, ending }) {
    this.lastEndData = { playerName, score, kissCount, ending };
    document.getElementById('end-title').textContent = ending;
    document.getElementById('end-message').textContent = getEndingMessage(ending);
    document.getElementById('end-player-name').textContent = playerName;
    document.getElementById('end-score').textContent = score;
    const endKissEl = document.getElementById('end-kiss-count');
    if (endKissEl && kissCount !== undefined) {
      endKissEl.textContent = kissCount;
    }
    this.endPanelController?.reset();
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
    this.scorePopup = new ScorePopupManager();
    this.characterAnim = new CharacterAnimationManager({
      getElapsedRatio: () => this._getElapsedRatio(),
    });
    this.kissSystem = new KissSystem(
      this.scoreSystem,
      this.characterAnim,
      (scoreData) => {
        if (typeof scoreData === 'object' && scoreData !== null) {
          this.ui.updateHUD({ score: scoreData.score, kissCount: scoreData.kissCount });
        } else {
          this.ui.updateHUD({ score: scoreData });
        }
      },
      this.scorePopup
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
    document.getElementById('gameplay-exit-btn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.returnToMenu();
    });
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

    // 在切換畫面之前先重設 HUD 數值並移除跳動效果，確保全新一輪不會閃爍或跳動
    this.ui.updateHUD({
      playerName: this.playerName,
      kissCount: 0,
      score: 0,
      timer: GAME_CONFIG.gameDuration,
    });
    if (this.kissSystem?.scorePopup?.hudScore) {
      this.kissSystem.scorePopup.hudScore.classList.remove('hud__value--bump');
    }

    this.characterAnim.start();
    this.bossStateMachine.reset();
    this.bossStateMachine.start();

    this.ui.showScreen('game');
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

    this.kissSystem.commitPendingScore();

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
    this.kissSystem.commitPendingScore();
    this.characterAnim.stop();

    const score = this.scoreSystem.getScore();
    const kissCount = this.scoreSystem.getKissCount();
    const ending = determineEnding(caught, score);

    this.leaderboard.saveEntry({
      playerName: this.playerName,
      score,
      ending,
      date: new Date().toISOString(),
    });

    this.ui.showEndScreen({ playerName: this.playerName, score, kissCount, ending });
  }

  returnToMenu() {
    this.gamePhase = 'menu';
    this._clearOverlayTimer();
    this.ui.hideEndingOverlay();
    this.timerSystem?.stop();
    this.bossStateMachine.stop();
    this.characterAnim.stop();
    this.kissSystem.reset();
    this.scoreSystem.reset();
    this.ui.endPanelController?.reset();
    this.ui.updateHUD({
      playerName: '',
      kissCount: 0,
      score: 0,
      timer: GAME_CONFIG.gameDuration,
    });
    if (this.kissSystem?.scorePopup?.hudScore) {
      this.kissSystem.scorePopup.hudScore.classList.remove('hud__value--bump');
    }
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
 * MOBILE VIEWPORT LOCK — prevent pinch-to-zoom and double-tap zoom
 * ============================================================================= */

function initMobileViewportLock() {
  // Prevent gesture zoom on iOS Safari (which ignores user-scalable=no)
  document.addEventListener('gesturestart', (e) => e.preventDefault());
  document.addEventListener('gesturechange', (e) => e.preventDefault());
  document.addEventListener('gestureend', (e) => e.preventDefault());

  // Prevent multi-touch pinch zoom
  document.addEventListener(
    'touchstart',
    (e) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // Prevent fast double-tap zoom
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) {
        e.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false }
  );
}

/* =============================================================================
 * BOOT
 * ============================================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // Lock mobile pinch/double-tap zoom
  initMobileViewportLock();

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
