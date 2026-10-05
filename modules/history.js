/**
 * HistoryService – lưu trữ lịch sử điểm, hỗ trợ undo thao tác gần nhất.
 */
export class HistoryService {
  constructor(initial = []) { this.records = [...initial]; }

  add(record) {
    const r = {
      id: record.id || 'H' + Math.random().toString(36).slice(2, 9),
      studentId: record.studentId,
      type: record.type,           // 'plus' | 'minus' | 'redeem' | 'undo'
      points: record.points,
      reason: record.reason || '',
      rewardId: record.rewardId || null,
      timestamp: record.timestamp || new Date().toISOString(),
    };
    this.records.push(r);
    return r;
  }

  getForStudent(studentId) {
    return this.records.filter(r => r.studentId === studentId).sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getAll() { return [...this.records].sort((a,b) => new Date(b.timestamp) - new Date(a.timestamp)); }

  /** Trả về record gần nhất (chỉ plus/minus, bỏ redeem) để hoàn tác. */
  getLastActionFor(studentId) {
    const list = this.getForStudent(studentId).filter(r => r.type === 'plus' || r.type === 'minus');
    return list[0] || null;
  }

  removeById(id) {
    const i = this.records.findIndex(r => r.id === id);
    if (i >= 0) { this.records.splice(i, 1); return true; }
    return false;
  }

  filterForStudent(studentId, { type = 'all', fromDate = null } = {}) {
    return this.getForStudent(studentId).filter(r => {
      if (type === 'plus' && r.type !== 'plus') return false;
      if (type === 'minus' && r.type !== 'minus') return false;
      if (fromDate && new Date(r.timestamp) < new Date(fromDate)) return false;
      return true;
    });
  }

  asArray() { return [...this.records]; }
}