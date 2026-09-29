const STORAGE_KEY = "studentPointManager_v1";
const API_KEY = "studentPointManager_api";
const REWARD_KEY = "studentPointManager_rewards";

const GOOGLE_SHEET_API_URL = "";
const RANKING_RULES = [
  { min: 10, label: "🌟 Xuất sắc" },
  { min: 5, label: "😊 Tốt" },
  { min: 0, label: "🙂 Đạt" },
  { min: -Infinity, label: "⚠️ Cần cố gắng" }
];

const DEFAULT_REWARDS = [
  { id: 1, name: "Sticker", icon: "🎨", cost: 3 },
  { id: 2, name: "Cây bút", icon: "🖊️", cost: 10 }
];

const REASONS = [
  "Nói chuyện trong giờ",
  "Mất trật tự",
  "Không làm bài",
  "Quên đồ dùng học tập",
  "Không hoàn thành nhiệm vụ",
  "Không tuân thủ nội quy",
  "Làm ảnh hưởng đến bạn",
  "Đi học muộn",
  "Lý do khác"
];

const AVATARS = ["🧑‍🎓","👩‍🎓","👨‍🎓","🧒","👧","👦"];
let students = loadState();
let rewards = loadRewards();
let filters = { school: "", className: "", letter: "" };
let minusState = { studentId: null, points: 0, reason: "" };
let rewardState = { studentId: null, rewardId: null, quantity: 1 };

const $ = (id) => document.getElementById(id);

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || []; } catch { return []; }
}
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(students));
}
function loadRewards() {
  try {
    const saved = JSON.parse(localStorage.getItem(REWARD_KEY));
    return Array.isArray(saved) && saved.length ? saved : structuredClone(DEFAULT_REWARDS);
  } catch { return structuredClone(DEFAULT_REWARDS); }
}
function saveRewards() { localStorage.setItem(REWARD_KEY, JSON.stringify(rewards)); }

