/** Cấu hình mặc định của hệ thống. */
export const DEFAULT_SETTINGS = {
  animation: true,
  password: '1230',
  levels: [
    { level: 1, min: 0,   max: 9,        name: 'Mầm non',  icon: '🌱' },
    { level: 2, min: 10,  max: 19,       name: 'Khởi đầu', icon: '🌟' },
    { level: 3, min: 20,  max: 39,       name: 'Tiến bộ',  icon: '🥉' },
    { level: 4, min: 40,  max: 69,       name: 'Vững vàng',icon: '🥈' },
    { level: 5, min: 70,  max: 99,       name: 'Xuất sắc', icon: '🥇' },
    { level: 6, min: 100, max: 999999,   name: 'Ngôi sao', icon: '👑' },
  ],
  allowNegative: false,
  googleSheet: { url: '' }, // VD: 'https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=Students'
};

export function levelFromScore(score, levels) {
  return levels.find(l => score >= l.min && score <= l.max) || levels[levels.length - 1];
}

export class SettingsService {
  constructor(initial = DEFAULT_SETTINGS) {
    this.settings = {
      ...DEFAULT_SETTINGS,
      ...initial,
      password: String(initial?.password ?? DEFAULT_SETTINGS.password).trim() || DEFAULT_SETTINGS.password,
    };
  }
  get() { return this.settings; }
  update(patch) {
    this.settings = { ...this.settings, ...patch };
    if ('password' in patch) {
      this.settings.password = String(patch.password ?? '').trim() || DEFAULT_SETTINGS.password;
    }
    return this.settings;
  }
}