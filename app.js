import { storage } from './modules/storage.js';
import { StudentService } from './modules/students.js';
import { ScoreService } from './modules/scoring.js';
import { HistoryService } from './modules/history.js';
import { RewardService } from './modules/rewards.js';
import { AchievementService, ACHIEVEMENT_DEFS } from './modules/achievements.js';
import { RankingService } from './modules/ranking.js';
import { SettingsService, levelFromScore } from './modules/settings.js';
import { GoogleSheetAdapter } from './modules/googleSheet.js';
import { avatarDataURL, AVATARS } from './modules/avatar.js';
import { PresentationMode } from './modules/presentation.js';
import {
  toast, openModal, closeModal, escapeHTML, starBurst, scoreFly,
  confetti, levelUpBanner, formatDateTime,
} from './modules/ui.js';
import { VIETNAMESE_INITIALS } from './modules/nameParser.js';
import { generateInitialAppData } from './modules/demoData.js';

/* ============================================================
   STATE
============================================================ */
const App = {
  students: new StudentService(),
  scores: new ScoreService(),
  history: new HistoryService(),
  rewards: new RewardService(),
  achievements: new AchievementService(),
  settings: new SettingsService(),
  ranking: null,
  avatars: {},             // studentId -> avatarId
  favorites: [],           // ["S001::4A1"]
  recents: [],             // ["S001::4A1"]
  recentStudents: [],      // studentId
  selectedSchool: null,
  selectedClass: null,
  selectedInitial: null,
  currentView: 'home',
  presentation: null,
};

