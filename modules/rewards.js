/**
 * RewardService – quản lý danh mục quà và lịch sử đổi quà.
 */
export const DEFAULT_REWARDS = [
  { id: 'R001', name: 'Sticker',   requiredPoints: 3,  icon: '🎟️', enabled: true },
  { id: 'R002', name: 'Bút chì',   requiredPoints: 10, icon: '🖊️', enabled: true },
  { id: 'R003', name: 'Quà nhỏ',   requiredPoints: 30, icon: '🎁', enabled: true },
  { id: 'R004', name: 'Huy hiệu',  requiredPoints: 50, icon: '🏅', enabled: true },
];

export class RewardService {
  constructor(list = DEFAULT_REWARDS, redemptions = []) {
    this.rewards = [...list];
    this.redemptions = [...redemptions];
  }
  list() { return this.rewards.filter(r => r.enabled); }
  all() { return [...this.rewards]; }
  add(r) { this.rewards.push({ id: 'R' + Math.random().toString(36).slice(2,7), enabled: true, ...r }); }
  update(id, patch) { const r = this.rewards.find(x => x.id === id); if (r) Object.assign(r, patch); }
  remove(id) { this.rewards = this.rewards.filter(r => r.id !== id); }
  /** Thử đổi quà – trả về {ok, error?, remaining?} */
  canRedeem(studentId, rewardId, scoreService) {
    const r = this.rewards.find(x => x.id === rewardId);
    if (!r || !r.enabled) return { ok: false, error: 'Phần thưởng không còn khả dụng.' };
    const score = scoreService.get(studentId);
    if (score < r.requiredPoints) return { ok: false, error: 'Chưa đủ sao để đổi phần thưởng này.' };
    return { ok: true, remaining: score - r.requiredPoints };
  }
  recordRedemption(rec) { this.redemptions.push({ id: 'RD' + Math.random().toString(36).slice(2,9), ...rec }); }
  getRedemptionsOf(studentId) { return this.redemptions.filter(r => r.studentId === studentId); }
  asArray() { return { rewards: this.rewards, redemptions: this.redemptions }; }
}