function cleanText(v) { return String(v ?? "").trim(); }
function normalizeName(v) {
  return cleanText(v).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function firstLetter(student) {
  const value = cleanText(student.firstName || student.name.split(" ").pop());
  return normalizeName(value).charAt(0).toUpperCase() || "#";
}
function studentKey(s) {
  return [s.school, s.className, s.middleName, s.firstName].map(cleanText).join("|").toLowerCase();
}
function nowParts() {
  const d = new Date();
  return {
    date: d.toISOString().slice(0,10),
    time: d.toLocaleTimeString("vi-VN", {hour:"2-digit", minute:"2-digit", second:"2-digit"})
  };
}
function computed(s) {
  const total = Number(s.plus || 0) - Number(s.minus || 0);
  const used = Number(s.rewardPointsUsed || 0);
  const available = Math.max(0, Number(s.plus || 0) - used);
  return { total, used, available, classification: classify(total) };
}
function classify(score) {
  return RANKING_RULES.find(r => score >= r.min)?.label || "⚠️ Cần cố gắng";
}
function recalculateRanks() {
  const grouped = {};
  students.forEach(s => {
    const key = `${s.school}|${s.className}`;
    (grouped[key] ||= []).push(s);
  });
  Object.values(grouped).forEach(group => {
    group.sort((a,b) => computed(b).total - computed(a).total || normalizeName(a.name).localeCompare(normalizeName(b.name), "vi"));
    let previous = null, rank = 0;
    group.forEach((s, i) => {
      const score = computed(s).total;
      if (score !== previous) rank = i + 1;
      s.rank = rank;
      previous = score;
    });
  });
}
function normalizeStudent(raw) {
  const middle = cleanText(raw["Họ và tên đệm"] ?? raw.middleName ?? raw.hoVaTenDem);
  const first = cleanText(raw["Tên"] ?? raw.firstName ?? raw.ten);
  const name = cleanText(raw.name) || [middle, first].filter(Boolean).join(" ");
  return {
    id: raw.id || crypto.randomUUID(),
    STT: raw.STT ?? raw.stt ?? "",
    school: cleanText(raw["Trường"] ?? raw.school ?? raw.truong),
    className: cleanText(raw["Lớp"] ?? raw.className ?? raw.lop),
    middleName: middle,
    firstName: first,
    name,
    plus: Number(raw.plus ?? raw["Điểm cộng"] ?? 0) || 0,
    minus: Number(raw.minus ?? raw["Điểm trừ"] ?? 0) || 0,
    rewardPointsUsed: Number(raw.rewardPointsUsed ?? raw["Điểm đã dùng đổi quà"] ?? 0) || 0,
    minusHistory: Array.isArray(raw.minusHistory) ? raw.minusHistory : (Array.isArray(raw["Lịch sử điểm trừ"]) ? raw["Lịch sử điểm trừ"] : []),
    rewardHistory: Array.isArray(raw.rewardHistory) ? raw.rewardHistory : (Array.isArray(raw["Lịch sử đổi quà"]) ? raw["Lịch sử đổi quà"] : []),
    rank: Number(raw.rank ?? raw["Hạng"] ?? 0) || 0
  };
}

function mergeRoster(rows) {
  const existing = new Map(students.map(s => [studentKey(s), s]));
  const incoming = rows.map(normalizeStudent);
  let added = 0;
  incoming.forEach(item => {
    const key = studentKey(item);
    const old = existing.get(key);
    if (old) {
      old.STT = item.STT;
      old.school = item.school;
      old.className = item.className;
      old.middleName = item.middleName;
      old.firstName = item.firstName;
      old.name = item.name;
    } else {
      item.id = crypto.randomUUID();
      students.push(item);
      added++;
    }
  });
  recalculateRanks();
  saveState();
  return { total: incoming.length, added };
}

function filteredStudents() {
  return students.filter(s => {
    if (filters.school && s.school !== filters.school) return false;
    if (filters.className && s.className !== filters.className) return false;
    if (filters.letter && firstLetter(s) !== filters.letter) return false;
    return true;
  });
}

function renderFilters() {
  const schools = [...new Set(students.map(s => s.school).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi"));
  if (filters.school && !schools.includes(filters.school)) filters.school = "";
  $("schoolFilter").innerHTML = schools.length ? schools.map(v => `<button class="chip ${filters.school===v?'active':''}" data-school="${escapeAttr(v)}">${escapeHtml(v)}</button>`).join("") : `<span class="hint">Chưa có trường</span>`;

  const classes = [...new Set(students.filter(s=>!filters.school || s.school===filters.school).map(s=>s.className).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"vi"));
  if (filters.className && !classes.includes(filters.className)) filters.className = "";
  $("classFilter").innerHTML = classes.length ? classes.map(v => `<button class="chip ${filters.className===v?'active':''}" data-class="${escapeAttr(v)}">${escapeHtml(v)}</button>`).join("") : `<span class="hint">Chọn trường trước</span>`;

  const letters = [...new Set(students.filter(s=>(!filters.school||s.school===filters.school)&&(!filters.className||s.className===filters.className)).map(firstLetter))].sort();
  if (filters.letter && !letters.includes(filters.letter)) filters.letter = "";
  $("letterFilter").innerHTML = letters.length ? letters.map(v => `<button class="chip ${filters.letter===v?'active':''}" data-letter="${escapeAttr(v)}">${escapeHtml(v)}</button>`).join("") : `<span class="hint">Chọn lớp trước</span>`;

  document.querySelectorAll("[data-school]").forEach(btn => btn.onclick = () => {
    filters.school = btn.dataset.school;
    filters.className = "";
    filters.letter = "";
    renderAll();
  });
  document.querySelectorAll("[data-class]").forEach(btn => btn.onclick = () => {
    filters.className = btn.dataset.class;
    filters.letter = "";
    renderAll();
  });
  document.querySelectorAll("[data-letter]").forEach(btn => btn.onclick = () => {
    filters.letter = btn.dataset.letter;
    renderAll();
  });
}

function renderStudents() {
  recalculateRanks();
  const list = filteredStudents();
  $("studentCount").textContent = `${list.length} học sinh`;
  $("emptyState").classList.toggle("hidden", list.length > 0);
  $("studentGrid").innerHTML = list.map((s, index) => {
    const c = computed(s);
    const avatar = AVATARS[index % AVATARS.length];
    return `
      <article class="student-card" data-id="${escapeAttr(s.id)}">
        <div class="rank-badge">🥇 Hạng ${s.rank || "-"}</div>
        <div class="student-head">
          <div class="avatar">${avatar}</div>
          <div>
            <div class="student-name">${escapeHtml(s.name || "Chưa có tên")}</div>
            <div class="student-meta">${escapeHtml(s.className)} · STT ${escapeHtml(s.STT)}</div>
          </div>
        </div>
        <div class="score-row">
          <div class="score-box plus"><div class="num">${s.plus}</div><div class="lbl">⭐ CỘNG</div></div>
          <div class="score-box minus"><div class="num">${s.minus}</div><div class="lbl">⚠️ TRỪ</div></div>
          <div class="score-box total"><div class="num">${c.total}</div><div class="lbl">🏆 TỔNG</div></div>
        </div>
        <div class="student-footer">
          <span class="classification">${c.classification}</span>
          <span class="reward-balance-mini">🎁 Còn ${c.available} ⭐</span>
        </div>
        <div class="quick-add">
          ${[1,2,3,5].map(n=>`<button data-action="plus" data-value="${n}">+${n}</button>`).join("")}
        </div>
        <div class="card-actions">
          <button class="minus-action" data-action="minus">⚠️ Trừ</button>
          <button class="reward-action" data-action="reward">🎁 Đổi quà</button>
          <button class="history-action" data-action="history">📜 Lịch sử</button>
        </div>
      </article>`;
  }).join("");

  document.querySelectorAll("[data-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const card = btn.closest(".student-card");
      const id = card.dataset.id;
      const action = btn.dataset.action;
      if (action === "plus") addPlus(id, Number(btn.dataset.value));
      if (action === "minus") openMinusModal(id);
      if (action === "reward") openRewardModal(id);
      if (action === "history") openHistoryModal(id);
    });
  });
}

