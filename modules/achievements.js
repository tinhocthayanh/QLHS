/**
 * AchievementService – đánh giá thành tích dựa trên dữ liệu hiện có.
 */
export const ACHIEVEMENT_DEFS = [
  { id: 'A001', name: 'Ngôi sao tích cực', icon: '⭐', description: 'Được cộng điểm 10 lần' },
  { id: 'A002', name: 'Chuỗi 5 ngày',      icon: '🔥', description: 'Hoạt động 5 ngày liên tiếp' },
  { id: 'A003', name: 'Tiến bộ vượt bậc',  icon: '📈', description: 'Đạt từ 40 điểm trở lên' },
  { id: 'A004', name: 'Nỗ lực đáng khen',  icon: '💪', description: 'Vượt qua một lần bị trừ điểm' },
  { id: 'A005', name: 'Điểm cao',          icon: '🏆', description: 'Đạt từ 100 điểm trở lên' },
  { id: 'A006', name: 'Ngôi sao vàng',     icon: '👑', description: 'Đạt từ 70 điểm trở lên' },
];

function dayKey(iso) { return iso.slice(0, 10); }

export class AchievementService {
  /** Trả về mảng achievement đạt được cho studentId */
  evaluate(studentId, historyService, scoreService) {
    const recs = historyService.getForStudent(studentId);
    const plusCount = recs.filter(r => r.type === 'plus').length;
    const score = scoreService.get(studentId);
    const days = new Set(recs.map(r => dayKey(r.timestamp)));
    const out = [];

    if (plusCount >= 10) out.push('A001');
    if (hasConsecutiveDays(days, 5)) out.push('A002');
    if (score >= 40) out.push('A003');
    if (recs.some(r => r.type === 'minus') && score > 0) out.push('A004');
    if (score >= 100) out.push('A005');
    if (score >= 70) out.push('A006');
    return out;
  }
  getDef(id) { return ACHIEVEMENT_DEFS.find(a => a.id === id); }
}

function hasConsecutiveDays(daySet, n) {
  const arr = [...daySet].map(d => new Date(d).getTime()).sort((a,b) => a-b);
  let streak = 1;
  for (let i = 1; i < arr.length; i++) {
    const diff = (arr[i] - arr[i-1]) / 86400000;
    if (Math.round(diff) === 1) { streak++; if (streak >= n) return true; }
    else streak = 1;
  }
  return arr.length >= n && streak >= n;
}