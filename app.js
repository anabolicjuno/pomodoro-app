/* ============================================================
   🍅 뽀모도로 앱 — app.js
   ============================================================ */

// ── 색상 팔레트 ──────────────────────────────────────────────
const COLOR_PALETTE = [
  { name: '빨강',   hex: '#ff4757', glow: 'rgba(255,71,87,0.35)',    orb: '#ff4757' },
  { name: '주황',   hex: '#ff7f50', glow: 'rgba(255,127,80,0.35)',   orb: '#ff7f50' },
  { name: '노랑',   hex: '#ffd32a', glow: 'rgba(255,211,42,0.35)',   orb: '#ffd32a' },
  { name: '초록',   hex: '#2ed573', glow: 'rgba(46,213,115,0.35)',   orb: '#2ed573' },
  { name: '파랑',   hex: '#1e90ff', glow: 'rgba(30,144,255,0.35)',   orb: '#1e90ff' },
  { name: '남색',   hex: '#5352ed', glow: 'rgba(83,82,237,0.35)',    orb: '#5352ed' },
  { name: '보라',   hex: '#a55eea', glow: 'rgba(165,94,234,0.35)',   orb: '#a55eea' },
];

// ── 기본 설정값 ──────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  focusTime:   50,
  shortTime:   5,
  sound:       true,
  autoStart:   false,
  focusColor:  3,   // 초록
  shortColor:  4,   // 파랑
};

// ── 상태 ─────────────────────────────────────────────────────
let settings    = loadSettings();

// 현재 화면에 보이는 모드 (탭 선택 기준)
let displayMode = 'focus';

// 실제로 타이머가 돌고 있는 모드 (독립 유지)
let runningMode = null;   // null이면 아무것도 안 돌고 있음

// 각 모드별 독립 타이머 상태
const timerState = {
  focus: {
    timeLeft:  null,   // null = 아직 초기화 전
    totalTime: null,
    timerId:   null,
    isRunning: false,
  },
  short: {
    timeLeft:  null,
    totalTime: null,
    timerId:   null,
    isRunning: false,
  },
};

let sessionNum         = 0;
let todaySessions      = 0;
let totalSessions      = 0;
let focusSecondsToday  = 0;

const CIRCUMFERENCE = 2 * Math.PI * 148;

// ── DOM 참조 ──────────────────────────────────────────────────
const timeDisplay    = document.getElementById('timeDisplay');
const modeLabel      = document.getElementById('modeLabel');
const ringProgress   = document.getElementById('ringProgress');
const startBtn       = document.getElementById('startBtn');
const btnLabel       = document.getElementById('btnLabel');
const resetBtn       = document.getElementById('resetBtn');
const stopBtn        = document.getElementById('stopBtn');
const sessionDots    = document.getElementById('sessionDots');
const tomatoRow      = document.getElementById('tomatoRow');
const todayEl        = document.getElementById('todaySessions');
const minutesEl      = document.getElementById('todayMinutes');
const totalEl        = document.getElementById('totalSessions');
const toast          = document.getElementById('toast');
const tabs           = document.querySelectorAll('.tab');

const settingsBtn      = document.getElementById('settingsBtn');
const modalOverlay     = document.getElementById('modalOverlay');
const modalClose       = document.getElementById('modalClose');
const saveSettingsBtn  = document.getElementById('saveSettings');
const resetStatsBtn    = document.getElementById('resetStats');
const soundToggle      = document.getElementById('soundToggle');
const autoStartToggle  = document.getElementById('autoStartToggle');
const focusTimeDisplay = document.getElementById('focusTimeDisplay');
const shortTimeDisplay = document.getElementById('shortTimeDisplay');

// 확인 다이얼로그
const confirmOverlay   = document.getElementById('confirmOverlay');
const confirmMsg       = document.getElementById('confirmMsg');
const confirmYesBtn    = document.getElementById('confirmYes');
const confirmNoBtn     = document.getElementById('confirmNo');

