/**
 * 바른 언어 캠페인 웹앱 — 한 파일 묶음 (자동 생성 파일, 직접 고치지 마세요)
 * 원본: src/ 폴더 / 생성: node tools/bundle.js
 * 사용법: Apps Script 편집기의 Code.gs 내용을 모두 지우고 이 파일 전체를 붙여 넣기
 */

// ===================== Config.gs =====================
/**
 * 설정 시트 읽기/쓰기, 공통 상수, 날짜 유틸.
 * 설정 시트는 [항목 | 값 | 설명] 3칸이다. 담임은 "값" 칸만 고치면 된다.
 */

const TZ = 'Asia/Seoul';

const SHEETS = {
  CONFIG: '설정',
  STUDENTS: '학생',
  LEDGER: '기록장',
  QUEST: '일퀘',
  PRAISE: '칭찬',
  SPY: '암행어사',
  SPY_JUDGE: '암행어사판정',
  ACCUSE: '지목',
  DRAW: '뽑기',
  TIMETABLE: '시간표',
  TT_OVERRIDE: '시간표변경',
};

// type: string | int | bool | date | dateList | list | code
const CONFIG_DEFS = [
  { key: 'campaignName', label: '캠페인명', type: 'string', def: '바른 언어 사용하고, 보상 얻자!!', desc: '화면 맨 위 제목' },
  { key: 'subtitle', label: '부제', type: 'string', def: '투투퀘스트 달성하고 랭킹권에 도전해라', desc: '제목 아래 한 줄' },
  { key: 'nickname', label: '학생 호칭', type: 'string', def: '투투', desc: '화면에서 학생을 부르는 이름' },
  { key: 'startDate', label: '시작일', type: 'date', def: '2026-10-12', desc: 'yyyy-mm-dd' },
  { key: 'endDate', label: '종료일', type: 'date', def: '2026-10-22', desc: 'yyyy-mm-dd' },
  { key: 'schoolDays', label: '등교일 목록', type: 'dateList', def: '2026-10-12, 2026-10-13, 2026-10-14, 2026-10-15, 2026-10-16, 2026-10-19, 2026-10-20, 2026-10-21, 2026-10-22', desc: '쉼표로 구분. 비우면 시작~종료일의 평일' },
  { key: 'midRankDate', label: '중간 랭킹 업데이트일', type: 'date', def: '2026-10-16', desc: '안내용 (랭킹은 매일 실시간 공개, 숨김은 랭킹 잠금으로)' },
  { key: 'rankPublicCount', label: '랭킹 공개 인원', type: 'int', def: 5, desc: '투투 화면에 공개할 상위 인원' },
  { key: 'rankLocked', label: '랭킹 잠금', type: 'bool', def: false, desc: 'ON이면 투투 화면에 "랭킹 공개 전입니다"' },
  { key: 'drawStampThreshold', label: '뽑기 도장 기준', type: 'int', def: 12, desc: '순합계가 이 이상이면 뽑기 1회' },
  { key: 'dozeAllowed', label: '졸음 허용 횟수', type: 'int', def: 3, desc: '졸지 않기: 😴 졸았어요가 이 횟수 이하면 성공' },
  { key: 'praiseMinLength', label: '칭찬 최소 글자 수', type: 'int', def: 10, desc: '' },
  { key: 'bannedWords', label: '금지어 목록', type: 'list', def: '시발, 씨발, ㅅㅂ, ㅆㅂ, 병신, ㅂㅅ, 개새끼, 새끼, 존나, ㅈㄴ, 좆, 지랄, 닥쳐, 꺼져, 미친놈, 미친년', desc: '쉼표로 구분' },
  { key: 'teacherCode', label: '교과 선생님 공통 코드', type: 'code', def: '', desc: '4자리. 비우면 초기 세팅 때 자동 생성' },
  { key: 'teachers', label: '교과 선생님 목록', type: 'list', def: '', desc: '쉼표로 구분, 이름(과목) 형식. 예: 김민수(국어), 이지은(수학)' },
  { key: 'adminCode', label: '담임 코드', type: 'code', def: '', desc: '담임 대시보드 입장 코드. 비우면 초기 세팅 때 자동 생성' },
  { key: 'accuseResultPublic', label: '지목 결과 공개', type: 'bool', def: false, desc: 'ON이면 검거 결과를 다른 투투에게 공개' },
  { key: 'periodCount', label: '교시 수', type: 'int', def: 6, desc: '교과 선생님 화면의 교시 버튼 개수' },
  { key: 'reward1', label: '1위 보상', type: 'string', def: '특별 간식 + 자리 우선권 2회 + 청소 면제권 5장 + 보은페이 보너스 100원', desc: '' },
  { key: 'reward2', label: '2위 보상', type: 'string', def: '간식 + 자리 우선권 2회 + 청소 면제권 3장', desc: '' },
  { key: 'reward3', label: '3위 보상', type: 'string', def: '간식 + 자리 우선권 2회 + 청소 면제권 2장', desc: '' },
  { key: 'reward4', label: '4위 보상', type: 'string', def: '간식 + 자리 우선권 1회', desc: '' },
  { key: 'reward5', label: '5위 보상', type: 'string', def: '간식 + 청소 면제권 1장', desc: '' },
];

const CACHE_KEYS = { CONFIG: 'config_v1', STUDENTS: 'students_v1', TIMETABLE: 'timetable_v1' };

/** 스프레드시트 핸들. 초기 세팅 때 ID를 저장해 두면 웹앱에서도 확실히 같은 파일을 연다. */
function ss_() {
  const id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive();
}

function sheet_(name) {
  const sh = ss_().getSheetByName(name);
  if (!sh) throw new Error(`"${name}" 시트가 없어요. 메뉴에서 [시트 초기 세팅]을 먼저 실행해 주세요.`);
  return sh;
}

function getConfig() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(CACHE_KEYS.CONFIG);
  if (hit) return JSON.parse(hit);
  const cfg = readConfigFromSheet_();
  cache.put(CACHE_KEYS.CONFIG, JSON.stringify(cfg), 600);
  return cfg;
}

function readConfigFromSheet_() {
  const raw = {};
  const sh = ss_().getSheetByName(SHEETS.CONFIG);
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, 2).getValues().forEach((r) => {
      const label = String(r[0]).trim();
      if (label) raw[label] = r[1];
    });
  }
  const cfg = {};
  CONFIG_DEFS.forEach((d) => {
    cfg[d.key] = parseConfigValue_(d, Object.prototype.hasOwnProperty.call(raw, d.label) ? raw[d.label] : '');
  });
  if (!cfg.schoolDays.length) cfg.schoolDays = weekdaysBetween_(cfg.startDate, cfg.endDate);
  cfg.rewards = [cfg.reward1, cfg.reward2, cfg.reward3, cfg.reward4, cfg.reward5];
  cfg.teacherList = cfg.teachers.map(parseTeacher_);
  return cfg;
}

function parseConfigValue_(d, v) {
  const empty = v === '' || v === null || v === undefined;
  switch (d.type) {
    case 'int': {
      const n = parseInt(v, 10);
      return isNaN(n) ? d.def : n;
    }
    case 'bool':
      if (empty) return d.def;
      if (v === true || v === false) return v;
      return /^(on|true|yes|y|1|예|공개|잠금)$/i.test(String(v).trim());
    case 'date':
      return (!empty && toDateStr_(v)) || d.def;
    case 'dateList':
      return parseDateList_(empty ? d.def : v);
    case 'list':
      return String(empty ? d.def : v).split(/[,\n]+/).map((s) => s.trim()).filter(Boolean);
    case 'code':
      return empty ? '' : String(v).trim();
    default:
      return empty ? d.def : String(v).trim();
  }
}

/** 설정 시트에 적을 때의 표기 */
function toSheetValue_(d, value) {
  if (d.type === 'bool') return value ? 'ON' : 'OFF';
  if (Array.isArray(value)) return value.join(', ');
  return value;
}

function setConfigValue_(key, value) {
  const d = CONFIG_DEFS.find((x) => x.key === key);
  if (!d) throw new Error('알 수 없는 설정: ' + key);
  const sh = sheet_(SHEETS.CONFIG);
  const last = sh.getLastRow();
  const labels = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map((r) => String(r[0]).trim()) : [];
  const idx = labels.indexOf(d.label);
  if (idx >= 0) sh.getRange(idx + 2, 2).setValue(toSheetValue_(d, value));
  else sh.appendRow([d.label, toSheetValue_(d, value), d.desc]);
  CacheService.getScriptCache().remove(CACHE_KEYS.CONFIG);
}

/** '김민수(국어)' → {name: '김민수', subject: '국어'} */
function parseTeacher_(s) {
  const m = String(s).match(/^(.+?)\s*[(（]\s*(.+?)\s*[)）]\s*$/);
  return m ? { name: m[1].trim(), subject: m[2].trim() } : { name: String(s).trim(), subject: '' };
}

// ---------- 날짜 유틸 (모든 날짜는 'yyyy-MM-dd' 문자열로 다룬다) ----------

function todayStr_() {
  return Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd');
}

function toDateStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'yyyy-MM-dd');
  const m = String(v).trim().match(/^(\d{4})[-./ ]\s*(\d{1,2})[-./ ]\s*(\d{1,2})/);
  if (!m) return '';
  return `${m[1]}-${('0' + m[2]).slice(-2)}-${('0' + m[3]).slice(-2)}`;
}

function parseDateList_(v) {
  if (v instanceof Date) return [toDateStr_(v)];
  const out = String(v).split(/[,\n;]+/).map(toDateStr_).filter(Boolean);
  return Array.from(new Set(out)).sort();
}

function weekdaysBetween_(start, end) {
  const out = [];
  if (!start || !end) return out;
  const [y1, m1, d1] = start.split('-').map(Number);
  const [y2, m2, d2] = end.split('-').map(Number);
  const cur = new Date(Date.UTC(y1, m1 - 1, d1));
  const last = new Date(Date.UTC(y2, m2 - 1, d2));
  while (cur <= last) {
    const w = cur.getUTCDay();
    if (w !== 0 && w !== 6) out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

/** 등교일 기준 몇 일차인지 (등교일이 아니면 0) */
function schoolDayIndex_(cfg, dateStr) {
  return cfg.schoolDays.indexOf(dateStr) + 1;
}

// ===================== Ledger.gs =====================
/**
 * 기록장: 모든 도장 적립·차감의 유일한 원본.
 * - 쓰기는 반드시 withLock_ 안에서 appendRecords_ / cancelRecord_ 로만 한다.
 * - 합계·랭킹은 기록장에서 계산하고 CacheService에 보관, 쓰기가 일어나면 무효화한다.
 */

const LEDGER_HEADERS = ['타임스탬프', '날짜', '학생번호', '미션구분', '점수', '입력자유형', '입력자', '교시', '과목', '메모', '취소여부', '기록ID', '취소사유'];
const LC = LEDGER_HEADERS.reduce((m, h, i) => ((m[h] = i), m), {});

const MISSIONS = ['일퀘', '암행어사판정', '암행어사활동', '수업참여', 'MVP', '단체', '검거이전', '수동'];
const INPUT_TYPES = ['학생', '암행어사', '교과', '담임', '시스템'];

const STUDENT_HEADERS = ['번호', '이름', '로그인코드'];

// ---------- 잠금 ----------

let lockDepth_ = 0;

/** 스크립트 전체 잠금. 중첩 호출 시에는 바깥 잠금을 그대로 쓴다. */
function withLock_(fn) {
  if (lockDepth_ > 0) return fn();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(15000)) throw new Error('지금 사용하는 사람이 많아요. 잠시 후 다시 시도해 주세요.');
  lockDepth_++;
  try {
    return fn();
  } finally {
    lockDepth_--;
    lock.releaseLock();
  }
}

// ---------- 학생 ----------

/** 학생 시트 전체(로그인 코드 포함). 서버 내부 전용 — 클라이언트로 그대로 내보내지 말 것. */
function readStudents_() {
  const sh = sheet_(SHEETS.STUDENTS);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, STUDENT_HEADERS.length).getValues()
    .map((r, i) => ({
      row: i + 2,
      no: String(r[0]).trim(),
      name: String(r[1]).trim(),
      code: String(r[2]).trim(),
    }))
    .filter((s) => s.no && s.name)
    .sort((a, b) => Number(a.no) - Number(b.no) || a.no.localeCompare(b.no));
}

/** readStudents_ 캐시판 (서버 내부 전용, 로그인 코드 포함) */
function getStudentsCached_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(CACHE_KEYS.STUDENTS);
  if (hit) return JSON.parse(hit);
  const list = readStudents_();
  cache.put(CACHE_KEYS.STUDENTS, JSON.stringify(list), 600);
  return list;
}

// ---------- 기록장 읽기/쓰기 ----------

function readLedger_() {
  const sh = sheet_(SHEETS.LEDGER);
  const last = sh.getLastRow();
  if (last < 2) return [];
  return sh.getRange(2, 1, last - 1, LEDGER_HEADERS.length).getValues().map((r, i) => ({
    row: i + 2,
    ts: r[LC['타임스탬프']] instanceof Date ? Utilities.formatDate(r[LC['타임스탬프']], TZ, 'yyyy-MM-dd HH:mm:ss') : String(r[LC['타임스탬프']]),
    date: toDateStr_(r[LC['날짜']]),
    no: String(r[LC['학생번호']]).trim(),
    mission: String(r[LC['미션구분']]).trim(),
    score: Number(r[LC['점수']]) || 0,
    inputType: String(r[LC['입력자유형']]),
    inputBy: String(r[LC['입력자']]),
    period: String(r[LC['교시']]),
    subject: String(r[LC['과목']]),
    memo: String(r[LC['메모']]),
    cancelled: r[LC['취소여부']] === true || String(r[LC['취소여부']]).toUpperCase() === 'TRUE',
    id: String(r[LC['기록ID']]),
    cancelReason: String(r[LC['취소사유']]),
  })).filter((r) => r.no || r.id);
}

function newRecordId_() {
  return 'R' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase().padStart(2, '0');
}

/**
 * 기록장에 여러 줄 추가. 각 record: {date, no, mission, score, inputType, inputBy, period, subject, memo}
 * 규칙 검증은 호출하는 쪽에서 같은 잠금 안에서 끝낸 뒤 부른다.
 */
function appendRecords_(records) {
  if (!records.length) return [];
  return withLock_(() => {
    const now = new Date();
    const rows = records.map((rec) => {
      if (MISSIONS.indexOf(rec.mission) < 0) throw new Error('알 수 없는 미션구분: ' + rec.mission);
      if (INPUT_TYPES.indexOf(rec.inputType) < 0) throw new Error('알 수 없는 입력자유형: ' + rec.inputType);
      if (!Number.isInteger(rec.score) || rec.score === 0) throw new Error('점수는 0이 아닌 정수여야 해요.');
      const date = toDateStr_(rec.date || todayStr_());
      if (!date) throw new Error('날짜 형식이 올바르지 않아요.');
      rec.id = newRecordId_();
      const row = new Array(LEDGER_HEADERS.length).fill('');
      row[LC['타임스탬프']] = now;
      row[LC['날짜']] = date;
      row[LC['학생번호']] = String(rec.no);
      row[LC['미션구분']] = rec.mission;
      row[LC['점수']] = rec.score;
      row[LC['입력자유형']] = rec.inputType;
      row[LC['입력자']] = rec.inputBy || '';
      row[LC['교시']] = rec.period || '';
      row[LC['과목']] = rec.subject || '';
      row[LC['메모']] = rec.memo || '';
      row[LC['취소여부']] = false;
      row[LC['기록ID']] = rec.id;
      return row;
    });
    const sh = sheet_(SHEETS.LEDGER);
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, LEDGER_HEADERS.length).setValues(rows);
    invalidateStats_();
    return records.map((r) => r.id);
  });
}

/** 기록 취소(삭제하지 않고 취소여부=TRUE). */
function cancelRecord_(id, reason, by) {
  return withLock_(() => {
    const sh = sheet_(SHEETS.LEDGER);
    const last = sh.getLastRow();
    if (last < 2) throw new Error('기록을 찾을 수 없어요.');
    const ids = sh.getRange(2, LC['기록ID'] + 1, last - 1, 1).getValues();
    const idx = ids.findIndex((r) => String(r[0]) === String(id));
    if (idx < 0) throw new Error('기록을 찾을 수 없어요.');
    const row = idx + 2;
    const cur = sh.getRange(row, LC['취소여부'] + 1).getValue();
    if (cur === true || String(cur).toUpperCase() === 'TRUE') throw new Error('이미 취소된 기록이에요.');
    sh.getRange(row, LC['취소여부'] + 1).setValue(true);
    const when = Utilities.formatDate(new Date(), TZ, 'MM-dd HH:mm');
    sh.getRange(row, LC['취소사유'] + 1).setValue(`${reason} (${by}, ${when})`);
    invalidateStats_();
  });
}

// ---------- 합계·랭킹 캐시 ----------
// 기록이 바뀔 때마다 data_ver를 바꾸고, 캐시 키에 버전을 붙여 한 번에 무효화한다.

const CACHE_TTL_SEC = 1800;

function dataVersion_() {
  const cache = CacheService.getScriptCache();
  let v = cache.get('data_ver');
  if (!v) {
    v = String(Date.now());
    cache.put('data_ver', v, 21600);
  }
  return v;
}

function invalidateStats_() {
  CacheService.getScriptCache().put('data_ver', String(Date.now()) + Math.floor(Math.random() * 1000), 21600);
}

/** 캐시된 전체 통계 (로그인 코드·입력자 등 민감정보 없음). prev = 직전 등교일 기준 순위 */
function getStats_() {
  const key = `stats_${dataVersion_()}_${todayStr_()}`;
  const hit = CacheService.getScriptCache().get(key);
  return hit ? JSON.parse(hit) : buildDataBundle_().stats;
}

/** 투투 한 명의 기록 요약 (캐시) */
function getStudentHistory_(no) {
  const key = `hist_${dataVersion_()}_${todayStr_()}_${no}`;
  const hit = CacheService.getScriptCache().get(key);
  if (hit) return JSON.parse(hit);
  return buildDataBundle_().hist[no] || { records: [], questDates: [], praiseTo: {}, praiseHidden: {}, praisedNos: [], inbox: [], quest: null };
}

/**
 * 시트를 한 번 읽어 통계·직전 등교일 순위·투투별 기록 요약을 만들고 캐시에 넣는다.
 * 담임 대시보드처럼 원본이 필요한 곳은 반환값의 students/records를 그대로 쓴다.
 */
