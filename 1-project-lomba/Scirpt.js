/* ======================================================
   LOMBA KEMERDEKAAN SPA — script.js
   Vanilla JS, no framework, localStorage persistence
   ====================================================== */

// ============================================================
// STATE
// ============================================================
const state = {
  sport: null,       // 'futsal' | 'basket'
  teams: [],         // [{ id, name, players: [] }]
  bracket: [],       // [{ id, teamA, teamB }]
  match: null,       // { teamA, teamB, scoreA, scoreB, log: [] }
};

// ============================================================
// STORAGE HELPERS
// ============================================================
function saveState() {
  try {
    localStorage.setItem('lomba_state', JSON.stringify(state));
  } catch (e) {
    console.warn('localStorage not available');
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem('lomba_state');
    if (raw) {
      const saved = JSON.parse(raw);
      Object.assign(state, saved);
    }
  } catch (e) {
    console.warn('Could not load state');
  }
}

// ============================================================
// SCREEN NAVIGATION
// ============================================================
function showScreen(id) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  document.getElementById(id).classList.add('active');
  window.scrollTo(0, 0);
}

function goHome() {
  showScreen('screen-home');
}

function selectSport(sport) {
  state.sport = sport;
  saveState();
  document.getElementById('sport-title').textContent =
    sport === 'futsal' ? '⚽ Futsal' : '🏀 Basket';
  renderTeamList();
  renderBracket();
  populateTeamSelectors();
  switchTab('tab-tim', document.querySelector('.tab-btn[data-tab="tab-tim"]'));
  showScreen('screen-sport');
}

// ============================================================
// TAB SWITCHING
// ============================================================
function switchTab(tabId, btn) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(tabId).classList.add('active');
  if (btn) btn.classList.add('active');

  if (tabId === 'tab-skor') populateTeamSelectors();
  if (tabId === 'tab-bagan') renderBracket();
}

// ============================================================
// TEAM MANAGEMENT
// ============================================================
function addPlayerInput() {
  const container = document.getElementById('player-inputs');
  const count = container.querySelectorAll('.player-input').length + 1;
  const input = document.createElement('input');
  input.className = 'input-field player-input';
  input.type = 'text';
  input.placeholder = `Nama Pemain ${count}`;
  input.maxLength = 25;
  container.appendChild(input);
  input.focus();
}

function addTeam() {
  const nameInput = document.getElementById('input-team-name');
  const name = nameInput.value.trim();

  if (!name) {
    showToast('⚠️ Nama tim tidak boleh kosong!');
    nameInput.focus();
    return;
  }

  if (state.teams.find(t => t.name.toLowerCase() === name.toLowerCase())) {
    showToast('⚠️ Nama tim sudah ada!');
    return;
  }

  const playerInputs = document.querySelectorAll('#player-inputs .player-input');
  const players = Array.from(playerInputs)
    .map(inp => inp.value.trim())
    .filter(Boolean);

  const team = {
    id: Date.now().toString(),
    name,
    players,
    sport: state.sport,
  };

  state.teams.push(team);
  saveState();
  renderTeamList();
  populateTeamSelectors();

  // Reset form
  nameInput.value = '';
  playerInputs.forEach(inp => inp.value = '');
  const container = document.getElementById('player-inputs');
  // Keep only first 3 inputs
  const all = container.querySelectorAll('.player-input');
  all.forEach((inp, i) => { if (i >= 3) inp.remove(); });

  showToast(`✅ Tim "${name}" berhasil ditambahkan!`);
}

function deleteTeam(id) {
  const team = state.teams.find(t => t.id === id);
  if (!team) return;
  if (!confirm(`Hapus tim "${team.name}"?`)) return;

  state.teams = state.teams.filter(t => t.id !== id);
  // Clear bracket if team was in it
  state.bracket = [];
  saveState();
  renderTeamList();
  renderBracket();
  populateTeamSelectors();
  showToast('🗑️ Tim dihapus');
}

function getTeamsForSport() {
  return state.teams.filter(t => t.sport === state.sport);
}

function renderTeamList() {
  const list = document.getElementById('team-list');
  const countEl = document.getElementById('team-count');
  const teams = getTeamsForSport();

  countEl.textContent = teams.length;

  if (teams.length === 0) {
    list.innerHTML = '<p class="empty-state">Belum ada tim. Tambah tim dulu yuk!</p>';
    return;
  }

  list.innerHTML = teams.map(team => `
    <div class="team-item" id="team-item-${team.id}">
      <div class="team-info">
        <div class="team-item-name">${escHtml(team.name)}</div>
        <div class="team-item-players">
          ${team.players.length
            ? '👤 ' + team.players.map(escHtml).join(', ')
            : '<em>Belum ada pemain</em>'
          }
        </div>
      </div>
      <button class="btn-delete" onclick="deleteTeam('${team.id}')" title="Hapus tim">✕</button>
    </div>
  `).join('');
}

// ============================================================
// BRACKET GENERATION
// ============================================================
function generateBracket() {
  const teams = getTeamsForSport();
  if (teams.length < 2) {
    showToast('⚠️ Minimal 2 tim untuk buat bagan!');
    return;
  }

  // Shuffle teams
  const shuffled = [...teams].sort(() => Math.random() - 0.5);

  // Build first round pairs
  const matches = [];
  for (let i = 0; i < shuffled.length; i += 2) {
    matches.push({
      id: `m${Date.now()}_${i}`,
      teamA: shuffled[i],
      teamB: shuffled[i + 1] || null, // null = BYE
    });
  }

  state.bracket = matches;
  saveState();
  renderBracket();
  showToast('🎲 Bagan berhasil diacak!');
}