function hasSameNameInClass(student) {
  const name = String(student.name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase();
  return App.students.students.some(other => other.id !== student.id
    && String(other.name || '').trim().replace(/\s+/g, ' ').toLocaleLowerCase() === name
    && other.schoolId === student.schoolId && other.classId === student.classId);
}
function studentContextLabel(student, includeSchool = true) {
  const school = includeSchool && student.schoolName ? ` • ${student.schoolName}` : '';
  const id = hasSameNameInClass(student) ? ` • Mã ${student.id}` : '';
  return `Lớp ${student.className}${school}${id}`;
}
function studentNameAndContext(student) {
  return `${escapeHTML(student.name)} <span class="count">${escapeHTML(studentContextLabel(student))}</span>`;
}

/* ============================================================
   BOOT
============================================================ */
async function boot() {
  await loadSettings();
  await loadStudentsData();
  await loadAppData();
  await reconcileStudentData();

  App.ranking = new RankingService(App.students, App.scores, App.history);
  App.presentation = new PresentationMode(App);

  // Nếu session còn hiệu lực thì vào luôn
  const session = await storage.get('session', null);
  if (session?.loggedIn) showApp();
  else showLogin();

  bindGlobalEvents();
}

async function loadSettings() {
  const s = await storage.get('settings', null);
  if (s) {
    App.settings = new SettingsService(s);
    if (s.password === 'classstar') {
      App.settings.update({ password: '1230' });
      await saveSettings();
    } else if (s.password != null && s.password !== App.settings.get().password) {
      await saveSettings();
    }
  }
}
async function loadStudentsData() {
  const cfg = App.settings.get();
  // Nếu có URL Google Sheet → thử nạp
  if (cfg.googleSheet?.url) {
    try {
      const adapter = new GoogleSheetAdapter(cfg.googleSheet.url);
      const rows = await adapter.load();
      if (rows.length) {
        App.students.loadFromRaw(rows);
        await storage.set('students_cache', {
          schools: App.students.schools, classes: App.students.classes, students: App.students.students,
        });
        return;
      }
    } catch (e) {
      toast('Không tải được Google Sheet: ' + (e instanceof Error ? e.message : String(e)), 'warn');
    }
  }
  // Fallback demo (nếu chưa có cache)
  const cached = await storage.get('students_cache', null);
  if (cached?.students?.length) {
    App.students.schools = cached.schools;
    App.students.classes = cached.classes;
    App.students.students = cached.students;
  } else {
    await App.students.loadFromDemo();
    await storage.set('students_cache', {
      schools: App.students.schools,
      classes: App.students.classes,
      students: App.students.students,
    });
  }
}
async function loadAppData() {
  const data = await storage.get('app_data', null);
  if (data) {
    App.scores.setAll(data.scores || {});
    App.history = new HistoryService(data.history || []);
    App.avatars = data.avatars || {};
    App.favorites = data.favorites || [];
    App.recents = data.recents || [];
    App.recentStudents = data.recentStudents || [];
    if (data.rewards) App.rewards = new RewardService(data.rewards, data.redemptions || []);
  } else {
    const init = generateInitialAppData(App.students.students);
    App.scores.setAll(init.scores);
    App.avatars = init.avatars;
    App.history = new HistoryService(init.history);
    await saveAppData();
  }
}
async function saveAppData() {
  const { rewards, redemptions } = App.rewards.asArray();
  await storage.set('app_data', {
    scores: App.scores.asMap(),
    history: App.history.asArray(),
    avatars: App.avatars,
    favorites: App.favorites,
    recents: App.recents,
    recentStudents: App.recentStudents,
    rewards, redemptions,
  });
}
async function reconcileStudentData() {
  const studentIds = new Set(App.students.students.map(student => student.id));
  const classKeys = new Set(App.students.classes.map(item => `${item.schoolId}::${item.id}`));
  App.scores.setAll(Object.fromEntries(App.students.students.map(student => [student.id, App.scores.get(student.id)])));
  App.avatars = Object.fromEntries(Object.entries(App.avatars).filter(([id]) => studentIds.has(id)));
  App.favorites = App.favorites.filter(key => classKeys.has(key));
  App.recents = App.recents.filter(key => classKeys.has(key));
  App.recentStudents = App.recentStudents.filter(id => studentIds.has(id));
  await saveAppData();
}
async function saveSettings() {
  await storage.set('settings', App.settings.get());
}

/* ============================================================
   AUTH
============================================================ */
function showLogin() {
  document.getElementById('login-view').classList.remove('hidden');
  document.getElementById('app-view').classList.add('hidden');
  setTimeout(() => document.getElementById('login-password')?.focus(), 80);
}
function showApp() {
  document.getElementById('login-view').classList.add('hidden');
  document.getElementById('app-view').classList.remove('hidden');
  switchView('home');
  renderAll();
}

/* ============================================================
   GLOBAL EVENTS
============================================================ */
function bindGlobalEvents() {
  // Login
  document.getElementById('login-toggle')?.addEventListener('click', () => {
    const input = document.getElementById('login-password');
    const visible = input.type === 'password';
    input.type = visible ? 'text' : 'password';
    document.getElementById('login-toggle').setAttribute('aria-pressed', String(visible));
    document.getElementById('login-toggle').setAttribute('aria-label', visible ? 'Ẩn mật khẩu' : 'Hiện mật khẩu');
  });
  document.getElementById('login-form').addEventListener('submit', async e => {
    e.preventDefault();
    const pw = document.getElementById('login-password').value.trim();
    const err = document.getElementById('login-error');
    if (pw === String(App.settings.get().password ?? '1230').trim()) {
      err.textContent = '';
      await storage.set('session', { loggedIn: true, at: Date.now() });
      showApp();
    } else {
      err.textContent = '❌ Mật khẩu không đúng.';
    }
  });

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    await storage.set('session', { loggedIn: false });
    showLogin();
  });

  // Nav buttons (sidebar + bottom)
  document.querySelectorAll('[data-view]').forEach(btn => {
    btn.addEventListener('click', () => {
      switchView(btn.dataset.view);
      document.getElementById('sidebar').classList.remove('open');
    });
  });

  // Mobile menu
  document.getElementById('btn-menu').addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('open');
  });

  // Presentation entry
  document.getElementById('btn-presentation').addEventListener('click', () => {
    if (!App.selectedSchool || !App.selectedClass) {
      toast('Hãy chọn trường và lớp trước.', 'warn');
      return;
    }
    const list = App.students.getStudentsOfClass(App.selectedSchool, App.selectedClass);
    if (!list.length) { toast('Lớp chưa có học sinh.', 'warn'); return; }
    App.presentation.open(list[0].id);
  });

  // Delegated click handler
  document.body.addEventListener('click', onDelegatedClick);
}

/* ============================================================
   VIEW SWITCH
============================================================ */
function switchView(view) {
  App.currentView = view;
  ['home','class','ranking','rewards','history','settings'].forEach(v => {
    document.getElementById('view-' + v).classList.toggle('hidden', v !== view);
  });
  document.querySelectorAll('.nav-item, .bn-item').forEach(el => {
    el.classList.toggle('active', el.dataset.view === view);
  });
  renderView(view);
}