function buildDataBundle_() {
  ensureSchema_();
  const cfg = getConfig();
  const today = todayStr_();
  const ver = dataVersion_();
  const students = readStudents_();
  const records = readLedger_();

  const stats = computeStats_(students, records);
  const prevDay = cfg.schoolDays.filter((d) => d < today).pop() || null;
  stats.prev = null;
  if (prevDay) {
    const ranks = {};
    computeStats_(students, records, prevDay).list.forEach((s) => (ranks[s.no] = s.rank));
    stats.prev = { date: prevDay, ranks };
  }

  const nameOf = {};
  students.forEach((s) => (nameOf[s.no] = s.name));
  const blank = () => ({ records: [], questDates: [], praiseTo: {}, praiseHidden: {}, praisedNos: [], inbox: [], quest: null });
  const hist = {};
  students.forEach((s) => (hist[s.no] = blank()));
  records.forEach((r) => {
    const h = hist[r.no];
    if (!h || r.cancelled) return;
    h.records.push({ date: r.date, mission: r.mission, score: r.score, period: r.period, subject: r.subject });
    if (r.mission === '일퀘' && r.score > 0) h.questDates.push(r.date);
  });
  readPraise_().forEach((p) => {
    const from = hist[p.from];
    if (from) {
      // 숨긴 칭찬은 칭찬하지 않은 것으로 본다 (같은 친구를 다시 칭찬할 수 있음)
      if (p.hidden) from.praiseHidden[p.date] = true;
      else {
        if (!from.praiseTo[p.date]) from.praiseTo[p.date] = nameOf[p.to] || '';
        from.praisedNos.push(p.to);
      }
    }
    const to = hist[p.to];
    if (to) {
      to.inbox.unshift(p.hidden
        ? { id: p.id, date: p.date, hidden: true }
        : { id: p.id, date: p.date, fromName: nameOf[p.from] || '친구', text: p.text, thanked: p.thanked });
    }
  });
  readQuestRows_().forEach((q) => {
    if (q.date === today && hist[q.no]) hist[q.no].quest = { praiseDone: q.praiseDone, stamped: q.stamped, greet: q.greet, doze: q.doze };
  });

  const put = {};
  put[`stats_${ver}_${today}`] = JSON.stringify(stats);
  Object.keys(hist).forEach((no) => (put[`hist_${ver}_${today}_${no}`] = JSON.stringify(hist[no])));
  try {
    CacheService.getScriptCache().putAll(put, CACHE_TTL_SEC);
  } catch (e) {
    // 캐시 용량 초과 등은 무시 (다음 요청에서 다시 계산)
  }
  return { students, records, stats, hist };
}

/**
 * 투투별 순합계·미션별 합계·차감 합계와 순위.
 * uptoDate('yyyy-MM-dd')를 주면 그 날짜까지의 기록만 센다 (전날 대비 순위 변동용).
 */
function computeStats_(students, records, uptoDate) {
  const map = {};
  const list = students.map((s) => {
    const byMission = {};
    MISSIONS.forEach((m) => (byMission[m] = 0));
    return (map[s.no] = { no: s.no, name: s.name, total: 0, plus: 0, minus: 0, byMission, rank: 0 });
  });
  records.forEach((r) => {
    if (r.cancelled) return;
    if (uptoDate && r.date > uptoDate) return;
    const s = map[r.no];
    if (!s) return;
    s.total += r.score;
    if (r.score < 0) s.minus += r.score;
    else s.plus += r.score;
    if (Object.prototype.hasOwnProperty.call(s.byMission, r.mission)) s.byMission[r.mission] += r.score;
  });
  assignRanks_(list);
  return { list, uptoDate: uptoDate || null, computedAt: Utilities.formatDate(new Date(), TZ, 'yyyy-MM-dd HH:mm:ss') };
}

/** 공동 순위(1, 2, 2, 4 …). list의 각 항목에 rank를 채우고 순위순 배열을 돌려준다. */
function assignRanks_(list) {
  const sorted = list.slice().sort((a, b) => b.total - a.total || Number(a.no) - Number(b.no));
  let prevTotal = null;
  let rank = 0;
  sorted.forEach((s, i) => {
    if (s.total !== prevTotal) {
      rank = i + 1;
      prevTotal = s.total;
    }
    s.rank = rank;
  });
  return sorted;
}

// ===================== Timetable.gs =====================
/**
 * 시간표.
 * - "시간표" 시트: 교시 | 시작시간 | 월 | 화 | 수 | 목 | 금  (빈 칸 = 수업 없음)
 * - "시간표변경" 시트: 날짜 | 1교시 … 7교시 | 메모  — 그 날짜는 이 줄로 하루 전체를 대신한다 (빈 칸 = 수업 없음)
 */

const TIMETABLE_HEADERS = ['교시', '시작시간', '월', '화', '수', '목', '금'];
const TT_OVERRIDE_HEADERS = ['날짜', '1교시', '2교시', '3교시', '4교시', '5교시', '6교시', '7교시', '메모'];
const CLASS_MINUTES = 45;

// 2-2 2학기 시간표 (처음 세팅할 때만 채워짐. 이후에는 시트에서 수정)
const DEFAULT_TIMETABLE = [
  ['1', '09:15', '체육', '기가', '체육', '역사', '음악'],
  ['2', '10:10', '일본어', '도덕', '일본어', '영어', '과학'],
  ['3', '11:05', '국어A', '역사', '영어', '수학', '수학'],
  ['4', '12:00', '영어', '체육', '기가', '과학', '동아리'],
  ['5', '13:40', '수학', '과학', '음악', 'SC', '도덕'],
  ['6', '14:35', '과학', '수학', '국어A', '기가', '역사'],
  ['7', '15:30', '', '국어B', '', '국어A', ''],
];

function getTimetable_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(CACHE_KEYS.TIMETABLE);
  if (hit) return JSON.parse(hit);
  const tt = { periods: [], week: { 1: [], 2: [], 3: [], 4: [], 5: [] }, overrides: {} };
  const sh = ss_().getSheetByName(SHEETS.TIMETABLE);
  if (sh && sh.getLastRow() > 1) {
    sh.getRange(2, 1, sh.getLastRow() - 1, TIMETABLE_HEADERS.length).getValues().forEach((r) => {
      const p = parseInt(r[0], 10);
      if (!p) return;
      tt.periods.push({ period: p, start: toTimeStr_(r[1]) });
      for (let w = 1; w <= 5; w++) tt.week[w][p] = String(r[w + 1]).trim();
    });
  }
  const ov = ss_().getSheetByName(SHEETS.TT_OVERRIDE);
  if (ov && ov.getLastRow() > 1) {
    ov.getRange(2, 1, ov.getLastRow() - 1, TT_OVERRIDE_HEADERS.length).getValues().forEach((r) => {
      const d = toDateStr_(r[0]);
      if (!d) return;
      const subjects = {};
      for (let p = 1; p <= 7; p++) subjects[p] = String(r[p]).trim();
      tt.overrides[d] = { subjects, memo: String(r[8]).trim() };
    });
  }
  tt.periods.sort((a, b) => a.period - b.period);
  cache.put(CACHE_KEYS.TIMETABLE, JSON.stringify(tt), 1800);
  return tt;
}

function toTimeStr_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, TZ, 'HH:mm');
  const m = String(v).trim().match(/^(\d{1,2})[:시.]\s*(\d{2})/);
  return m ? `${('0' + m[1]).slice(-2)}:${m[2]}` : '';
}

function weekdayOf_(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0=일 … 6=토
}

/** 그 날짜의 수업 목록 [{period, subject, start}] (수업 없는 교시는 제외) */
function timetableFor_(dateStr) {
  const tt = getTimetable_();
  const ov = tt.overrides[dateStr];
  const w = weekdayOf_(dateStr);
  return tt.periods
    .map((p) => ({
      period: p.period,
      start: p.start,
      subject: ov ? ov.subjects[p.period] || '' : (tt.week[w] && tt.week[w][p.period]) || '',
    }))
    .filter((p) => p.subject);
}

function timetableMemo_(dateStr) {
  const ov = getTimetable_().overrides[dateStr];
  return ov ? ov.memo : '';
}

/**
 * 지금 시각이 속한 교시 (교과 선생님 화면 자동 선택용).
 * 교시 시작 10분 전부터 다음 교시 시작 10분 전까지를 그 교시로 본다. 수업이 없으면 null.
 */
function currentPeriod_(dateStr, hhmm) {
  const list = timetableFor_(dateStr);
  if (!list.length) return null;
  const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
  const now = toMin(hhmm);
  let found = null;
  list.forEach((p, i) => {
    if (!p.start) return;
    const from = toMin(p.start) - 10;
    const next = list[i + 1] && list[i + 1].start ? toMin(list[i + 1].start) - 10 : toMin(p.start) + CLASS_MINUTES + 10;
    if (now >= from && now < next) found = p;
  });
  return found;
}

// ===================== QuestApi.gs =====================
/**
 * 미션1: 일일퀘스트(칭찬·인사·졸지 않기) + 온라인 칭찬.
 * 모든 규칙 검증은 서버에서, 한 번의 잠금 안에서 한다.
 * - 오늘 날짜 + 등교일만 입력 가능 (서버 시각 기준)
 * - 세 가지를 모두 완료하면 기록장에 "일퀘 +1" 자동 지급 (하루 1개). 지급 뒤에는 체크 변경 불가
 */

const QUEST_HEADERS = ['날짜', '학생번호', '칭찬완료', '인사완료', '졸지않기완료', '도장지급여부', '인사선생님1', '인사선생님2', '교시별졸음', '수정시각'];
const PRAISE_HEADERS = ['타임스탬프', '날짜', '보낸번호', '받은번호', '내용', '숨김여부', '고마워여부', '칭찬ID'];

const bool_ = (v) => v === true || String(v).toUpperCase() === 'TRUE';

// ---------- 시트 읽기/쓰기 ----------

function readQuestRows_() {
  const sh = ss_().getSheetByName(SHEETS.QUEST);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, QUEST_HEADERS.length).getValues().map((r, i) => ({
    row: i + 2,
    date: toDateStr_(r[0]),
    no: String(r[1]).trim(),
    praiseDone: bool_(r[2]),
    greetDone: bool_(r[3]),
    dozeDone: bool_(r[4]),
    stamped: bool_(r[5]),
    greet: [String(r[6]).trim(), String(r[7]).trim()].filter(Boolean),
    doze: parseDoze_(r[8]),
  })).filter((q) => q.date && q.no);
}

/** "1:O,2:X" → {1:'O', 2:'X'}  (O = 안 졸았어요, X = 졸았어요) */
function parseDoze_(v) {
  const out = {};
  String(v || '').split(',').forEach((kv) => {
    const [p, val] = kv.split(':');
    if (p && (val === 'O' || val === 'X')) out[p.trim()] = val;
  });
  return out;
}

function writeQuestRow_(q) {
  const sh = sheet_(SHEETS.QUEST);
  const dozeStr = Object.keys(q.doze).sort((a, b) => a - b).map((p) => `${p}:${q.doze[p]}`).join(',');
  const row = [q.date, q.no, q.praiseDone, q.greetDone, q.dozeDone, q.stamped, q.greet[0] || '', q.greet[1] || '', dozeStr, new Date()];
  const r = q.row || sh.getLastRow() + 1;
  sh.getRange(r, 1, 1, QUEST_HEADERS.length).setValues([row]);
  q.row = r;
}

function readPraise_() {
  const sh = ss_().getSheetByName(SHEETS.PRAISE);
  if (!sh || sh.getLastRow() < 2) return [];
  return sh.getRange(2, 1, sh.getLastRow() - 1, PRAISE_HEADERS.length).getValues().map((r, i) => ({
    row: i + 2,
    ts: r[0] instanceof Date ? Utilities.formatDate(r[0], TZ, 'yyyy-MM-dd HH:mm') : String(r[0]),
    date: toDateStr_(r[1]),
    from: String(r[2]).trim(),
    to: String(r[3]).trim(),
    text: String(r[4]),
    hidden: bool_(r[5]),
    thanked: bool_(r[6]),
    id: String(r[7]).trim() || 'ROW' + (i + 2),
  })).filter((p) => p.date && p.from);
}

// ---------- 공통 ----------

function questToday_() {
  const cfg = getConfig();
  const today = todayStr_();
  if (cfg.schoolDays.indexOf(today) < 0) throw new Error('오늘은 캠페인 등교일이 아니에요.');
  return today;
}

/** 오늘 졸지 않기 체크 대상 교시 (시간표가 비어 있으면 1~교시 수) */
function dozePeriods_(today) {
  const list = timetableFor_(today);
  if (list.length) return list;
  const n = getConfig().periodCount;
  return Array.from({ length: n }, (_, i) => ({ period: i + 1, subject: '', start: '' }));
}

function dozeStatus_(q, today) {
  const periods = dozePeriods_(today);
  const allowed = getConfig().dozeAllowed;
  const answered = periods.filter((p) => q.doze[p.period]).length;
  const dozed = periods.filter((p) => q.doze[p.period] === 'X').length;
  return { total: periods.length, answered, dozed, allowed, done: answered === periods.length && dozed <= allowed, failed: dozed > allowed };
}

/**
 * 오늘 퀘스트 행을 잠금 안에서 바꾸고, 세 가지가 다 되면 도장 +1 지급.
 * mutate(q)에서 규칙 위반이면 throw.
 */
function updateQuest_(me, mutate, opts) {
  const today = questToday_();
  ensureSchema_();
  return withLock_(() => {
    const rows = readQuestRows_();
    let q = rows.find((r) => r.date === today && r.no === me.no);
    if (!q) q = { row: null, date: today, no: me.no, praiseDone: false, greetDone: false, dozeDone: false, stamped: false, greet: [], doze: {} };
    if (q.stamped && !(opts && opts.allowAfterStamp)) throw new Error('오늘 일퀘 도장을 이미 받았어요. 체크를 바꿀 수 없어요.');
    mutate(q, today);
    q.greetDone = q.greet.length >= 2 && q.greet[0] !== q.greet[1];
    q.dozeDone = dozeStatus_(q, today).done;
    let stampedNow = false;
    if (!q.stamped && q.praiseDone && q.greetDone && q.dozeDone) {
      appendRecords_([{ date: today, no: me.no, mission: '일퀘', score: 1, inputType: '학생', inputBy: '자동', memo: '일퀘 3가지 완료' }]);
      q.stamped = true;
      stampedNow = true;
    }
    writeQuestRow_(q);
    invalidateStats_();
    return stampedNow;
  });
}

// ---------- 인사 ----------

function questGreet(token, teacherName) {
  const me = requireStudent_(token);
  const name = String(teacherName || '').replace(/\s+/g, ' ').trim();
  if (!name) throw new Error('인사한 선생님 이름을 입력해 주세요.');
  if (name.length > 20) throw new Error('선생님 이름은 20자 이내로 입력해 주세요.');
  const stamped = updateQuest_(me, (q) => {
    if (q.greet.length >= 2) throw new Error('오늘 인사 2회를 이미 모두 기록했어요.');
    if (q.greet.indexOf(name) >= 0) throw new Error('서로 다른 선생님 2분께 인사해야 해요.');
    q.greet.push(name);
  });
  return withNotice_(buildStudentHome_(me), stamped);
}

function questUngreet(token, index) {
  const me = requireStudent_(token);
  updateQuest_(me, (q) => {
    const i = Number(index);
    if (!(i >= 0 && i < q.greet.length)) throw new Error('지울 인사 기록이 없어요.');
    q.greet.splice(i, 1);
  });
  return buildStudentHome_(me);
}

// ---------- 졸지 않기 ----------

/** val: 'O'(안 졸았어요) | 'X'(졸았어요) | ''(선택 취소) */
function questDoze(token, period, val) {
  const me = requireStudent_(token);
  const v = String(val || '');
  if (['O', 'X', ''].indexOf(v) < 0) throw new Error('잘못된 값이에요.');
  const stamped = updateQuest_(me, (q, today) => {
    const p = String(parseInt(period, 10));
    if (!dozePeriods_(today).some((x) => String(x.period) === p)) throw new Error('오늘 시간표에 없는 교시예요.');
    if (v) q.doze[p] = v;
    else delete q.doze[p];
  });
  return withNotice_(buildStudentHome_(me), stamped);
}

// ---------- 칭찬 ----------

/** 금지어 비교용: 띄어쓰기·숫자·기호를 없애서 "시 발", "ㅅ.ㅂ" 같은 우회도 잡는다 */
function normalizeForBan_(s) {
  return String(s).toLowerCase().replace(/[^가-힣ㄱ-ㅎㅏ-ㅣa-z]/g, '');
}

function containsBanned_(text, words) {
  const t = normalizeForBan_(text);
  return words.some((w) => {
    const nw = normalizeForBan_(w);
    return nw && t.indexOf(nw) >= 0;
  });
}

function praiseSubmit(token, toNo, text) {
  const me = requireStudent_(token);
  const cfg = getConfig();
  const to = String(toNo || '').trim();
  const body = String(text || '').replace(/\s+/g, ' ').trim();
  const len = body.replace(/\s/g, '').length;
  if (!to) throw new Error('칭찬할 친구를 골라 주세요.');
  if (to === me.no) throw new Error('자기 자신은 칭찬할 수 없어요.');
  if (len < cfg.praiseMinLength) throw new Error(`칭찬은 ${cfg.praiseMinLength}자 이상 써 주세요. (지금 ${len}자)`);
  if (body.length > 200) throw new Error('칭찬은 200자 이내로 써 주세요.');
  if (containsBanned_(body, cfg.bannedWords)) throw new Error('바른 언어로 다시 써볼까요? 🙂');
  if (!getStudentsCached_().some((s) => s.no === to)) throw new Error('없는 친구예요.');

  const stamped = updateQuest_(me, (q, today) => {
    const all = readPraise_().filter((p) => !p.hidden);
    if (all.some((p) => p.from === me.no && p.date === today)) throw new Error('오늘은 이미 칭찬했어요. 칭찬은 하루 1번!');
    if (all.some((p) => p.from === me.no && p.to === to)) throw new Error('이미 칭찬한 친구예요. 다른 친구를 칭찬해 볼까요?');
    const id = 'P' + Date.now().toString(36).toUpperCase() + Math.floor(Math.random() * 1296).toString(36).toUpperCase();
    const sh = sheet_(SHEETS.PRAISE);
    sh.getRange(sh.getLastRow() + 1, 1, 1, PRAISE_HEADERS.length).setValues([[new Date(), today, me.no, to, body, false, false, id]]);
    q.praiseDone = true;
  });
  return withNotice_(buildStudentHome_(me), stamped, '칭찬을 보냈어요! 💌');
}

function praiseThank(token, id) {
  const me = requireStudent_(token);
  withLock_(() => {
    const p = readPraise_().find((x) => x.id === String(id));
    if (!p || p.to !== me.no || p.hidden) throw new Error('담임 선생님이 숨긴 칭찬이에요.');
    if (p.thanked) return;
    sheet_(SHEETS.PRAISE).getRange(p.row, 7).setValue(true);
    invalidateStats_();
  });
  return buildStudentHome_(me);
}

/**
 * 담임이 칭찬을 숨기거나 다시 보이게 할 때 보낸 투투의 그날 퀘스트를 다시 맞춘다.
 * 숨김: 칭찬 미션 미완료 + 이미 받은 일퀘 도장 자동 취소
 * 해제: 칭찬 미션 완료 + 나머지 두 가지가 되어 있으면 도장 다시 지급
 */
