import { avatarDataURL } from './avatar.js';
import { escapeHTML, starBurst, confetti, levelUpBanner, scoreFly } from './ui.js';
import { levelFromScore } from './settings.js';
import { ACHIEVEMENT_DEFS } from './achievements.js';

/**
 * PresentationMode – chế độ trình chiếu cho màn hình lớn.
 */
export class PresentationMode {
  constructor(app) {
    this.app = app;
    this.el = document.getElementById('presentation-view');
    this.currentStudentId = null;
  }

  isOpen() { return !this.el.classList.contains('hidden'); }

  open(studentId) {
    this.currentStudentId = studentId;
    this.el.classList.remove('hidden');
    this.render();
  }

  close() {
    this.el.classList.add('hidden');
    this.currentStudentId = null;
  }

  refresh() {
    if (this.isOpen()) this.render();
  }

  render() {
    if (!this.currentStudentId) { this.el.innerHTML = ''; return; }
    const s = this.app.students.getById(this.currentStudentId);
    if (!s) { this.close(); return; }
    const score = this.app.scores.get(s.id);
    const avatarId = this.app.avatars[s.id] || 'avatar_01';
    const level = levelFromScore(score, this.app.settings.get().levels);
    const achs = this.app.achievements.evaluate(s.id, this.app.history, this.app.scores);

    this.el.innerHTML = `
      <button class="pres-close" title="Đóng">✕</button>
      <img class="pres-avatar" src="${avatarDataURL(avatarId)}" alt="">
      <h1 class="pres-name">${escapeHTML(s.name)}</h1>
      <div class="pres-class">${escapeHTML(s.className)} • ${escapeHTML(s.schoolName)}</div>
      <div class="pres-score">⭐ ${score}</div>
      <div class="pres-level">${level.icon} LEVEL ${level.level} – ${escapeHTML(level.name)}</div>
      <div class="pres-achievements">
        ${achs.map(id => {
          const a = ACHIEVEMENT_DEFS.find(x => x.id === id);
          return a ? `<span class="pres-ach">${a.icon} ${escapeHTML(a.name)}</span>` : '';
        }).join('')}
      </div>
    `;
    this.el.querySelector('.pres-close').addEventListener('click', () => this.close());
  }

  celebratePlus(delta) {
    if (!this.app.settings.get().animation) return;
    confetti(1400);
    levelUpBanner(`+${delta} ⭐`);
  }

  celebrateLevelUp(level) {
    if (!this.app.settings.get().animation) return;
    levelUpBanner(`👑 LEVEL ${level.level} – ${level.name}`);
    confetti(2000);
  }
}