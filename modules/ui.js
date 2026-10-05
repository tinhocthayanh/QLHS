/** Các helper UI dùng chung: toast, modal, animation. */

export function escapeHTML(str) {
  return String(str ?? '').replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

export function toast(message, type = 'info', ms = 2600) {
  const root = document.getElementById('toast-root');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  root.appendChild(el);
  setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 250); }, ms);
}

export function openModal(html, { onMount } = {}) {
  closeModal();
  const root = document.getElementById('modal-root');
  const back = document.createElement('div');
  back.className = 'modal-backdrop';
  back.innerHTML = `<div class="modal">${html}</div>`;
  back.addEventListener('click', e => { if (e.target === back) closeModal(); });
  root.appendChild(back);
  if (onMount) onMount(back.querySelector('.modal'));
  return back;
}
export function closeModal() {
  const root = document.getElementById('modal-root');
  root.innerHTML = '';
}

/** Hiệu ứng bắn sao tại toạ độ (x,y) */
export function starBurst(x, y, count = 8) {
  const root = document.getElementById('fx-root');
  const icons = ['⭐','✨','🌟','💫'];
  for (let i = 0; i < count; i++) {
    const el = document.createElement('div');
    el.className = 'fx-star';
    el.textContent = icons[i % icons.length];
    el.style.left = x + 'px';
    el.style.top = y + 'px';
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
    const dist = 60 + Math.random() * 80;
    el.style.setProperty('--dx', Math.cos(angle) * dist + 'px');
    el.style.setProperty('--dy', Math.sin(angle) * dist + 'px');
    el.style.setProperty('--rot', (Math.random() * 720 - 360) + 'deg');
    root.appendChild(el);
    setTimeout(() => el.remove(), 1000);
  }
}

export function scoreFly(x, y, text, color = 'var(--gold-2)') {
  const root = document.getElementById('fx-root');
  const el = document.createElement('div');
  el.className = 'fx-plus';
  el.textContent = text;
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  el.style.color = color;
  root.appendChild(el);
  setTimeout(() => el.remove(), 1000);
}

export function confetti(duration = 1600) {
  const root = document.getElementById('fx-root');
  const colors = ['#6c5ce7','#fdcb6e','#00b894','#ff7675','#74b9ff','#e84393'];
  const start = Date.now();
  const interval = setInterval(() => {
    if (Date.now() - start > duration) { clearInterval(interval); return; }
    for (let i = 0; i < 6; i++) {
      const el = document.createElement('div');
      el.className = 'fx-confetti';
      el.style.left = Math.random() * 100 + 'vw';
      el.style.background = colors[Math.floor(Math.random() * colors.length)];
      el.style.setProperty('--dur', (1.5 + Math.random() * 1.2) + 's');
      root.appendChild(el);
      setTimeout(() => el.remove(), 2800);
    }
  }, 90);
}

export function levelUpBanner(text) {
  const root = document.getElementById('fx-root');
  const el = document.createElement('div');
  el.className = 'levelup-banner';
  el.textContent = text;
  root.appendChild(el);
  requestAnimationFrame(() => el.classList.add('show'));
  setTimeout(() => el.remove(), 2000);
}

export function formatDateTime(iso) {
  const d = new Date(iso);
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const hh = String(d.getHours()).padStart(2,'0');
  const mi = String(d.getMinutes()).padStart(2,'0');
  return `${dd}/${mm} – ${hh}:${mi}`;
}