function syncPraiseQuest_(p, hidden) {
  withLock_(() => {
    const q = readQuestRows_().find((r) => r.date === p.date && r.no === p.from);
    if (!q) return;
    if (hidden) {
      // 같은 날 숨기지 않은 다른 칭찬이 있으면 미션은 그대로 인정
      const other = readPraise_().some((x) => x.id !== p.id && x.from === p.from && x.date === p.date && !x.hidden);
      if (other) return;
      q.praiseDone = false;
      if (q.stamped) {
        readLedger_()
          .filter((r) => !r.cancelled && r.mission === '일퀘' && r.no === p.from && r.date === p.date && r.score > 0)
          .forEach((r) => cancelRecord_(r.id, '칭찬 숨김으로 칭찬 미션 미인정', '담임'));
        q.stamped = false;
      }
    } else {
      q.praiseDone = true;
      q.greetDone = q.greet.length >= 2 && q.greet[0] !== q.greet[1];
      q.dozeDone = dozeStatus_(q, p.date).done;
      if (!q.stamped && q.greetDone && q.dozeDone) {
        appendRecords_([{ date: p.date, no: p.from, mission: '일퀘', score: 1, inputType: '시스템', inputBy: '담임 숨김 해제', memo: '일퀘 3가지 완료' }]);
        q.stamped = true;
      }
    }
    writeQuestRow_(q);
    invalidateStats_();
  });
}

function withNotice_(home, stamped, msg) {
  home.notice = stamped ? '🎉 일퀘 3가지 완료! 도장 +1' : msg || '';
  return home;
}

// ===================== Auth.gs =====================
/**
 * 코드 로그인 → 서버가 발급한 토큰으로 이후 요청을 검증한다.
 * - 담임: CacheService에 6시간 보관하는 무작위 토큰
 * - 투투: 서버 비밀키로 서명한 토큰. 캠페인 종료 2주 뒤까지 유지되고,
 *         담임이 로그인 코드를 재발급하면 그 투투의 기존 토큰은 바로 무효가 된다.
 */

const TOKEN_TTL_SEC = 21600;
const LOGIN_FAIL_LIMIT = 10; // 10분에 10회 실패하면 잠시 차단
const LOGIN_FAIL_WINDOW_SEC = 600;

function issueToken_(session) {
  const token = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '').slice(0, 8);
  CacheService.getScriptCache().put('tok_' + token, JSON.stringify(session), TOKEN_TTL_SEC);
  return token;
}

function readToken_(token) {
  if (!token || typeof token !== 'string' || token.length > 64) return null;
  const v = CacheService.getScriptCache().get('tok_' + token);
  return v ? JSON.parse(v) : null;
}

function logout(token) {
  if (token && typeof token === 'string') CacheService.getScriptCache().remove('tok_' + token);
  return true;
}

function requireAdmin_(token) {
  const s = readToken_(token);
  if (!s || s.role !== 'admin') throw new Error('AUTH: 다시 로그인해 주세요.');
  return s;
}

function checkLoginRate_(bucket, limit) {
  const n = Number(CacheService.getScriptCache().get('fail_' + bucket) || 0);
  if (n >= (limit || LOGIN_FAIL_LIMIT)) throw new Error('로그인 실패가 너무 많아요. 10분 뒤 다시 시도해 주세요.');
}

function recordLoginFail_(bucket) {
  const cache = CacheService.getScriptCache();
  const n = Number(cache.get('fail_' + bucket) || 0) + 1;
  cache.put('fail_' + bucket, String(n), LOGIN_FAIL_WINDOW_SEC);
  Utilities.sleep(700);
}

function loginAdmin_(code) {
  checkLoginRate_('admin');
  const cfg = getConfig();
  if (!cfg.adminCode) throw new Error('담임 코드가 설정되지 않았어요. 설정 시트를 확인해 주세요.');
  if (String(code || '').trim() !== cfg.adminCode) {
    recordLoginFail_('admin');
    throw new Error('담임 코드가 올바르지 않아요.');
  }
  return issueToken_({ role: 'admin' });
}

// ---------- 투투 (서명 토큰) ----------

const STUDENT_FAIL_LIMIT = 5; // 번호별 10분에 5회

function tokenSecret_() {
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('TOKEN_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('TOKEN_SECRET', secret);
  }
  return secret;
}

function hmac_(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(text, tokenSecret_())).replace(/=+$/, '');
}

/** 로그인 코드 지문 (코드 재발급 시 토큰 무효화용) */
function codeFingerprint_(code) {
  return hmac_('code:' + code).slice(0, 10);
}

function signToken_(payload) {
  const body = Utilities.base64EncodeWebSafe(JSON.stringify(payload)).replace(/=+$/, '');
  return body + '.' + hmac_(body);
}

function verifySignedToken_(token) {
  if (!token || typeof token !== 'string' || token.length > 400) return null;
  const parts = token.split('.');
  if (parts.length !== 2 || hmac_(parts[0]) !== parts[1]) return null;
  try {
    const json = Utilities.newBlob(Utilities.base64DecodeWebSafe(parts[0])).getDataAsString();
    const p = JSON.parse(json);
    if (!p.exp || Date.now() > p.exp) return null;
    return p;
  } catch (e) {
    return null;
  }
}

function loginStudent_(no, code) {
  const n = String(no || '').trim();
  const c = String(code || '').trim();
  if (!n || !c) throw new Error('번호와 코드를 모두 입력해 주세요.');
  if (!/^\d{1,3}$/.test(n)) throw new Error('번호는 숫자로 입력해 주세요.');
  checkLoginRate_('stu_' + n, STUDENT_FAIL_LIMIT);
  const s = getStudentsCached_().find((x) => x.no === n || Number(x.no) === Number(n));
  if (!s || !s.code || s.code !== c) {
    recordLoginFail_('stu_' + n);
    throw new Error('번호 또는 코드가 맞지 않아요.');
  }
  const cfg = getConfig();
  const end = cfg.endDate ? new Date(cfg.endDate + 'T23:59:59+09:00').getTime() : Date.now();
  const exp = Math.max(end, Date.now()) + 14 * 86400000;
  return signToken_({ r: 's', no: s.no, f: codeFingerprint_(s.code), exp });
}

/** 투투 토큰 검증 → 학생 정보 (로그인 코드 제외) */
function requireStudent_(token) {
  const p = verifySignedToken_(token);
  if (!p || p.r !== 's') throw new Error('AUTH: 다시 로그인해 주세요.');
  const s = getStudentsCached_().find((x) => x.no === p.no);
  if (!s || !s.code || codeFingerprint_(s.code) !== p.f) throw new Error('AUTH: 로그인 코드가 바뀌었어요. 새 코드로 다시 로그인해 주세요.');
  return { no: s.no, name: s.name };
}

// ===================== Setup.gs =====================
/**
 * 스프레드시트 메뉴, 시트 초기 세팅, 로그인 코드 발급.
 * 담임은 스프레드시트 상단 [🚀 캠페인] 메뉴에서 실행한다.
 */

/** 시트 정의 (다른 파일의 상수를 쓰므로 함수로 늦게 만든다) */
function sheetDefs_() {
  return [
  { name: SHEETS.CONFIG, headers: ['항목', '값', '설명'], textCols: [2], widths: [170, 420, 320] },
  { name: SHEETS.STUDENTS, headers: STUDENT_HEADERS, textCols: [1, 3], widths: [60, 100, 90] },
  { name: SHEETS.LEDGER, headers: LEDGER_HEADERS, textCols: [2, 3, 12] },
  { name: SHEETS.QUEST, headers: QUEST_HEADERS, textCols: [1, 2, 7, 8, 9] },
  { name: SHEETS.PRAISE, headers: PRAISE_HEADERS, textCols: [2, 3, 4, 8], widths: [140, 90, 70, 70, 360, 70, 70, 120] },
  { name: SHEETS.SPY, headers: ['주차', '학생번호', '시작일', '종료일', '상태'], textCols: [2, 3, 4] },
  { name: SHEETS.SPY_JUDGE, headers: ['날짜', '암행어사번호', '바른1위', '바른2위', '바른3위', '나쁜1위', '나쁜2위', '나쁜3위'], textCols: [1, 2, 3, 4, 5, 6, 7, 8] },
  { name: SHEETS.ACCUSE, headers: ['타임스탬프', '지목한번호', '지목된번호', '결과'], textCols: [2, 3] },
  { name: SHEETS.DRAW, headers: ['학생번호', '일퀘올클여부', '도장12개여부', '뽑기횟수', '뽑기완료횟수'], textCols: [1] },
  { name: SHEETS.TIMETABLE, headers: TIMETABLE_HEADERS, textCols: [1, 2, 3, 4, 5, 6, 7], widths: [60, 80, 80, 80, 80, 80, 80] },
  { name: SHEETS.TT_OVERRIDE, headers: TT_OVERRIDE_HEADERS, textCols: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  ];
}

/**
 * 시트가 없으면 만들고, 헤더가 예전 버전(앞부분만 있음)이면 새 열 이름을 이어 붙인다.
 * 웹앱 요청에서도 호출되므로 6시간에 한 번만 실제로 검사한다.
 */
function ensureSchema_(force) {
  const cache = CacheService.getScriptCache();
  if (!force && cache.get('schema_ok_v3')) return;
  const ss = ss_();
  sheetDefs_().forEach((def) => {
    let sh = ss.getSheetByName(def.name);
    let created = false;
    if (!sh) {
      sh = ss.insertSheet(def.name);
      created = true;
    }
    const n = def.headers.length;
    const first = sh.getRange(1, 1, 1, n).getValues()[0].map((v) => String(v).trim());
    const filled = first.filter((v) => v !== '').length;
    const isPrefix = first.slice(0, filled).every((v, i) => v === def.headers[i]);
    if (filled === 0 || (isPrefix && filled < n)) {
      sh.getRange(1, 1, 1, n).setValues([def.headers]);
      sh.getRange(1, 1, 1, n).setFontWeight('bold').setBackground('#13294b').setFontColor('#ffffff');
      sh.setFrozenRows(1);
      const rows = Math.max(sh.getMaxRows() - 1, 1);
      (def.textCols || []).forEach((c) => sh.getRange(2, c, rows, 1).setNumberFormat('@'));
    }
    if (def.name === SHEETS.TIMETABLE && sh.getLastRow() < 2) {
      sh.getRange(2, 1, DEFAULT_TIMETABLE.length, TIMETABLE_HEADERS.length).setValues(DEFAULT_TIMETABLE);
    }
    if (created) (def.widths || []).forEach((w, i) => sh.setColumnWidth(i + 1, w));
  });
  cache.put('schema_ok_v3', '1', 21600);
}

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🚀 캠페인')
    .addItem('시트 초기 세팅', 'setupSheets')
    .addItem('빈 로그인 코드 채우기', 'fillMissingLoginCodes')
    .addItem('선택한 학생 로그인 코드 재발급', 'reissueSelectedLoginCodes')
    .addSeparator()
    .addItem('웹앱 주소 보기', 'showWebAppUrls')
    .addItem('캐시 비우기 (시트를 직접 고친 뒤)', 'clearAllCaches')
    .addToUi();
}

/** 담임이 시트를 직접 고치면 캐시를 비워 웹앱에 바로 반영한다. */
function onEdit(e) {
  try {
    const name = e && e.range && e.range.getSheet().getName();
    if ([SHEETS.CONFIG, SHEETS.STUDENTS, SHEETS.LEDGER, SHEETS.QUEST, SHEETS.PRAISE, SHEETS.TIMETABLE, SHEETS.TT_OVERRIDE].indexOf(name) >= 0) clearAllCaches_();
  } catch (err) {
    // 단순 트리거에서는 조용히 무시
  }
}