/* ============================================================
   RENDER
============================================================ */
function renderAll() {
  renderTopbar();
  renderView(App.currentView);
}

function renderTopbar() {
  const ctx = document.getElementById('topbar-context');
  const stats = document.getElementById('topbar-stats');
  const s = App.selectedSchool ? App.students.getSchools().find(x => x.id === App.selectedSchool) : null;
  const c = App.selectedClass;
  ctx.innerHTML = `
    <span>${s ? '🏫 ' + escapeHTML(s.name) : '🏫 Chưa chọn trường'}</span>
    ${c ? `<span>📚 ${escapeHTML(c)}</span>` : ''}
  `;
  const all = App.scores.totalAll();
  const total = App.students.students.length;
  stats.innerHTML = `
    <span class="pill">👥 ${total} học sinh</span>
    <span class="pill gold">⭐ ${all} sao</span>
  `;
}

function renderView(view) {
  renderTopbar();
  const el = document.getElementById('view-' + view);
  if (!el) return;
  switch (view) {
    case 'home':     el.innerHTML = renderHome();     afterHome(); break;
    case 'class':    el.innerHTML = renderClass();    afterClass(); break;
    case 'ranking':  el.innerHTML = renderRanking();  afterRanking(); break;
    case 'rewards':  el.innerHTML = renderRewards();  afterRewards(); break;
    case 'history':  el.innerHTML = renderHistory();  afterHistory(); break;
    case 'settings': el.innerHTML = renderSettings(); afterSettings(); break;
  }
}

/* ============================================================
   VIEW: HOME
============================================================ */
function renderHome() {
  const schools = App.students.getSchools();
  const total = App.students.students.length;
  const totalScore = App.scores.totalAll();

  // Lớp yêu thích
  const favHTML = App.favorites.length
    ? `<div class="section-title">⭐ Lớp yêu thích</div><div class="chips" id="fav-chips">
        ${App.favorites.map(key => {
          const [sid, cid] = key.split('::');
          const school = schools.find(s => s.id === sid);
          return `<button class="chip" data-fav-class="${key}">📚 ${escapeHTML(cid)} <span class="count">${escapeHTML(school?.name?.slice(0,14) || sid)}</span></button>`;
        }).join('')}
      </div>` : '';

  const recentHTML = App.recentStudents.length
    ? `<div class="section-title">🕘 Gần đây</div><div class="chips">
        ${App.recentStudents.slice(0,6).map(id => {
          const s = App.students.getById(id);
          if (!s) return '';
          return `<button class="chip" data-open-student="${s.id}">${studentNameAndContext(s)}</button>`;
        }).join('')}
      </div>` : '';

  const schoolGroups = schools.map(sch => {
    const classes = App.students.getClassesOfSchool(sch.id);
    return `
      <div class="school-group">
        <div class="school-head">🏫 ${escapeHTML(sch.name)}</div>
        <div class="chips">
          ${classes.map(c => `
            <button class="chip" data-pick-class="${sch.id}::${c.id}">
              📚 ${escapeHTML(c.name)} <span class="count">${App.students.getStudentsOfClass(sch.id, c.id).length}</span>
            </button>`).join('')}
        </div>
      </div>`;
  }).join('');

  return `
    <h1 class="page-title">Xin chào 👋</h1>
    <p class="page-sub">Chọn nhanh lớp để bắt đầu cộng điểm thi đua cho học sinh.</p>

    <div class="stat-grid">
      <div class="stat-card"><div class="stat-icon">👥</div><div class="stat-value">${total}</div><div class="stat-label">Học sinh</div></div>
      <div class="stat-card"><div class="stat-icon">🏫</div><div class="stat-value">${schools.length}</div><div class="stat-label">Trường</div></div>
      <div class="stat-card"><div class="stat-icon">⭐</div><div class="stat-value">${totalScore}</div><div class="stat-label">Tổng sao</div></div>
      <div class="stat-card"><div class="stat-icon">📚</div><div class="stat-value">${App.students.classes.length}</div><div class="stat-label">Lớp</div></div>
    </div>

    ${favHTML}
    ${recentHTML}

    <div class="section-title">📚 Lớp của tôi</div>
    ${schoolGroups}
  `;
}