// ── 커스텀 확인 다이얼로그 ───────────────────────────────────
function showConfirm(message, onYes) {
  confirmMsg.textContent = message;
  confirmOverlay.classList.add('open');
  // 이전 리스너 제거 후 새로 등록
  const yes = () => { cleanup(); onYes(); };
  const no  = () => { cleanup(); };
  function cleanup() {
    confirmOverlay.classList.remove('open');
    confirmYesBtn.removeEventListener('click', yes);
    confirmNoBtn.removeEventListener('click',  no);
  }
  confirmYesBtn.addEventListener('click', yes);
  confirmNoBtn.addEventListener('click',  no);
}

// ── 초기화 ────────────────────────────────────────────────────
function init() {
  loadStats();

  // 각 모드 초기 시간 세팅
  timerState.focus.totalTime = settings.focusTime * 60;
  timerState.focus.timeLeft  = settings.focusTime * 60;
  timerState.short.totalTime = settings.shortTime * 60;
  timerState.short.timeLeft  = settings.shortTime * 60;

  applyTheme(settings.focusColor);
  switchDisplay('focus');
  updateSessionDots();
  updateStats();
  registerSW();
  requestNotifPermission();

  ringProgress.style.strokeDasharray  = CIRCUMFERENCE;
  ringProgress.style.strokeDashoffset = 0;
  document.documentElement.style.setProperty('--circumference', CIRCUMFERENCE);

  buildColorSwatches();
  initDragPickers();
}

// ── 테마 색상 적용 ────────────────────────────────────────────
function applyTheme(colorIndex) {
  const c = COLOR_PALETTE[colorIndex] || COLOR_PALETTE[3];
  const root = document.documentElement;
  root.style.setProperty('--accent',      c.hex);
  root.style.setProperty('--accent-glow', c.glow);
  root.style.setProperty('--orb-color',   c.orb);
  document.querySelector('.orb-1').style.background = c.orb;
}

// ── 색상 스와치 ───────────────────────────────────────────────
function buildColorSwatches() {
  buildSwatchGroup('focusColorSwatches', 'focusColor');
  buildSwatchGroup('shortColorSwatches', 'shortColor');
}

function buildSwatchGroup(containerId, settingKey) {
  const container = document.getElementById(containerId);
  container.innerHTML = '';
  COLOR_PALETTE.forEach((color, idx) => {
    const btn = document.createElement('button');
    btn.className = 'color-swatch' + (settings[settingKey] === idx ? ' selected' : '');
    btn.style.background = color.hex;
    btn.style.boxShadow  = `0 0 8px ${color.glow}`;
    btn.title = color.name;
    btn.setAttribute('aria-label', color.name);
    btn.addEventListener('click', () => {
      container.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('selected'));
      btn.classList.add('selected');
      tempSettings[settingKey] = idx;
      const previewKey = displayMode === 'focus' ? 'focusColor' : 'shortColor';
      if (settingKey === previewKey) applyTheme(idx);
    });
    container.appendChild(btn);
  });
}

function refreshSwatchSelections() {
  refreshSwatchGroup('focusColorSwatches', 'focusColor');
  refreshSwatchGroup('shortColorSwatches', 'shortColor');
}

function refreshSwatchGroup(containerId, settingKey) {
  const container = document.getElementById(containerId);
  container.querySelectorAll('.color-swatch').forEach((btn, idx) => {
    btn.classList.toggle('selected', tempSettings[settingKey] === idx);
  });
}

// ── 드래그 시간 피커 ──────────────────────────────────────────
function initDragPickers() {
  setupDragPicker(document.getElementById('focusDragPicker'));
  setupDragPicker(document.getElementById('shortDragPicker'));
}