function setupSheets() {
  const ss = SpreadsheetApp.getActive();
  PropertiesService.getScriptProperties().setProperty('SS_ID', ss.getId());

  const studentsCreated = !ss.getSheetByName(SHEETS.STUDENTS);
  ensureSchema_(true);
  sheetDefs_().forEach((def) => {
    const sh = ss.getSheetByName(def.name);
    sh.getRange(1, 1, 1, def.headers.length).setFontWeight('bold').setBackground('#13294b').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    const rows = Math.max(sh.getMaxRows() - 1, 1);
    (def.textCols || []).forEach((c) => sh.getRange(2, c, rows, 1).setNumberFormat('@'));
    (def.widths || []).forEach((w, i) => sh.setColumnWidth(i + 1, w));
  });

  // 기본 시트(Sheet1/시트1)가 비어 있으면 정리
  ['Sheet1', '시트1'].forEach((n) => {
    const sh = ss.getSheetByName(n);
    if (sh && sh.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(sh);
  });

  // 설정: 없는 항목만 기본값으로 채움 (담임이 고친 값은 건드리지 않음)
  const cfgSheet = ss.getSheetByName(SHEETS.CONFIG);
  const last = cfgSheet.getLastRow();
  const existing = last > 1 ? cfgSheet.getRange(2, 1, last - 1, 2).getValues() : [];
  const labels = existing.map((r) => String(r[0]).trim());
  const toAppend = [];
  CONFIG_DEFS.forEach((d) => {
    const i = labels.indexOf(d.label);
    let value = i >= 0 ? existing[i][1] : toSheetValue_(d, d.def);
    if (d.key === 'teacherCode' && String(value).trim() === '') value = randomCode_(4);
    if (d.key === 'adminCode' && String(value).trim() === '') value = randomCode_(6);
    if (i < 0) toAppend.push([d.label, value, d.desc]);
    else if (String(existing[i][1]).trim() === '' && value !== '') cfgSheet.getRange(i + 2, 2).setValue(value);
  });
  if (toAppend.length) cfgSheet.getRange(cfgSheet.getLastRow() + 1, 1, toAppend.length, 3).setValues(toAppend);

  if (studentsCreated) {
    ss.getSheetByName(SHEETS.STUDENTS).getRange(2, 1, 3, 3).setValues([
      ['1', '예시투투1', ''],
      ['2', '예시투투2', ''],
      ['3', '예시투투3', ''],
    ]);
  }
  const filled = fillMissingLoginCodes_();
  clearAllCaches_();

  const cfg = readConfigFromSheet_();
  alert_(
    '시트 초기 세팅 완료!\n\n' +
      `담임 코드: ${cfg.adminCode}\n교과 선생님 코드: ${cfg.teacherCode}\n` +
      `로그인 코드 새로 발급: ${filled}명\n\n` +
      '학생 시트에 반 명단(번호·이름)을 붙여 넣은 뒤 [빈 로그인 코드 채우기]를 실행하세요.'
  );
}

function fillMissingLoginCodes() {
  const n = fillMissingLoginCodes_();
  clearAllCaches_();
  alert_(`로그인 코드 ${n}개를 새로 채웠어요.`);
}

function fillMissingLoginCodes_() {
  const sh = SpreadsheetApp.getActive().getSheetByName(SHEETS.STUDENTS);
  if (!sh || sh.getLastRow() < 2) return 0;
  const range = sh.getRange(2, 1, sh.getLastRow() - 1, 3);
  const values = range.getValues();
  const used = new Set(values.map((r) => String(r[2]).trim()).filter(Boolean));
  let count = 0;
  values.forEach((r) => {
    if (String(r[1]).trim() && !String(r[2]).trim()) {
      r[2] = uniqueCode_(used);
      count++;
    }
  });
  if (count) sh.getRange(2, 3, values.length, 1).setValues(values.map((r) => [r[2]]));
  return count;
}

function reissueSelectedLoginCodes() {
  const ss = SpreadsheetApp.getActive();
  const sh = ss.getActiveSheet();
  if (sh.getName() !== SHEETS.STUDENTS) return alert_('학생 시트에서 재발급할 학생의 행을 선택한 뒤 실행해 주세요.');
  const sel = sh.getActiveRange();
  const top = Math.max(sel.getRow(), 2);
  const bottom = sel.getLastRow();
  if (bottom < top) return alert_('학생 행을 선택해 주세요.');
  const ui = SpreadsheetApp.getUi();
  if (ui.alert(`${top}~${bottom}행 학생의 로그인 코드를 새로 발급할까요?`, ui.ButtonSet.OK_CANCEL) !== ui.Button.OK) return;
  const all = sh.getRange(2, 3, sh.getLastRow() - 1, 1).getValues().map((r) => String(r[0]).trim());
  const used = new Set(all.filter(Boolean));
  const range = sh.getRange(top, 1, bottom - top + 1, 3);
  const values = range.getValues();
  values.forEach((r) => {
    if (String(r[1]).trim()) r[2] = uniqueCode_(used);
  });
  sh.getRange(top, 3, values.length, 1).setValues(values.map((r) => [r[2]]));
  clearAllCaches_();
  alert_('재발급 완료! 새 코드를 해당 학생에게 알려 주세요.');
}

function showWebAppUrls() {
  const url = ScriptApp.getService().getUrl();
  if (!url) return alert_('아직 웹앱으로 배포되지 않았어요. README의 배포 방법을 참고해 주세요.');
  alert_(`투투 화면:\n${url}\n\n교과 선생님 화면:\n${url}?page=teacher\n\n담임 대시보드:\n${url}?page=admin`);
}

function clearAllCaches() {
  clearAllCaches_();
  alert_('캐시를 비웠어요. 웹앱에 바로 반영됩니다.');
}

function clearAllCaches_() {
  CacheService.getScriptCache().removeAll([CACHE_KEYS.CONFIG, CACHE_KEYS.STUDENTS, CACHE_KEYS.TIMETABLE, 'schema_ok_v3']);
  invalidateStats_();
}

/** 첫 자리가 0이 아닌 n자리 숫자 코드 (시트에서 앞자리 0이 사라지는 문제 방지) */
function randomCode_(n) {
  const min = Math.pow(10, n - 1);
  return String(min + Math.floor(Math.random() * (9 * min)));
}

function uniqueCode_(used) {
  for (let i = 0; i < 1000; i++) {
    const c = randomCode_(4);
    if (!used.has(c)) {
      used.add(c);
      return c;
    }
  }
  throw new Error('코드를 만들 수 없어요.');
}

function alert_(msg) {
  try {
    SpreadsheetApp.getUi().alert(msg);
  } catch (e) {
    Logger.log(msg);
  }
}

// ===================== StudentApi.gs =====================
/**
 * 투투 화면 서버 함수.
 * 다른 투투의 상세 기록·순위(상위 N 제외)·입력자 정보는 절대 내려보내지 않는다.
 */

// 투투 화면에서 보이는 미션 묶음
const STUDENT_GROUPS = [
  { key: 'quest', label: '일일퀘스트', icon: '✅', missions: ['일퀘'] },
  { key: 'judge', label: '암행어사 판정', icon: '🕵️', missions: ['암행어사판정'] },
  { key: 'class', label: '수업', icon: '📒', missions: ['수업참여', 'MVP'] },
  { key: 'group', label: '단체', icon: '🤝', missions: ['단체'] },
  { key: 'etc', label: '기타', icon: '✨', missions: ['암행어사활동', '검거이전', '수동'] },
];

function studentLogin(no, code) {
  return { token: loginStudent_(no, code) };
}

function studentGetHome(token) {
  const me = requireStudent_(token);
  return buildStudentHome_(me);
}

/** 기록장 한 줄 → 투투에게 보이는 이름 (누가 줬는지는 숨김) */
function studentLabel_(r) {
  const cls = [r.period && r.period + '교시', r.subject].filter(Boolean).join(' ');
  switch (r.mission) {
    case '일퀘': return '일일퀘스트 완료';
    case '암행어사판정': return '암행어사 판정';
    case '암행어사활동': return '암행어사 활동 보상';
    case '수업참여': return '수업 적극 참여' + (cls ? ` · ${cls}` : '');
    case 'MVP': return '수업 MVP' + (cls ? ` · ${cls}` : '');
    case '단체': return '단체 도장';
    case '검거이전': return r.score > 0 ? '암행어사 검거 성공' : '암행어사 검거됨';
    case '수동': return '선생님 도장';
    default: return r.mission;
  }
}

function buildStudentHome_(me) {
  const cfg = getConfig();
  const today = todayStr_();
  const stats = getStats_();
  const hist = getStudentHistory_(me.no);
  const mine = stats.list.find((s) => s.no === me.no) || { total: 0, rank: 0, byMission: {} };

  // 랭킹: 잠금이면 아무 순위도 보내지 않음. 공동 순위로 상위 N위 안이면 모두 공개
  let ranking;
  if (cfg.rankLocked) {
    ranking = { locked: true };
  } else {
    const top = stats.list
      .filter((s) => s.rank <= cfg.rankPublicCount && s.total > 0) // 도장 0개는 공개하지 않음
      .sort((a, b) => a.rank - b.rank || Number(a.no) - Number(b.no))
      .map((s) => ({ rank: s.rank, name: s.name, total: s.total, isMe: s.no === me.no }));
    const prevRank = stats.prev && stats.prev.ranks[me.no];
    ranking = {
      locked: false,
      publicCount: cfg.rankPublicCount,
      top,
      myRank: mine.rank,
      myDelta: prevRank ? prevRank - mine.rank : null, // 양수 = 순위 상승
      prevDate: stats.prev ? stats.prev.date : null,
      classSize: stats.list.length,
    };
  }

  const groups = STUDENT_GROUPS.map((g) => ({
    key: g.key, label: g.label, icon: g.icon,
    total: g.missions.reduce((sum, m) => sum + (mine.byMission[m] || 0), 0),
  })).filter((g) => g.key !== 'etc' || g.total !== 0);

  const records = hist.records
    .map((r) => ({ date: r.date, label: studentLabel_(r), score: r.score, mission: r.mission, period: r.period, subject: r.subject }))
    .reverse();

  // 일퀘판: 등교일마다 O / X / 오늘 / 예정
  const questSet = new Set(hist.questDates);
  const questBoard = cfg.schoolDays.map((d, i) => ({
    date: d,
    day: i + 1,
    state: questSet.has(d) ? 'O' : d < today ? 'X' : d === today ? 'today' : 'future',
    friend: hist.praiseTo[d] || '',
    friendHidden: !hist.praiseTo[d] && !!hist.praiseHidden[d],
  }));

  // 연속 달성: 오늘 아직 안 했으면 어제부터 거꾸로 센다
  let streak = 0;
  const past = cfg.schoolDays.filter((d) => d <= today);
  for (let i = past.length - 1; i >= 0; i--) {
    if (questSet.has(past[i])) streak++;
    else if (past[i] === today) continue;
    else break;
  }

  // 오늘의 시간표·퀘스트
  const isSchoolDay = cfg.schoolDays.indexOf(today) >= 0;
  const q = hist.quest || { praiseDone: false, stamped: false, greet: [], doze: {} };
  const dz = dozeStatus_(q, today);
  const sentToday = hist.praiseTo[today];
  const praised = new Set(hist.praisedNos);
  const todayQuest = {
    available: isSchoolDay,
    stamped: q.stamped || questSet.has(today),
    praise: { done: !!sentToday, toName: sentToday || '', hidden: !!hist.praiseHidden[today] && !sentToday },
    greet: { list: q.greet, done: q.greet.length >= 2 && q.greet[0] !== q.greet[1] },
    doze: {
      periods: dozePeriods_(today).map((p) => ({ period: p.period, subject: p.subject, val: q.doze[p.period] || '' })),
      answered: dz.answered, dozed: dz.dozed, allowed: dz.allowed, done: dz.done, failed: dz.failed,
    },
  };
  const friends = getStudentsCached_()
    .filter((s) => s.no !== me.no)
    .map((s) => ({ no: s.no, name: s.name, praised: praised.has(s.no) }));

  const allClear = cfg.schoolDays.length > 0 && cfg.schoolDays.every((d) => questSet.has(d));
  const stampGoal = mine.total >= cfg.drawStampThreshold;

  return {
    me: { no: me.no, name: me.name },
    nickname: cfg.nickname,
    today,
    dayIndex: schoolDayIndex_(cfg, today),
    dayCount: cfg.schoolDays.length,
    total: mine.total,
    ranking,
    groups,
    minusTotal: mine.minus || 0,
    records,
    questBoard,
    streak,
    draw: {
      threshold: cfg.drawStampThreshold,
      toGoal: Math.max(0, cfg.drawStampThreshold - mine.total),
      stampGoal,
      allClear,
      tickets: (stampGoal ? 1 : 0) + (allClear ? 1 : 0),
    },
    classSigns: hist.records
      .filter((r) => r.mission === '수업참여' || r.mission === 'MVP')
      .map((r) => ({ date: r.date, period: r.period, subject: r.subject, mvp: r.mission === 'MVP', score: r.score })),
    timetable: timetableFor_(today),
    timetableMemo: timetableMemo_(today),
    todayQuest,
    friends,
    teachers: cfg.teacherList.map((t) => t.name),
    praiseMinLength: cfg.praiseMinLength,
    inbox: hist.inbox,
    serverTime: Utilities.formatDate(new Date(), TZ, 'HH:mm:ss'),
  };
}

// ===================== AdminApi.gs =====================
/**
 * 담임 대시보드 서버 함수. 로그인 외 모든 함수는 담임 토큰을 검증한다.
 * 변경 함수는 갱신된 대시보드 데이터를 그대로 돌려준다.
 */

function adminLogin(code) {
  return { token: loginAdmin_(code) };
}

function adminGetDashboard(token) {
  requireAdmin_(token);
  return buildAdminDashboard_();
}

/** 캐시를 비우고 시트에서 다시 읽기 (시트를 직접 고친 뒤) */
function adminRefresh(token) {
  requireAdmin_(token);
  clearAllCaches_();
  return buildAdminDashboard_();
}

/**
 * 수동 도장 추가/차감. payload: {studentNos: string[], score: number, date: 'yyyy-MM-dd', reason: string}
 */
function adminAddManual(token, payload) {
  requireAdmin_(token);
  const p = payload || {};
  const score = Number(p.score);
  const reason = String(p.reason || '').trim();
  const date = toDateStr_(p.date || todayStr_());
  if (!Number.isInteger(score) || score === 0) throw new Error('점수는 0이 아닌 정수로 입력해 주세요.');
  if (Math.abs(score) > 50) throw new Error('한 번에 ±50점까지만 입력할 수 있어요.');
  if (!reason) throw new Error('사유를 꼭 입력해 주세요.');
  if (reason.length > 200) throw new Error('사유는 200자 이내로 입력해 주세요.');
  if (!date) throw new Error('날짜 형식이 올바르지 않아요.');

  const valid = new Set(readStudents_().map((s) => s.no));
  const nos = Array.from(new Set((p.studentNos || []).map(String)));
  if (!nos.length) throw new Error('학생을 한 명 이상 선택해 주세요.');
  const bad = nos.filter((n) => !valid.has(n));
  if (bad.length) throw new Error('없는 학생 번호: ' + bad.join(', '));

  appendRecords_(nos.map((no) => ({
    date, no, mission: '수동', score, inputType: '담임', inputBy: '담임', memo: reason,
  })));
  return buildAdminDashboard_();
}

function adminCancelRecord(token, id, reason) {
  requireAdmin_(token);
  const r = String(reason || '').trim();
  if (!r) throw new Error('취소 사유를 꼭 입력해 주세요.');
  if (r.length > 200) throw new Error('사유는 200자 이내로 입력해 주세요.');
  cancelRecord_(String(id), r, '담임');
  return buildAdminDashboard_();
}

function adminSetRankLock(token, locked) {
  requireAdmin_(token);
  setConfigValue_('rankLocked', !!locked);
  return buildAdminDashboard_();
}

/** 칭찬 숨김/해제 (숨기면 받은 칭찬함에서 사라짐. 일퀘 인정 여부는 기록장에서 따로 처리) */
function adminSetPraiseHidden(token, id, hidden) {
  requireAdmin_(token);
  withLock_(() => {
    const p = readPraise_().find((x) => x.id === String(id));
    if (!p) throw new Error('칭찬을 찾을 수 없어요.');
    if (p.hidden === !!hidden) return;
    sheet_(SHEETS.PRAISE).getRange(p.row, 6).setValue(!!hidden);
    syncPraiseQuest_(p, !!hidden);
    invalidateStats_();
  });
  return buildAdminDashboard_();
}

function buildAdminDashboard_() {
  const cfg = getConfig();
  const { students, records, stats } = buildDataBundle_();

  const nameOf = {};
  students.forEach((s) => (nameOf[s.no] = s.name));
  const today = todayStr_();

  // 담임이 확인할 데이터 문제
  const warnings = [];
  const seen = {};
  students.forEach((s) => {
    if (seen[s.no]) warnings.push(`학생 번호 ${s.no}이(가) 중복돼요.`);
    seen[s.no] = true;
    if (!s.code) warnings.push(`${s.no}번 ${s.name}의 로그인 코드가 비어 있어요.`);
  });
  const unknown = Array.from(new Set(records.filter((r) => r.no && !nameOf[r.no]).map((r) => r.no)));
  if (unknown.length) warnings.push(`기록장에 학생 시트에 없는 번호가 있어요: ${unknown.join(', ')}`);
  if (!cfg.adminCode) warnings.push('담임 코드가 비어 있어요.');

  const ledger = records.slice(-500).reverse().map((r) => ({
    id: r.id, ts: r.ts, date: r.date, no: r.no, name: nameOf[r.no] || '(알 수 없음)',
    mission: r.mission, score: r.score, inputType: r.inputType, inputBy: r.inputBy,
    period: r.period, subject: r.subject, memo: r.memo, cancelled: r.cancelled, cancelReason: r.cancelReason,
  }));

  // 칭찬 전체 + 한 번도 못 받은 투투
  const praises = readPraise_().reverse().map((p) => ({
    id: p.id, ts: p.ts, date: p.date, from: p.from, fromName: nameOf[p.from] || p.from,
    to: p.to, toName: nameOf[p.to] || p.to, text: p.text, hidden: p.hidden, thanked: p.thanked,
  }));
  const received = new Set(praises.filter((p) => !p.hidden).map((p) => p.to));
  const noPraise = students.filter((s) => !received.has(s.no)).map((s) => ({ no: s.no, name: s.name }));

  // 날짜 × 투투 일퀘 달성표: O(도장 지급) / 진행 중인 항목 수
  const questO = {};
  records.forEach((r) => { if (!r.cancelled && r.mission === '일퀘' && r.score > 0) questO[r.no + '|' + r.date] = true; });
  const questRows = {};
  readQuestRows_().forEach((q) => (questRows[q.no + '|' + q.date] = q));
  const questGrid = students.map((s) => ({
    no: s.no, name: s.name,
    cells: cfg.schoolDays.map((d) => {
      const k = s.no + '|' + d;
      if (questO[k]) return { mark: 'O' };
      const q = questRows[k];
      if (!q) return { mark: '' };
      const n = [q.praiseDone, q.greet.length >= 2, dozeStatus_(q, d).done].filter(Boolean).length;
      return { mark: n + '/3', detail: `칭찬${q.praiseDone ? '✓' : '✗'} 인사 ${q.greet.join(', ') || '-'} 졸음${Object.values(q.doze).filter((v) => v === 'X').length}` };
    }),
  }));

  return {
    praises,
    noPraise,
    questGrid,
    today,
    dayIndex: schoolDayIndex_(cfg, today),
    cfg: {
      campaignName: cfg.campaignName, nickname: cfg.nickname,
      startDate: cfg.startDate, endDate: cfg.endDate, schoolDays: cfg.schoolDays,
      midRankDate: cfg.midRankDate, rankPublicCount: cfg.rankPublicCount, rankLocked: cfg.rankLocked,
      drawStampThreshold: cfg.drawStampThreshold, praiseMinLength: cfg.praiseMinLength,
      accuseResultPublic: cfg.accuseResultPublic, periodCount: cfg.periodCount,
      teacherCode: cfg.teacherCode, rewards: cfg.rewards, bannedWordCount: cfg.bannedWords.length,
    },
    missions: MISSIONS,
    students: stats.list,
    ledger,
    ledgerTotal: records.length,
    warnings,
    spreadsheetUrl: ss_().getUrl(),
    computedAt: stats.computedAt,
  };
}

// ===================== Code.gs =====================
/**
 * 웹앱 진입점.
 *   (기본)          투투 화면
 *   ?page=teacher   교과 선생님 화면  — 4단계에서 추가
 *   ?page=admin     담임 대시보드
 */
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) || '';
  const cfg = getConfig();
  const files = { '': 'Student', admin: 'Admin' };
  const file = files[page] || 'ComingSoon';

  const t = HtmlService.createTemplate(htmlSource_(file));
  t.campaignName = cfg.campaignName;
  t.titleHtml = titleHtml_(cfg.campaignName);
  t.subtitle = cfg.subtitle;
  t.nickname = cfg.nickname;
  return t.evaluate()
    .setTitle(cfg.campaignName)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** 제목을 쉼표 뒤에서 줄바꿈: '바른 언어 사용하고,' / '보상 얻자!!' */
function titleHtml_(title) {
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const m = String(title).match(/^(.*?,)\s*(.+)$/);
  if (!m) return `<span class="line">${esc(title)}</span>`;
  return `<span class="line">${esc(m[1])}</span><span class="line">${esc(m[2])}</span>`;
}

/** HTML 템플릿에서 공통 조각 포함: <?!= include('Styles') ?> */
function include(name) {
  return htmlSource_(name);
}

/**
 * HTML 원본. 한 파일 묶음(dist/Code.gs)에서는 HTML_SOURCES에 들어 있고,
 * src/ 여러 파일로 올린 경우에는 같은 이름의 HTML 파일에서 읽는다.
 */
function htmlSource_(name) {
  if (typeof HTML_SOURCES !== 'undefined' && HTML_SOURCES[name]) return HTML_SOURCES[name];
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}