function afterHome() {
  document.querySelectorAll('[data-pick-class]').forEach(el => {
    el.addEventListener('click', () => {
      const [sid, cid] = el.dataset.pickClass.split('::');
      App.selectedSchool = sid;
      App.selectedClass = cid;
      App.selectedInitial = null;
      rememberClass(sid, cid);
      switchView('class');
    });
  });
  document.querySelectorAll('[data-fav-class]').forEach(el => {
    el.addEventListener('click', () => {
      const [sid, cid] = el.dataset.favClass.split('::');
      App.selectedSchool = sid;
      App.selectedClass = cid;
      App.selectedInitial = null;
      switchView('class');
    });
  });
  document.querySelectorAll('[data-open-student]').forEach(el => {
    el.addEventListener('click', () => openStudentSheet(el.dataset.openStudent));
  });
}

/* ============================================================
   VIEW: CLASS (Tìm học sinh)
============================================================ */
function renderClass() {
  const schools = App.students.getSchools();
  if (!App.selectedSchool) {
    return `
      <h1 class="page-title">🔎 Tìm học sinh</h1>
      <p class="page-sub">Chọn trường để bắt đầu.</p>
      <div class="filter-bar">
        <div class="filter-row"><span class="label">Trường</span>
          <div class="chips">
            ${schools.map(s => `<button class="chip" data-school="${s.id}">🏫 ${escapeHTML(s.name)}</button>`).join('')}
          </div>
        </div>
      </div>`;
  }

  const classes = App.students.getClassesOfSchool(App.selectedSchool);
  const school = schools.find(x => x.id === App.selectedSchool);
  const classHTML = classes.map(c =>
    `<button class="chip ${c.id === App.selectedClass ? 'active' : ''}" data-class="${c.id}">📚 ${escapeHTML(c.name)}</button>`
  ).join('');

  let alphaHTML = '';
  let studentsHTML = '';
  if (App.selectedClass) {
    const counts = App.students.countByInitial(App.selectedSchool, App.selectedClass);
    alphaHTML = VIETNAMESE_INITIALS.map(l => {
      const n = counts[l] || 0;
      const dis = n === 0 ? 'disabled' : '';
      const act = l === App.selectedInitial ? 'active' : '';
      return `<button class="alpha-btn ${act}" ${dis} data-alpha="${l}">${l}</button>`;
    }).join('');

    if (App.selectedInitial) {
      const list = App.students.getStudentsByInitial(App.selectedSchool, App.selectedClass, App.selectedInitial);
      const nameCounts = {};
      list.forEach(s => nameCounts[s.name] = (nameCounts[s.name] || 0) + 1);
      studentsHTML = `
        <div class="student-grid">
          ${list.map(s => renderStudentCard(s, nameCounts[s.name] > 1)).join('')}
        </div>`;
    } else {
      studentsHTML = `<div class="empty"><div class="empty-icon">🔤</div><p>Chọn chữ cái đầu của <b>tên riêng</b> để xem học sinh.</p></div>`;
    }
  }

  return `
    <h1 class="page-title">🔎 Tìm học sinh</h1>
    <p class="page-sub">Luồng: <b>Trường → Lớp → Chữ cái → Học sinh</b></p>

    <div class="filter-bar">
      <div class="filter-row"><span class="label">Trường</span>
        <div class="chips">
          ${schools.map(s => `<button class="chip ${s.id===App.selectedSchool?'active':''}" data-school="${s.id}">🏫 ${escapeHTML(s.name)}</button>`).join('')}
        </div>
      </div>
      ${App.selectedSchool ? `
        <div class="filter-row"><span class="label">Lớp</span>
          <div class="chips">${classHTML}</div>
        </div>` : ''}
      ${App.selectedClass ? `
        <div class="filter-row"><span class="label">Chữ cái</span>
          <div class="alpha-row">${alphaHTML}</div>
        </div>` : ''}
    </div>

    ${studentsHTML}
  `;
}

function afterClass() {
  document.querySelectorAll('[data-school]').forEach(el => el.addEventListener('click', () => {
    App.selectedSchool = el.dataset.school;
    App.selectedClass = null;
    App.selectedInitial = null;
    renderView('class');
  }));
  document.querySelectorAll('[data-class]').forEach(el => el.addEventListener('click', () => {
    App.selectedClass = el.dataset.class;
    App.selectedInitial = null;
    rememberClass(App.selectedSchool, App.selectedClass);
    renderView('class');
  }));
  document.querySelectorAll('[data-alpha]').forEach(el => el.addEventListener('click', () => {
    App.selectedInitial = el.dataset.alpha;
    renderView('class');
  }));
}