function setupDragPicker(el) {
  const key     = el.dataset.target;
  const min     = parseInt(el.dataset.min);
  const max     = parseInt(el.dataset.max);
  const valueEl = el.querySelector('.drag-value');
  let startY = 0, startVal = 0, isDragging = false;
  const SENSITIVITY = 8;

  function getValue()  { return tempSettings[key]; }
  function setValue(v) {
    const c = Math.min(max, Math.max(min, v));
    tempSettings[key] = c;
    valueEl.textContent = c;
  }

  el.addEventListener('mousedown', e => {
    isDragging = true; startY = e.clientY; startVal = getValue();
    document.body.style.cursor = 'ns-resize'; e.preventDefault();
  });
  document.addEventListener('mousemove', e => {
    if (!isDragging) return;
    setValue(startVal + Math.round((startY - e.clientY) / SENSITIVITY));
  });
  document.addEventListener('mouseup', () => {
    if (isDragging) { isDragging = false; document.body.style.cursor = ''; }
  });
  el.addEventListener('touchstart', e => {
    startY = e.touches[0].clientY; startVal = getValue(); e.preventDefault();
  }, { passive: false });
  el.addEventListener('touchmove', e => {
    setValue(startVal + Math.round((startY - e.touches[0].clientY) / SENSITIVITY));
    e.preventDefault();
  }, { passive: false });
  el.addEventListener('click', e => {
    if (isDragging) return;
    const rect = el.getBoundingClientRect();
    setValue(getValue() + (e.clientY < rect.top + rect.height / 2 ? 1 : -1));
  });
  el.addEventListener('wheel', e => {
    e.preventDefault();
    setValue(getValue() + (e.deltaY < 0 ? 1 : -1));
  }, { passive: false });
}

// ── 화면에 보이는 모드 전환 ──────────────────────────────────
// 타이머를 멈추지 않고 표시만 바꾼다
function switchDisplay(newMode) {
  displayMode = newMode;

  // 탭 활성화
  tabs.forEach(t => t.classList.toggle('active', t.dataset.mode === newMode));

  // 레이블
  modeLabel.textContent = getModeLabel(newMode);

  // 테마 (현재 표시 모드 색상)
  const colorIdx = newMode === 'focus' ? settings.focusColor : settings.shortColor;
  applyTheme(colorIdx);

  // 링 / 시간 표시 업데이트
  renderDisplayState();
  updateButtonState();
}

// 현재 displayMode의 타이머 상태를 화면에 그린다
function renderDisplayState() {
  const st = timerState[displayMode];
  const total = st.totalTime || 1;
  const left  = st.timeLeft  ?? st.totalTime;

  const m = String(Math.floor(left / 60)).padStart(2, '0');
  const s = String(left % 60).padStart(2, '0');
  timeDisplay.textContent = `${m}:${s}`;
  document.title = `${m}:${s} 🍅`;

  const ratio  = total > 0 ? left / total : 0;
  const offset = CIRCUMFERENCE * (1 - ratio);
  ringProgress.style.strokeDashoffset = offset;

  // running 클래스 (pulse 애니메이션)
  const rc = document.querySelector('.ring-container');
  if (st.isRunning) rc.classList.add('running');
  else              rc.classList.remove('running');
}

// 시작/계속 버튼 텍스트 & 멈춤 버튼 상태
function updateButtonState() {
  const st = timerState[displayMode];

  // 다른 모드가 실행 중인 상태에서 이 모드를 보고 있는 경우 (예: 집중 중 → 휴식 탭)
  const otherModeRunning = runningMode !== null && runningMode !== displayMode;

  if (st.isRunning) {
    btnLabel.textContent = '일시정지';
  } else {
    const hasStarted = st.timeLeft !== null && st.timeLeft < st.totalTime;
    btnLabel.textContent = hasStarted ? '계속' : '시작';
  }

  // 다른 모드가 실행 중일 때: 시작 버튼만 활성화, reset/stop 비활성화
  if (otherModeRunning) {
    resetBtn.disabled = true;
    resetBtn.style.opacity = '0.25';
    stopBtn.disabled = true;
    stopBtn.style.opacity = '0.25';
  } else {
    resetBtn.disabled = false;
    resetBtn.style.opacity = '1';
    // 멈춤 버튼: 현재 표시 모드가 실제로 실행 중일 때만 활성화
    stopBtn.disabled = !st.isRunning;
    stopBtn.style.opacity = st.isRunning ? '1' : '0.35';
  }
}