// ===================== HTML 화면 =====================
const HTML_SOURCES = {
  "Admin": "<!DOCTYPE html>\n<html lang=\"ko\">\n<head>\n  <base target=\"_top\">\n  <meta charset=\"utf-8\">\n  <?!= include('Styles') ?>\n</head>\n<body>\n<div id=\"loading\"></div>\n<div class=\"wrap\">\n  <div class=\"metal hero\">\n    <h1 class=\"title-font\"><?!= titleHtml ?></h1>\n    <div class=\"deco\"></div>\n    <div class=\"sub\">- <?= subtitle ?> -</div>\n    <div class=\"tag\">담임 대시보드</div>\n  </div>\n\n  <!-- 로그인 -->\n  <section id=\"login\" class=\"box\" style=\"max-width:420px;margin:14px auto 0\">\n    <h2 class=\"title-font\">🔐 담임 입장</h2>\n    <label for=\"code\">담임 코드</label>\n    <input id=\"code\" type=\"password\" inputmode=\"numeric\" autocomplete=\"off\" placeholder=\"설정 시트의 담임 코드\">\n    <button class=\"btn block\" style=\"margin-top:12px\" id=\"loginBtn\">입장하기</button>\n  </section>\n\n  <!-- 대시보드 -->\n  <section id=\"app\" class=\"hidden\">\n    <div class=\"row\" style=\"margin-top:12px\">\n      <div class=\"muted grow\" id=\"stamp\"></div>\n      <button class=\"btn sm ghost\" id=\"refreshBtn\" style=\"flex:0 0 auto\">↻ 새로고침</button>\n      <button class=\"btn sm danger\" id=\"logoutBtn\" style=\"flex:0 0 auto\">나가기</button>\n    </div>\n\n    <div class=\"tabs\" id=\"tabs\">\n      <button class=\"tab on\" data-tab=\"overview\">📊 현황</button>\n      <button class=\"tab\" data-tab=\"quest\">✅ 일퀘</button>\n      <button class=\"tab\" data-tab=\"praise\">💌 칭찬</button>\n      <button class=\"tab\" data-tab=\"manual\">✍️ 도장 입력</button>\n      <button class=\"tab\" data-tab=\"ledger\">📜 기록장</button>\n      <button class=\"tab\" data-tab=\"settings\">⚙️ 설정</button>\n    </div>\n\n    <!-- 현황 -->\n    <div id=\"tab-overview\" class=\"box\" style=\"margin-top:0\">\n      <div class=\"cards\" id=\"cards\"></div>\n      <div id=\"warnings\"></div>\n      <div class=\"neon-line\"></div>\n      <div class=\"row\">\n        <h2 class=\"title-font grow\" style=\"margin:0\">투투별 도장 현황</h2>\n        <button class=\"btn sm ghost\" id=\"sortBtn\" style=\"flex:0 0 auto\"></button>\n      </div>\n      <div class=\"table-wrap\" style=\"margin-top:10px\"><table id=\"statsTable\"></table></div>\n      <p class=\"muted\">총점 = 기록장에서 취소되지 않은 모든 점수의 합(차감 포함). 동점은 공동 순위입니다.</p>\n    </div>\n\n    <!-- 일퀘 달성표 -->\n    <div id=\"tab-quest\" class=\"box hidden\" style=\"margin-top:0\">\n      <h2 class=\"title-font\">날짜 × 투투 일퀘 달성표</h2>\n      <p class=\"muted\">O = 도장 지급 · 2/3 = 진행 중(칸을 누르면 상세) · 빈칸 = 기록 없음</p>\n      <div class=\"table-wrap\"><table id=\"questTable\"></table></div>\n      <div id=\"questDetail\" class=\"muted\" style=\"margin-top:8px\"></div>\n    </div>\n\n    <!-- 칭찬 -->\n    <div id=\"tab-praise\" class=\"box hidden\" style=\"margin-top:0\">\n      <h2 class=\"title-font\">칭찬 한 번도 못 받은 투투</h2>\n      <div id=\"noPraise\"></div>\n      <div class=\"neon-line\"></div>\n      <h2 class=\"title-font\">전체 칭찬</h2>\n      <div class=\"row\">\n        <select id=\"pDate\" class=\"grow\"></select>\n        <select id=\"pFrom\" class=\"grow\"></select>\n        <select id=\"pTo\" class=\"grow\"></select>\n      </div>\n      <p class=\"muted\">숨기면 받은 친구에게 \"담임 선생님이 숨긴 칭찬\"으로 보이고, 보낸 친구의 그날 칭찬 미션은 미완료 처리됩니다(일퀘 도장 자동 취소).</p>\n      <div id=\"praiseList\"></div>\n    </div>\n\n    <!-- 수동 도장 -->\n    <div id=\"tab-manual\" class=\"box hidden\" style=\"margin-top:0\">\n      <h2 class=\"title-font\">수동 도장 추가 / 차감</h2>\n      <p class=\"muted\">기록장에 \"수동\"으로 한 줄씩 남습니다. 잘못 넣은 도장은 기록장 탭에서 취소하세요.</p>\n      <label>대상 선택</label>\n      <div class=\"row\" style=\"margin-bottom:8px\">\n        <div class=\"chips\" id=\"groupChips\"></div>\n      </div>\n      <div class=\"chips\" id=\"studentChips\"></div>\n      <div class=\"muted\" id=\"selCount\" style=\"margin-top:6px\"></div>\n\n      <label for=\"mScore\">점수 (차감은 음수)</label>\n      <div class=\"chips\" id=\"scoreQuick\" style=\"margin-bottom:8px\">\n        <button class=\"chip\" data-score=\"-3\">−3</button>\n        <button class=\"chip\" data-score=\"-2\">−2</button>\n        <button class=\"chip\" data-score=\"-1\">−1</button>\n        <button class=\"chip\" data-score=\"1\">+1</button>\n        <button class=\"chip\" data-score=\"2\">+2</button>\n        <button class=\"chip\" data-score=\"3\">+3</button>\n      </div>\n      <input id=\"mScore\" type=\"number\" inputmode=\"numeric\" step=\"1\" value=\"1\">\n\n      <label for=\"mDate\">날짜</label>\n      <input id=\"mDate\" type=\"date\">\n\n      <label for=\"mReason\">사유 (필수)</label>\n      <input id=\"mReason\" type=\"text\" maxlength=\"200\" placeholder=\"예: 칭찬 퀘스트 수동 인정\">\n\n      <button class=\"btn yellow block\" style=\"margin-top:14px\" id=\"manualBtn\">기록장에 추가</button>\n    </div>\n\n    <!-- 기록장 -->\n    <div id=\"tab-ledger\" class=\"box hidden\" style=\"margin-top:0\">\n      <h2 class=\"title-font\">기록장 (최근 500줄)</h2>\n      <div class=\"row\">\n        <select id=\"lFilter\" class=\"grow\"></select>\n        <select id=\"lMission\" class=\"grow\"></select>\n        <label style=\"flex:0 0 auto;margin:0;display:flex;gap:6px;align-items:center\">\n          <input id=\"lCancelled\" type=\"checkbox\" checked style=\"width:22px;min-height:22px\"> 취소 포함\n        </label>\n      </div>\n      <div class=\"table-wrap\" style=\"margin-top:10px\"><table id=\"ledgerTable\"></table></div>\n    </div>\n\n    <!-- 설정 -->\n    <div id=\"tab-settings\" class=\"box hidden\" style=\"margin-top:0\">\n      <h2 class=\"title-font\">랭킹 잠금</h2>\n      <div class=\"row\">\n        <div class=\"grow\" id=\"lockState\"></div>\n        <button class=\"btn\" id=\"lockBtn\" style=\"flex:0 0 auto\"></button>\n      </div>\n      <p class=\"muted\">잠금 ON이면 투투 화면에 \"랭킹 공개 전입니다\"가 표시됩니다.</p>\n      <div class=\"neon-line\"></div>\n      <h2 class=\"title-font\">현재 설정</h2>\n      <div class=\"table-wrap\"><table id=\"cfgTable\"></table></div>\n      <h3>랭킹 보상</h3>\n      <div id=\"rewards\"></div>\n      <div class=\"neon-line\"></div>\n      <p class=\"muted\">설정·학생 명단은 스프레드시트에서 직접 고친 뒤 아래 버튼을 누르면 바로 반영됩니다.</p>\n      <div class=\"row\">\n        <a class=\"btn ghost\" id=\"sheetLink\" target=\"_blank\" rel=\"noopener\" style=\"text-align:center;text-decoration:none;line-height:26px\">📄 스프레드시트 열기</a>\n        <button class=\"btn\" id=\"reloadBtn\">시트 다시 읽기</button>\n      </div>\n    </div>\n  </section>\n</div>\n\n<div id=\"toast\"></div>\n<div id=\"modal-root\"></div>\n\n<script>\n  const S = { token: null, data: null, tab: 'overview', sort: 'rank', sel: new Set() };\n  const $ = (id) => document.getElementById(id);\n  const MISSION_LABEL = { '일퀘': '일퀘', '암행어사판정': '판정', '암행어사활동': '암행활동', '수업참여': '수업', 'MVP': 'MVP', '단체': '단체', '검거이전': '검거이전', '수동': '수동' };\n\n  function esc(s) {\n    return String(s == null ? '' : s).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));\n  }\n  function store(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} }\n  function load(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }\n  function signed(n) { return n > 0 ? '+' + n : String(n); }\n  function scoreCls(n) { return n < 0 ? 'minus' : n > 0 ? 'plus' : 'muted'; }\n\n  let toastTimer = null;\n  function toast(msg, isErr) {\n    const t = $('toast');\n    t.textContent = msg;\n    t.className = isErr ? 'err' : '';\n    t.style.display = 'block';\n    clearTimeout(toastTimer);\n    toastTimer = setTimeout(() => (t.style.display = 'none'), 2600);\n  }\n\n  function call(fn, ...args) {\n    $('loading').style.display = 'block';\n    return new Promise((resolve, reject) => {\n      google.script.run\n        .withSuccessHandler((r) => { $('loading').style.display = 'none'; resolve(r); })\n        .withFailureHandler((err) => {\n          $('loading').style.display = 'none';\n          let msg = (err && err.message) || String(err);\n          if (msg.indexOf('AUTH:') >= 0) { logoutLocal(); msg = msg.replace(/^.*AUTH:\\s*/, ''); }\n          reject(new Error(msg.replace(/^(Error|Exception):\\s*/, '')));\n        })[fn](...args);\n    });\n  }\n\n  function modal({ title, html = '', input = null, okText = '확인', danger = false }) {\n    return new Promise((resolve) => {\n      const root = $('modal-root');\n      root.innerHTML =\n        `<div class=\"modal-bg\"><div class=\"modal\"><div class=\"box\">\n          <h2 class=\"title-font\">${esc(title)}</h2><div>${html}</div>\n          ${input ? `<textarea id=\"m-input\" rows=\"3\" maxlength=\"200\" placeholder=\"${esc(input)}\"></textarea>` : ''}\n          <div class=\"row\" style=\"margin-top:14px\">\n            <button class=\"btn ghost\" id=\"m-cancel\">닫기</button>\n            <button class=\"btn ${danger ? 'danger' : 'yellow'}\" id=\"m-ok\">${esc(okText)}</button>\n          </div></div></div></div>`;\n      const close = (v) => { root.innerHTML = ''; resolve(v); };\n      $('m-cancel').onclick = () => close(null);\n      $('m-ok').onclick = () => {\n        if (!input) return close(true);\n        const v = $('m-input').value.trim();\n        if (!v) return toast('사유를 입력해 주세요.', true);\n        close(v);\n      };\n      if (input) $('m-input').focus();\n    });\n  }\n\n  // ---------- 로그인 ----------\n  async function login() {\n    const code = $('code').value.trim();\n    if (!code) return toast('담임 코드를 입력해 주세요.', true);\n    try {\n      const r = await call('adminLogin', code);\n      S.token = r.token;\n      store('adminToken', r.token);\n      $('code').value = '';\n      await refresh();\n    } catch (e) { toast(e.message, true); }\n  }\n  function logoutLocal() {\n    S.token = null; S.data = null;\n    store('adminToken', null);\n    $('app').classList.add('hidden');\n    $('login').classList.remove('hidden');\n  }\n  async function refresh(fromSheet) {\n    if (!S.token) return;\n    try { setData(await call(fromSheet ? 'adminRefresh' : 'adminGetDashboard', S.token)); }\n    catch (e) { toast(e.message, true); }\n  }\n  function setData(d) {\n    S.data = d;\n    $('login').classList.add('hidden');\n    $('app').classList.remove('hidden');\n    if (!$('mDate').value) $('mDate').value = d.today;\n    render();\n  }\n\n  // ---------- 렌더 ----------\n  function render() {\n    const d = S.data;\n    if (!d) return;\n    $('stamp').textContent = `마지막 계산: ${d.computedAt}`;\n    renderOverview(); renderQuest(); renderPraise(); renderManual(); renderLedger(); renderSettings();\n  }\n\n  function renderOverview() {\n    const d = S.data, c = d.cfg;\n    const cards = [\n      ['오늘', `${d.today.slice(5)} ${d.dayIndex ? `(${d.dayIndex}/${c.schoolDays.length}일차)` : '(등교일 아님)'}`],\n      ['기간', `${c.startDate.slice(5)} ~ ${c.endDate.slice(5)}`],\n      [`${c.nickname} 수`, `${d.students.length}명`],\n      ['기록장', `${d.ledgerTotal}줄`],\n      ['랭킹', c.rankLocked ? '🔒 잠금' : '🔓 공개'],\n    ];\n    $('cards').innerHTML = cards.map(([k, v]) => `<div class=\"card\"><div class=\"k\">${esc(k)}</div><div class=\"v\" style=\"font-size:18px\">${esc(v)}</div></div>`).join('');\n    $('warnings').innerHTML = d.warnings.map((w) => `<div class=\"warn\">⚠️ ${esc(w)}</div>`).join('');\n\n    $('sortBtn').textContent = S.sort === 'rank' ? '순위순 ▾' : '번호순 ▾';\n    const list = d.students.slice().sort((a, b) =>\n      S.sort === 'rank' ? a.rank - b.rank || Number(a.no) - Number(b.no) : Number(a.no) - Number(b.no));\n    const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r);\n    const head = `<tr><th>순위</th><th>번호</th><th class=\"left\">이름</th>${d.missions.map((m) => `<th>${esc(MISSION_LABEL[m] || m)}</th>`).join('')}<th>차감</th><th>총점</th></tr>`;\n    const rows = list.map((s) => {\n      const top = s.rank <= c.rankPublicCount;\n      return `<tr${top ? ' style=\"background:#ffd23f14\"' : ''}>\n        <td><span class=\"medal\">${medal(s.rank)}</span></td><td>${esc(s.no)}</td>\n        <td class=\"left\">${esc(s.name)}</td>\n        ${d.missions.map((m) => `<td class=\"${scoreCls(s.byMission[m])}\">${s.byMission[m] || '·'}</td>`).join('')}\n        <td class=\"${s.minus ? 'minus' : 'muted'}\">${s.minus || '·'}</td>\n        <td class=\"yellow\" style=\"font-weight:900;font-size:16px\">${s.total}</td></tr>`;\n    }).join('');\n    $('statsTable').innerHTML = head + (rows || `<tr><td colspan=\"99\" class=\"muted\">학생 시트에 명단을 넣어 주세요.</td></tr>`);\n  }\n\n  function renderQuest() {\n    const d = S.data;\n    const head = `<tr><th class=\"left\">이름</th>${d.cfg.schoolDays.map((x) => `<th>${esc(x.slice(5))}</th>`).join('')}<th>O</th></tr>`;\n    const body = d.questGrid.map((r) => {\n      const cnt = r.cells.filter((c) => c.mark === 'O').length;\n      return `<tr><td class=\"left\">${esc(r.no)}. ${esc(r.name)}</td>${r.cells.map((c, i) => {\n        const cls = c.mark === 'O' ? 'plus' : c.mark ? 'yellow' : 'muted';\n        return `<td class=\"${cls}\" ${c.detail ? `data-qd=\"${esc(r.name + ' ' + d.cfg.schoolDays[i].slice(5) + ': ' + c.detail)}\" style=\"cursor:pointer;text-decoration:underline dotted\"` : ''}>${esc(c.mark || '·')}</td>`;\n      }).join('')}<td class=\"yellow\" style=\"font-weight:900\">${cnt}</td></tr>`;\n    }).join('');\n    $('questTable').innerHTML = head + body;\n  }\n\n  function renderPraise() {\n    const d = S.data;\n    $('noPraise').innerHTML = d.noPraise.length\n      ? `<div class=\"chips\">${d.noPraise.map((s) => `<span class=\"chip\" style=\"cursor:default\">${esc(s.no)}. ${esc(s.name)}</span>`).join('')}</div>`\n      : '<p class=\"muted\">모든 투투가 칭찬을 받았어요! 🎉</p>';\n    const keep = { d: $('pDate').value, f: $('pFrom').value, t: $('pTo').value };\n    const studentOpts = d.students.slice().sort((a, b) => Number(a.no) - Number(b.no))\n      .map((s) => `<option value=\"${esc(s.no)}\">${esc(s.no)}. ${esc(s.name)}</option>`).join('');\n    $('pDate').innerHTML = `<option value=\"\">전체 날짜</option>` + d.cfg.schoolDays.map((x) => `<option value=\"${x}\">${x.slice(5)}</option>`).join('');\n    $('pFrom').innerHTML = `<option value=\"\">보낸 사람 전체</option>` + studentOpts;\n    $('pTo').innerHTML = `<option value=\"\">받은 사람 전체</option>` + studentOpts;\n    $('pDate').value = keep.d; $('pFrom').value = keep.f; $('pTo').value = keep.t;\n    const list = d.praises.filter((p) => (!keep.d || p.date === keep.d) && (!keep.f || p.from === keep.f) && (!keep.t || p.to === keep.t));\n    $('praiseList').innerHTML = list.length ? list.map((p) => `<div class=\"card\" style=\"margin-top:8px;${p.hidden ? 'opacity:.5' : ''}\">\n        <div class=\"row\" style=\"align-items:flex-start\">\n          <div class=\"grow\"><b class=\"sky\">${esc(p.fromName)}</b> → <b class=\"yellow\">${esc(p.toName)}</b>\n            <span class=\"muted\">${esc(p.date.slice(5))}${p.thanked ? ' · 💗고마워' : ''}${p.hidden ? ' · 숨김' : ''}</span>\n            <div style=\"margin-top:4px;white-space:pre-wrap;word-break:break-word\">${esc(p.text)}</div></div>\n          <button class=\"btn sm ${p.hidden ? 'ghost' : 'danger'}\" style=\"flex:0 0 auto\" data-hide=\"${esc(p.id)}\" data-hidden=\"${p.hidden ? 1 : 0}\">${p.hidden ? '보이기' : '숨기기'}</button>\n        </div></div>`).join('') : '<p class=\"muted\">칭찬이 없어요.</p>';\n  }\n\n  async function togglePraise(id, hidden) {\n    const ok = await modal({ title: hidden ? '칭찬 숨기기' : '칭찬 다시 보이기',\n      html: hidden\n        ? '<p>받은 친구의 칭찬함에는 \"담임 선생님이 숨긴 칭찬\"으로만 보이고, 보낸 친구에게도 숨김 안내가 뜹니다.</p><p class=\"yellow\">보낸 친구의 그날 칭찬 미션은 미완료가 되고, 이미 받은 일퀘 도장은 자동 취소됩니다.</p><p class=\"muted\">오늘 칭찬이면 다른 칭찬을 다시 쓸 수 있어요.</p>'\n        : '<p>다시 보이게 하면 칭찬 미션이 인정되고, 인사·졸지 않기가 완료된 상태면 일퀘 도장이 다시 지급됩니다.</p>' });\n    if (!ok) return;\n    try { setData(await call('adminSetPraiseHidden', S.token, id, hidden)); toast(hidden ? '숨겼어요.' : '다시 보이게 했어요.'); }\n    catch (e) { toast(e.message, true); }\n  }\n\n  function renderManual() {\n    const d = S.data;\n    const valid = new Set(d.students.map((s) => s.no));\n    S.sel.forEach((no) => { if (!valid.has(no)) S.sel.delete(no); });\n    $('groupChips').innerHTML =\n      `<button class=\"chip\" data-group=\"__all\">반 전체 선택</button><button class=\"chip\" data-group=\"__none\">선택 해제</button>`;\n    $('studentChips').innerHTML = d.students.map((s) =>\n      `<button class=\"chip ${S.sel.has(s.no) ? 'on' : ''}\" data-no=\"${esc(s.no)}\">${esc(s.no)}. ${esc(s.name)}</button>`).join('');\n    $('selCount').textContent = `${S.sel.size}명 선택됨`;\n  }\n\n  function renderLedger() {\n    const d = S.data;\n    const f = $('lFilter'), fm = $('lMission');\n    const keep = f.value, keepM = fm.value;\n    f.innerHTML = `<option value=\"\">전체 ${esc(d.cfg.nickname)}</option>` +\n      d.students.map((s) => `<option value=\"${esc(s.no)}\">${esc(s.no)}. ${esc(s.name)}</option>`).join('');\n    fm.innerHTML = `<option value=\"\">전체 미션</option>` + d.missions.map((m) => `<option value=\"${esc(m)}\">${esc(m)}</option>`).join('');\n    f.value = keep; fm.value = keepM;\n    const showCancelled = $('lCancelled').checked;\n    const rows = d.ledger.filter((r) =>\n      (!f.value || r.no === f.value) && (!fm.value || r.mission === fm.value) && (showCancelled || !r.cancelled));\n    const head = `<tr><th>날짜</th><th>시각</th><th class=\"left\">이름</th><th>미션</th><th>점수</th><th>입력자</th><th>교시/과목</th><th class=\"left\">메모</th><th></th></tr>`;\n    const body = rows.map((r) => `<tr class=\"${r.cancelled ? 'cancelled' : ''}\">\n      <td>${esc(r.date.slice(5))}</td><td>${esc(String(r.ts).slice(11, 16))}</td>\n      <td class=\"left\">${esc(r.no)}. ${esc(r.name)}</td><td>${esc(r.mission)}</td>\n      <td class=\"${scoreCls(r.score)}\">${signed(r.score)}</td>\n      <td>${esc(r.inputType)}${r.inputBy && r.inputBy !== r.inputType ? ' · ' + esc(r.inputBy) : ''}</td>\n      <td>${esc([r.period && r.period + '교시', r.subject].filter(Boolean).join(' '))}</td>\n      <td class=\"left\" style=\"white-space:normal;min-width:140px\">${esc(r.memo)}${r.cancelled ? `<div class=\"minus\" style=\"text-decoration:none;font-size:12px\">취소: ${esc(r.cancelReason)}</div>` : ''}</td>\n      <td>${r.cancelled || !r.id ? '' : `<button class=\"btn sm danger\" data-cancel=\"${esc(r.id)}\">취소</button>`}</td></tr>`).join('');\n    $('ledgerTable').innerHTML = head + (body || `<tr><td colspan=\"9\" class=\"muted\">기록이 없어요.</td></tr>`);\n  }\n\n  function renderSettings() {\n    const d = S.data, c = d.cfg;\n    $('lockState').innerHTML = `현재: <span class=\"pill ${c.rankLocked ? 'on' : 'off'}\">${c.rankLocked ? '🔒 잠금 ON' : '🔓 공개 (잠금 OFF)'}</span>`;\n    $('lockBtn').textContent = c.rankLocked ? '랭킹 공개하기' : '랭킹 잠그기';\n    $('lockBtn').className = c.rankLocked ? 'btn yellow' : 'btn';\n    const rows = [\n      ['학생 호칭', c.nickname],\n      ['기간', `${c.startDate} ~ ${c.endDate}`],\n      ['등교일', `${c.schoolDays.length}일 · ${c.schoolDays.map((x) => x.slice(5)).join(', ')}`],\n      ['랭킹 공개 인원', `상위 ${c.rankPublicCount}명`],\n      ['뽑기 도장 기준', `${c.drawStampThreshold}개`],\n      ['칭찬 최소 글자 수', `${c.praiseMinLength}자`],\n      ['금지어', `${c.bannedWordCount}개 등록`],\n      ['지목 결과 공개', c.accuseResultPublic ? 'ON' : 'OFF'],\n      ['교시 수', `${c.periodCount}교시`],\n      ['교과 선생님 코드', c.teacherCode || '(없음)'],\n    ];\n    $('cfgTable').innerHTML = rows.map(([k, v]) => `<tr><th class=\"left\" style=\"position:static\">${esc(k)}</th><td class=\"left\" style=\"white-space:normal\">${esc(v)}</td></tr>`).join('');\n    $('rewards').innerHTML = c.rewards.map((r, i) => `<div style=\"margin:4px 0\"><span class=\"yellow\" style=\"font-weight:700\">${i + 1}위</span> ${esc(r)}</div>`).join('');\n    $('sheetLink').href = d.spreadsheetUrl;\n  }\n\n  // ---------- 동작 ----------\n  function switchTab(tab) {\n    S.tab = tab;\n    document.querySelectorAll('#tabs .tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));\n    ['overview', 'quest', 'praise', 'manual', 'ledger', 'settings'].forEach((t) => $('tab-' + t).classList.toggle('hidden', t !== tab));\n  }\n\n  async function submitManual() {\n    const d = S.data;\n    const score = Number($('mScore').value);\n    const reason = $('mReason').value.trim();\n    const date = $('mDate').value;\n    if (!S.sel.size) return toast(`${d.cfg.nickname}를 선택해 주세요.`, true);\n    if (!Number.isInteger(score) || score === 0) return toast('점수는 0이 아닌 정수로 입력해 주세요.', true);\n    if (!reason) return toast('사유를 꼭 입력해 주세요.', true);\n    const names = d.students.filter((s) => S.sel.has(s.no)).map((s) => s.name);\n    const ok = await modal({\n      title: '도장 입력 확인',\n      html: `<p><b class=\"${scoreCls(score)}\" style=\"font-size:20px\">${signed(score)}</b> · ${esc(date)}</p>\n             <p>${esc(names.join(', '))} (${names.length}명)</p><p class=\"muted\">사유: ${esc(reason)}</p>`,\n      okText: '추가하기',\n    });\n    if (!ok) return;\n    try {\n      setData(await call('adminAddManual', S.token, { studentNos: Array.from(S.sel), score, date, reason }));\n      S.sel.clear(); $('mReason').value = ''; renderManual();\n      toast(`${names.length}명에게 ${signed(score)} 기록했어요.`);\n    } catch (e) { toast(e.message, true); }\n  }\n\n  async function cancelRecord(id) {\n    const r = S.data.ledger.find((x) => x.id === id);\n    if (!r) return;\n    const reason = await modal({\n      title: '기록 취소',\n      html: `<p>${esc(r.date)} · ${esc(r.name)} · ${esc(r.mission)} <b class=\"${scoreCls(r.score)}\">${signed(r.score)}</b></p>\n             <p class=\"muted\">기록은 지워지지 않고 \"취소\"로 표시되며 합계에서 빠집니다.</p>`,\n      input: '취소 사유 (필수)',\n      okText: '취소 처리',\n      danger: true,\n    });\n    if (!reason) return;\n    try { setData(await call('adminCancelRecord', S.token, id, reason)); toast('취소했어요.'); }\n    catch (e) { toast(e.message, true); }\n  }\n\n  async function toggleLock() {\n    const next = !S.data.cfg.rankLocked;\n    const ok = await modal({ title: next ? '랭킹 잠그기' : '랭킹 공개하기',\n      html: next ? '<p>투투 화면에 \"랭킹 공개 전입니다\"가 표시됩니다.</p>' : '<p>투투 화면에 상위 랭킹이 공개됩니다.</p>' });\n    if (!ok) return;\n    try { setData(await call('adminSetRankLock', S.token, next)); toast(next ? '랭킹을 잠갔어요.' : '랭킹을 공개했어요.'); }\n    catch (e) { toast(e.message, true); }\n  }\n\n  // ---------- 이벤트 ----------\n  $('loginBtn').onclick = login;\n  $('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });\n  $('logoutBtn').onclick = () => { if (S.token) google.script.run.logout(S.token); logoutLocal(); };\n  $('refreshBtn').onclick = () => refresh(false);\n  $('reloadBtn').onclick = async () => { await refresh(true); toast('시트에서 다시 읽었어요.'); };\n  $('sortBtn').onclick = () => { S.sort = S.sort === 'rank' ? 'no' : 'rank'; renderOverview(); };\n  $('lockBtn').onclick = toggleLock;\n  $('manualBtn').onclick = submitManual;\n  $('tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) switchTab(b.dataset.tab); };\n  $('studentChips').onclick = (e) => {\n    const b = e.target.closest('[data-no]');\n    if (!b) return;\n    const no = b.dataset.no;\n    S.sel.has(no) ? S.sel.delete(no) : S.sel.add(no);\n    renderManual();\n  };\n  $('groupChips').onclick = (e) => {\n    const b = e.target.closest('[data-group]');\n    if (!b) return;\n    const g = b.dataset.group;\n    if (g === '__none') S.sel.clear();\n    else S.data.students.forEach((s) => S.sel.add(s.no));\n    renderManual();\n  };\n  $('scoreQuick').onclick = (e) => { const b = e.target.closest('[data-score]'); if (b) $('mScore').value = b.dataset.score; };\n  $('ledgerTable').onclick = (e) => { const b = e.target.closest('[data-cancel]'); if (b) cancelRecord(b.dataset.cancel); };\n  ['pDate', 'pFrom', 'pTo'].forEach((id) => $(id).addEventListener('change', renderPraise));\n  $('praiseList').onclick = (e) => { const b = e.target.closest('[data-hide]'); if (b) togglePraise(b.dataset.hide, b.dataset.hidden !== '1'); };\n  $('questTable').onclick = (e) => { const c = e.target.closest('[data-qd]'); if (c) $('questDetail').textContent = c.dataset.qd; };\n  ['lFilter', 'lMission', 'lCancelled'].forEach((id) => $(id).addEventListener('change', renderLedger));\n\n  // 60초마다 자동 갱신 (입력 중인 탭·모달이 열려 있으면 건너뜀)\n  setInterval(() => {\n    if (S.token && S.tab !== 'manual' && !$('modal-root').innerHTML && document.visibilityState === 'visible') refresh(false);\n  }, 60000);\n\n  S.token = load('adminToken');\n  if (S.token) refresh(false);\n</script>\n</body>\n</html>\n",
  "ComingSoon": "<!DOCTYPE html>\n<html lang=\"ko\">\n<head>\n  <base target=\"_top\">\n  <meta charset=\"utf-8\">\n  <?!= include('Styles') ?>\n</head>\n<body>\n  <div class=\"wrap\" style=\"max-width:560px\">\n    <div class=\"metal hero\">\n      <h1 class=\"title-font\"><?!= titleHtml ?></h1>\n      <div class=\"deco\"></div>\n      <div class=\"sub\">- <?= subtitle ?> -</div>\n    </div>\n    <div class=\"box\" style=\"text-align:center\">\n      <h2 class=\"title-font\">🚀 준비 중이에요</h2>\n      <p>캠페인 화면을 곧 열어 드릴게요!</p>\n    </div>\n  </div>\n</body>\n</html>\n",
  "Student": "<!DOCTYPE html>\n<html lang=\"ko\">\n<head>\n  <base target=\"_top\">\n  <meta charset=\"utf-8\">\n  <?!= include('Styles') ?>\n  <style>\n    .wrap { max-width: 560px; }\n    .bubble-title {\n      font-family: 'Jua', 'Noto Sans KR', sans-serif; text-align: center; margin: 0; line-height: 1.1;\n      font-size: clamp(30px, 9vw, 42px); color: #c8f0ff; letter-spacing: 1px;\n      text-shadow: 3px 0 #1a4fa8, -3px 0 #1a4fa8, 0 3px #1a4fa8, 0 -3px #1a4fa8,\n        2px 2px #1a4fa8, -2px -2px #1a4fa8, 2px -2px #1a4fa8, -2px 2px #1a4fa8, 0 6px 0 #0b2a66, 0 0 18px #5cc8ff;\n    }\n    .space-sub { font-family: 'Jua', sans-serif; text-align: center; color: #fff; font-size: 14px; margin-bottom: 6px; opacity: .9; }\n\n    /* 우주 패널 */\n    .space {\n      position: relative; overflow: hidden; margin-top: 14px; padding: 18px 12px 16px; border-radius: 18px;\n      background:\n        radial-gradient(2px 2px at 8% 20%, #fff 50%, transparent 51%),\n        radial-gradient(1.5px 1.5px at 85% 12%, #fff 50%, transparent 51%),\n        radial-gradient(1.5px 1.5px at 70% 78%, #fffa 50%, transparent 51%),\n        radial-gradient(2px 2px at 15% 88%, #fff 50%, transparent 51%),\n        radial-gradient(1px 1px at 50% 6%, #fff 50%, transparent 51%),\n        radial-gradient(ellipse at 50% 0%, #3b3f8f 0%, #1c1f55 45%, #0d1030 100%);\n      border: 1px solid #3b4aa0; box-shadow: 0 0 24px #2f8bff33;\n    }\n    .space .deco { position: absolute; font-size: 30px; pointer-events: none; filter: drop-shadow(0 0 6px #0008); }\n\n    /* 행성 도장판 */\n    .planet {\n      position: relative; width: min(84vw, 380px); aspect-ratio: 1; margin: 6px auto 0; border-radius: 50%;\n      background:\n        radial-gradient(ellipse 30% 18% at 28% 30%, var(--pland, #36c9e8) 60%, transparent 62%),\n        radial-gradient(ellipse 22% 30% at 72% 62%, var(--pland, #36c9e8) 60%, transparent 62%),\n        radial-gradient(ellipse 26% 14% at 40% 78%, var(--pland, #36c9e8) 60%, transparent 62%),\n        radial-gradient(circle at 32% 28%, var(--pbase, #3fa9ff, #1668d8 55%, #0b3f9e));\n      box-shadow: 0 0 34px #2f8bff99, inset -18px -22px 40px #0006;\n      display: flex; flex-direction: column; justify-content: center; gap: 2.2%;\n      font-size: clamp(14px, 4.6vw, 20px);\n    }\n    .prow { display: flex; justify-content: center; gap: 2.2%; }\n    .slot {\n      width: 12.6%; aspect-ratio: 1; border-radius: 50%; background: #fff; color: #2a63c9;\n      display: flex; align-items: center; justify-content: center; font-family: 'Jua', sans-serif;\n      box-shadow: 0 2px 0 #0003;\n    }\n    .slot.on {\n      background: radial-gradient(circle at 35% 35%, #fffbd0, #ffd23f 55%, #f5a300);\n      color: #8a4b00; font-size: 1.25em; box-shadow: 0 0 12px #ffd23f, 0 2px 0 #0003;\n    }\n    .slot.new { animation: pop .6s ease-out; }\n    @keyframes pop { 0% { transform: scale(0) rotate(-40deg); } 70% { transform: scale(1.25); } 100% { transform: scale(1); } }\n    .stamp-count { text-align: center; margin-top: 12px; font-family: 'Jua', sans-serif; font-size: 22px; }\n    .stamp-count b { color: var(--yellow); font-size: 30px; }\n    .bonus { text-align: center; color: var(--yellow); margin-top: 4px; letter-spacing: 2px; }\n    .planet-name { text-align: center; font-family: 'Jua', sans-serif; color: #cfe3ff; margin-top: 4px; }\n    .done-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 6px 0 2px; }\n    .done-planet { display: inline-flex; flex-direction: column; align-items: center; font-size: 26px; line-height: 1;\n      background: #ffffff12; border: 1px solid #ffffff22; border-radius: 12px; padding: 6px 8px; }\n    .done-planet small { font-size: 11px; color: var(--yellow); margin-top: 3px; font-family: 'Jua', sans-serif; }\n\n    /* 랭킹 */\n    .rank-row { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px; margin-top: 6px; background: #0a1a33; }\n    .rank-row.me { background: #ffd23f22; box-shadow: inset 0 0 0 1px var(--yellow); }\n    .rank-row .rk { width: 38px; text-align: center; font-weight: 900; font-size: 20px; }\n    .rank-row .nm { flex: 1; font-weight: 700; }\n    .rank-row .sc { color: var(--yellow); font-weight: 900; }\n    .myrank { margin-top: 12px; text-align: center; font-size: 18px; font-weight: 700; }\n    .myrank b { color: var(--yellow); font-size: 26px; }\n    .up { color: #ff6b8a; } .down { color: #5cc8ff; }\n\n    /* 카드 */\n    .mini { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }\n    .mini .card { text-align: center; }\n    .mini .card .v { font-size: 24px; }\n\n    /* 일퀘판 (종이 일퀘판 모양) */\n    .qtable { width: 100%; border-collapse: separate; border-spacing: 0 4px; font-size: 15px; }\n    .qtable th { background: #fff3c4; color: #1c1f55; position: static; padding: 8px 6px; font-family: 'Jua', sans-serif; font-size: 16px; }\n    .qtable th:first-child { border-radius: 8px 0 0 8px; } .qtable th:last-child { border-radius: 0 8px 8px 0; }\n    .qtable td { background: #e6e9f0; color: #1c1f55; padding: 8px 6px; }\n    .qtable td:first-child { border-radius: 8px 0 0 8px; font-family: 'Jua', sans-serif; white-space: nowrap; }\n    .qtable td:last-child { border-radius: 0 8px 8px 0; }\n    .qtable tr.today td { background: #cfeaff; box-shadow: inset 0 0 0 2px #5cc8ff; }\n    .mark { font-family: 'Jua', sans-serif; font-size: 22px; }\n    .mark.o { color: #1a9b4b; } .mark.x { color: #d64545; }\n\n    /* 수업 싸인판 */\n    .signs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }\n    .sign { aspect-ratio: 1 / 1.1; background: #fff; border-radius: 8px; color: #1c1f55; position: relative; padding: 4px 2px; font-size: 11px; overflow: hidden; word-break: keep-all; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }\n    .sign .n { position: absolute; top: 3px; left: 6px; font-family: 'Black Han Sans', sans-serif; font-size: 14px; }\n    .sign.on { background: linear-gradient(180deg, #fffbe0, #ffe58a); }\n    .sign.on .s { font-weight: 900; font-size: 13px; }\n    .sign.mvp { background: linear-gradient(180deg, #ffe0f0, #ffb3d9); }\n\n    .rec { display: flex; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid #ffffff12; font-size: 14px; }\n    .rec .d { color: var(--muted); width: 52px; flex: 0 0 auto; }\n    .rec .l { flex: 1; }\n    details summary { cursor: pointer; color: var(--sky); font-weight: 700; padding: 6px 0; }\n    /* 시간표 */\n    .tt { display: grid; grid-template-columns: repeat(auto-fit, minmax(64px, 1fr)); gap: 6px; }\n    .tt div { background: #0a1a33; border: 1px solid var(--navy-line); border-radius: 10px; padding: 6px 4px; text-align: center; }\n    .tt b { display: block; font-size: 15px; color: var(--text); }\n    .tt small { color: var(--muted); font-size: 11px; }\n\n    /* 오늘의 퀘스트 */\n    .quest { background: #0a1a33; border: 1px solid var(--navy-line); border-radius: 12px; padding: 12px; margin-top: 10px; }\n    .quest.done { border-color: var(--green); box-shadow: 0 0 10px #4ade8044; }\n    .quest.fail { border-color: var(--red); }\n    .quest .qh { display: flex; align-items: center; gap: 8px; font-weight: 900; font-size: 17px; }\n    .quest .qh .st { margin-left: auto; font-size: 13px; padding: 2px 10px; border-radius: 999px; background: #20314f; color: var(--muted); white-space: nowrap; }\n    .quest.done .qh .st { background: var(--green); color: #052e16; }\n    .quest.fail .qh .st { background: var(--red); color: #fff; }\n    .chip:disabled { opacity: .35; cursor: not-allowed; text-decoration: line-through; }\n    .greeted { display: inline-flex; align-items: center; gap: 6px; background: #13294b; border: 1px solid var(--sky); border-radius: 999px; padding: 6px 6px 6px 12px; margin: 4px 6px 0 0; }\n    .greeted button { appearance: none; border: 0; background: #ffffff22; color: #fff; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; }\n    .dz { display: flex; align-items: center; gap: 6px; padding: 6px 0; border-bottom: 1px solid #ffffff10; }\n    .dz .p { flex: 1; font-size: 15px; }\n    .dz .p small { color: var(--muted); }\n    .dz button { appearance: none; font: inherit; font-size: 14px; cursor: pointer; border-radius: 10px; min-height: 40px; padding: 4px 8px; border: 1px solid var(--navy-line); background: #081427; color: var(--muted); }\n    .dz button.on.o { background: #1a9b4b; color: #fff; border-color: #1a9b4b; }\n    .dz button.on.x { background: #d64545; color: #fff; border-color: #d64545; }\n    .rule { background: #ffd23f1a; border: 1px solid #ffd23f66; color: #ffe9a8; border-radius: 10px; padding: 8px 10px; margin-top: 8px; font-size: 13px; line-height: 1.5; }\n    .rule b { color: var(--yellow); }\n    .letter.hid { background: #20314f; color: var(--muted); text-align: center; }\n    .counter { text-align: right; font-size: 12px; color: var(--muted); }\n    .stamp-done { text-align: center; font-size: 20px; font-weight: 900; color: var(--yellow); padding: 8px 0; }\n\n    /* 받은 칭찬함 */\n    .letter { background: linear-gradient(180deg, #fff8e6, #ffeccc); color: #3b2a12; border-radius: 12px; padding: 12px 14px; margin-top: 8px; }\n    .letter .from { font-weight: 900; color: #b4531a; }\n    .letter .d { color: #8a6d4b; font-size: 12px; }\n    .letter .txt { margin: 6px 0 8px; white-space: pre-wrap; word-break: break-word; }\n    .thanks { appearance: none; font: inherit; cursor: pointer; border: 0; border-radius: 999px; padding: 6px 14px; background: #ff7aa8; color: #fff; font-weight: 700; }\n    .thanks:disabled { background: #e8c6d3; color: #8a5b6c; cursor: default; }\n\n    .topbar { display: flex; align-items: center; gap: 8px; margin-top: 12px; }\n    .topbar .hi { flex: 1; font-weight: 700; }\n    .topbar .hi b { color: var(--yellow); }\n  </style>\n</head>\n<body>\n<div id=\"loading\"></div>\n<div class=\"wrap\">\n  <div class=\"metal hero\">\n    <h1 class=\"title-font\"><?!= titleHtml ?></h1>\n    <div class=\"deco\"></div>\n    <div class=\"sub\">- <?= subtitle ?> -</div>\n  </div>\n\n  <!-- 로그인 -->\n  <section id=\"login\" class=\"box\">\n    <h2 class=\"title-font\">🚀 <?= nickname ?> 입장</h2>\n    <label for=\"no\">번호</label>\n    <input id=\"no\" type=\"text\" inputmode=\"numeric\" pattern=\"[0-9]*\" maxlength=\"3\" autocomplete=\"off\" placeholder=\"예: 7\">\n    <label for=\"code\">로그인 코드 (4자리)</label>\n    <input id=\"code\" type=\"password\" inputmode=\"numeric\" pattern=\"[0-9]*\" maxlength=\"8\" autocomplete=\"off\" placeholder=\"선생님께 받은 코드\">\n    <button class=\"btn yellow block\" style=\"margin-top:14px\" id=\"loginBtn\">입장하기</button>\n    <p class=\"muted\" style=\"margin-top:10px\">한 번 입장하면 캠페인 기간 동안 로그인이 유지돼요.</p>\n  </section>\n\n  <!-- 내 화면 -->\n  <section id=\"app\" class=\"hidden\">\n    <div class=\"topbar\">\n      <div class=\"hi\" id=\"hi\"></div>\n      <button class=\"btn sm ghost\" id=\"refreshBtn\">새로고침</button>\n      <button class=\"btn sm danger\" id=\"logoutBtn\">나가기</button>\n    </div>\n\n    <!-- 랭킹 -->\n    <div class=\"box\" id=\"rankBox\"></div>\n\n    <!-- 오늘의 시간표 + 퀘스트 -->\n    <div class=\"box\" id=\"questBox\">\n      <h2 class=\"title-font\">📅 오늘의 시간표</h2>\n      <div class=\"tt\" id=\"tt\"></div>\n      <div class=\"muted\" id=\"ttMemo\" style=\"margin-top:6px\"></div>\n      <div class=\"neon-line\"></div>\n      <h2 class=\"title-font\">⭐ 오늘의 퀘스트</h2>\n      <div id=\"questStatus\"></div>\n\n      <div class=\"quest\" id=\"qPraise\">\n        <div class=\"qh\">💌 친구에게 칭찬 1회 <span class=\"st\" id=\"qPraiseSt\"></span></div>\n        <div id=\"praiseDone\" class=\"hidden\" style=\"margin-top:8px\"></div>\n        <div id=\"praiseHidden\" class=\"warn hidden\"></div>\n        <div id=\"praiseForm\">\n          <div class=\"rule\">👀 담임 선생님이 모든 칭찬을 확인해요.<br>\n            <b>비난·비판·놀림</b>이 담긴 내용은 금지! 숨김 처리되고 칭찬 미션도 인정되지 않아요.</div>\n          <label>칭찬할 친구 (한 번 칭찬한 친구는 다시 고를 수 없어요)</label>\n          <div class=\"chips\" id=\"friendChips\"></div>\n          <label for=\"praiseText\">칭찬 문장</label>\n          <textarea id=\"praiseText\" rows=\"3\" maxlength=\"200\" placeholder=\"친구의 멋진 점을 구체적으로 써 주세요!\"></textarea>\n          <div class=\"counter\" id=\"praiseCount\"></div>\n          <button class=\"btn yellow block\" id=\"praiseBtn\" style=\"margin-top:8px\">칭찬 보내기 💌</button>\n        </div>\n      </div>\n\n      <div class=\"quest\" id=\"qGreet\">\n        <div class=\"qh\">🙇 복도에서 선생님께 인사 2회 <span class=\"st\" id=\"qGreetSt\"></span></div>\n        <div id=\"greetList\" style=\"margin-top:6px\"></div>\n        <div id=\"greetForm\">\n          <label>인사한 선생님 (서로 다른 선생님 2분)</label>\n          <div class=\"chips\" id=\"teacherChips\"></div>\n          <div class=\"row\" style=\"margin-top:8px\">\n            <input id=\"greetInput\" type=\"text\" maxlength=\"20\" placeholder=\"목록에 없으면 직접 입력 (예: 교장선생님)\" class=\"grow\">\n            <button class=\"btn sm\" id=\"greetBtn\" style=\"flex:0 0 auto;min-height:46px\">추가</button>\n          </div>\n        </div>\n      </div>\n\n      <div class=\"quest\" id=\"qDoze\">\n        <div class=\"qh\">😴 수업 시간에 졸지 않기 <span class=\"st\" id=\"qDozeSt\"></span></div>\n        <div class=\"muted\" id=\"dozeHelp\" style=\"margin:4px 0\"></div>\n        <div id=\"dozeList\"></div>\n      </div>\n    </div>\n\n    <!-- 도장판 -->\n    <div class=\"space\">\n      <span class=\"deco\" style=\"left:10px;top:70px\">🪐</span>\n      <span class=\"deco\" style=\"right:12px;top:16px;font-size:22px\">⭐</span>\n      <span class=\"deco\" style=\"right:8px;bottom:40px;font-size:36px\">🛸</span>\n      <div class=\"space-sub\">- <?= subtitle ?> -</div>\n      <h2 class=\"bubble-title\" id=\"boardTitle\"></h2>\n      <div id=\"donePlanets\"></div>\n      <div class=\"planet-name\" id=\"planetName\"></div>\n      <div class=\"planet\" id=\"planet\"></div>\n      <div class=\"stamp-count\" id=\"stampCount\"></div>\n      <div class=\"bonus\" id=\"bonus\"></div>\n    </div>\n\n    <!-- 요약 카드 -->\n    <div class=\"box\">\n      <h2 class=\"title-font\">📊 미션별 도장</h2>\n      <div class=\"mini\" id=\"groups\"></div>\n      <div class=\"neon-line\"></div>\n      <div class=\"mini\" id=\"extra\"></div>\n      <div id=\"drawMsg\" class=\"muted\" style=\"text-align:center;margin-top:10px\"></div>\n    </div>\n\n    <!-- 일퀘판 -->\n    <div class=\"space\">\n      <div class=\"space-sub\">일퀘 3가지를 모두 완료하면 도장 +1!</div>\n      <h2 class=\"bubble-title\" id=\"questTitle\"></h2>\n      <table class=\"qtable\" style=\"margin-top:10px\">\n        <thead><tr><th style=\"width:84px\">날짜</th><th>일퀘 달성 여부</th><th>칭찬한 친구</th></tr></thead>\n        <tbody id=\"questBody\"></tbody>\n      </table>\n    </div>\n\n    <!-- 받은 칭찬함 -->\n    <div class=\"box\">\n      <h2 class=\"title-font\">💌 받은 칭찬함</h2>\n      <div id=\"inbox\"></div>\n      <p class=\"muted\" style=\"margin-bottom:0\">받은 칭찬은 나만 볼 수 있어요.</p>\n    </div>\n\n    <!-- 수업 싸인판 -->\n    <div class=\"space\">\n      <h2 class=\"bubble-title\" id=\"signTitle\"></h2>\n      <div class=\"space-sub\" style=\"margin:6px 0 10px\">수업 적극 참여 +2 · 수업 MVP +3</div>\n      <div class=\"signs\" id=\"signs\"></div>\n    </div>\n\n    <!-- 기록 -->\n    <div class=\"box\">\n      <h2 class=\"title-font\">📜 내 도장 기록</h2>\n      <div id=\"minusBox\"></div>\n      <details id=\"allRec\"><summary>전체 기록 보기</summary><div id=\"records\"></div></details>\n    </div>\n\n    <p class=\"muted\" style=\"text-align:center\" id=\"stamp\"></p>\n  </section>\n</div>\n\n<div id=\"toast\"></div>\n\n<script>\n  const S = { token: null, data: null, lastTotal: null, busy: false, acting: false, seq: 0, appliedSeq: 0, praiseTo: '' };\n  const $ = (id) => document.getElementById(id);\n  const WD = ['일', '월', '화', '수', '목', '금', '토'];\n  const PLANET_ROWS = [3, 5, 6, 5, 4]; // 종이 도장판과 같은 23칸\n\n  function esc(s) {\n    return String(s == null ? '' : s).replace(/[&<>\"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '\"': '&quot;', \"'\": '&#39;' }[c]));\n  }\n  function store(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }\n  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }\n  function signed(n) { return n > 0 ? '+' + n : String(n); }\n  function md(d) { const [, m, dd] = d.split('-'); return `${Number(m)}/${Number(dd)}`; }\n  function wd(d) { const [y, m, dd] = d.split('-').map(Number); return WD[new Date(y, m - 1, dd).getDay()]; }\n\n  let toastTimer = null;\n  function toast(msg, isErr) {\n    const t = $('toast');\n    t.textContent = msg; t.className = isErr ? 'err' : ''; t.style.display = 'block';\n    clearTimeout(toastTimer);\n    toastTimer = setTimeout(() => (t.style.display = 'none'), 2600);\n  }\n\n  function call(fn, ...args) {\n    $('loading').style.display = 'block';\n    return new Promise((resolve, reject) => {\n      google.script.run\n        .withSuccessHandler((r) => { $('loading').style.display = 'none'; resolve(r); })\n        .withFailureHandler((err) => {\n          $('loading').style.display = 'none';\n          let msg = (err && err.message) || String(err);\n          if (msg.indexOf('AUTH:') >= 0) { logoutLocal(); msg = msg.replace(/^.*AUTH:\\s*/, ''); }\n          reject(new Error(msg.replace(/^(Error|Exception):\\s*/, '')));\n        })[fn](...args);\n    });\n  }\n\n  // ---------- 로그인 ----------\n  async function login() {\n    const no = $('no').value.trim(), code = $('code').value.trim();\n    if (!no || !code) return toast('번호와 코드를 입력해 주세요.', true);\n    $('loginBtn').disabled = true;\n    try {\n      const r = await call('studentLogin', no, code);\n      S.token = r.token;\n      store('tutuToken', r.token);\n      store('tutuNo', no);\n      $('code').value = '';\n      await refresh();\n    } catch (e) { toast(e.message, true); }\n    $('loginBtn').disabled = false;\n  }\n  function logoutLocal() {\n    S.token = null; S.data = null; S.lastTotal = null;\n    store('tutuToken', null);\n    $('app').classList.add('hidden');\n    $('login').classList.remove('hidden');\n  }\n  async function refresh(quiet) {\n    if (!S.token || S.busy || S.acting) return;\n    S.busy = true;\n    const my = ++S.seq;\n    try {\n      const d = await call('studentGetHome', S.token);\n      if (my >= S.appliedSeq) { S.appliedSeq = my; apply(d); }\n    } catch (e) { if (!quiet || !S.token) toast(e.message, true); }\n    S.busy = false;\n  }\n\n  function apply(d) {\n    S.data = d;\n    $('login').classList.add('hidden');\n    $('app').classList.remove('hidden');\n    render();\n    if (d.notice) toast(d.notice);\n  }\n\n  /** 퀘스트 입력 동작: 서버가 갱신된 화면 데이터를 돌려준다 */\n  async function act(fn, ...args) {\n    if (S.acting) return false;\n    S.acting = true;\n    const my = ++S.seq;\n    try { const d = await call(fn, S.token, ...args); S.appliedSeq = my; apply(d); return true; }\n    catch (e) { toast(e.message, true); return false; }\n    finally { S.acting = false; }\n  }\n\n  // ---------- 렌더 ----------\n  function render() {\n    const d = S.data;\n    const nick = d.nickname;\n    $('hi').innerHTML = `🚀 <b>${esc(d.me.name)}</b> ${esc(nick)}, 안녕!` +\n      `<div class=\"muted\">${md(d.today)}(${wd(d.today)}) · ${d.dayIndex ? `${d.dayIndex}/${d.dayCount}일차` : '등교일이 아니에요'}</div>`;\n    renderRanking(d);\n    renderToday(d);\n    renderBoard(d);\n    renderSummary(d);\n    renderQuest(d);\n    renderSigns(d);\n    renderRecords(d);\n    renderInbox(d);\n    $('stamp').textContent = `마지막 갱신 ${d.serverTime} · 30초마다 자동 갱신`;\n  }\n\n  function renderRanking(d) {\n    const r = d.ranking;\n    if (r.locked) {\n      $('rankBox').innerHTML = `<h2 class=\"title-font\">🏆 랭킹</h2>\n        <div style=\"text-align:center;padding:18px 0;font-size:20px;font-weight:700\">🔒 랭킹 공개 전입니다</div>\n        <p class=\"muted\" style=\"text-align:center;margin:0\">도장을 열심히 모으면서 기다려 주세요!</p>`;\n      return;\n    }\n    const medal = (k) => (k === 1 ? '🥇' : k === 2 ? '🥈' : k === 3 ? '🥉' : k);\n    const rows = r.top.map((t) => `<div class=\"rank-row ${t.isMe ? 'me' : ''}\">\n        <div class=\"rk\">${medal(t.rank)}</div><div class=\"nm\">${esc(t.name)}${t.isMe ? ' (나)' : ''}</div>\n        <div class=\"sc\">${t.total}개</div></div>`).join('');\n    let delta = '';\n    if (r.myDelta > 0) delta = ` <span class=\"up\">▲${r.myDelta}</span>`;\n    else if (r.myDelta < 0) delta = ` <span class=\"down\">▼${-r.myDelta}</span>`;\n    else if (r.myDelta === 0) delta = ' <span class=\"muted\">-</span>';\n    $('rankBox').innerHTML = `<h2 class=\"title-font\">🏆 오늘의 랭킹 TOP ${r.publicCount}</h2>${rows || '<p class=\"muted\">아직 기록이 없어요.</p>'}\n      <div class=\"myrank\">내 순위: <b>${r.myRank}위</b>${delta}</div>\n      ${r.prevDate ? `<div class=\"muted\" style=\"text-align:center\">▲▼ ${md(r.prevDate)} 대비 · 내 순위는 나만 볼 수 있어요</div>` : '<div class=\"muted\" style=\"text-align:center\">내 순위는 나만 볼 수 있어요</div>'}`;\n  }\n\n  // 행성 하나 = 23칸 (종이 도장판). 다 채우면 다음 행성이 열리고 번호는 이어진다.\n  const PLANET_SIZE = PLANET_ROWS.reduce((a, b) => a + b, 0);\n  const PLANET_THEMES = [\n    { name: '푸른 행성', base: '#3fa9ff, #1668d8 55%, #0b3f9e', land: '#36c9e8', icon: '🌍' },\n    { name: '보라 행성', base: '#c08bff, #7a3fd8 55%, #46208f', land: '#e0a8ff', icon: '🔮' },\n    { name: '노을 행성', base: '#ffb36b, #e86a2c 55%, #9e3512', land: '#ffd38a', icon: '🪐' },\n    { name: '초록 행성', base: '#6be3a0, #1fa860 55%, #0d6b3a', land: '#b4f5c9', icon: '🌳' },\n    { name: '분홍 행성', base: '#ff9ccf, #e0479a 55%, #8f1f5c', land: '#ffd0e8', icon: '🌸' },\n    { name: '황금 행성', base: '#ffe680, #f0b400 55%, #9e6b00', land: '#fff3b0', icon: '👑' },\n  ];\n\n  function renderBoard(d) {\n    const total = d.total;\n    const filled = Math.max(0, total);\n    const prev = S.lastTotal == null ? filled : Math.max(0, S.lastTotal);\n    const cur = Math.floor(filled / PLANET_SIZE); // 지금 채우는 행성 번호 (0부터)\n    const theme = PLANET_THEMES[cur % PLANET_THEMES.length];\n    const start = cur * PLANET_SIZE;\n    $('boardTitle').textContent = `${d.me.name} 도장판`;\n\n    // 완성한 행성들\n    let done = '';\n    for (let i = 0; i < cur; i++) {\n      const t = PLANET_THEMES[i % PLANET_THEMES.length];\n      done += `<span class=\"done-planet\" title=\"${esc(t.name)}\">${t.icon}<small>${i * PLANET_SIZE + 1}~${(i + 1) * PLANET_SIZE}</small></span>`;\n    }\n    $('donePlanets').innerHTML = cur ? `<div class=\"muted\" style=\"text-align:center;color:#cfe3ff\">완성한 행성 ${cur}개</div><div class=\"done-row\">${done}</div>` : '';\n    $('planetName').textContent = `${cur + 1}번째 · ${theme.name}`;\n\n    const planet = $('planet');\n    planet.style.setProperty('--pbase', theme.base);\n    planet.style.setProperty('--pland', theme.land);\n    let n = 0;\n    planet.innerHTML = PLANET_ROWS.map((cnt) => {\n      let row = '';\n      for (let i = 0; i < cnt; i++) {\n        n++;\n        const num = start + n;\n        const on = num <= filled;\n        const isNew = on && num > prev;\n        row += `<div class=\"slot ${on ? 'on' : ''} ${isNew ? 'new' : ''}\">${on ? '★' : num}</div>`;\n      }\n      return `<div class=\"prow\">${row}</div>`;\n    }).join('');\n    $('stampCount').innerHTML = `도장 <b>${total}</b>개`;\n    const left = (cur + 1) * PLANET_SIZE - filled;\n    $('bonus').textContent = `다음 행성까지 ${left}개!`;\n    if (S.lastTotal != null) {\n      if (Math.floor(Math.max(0, S.lastTotal) / PLANET_SIZE) < cur) toast(`🎉 ${cur}번째 행성 완성! 새 행성이 열렸어요!`);\n      else if (total > S.lastTotal) toast(`도장 ${signed(total - S.lastTotal)}! 🎉`);\n    }\n    S.lastTotal = total;\n  }\n\n  function renderSummary(d) {\n    $('groups').innerHTML = d.groups.map((g) =>\n      `<div class=\"card\"><div class=\"k\">${g.icon} ${esc(g.label)}</div><div class=\"v ${g.total < 0 ? 'minus' : ''}\">${g.total}</div></div>`).join('');\n    const dr = d.draw;\n    $('extra').innerHTML =\n      `<div class=\"card\"><div class=\"k\">🔥 일퀘 연속</div><div class=\"v\">${d.streak}일</div></div>` +\n      `<div class=\"card\"><div class=\"k\">🎟 쿠폰 뽑기권</div><div class=\"v\">${dr.tickets}장</div></div>`;\n    const parts = [];\n    parts.push(dr.stampGoal ? `🎉 도장 ${dr.threshold}개 달성! 뽑기권 +1` : `도장 ${dr.threshold}개까지 <b class=\"yellow\">${dr.toGoal}개</b> 남았어요!`);\n    parts.push(dr.allClear ? '🎉 일퀘 올클리어! 뽑기권 +1' : `일퀘를 ${d.dayCount}일 모두 완료하면 뽑기권 +1`);\n    $('drawMsg').innerHTML = parts.join('<br>');\n  }\n\n  function renderQuest(d) {\n    $('questTitle').textContent = `${d.me.name} 일퀘판`;\n    $('questBody').innerHTML = d.questBoard.map((q) => {\n      const mark = q.state === 'O' ? '<span class=\"mark o\">O</span>'\n        : q.state === 'X' ? '<span class=\"mark x\">X</span>'\n        : q.state === 'today' ? '<span style=\"font-weight:700\">오늘 도전 중!</span>' : '';\n      return `<tr class=\"${q.state === 'today' ? 'today' : ''}\"><td>${md(q.date)}(${wd(q.date)})</td>\n        <td style=\"text-align:center\">${mark}</td><td style=\"text-align:center\">${q.friend ? esc(q.friend) : q.friendHidden ? '<span style=\"color:#8a94a8\">🙈 숨김</span>' : ''}</td></tr>`;\n    }).join('');\n  }\n\n  function renderSigns(d) {\n    $('signTitle').textContent = `${d.me.name} 싸인판`;\n    const list = d.classSigns;\n    const slots = Math.max(15, Math.ceil(list.length / 5) * 5);\n    let html = '';\n    for (let i = 0; i < slots; i++) {\n      const s = list[i];\n      if (!s) { html += `<div class=\"sign\"><span class=\"n\">${i + 1}</span></div>`; continue; }\n      html += `<div class=\"sign on ${s.mvp ? 'mvp' : ''}\"><span class=\"n\">${i + 1}</span>\n        <div class=\"s\">${s.mvp ? '🏅MVP' : '+' + s.score}</div>\n        <div>${esc(s.subject || '수업')}</div><div>${md(s.date)}${s.period ? ' ' + esc(s.period) + '교시' : ''}</div></div>`;\n    }\n    $('signs').innerHTML = html;\n  }\n\n  function renderToday(d) {\n    $('tt').innerHTML = d.timetable.length\n      ? d.timetable.map((p) => `<div><small>${p.period}교시${p.start ? ' ' + esc(p.start) : ''}</small><b>${esc(p.subject)}</b></div>`).join('')\n      : '<p class=\"muted\" style=\"margin:0\">오늘은 수업이 없어요.</p>';\n    $('ttMemo').textContent = d.timetableMemo ? '📌 ' + d.timetableMemo : '';\n\n    const q = d.todayQuest;\n    const locked = !q.available || q.stamped;\n    $('questStatus').innerHTML = !q.available\n      ? '<p class=\"muted\">오늘은 캠페인 등교일이 아니라서 퀘스트를 입력할 수 없어요.</p>'\n      : q.stamped ? '<div class=\"stamp-done\">🎉 오늘 일퀘 완료! 도장 +1</div>'\n      : '<p class=\"muted\" style=\"margin:0\">3가지를 모두 완료하면 도장 +1 (양심에 따라 체크해요!)</p>';\n\n    // 칭찬\n    $('qPraise').className = 'quest' + (q.praise.done ? ' done' : '');\n    $('qPraiseSt').textContent = q.praise.done ? '완료' : '0/1';\n    $('praiseDone').classList.toggle('hidden', !q.praise.done);\n    $('praiseDone').innerHTML = q.praise.done ? `✅ 오늘은 <b class=\"yellow\">${esc(q.praise.toName)}</b>에게 칭찬했어요!` : '';\n    $('praiseForm').classList.toggle('hidden', q.praise.done || !q.available);\n    $('praiseHidden').classList.toggle('hidden', !q.praise.hidden);\n    $('praiseHidden').innerHTML = q.praise.hidden ? '🙈 담임 선생님이 칭찬을 숨겼어요. 미션이 취소됩니다.<br>다시 칭찬을 써주세요.' : '';\n    $('friendChips').innerHTML = d.friends.map((f) =>\n      `<button class=\"chip ${S.praiseTo === f.no ? 'on' : ''}\" data-friend=\"${esc(f.no)}\" ${f.praised ? 'disabled' : ''}>${esc(f.name)}</button>`).join('');\n    updatePraiseCount();\n\n    // 인사\n    const g = q.greet;\n    $('qGreet').className = 'quest' + (g.done ? ' done' : '');\n    $('qGreetSt').textContent = g.done ? '완료' : `${g.list.length}/2`;\n    $('greetList').innerHTML = g.list.map((t, i) =>\n      `<span class=\"greeted\">🙇 ${esc(t)} ${locked ? '' : `<button data-ungreet=\"${i}\" aria-label=\"지우기\">×</button>`}</span>`).join('');\n    $('greetForm').classList.toggle('hidden', locked || g.list.length >= 2);\n    $('teacherChips').innerHTML = d.teachers.filter((t) => g.list.indexOf(t) < 0)\n      .map((t) => `<button class=\"chip\" data-teacher=\"${esc(t)}\">${esc(t)}</button>`).join('');\n\n    // 졸지 않기\n    const z = q.doze;\n    $('qDoze').className = 'quest' + (z.done ? ' done' : z.failed ? ' fail' : '');\n    $('qDozeSt').textContent = z.done ? '완료' : z.failed ? '실패' : `${z.answered}/${z.periods.length}`;\n    $('dozeHelp').innerHTML = `교시마다 골라 주세요. 😴 졸았어요가 <b>${z.allowed}개 이하</b>면 성공! (지금 😴 ${z.dozed}개)`;\n    $('dozeList').innerHTML = z.periods.map((p) => `<div class=\"dz\">\n        <div class=\"p\">${p.period}교시 <small>${esc(p.subject)}</small></div>\n        <button class=\"o ${p.val === 'O' ? 'on' : ''}\" data-doze=\"${p.period}\" data-val=\"O\" ${locked ? 'disabled' : ''}>😊 안 졸았어요</button>\n        <button class=\"x ${p.val === 'X' ? 'on' : ''}\" data-doze=\"${p.period}\" data-val=\"X\" ${locked ? 'disabled' : ''}>😴 졸았어요</button>\n      </div>`).join('');\n  }\n\n  function updatePraiseCount() {\n    const d = S.data;\n    if (!d) return;\n    const n = $('praiseText').value.replace(/\\s/g, '').length;\n    $('praiseCount').textContent = `${n}자 / 최소 ${d.praiseMinLength}자`;\n    $('praiseCount').style.color = n >= d.praiseMinLength ? 'var(--green)' : '';\n  }\n\n  function renderInbox(d) {\n    $('inbox').innerHTML = d.inbox.length\n      ? d.inbox.map((p) => p.hidden ? `<div class=\"letter hid\">🙈 담임 선생님이 숨긴 칭찬이에요 <span style=\"font-size:12px\">(${md(p.date)})</span></div>` : `<div class=\"letter\">\n          <div><span class=\"from\">From. ${esc(p.fromName)}</span> <span class=\"d\">${md(p.date)}</span></div>\n          <div class=\"txt\">${esc(p.text)}</div>\n          <button class=\"thanks\" data-thank=\"${esc(p.id)}\" ${p.thanked ? 'disabled' : ''}>${p.thanked ? '💗 고마워 보냄' : '💗 고마워'}</button>\n        </div>`).join('')\n      : '<p class=\"muted\">아직 받은 칭찬이 없어요. 먼저 친구를 칭찬해 볼까요?</p>';\n  }\n\n  function renderRecords(d) {\n    const line = (r) => `<div class=\"rec\"><span class=\"d\">${md(r.date)}</span><span class=\"l\">${esc(r.label)}</span>\n      <span class=\"${r.score < 0 ? 'minus' : 'plus'}\">${signed(r.score)}</span></div>`;\n    const minus = d.records.filter((r) => r.score < 0);\n    $('minusBox').innerHTML = minus.length\n      ? `<h3>차감 내역 (총 ${d.minusTotal})</h3>${minus.map(line).join('')}`\n      : '<p class=\"muted\">차감된 도장이 없어요. 👍</p>';\n    $('records').innerHTML = d.records.length ? d.records.map(line).join('') : '<p class=\"muted\">아직 기록이 없어요.</p>';\n  }\n\n  // ---------- 이벤트 ----------\n  $('loginBtn').onclick = login;\n  $('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });\n  $('refreshBtn').onclick = () => refresh(false);\n  $('friendChips').onclick = (e) => {\n    const b = e.target.closest('[data-friend]');\n    if (!b || b.disabled) return;\n    S.praiseTo = b.dataset.friend;\n    document.querySelectorAll('#friendChips .chip').forEach((c) => c.classList.toggle('on', c === b));\n  };\n  $('praiseText').addEventListener('input', updatePraiseCount);\n  $('praiseBtn').onclick = async () => {\n    const d = S.data, text = $('praiseText').value.trim();\n    if (!S.praiseTo) return toast('칭찬할 친구를 골라 주세요.', true);\n    if (text.replace(/\\s/g, '').length < d.praiseMinLength) return toast(`칭찬은 ${d.praiseMinLength}자 이상 써 주세요.`, true);\n    $('praiseBtn').disabled = true;\n    if (await act('praiseSubmit', S.praiseTo, text)) { $('praiseText').value = ''; S.praiseTo = ''; }\n    $('praiseBtn').disabled = false;\n  };\n  $('teacherChips').onclick = (e) => { const b = e.target.closest('[data-teacher]'); if (b) act('questGreet', b.dataset.teacher); };\n  $('greetBtn').onclick = async () => {\n    const v = $('greetInput').value.trim();\n    if (!v) return toast('선생님 이름을 입력해 주세요.', true);\n    if (await act('questGreet', v)) $('greetInput').value = '';\n  };\n  $('greetList').onclick = (e) => { const b = e.target.closest('[data-ungreet]'); if (b) act('questUngreet', Number(b.dataset.ungreet)); };\n  $('dozeList').onclick = (e) => {\n    const b = e.target.closest('[data-doze]');\n    if (!b || b.disabled) return;\n    const val = b.classList.contains('on') ? '' : b.dataset.val; // 같은 버튼을 다시 누르면 선택 취소\n    act('questDoze', Number(b.dataset.doze), val);\n  };\n  $('inbox').onclick = (e) => { const b = e.target.closest('[data-thank]'); if (b && !b.disabled) act('praiseThank', b.dataset.thank); };\n  $('logoutBtn').onclick = logoutLocal;\n\n  setInterval(() => { if (S.token && document.visibilityState === 'visible') refresh(true); }, 30000);\n  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.token) refresh(true); });\n\n  $('no').value = load('tutuNo') || '';\n  S.token = load('tutuToken');\n  if (S.token) refresh(false);\n</script>\n</body>\n</html>\n",
  "Styles": "<link rel=\"preconnect\" href=\"https://fonts.googleapis.com\">\n<link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin>\n<link href=\"https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Jua&family=Noto+Sans+KR:wght@400;500;700;900&display=swap\" rel=\"stylesheet\">\n<style>\n  /* 포스터 톤: 검은 배경 + 은색 메탈 프레임 + 파란 네온 + 네이비 박스, 강조 노랑·하늘 */\n  :root {\n    --bg: #03050a;\n    --navy: #13294b;\n    --navy-2: #0d1d38;\n    --navy-line: #2a4a7c;\n    --metal-hi: #f4f6f8;\n    --metal-mid: #b9c0c8;\n    --metal-lo: #7d8691;\n    --ink: #13294b;\n    --neon: #2f8bff;\n    --sky: #5cc8ff;\n    --yellow: #ffd23f;\n    --red: #ff6b6b;\n    --green: #4ade80;\n    --text: #eef3fb;\n    --muted: #9fb3d1;\n    --cut: 18px;\n    --radius: 12px;\n    font-size: 16px;\n  }\n  * { box-sizing: border-box; }\n  html, body { margin: 0; padding: 0; }\n  body {\n    min-height: 100vh;\n    background:\n      radial-gradient(1px 1px at 12% 18%, #ffffff66 50%, transparent 51%),\n      radial-gradient(1px 1px at 72% 8%, #ffffff55 50%, transparent 51%),\n      radial-gradient(1.5px 1.5px at 42% 62%, #ffffff44 50%, transparent 51%),\n      radial-gradient(1px 1px at 88% 44%, #ffffff55 50%, transparent 51%),\n      radial-gradient(1px 1px at 22% 82%, #ffffff44 50%, transparent 51%),\n      radial-gradient(ellipse at 50% -10%, #0b2a5a 0%, transparent 60%),\n      var(--bg);\n    color: var(--text);\n    font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;\n    line-height: 1.5;\n    -webkit-font-smoothing: antialiased;\n  }\n  /* 포스터 양옆의 파란 네온 */\n  body::before, body::after {\n    content: ''; position: fixed; top: 12%; bottom: 12%; width: 3px; z-index: 0; pointer-events: none;\n    background: linear-gradient(transparent, var(--neon) 20%, var(--neon) 30%, transparent 45%, transparent 70%, var(--neon) 82%, transparent);\n    box-shadow: 0 0 12px var(--neon), 0 0 28px var(--neon);\n    opacity: .75;\n  }\n  body::before { left: 0; }\n  body::after { right: 0; }\n\n  .wrap { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; padding: 16px 14px 60px; }\n  .title-font { font-family: 'Black Han Sans', 'Noto Sans KR', sans-serif; font-weight: 400; letter-spacing: .5px; }\n\n  /* 은색 메탈 프레임 (모서리 깎임) */\n  .metal {\n    position: relative;\n    background: linear-gradient(135deg, var(--metal-hi) 0%, var(--metal-mid) 28%, var(--metal-hi) 48%, var(--metal-lo) 72%, var(--metal-hi) 100%);\n    color: var(--ink);\n    clip-path: polygon(var(--cut) 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, var(--cut) 100%, 0 calc(100% - var(--cut)), 0 var(--cut));\n    padding: 18px 20px;\n  }\n  .hero { text-align: center; padding: 22px 18px 18px; }\n  .hero h1 { margin: 0; font-size: clamp(26px, 6vw, 44px); line-height: 1.15; color: var(--ink); word-break: keep-all; }\n  .hero h1 .line { display: block; }\n  .hero .sub { margin-top: 6px; font-weight: 700; color: var(--ink); opacity: .85; font-size: clamp(13px, 3.4vw, 17px); }\n  .hero .deco { height: 8px; margin: 10px auto 0; max-width: 520px;\n    background: repeating-linear-gradient(135deg, var(--ink) 0 8px, transparent 8px 14px); opacity: .85; }\n  .hero .tag { display: inline-block; margin-top: 10px; background: var(--ink); color: var(--sky); padding: 3px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; }\n\n  /* 네이비 박스 (오른쪽 위 모서리 깎임) */\n  .box {\n    background: linear-gradient(180deg, var(--navy) 0%, var(--navy-2) 100%);\n    border: 1px solid var(--navy-line);\n    clip-path: polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 0 100%);\n    padding: 16px;\n    margin-top: 14px;\n    box-shadow: inset 0 0 0 1px #ffffff0d;\n  }\n  .box h2 { margin: 0 0 10px; font-size: 20px; color: var(--sky); }\n  .box h3 { margin: 14px 0 8px; font-size: 16px; color: var(--yellow); }\n  .neon-line { height: 1px; background: linear-gradient(90deg, transparent, var(--sky), transparent); margin: 12px 0; box-shadow: 0 0 6px var(--sky); }\n  .muted { color: var(--muted); font-size: 13px; }\n  .yellow { color: var(--yellow); }\n  .sky { color: var(--sky); }\n  .plus { color: var(--sky); font-weight: 700; }\n  .minus { color: var(--red); font-weight: 700; }\n\n  /* 버튼·입력 (모바일 터치용 큰 크기) */\n  .btn {\n    appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 700;\n    min-height: 46px; padding: 10px 18px; border-radius: 10px;\n    background: linear-gradient(180deg, #3a9bff, #1f6fe0); color: #fff;\n    box-shadow: 0 0 0 1px #7cc0ff55, 0 0 14px #2f8bff55;\n    transition: transform .05s, filter .15s;\n  }\n  .btn:active { transform: translateY(1px); }\n  .btn:disabled { filter: grayscale(.8) brightness(.7); cursor: not-allowed; }\n  .btn.yellow { background: linear-gradient(180deg, #ffe066, #f5b800); color: #1a1a1a; box-shadow: 0 0 12px #ffd23f55; }\n  .btn.ghost { background: transparent; color: var(--sky); box-shadow: inset 0 0 0 1px var(--sky); }\n  .btn.danger { background: transparent; color: var(--red); box-shadow: inset 0 0 0 1px var(--red); }\n  .btn.sm { min-height: 34px; padding: 4px 12px; font-size: 14px; border-radius: 8px; }\n  .btn.block { width: 100%; }\n  input, select, textarea {\n    font: inherit; color: var(--text); background: #081427; border: 1px solid var(--navy-line);\n    border-radius: 10px; padding: 11px 12px; min-height: 46px; width: 100%;\n  }\n  input:focus, select:focus, textarea:focus { outline: none; border-color: var(--sky); box-shadow: 0 0 0 2px #5cc8ff33; }\n  label { display: block; font-size: 14px; color: var(--muted); margin: 10px 0 4px; }\n  .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }\n  .row > * { flex: 1 1 auto; }\n  .grow { flex: 1 1 200px; }\n\n  /* 칩 (학생 선택 등) */\n  .chips { display: flex; flex-wrap: wrap; gap: 8px; }\n  .chip {\n    appearance: none; font: inherit; cursor: pointer; min-height: 42px; padding: 6px 12px; border-radius: 999px;\n    background: #0a1a33; color: var(--text); border: 1px solid var(--navy-line);\n  }\n  .chip.on { background: var(--sky); color: #04203d; border-color: var(--sky); font-weight: 700; box-shadow: 0 0 10px #5cc8ff88; }\n\n  /* 탭 */\n  .tabs { display: flex; gap: 6px; margin-top: 14px; overflow-x: auto; -webkit-overflow-scrolling: touch; }\n  .tab {\n    appearance: none; font: inherit; cursor: pointer; white-space: nowrap; min-height: 44px; padding: 8px 16px;\n    background: #0a1a33; color: var(--muted); border: 1px solid var(--navy-line); border-radius: 10px 10px 0 0; font-weight: 700;\n  }\n  .tab.on { background: var(--navy); color: var(--yellow); border-color: var(--sky); box-shadow: 0 -2px 10px #2f8bff44; }\n\n  /* 표 */\n  .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }\n  table { width: 100%; border-collapse: collapse; font-size: 14px; }\n  th, td { padding: 8px 8px; border-bottom: 1px solid #ffffff14; text-align: center; white-space: nowrap; }\n  th { color: var(--sky); font-weight: 700; position: sticky; top: 0; background: var(--navy); }\n  td.left, th.left { text-align: left; }\n  tr.cancelled td { color: #6f7f99; text-decoration: line-through; }\n  .medal { display: inline-block; min-width: 28px; font-weight: 900; }\n\n  /* 카드 */\n  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }\n  .card { background: #0a1a33; border: 1px solid var(--navy-line); border-radius: 10px; padding: 12px; }\n  .card .k { font-size: 12px; color: var(--muted); }\n  .card .v { font-size: 22px; font-weight: 900; color: var(--yellow); }\n\n  .warn { background: #3a1d0a; border: 1px solid #ff9f43; color: #ffd8a8; border-radius: 10px; padding: 10px 12px; margin-top: 10px; font-size: 14px; }\n  .pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }\n  .pill.on { background: var(--yellow); color: #1a1a1a; }\n  .pill.off { background: #20314f; color: var(--muted); }\n\n  /* 토스트 / 모달 / 로딩 */\n  #toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 50; max-width: 92vw;\n    background: #0a1a33; color: var(--text); border: 1px solid var(--sky); border-radius: 12px; padding: 12px 18px;\n    box-shadow: 0 0 20px #2f8bff66; display: none; font-weight: 700; }\n  #toast.err { border-color: var(--red); box-shadow: 0 0 20px #ff6b6b66; }\n  .modal-bg { position: fixed; inset: 0; z-index: 40; background: #000000b0; display: flex; align-items: center; justify-content: center; padding: 16px; }\n  .modal { width: 100%; max-width: 420px; }\n  .modal .box { margin: 0; }\n  #loading { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 60; display: none;\n    background: linear-gradient(90deg, transparent, var(--sky), transparent); background-size: 50% 100%;\n    animation: scan 1s linear infinite; box-shadow: 0 0 8px var(--sky); }\n  @keyframes scan { from { background-position: -50% 0; } to { background-position: 150% 0; } }\n  .hidden { display: none !important; }\n</style>\n",
};