function renderStudentCard(s, isDup) {
  const score = App.scores.get(s.id);
  const level = levelFromScore(score, App.settings.get().levels);
  const avatarId = App.avatars[s.id] || 'avatar_01';
  return `
    <div class="student-card ${isDup ? 'dup-name' : ''}" data-student="${s.id}">
      <div class="avatar-wrap">
        <img class="avatar-img" src="${avatarDataURL(avatarId)}" alt="" data-avatar-student="${s.id}">
        <button class="avatar-edit" data-change-avatar="${s.id}" title="Đổi avatar">✏️</button>
      </div>
      <div class="student-name">${escapeHTML(s.name)}</div>
      <div class="student-sub">${escapeHTML(studentContextLabel(s, false))}</div>
      <div class="score-big" data-score-of="${s.id}">⭐ <span>${score}</span></div>
      <div class="level-tag">${level.icon} L${level.level} • ${escapeHTML(level.name)}</div>
      <div class="actions">
        <button data-plus="1" data-student="${s.id}">+1</button>
        <button data-plus="2" data-student="${s.id}">+2</button>
        <button data-plus="5" data-student="${s.id}">+5</button>
        <button class="minus" data-minus data-student="${s.id}">−</button>
      </div>
    </div>
  `;
}

/* ============================================================
   VIEW: RANKING
============================================================ */
let rankMode = 'score';
function renderRanking() {
  if (!App.selectedSchool || !App.selectedClass) {
    return `<h1 class="page-title">🏆 Xếp hạng</h1>
      <p class="page-sub">Hãy chọn lớp trước (ở mục Tìm học sinh).</p>`;
  }
  const modes = [
    { key: 'score',   label: '🏆 Điểm cao' },
    { key: 'progress',label: '📈 Tiến bộ (7 ngày)' },
    { key: 'streak',  label: '🔥 Chuỗi tích cực' },
  ];
  const data = rankMode === 'progress'
    ? App.ranking.byProgress(App.selectedSchool, App.selectedClass)
    : rankMode === 'streak'
      ? App.ranking.byPositiveStreak(App.selectedSchool, App.selectedClass)
      : App.ranking.byScore(App.selectedSchool, App.selectedClass);

  return `
    <h1 class="page-title">🏆 Xếp hạng lớp ${escapeHTML(App.selectedClass)}</h1>
    <p class="page-sub">Nhiều tiêu chí – không chỉ Top 3.</p>
    <div class="rank-tabs">
      ${modes.map(m => `<button class="chip ${rankMode===m.key?'active':''}" data-rank-mode="${m.key}">${m.label}</button>`).join('')}
    </div>
    <div class="rank-list">
      ${data.map((row, i) => {
        const s = row.student;
        const avatarId = App.avatars[s.id] || 'avatar_01';
        const score = App.scores.get(s.id);
        const level = levelFromScore(score, App.settings.get().levels);
        const cls = i === 0 ? 'top1' : i === 1 ? 'top2' : i === 2 ? 'top3' : '';
        return `
          <div class="rank-row ${cls}" data-open-student="${s.id}">
            <div class="rank-pos">${i+1}</div>
            <img class="rank-avatar" src="${avatarDataURL(avatarId)}" alt="">
            <div class="rank-info">
              <div class="rank-name">${escapeHTML(s.name)}</div>
              <div class="rank-sub">${escapeHTML(studentContextLabel(s, false))} • ${level.icon} L${level.level} • ${escapeHTML(level.name)}</div>
            </div>
            <div class="rank-score">${row.value}${rankMode==='score'?' ⭐':''}</div>
          </div>`;
      }).join('')}
    </div>
  `;
}
function afterRanking() {
  document.querySelectorAll('[data-rank-mode]').forEach(el => el.addEventListener('click', () => {
    rankMode = el.dataset.rankMode;
    renderView('ranking');
  }));
  document.querySelectorAll('[data-open-student]').forEach(el => el.addEventListener('click', () => {
    openStudentSheet(el.dataset.openStudent);
  }));
}