// ── 타이머 시작 (특정 모드) ──────────────────────────────────
function startTimerFor(targetMode) {
  const st = timerState[targetMode];
  if (st.isRunning) return;

  // timeLeft 초기화가 안 됐다면 세팅
  if (st.timeLeft === null) {
    const mins = targetMode === 'focus' ? settings.focusTime : settings.shortTime;
    st.totalTime = mins * 60;
    st.timeLeft  = st.totalTime;
  }

  st.isRunning = true;
  runningMode  = targetMode;

  st.timerId = setInterval(() => {
    st.timeLeft--;

    if (targetMode === 'focus') {
      focusSecondsToday++;
      saveStats();
      updateStats();
    }

    // 현재 화면이 이 모드를 보고 있을 때만 렌더
    if (displayMode === targetMode) {
      timeDisplay.classList.add('tick');
      setTimeout(() => timeDisplay.classList.remove('tick'), 80);
      renderDisplayState();
    }

    if (st.timeLeft <= 0) {
      clearInterval(st.timerId);
      st.timerId   = null;
      st.isRunning = false;
      runningMode  = null;
      onTimerComplete(targetMode);
    }
  }, 1000);

  if (displayMode === targetMode) updateButtonState();
}

// ── 일시정지 (특정 모드) ─────────────────────────────────────
function pauseTimerFor(targetMode) {
  const st = timerState[targetMode];
  if (!st.isRunning) return;
  clearInterval(st.timerId);
  st.timerId   = null;
  st.isRunning = false;
  if (runningMode === targetMode) runningMode = null;
  if (displayMode === targetMode) updateButtonState();
}

// ── 리셋 (특정 모드, 타이머 완전 초기화) ─────────────────────
function resetTimerFor(targetMode) {
  pauseTimerFor(targetMode);
  const st   = timerState[targetMode];
  const mins = targetMode === 'focus' ? settings.focusTime : settings.shortTime;
  st.totalTime = mins * 60;
  st.timeLeft  = st.totalTime;
  if (displayMode === targetMode) { renderDisplayState(); updateButtonState(); }
}

// ── 타이머 완료 ───────────────────────────────────────────────
function onTimerComplete(completedMode) {
  playSound();
  sendNotification(completedMode);

  if (completedMode === 'focus') {
    sessionNum++;
    todaySessions++;
    totalSessions++;
    saveStats();
    updateStats();
    addTomato();
    updateSessionDots();
    showToast('✅ 집중 완료! 휴식을 취하세요');

    // 집중 완료 → 휴식 타이머 초기화 & 화면 전환
    resetTimerFor('short');
    switchDisplay('short');

    if (settings.autoStart) {
      setTimeout(() => startTimerFor('short'), 1200);
    }
  } else {
    showToast('☕ 휴식 완료! 다시 집중할 시간이에요');

    resetTimerFor('focus');
    switchDisplay('focus');

    if (settings.autoStart) {
      setTimeout(() => startTimerFor('focus'), 1200);
    }
  }

  if (displayMode === completedMode) updateButtonState();
}

function getModeLabel(m) {
  return m === 'focus' ? '집중 시간' : '휴식 시간';
}

// ── 통계 ─────────────────────────────────────────────────────
function updateStats() {
  todayEl.textContent   = todaySessions;
  minutesEl.textContent = Math.floor(focusSecondsToday / 60);
  totalEl.textContent   = totalSessions;
}

function updateSessionDots() {
  sessionDots.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement('span');
    const filled = i < (sessionNum % 4 || (sessionNum > 0 && sessionNum % 4 === 0 ? 4 : 0));
    dot.className = 'session-dot' + (filled ? ' filled' : '');
    sessionDots.appendChild(dot);
  }
}

function addTomato() {
  const span = document.createElement('span');
  span.className  = 'tomato-emoji';
  span.textContent = '🍅';
  tomatoRow.appendChild(span);
}