function addPlus(id, points) {
  const s = students.find(x => x.id === id);
  if (!s) return;
  s.plus += points;
  recalculateRanks();
  saveState();
  renderAll();
  showToast(`🎉 +${points} điểm ${s.name}`);
  const card = document.querySelector(`[data-id="${CSS.escape(id)}"]`);
  if (card) card.classList.add("pulse");
}

function openMinusModal(id) {
  const s = students.find(x => x.id === id);
  if (!s) return;
  minusState = { studentId: id, points: 0, reason: "" };
  $("minusStudentName").textContent = s.name;
  $("minusValueList").querySelectorAll(".choice-btn").forEach(b=>b.classList.remove("selected"));
  renderReasons();
  $("customReason").value = "";
  $("customReason").classList.add("hidden");
  $("saveMinusBtn").disabled = true;
  openModal("minusModal");
}
function renderReasons() {
  $("reasonList").innerHTML = REASONS.map((r,i)=>`<button class="reason-btn" data-reason-index="${i}">${escapeHtml(r)}</button>`).join("");
  document.querySelectorAll("[data-reason-index]").forEach(btn=>btn.onclick=()=>{
    minusState.reason = REASONS[Number(btn.dataset.reasonIndex)];
    document.querySelectorAll(".reason-btn").forEach(x=>x.classList.remove("selected"));
    btn.classList.add("selected");
    const other = minusState.reason === "Lý do khác";
    $("customReason").classList.toggle("hidden", !other);
    validateMinus();
  });
}
document.addEventListener("click", e => {
  const btn = e.target.closest("[data-minus]");
  if (btn) {
    minusState.points = Math.abs(Number(btn.dataset.minus));
    document.querySelectorAll("[data-minus]").forEach(x=>x.classList.remove("selected"));
    btn.classList.add("selected");
    validateMinus();
  }
});
$("customReason").addEventListener("input", validateMinus);
function validateMinus() {
  let reason = minusState.reason;
  if (reason === "Lý do khác") reason = cleanText($("customReason").value);
  $("saveMinusBtn").disabled = !(minusState.points > 0 && reason);
}
$("saveMinusBtn").onclick = () => {
  const s = students.find(x=>x.id===minusState.studentId);
  if (!s) return;
  let reason = minusState.reason;
  if (reason === "Lý do khác") reason = cleanText($("customReason").value);
  if (!minusState.points || !reason) return;
  const t = nowParts();
  s.minus += minusState.points;
  s.minusHistory ||= [];
  s.minusHistory.unshift({points:minusState.points, reason, date:t.date, time:t.time});
  saveState();
  recalculateRanks();
  closeModal("minusModal");
  renderAll();
  showToast(`⚠️ -${minusState.points} điểm ${s.name}`);
};