/* ============================================================
   VIEW: REWARDS
============================================================ */
function renderRewards() {
  const school = App.selectedSchool, cls = App.selectedClass;
  let studentsHTML = '';
  if (school && cls) {
    const list = App.students.getStudentsOfClass(school, cls);
    studentsHTML = `
      <div class="section-title">🎁 Chọn học sinh để đổi quà</div>
      <div class="chips">
        ${list.map(s => `<button class="chip" data-redeem-student="${s.id}">${studentNameAndContext(s)} <span class="count">⭐${App.scores.get(s.id)}</span></button>`).join('')}
      </div>
    `;
  }
  const rewardsHTML = `
    <div class="section-title">🛍️ Danh mục quà</div>
    <div class="reward-grid">
      ${App.rewards.list().map(r => `
        <div class="reward-card ${r.enabled?'':'locked'}">
          <div class="reward-icon">${r.icon}</div>
          <div class="reward-name">${escapeHTML(r.name)}</div>
          <div class="reward-cost">${r.requiredPoints} ⭐</div>
          <div class="reward-status unlocked">🔓 Đang mở</div>
        </div>`).join('')}
      ${App.rewards.list().length ? '' : '<div class="empty"><span class="empty-icon">🎁</span><p>Hiện chưa có phần quà đang mở.</p></div>'}
    </div>`;
  return `
    <h1 class="page-title">🎁 Đổi quà</h1>
    <p class="page-sub">Học sinh dùng sao để đổi phần thưởng.</p>
    ${studentsHTML}
    ${rewardsHTML}
  `;
}
function afterRewards() {
  document.querySelectorAll('[data-redeem-student]').forEach(el => el.addEventListener('click', () => {
    openRedeemModal(el.dataset.redeemStudent);
  }));
}

/* ============================================================
   VIEW: HISTORY
============================================================ */
function renderHistory() {
  const recs = App.history.getAll().slice(0, 200);
  return `
    <h1 class="page-title">📜 Lịch sử gần đây</h1>
    <p class="page-sub">200 bản ghi mới nhất trên toàn hệ thống.</p>
    <div class="list-card">
      ${recs.length ? recs.map(r => {
        const s = App.students.getById(r.studentId);
        const name = s ? s.name : r.studentId;
        const isPlus = r.type === 'plus';
        return `
          <div class="history-row">
            <div class="hr-icon ${isPlus ? 'plus':'minus'}">${r.type==='redeem'?'🎁':isPlus?'⭐':'🔻'}</div>
            <div class="hr-body">
              <div class="hr-title">${escapeHTML(name)}</div>
              <div class="hr-sub">${formatDateTime(r.timestamp)} • ${escapeHTML(r.reason || (r.type==='redeem'?'Đổi quà':(isPlus?'Cộng điểm':'Trừ điểm')))}</div>
            </div>
            <div class="hr-points" style="color:${isPlus?'var(--green)':'var(--red)'}">${r.points>0?'+':''}${r.points}</div>
          </div>`;
      }).join('') : '<div class="empty"><span class="empty-icon">📜</span><p>Chưa có bản ghi nào.</p></div>'}
    </div>
  `;
}
function afterHistory() {}

/* ============================================================
   VIEW: SETTINGS
============================================================ */
function renderRewardsEditor() {
  const rewards = App.rewards.all();
  if (!rewards.length) return '<div class="empty"><span class="empty-icon">🎁</span><p>Chưa có phần quà. Hãy thêm quà mới.</p></div>';
  return rewards.map(reward => `
    <div class="reward-setting-row" data-reward-row="${escapeHTML(reward.id)}">
      <label class="reward-setting-field"><span>Biểu tượng</span>
        <input type="text" maxlength="8" data-reward-icon="${escapeHTML(reward.id)}" value="${escapeHTML(reward.icon)}" aria-label="Biểu tượng phần quà">
      </label>
      <label class="reward-setting-field"><span>Tên phần quà</span>
        <input type="text" maxlength="60" data-reward-name="${escapeHTML(reward.id)}" value="${escapeHTML(reward.name)}" aria-label="Tên phần quà">
      </label>
      <label class="reward-setting-field"><span>Số sao cần đổi</span>
        <input type="number" min="1" step="1" data-reward-points="${escapeHTML(reward.id)}" value="${Number(reward.requiredPoints)}" aria-label="Số sao cần đổi">
      </label>
      <label class="reward-setting-enabled"><input type="checkbox" data-reward-enabled="${escapeHTML(reward.id)}" ${reward.enabled ? 'checked' : ''}> Đang mở</label>
      <button type="button" class="btn btn-danger" data-remove-reward="${escapeHTML(reward.id)}" aria-label="Xóa ${escapeHTML(reward.name)}">Xóa</button>
    </div>
  `).join('');
}

