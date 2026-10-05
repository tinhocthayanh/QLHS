/**
 * ScoreService – quản lý điểm số của học sinh.
 * Mọi thay đổi đều tạo history record (thông qua HistoryService bên ngoài).
 */
export class ScoreService {
  constructor(initialScores = {}) { this.scores = { ...initialScores }; }
  get(studentId) { return this.scores[studentId] ?? 0; }
  setAll(map) { this.scores = { ...map }; }
  apply(studentId, delta) {
    const cur = this.get(studentId);
    const next = Math.max(0, cur + delta); // không cho âm (có thể cấu hình sau)
    this.scores[studentId] = next;
    return { before: cur, after: next };
  }
  totalAll() { return Object.values(this.scores).reduce((a,b) => a + (b || 0), 0); }
  asMap() { return { ...this.scores }; }
}