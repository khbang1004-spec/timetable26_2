/* ──────────────────────────────────────────
   시간표 데이터 – 요일/교시별 고정 과목 & 블록
   ────────────────────────────────────────── */
const DAYS = ["월", "화", "수", "목", "금"];
const PERIODS = [1, 2, 3, 4, 5, 6, 7];

// 요일별 최대 교시
const MAX_PERIOD = { 월: 7, 화: 6, 수: 7, 목: 6, 금: 7 };

// 각 칸의 타입: fixed(전체 공통) | block(개인 선택)
const SLOTS = {
  "월-1": { t:"block", b:"B" }, "월-2": { t:"block", b:"B" },
  "월-3": { t:"fixed", s:"미적분I",  te:"방경희T",  r:"2-4" },
  "월-4": { t:"fixed", s:"영어2",    te:"정은영T",  r:"2-4" },
  "월-5": { t:"block", b:"A" }, "월-6": { t:"block", b:"A" },
  "월-7": { t:"fixed", s:"화법과 언어", te:"유기정T",  r:"2-4" },

  "화-1": { t:"block", b:"C" }, "화-2": { t:"block", b:"C" },
  "화-3": { t:"block", b:"D" },
  "화-4": { t:"fixed", s:"미적분I",  te:"방경희T",  r:"2-4" },
  "화-5": { t:"block", b:"B" }, "화-6": { t:"block", b:"B" },

  "수-1": { t:"fixed", s:"영어2",    te:"전다혜T",  r:"2-4" },
  "수-2": { t:"fixed", s:"화법과 언어", te:"유기정T",  r:"2-4" },
  "수-3": { t:"fixed", s:"화법과 언어", te:"황정아T",  r:"2-4" },
  "수-4": { t:"fixed", s:"영어2",    te:"정은영T",  r:"2-4" },
  "수-5": { t:"fixed", s:"미적분I",  te:"방경희T",  r:"2-4" },
  "수-6": { t:"fixed", s:"창체", te:"담임", r:"2-4" },
  "수-7": { t:"fixed", s:"창체", te:"담임", r:"2-4" },

  "목-1": { t:"block", b:"C" }, "목-2": { t:"block", b:"C" },
  "목-3": { t:"block", b:"D" },
  "목-4": { t:"block", b:"A" }, "목-5": { t:"block", b:"A" },
  "목-6": { t:"fixed", s:"스포츠 생활2", te:"최준홍T", r:"체육관" },

  "금-1": { t:"block", b:"D" }, "금-2": { t:"block", b:"D" },
  "금-3": { t:"fixed", s:"영어2",    te:"전다혜T",  r:"2-4" },
  "금-4": { t:"fixed", s:"미적분I",  te:"방경희T",  r:"2-4" },
  "금-5": { t:"fixed", s:"과학탐구실험2", te:"이지민T", r:"과학실" },
  "금-6": { t:"fixed", s:"스포츠 생활2", te:"최준홍T", r:"체육관" },
  "금-7": { t:"fixed", s:"화법과 언어", te:"황정아T",  r:"2-4" },
};

// 미술과 매체 – B블록 교시별 담당 교사 분리
const MISUL_TEACHER = {
  "월-1": "조유진T", "월-2": "조유진T",
  "화-5": "조유진T", "화-6": "조희주T",
};

/* ──────────────────────────────────────────
   상태
   ────────────────────────────────────────── */
let students = [];
let currentStudent = null;

/* ──────────────────────────────────────────
   DOM 참조
   ────────────────────────────────────────── */
const $ = id => document.getElementById(id);
const dom = {
  searchScreen: $("search-screen"),
  keyword:      $("keyword"),
  dropdown:     $("dropdown"),
  msg:          $("msg"),
  result:       $("result"),
  backBtn:      $("back-btn"),
  resultName:   $("result-name"),
  resultMeta:   $("result-meta"),
  tbody:        $("timetable-body"),
};

/* ──────────────────────────────────────────
   HTML 이스케이프
   ────────────────────────────────────────── */
