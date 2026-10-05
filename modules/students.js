import { storage } from './storage.js';
import { generateDemoData, generateInitialAppData } from './demoData.js';
import { parseVietnameseName, makeStudentId, VIETNAMESE_INITIALS } from './nameParser.js';

/**
 * StudentService – nguồn STUDENT DATA (danh sách học sinh).
 * Có thể nạp từ Google Sheet hoặc demo.
 */
export class StudentService {
  constructor() { this.students = []; this.schools = []; this.classes = []; }

  async loadFromDemo() {
    const { schools, classes, students } = generateDemoData();
    this.schools = schools;
    this.classes = classes;
    this.students = students;
    return this;
  }

  /** Nạp danh sách thô (từ Google Sheet hoặc JSON import). */
  loadFromRaw(rows) {
    // rows: [{ "Họ và tên", "Lớp", "Trường"?, "schoolId"? }]
    const schools = new Map();
    const classes = new Map();
    const students = [];
    rows.forEach((r, i) => {
      const name = (r.name || r['Họ và tên'] || r['Ho va ten'] || '').trim();
      if (!name) return;
      const className = (r.className || r['Lớp'] || r['Lop'] || 'Khác').trim();
      const schoolName = (r.schoolName || r['Trường'] || r['Truong'] || 'Trường mặc định').trim();
      const schoolId = r.schoolId || 'S' + String(schoolName).replace(/[^A-Za-z0-9]/g,'').slice(0,4).toUpperCase();
      if (!schools.has(schoolId)) schools.set(schoolId, { id: schoolId, name: schoolName });
      const classKey = schoolId + '::' + className;
      if (!classes.has(classKey)) classes.set(classKey, { id: className, name: className, schoolId });
      const { givenName, initial } = parseVietnameseName(name);
      students.push({
        id: r.id || makeStudentId(schoolId, className, name, i),
        name, givenName, initial,
        schoolId, schoolName, classId: className, className,
      });
    });
    this.schools = [...schools.values()];
    this.classes = [...classes.values()];
    this.students = students;
    return this;
  }

  getSchools() { return this.schools; }
  getClassesOfSchool(schoolId) { return this.classes.filter(c => c.schoolId === schoolId); }
  getStudentsOfClass(schoolId, classId) {
    return this.students.filter(s => s.schoolId === schoolId && s.classId === classId);
  }
  getById(id) { return this.students.find(s => s.id === id); }
  getInitialsOfClass(schoolId, classId) {
    const set = new Set(this.getStudentsOfClass(schoolId, classId).map(s => s.initial));
    return VIETNAMESE_INITIALS.filter(l => set.has(l));
  }
  getStudentsByInitial(schoolId, classId, initial) {
    return this.getStudentsOfClass(schoolId, classId).filter(s => s.initial === initial);
  }
  countByInitial(schoolId, classId) {
    const m = {};
    this.getStudentsOfClass(schoolId, classId).forEach(s => { m[s.initial] = (m[s.initial] || 0) + 1; });
    return m;
  }
  searchByName(q) {
    const norm = q.trim().toLowerCase();
    if (!norm) return [];
    return this.students.filter(s => s.name.toLowerCase().includes(norm));
  }
}