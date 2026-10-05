/**
 * RankingService – tính bảng xếp hạng theo nhiều tiêu chí.
 */
export class RankingService {
  constructor(studentService, scoreService, historyService) {
    this.students = studentService;
    this.scores = scoreService;
    this.history = historyService;
  }

  byScore(schoolId, classId) {
    return this._getClassStudents(schoolId, classId)
      .map(s => ({ student: s, value: this.scores.get(s.id) }))
      .sort((a,b) => b.value - a.value);
  }

  byProgress(schoolId, classId, days = 7) {
    const since = Date.now() - days * 86400000;
    return this._getClassStudents(schoolId, classId)
      .map(s => {
        const sum = this.history.getForStudent(s.id)
          .filter(r => new Date(r.timestamp).getTime() >= since)
          .reduce((a, r) => a + r.points, 0);
        return { student: s, value: sum };
      })
      .sort((a,b) => b.value - a.value);
  }

  byPositiveStreak(schoolId, classId) {
    return this._getClassStudents(schoolId, classId)
      .map(s => {
        const days = new Set(this.history.getForStudent(s.id)
          .filter(r => r.type === 'plus')
          .map(r => r.timestamp.slice(0,10)));
        return { student: s, value: days.size };
      })
      .sort((a,b) => b.value - a.value);
  }

  _getClassStudents(schoolId, classId) {
    return this.students.getStudentsOfClass(schoolId, classId);
  }
}