function esc(t) {
  return String(t ?? "")
    .replace(/&/g,"&amp;").replace(/</g,"&lt;")
    .replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function formatSubjectForDisplay(subject) {
  const safe = esc(subject);
  return safe
    .replace(/지구시스템\s*과학/g, "지구시스템<wbr>과학")
    .replace(/과학탐구\s*실험\s*2/g, "과학탐구<wbr>실험2")
    .replace(/과학탐구실험2/g, "과학탐구<wbr>실험2");
}

/* ──────────────────────────────────────────
   검색 – 번호 / 이름 / 학번 정확 일치 우선
   ────────────────────────────────────────── */
function search(q) {
  q = q.trim();
  if (!q) return null;

  const norm = s => String(s ?? "").trim().toLowerCase();
  const nq = norm(q);

  // 1순위: 완전 일치 (번호, 이름, 학번)
  const exact = students.filter(s =>
    norm(s.number) === nq ||
    norm(s.name)   === nq ||
    (s.studentId && norm(s.studentId) === nq)
  );
  if (exact.length === 1) return { student: exact[0], ambiguous: false };
  if (exact.length > 1)  return { student: null, ambiguous: true, list: exact };

  // 2순위: 이름 부분 일치 (이름에만 적용, 번호 부분 일치는 혼란 유발)
  const partial = students.filter(s => norm(s.name).includes(nq) && nq.length >= 1);
  if (partial.length === 1) return { student: partial[0], ambiguous: false };
  if (partial.length > 1)  return { student: null, ambiguous: true, list: partial };

  return null;
}

/* ──────────────────────────────────────────
   메시지
   ────────────────────────────────────────── */
function setMsg(text, isError = true) {
  dom.msg.textContent = text;
  dom.msg.className = "msg" + (isError ? "" : " ok");
}

/* ──────────────────────────────────────────
   화면 전환
   ────────────────────────────────────────── */
function showSearch() {
  dom.result.classList.remove("visible");
  dom.searchScreen.style.display = "";
  dom.keyword.value = "";
  setMsg("", false);
  currentStudent = null;
}

function showResult(student) {
  currentStudent = student;
  dom.searchScreen.style.display = "none";

  dom.resultName.textContent = `${student.number}번 ${student.name}`;
  dom.resultMeta.textContent = `번호 ${student.number}`;

  renderTable(student);
  dom.result.classList.add("visible");
  window.scrollTo({ top: 0, behavior: "instant" });
}

/* ──────────────────────────────────────────
   시간표 렌더링
   ────────────────────────────────────────── */
function buildCell(day, period, student) {
  if (period > MAX_PERIOD[day]) {
    return `<td><div class="slot is-empty"></div></td>`;
  }

  const key = `${day}-${period}`;
  const slot = SLOTS[key];
  if (!slot) return `<td><div class="slot"></div></td>`;

  let subject, teacher, room, isBlock = false, blockLetter = "";

  if (slot.t === "fixed") {
    subject = slot.s; teacher = slot.te; room = slot.r;
  } else {
    isBlock = true;
    blockLetter = slot.b;
    const bl = student.blocks?.[slot.b] || {};
    subject = bl.subject || "미배정";
    teacher = bl.teacher || "";
    room    = bl.room    || "";
    // 미술과 매체는 교시마다 담당 교사가 다름
    if (subject === "미술과 매체" && MISUL_TEACHER[key]) {
      teacher = MISUL_TEACHER[key];
    }
  }

  const cls = isBlock ? `slot is-block block-${blockLetter.toLowerCase()}` : "slot";
  const tag = isBlock ? `<span class="bl-tag">${esc(blockLetter)}</span>` : "";

  return `<td><div class="${cls}">
    ${tag}
    <span class="s-subject">${formatSubjectForDisplay(subject)}</span>
    <span class="s-teacher">${esc(teacher)}</span>
    <span class="s-room">${esc(room)}</span>
  </div></td>`;
}

function renderTable(student) {
  let html = "";
  for (const p of PERIODS) {
    html += `<tr><td>${p}</td>`;
    for (const d of DAYS) html += buildCell(d, p, student);
    html += `</tr>`;
  }
  dom.tbody.innerHTML = html;
}

// 번호로부터 5자리 학번 유도: 204 + 2자리 번호 (예: 1 -> 20401)
function derivedId(number) {
  return "204" + String(number).padStart(2, "0");
}

/* ──────────────────────────────────────────
   드롭다운 후보 표시
   ────────────────────────────────────────── */
function getCandidates(q) {
  q = q.trim();
  if (!q) return [];
  const norm = s => String(s ?? "").trim().toLowerCase();
  const nq = norm(q);

  // 번호·학번 정확 일치 → 해당 학생만
  const byNum = students.filter(s =>
    norm(s.number) === nq ||
    (s.studentId && norm(s.studentId) === nq) ||
    derivedId(s.number) === nq
  );
  if (byNum.length) return byNum;

  // 이름 포함 검색
  return students.filter(s => norm(s.name).includes(nq));
}

function renderDropdown(list) {
  if (!list.length) {
    dom.dropdown.hidden = true;
    return;
  }
  dom.dropdown.innerHTML = list
    .map(s => `<button type="button" class="dd-item" data-num="${esc(s.number)}">
      <span class="dd-num">${esc(s.number)}번</span>
      <span class="dd-name">${esc(s.name)}</span>
    </button>`)
    .join("");
  dom.dropdown.hidden = false;
}

function closeDropdown() {
  dom.dropdown.hidden = true;
  dom.dropdown.innerHTML = "";
}

/* ──────────────────────────────────────────
   이벤트
   ────────────────────────────────────────── */
function handleInput() {
  const q = dom.keyword.value.trim();
  setMsg("", false);
  if (!q) { closeDropdown(); return; }

  const candidates = getCandidates(q);
  if (!candidates.length) {
    closeDropdown();
    setMsg("일치하는 학생이 없습니다.");
    return;
  }
  renderDropdown(candidates);
}

/* ──────────────────────────────────────────
   데이터 로드 & 초기화
   ────────────────────────────────────────── */
async function init() {
  try {
    const paths = ["data/students.from-pdf.json", "data/students.sample.json"];
    let loaded = false;
    for (const p of paths) {
      const res = await fetch(p, { cache: "no-store" });
      if (!res.ok) continue;
      students = await res.json();
      loaded = true;
      break;
    }
    if (!loaded) throw new Error("데이터 파일을 찾을 수 없습니다.");

    dom.keyword.addEventListener("input", handleInput);
    dom.keyword.addEventListener("keydown", e => {
      if (e.key === "Escape") { closeDropdown(); dom.keyword.blur(); }
    });

    // 드롭다운 항목 클릭
    dom.dropdown.addEventListener("click", e => {
      const btn = e.target.closest(".dd-item");
      if (!btn) return;
      const student = students.find(s => s.number === btn.dataset.num);
      if (!student) return;
      closeDropdown();
      setMsg("", false);
      showResult(student);
    });

    // 외부 클릭 시 드롭다운 닫기
    document.addEventListener("click", e => {
      if (!e.target.closest(".search-wrap")) closeDropdown();
    });

    dom.backBtn.addEventListener("click", showSearch);

  } catch (err) {
    setMsg(`오류: ${err.message}`);
  }
}

init();