function renderBracket() {
  const container = document.getElementById('bracket-container');

  if (state.bracket.length === 0) {
    container.innerHTML = '<div class="section-card"><p class="empty-state">Klik "Acak & Generate Bagan" untuk memulai.</p></div>';
    return;
  }

  const html = `
    <div class="section-card">
      <div class="bracket-round-label">Babak Pertama — ${state.bracket.length} Pertandingan</div>
      <div class="bracket-round">
        ${state.bracket.map((match, i) => `
          <div class="bracket-match">
            <div class="bracket-team">
              <span class="dot"></span>
              ${escHtml(match.teamA.name)}
            </div>
            <div class="bracket-team">
              ${match.teamB
                ? `<span class="dot"></span>${escHtml(match.teamB.name)}`
                : `<span class="bracket-bye">— BYE (masuk langsung ke babak berikutnya)</span>`
              }
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
  container.innerHTML = html;
}

// ============================================================
// TEAM SELECTORS (Skor Tab)
// ============================================================
function populateTeamSelectors() {
  const teams = getTeamsForSport();
  const selectA = document.getElementById('select-team-a');
  const selectB = document.getElementById('select-team-b');

  const options = teams.length === 0
    ? '<option value="">-- Belum ada tim --</option>'
    : teams.map(t => `<option value="${t.id}">${escHtml(t.name)}</option>`).join('');

  selectA.innerHTML = options;
  selectB.innerHTML = options;

  // Default: select different teams if possible
  if (teams.length >= 2) {
    selectB.selectedIndex = 1;
  }
}

// ============================================================
// MATCH & SCOREBOARD
// ============================================================
function startMatch() {
  const teams = getTeamsForSport();
  if (teams.length < 2) {
    showToast('⚠️ Minimal 2 tim untuk memulai pertandingan!');
    return;
  }

  const idA = document.getElementById('select-team-a').value;
  const idB = document.getElementById('select-team-b').value;

  if (idA === idB) {
    showToast('⚠️ Pilih 2 tim yang berbeda!');
    return;
  }

  const teamA = teams.find(t => t.id === idA);
  const teamB = teams.find(t => t.id === idB);

  if (!teamA || !teamB) {
    showToast('⚠️ Tim tidak ditemukan!');
    return;
  }

  state.match = { teamA, teamB, scoreA: 0, scoreB: 0, log: [] };
  saveState();
  renderScoreboard();
  showScreen('screen-scoreboard');
}

function renderScoreboard() {
  if (!state.match) return;
  const { teamA, teamB, scoreA, scoreB } = state.match;

  document.getElementById('match-sport-label').textContent =
    state.sport === 'futsal' ? '⚽ Futsal' : '🏀 Basket';
  document.getElementById('sb-team-a-name').textContent = teamA.name;
  document.getElementById('sb-team-b-name').textContent = teamB.name;
  document.getElementById('sb-score-a').textContent = scoreA;
  document.getElementById('sb-score-b').textContent = scoreB;

  renderLog();
}

function addScore(team, points) {
  if (!state.match) return;

  if (team === 'a') {
    state.match.scoreA = Math.max(0, state.match.scoreA + points);
  } else {
    state.match.scoreB = Math.max(0, state.match.scoreB + points);
  }

  // Log entry
  if (points !== 0) {
    const teamName = team === 'a' ? state.match.teamA.name : state.match.teamB.name;
    const sign = points > 0 ? `+${points}` : `${points}`;
    state.match.log.unshift({
      team: teamName,
      points: sign,
      scoreA: state.match.scoreA,
      scoreB: state.match.scoreB,
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
    });
    if (state.match.log.length > 20) state.match.log.pop();
  }

  saveState();

  // Update DOM
  const elA = document.getElementById('sb-score-a');
  const elB = document.getElementById('sb-score-b');
  elA.textContent = state.match.scoreA;
  elB.textContent = state.match.scoreB;

  // Bump animation
  const el = team === 'a' ? elA : elB;
  el.classList.remove('bump');
  void el.offsetWidth; // reflow
  el.classList.add('bump');
  setTimeout(() => el.classList.remove('bump'), 300);

  if (points > 0) playBeep();
  renderLog();
}

function resetScore() {
  if (!state.match) return;
  if (!confirm('Reset skor ke 0-0?')) return;
  state.match.scoreA = 0;
  state.match.scoreB = 0;
  state.match.log = [];
  saveState();
  renderScoreboard();
  showToast('🔄 Skor direset');
}

function endMatch() {
  state.match = null;
  saveState();
  showScreen('screen-sport');
}

function renderLog() {
  const logEl = document.getElementById('score-log');
  if (!state.match || state.match.log.length === 0) {
    logEl.innerHTML = '';
    return;
  }
  logEl.innerHTML = state.match.log.map(entry => `
    <div class="log-item">
      <span>
        <span class="log-team">${escHtml(entry.team)}</span>
        <span> → ${entry.scoreA} : ${entry.scoreB}</span>
      </span>
      <span class="log-score">${entry.points}</span>
    </div>
  `).join('');
}

// ============================================================
// AUDIO — Web Audio API beep
// ============================================================
function playBeep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.15);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {
    // Audio not supported — fail silently
  }
}

// ============================================================
// TOAST NOTIFICATION
// ============================================================
let toastTimeout;
function showToast(msg) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.classList.add('show');
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => toast.classList.remove('show'), 2500);
}

// ============================================================
// UTILITY
// ============================================================
function escHtml(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ============================================================
// INIT
// ============================================================
(function init() {
  loadState();

  // If there's a saved sport, go directly to sport screen
  if (state.sport) {
    selectSport(state.sport);
    // If there was an active match, restore scoreboard
    if (state.match) {
      renderScoreboard();
      showScreen('screen-scoreboard');
    }
  } else {
    showScreen('screen-home');
  }
})();
