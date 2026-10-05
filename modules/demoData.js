import { parseVietnameseName, makeStudentId } from './nameParser.js';

const SURNAMES = ['Nguyễn','Trần','Lê','Phạm','Hoàng','Vũ','Đặng','Bùi','Ngô','Đỗ','Hồ','Dương','Lý'];
const MIDDLES  = ['Minh','Gia','Ngọc','Văn','Thị','Khánh','Tuấn','Thu','Hoàng','Bảo','Thanh','Quốc','Anh'];
const GIVEN_BY_INITIAL = {
  A: ['An','Anh','Ánh'],
  B: ['Bảo','Bình','Bích'],
  C: ['Chi','Châu','Cường'],
  D: ['Dũng','Duy','Diệp'],
  Đ: ['Đạt','Đông','Đức'],
  H: ['Hà','Hân','Hùng','Hoa'],
  K: ['Kiệt','Khánh','Kim'],
  L: ['Lan','Linh','Long'],
  M: ['Minh','My','Mạnh'],
  N: ['Nam','Nhi','Ngân'],
  P: ['Phong','Phương','Phúc'],
  Q: ['Quân','Quỳnh','Quang'],
  S: ['Sơn','Sang'],
  T: ['Tâm','Trang','Tuấn','Thảo'],
  U: ['Uyên'],
  V: ['Vy','Vinh'],
  X: ['Xuân'],
  Y: ['Yến'],
};

// Sinh tên theo chữ cái đầu mong muốn
function nameWithInitial(letter, seed) {
  const arr = GIVEN_BY_INITIAL[letter];
  if (!arr) return null;
  const given = arr[seed % arr.length];
  const sur = SURNAMES[seed % SURNAMES.length];
  const mid = MIDDLES[(seed * 3) % MIDDLES.length];
  return `${sur} ${mid} ${given}`;
}

// Bộ chữ cái mỗi lớp (một vài lớp cố tình thiếu chữ để test disabled)
const CLASS_INITIALS = {
  '4A1': ['A','B','C','Đ','H','K','L','M','N','P','Q','T','V'],
  '4A2': ['A','B','D','H','L','M','T','V'],
  '5A1': ['A','C','Đ','H','K','M','N','T','U','Y'],
  '3A1': ['A','B','Đ','H','L','M','Q','T'],
  '4B1': ['A','C','D','H','K','L','N','P','T','V'],
  '5B2': ['B','Đ','H','M','N','Q','T','X'],
};

export function generateDemoData() {
  const schools = [
    { id: 'S001', name: 'Trường Tiểu học Hoa Sen' },
    { id: 'S002', name: 'Trường Tiểu học Ánh Dương' },
  ];
  const classes = [
    { id: '4A1', name: '4A1', schoolId: 'S001' },
    { id: '4A2', name: '4A2', schoolId: 'S001' },
    { id: '5A1', name: '5A1', schoolId: 'S001' },
    { id: '3A1', name: '3A1', schoolId: 'S002' },
    { id: '4B1', name: '4B1', schoolId: 'S002' },
    { id: '5B2', name: '5B2', schoolId: 'S002' },
  ];
  const students = [];
  let counter = 0;
  for (const cls of classes) {
    const school = schools.find(s => s.id === cls.schoolId);
    const initials = CLASS_INITIALS[cls.id] || ['A','B','C','H','M'];
    // mỗi lớp 12-16 HS
    const targetCount = 12 + (cls.id.charCodeAt(0) % 5);
    let localIdx = 0;
    let letterIdx = 0;
    while (localIdx < targetCount) {
      const letter = initials[letterIdx % initials.length];
      const name = nameWithInitial(letter, counter);
      if (!name) { counter++; letterIdx++; continue; }
      const { givenName, initial } = parseVietnameseName(name);
      const student = {
        id: makeStudentId(cls.schoolId, cls.id, name, localIdx),
        name,
        schoolId: cls.schoolId,
        schoolName: school.name,
        classId: cls.id,
        className: cls.name,
        givenName,
        initial,
      };
      students.push(student);
      counter++; localIdx++;
      if (localIdx % initials.length === 0) letterIdx = 0; else letterIdx++;
    }
  }
  return { schools, classes, students };
}

/** Điểm + lịch sử + avatar demo ban đầu để có sẵn dữ liệu test */
export function generateInitialAppData(students) {
  const scores = {};
  const avatars = {};
  const history = [];
  const now = Date.now();
  students.forEach((s, i) => {
    const baseScore = ((i * 7) % 80) + Math.floor(Math.random() * 15);
    scores[s.id] = baseScore;
    avatars[s.id] = `avatar_${String((i % 24) + 1).padStart(2,'0')}`;
    // 1-3 bản ghi lịch sử mẫu
    const recs = 1 + (i % 3);
    for (let k = 0; k < recs; k++) {
      const isPlus = (i + k) % 3 !== 0;
      history.push({
        id: `H${i}_${k}`,
        studentId: s.id,
        type: isPlus ? 'plus' : 'minus',
        points: isPlus ? (1 + (k % 3)) : -1,
        reason: isPlus ? '' : 'Nói chuyện',
        timestamp: new Date(now - (i * 3600_000 + k * 90_000)).toISOString(),
      });
    }
  });
  return { scores, avatars, history };
}