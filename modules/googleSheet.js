import { parseVietnameseName, makeStudentId } from './nameParser.js';

/**
 * GoogleSheetAdapter – nạp danh sách học sinh từ Google Sheet (CSV).
 * Yêu cầu Sheet được publish ở chế độ "Anyone with the link".
 *
 * URL mẫu:
 *   https://docs.google.com/spreadsheets/d/<ID>/gviz/tq?tqx=out:csv&sheet=Students
 */
export class GoogleSheetAdapter {
  constructor(url) { this.url = url; }

  async load() {
    if (!this.url) throw new Error('Chưa cấu hình Google Sheet URL.');
    const res = await fetch(this.url, { method: 'GET' });
    if (!res.ok) throw new Error(`Không tải được Google Sheet (HTTP ${res.status}).`);
    const text = await res.text();
    const rows = parseSheetResponse(text, res.headers.get('content-type') || '');
    if (!rows.length) throw new Error('Sheet không có dữ liệu.');

    const students = rows.map((row, i) => {
      const fields = normalizeFields(row);
      const name = getField(fields, 'hovaten', 'hoten', 'fullname', 'studentname', 'name')
        || [getField(fields, 'hovatendem', 'hotendem', 'middlename'), getField(fields, 'tenlot'), getField(fields, 'ten', 'givenname', 'firstname')]
          .filter(Boolean).join(' ');
      if (!name) return null;
      const className = getField(fields, 'lop', 'classname', 'class', 'classid') || 'Khác';
      const schoolName = getField(fields, 'truong', 'schoolname', 'school') || 'Trường mặc định';
      const schoolId = getField(fields, 'schoolid')
        || ('S' + schoolName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z0-9]/g, '').slice(0,4).toUpperCase());
      const { givenName, initial } = parseVietnameseName(name);
      return {
        id: getField(fields, 'id', 'studentid', 'maso') || makeStudentId(schoolId, className, name, i),
        name: name.trim().replace(/\s+/g, ' '), givenName, initial,
        schoolId, schoolName,
        classId: className, className,
      };
    }).filter(Boolean);
    if (!students.length) throw new Error('Không tìm thấy học sinh. Cần có cột tên, hoặc cột “Họ và tên đệm” và “Tên”.');
    return students;
  }
}

function parseSheetResponse(text, contentType) {
  const content = text.trim().replace(/^\uFEFF/, '');
  if (!content) return [];
  if (/json/i.test(contentType) || content.startsWith('[') || content.startsWith('{')) {
    let payload;
    try { payload = JSON.parse(content); }
    catch { throw new Error('Google Sheet trả về JSON không hợp lệ.'); }
    const records = Array.isArray(payload) ? payload : payload?.data || payload?.rows || payload?.values;
    if (!Array.isArray(records)) {
      throw new Error(payload?.error || payload?.message || 'Dữ liệu JSON không chứa danh sách học sinh.');
    }
    if (records.length && Array.isArray(records[0])) {
      const [header, ...values] = records;
      return values.map(row => Object.fromEntries(header.map((key, i) => [String(key ?? ''), row[i] ?? ''])));
    }
    return records;
  }
  return parseCSV(content);
}

function normalizeFields(row) {
  return Object.fromEntries(Object.entries(row || {}).map(([key, value]) => [
    key.replace(/[đĐ]/g, 'd').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''),
    String(value ?? '').trim(),
  ]));
}

function getField(fields, ...keys) {
  return keys.map(key => fields[key]).find(value => value) || '';
}

function parseCSV(text) {
  const matrix = [];
  let row = [], cell = '', quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i++; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(cell); cell = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      if (row.some(value => value.trim())) matrix.push(row);
      row = []; cell = '';
    } else {
      cell += char;
    }
  }
  row.push(cell);
  if (row.some(value => value.trim())) matrix.push(row);
  if (!matrix.length) return [];
  const [header, ...values] = matrix;
  return values.map(cells => Object.fromEntries(header.map((key, i) => [key.trim(), (cells[i] || '').trim()])));
}