function openHistoryModal(id) {
  const s = students.find(x=>x.id===id);
  if (!s) return;
  $("historyTitle").textContent = `📜 Lịch sử · ${s.name}`;
  const minusRows = (s.minusHistory||[]).map(h=>`<tr><td>⚠️ -${h.points}</td><td>${escapeHtml(h.reason)}</td><td>${h.date}</td><td>${h.time}</td></tr>`).join("");
  const rewardRows = (s.rewardHistory||[]).map(h=>`<tr><td>🎁 ${escapeHtml(h.name)}</td><td>${h.quantity}</td><td>-${h.pointsUsed} ⭐</td><td>${h.date}</td><td>${h.time}</td></tr>`).join("");
  $("historyContent").innerHTML = `
    <div class="score-row">
      <div class="score-box plus"><div class="num">${s.plus}</div><div class="lbl">⭐ CỘNG</div></div>
      <div class="score-box minus"><div class="num">${s.minus}</div><div class="lbl">⚠️ TRỪ</div></div>
      <div class="score-box total"><div class="num">${computed(s).total}</div><div class="lbl">🏆 TỔNG</div></div>
    </div>
    <h4>⚠️ Lịch sử điểm trừ</h4>
    ${minusRows ? `<table class="history-table"><thead><tr><th>Điểm</th><th>Lý do</th><th>Ngày</th><th>Giờ</th></tr></thead><tbody>${minusRows}</tbody></table>` : `<p class="hint">Chưa có lần trừ điểm nào.</p>`}
    <h4>🎁 Lịch sử đổi quà</h4>
    ${rewardRows ? `<table class="history-table"><thead><tr><th>Quà</th><th>SL</th><th>Điểm</th><th>Ngày</th><th>Giờ</th></tr></thead><tbody>${rewardRows}</tbody></table>` : `<p class="hint">Chưa có lần đổi quà nào.</p>`}`;
  openModal("historyModal");
}

function openRewardModal(id) {
  const s = students.find(x=>x.id===id);
  if (!s) return;
  rewardState = { studentId:id, rewardId:null, quantity:1 };
  $("rewardStudentName").textContent = s.name;
  $("rewardBalance").textContent = computed(s).available;
  renderRewardOptions();
  updateRewardCalculation();
  openModal("rewardModal");
}
function renderRewardOptions() {
  const s = students.find(x=>x.id===rewardState.studentId);
  const balance = computed(s).available;
  $("rewardList").innerHTML = rewards.map(r=>{
    const possible = Math.floor(balance/r.cost);
    return `<div class="reward-option ${rewardState.rewardId===r.id?'selected':''} ${possible<1?'disabled':''}" data-reward-id="${r.id}">
      <div class="reward-main"><span class="reward-icon">${escapeHtml(r.icon)}</span><div><div class="reward-name">${escapeHtml(r.name)}</div><div class="reward-cost">⭐ ${r.cost} điểm · tối đa ${possible}</div></div></div>
      <span>${possible>0?'Chọn':'Chưa đủ ⭐'}</span>
    </div>`;
  }).join("");
  document.querySelectorAll("[data-reward-id]").forEach(el=>el.onclick=()=>{
    const r = rewards.find(x=>x.id===Number(el.dataset.rewardId));
    if (!r || balance < r.cost) return;
    rewardState.rewardId=r.id;
    rewardState.quantity=1;
    renderRewardOptions();
    updateRewardCalculation();
  });
}
$("qtyMinus").onclick=()=>{ if(rewardState.quantity>1){rewardState.quantity--;updateRewardCalculation();}};
$("qtyPlus").onclick=()=>{const s=students.find(x=>x.id===rewardState.studentId);const r=rewards.find(x=>x.id===rewardState.rewardId);if(r&&rewardState.quantity<Math.floor(computed(s).available/r.cost)){rewardState.quantity++;updateRewardCalculation();}};
function updateRewardCalculation() {
  const r = rewards.find(x=>x.id===rewardState.rewardId);
  const s = students.find(x=>x.id===rewardState.studentId);
  if (!r || !s) {
    $("rewardQty").textContent="1";
    $("rewardCalculation").textContent="Chọn một phần quà.";
    $("confirmRewardBtn").disabled=true;
    return;
  }
  const used=r.cost*rewardState.quantity, remain=computed(s).available-used;
  $("rewardQty").textContent=rewardState.quantity;
  $("rewardCalculation").textContent=`Dùng ${used} ⭐ · Còn lại ${remain} ⭐`;
  $("confirmRewardBtn").disabled=remain<0;
}
$("confirmRewardBtn").onclick=()=>{
  const s=students.find(x=>x.id===rewardState.studentId);
  const r=rewards.find(x=>x.id===rewardState.rewardId);
  if(!s||!r)return;
  const used=r.cost*rewardState.quantity;
  if(computed(s).available<used)return;
  const t=nowParts();
  s.rewardPointsUsed=(s.rewardPointsUsed||0)+used;
  s.rewardHistory ||= [];
  s.rewardHistory.unshift({rewardId:r.id,name:r.name,quantity:rewardState.quantity,pointsUsed:used,date:t.date,time:t.time});
  saveState(); recalculateRanks(); closeModal("rewardModal"); renderAll();
  showToast(`🎁 Đã đổi ${rewardState.quantity} ${r.name}`);
};