function renderSettings() {
  const s = App.settings.get();
  return `
    <h1 class="page-title">⚙️ Cài đặt</h1>
    <p class="page-sub">Quản lý mật khẩu, animation, level, quà, dữ liệu.</p>

    <div class="settings-section">
      <h3>🔐 Bảo mật</h3>
      <div class="field"><label>Mật khẩu đăng nhập</label><input type="text" id="set-password" value="${escapeHTML(s.password)}"></div>
    </div>

    <div class="settings-section">
      <h3>✨ Giao diện</h3>
      <div class="switch">
        <span>Bật animation (star burst, confetti, level up)</span>
        <input type="checkbox" id="set-animation" ${s.animation?'checked':''}>
      </div>
    </div>

    <div class="settings-section">
      <h3>🎮 Bảng Level</h3>
      <div id="levels-editor"></div>
      <button class="btn btn-ghost" id="add-level">+ Thêm level</button>
    </div>

    <div class="settings-section">
      <h3>🎁 Phần thưởng</h3>
      <p class="page-sub">Chỉnh tên, biểu tượng, số sao và trạng thái; các thay đổi được lưu tự động.</p>
      <div id="rewards-editor">${renderRewardsEditor()}</div>
      <button class="btn btn-ghost" id="add-reward">+ Thêm phần thưởng</button>
    </div>

    <div class="settings-section">
      <h3>🌐 Google Sheet</h3>
      <div class="field">
        <label>URL CSV (gviz/tq?tqx=out:csv)</label>
        <input type="text" id="set-sheet" value="${escapeHTML(s.googleSheet?.url||'')}" placeholder="https://docs.google.com/spreadsheets/d/...">
      </div>
      <button class="btn btn-ghost" id="btn-reload-sheet">🔄 Nạp lại từ Sheet</button>
    </div>

    <div class="settings-section">
      <h3>💾 Dữ liệu</h3>
      <div class="field-row">
        <button class="btn btn-primary" id="btn-export">💾 Xuất JSON</button>
        <button class="btn btn-ghost" id="btn-import">📥 Nhập JSON</button>
      </div>
      <input type="file" id="file-import" accept="application/json" hidden>
      <button class="btn btn-danger" id="btn-reset" style="margin-top:10px">🗑️ Xoá toàn bộ dữ liệu</button>
    </div>

    <div class="settings-section">
      <h3>ℹ️ Thông tin</h3>
      <p style="color:var(--muted);font-size:13px;line-height:1.6;margin:0">
        Class Star v1.0 — Dữ liệu lưu cục bộ trên trình duyệt hiện tại.<br>
        Để đồng bộ nhiều thiết bị, hãy cấu hình Google Sheet hoặc backend sau này.
      </p>
    </div>
  `;
}

function afterSettings() {
  bindRewardSettings();
  // Password
  document.getElementById('set-password').addEventListener('change', async e => {
    App.settings.update({ password: e.target.value || '1230' });
    await saveSettings();
    toast('Đã lưu mật khẩu.', 'success');
  });
  // Animation
  document.getElementById('set-animation').addEventListener('change', async e => {
    App.settings.update({ animation: e.target.checked });
    await saveSettings();
  });
  // Sheet URL
  document.getElementById('set-sheet').addEventListener('change', async e => {
    App.settings.update({ googleSheet: { url: e.target.value.trim() } });
    await saveSettings();
  });
  document.getElementById('btn-reload-sheet').addEventListener('click', async () => {
    const url = App.settings.get().googleSheet?.url;
    if (!url) { toast('Chưa có URL Sheet.', 'warn'); return; }
    try {
      const adapter = new GoogleSheetAdapter(url);
      const rows = await adapter.load();
      App.students.loadFromRaw(rows);
      await storage.set('students_cache', {
        schools: App.students.schools, classes: App.students.classes, students: App.students.students,
      });
      toast('Đã nạp ' + rows.length + ' học sinh.', 'success');
      renderView('settings');
    } catch (e) {
      toast('Lỗi nạp Sheet: ' + e.message, 'error');
    }
  });
  // Export
  document.getElementById('btn-export').addEventListener('click', exportJSON);
  // Import
  document.getElementById('btn-import').addEventListener('click', () => document.getElementById('file-import').click());
  document.getElementById('file-import').addEventListener('change', importJSON);
  // Reset
  document.getElementById('btn-reset').addEventListener('click', async () => {
    openModal(`
      <h3>🗑️ Xoá toàn bộ dữ liệu?</h3>
      <p class="modal-sub">Toàn bộ điểm, lịch sử, avatar, quà sẽ bị xoá. Không thể hoàn tác.</p>
      <div class="modal-actions">
        <button class="btn btn-ghost" data-close-modal>Huỷ</button>
        <button class="btn btn-danger" id="confirm-reset">Xác nhận xoá</button>
      </div>
    `);

    document.getElementById('confirm-reset')?.addEventListener('click', async () => {
      closeModal();

      // Reset to a clean default state while keeping the app usable.
      App.students = new StudentService();
      App.scores = new ScoreService();
      App.history = new HistoryService();
      App.rewards = new RewardService();
      App.avatars = {};
      App.favorites = [];
      App.recents = [];
      App.recentStudents = [];
      App.selectedSchool = null;
      App.selectedClass = null;
      App.selectedInitial = null;

      await App.students.loadFromDemo();
      const init = generateInitialAppData(App.students.students);
      App.scores.setAll(init.scores);
      App.avatars = init.avatars;
      App.history = new HistoryService(init.history);
      await saveAppData();
      await saveSettings();
      renderAll();
      toast('Đã xoá toàn bộ dữ liệu.', 'success');
    });
  });
}

