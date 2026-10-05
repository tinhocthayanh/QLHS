/**
 * Phân tích tên tiếng Việt để lấy tên riêng và chữ cái đầu của tên riêng.
 * Ví dụ: "Nguyễn Minh Anh" → givenName = "Anh", initial = "A"
 *         "Trần Văn Đạt"    → givenName = "Đạt", initial = "Đ"
 */

export const VIETNAMESE_INITIALS = [
  'A','Ă','Â','B','C','D','Đ','E','Ê','G','H','I','K','L','M','N',
  'O','Ô','Ơ','P','Q','R','S','T','U','Ư','V','X','Y'
];

export function parseVietnameseName(fullName) {
  const clean = String(fullName || '').trim().replace(/\s+/g, ' ');
  if (!clean) return { givenName: '', initial: '?', parts: [] };
  const parts = clean.split(' ');
  const givenName = parts[parts.length - 1];
  let initial = givenName.charAt(0).toUpperCase();
  // Đảm bảo có dấu đúng cho Đ/đ
  if (initial === 'đ' || initial === 'Đ') initial = 'Đ';
  return { givenName, initial, parts };
}

/** Sinh studentId ổn định từ schoolId + classId + tên + index (fallback) */
export function makeStudentId(schoolId, classId, name, index = 0) {
  const slug = String(name || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]/g, '').toLowerCase().slice(0, 12);
  return `${schoolId}-${classId}-${slug}-${index}`.toUpperCase();
}