function openModal(id){$(id).classList.remove("hidden")}
function closeModal(id){$(id).classList.add("hidden")}
document.querySelectorAll("[data-close]").forEach(b=>b.onclick=()=>closeModal(b.dataset.close));
document.querySelectorAll(".modal-backdrop").forEach(m=>m.addEventListener("click",e=>{if(e.target===m)closeModal(m.id)}));

async function connectToSheet() {
  const url=cleanText($("sheetApiUrl").value);
  if(!url){showToast("⚠️ Hãy nhập URL Google Apps Script Web App.");return;}
  localStorage.setItem(API_KEY,url);
  await fetchRoster(url);
}
async function fetchRoster(url=localStorage.getItem(API_KEY)||GOOGLE_SHEET_API_URL) {
  if(!url){showToast("ℹ️ Chưa có URL Google Apps Script.");return;}
  $("connectionStatus").textContent="Đang kết nối...";
  $("connectionStatus").className="status-pill";
  try{
    const response=await fetch(url,{method:"GET",redirect:"follow"});
    if(!response.ok)throw new Error(`HTTP ${response.status}`);
    const data=await response.json();
    const rows=Array.isArray(data)?data:(data.students||data.data||[]);
    if(!Array.isArray(rows))throw new Error("Dữ liệu trả về không đúng định dạng.");
    const result=mergeRoster(rows);
    $("connectionStatus").textContent=`Đã kết nối · ${result.total} dòng`;
    $("connectionStatus").className="status-pill online";
    renderAll();
    showToast(`✅ Cập nhật xong · thêm ${result.added} học sinh`);
  }catch(err){
    $("connectionStatus").textContent="Kết nối lỗi";
    $("connectionStatus").className="status-pill offline";
    showToast("❌ Không đọc được Google Sheets. Kiểm tra URL Web App và quyền truy cập.");
    console.error(err);
  }
}
$("connectBtn").onclick=()=>connectToSheet();
$("refreshBtn").onclick=()=>fetchRoster();