// ── 알림 & 사운드 ─────────────────────────────────────────────
function requestNotifPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}

function sendNotification(completedMode) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const title = completedMode === 'focus' ? '🍅 집중 완료!' : '☕ 휴식 완료!';
  const body  = completedMode === 'focus' ? '잠깐 휴식을 취하세요.' : '다시 집중할 시간이에요!';
  new Notification(title, { body, icon: 'icons/icon-192.png' });
}

function playSound() {
  if (!settings.sound) return;
  try {
    const ctx   = new (window.AudioContext || window.webkitAudioContext)();
    const notes = runningMode === 'focus' ? [523, 659, 784] : [784, 659, 523];
    notes.forEach((freq, i) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.type = 'sine'; osc.frequency.value = freq;
      const t = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.25, t + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      osc.start(t); osc.stop(t + 0.55);
    });
  } catch (e) {}
}

// ── 토스트 ────────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.add('show');
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3000);
}

// ── 설정 모달 ─────────────────────────────────────────────────
let tempSettings = { ...settings };

function openModal() {
  tempSettings = { ...settings };
  focusTimeDisplay.textContent = tempSettings.focusTime;
  shortTimeDisplay.textContent = tempSettings.shortTime;
  soundToggle.checked     = tempSettings.sound;
  autoStartToggle.checked = tempSettings.autoStart;
  refreshSwatchSelections();
  modalOverlay.classList.add('open');
}

function closeModal() {
  const colorIdx = displayMode === 'focus' ? settings.focusColor : settings.shortColor;
  applyTheme(colorIdx);
  modalOverlay.classList.remove('open');
}

function saveSettings() {
  settings = { ...tempSettings };
  localStorage.setItem('pomo-settings', JSON.stringify(settings));

  // 돌고 있지 않은 모드의 타이머 시간 갱신
  ['focus', 'short'].forEach(m => {
    if (!timerState[m].isRunning) {
      const mins = m === 'focus' ? settings.focusTime : settings.shortTime;
      timerState[m].totalTime = mins * 60;
      timerState[m].timeLeft  = mins * 60;
    }
  });

  const colorIdx = displayMode === 'focus' ? settings.focusColor : settings.shortColor;
  applyTheme(colorIdx);
  renderDisplayState();
  updateButtonState();

  closeModal();
  showToast('✅ 설정이 저장됐습니다');
  updateStats();
}

soundToggle.addEventListener('change',     () => { tempSettings.sound     = soundToggle.checked; });
autoStartToggle.addEventListener('change', () => { tempSettings.autoStart = autoStartToggle.checked; });

// ── 로컬 저장 ─────────────────────────────────────────────────
function loadSettings() {
  try {
    const s = JSON.parse(localStorage.getItem('pomo-settings'));
    return s ? { ...DEFAULT_SETTINGS, ...s } : { ...DEFAULT_SETTINGS };
  } catch { return { ...DEFAULT_SETTINGS }; }
}

function loadStats() {
  try {
    const today = new Date().toLocaleDateString('ko-KR');
    const saved = JSON.parse(localStorage.getItem('pomo-stats')) || {};
    totalSessions = saved.total || 0;
    if (saved.date === today) {
      todaySessions     = saved.today       || 0;
      focusSecondsToday = saved.focusSeconds || 0;
      for (let i = 0; i < todaySessions; i++) addTomato();
    } else {
      todaySessions = 0; focusSecondsToday = 0;
    }
  } catch { todaySessions = 0; totalSessions = 0; focusSecondsToday = 0; }
}

function saveStats() {
  const today = new Date().toLocaleDateString('ko-KR');
  localStorage.setItem('pomo-stats', JSON.stringify({
    date: today, today: todaySessions, total: totalSessions, focusSeconds: focusSecondsToday,
  }));
}

// ── Service Worker ────────────────────────────────────────────
function registerSW() {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {});
}

// ── 이벤트 리스너 ─────────────────────────────────────────────

