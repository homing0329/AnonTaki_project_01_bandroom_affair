# Office Affair — Development TODO

Phase 1（本階段）已完成最小可運行 Prototype。以下為建議的逐步實作順序。

---

## Phase 2 — Boss 狀態機

- [ ] 在 `BossStateMachine` 實作完整狀態循環：`IDLE → PREPARE → LOOKING → IDLE → ...`
- [ ] 使用 `GAME_CONFIG.bossTiming` 的隨機時間範圍
- [ ] PREPARE 狀態觸發視覺警告（已有 UI placeholder，需連接邏輯）
- [ ] PREPARE 狀態加入音效警告（可選）
- [ ] LOOKING 期間若 D/E 正在 KISSING → 觸發 CAUGHT → 呼叫 `GameManager._onCaught()`
- [ ] 確保 Boss 狀態機與 A/B/C 動畫完全解耦

---

## Phase 3 — Kiss 系統

- [ ] 實作 Kiss Cycle 計時器（基於 `GAME_CONFIG.kissCycleDuration`）
- [ ] 每完成一個完整 cycle → `ScoreSystem.addKiss()` + 更新 HUD
- [ ] 整合 `getKissSpeedMultiplier(score)` 動態調整 cycle 速度
- [ ] 玩家按住 KISS 時 cycle 持續重複
- [ ] 放開 KISS 時立即停止 cycle 並回到 ARGUING

---

## Phase 4 — 計時與結局流程

- [ ] 確認 Timer 在 CAUGHT 時立即停止
- [ ] BAD END：被發現時立即 Game Over（不等待時間結束）
- [ ] NORMAL END / GOOD END：時間結束且未被發現時，使用 `determineEnding()` 判定
- [ ] 結局畫面顯示對應文案與視覺差異

---

## Phase 5 — 排行榜（localStorage）

- [ ] `LeaderboardSystem.load()` — 從 `localStorage` 讀取 JSON 陣列
- [ ] `LeaderboardSystem.saveEntry()` — 追加新紀錄並排序
- [ ] 只保留 Top 10（按 score 由高至低）
- [ ] 每筆紀錄：`playerName`, `score`, `ending`, `date`
- [ ] `clear()` 清除 localStorage 並刷新 UI
- [ ] 格式化日期顯示

---

## Phase 6 — 角色動畫強化

### Boss A（獨立循環）
- [ ] A1 → A2 → A3 → A1 獨立 timer（不影響 Boss Group）
- [ ] 替換 placeholder 色塊為 sprite 或 CSS 動畫

### Boss B/C（Conversation Animation System）
- [ ] 完善 `conversationSets` 資料結構
- [ ] 支援動態新增 Conversation Set
- [ ] B/C 動畫僅為 Visual Layer，不影響 Boss 判定
- [ ] 建立 2–3 組完整 placeholder 動畫

### 情侶 D/E
- [ ] ARGUING 狀態：對罵動畫循環
- [ ] KISSING 狀態：Kiss Cycle 動畫（含 speed tier 加速）
- [ ] 動畫與 `KissSystem` cycle 同步

---

## Phase 7 — UI / UX  polish

- [ ] Boss Warning Indicator 各狀態視覺優化
- [ ] PREPARE 脈衝動畫 / 音效
- [ ] KISS 按鈕觸控與鍵盤支援（例如空白鍵）
- [ ] 開始畫面與結局畫面視覺統一
- [ ] 響應式布局（平板 / 小螢幕）

---

## Phase 8 — 測試與部署準備

- [ ] 手動測試完整遊戲流程
- [ ] 確認 `file://` 本地開啟正常（無 module import 問題）
- [ ] 撰寫 README（玩法說明、本地執行方式）
- [ ] 日後部署至靜態 hosting（GitHub Pages 等）

---

## 架構備註

| 模組 | 檔案 | 狀態 |
|------|------|------|
| `GAME_CONFIG` | game.js | ✅ 已建立 |
| `getKissSpeedMultiplier()` | game.js | ✅ 函數就緒，待接入 |
| `determineEnding()` | game.js | ✅ 函數就緒，待接入 |
| `GameManager` | game.js | ✅ 基本流程 |
| `BossStateMachine` | game.js | 🔲 Stub |
| `CharacterAnimationManager` | game.js | 🔲 Placeholder 動畫 |
| `KissSystem` | game.js | 🔲 輸入已接，邏輯待實作 |
| `ScoreSystem` | game.js | 🔲 結構就緒 |
| `TimerSystem` | game.js | ✅ 基本倒數 |
| `LeaderboardSystem` | game.js | 🔲 UI 已接，storage 待實作 |
| `UIManager` | game.js | ✅ 基本 HUD |