function backupData() {
  recalculateRanks();
  const data=students.map(s=>{
    const c=computed(s);
    return {
      "STT":s.STT,
      "Trường":s.school,
      "Họ và tên đệm":s.middleName,
      "Tên":s.firstName,
      "Lớp":s.className,
      "Điểm cộng":s.plus,
      "Điểm trừ":s.minus,
      "Xếp loại":c.classification,
      "Hạng":s.rank,
      "Điểm đã dùng đổi quà":c.used,
      "Điểm còn lại":c.available,
      "Lịch sử điểm trừ":s.minusHistory||[],
      "Lịch sử đổi quà":s.rewardHistory||[]
    };
  });
  const payload={version:1,createdAt:new Date().toISOString(),rewards,students:data};
  const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);
  const d=new Date(), pad=n=>String(n).padStart(2,"0");
  a.download=`data_${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}.json`;
  a.click();URL.revokeObjectURL(a.href);showToast("💾 Đã sao lưu toàn bộ học sinh.");
}
$("backupBtn").onclick=backupData;
$("restoreBtn").onclick=()=>$("restoreInput").click();
$("restoreInput").onchange=e=>{
  const file=e.target.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=()=>{
    try{
      const payload=JSON.parse(reader.result);
      const incoming=Array.isArray(payload)?payload:(payload.students||[]);
      if(!Array.isArray(incoming))throw new Error("invalid");
      students=incoming.map(normalizeStudent);
      if(Array.isArray(payload.rewards)&&payload.rewards.length){rewards=payload.rewards;saveRewards();}
      recalculateRanks();saveState();renderAll();showToast(`📂 Khôi phục ${students.length} học sinh thành công.`);
    }catch{showToast("❌ File khôi phục không hợp lệ.");}
    e.target.value="";
  };
  reader.readAsText(file);
};

$("demoBtn").onclick=()=>{
  students=[
    ["Nguyễn Minh","Anh","ABC","5A1"],["Trần Quốc","Bảo","ABC","5A1"],["Lê Hoàng","Nam","ABC","5A1"],
    ["Phạm Minh","Tuấn","ABC","5A1"],["Nguyễn Thị","An","ABC","5A2"],["Đỗ Gia","Huy","ABC","5A2"],
    ["Võ Minh","Khang","XYZ","5A1"],["Bùi Ngọc","Lan","XYZ","5A1"]
  ].map((x,i)=>normalizeStudent({"STT":i+1,"Trường":x[2],"Họ và tên đệm":x[0],"Tên":x[1],"Lớp":x[3]}));
  saveState();renderAll();showToast("✨ Đã nạp dữ liệu mẫu.");
};

function renderRewardConfig() {
  $("rewardConfigList").innerHTML=rewards.map((r,i)=>`
    <div class="config-reward-row" data-config-index="${i}">
      <input data-field="icon" value="${escapeAttr(r.icon)}" aria-label="Icon">
      <input data-field="name" value="${escapeAttr(r.name)}" placeholder="Tên quà">
      <input data-field="cost" type="number" min="1" value="${r.cost}" placeholder="Số sao">
      <span class="hint" style="display:flex;align-items:center">⭐ điểm</span>
      <button class="delete-reward" data-delete-reward="${i}">×</button>
    </div>`).join("");
  document.querySelectorAll("[data-delete-reward]").forEach(b=>b.onclick=()=>{
    rewards.splice(Number(b.dataset.deleteReward),1);renderRewardConfig();
  });
}
$("configRewardBtn").onclick=()=>{renderRewardConfig();openModal("rewardConfigModal")};
$("addRewardBtn").onclick=()=>{rewards.push({id:Date.now(),name:"Phần quà mới",icon:"🎁",cost:5});renderRewardConfig()};
$("saveRewardConfigBtn").onclick=()=>{
  const rows=[...document.querySelectorAll("[data-config-index]")];
  rewards=rows.map(row=>{
    const i=Number(row.dataset.configIndex);
    return {id:rewards[i]?.id||Date.now()+i,icon:row.querySelector('[data-field="icon"]').value||"🎁",name:row.querySelector('[data-field="name"]').value||"Phần quà",cost:Math.max(1,Number(row.querySelector('[data-field="cost"]').value)||1)};
  });
  saveRewards();closeModal("rewardConfigModal");showToast("⚙️ Đã lưu cấu hình phần quà.");
};

function escapeHtml(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[c]))}
function escapeAttr(v){return escapeHtml(v)}
function showToast(message){
  const el=document.createElement("div");el.className="toast";el.textContent=message;
  $("toastContainer").appendChild(el);setTimeout(()=>el.remove(),2600);
}
function renderAll(){renderFilters();renderStudents();}

(function init(){
  const savedUrl=localStorage.getItem(API_KEY)||GOOGLE_SHEET_API_URL;
  if(savedUrl)$("sheetApiUrl").value=savedUrl;
  recalculateRanks();saveState();renderAll();
})();