// 시작/일시정지 버튼
startBtn.addEventListener('click', () => {
  const st = timerState[displayMode];

  if (st.isRunning) {
    // 현재 표시 모드가 돌고 있으면 일시정지
    pauseTimerFor(displayMode);
    return;
  }

  // 다른 모드가 돌고 있는 상태에서 이 모드를 시작하려는 경우
  if (runningMode !== null && runningMode !== displayMode) {
    const runningLabel  = getModeLabel(runningMode);
    const displayLabel  = getModeLabel(displayMode);
    showConfirm(
      `현재 ${runningLabel}이 진행 중입니다.\n그래도 ${displayLabel}을 시작하겠습니까?`,
      () => {
        resetTimerFor(runningMode);   // 진행 중이던 타이머 초기화
        startTimerFor(displayMode);
      }
    );
    return;
  }

  // 일반 시작
  startTimerFor(displayMode);
});

// 재시작(초기화) 버튼 — 확인 필요
resetBtn.addEventListener('click', () => {
  const label = getModeLabel(displayMode);
  showConfirm(
    `다시 ${label === '집중 시간' ? '집중' : '휴식'} 하겠습니까?`,
    () => {
      resetTimerFor(displayMode);
      showToast('🔄 타이머가 초기화됐습니다');
    }
  );
});

// 멈춤 버튼 — 확인 없이 즉시
stopBtn.addEventListener('click', () => {
  pauseTimerFor(displayMode);
});

// 탭 전환 — 타이머 유지, 화면만 전환
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    switchDisplay(tab.dataset.mode);
  });
});

settingsBtn.addEventListener('click', openModal);
modalClose.addEventListener('click',  closeModal);
saveSettingsBtn.addEventListener('click', saveSettings);

modalOverlay.addEventListener('click', e => {
  if (e.target === modalOverlay) closeModal();
});

resetStatsBtn.addEventListener('click', () => {
  showConfirm('모든 기록을 초기화할까요?', () => {
    todaySessions = 0; totalSessions = 0; sessionNum = 0; focusSecondsToday = 0;
    tomatoRow.innerHTML = '';
    localStorage.removeItem('pomo-stats');
    updateStats(); updateSessionDots();
    showToast('🗑 기록이 초기화됐습니다');
    closeModal();
  });
});

// 키보드 단축키
document.addEventListener('keydown', e => {
  if (e.target.tagName === 'INPUT') return;
  if (confirmOverlay.classList.contains('open')) return;
  if (e.code === 'Space') {
    e.preventDefault();
    startBtn.click();
  }
  if (e.code === 'KeyR') resetBtn.click();
  if (e.code === 'KeyS') stopBtn.click();
});

// Page Visibility API (백그라운드 타이머)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // 실행 중인 모드만 저장
    if (runningMode) {
      const st = timerState[runningMode];
      sessionStorage.setItem('pomo-bg', JSON.stringify({
        runningMode,
        timeLeft: st.timeLeft,
        focusSecondsToday,
        enteredAt: Date.now(),
      }));
    }
  } else {
    const raw = sessionStorage.getItem('pomo-bg');
    if (raw) {
      const { runningMode: savedRunningMode, timeLeft: savedLeft, focusSecondsToday: savedFocusSec, enteredAt } = JSON.parse(raw);
      const elapsed = Math.floor((Date.now() - enteredAt) / 1000);
      const st = timerState[savedRunningMode];
      if (st && st.isRunning) {
        st.timeLeft = Math.max(0, savedLeft - elapsed);
        if (savedRunningMode === 'focus') {
          focusSecondsToday = savedFocusSec + Math.min(elapsed, savedLeft);
          saveStats(); updateStats();
        }
        if (displayMode === savedRunningMode) renderDisplayState();
        if (st.timeLeft === 0) {
          clearInterval(st.timerId);
          st.timerId = null; st.isRunning = false; runningMode = null;
          onTimerComplete(savedRunningMode);
        }
      }
      sessionStorage.removeItem('pomo-bg');
    }
  }
});

// ── 시작 ─────────────────────────────────────────────────────
init();