function bindRewardSettings() {
  document.getElementById('add-reward')?.addEventListener('click', async () => {
    const id = 'R' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase();
    App.rewards.add({ id, name: 'Phần quà mới', requiredPoints: 10, icon: '🎁', enabled: true });
    await saveAppData();
    renderView('settings');
    const input = document.querySelector(`[data-reward-name="${id}"]`);
    input?.focus();
    input?.select();
    toast('Đã thêm phần quà. Hãy nhập tên và số sao cần đổi.', 'success');
  });
  document.querySelectorAll('[data-reward-row]').forEach(row => {
    const id = row.dataset.rewardRow;
    row.querySelectorAll('[data-reward-icon],[data-reward-name],[data-reward-points]').forEach(input => {
      input.addEventListener('change', async () => {
        const reward = App.rewards.all().find(item => item.id === id);
        if (!reward) return;
        const patch = {};
        if (input.matches('[data-reward-icon]')) patch.icon = input.value.trim() || '🎁';
        if (input.matches('[data-reward-name]')) patch.name = input.value.trim() || 'Phần quà mới';
        if (input.matches('[data-reward-points]')) {
          const points = Number(input.value);
          if (!Number.isSafeInteger(points) || points < 1) {
            input.value = String(reward.requiredPoints);
            toast('Số sao đổi quà phải là số nguyên lớn hơn 0.', 'error');
            return;
          }
          patch.requiredPoints = points;
        }
        App.rewards.update(id, patch);
        await saveAppData();
        renderView('settings');
        toast('Đã lưu cấu hình phần quà.', 'success');
      });
    });
    row.querySelector('[data-reward-enabled]')?.addEventListener('change', async event => {
      const reward = App.rewards.all().find(item => item.id === id);
      if (!reward) return;
      App.rewards.update(id, { enabled: event.target.checked });
      await saveAppData();
      renderView('settings');
      toast(event.target.checked ? 'Đã mở phần quà.' : 'Đã ẩn phần quà.', 'success');
    });
    row.querySelector('[data-remove-reward]')?.addEventListener('click', () => {
      const reward = App.rewards.all().find(item => item.id === id);
      if (!reward) return;
      openModal(`
        <h3>🗑️ Xóa phần quà?</h3>
        <p class="modal-sub">Bạn có chắc muốn xóa “${escapeHTML(reward.name)}” khỏi danh mục không?</p>
        <div style="display:flex;justify-content:flex-end;gap:10px;margin-top:18px">
          <button class="btn btn-ghost" id="cancel-remove-reward">Hủy</button>
          <button class="btn btn-danger" id="confirm-remove-reward">Xóa phần quà</button>
        </div>
      `, modal => {
        modal.querySelector('#cancel-remove-reward').addEventListener('click', closeModal);
        modal.querySelector('#confirm-remove-reward').addEventListener('click', async () => {
          App.rewards.remove(id);
          await saveAppData();
          closeModal();
          renderView('settings');
          toast('Đã xóa phần quà.', 'success');
        });
      });
    });
  });
}