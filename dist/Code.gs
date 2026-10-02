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
  TEACHERS: '교과선생님',
};

// type: string | int | bool | date | dateList | list | code
const CONFIG_DEFS = [
  { key: 'webAppUrl', label: '웹앱 주소', type: 'string', def: '', desc: '배포 → 배포 관리에서 복사한 …/exec 주소. 메뉴 [웹앱 주소 보기]가 이 주소를 보여 줌' },
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
  { key: 'teachers', label: '교과 선생님 목록', type: 'list', def: '', desc: '(예비용) "교과선생님" 시트가 비어 있을 때만 사용. 이름(과목) 형식, 쉼표로 구분' },
  { key: 'adminCode', label: '담임 코드', type: 'code', def: '', desc: '담임 대시보드 입장 코드. 비우면 초기 세팅 때 자동 생성' },
  { key: 'accuseResultPublic', label: '지목 결과 공개', type: 'bool', def: false, desc: 'ON이면 검거 결과를 다른 투투에게 공개' },
  { key: 'excludedSubjects', label: '캠페인 제외 과목', type: 'list', def: '동아리', desc: '쉼표로 구분. 졸지 않기 체크·교과 도장에서 빠짐 (시간표에는 회색으로 표시)' },
  { key: 'testMode', label: '테스트 모드', type: 'bool', def: false, desc: 'ON이면 오늘을 등교일로 취급 (캠페인 전 테스트용). 테스트가 끝나면 꼭 OFF' },
  { key: 'periodCount', label: '교시 수', type: 'int', def: 6, desc: '교과 선생님 화면의 교시 버튼 개수' },
  { key: 'reward1', label: '1위 보상', type: 'string', def: '특별 간식 + 자리 우선권 2회 + 청소 면제권 5장 + 보은페이 보너스 100원', desc: '' },
  { key: 'reward2', label: '2위 보상', type: 'string', def: '간식 + 자리 우선권 2회 + 청소 면제권 3장', desc: '' },
  { key: 'reward3', label: '3위 보상', type: 'string', def: '간식 + 자리 우선권 2회 + 청소 면제권 2장', desc: '' },
  { key: 'reward4', label: '4위 보상', type: 'string', def: '간식 + 자리 우선권 1회', desc: '' },
  { key: 'reward5', label: '5위 보상', type: 'string', def: '간식 + 청소 면제권 1장', desc: '' },
];

const CACHE_KEYS = { CONFIG: 'config_v1', STUDENTS: 'students_v1', TIMETABLE: 'timetable_v1' };

/**
 * 스프레드시트 핸들. 초기 세팅 때 ID를 저장해 두면 웹앱에서도 확실히 같은 파일을 연다.
 * 파일 열기는 느리므로 한 번의 실행(요청) 안에서는 한 번만 열고 재사용한다.
 */
let SS_MEMO_ = null;
const SHEET_MEMO_ = {};

function ss_() {
  if (SS_MEMO_) return SS_MEMO_;
  const id = PropertiesService.getScriptProperties().getProperty('SS_ID');
  SS_MEMO_ = id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActive();
  return SS_MEMO_;
}

/** 시트 찾기 (없으면 null). 찾은 시트는 실행 동안 기억한다. */
function sheetByName_(name) {
  if (SHEET_MEMO_[name]) return SHEET_MEMO_[name];
  const sh = ss_().getSheetByName(name);
  if (sh) SHEET_MEMO_[name] = sh;
  return sh;
}

/** 머리글을 뺀 데이터 행을 한 번의 요청으로 읽는다 (행 i → 시트 i+2행). 열 수는 ncols로 맞춘다. */
function dataRows_(sh, ncols) {
  if (!sh) return [];
  return sh.getDataRange().getValues().slice(1).map((r) => {
    const row = r.slice(0, ncols);
    while (row.length < ncols) row.push('');
    return row;
  });
}

function sheet_(name) {
  const sh = sheetByName_(name);
  if (!sh) throw new Error(`"${name}" 시트가 없어요. 메뉴에서 [시트 초기 세팅]을 먼저 실행해 주세요.`);
  return sh;
}

function getConfig() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(CACHE_KEYS.CONFIG);
  if (hit) return JSON.parse(hit);
  const cfg = readConfigFromSheet_();
  cache.put(CACHE_KEYS.CONFIG, JSON.stringify(cfg), cfg.testMode ? 60 : 600);
  return cfg;
}

function readConfigFromSheet_() {
  const raw = {};
  const sh = sheetByName_(SHEETS.CONFIG);
  if (sh) {
    dataRows_(sh, 2).forEach((r) => {
      const label = String(r[0]).trim();
      if (label) raw[label] = r[1];
    });
  }
  const cfg = {};
  CONFIG_DEFS.forEach((d) => {
    cfg[d.key] = parseConfigValue_(d, Object.prototype.hasOwnProperty.call(raw, d.label) ? raw[d.label] : '');
  });
  if (!cfg.schoolDays.length) cfg.schoolDays = weekdaysBetween_(cfg.startDate, cfg.endDate);
  // 테스트 모드: 오늘도 등교일로 본다
  const today = todayStr_();
  if (cfg.testMode && cfg.schoolDays.indexOf(today) < 0) cfg.schoolDays = cfg.schoolDays.concat(today).sort();
  cfg.rewards = [cfg.reward1, cfg.reward2, cfg.reward3, cfg.reward4, cfg.reward5];
  const fromSheet = readTeacherSheet_();
  cfg.teacherList = fromSheet.length ? fromSheet : cfg.teachers.map(parseTeacher_);
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

/** "교과선생님" 시트: 과목 | 선생님 이름 (이름이 빈 줄은 건너뜀) */
function readTeacherSheet_() {
  const sh = sheetByName_(SHEETS.TEACHERS);
  const seen = {};
  return dataRows_(sh, 2)
    .map((r) => ({ subject: String(r[0]).trim(), name: String(r[1]).trim() }))
    .filter((t) => t.name && !seen[t.name] && (seen[t.name] = true));
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
  return dataRows_(sheet_(SHEETS.STUDENTS), STUDENT_HEADERS.length)
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
  return dataRows_(sheet_(SHEETS.LEDGER), LEDGER_HEADERS.length).map((r, i) => ({
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

/**
 * 자동 갱신(30초 폴링)처럼 "조금 지난 데이터여도 되는" 요청에서 true로 둔다.
 * 그러면 다른 사람이 방금 기록해 버전이 바뀌었어도, 45초 안에 만든 최신 계산 결과를 재사용한다.
 * 본인이 버튼을 누른 요청은 false(기본) → 항상 새로 계산.
 */
let ALLOW_STALE_ = false;
const STALE_MS = 45 * 1000;

/** 정확한 버전이 없을 때 쓸 수 있는 최근 버전 (없으면 null) */
function staleVersion_(kind) {
  if (!ALLOW_STALE_) return null;
  const hit = CacheService.getScriptCache().get(`last_${kind}_${todayStr_()}`);
  if (!hit) return null;
  const last = JSON.parse(hit);
  return Date.now() - last.at < STALE_MS ? last.ver : null;
}

/** 캐시된 전체 통계 (로그인 코드·입력자 등 민감정보 없음). prev = 직전 등교일 기준 순위 */
function getStats_() {
  const cache = CacheService.getScriptCache();
  const today = todayStr_();
  const hit = cache.get(`stats_${dataVersion_()}_${today}`);
  if (hit) return JSON.parse(hit);
  const sv = staleVersion_('bundle');
  const stale = sv && cache.get(`stats_${sv}_${today}`);
  return stale ? JSON.parse(stale) : buildDataBundle_().stats;
}

/** 투투 한 명의 기록 요약 (캐시) */
function getStudentHistory_(no) {
  const cache = CacheService.getScriptCache();
  const today = todayStr_();
  const hit = cache.get(`hist_${dataVersion_()}_${today}_${no}`);
  if (hit) return JSON.parse(hit);
  const sv = staleVersion_('bundle');
  const stale = sv && cache.get(`hist_${sv}_${today}_${no}`);
  if (stale) return JSON.parse(stale);
  return buildDataBundle_().hist[no] || { records: [], questDates: [], praiseTo: {}, praiseHidden: {}, praisedNos: [], inbox: [], quest: null, drawDone: 0 };
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
  const blank = () => ({ records: [], questDates: [], praiseTo: {}, praiseHidden: {}, praisedNos: [], inbox: [], quest: null, drawDone: 0 });
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
  const drawDone = readDrawDone_();
  Object.keys(drawDone).forEach((no) => { if (hist[no]) hist[no].drawDone = drawDone[no]; });
  readQuestRows_().forEach((q) => {
    if (q.date === today && hist[q.no]) hist[q.no].quest = { praiseDone: q.praiseDone, stamped: q.stamped, greet: q.greet, doze: q.doze };
  });

  const put = {};
  put[`stats_${ver}_${today}`] = JSON.stringify(stats);
  Object.keys(hist).forEach((no) => (put[`hist_${ver}_${today}_${no}`] = JSON.stringify(hist[no])));
  put[`last_bundle_${today}`] = JSON.stringify({ ver, at: Date.now() });
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
  const sh = sheetByName_(SHEETS.TIMETABLE);
  if (sh) {
    dataRows_(sh, TIMETABLE_HEADERS.length).forEach((r) => {
      const p = parseInt(r[0], 10);
      if (!p) return;
      tt.periods.push({ period: p, start: toTimeStr_(r[1]) });
      for (let w = 1; w <= 5; w++) tt.week[w][p] = String(r[w + 1]).trim();
    });
  }
  const ov = sheetByName_(SHEETS.TT_OVERRIDE);
  if (ov) {
    dataRows_(ov, TT_OVERRIDE_HEADERS.length).forEach((r) => {
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
  const excluded = getConfig().excludedSubjects || [];
  return tt.periods
    .map((p) => {
      const subject = ov ? ov.subjects[p.period] || '' : (tt.week[w] && tt.week[w][p.period]) || '';
      return { period: p.period, start: p.start, subject, excluded: excluded.indexOf(subject) >= 0 };
    })
    .filter((p) => p.subject);
}

function timetableMemo_(dateStr) {
  const ov = getTimetable_().overrides[dateStr];
  return ov ? ov.memo : '';
}

/**
 * 지금 시각이 속한 교시 (교과 선생님 화면 자동 선택용).
 * 교시 시작 10분 전부터 다음 교시 시작 10분 전까지를 그 교시로 본다. 수업이 없거나 제외 과목이면 null.
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
  return found && !found.excluded ? found : null; // 제외 과목(동아리 등) 시간에는 자동 선택 안 함
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
  const sh = sheetByName_(SHEETS.QUEST);
  return dataRows_(sh, QUEST_HEADERS.length).map((r, i) => ({
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
  const sh = sheetByName_(SHEETS.PRAISE);
  return dataRows_(sh, PRAISE_HEADERS.length).map((r, i) => ({
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
  if (list.length) return list.filter((p) => !p.excluded); // 동아리 등 제외 과목은 체크하지 않음
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

// ===================== SpyApi.gs =====================
/**
 * 미션2: 욕설 암행어사를 찾아라!
 * - 담임이 비밀리에 암행어사 지정(임기 1주). 정체는 본인 화면에만 내려보낸다.
 * - 암행어사 일일 판정(하루 1회): 바른 1·2·3위 +5/+3/+1, 나쁜 1·2·3위 −5/−3/−1, 제출 시 활동 보상 +3
 * - 지목(기간 중 1회): 현 암행어사를 맞히면 그 암행어사가 "암행어사 활동 보상"으로 받은 도장 전부를 가져온다
 *   (기록장에 −/+ 두 줄), 암행어사는 즉시 직위 상실 → 담임에게 "새 암행어사 지정 필요"
 * - 실패하면 기회만 소진. 결과는 본인에게만 (설정 "지목 결과 공개" ON이면 검거 소식 공개)
 */

const SPY_HEADERS = ['주차', '학생번호', '시작일', '종료일', '상태', '변경시각'];
const SPY_JUDGE_HEADERS = ['날짜', '암행어사번호', '바른1위', '바른2위', '바른3위', '나쁜1위', '나쁜2위', '나쁜3위', '타임스탬프'];
const ACCUSE_HEADERS = ['타임스탬프', '지목한번호', '지목된번호', '결과', '날짜', '이전도장수'];
const GOOD_SCORES = [5, 3, 1];
const BAD_SCORES = [-5, -3, -1];
const SPY_REWARD = 3;

// ---------- 읽기 ----------

function readSpies_() {
  const sh = sheetByName_(SHEETS.SPY);
  return dataRows_(sh, SPY_HEADERS.length).map((r, i) => ({
    row: i + 2,
    week: String(r[0]).trim(),
    no: String(r[1]).trim(),
    start: toDateStr_(r[2]),
    end: toDateStr_(r[3]),
    status: String(r[4]).trim() || '활동중',
  })).filter((s) => s.no && s.start && s.end);
}

function readJudges_() {
  const sh = sheetByName_(SHEETS.SPY_JUDGE);
  return dataRows_(sh, SPY_JUDGE_HEADERS.length).map((r) => ({
    date: toDateStr_(r[0]),
    spy: String(r[1]).trim(),
    good: [r[2], r[3], r[4]].map((x) => String(x).trim()).filter(Boolean),
    bad: [r[5], r[6], r[7]].map((x) => String(x).trim()).filter(Boolean),
  })).filter((j) => j.date);
}

function readAccuses_() {
  const sh = sheetByName_(SHEETS.ACCUSE);
  return dataRows_(sh, ACCUSE_HEADERS.length).map((r) => ({
    ts: r[0] instanceof Date ? Utilities.formatDate(r[0], TZ, 'yyyy-MM-dd HH:mm') : String(r[0]),
    from: String(r[1]).trim(),
    to: String(r[2]).trim(),
    result: String(r[3]).trim(),
    date: toDateStr_(r[4]) || (r[0] instanceof Date ? Utilities.formatDate(r[0], TZ, 'yyyy-MM-dd') : ''),
    moved: Number(r[5]) || 0,
  })).filter((a) => a.from);
}

/** 오늘 활동 중인 암행어사 (없으면 null) */
function activeSpy_(spies, today) {
  return spies.find((s) => s.status === '활동중' && s.start <= today && today <= s.end) || null;
}

/** 등교일을 월요일 기준 주 단위로 나눈다 → [{week:1, start, end}] */
function campaignWeeks_() {
  const weeks = [];
  getConfig().schoolDays.forEach((d) => {
    const [y, m, dd] = d.split('-').map(Number);
    const dt = new Date(Date.UTC(y, m - 1, dd));
    dt.setUTCDate(dt.getUTCDate() - ((dt.getUTCDay() + 6) % 7));
    const monday = dt.toISOString().slice(0, 10);
    let w = weeks.find((x) => x.monday === monday);
    if (!w) weeks.push((w = { week: weeks.length + 1, monday, start: d, end: d }));
    w.end = d;
  });
  return weeks.map(({ week, start, end }) => ({ week, start, end }));
}

/** 투투 화면용 요약 (데이터 버전으로 캐시) */
function getSpyData_() {
  const ver = dataVersion_();
  const cache = CacheService.getScriptCache();
  const hit = cache.get(`spy_${ver}`);
  if (hit) return JSON.parse(hit);
  const sv = staleVersion_('spy');
  const stale = sv && cache.get(`spy_${sv}`);
  if (stale) return JSON.parse(stale);
  ensureSchema_();
  const data = { spies: readSpies_(), judgedDates: readJudges_().map((j) => j.date), accuses: readAccuses_() };
  cache.putAll({ [`spy_${ver}`]: JSON.stringify(data), [`last_spy_${todayStr_()}`]: JSON.stringify({ ver, at: Date.now() }) }, CACHE_TTL_SEC);
  return data;
}

// ---------- 투투 화면 데이터 ----------

/** 내 화면에 붙일 암행어사 관련 정보. 암행어사 정체는 본인일 때만 담는다. */
function spyHomeFor_(me, today) {
  const cfg = getConfig();
  const d = getSpyData_();
  const active = activeSpy_(d.spies, today);
  const mine = d.accuses.find((a) => a.from === me.no);
  const nameOf = {};
  getStudentsCached_().forEach((s) => (nameOf[s.no] = s.name));

  const out = {
    accuse: mine
      ? { used: true, success: mine.result === '성공', targetName: nameOf[mine.to] || '', moved: mine.moved, date: mine.date }
      : { used: false },
    news: cfg.accuseResultPublic
      ? d.accuses.filter((a) => a.result === '성공').map((a) => ({ date: a.date, accuser: nameOf[a.from] || '', spy: nameOf[a.to] || '', moved: a.moved }))
      : [],
    mission: null,
  };
  if (active && active.no === me.no) {
    out.mission = {
      week: active.week,
      start: active.start,
      end: active.end,
      isSchoolDay: cfg.schoolDays.indexOf(today) >= 0,
      judgedToday: d.judgedDates.indexOf(today) >= 0,
      reward: SPY_REWARD,
    };
  }
  return out;
}

// ---------- 암행어사 판정 ----------

/** good: [1위, 2위, 3위] 번호 (3명 모두), bad: 0~3명 번호 (순서대로) */
function spyJudge(token, good, bad) {
  const me = requireStudent_(token);
  const cfg = getConfig();
  const today = todayStr_();
  if (cfg.schoolDays.indexOf(today) < 0) throw new Error('오늘은 캠페인 등교일이 아니에요.');
  const valid = new Set(getStudentsCached_().map((s) => s.no));
  const g = (good || []).map(String).filter(Boolean);
  const b = (bad || []).map(String).filter(Boolean);
  if (g.length !== 3) throw new Error('바른 언어 1·2·3위를 모두 골라 주세요.');
  if (b.length > 3) throw new Error('나쁜 언어는 3명까지 고를 수 있어요.');
  const all = g.concat(b);
  if (all.some((n) => !valid.has(n))) throw new Error('없는 친구가 있어요.');
  if (all.indexOf(me.no) >= 0) throw new Error('자기 자신은 고를 수 없어요.');
  if (new Set(all).size !== all.length) throw new Error('한 친구를 두 번 고를 수 없어요. (바른·나쁜 동시 선택도 안 돼요)');

  withLock_(() => {
    ensureSchema_();
    const active = activeSpy_(readSpies_(), today);
    if (!active || active.no !== me.no) throw new Error('지금은 암행어사 임무를 할 수 없어요.');
    if (readJudges_().some((j) => j.date === today)) throw new Error('오늘 판정은 이미 제출했어요.');
    const sh = sheet_(SHEETS.SPY_JUDGE);
    const row = [today, me.no, g[0], g[1], g[2], b[0] || '', b[1] || '', b[2] || '', new Date()];
    sh.getRange(sh.getLastRow() + 1, 1, 1, SPY_JUDGE_HEADERS.length).setValues([row]);
    const recs = [];
    g.forEach((no, i) => recs.push({ date: today, no, mission: '암행어사판정', score: GOOD_SCORES[i], inputType: '암행어사', inputBy: me.no, memo: `바른 언어 ${i + 1}위` }));
    b.forEach((no, i) => recs.push({ date: today, no, mission: '암행어사판정', score: BAD_SCORES[i], inputType: '암행어사', inputBy: me.no, memo: `나쁜 언어 ${i + 1}위` }));
    recs.push({ date: today, no: me.no, mission: '암행어사활동', score: SPY_REWARD, inputType: '시스템', inputBy: '자동', memo: '판정 제출 보상' });
    appendRecords_(recs);
  });
  const home = buildStudentHome_(me);
  home.notice = `🕵️ 오늘 판정 완료! 활동 보상 +${SPY_REWARD}`;
  return home;
}

// ---------- 지목(검거) ----------

function accuseSpy(token, targetNo) {
  const me = requireStudent_(token);
  const cfg = getConfig();
  const today = todayStr_();
  const to = String(targetNo || '').trim();
  if (cfg.schoolDays.indexOf(today) < 0) throw new Error('지목은 캠페인 등교일에만 할 수 있어요.');
  if (!to) throw new Error('지목할 친구를 골라 주세요.');
  if (to === me.no) throw new Error('자기 자신은 지목할 수 없어요.');
  if (!getStudentsCached_().some((s) => s.no === to)) throw new Error('없는 친구예요.');

  let success = false;
  let moved = 0;
  withLock_(() => {
    ensureSchema_();
    if (readAccuses_().some((a) => a.from === me.no)) throw new Error('지목 기회는 기간 중 1번뿐이에요. 이미 사용했어요.');
    const active = activeSpy_(readSpies_(), today);
    success = !!active && active.no === to;
    if (success) {
      moved = readLedger_()
        .filter((r) => !r.cancelled && r.no === to && r.mission === '암행어사활동')
        .reduce((sum, r) => sum + r.score, 0);
      if (moved > 0) {
        appendRecords_([
          { date: today, no: to, mission: '검거이전', score: -moved, inputType: '시스템', inputBy: '자동', memo: `검거됨 → ${me.no}번에게 활동 보상 이전` },
          { date: today, no: me.no, mission: '검거이전', score: moved, inputType: '시스템', inputBy: '자동', memo: `${to}번 암행어사 검거 성공` },
        ]);
      }
      sheet_(SHEETS.SPY).getRange(active.row, 5, 1, 2).setValues([['검거됨', new Date()]]);
    }
    const sh = sheet_(SHEETS.ACCUSE);
    sh.getRange(sh.getLastRow() + 1, 1, 1, ACCUSE_HEADERS.length).setValues([[new Date(), me.no, to, success ? '성공' : '실패', today, moved]]);
    invalidateStats_();
  });
  const home = buildStudentHome_(me);
  home.notice = success
    ? `🎉 검거 성공! 암행어사 활동 보상 ${moved}개를 가져왔어요!`
    : '아쉽지만 암행어사가 아니었어요.';
  home.accuseResult = { success, moved };
  return home;
}

// ---------- 담임 ----------

/** payload: {no, start, end, week} */
function adminAppointSpy(token, payload) {
  requireAdmin_(token);
  const p = payload || {};
  const no = String(p.no || '').trim();
  const start = toDateStr_(p.start || '');
  const end = toDateStr_(p.end || '');
  if (!getStudentsCached_().some((s) => s.no === no)) throw new Error('투투를 선택해 주세요.');
  if (!start || !end || start > end) throw new Error('임기 시작일·종료일을 확인해 주세요.');
  withLock_(() => {
    ensureSchema_();
    const overlap = readSpies_().find((s) => s.status === '활동중' && !(s.end < start || end < s.start));
    if (overlap) throw new Error(`기간이 겹치는 활동 중인 암행어사가 있어요 (${overlap.start.slice(5)}~${overlap.end.slice(5)}). 먼저 해임해 주세요.`);
    const week = String(p.week || (campaignWeeks_().find((w) => w.start <= start && start <= w.end) || {}).week || '');
    const sh = sheet_(SHEETS.SPY);
    sh.getRange(sh.getLastRow() + 1, 1, 1, SPY_HEADERS.length).setValues([[week, no, start, end, '활동중', new Date()]]);
    invalidateStats_();
  });
  return buildAdminDashboard_();
}

/** 실수로 지정했을 때 등: 상태를 "해임"으로 */
function adminDismissSpy(token, row) {
  requireAdmin_(token);
  withLock_(() => {
    const s = readSpies_().find((x) => x.row === Number(row));
    if (!s) throw new Error('암행어사 기록을 찾을 수 없어요.');
    sheet_(SHEETS.SPY).getRange(s.row, 5, 1, 2).setValues([['해임', new Date()]]);
    invalidateStats_();
  });
  return buildAdminDashboard_();
}

/** 담임 대시보드용 암행어사 현황 */
function spyAdminData_(students) {
  const cfg = getConfig();
  const today = todayStr_();
  const nameOf = {};
  students.forEach((s) => (nameOf[s.no] = s.name));
  const nm = (no) => (no ? `${no}. ${nameOf[no] || '?'}` : '');
  const spies = readSpies_();
  const active = activeSpy_(spies, today);
  const inCampaign = cfg.schoolDays.length && cfg.schoolDays[0] <= today && today <= cfg.schoolDays[cfg.schoolDays.length - 1];
  const weeks = campaignWeeks_();
  const curWeek = weeks.find((w) => w.start <= today && today <= w.end) || weeks.find((w) => today < w.start) || weeks[0] || null;
  return {
    active: active ? { no: active.no, name: nameOf[active.no] || '', start: active.start, end: active.end, week: active.week } : null,
    needAppoint: !!inCampaign && !active,
    caughtToday: spies.some((s) => s.status === '검거됨' && !active && s.start <= today && today <= s.end),
    weeks,
    suggest: curWeek ? { week: curWeek.week, start: today > curWeek.start ? today : curWeek.start, end: curWeek.end } : null,
    history: spies.slice().reverse().map((s) => ({
      row: s.row, week: s.week, name: nm(s.no), start: s.start, end: s.end,
      status: s.status === '활동중' && s.end < today ? '임기종료' : s.status,
    })),
    judges: readJudges_().reverse().map((j) => ({ date: j.date, spy: nm(j.spy), good: j.good.map(nm), bad: j.bad.map(nm) })),
    accuses: readAccuses_().reverse().map((a) => ({ ts: a.ts, from: nm(a.from), to: nm(a.to), result: a.result, moved: a.moved })),
    accusedCount: readAccuses_().length,
  };
}

// ===================== DrawApi.gs =====================
/**
 * 보상: 랭킹 보상 대상(1~5위, 공동 순위 포함) + 랜덤 쿠폰 뽑기 대상.
 * - 일퀘 올클(등교일 전부 일퀘 도장) → 뽑기 1회
 * - 순합계 도장이 "뽑기 도장 기준"(기본 12) 이상 → 뽑기 1회
 * - 둘 다 → 2회. 뽑기 자체는 오프라인, 담임이 "뽑기 완료" 횟수를 체크한다.
 * "뽑기" 시트는 담임이 체크할 때마다 전체 현황으로 다시 써 둔다 (뽑기완료횟수가 원본).
 */

const DRAW_HEADERS = ['학생번호', '일퀘올클여부', '도장12개여부', '뽑기횟수', '뽑기완료횟수'];

/** 뽑기 시트의 완료 횟수 {번호: 횟수} */
function readDrawDone_() {
  const sh = sheetByName_(SHEETS.DRAW);
  const out = {};
  dataRows_(sh, DRAW_HEADERS.length).forEach((r) => {
    const no = String(r[0]).trim();
    if (no) out[no] = Number(r[4]) || 0;
  });
  return out;
}

/** 투투별 뽑기 현황 */
function drawStatus_(students, records, statsList) {
  const cfg = getConfig();
  const days = cfg.schoolDays;
  const questDays = {};
  records.forEach((r) => {
    if (!r.cancelled && r.mission === '일퀘' && r.score > 0 && days.indexOf(r.date) >= 0) {
      (questDays[r.no] = questDays[r.no] || new Set()).add(r.date);
    }
  });
  const totalOf = {};
  statsList.forEach((s) => (totalOf[s.no] = s.total));
  const done = readDrawDone_();
  return students.map((s) => {
    const q = questDays[s.no] ? questDays[s.no].size : 0;
    const allClear = days.length > 0 && q === days.length;
    const stampGoal = (totalOf[s.no] || 0) >= cfg.drawStampThreshold;
    const tickets = (allClear ? 1 : 0) + (stampGoal ? 1 : 0);
    return { no: s.no, name: s.name, questDays: q, dayCount: days.length, allClear, total: totalOf[s.no] || 0, stampGoal, tickets, done: done[s.no] || 0 };
  });
}

function writeDrawSheet_(list) {
  const sh = sheet_(SHEETS.DRAW);
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, DRAW_HEADERS.length).clearContent();
  if (!list.length) return;
  sh.getRange(2, 1, list.length, DRAW_HEADERS.length).setValues(
    list.map((d) => [d.no, d.allClear ? 'O' : '', d.stampGoal ? 'O' : '', d.tickets, d.done])
  );
}

/** 뽑기 완료 횟수 설정 (0 ~ 뽑기권 수) */
function adminSetDrawDone(token, no, done) {
  requireAdmin_(token);
  withLock_(() => {
    const { students, records, stats } = buildDataBundle_();
    const list = drawStatus_(students, records, stats.list);
    const d = list.find((x) => x.no === String(no));
    if (!d) throw new Error('투투를 찾을 수 없어요.');
    const n = Number(done);
    if (!Number.isInteger(n) || n < 0) throw new Error('횟수를 확인해 주세요.');
    if (n > Math.max(d.tickets, d.done)) throw new Error(`${d.name}의 뽑기권은 ${d.tickets}장이에요.`);
    d.done = n;
    writeDrawSheet_(list);
    invalidateStats_();
  });
  return buildAdminDashboard_();
}

/** 담임 대시보드용: 랭킹 보상 대상 + 뽑기 대상 */
function rewardAdminData_(students, records, stats) {
  const cfg = getConfig();
  const ranked = stats.list.slice().sort((a, b) => a.rank - b.rank || Number(a.no) - Number(b.no));
  const rankRewards = [];
  for (let r = 1; r <= cfg.rewards.length; r++) {
    const who = ranked.filter((s) => s.rank === r && s.total > 0).map((s) => ({ no: s.no, name: s.name, total: s.total }));
    rankRewards.push({ rank: r, reward: cfg.rewards[r - 1] || '', who });
  }
  return { rankRewards, draws: drawStatus_(students, records, stats.list), threshold: cfg.drawStampThreshold };
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

// ---------- 교과 선생님 태블릿 (서명 토큰) ----------

/** 공통 코드로 태블릿 잠금 해제. 설정의 코드가 바뀌면 기존 태블릿은 다시 잠긴다. */
function loginTeacherDevice_(code) {
  checkLoginRate_('teacher');
  const cfg = getConfig();
  if (!cfg.teacherCode) throw new Error('교과 선생님 코드가 설정되지 않았어요. 담임 선생님께 알려 주세요.');
  if (String(code || '').trim() !== cfg.teacherCode) {
    recordLoginFail_('teacher');
    throw new Error('코드가 맞지 않아요.');
  }
  const end = cfg.endDate ? new Date(cfg.endDate + 'T23:59:59+09:00').getTime() : Date.now();
  return signToken_({ r: 't', f: codeFingerprint_(cfg.teacherCode), exp: Math.max(end, Date.now()) + 14 * 86400000 });
}

function requireTeacher_(token) {
  const p = verifySignedToken_(token);
  const cfg = getConfig();
  if (!p || p.r !== 't' || !cfg.teacherCode || p.f !== codeFingerprint_(cfg.teacherCode)) {
    throw new Error('AUTH: 태블릿 잠금이 풀려 있지 않아요. 공통 코드를 입력해 주세요.');
  }
  return true;
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
  { name: SHEETS.SPY, headers: SPY_HEADERS, textCols: [1, 2, 3, 4] },
  { name: SHEETS.SPY_JUDGE, headers: SPY_JUDGE_HEADERS, textCols: [1, 2, 3, 4, 5, 6, 7, 8] },
  { name: SHEETS.ACCUSE, headers: ACCUSE_HEADERS, textCols: [2, 3, 5] },
  { name: SHEETS.DRAW, headers: DRAW_HEADERS, textCols: [1] },
  { name: SHEETS.TIMETABLE, headers: TIMETABLE_HEADERS, textCols: [1, 2, 3, 4, 5, 6, 7], widths: [60, 80, 80, 80, 80, 80, 80] },
  { name: SHEETS.TT_OVERRIDE, headers: TT_OVERRIDE_HEADERS, textCols: [1, 2, 3, 4, 5, 6, 7, 8, 9] },
  { name: SHEETS.TEACHERS, headers: ['과목', '선생님 이름'], textCols: [1, 2], widths: [100, 140] },
  ];
}

/**
 * 시트가 없으면 만들고, 헤더가 예전 버전(앞부분만 있음)이면 새 열 이름을 이어 붙인다.
 * 웹앱 요청에서도 호출되므로 6시간에 한 번만 실제로 검사한다.
 */
function ensureSchema_(force) {
  const cache = CacheService.getScriptCache();
  if (!force && cache.get('schema_ok_v9')) return;
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
    if (def.name === SHEETS.TEACHERS && sh.getLastRow() < 2) {
      // 시간표에 나오는 과목을 미리 채워 둔다. 담임은 옆 칸에 선생님 이름만 적으면 된다
      const subjects = [];
      DEFAULT_TIMETABLE.forEach((r) => r.slice(2).forEach((x) => { if (x && subjects.indexOf(x) < 0) subjects.push(x); }));
      sh.getRange(2, 1, subjects.length, 2).setValues(subjects.map((x) => [x, '']));
    }
    if (def.name === SHEETS.TIMETABLE && sh.getLastRow() < 2) {
      sh.getRange(2, 1, DEFAULT_TIMETABLE.length, TIMETABLE_HEADERS.length).setValues(DEFAULT_TIMETABLE);
    }
    if (created) (def.widths || []).forEach((w, i) => sh.setColumnWidth(i + 1, w));
  });
  ensureConfigRows_(ss);
  cache.put('schema_ok_v9', '1', 21600);
}

/** 설정 시트에 새로 생긴 항목이 없으면 기본값으로 맨 아래에 추가 (담임이 고친 값은 그대로) */
function ensureConfigRows_(ss) {
  const sh = ss.getSheetByName(SHEETS.CONFIG);
  if (!sh) return;
  const last = sh.getLastRow();
  const labels = last > 1 ? sh.getRange(2, 1, last - 1, 1).getValues().map((r) => String(r[0]).trim()) : [];
  const add = CONFIG_DEFS.filter((d) => labels.indexOf(d.label) < 0).map((d) => {
    let v = toSheetValue_(d, d.def);
    if (d.key === 'teacherCode' && !v) v = randomCode_(4);
    if (d.key === 'adminCode' && !v) v = randomCode_(6);
    return [d.label, v, d.desc];
  });
  if (add.length) {
    sh.getRange(sh.getLastRow() + 1, 1, add.length, 3).setValues(add);
    CacheService.getScriptCache().remove(CACHE_KEYS.CONFIG);
  }
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
    if ([SHEETS.CONFIG, SHEETS.STUDENTS, SHEETS.LEDGER, SHEETS.QUEST, SHEETS.PRAISE, SHEETS.TIMETABLE, SHEETS.TT_OVERRIDE, SHEETS.TEACHERS, SHEETS.SPY, SHEETS.SPY_JUDGE, SHEETS.ACCUSE].indexOf(name) >= 0) clearAllCaches_();
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
  const url = String(readConfigFromSheet_().webAppUrl || '').trim().replace(/\?.*$/, '');
  if (!/^https:\/\/script\.google\.com\/.*\/exec$/.test(url)) {
    return alert_(
      '설정 시트의 "웹앱 주소" 칸이 비어 있거나 올바르지 않아요.\n\n' +
      'Apps Script 편집기 → 배포 → 배포 관리 → 웹 앱 URL "복사"를 눌러\n' +
      '설정 시트 "웹앱 주소" 칸에 붙여 넣어 주세요. (…/exec 로 끝나는 주소)'
    );
  }
  alert_(`투투 화면:\n${url}\n\n교과 선생님 화면:\n${url}?page=teacher\n\n담임 대시보드:\n${url}?page=admin`);
}

function clearAllCaches() {
  clearAllCaches_();
  alert_('캐시를 비웠어요. 웹앱에 바로 반영됩니다.');
}

function clearAllCaches_() {
  CacheService.getScriptCache().removeAll([CACHE_KEYS.CONFIG, CACHE_KEYS.STUDENTS, CACHE_KEYS.TIMETABLE, 'schema_ok_v9']);
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

/** 화면 열기·자동 갱신용. 다른 사람의 기록 때문에 매번 다시 계산하지 않도록 최근 결과(45초 이내)를 재사용 */
function studentGetHome(token) {
  const me = requireStudent_(token);
  ALLOW_STALE_ = true;
  try {
    return buildStudentHome_(me);
  } finally {
    ALLOW_STALE_ = false;
  }
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
      done: hist.drawDone || 0,
      questDays: questSet.size,
    },
    rewards: cfg.rewards,
    rankPublicCount: cfg.rankPublicCount,
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
    spy: spyHomeFor_(me, today),
    serverTime: Utilities.formatDate(new Date(), TZ, 'HH:mm:ss'),
  };
}

// ===================== TeacherApi.gs =====================
/**
 * 미션3: 교과 선생님 화면 (교실 태블릿).
 * - 공통 코드로 태블릿 잠금 해제(기간 동안 유지) → 선생님 이름 → 교시(현재 시각 자동 선택) → 투투 이름 → +2 / MVP +3
 * - 적극 참여 +2: 같은 날·같은 교시에 한 투투 1번 / MVP +3: 같은 날·같은 교시에 1명
 * - 이번 교시 기록은 되돌리기 가능 (기록장에서 취소 처리)
 */

const CLASS_MISSIONS = ['수업참여', 'MVP'];
const RECENT_DAYS_FOR_HINT = 3; // "최근 도장이 적은 투투" 표시 기준 등교일 수

function teacherUnlock(code) {
  return { token: loginTeacherDevice_(code) };
}

/** 첫 화면: 선생님 목록, 오늘 시간표, 지금 교시 */
function teacherInit(token) {
  requireTeacher_(token);
  ensureSchema_();
  const cfg = getConfig();
  const today = todayStr_();
  const now = Utilities.formatDate(new Date(), TZ, 'HH:mm');
  const cur = currentPeriod_(today, now);
  const tt = timetableFor_(today);
  const maxPeriod = Math.max(cfg.periodCount, ...tt.map((p) => p.period), 1);
  return {
    today,
    isSchoolDay: cfg.schoolDays.indexOf(today) >= 0,
    nickname: cfg.nickname,
    teachers: cfg.teacherList,
    periods: Array.from({ length: maxPeriod }, (_, i) => {
      const p = tt.find((x) => x.period === i + 1);
      return { period: i + 1, subject: p ? p.subject : '', start: p ? p.start : '', excluded: !!(p && p.excluded) };
    }),
    suggestedPeriod: cur ? cur.period : null,
    now,
  };
}

function checkTeacherInput_(teacherName, period) {
  const cfg = getConfig();
  const today = todayStr_();
  if (cfg.schoolDays.indexOf(today) < 0) throw new Error('오늘은 캠페인 등교일이 아니에요.');
  const name = String(teacherName || '').replace(/\s+/g, ' ').trim();
  if (!name || name.length > 20) throw new Error('선생님 이름을 다시 선택해 주세요.');
  const p = parseInt(period, 10);
  if (!(p >= 1 && p <= 10)) throw new Error('교시를 다시 선택해 주세요.');
  const t = cfg.teacherList.find((x) => x.name === name);
  const ttp = timetableFor_(today).find((x) => x.period === p);
  if (ttp && ttp.excluded) throw new Error(`${p}교시(${ttp.subject})는 캠페인에서 제외된 시간이에요.`);
  const subject = (t && t.subject) || (ttp && ttp.subject) || '';
  return { today, name, period: p, subject };
}

/** 수업 화면 데이터: 투투 목록(오늘 받음 ✓, 최근 적음 표시), 이번 교시 기록, MVP */
function teacherSession(token, teacherName, period) {
  requireTeacher_(token);
  const ctx = checkTeacherInput_(teacherName, period);
  return buildTeacherSession_(ctx);
}

function buildTeacherSession_(ctx, lastId) {
  const cfg = getConfig();
  const students = getStudentsCached_();
  const nameOf = {};
  students.forEach((s) => (nameOf[s.no] = s.name));
  const records = readLedger_().filter((r) => !r.cancelled && CLASS_MISSIONS.indexOf(r.mission) >= 0);

  const recentDays = cfg.schoolDays.filter((d) => d <= ctx.today).slice(-RECENT_DAYS_FOR_HINT);
  const recentCount = {};
  const todayGot = {};
  students.forEach((s) => (recentCount[s.no] = 0));
  records.forEach((r) => {
    if (recentDays.indexOf(r.date) >= 0 && recentCount[r.no] !== undefined) recentCount[r.no]++;
    if (r.date === ctx.today) todayGot[r.no] = true;
  });
  const counts = Object.values(recentCount);
  const min = counts.length ? Math.min(...counts) : 0;
  const max = counts.length ? Math.max(...counts) : 0;

  const here = records.filter((r) => r.date === ctx.today && String(r.period) === String(ctx.period));
  const mvp = here.find((r) => r.mission === 'MVP');
  return {
    teacher: ctx.name,
    subject: ctx.subject,
    period: ctx.period,
    today: ctx.today,
    nickname: cfg.nickname,
    students: students.map((s) => ({
      no: s.no,
      name: s.name,
      todayGot: !!todayGot[s.no],
      low: max > min && recentCount[s.no] === min, // 모두 같으면 표시 안 함
      classDone: here.some((r) => r.no === s.no && r.mission === '수업참여'),
      isMvp: !!mvp && mvp.no === s.no,
    })),
    mvp: mvp ? { no: mvp.no, name: nameOf[mvp.no] || mvp.no, by: mvp.inputBy } : null,
    log: here.slice().reverse().map((r) => ({
      id: r.id, no: r.no, name: nameOf[r.no] || r.no, mission: r.mission, score: r.score, by: r.inputBy, ts: String(r.ts).slice(11, 16),
    })),
    lastId: lastId || null,
  };
}

/** kind: 'class'(적극 참여 +2) | 'mvp'(MVP +3) */
function teacherStamp(token, teacherName, period, no, kind) {
  requireTeacher_(token);
  const ctx = checkTeacherInput_(teacherName, period);
  const target = String(no || '').trim();
  const s = getStudentsCached_().find((x) => x.no === target);
  if (!s) throw new Error('없는 투투예요.');
  if (kind !== 'class' && kind !== 'mvp') throw new Error('도장 종류를 다시 골라 주세요.');

  const id = withLock_(() => {
    const here = readLedger_().filter((r) => !r.cancelled && r.date === ctx.today && String(r.period) === String(ctx.period));
    if (kind === 'class' && here.some((r) => r.mission === '수업참여' && r.no === target)) {
      throw new Error(`${s.name}: 이번 교시에 이미 적극 참여 +2를 받았어요.`);
    }
    if (kind === 'mvp') {
      const m = here.find((r) => r.mission === 'MVP');
      if (m) {
        const mName = (getStudentsCached_().find((x) => x.no === m.no) || {}).name || m.no;
        throw new Error(`오늘 ${ctx.period}교시 MVP는 이미 뽑혔어요. (MVP: ${mName})`);
      }
    }
    return appendRecords_([{
      date: ctx.today, no: target,
      mission: kind === 'mvp' ? 'MVP' : '수업참여',
      score: kind === 'mvp' ? 3 : 2,
      inputType: '교과', inputBy: ctx.name, period: String(ctx.period), subject: ctx.subject,
    }])[0];
  });
  return buildTeacherSession_(ctx, id);
}

/** 오늘 교과 화면에서 넣은 도장 되돌리기 */
function teacherUndo(token, teacherName, period, id) {
  requireTeacher_(token);
  const ctx = checkTeacherInput_(teacherName, period);
  const r = readLedger_().find((x) => x.id === String(id));
  if (!r || r.cancelled) throw new Error('되돌릴 기록이 없어요.');
  if (r.date !== ctx.today || r.inputType !== '교과' || CLASS_MISSIONS.indexOf(r.mission) < 0) {
    throw new Error('오늘 수업 도장만 되돌릴 수 있어요.');
  }
  cancelRecord_(r.id, '교과 화면 되돌리기', ctx.name);
  return buildTeacherSession_(ctx);
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

/** 반 전체 단체 도장 +3. payload: {date, memo} */
function adminGroupStamp(token, payload) {
  requireAdmin_(token);
  const p = payload || {};
  const date = toDateStr_(p.date || todayStr_());
  const memo = String(p.memo || '').trim() || '단체 도장';
  if (!date) throw new Error('날짜 형식이 올바르지 않아요.');
  if (memo.length > 200) throw new Error('메모는 200자 이내로 입력해 주세요.');
  const students = readStudents_();
  if (!students.length) throw new Error('학생 명단이 비어 있어요.');
  appendRecords_(students.map((s) => ({ date, no: s.no, mission: '단체', score: 3, inputType: '담임', inputBy: '담임', memo })));
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

function adminSetTestMode(token, on) {
  requireAdmin_(token);
  setConfigValue_('testMode', !!on);
  clearAllCaches_();
  return buildAdminDashboard_();
}

/**
 * 테스트 기록 전부 지우기: 기록장·일퀘·칭찬·암행어사·암행어사판정·지목·뽑기 시트의 2행부터 아래.
 * 학생 명단·설정·시간표·교과선생님은 그대로. 확인 문구를 정확히 입력해야 실행된다.
 */
function adminClearTestData(token, confirmText) {
  requireAdmin_(token);
  if (String(confirmText || '').trim() !== '테스트 기록 삭제') throw new Error('확인 문구가 맞지 않아요.');
  withLock_(() => {
    [SHEETS.LEDGER, SHEETS.QUEST, SHEETS.PRAISE, SHEETS.SPY, SHEETS.SPY_JUDGE, SHEETS.ACCUSE, SHEETS.DRAW].forEach((name) => {
      const sh = sheetByName_(name);
      if (sh && sh.getLastRow() > 1) sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).clearContent();
    });
    clearAllCaches_();
  });
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
    spy: spyAdminData_(students),
    reward: rewardAdminData_(students, records, stats),
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
      teacherCode: cfg.teacherCode, testMode: cfg.testMode, rewards: cfg.rewards, bannedWordCount: cfg.bannedWords.length,
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
 *   ?page=teacher   교과 선생님 화면 (교실 태블릿)
 *   ?page=admin     담임 대시보드
 */
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) || '';
  const cfg = getConfig();
  const files = { '': 'Student', admin: 'Admin', teacher: 'Teacher' };
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
  const html = htmlSource_(name);
  // 테스트 모드일 때 모든 화면 위에 표시
  if (name === 'Styles' && getConfig().testMode) {
    return html + '<div style="position:fixed;top:0;left:0;right:0;z-index:99;background:#ffd23f;color:#1a1a1a;text-align:center;font:700 13px sans-serif;padding:3px">🧪 테스트 모드 — 오늘을 등교일로 취급하는 중</div><div style="height:22px"></div>';
  }
  return html;
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
  "Admin": `<!DOCTYPE html>
<html lang="ko">
<head>
  <base target="_top">
  <meta charset="utf-8">
  <?!= include('Styles') ?>
</head>
<body>
<div id="loading"></div>
<div class="wrap">
  <div class="metal hero">
    <h1 class="title-font"><?!= titleHtml ?></h1>
    <div class="deco"></div>
    <div class="sub">- <?= subtitle ?> -</div>
    <div class="tag">담임 대시보드</div>
  </div>

  <!-- 로그인 -->
  <section id="login" class="box" style="max-width:420px;margin:14px auto 0">
    <h2 class="title-font">🔐 담임 입장</h2>
    <label for="code">담임 코드</label>
    <input id="code" type="password" inputmode="numeric" autocomplete="off" placeholder="설정 시트의 담임 코드">
    <button class="btn block" style="margin-top:12px" id="loginBtn">입장하기</button>
  </section>

  <!-- 대시보드 -->
  <section id="app" class="hidden">
    <div class="row" style="margin-top:12px">
      <div class="muted grow" id="stamp"></div>
      <button class="btn sm ghost" id="refreshBtn" style="flex:0 0 auto">↻ 새로고침</button>
      <button class="btn sm danger" id="logoutBtn" style="flex:0 0 auto">나가기</button>
    </div>

    <div class="tabs" id="tabs">
      <button class="tab on" data-tab="overview">📊 현황</button>
      <button class="tab" data-tab="quest">✅ 일퀘</button>
      <button class="tab" data-tab="praise">💌 칭찬</button>
      <button class="tab" data-tab="spy">🕵️ 암행어사</button>
      <button class="tab" data-tab="reward">🎁 보상</button>
      <button class="tab" data-tab="manual">✍️ 도장 입력</button>
      <button class="tab" data-tab="ledger">📜 기록장</button>
      <button class="tab" data-tab="settings">⚙️ 설정</button>
    </div>

    <!-- 현황 -->
    <div id="tab-overview" class="box" style="margin-top:0">
      <div class="cards" id="cards"></div>
      <div id="warnings"></div>
      <div class="neon-line"></div>
      <div class="row">
        <h2 class="title-font grow" style="margin:0">투투별 도장 현황</h2>
        <button class="btn sm ghost" id="sortBtn" style="flex:0 0 auto"></button>
      </div>
      <div class="table-wrap" style="margin-top:10px"><table id="statsTable"></table></div>
      <p class="muted">총점 = 기록장에서 취소되지 않은 모든 점수의 합(차감 포함). 동점은 공동 순위입니다.</p>
    </div>

    <!-- 일퀘 달성표 -->
    <div id="tab-quest" class="box hidden" style="margin-top:0">
      <h2 class="title-font">날짜 × 투투 일퀘 달성표</h2>
      <p class="muted">O = 도장 지급 · 2/3 = 진행 중(칸을 누르면 상세) · 빈칸 = 기록 없음</p>
      <div class="table-wrap"><table id="questTable"></table></div>
      <div id="questDetail" class="muted" style="margin-top:8px"></div>
    </div>

    <!-- 칭찬 -->
    <div id="tab-praise" class="box hidden" style="margin-top:0">
      <h2 class="title-font">칭찬 한 번도 못 받은 투투</h2>
      <div id="noPraise"></div>
      <div class="neon-line"></div>
      <h2 class="title-font">전체 칭찬</h2>
      <div class="row">
        <select id="pDate" class="grow"></select>
        <select id="pFrom" class="grow"></select>
        <select id="pTo" class="grow"></select>
      </div>
      <p class="muted">숨기면 받은 친구에게 "담임 선생님이 숨긴 칭찬"으로 보이고, 보낸 친구의 그날 칭찬 미션은 미완료 처리됩니다(일퀘 도장 자동 취소).</p>
      <div id="praiseList"></div>
    </div>

    <!-- 암행어사 -->
    <div id="tab-spy" class="box hidden" style="margin-top:0">
      <div id="spyAlert"></div>
      <h2 class="title-font">현재 암행어사 <span class="muted" style="font-size:13px">(이 화면은 담임만 볼 수 있어요)</span></h2>
      <div id="spyNow"></div>
      <div class="neon-line"></div>
      <h2 class="title-font">암행어사 지정</h2>
      <div class="row">
        <select id="spyNo" class="grow"></select>
        <input id="spyStart" type="date" style="flex:0 1 170px">
        <input id="spyEnd" type="date" style="flex:0 1 170px">
      </div>
      <div class="muted" id="spyWeeks" style="margin-top:4px"></div>
      <button class="btn yellow block" style="margin-top:10px" id="spyBtn">🕵️ 비밀리에 지정하기</button>
      <div class="neon-line"></div>
      <h3>지정 기록</h3>
      <div class="table-wrap"><table id="spyHist"></table></div>
      <h3>판정 기록</h3>
      <div class="table-wrap"><table id="spyJudges"></table></div>
      <h3>지목 기록 <span class="muted" id="accCount" style="font-size:13px"></span></h3>
      <div class="table-wrap"><table id="spyAcc"></table></div>
    </div>

    <!-- 보상 -->
    <div id="tab-reward" class="box hidden" style="margin-top:0">
      <h2 class="title-font">🏆 랭킹 보상 대상 <span class="muted" style="font-size:13px">(현재 기준 · 공동 순위 포함 · 오프라인 지급)</span></h2>
      <div id="rankRewards"></div>
      <div class="neon-line"></div>
      <h2 class="title-font">🎟 쿠폰 뽑기 대상</h2>
      <p class="muted" id="drawRule"></p>
      <label style="display:flex;gap:6px;align-items:center;margin:0 0 8px"><input id="drawOnly" type="checkbox" checked style="width:22px;min-height:22px"> 뽑기권 있는 투투만 보기</label>
      <div class="table-wrap"><table id="drawTable"></table></div>
    </div>

    <!-- 수동 도장 -->
    <div id="tab-manual" class="box hidden" style="margin-top:0">
      <h2 class="title-font">🤝 반 전체 단체 도장 +3</h2>
      <p class="muted">단체 도장판 싸인 등 반 전체가 함께 받는 도장이에요. 모든 투투에게 "단체 +3"이 기록됩니다.</p>
      <div class="row">
        <input id="gDate" type="date" style="flex:0 1 180px">
        <input id="gMemo" type="text" maxlength="200" placeholder="메모 (예: 단체 도장판 싸인 완성)" class="grow">
      </div>
      <button class="btn yellow block" style="margin-top:10px" id="groupBtn">🤝 반 전체에게 +3</button>
      <div class="neon-line"></div>
      <h2 class="title-font">수동 도장 추가 / 차감</h2>
      <p class="muted">기록장에 "수동"으로 한 줄씩 남습니다. 잘못 넣은 도장은 기록장 탭에서 취소하세요.</p>
      <label>대상 선택</label>
      <div class="row" style="margin-bottom:8px">
        <div class="chips" id="groupChips"></div>
      </div>
      <div class="chips" id="studentChips"></div>
      <div class="muted" id="selCount" style="margin-top:6px"></div>

      <label for="mScore">점수 (차감은 음수)</label>
      <div class="chips" id="scoreQuick" style="margin-bottom:8px">
        <button class="chip" data-score="-3">−3</button>
        <button class="chip" data-score="-2">−2</button>
        <button class="chip" data-score="-1">−1</button>
        <button class="chip" data-score="1">+1</button>
        <button class="chip" data-score="2">+2</button>
        <button class="chip" data-score="3">+3</button>
      </div>
      <input id="mScore" type="number" inputmode="numeric" step="1" value="1">

      <label for="mDate">날짜</label>
      <input id="mDate" type="date">

      <label for="mReason">사유 (필수)</label>
      <input id="mReason" type="text" maxlength="200" placeholder="예: 칭찬 퀘스트 수동 인정">

      <button class="btn yellow block" style="margin-top:14px" id="manualBtn">기록장에 추가</button>
    </div>

    <!-- 기록장 -->
    <div id="tab-ledger" class="box hidden" style="margin-top:0">
      <h2 class="title-font">기록장 (최근 500줄)</h2>
      <div class="row">
        <select id="lFilter" class="grow"></select>
        <select id="lMission" class="grow"></select>
        <label style="flex:0 0 auto;margin:0;display:flex;gap:6px;align-items:center">
          <input id="lCancelled" type="checkbox" checked style="width:22px;min-height:22px"> 취소 포함
        </label>
      </div>
      <div class="table-wrap" style="margin-top:10px"><table id="ledgerTable"></table></div>
    </div>

    <!-- 설정 -->
    <div id="tab-settings" class="box hidden" style="margin-top:0">
      <h2 class="title-font">랭킹 잠금</h2>
      <div class="row">
        <div class="grow" id="lockState"></div>
        <button class="btn" id="lockBtn" style="flex:0 0 auto"></button>
      </div>
      <div class="neon-line"></div>
      <h2 class="title-font">🧪 테스트 모드</h2>
      <div class="row">
        <div class="grow" id="testState"></div>
        <button class="btn" id="testBtn" style="flex:0 0 auto"></button>
      </div>
      <p class="muted">캠페인 전에 미리 해 볼 때 켜세요. 오늘을 등교일로 취급해 퀘스트·칭찬·교과 도장·암행어사를 모두 시험할 수 있어요.</p>
      <button class="btn danger block" id="clearBtn">🗑 테스트 기록 모두 지우기</button>
      <p class="muted">기록장·일퀘·칭찬·암행어사·판정·지목·뽑기 기록을 지워요. 학생 명단·로그인 코드·설정·시간표·교과선생님은 그대로예요.</p>
      <p class="muted">잠금 ON이면 투투 화면에 "랭킹 공개 전입니다"가 표시됩니다.</p>
      <div class="neon-line"></div>
      <h2 class="title-font">현재 설정</h2>
      <div class="table-wrap"><table id="cfgTable"></table></div>
      <h3>랭킹 보상</h3>
      <div id="rewards"></div>
      <div class="neon-line"></div>
      <p class="muted">설정·학생 명단은 스프레드시트에서 직접 고친 뒤 아래 버튼을 누르면 바로 반영됩니다.</p>
      <div class="row">
        <a class="btn ghost" id="sheetLink" target="_blank" rel="noopener" style="text-align:center;text-decoration:none;line-height:26px">📄 스프레드시트 열기</a>
        <button class="btn" id="reloadBtn">시트 다시 읽기</button>
      </div>
    </div>
  </section>
</div>

<div id="toast"></div>
<div id="modal-root"></div>

<script>
  const S = { token: null, data: null, tab: 'overview', sort: 'rank', sel: new Set() };
  const $ = (id) => document.getElementById(id);
  const MISSION_LABEL = { '일퀘': '일퀘', '암행어사판정': '판정', '암행어사활동': '암행활동', '수업참여': '수업', 'MVP': 'MVP', '단체': '단체', '검거이전': '검거이전', '수동': '수동' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function store(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function signed(n) { return n > 0 ? '+' + n : String(n); }
  function scoreCls(n) { return n < 0 ? 'minus' : n > 0 ? 'plus' : 'muted'; }

  let toastTimer = null;
  function toast(msg, isErr) {
    const t = $('toast');
    t.textContent = msg;
    t.className = isErr ? 'err' : '';
    t.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.style.display = 'none'), 2600);
  }

  function call(fn, ...args) {
    $('loading').style.display = 'block';
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler((r) => { $('loading').style.display = 'none'; resolve(r); })
        .withFailureHandler((err) => {
          $('loading').style.display = 'none';
          let msg = (err && err.message) || String(err);
          if (msg.indexOf('AUTH:') >= 0) { logoutLocal(); msg = msg.replace(/^.*AUTH:\\s*/, ''); }
          reject(new Error(msg.replace(/^(Error|Exception):\\s*/, '')));
        })[fn](...args);
    });
  }

  function modal({ title, html = '', input = null, okText = '확인', danger = false }) {
    return new Promise((resolve) => {
      const root = $('modal-root');
      root.innerHTML =
        \`<div class="modal-bg"><div class="modal"><div class="box">
          <h2 class="title-font">\${esc(title)}</h2><div>\${html}</div>
          \${input ? \`<textarea id="m-input" rows="3" maxlength="200" placeholder="\${esc(input)}"></textarea>\` : ''}
          <div class="row" style="margin-top:14px">
            <button class="btn ghost" id="m-cancel">닫기</button>
            <button class="btn \${danger ? 'danger' : 'yellow'}" id="m-ok">\${esc(okText)}</button>
          </div></div></div></div>\`;
      const close = (v) => { root.innerHTML = ''; resolve(v); };
      $('m-cancel').onclick = () => close(null);
      $('m-ok').onclick = () => {
        if (!input) return close(true);
        const v = $('m-input').value.trim();
        if (!v) return toast('사유를 입력해 주세요.', true);
        close(v);
      };
      if (input) $('m-input').focus();
    });
  }

  // ---------- 로그인 ----------
  async function login() {
    const code = $('code').value.trim();
    if (!code) return toast('담임 코드를 입력해 주세요.', true);
    try {
      const r = await call('adminLogin', code);
      S.token = r.token;
      store('adminToken', r.token);
      $('code').value = '';
      await refresh();
    } catch (e) { toast(e.message, true); }
  }
  function logoutLocal() {
    S.token = null; S.data = null;
    store('adminToken', null);
    $('app').classList.add('hidden');
    $('login').classList.remove('hidden');
  }
  async function refresh(fromSheet) {
    if (!S.token) return;
    try { setData(await call(fromSheet ? 'adminRefresh' : 'adminGetDashboard', S.token)); }
    catch (e) { toast(e.message, true); }
  }
  function setData(d) {
    S.data = d;
    $('login').classList.add('hidden');
    $('app').classList.remove('hidden');
    if (!$('mDate').value) $('mDate').value = d.today;
    if (!$('gDate').value) $('gDate').value = d.today;
    render();
  }

  // ---------- 렌더 ----------
  function render() {
    const d = S.data;
    if (!d) return;
    $('stamp').textContent = \`마지막 계산: \${d.computedAt}\`;
    renderOverview(); renderQuest(); renderPraise(); renderSpy(); renderReward(); renderManual(); renderLedger(); renderSettings();
  }

  function renderOverview() {
    const d = S.data, c = d.cfg;
    const cards = [
      ['오늘', \`\${d.today.slice(5)} \${d.dayIndex ? \`(\${d.dayIndex}/\${c.schoolDays.length}일차)\` : '(등교일 아님)'}\`],
      ['기간', \`\${c.startDate.slice(5)} ~ \${c.endDate.slice(5)}\`],
      [\`\${c.nickname} 수\`, \`\${d.students.length}명\`],
      ['기록장', \`\${d.ledgerTotal}줄\`],
      ['랭킹', c.rankLocked ? '🔒 잠금' : '🔓 공개'],
    ];
    $('cards').innerHTML = cards.map(([k, v]) => \`<div class="card"><div class="k">\${esc(k)}</div><div class="v" style="font-size:18px">\${esc(v)}</div></div>\`).join('');
    $('warnings').innerHTML = (d.cfg.testMode ? '<div class="warn">🧪 테스트 모드가 켜져 있어요. 테스트가 끝나면 ⚙️ 설정 탭에서 끄고 테스트 기록을 지워 주세요.</div>' : '') + (d.spy.needAppoint ? \`<div class="warn">🚨 \${d.spy.caughtToday ? '암행어사가 검거됐어요! ' : ''}새 암행어사 지정이 필요해요. (🕵️ 암행어사 탭)</div>\` : '') +
      d.warnings.map((w) => \`<div class="warn">⚠️ \${esc(w)}</div>\`).join('');

    $('sortBtn').textContent = S.sort === 'rank' ? '순위순 ▾' : '번호순 ▾';
    const list = d.students.slice().sort((a, b) =>
      S.sort === 'rank' ? a.rank - b.rank || Number(a.no) - Number(b.no) : Number(a.no) - Number(b.no));
    const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r);
    const head = \`<tr><th>순위</th><th>번호</th><th class="left">이름</th>\${d.missions.map((m) => \`<th>\${esc(MISSION_LABEL[m] || m)}</th>\`).join('')}<th>차감</th><th>총점</th></tr>\`;
    const rows = list.map((s) => {
      const top = s.rank <= c.rankPublicCount;
      return \`<tr\${top ? ' style="background:#ffd23f14"' : ''}>
        <td><span class="medal">\${medal(s.rank)}</span></td><td>\${esc(s.no)}</td>
        <td class="left">\${esc(s.name)}</td>
        \${d.missions.map((m) => \`<td class="\${scoreCls(s.byMission[m])}">\${s.byMission[m] || '·'}</td>\`).join('')}
        <td class="\${s.minus ? 'minus' : 'muted'}">\${s.minus || '·'}</td>
        <td class="yellow" style="font-weight:900;font-size:16px">\${s.total}</td></tr>\`;
    }).join('');
    $('statsTable').innerHTML = head + (rows || \`<tr><td colspan="99" class="muted">학생 시트에 명단을 넣어 주세요.</td></tr>\`);
  }

  function renderQuest() {
    const d = S.data;
    const head = \`<tr><th class="left">이름</th>\${d.cfg.schoolDays.map((x) => \`<th>\${esc(x.slice(5))}</th>\`).join('')}<th>O</th></tr>\`;
    const body = d.questGrid.map((r) => {
      const cnt = r.cells.filter((c) => c.mark === 'O').length;
      return \`<tr><td class="left">\${esc(r.no)}. \${esc(r.name)}</td>\${r.cells.map((c, i) => {
        const cls = c.mark === 'O' ? 'plus' : c.mark ? 'yellow' : 'muted';
        return \`<td class="\${cls}" \${c.detail ? \`data-qd="\${esc(r.name + ' ' + d.cfg.schoolDays[i].slice(5) + ': ' + c.detail)}" style="cursor:pointer;text-decoration:underline dotted"\` : ''}>\${esc(c.mark || '·')}</td>\`;
      }).join('')}<td class="yellow" style="font-weight:900">\${cnt}</td></tr>\`;
    }).join('');
    $('questTable').innerHTML = head + body;
  }

  function renderPraise() {
    const d = S.data;
    $('noPraise').innerHTML = d.noPraise.length
      ? \`<div class="chips">\${d.noPraise.map((s) => \`<span class="chip" style="cursor:default">\${esc(s.no)}. \${esc(s.name)}</span>\`).join('')}</div>\`
      : '<p class="muted">모든 투투가 칭찬을 받았어요! 🎉</p>';
    const keep = { d: $('pDate').value, f: $('pFrom').value, t: $('pTo').value };
    const studentOpts = d.students.slice().sort((a, b) => Number(a.no) - Number(b.no))
      .map((s) => \`<option value="\${esc(s.no)}">\${esc(s.no)}. \${esc(s.name)}</option>\`).join('');
    $('pDate').innerHTML = \`<option value="">전체 날짜</option>\` + d.cfg.schoolDays.map((x) => \`<option value="\${x}">\${x.slice(5)}</option>\`).join('');
    $('pFrom').innerHTML = \`<option value="">보낸 사람 전체</option>\` + studentOpts;
    $('pTo').innerHTML = \`<option value="">받은 사람 전체</option>\` + studentOpts;
    $('pDate').value = keep.d; $('pFrom').value = keep.f; $('pTo').value = keep.t;
    const list = d.praises.filter((p) => (!keep.d || p.date === keep.d) && (!keep.f || p.from === keep.f) && (!keep.t || p.to === keep.t));
    $('praiseList').innerHTML = list.length ? list.map((p) => \`<div class="card" style="margin-top:8px;\${p.hidden ? 'opacity:.5' : ''}">
        <div class="row" style="align-items:flex-start">
          <div class="grow"><b class="sky">\${esc(p.fromName)}</b> → <b class="yellow">\${esc(p.toName)}</b>
            <span class="muted">\${esc(p.date.slice(5))}\${p.thanked ? ' · 💗고마워' : ''}\${p.hidden ? ' · 숨김' : ''}</span>
            <div style="margin-top:4px;white-space:pre-wrap;word-break:break-word">\${esc(p.text)}</div></div>
          <button class="btn sm \${p.hidden ? 'ghost' : 'danger'}" style="flex:0 0 auto" data-hide="\${esc(p.id)}" data-hidden="\${p.hidden ? 1 : 0}">\${p.hidden ? '보이기' : '숨기기'}</button>
        </div></div>\`).join('') : '<p class="muted">칭찬이 없어요.</p>';
  }

  async function togglePraise(id, hidden) {
    const ok = await modal({ title: hidden ? '칭찬 숨기기' : '칭찬 다시 보이기',
      html: hidden
        ? '<p>받은 친구의 칭찬함에는 "담임 선생님이 숨긴 칭찬"으로만 보이고, 보낸 친구에게도 숨김 안내가 뜹니다.</p><p class="yellow">보낸 친구의 그날 칭찬 미션은 미완료가 되고, 이미 받은 일퀘 도장은 자동 취소됩니다.</p><p class="muted">오늘 칭찬이면 다른 칭찬을 다시 쓸 수 있어요.</p>'
        : '<p>다시 보이게 하면 칭찬 미션이 인정되고, 인사·졸지 않기가 완료된 상태면 일퀘 도장이 다시 지급됩니다.</p>' });
    if (!ok) return;
    try { setData(await call('adminSetPraiseHidden', S.token, id, hidden)); toast(hidden ? '숨겼어요.' : '다시 보이게 했어요.'); }
    catch (e) { toast(e.message, true); }
  }

  function renderSpy() {
    const d = S.data, sp = d.spy;
    $('spyAlert').innerHTML = sp.needAppoint ? \`<div class="warn" style="margin-top:0">🚨 \${sp.caughtToday ? '암행어사가 검거됐어요! ' : ''}새 암행어사 지정이 필요해요.</div>\` : '';
    $('spyNow').innerHTML = sp.active
      ? \`<div class="card"><div class="v" style="font-size:22px">\${esc(sp.active.no)}. \${esc(sp.active.name)}</div>
         <div class="muted">\${esc(sp.active.week)}주차 · \${esc(sp.active.start)} ~ \${esc(sp.active.end)}</div></div>\`
      : '<p class="muted">지금 활동 중인 암행어사가 없어요.</p>';
    const keep = $('spyNo').value;
    $('spyNo').innerHTML = '<option value="">투투 선택</option>' + d.students.slice().sort((a, b) => Number(a.no) - Number(b.no))
      .map((s) => \`<option value="\${esc(s.no)}">\${esc(s.no)}. \${esc(s.name)}</option>\`).join('');
    $('spyNo').value = keep;
    if (sp.suggest && !$('spyStart').value) { $('spyStart').value = sp.suggest.start; $('spyEnd').value = sp.suggest.end; }
    $('spyWeeks').innerHTML = sp.weeks.map((w) => \`<a href="#" data-week="\${w.week}" class="sky">\${w.week}주차 \${esc(w.start.slice(5))}~\${esc(w.end.slice(5))}</a>\`).join(' · ') +
      ' <span>(누르면 날짜가 채워져요. 검거 후 교체할 때는 시작일을 오늘로)</span>';
    $('spyHist').innerHTML = '<tr><th>주차</th><th class="left">암행어사</th><th>임기</th><th>상태</th><th></th></tr>' +
      (sp.history.map((h) => \`<tr><td>\${esc(h.week)}</td><td class="left">\${esc(h.name)}</td><td>\${esc(h.start.slice(5))}~\${esc(h.end.slice(5))}</td>
        <td class="\${h.status === '검거됨' ? 'minus' : h.status === '활동중' ? 'plus' : 'muted'}">\${esc(h.status)}</td>
        <td>\${h.status === '활동중' ? \`<button class="btn sm danger" data-dismiss="\${h.row}">해임</button>\` : ''}</td></tr>\`).join('') || '<tr><td colspan="5" class="muted">아직 없어요.</td></tr>');
    $('spyJudges').innerHTML = '<tr><th>날짜</th><th class="left">암행어사</th><th class="left">😊 바른 1·2·3위</th><th class="left">🤬 나쁜 1·2·3위</th></tr>' +
      (sp.judges.map((j) => \`<tr><td>\${esc(j.date.slice(5))}</td><td class="left">\${esc(j.spy)}</td><td class="left plus">\${j.good.map(esc).join(', ')}</td><td class="left minus">\${j.bad.map(esc).join(', ') || '-'}</td></tr>\`).join('') || '<tr><td colspan="4" class="muted">아직 없어요.</td></tr>');
    $('accCount').textContent = \`(\${sp.accusedCount}/\${d.students.length}명 사용)\`;
    $('spyAcc').innerHTML = '<tr><th>시각</th><th class="left">지목한</th><th class="left">지목된</th><th>결과</th><th>이동</th></tr>' +
      (sp.accuses.map((a) => \`<tr><td>\${esc(String(a.ts).slice(5, 16))}</td><td class="left">\${esc(a.from)}</td><td class="left">\${esc(a.to)}</td>
        <td class="\${a.result === '성공' ? 'plus' : 'muted'}">\${esc(a.result)}</td><td>\${a.moved || ''}</td></tr>\`).join('') || '<tr><td colspan="5" class="muted">아직 없어요.</td></tr>');
  }

  async function appointSpy() {
    const no = $('spyNo').value, start = $('spyStart').value, end = $('spyEnd').value;
    if (!no) return toast('투투를 선택해 주세요.', true);
    const name = (S.data.students.find((s) => s.no === no) || {}).name;
    const ok = await modal({ title: '암행어사 지정', html: \`<p><b class="yellow">\${esc(name)}</b> · \${esc(start)} ~ \${esc(end)}</p><p class="muted">지정된 투투의 화면에만 "암행어사 임무"가 나타나요.</p>\`, okText: '지정' });
    if (!ok) return;
    try { setData(await call('adminAppointSpy', S.token, { no, start, end })); $('spyNo').value = ''; toast('지정했어요. 🤫'); }
    catch (e) { toast(e.message, true); }
  }

  async function dismissSpy(row) {
    const ok = await modal({ title: '암행어사 해임', html: '<p>잘못 지정했을 때 쓰세요. 이미 받은 도장은 그대로예요.</p>', okText: '해임', danger: true });
    if (!ok) return;
    try { setData(await call('adminDismissSpy', S.token, row)); toast('해임했어요.'); } catch (e) { toast(e.message, true); }
  }

  function renderReward() {
    const d = S.data, rw = d.reward;
    const medal = (r) => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : '🏅');
    $('rankRewards').innerHTML = rw.rankRewards.map((r) => \`<div class="card" style="margin-top:8px">
        <div class="row"><b class="yellow" style="flex:0 0 auto;font-size:18px">\${medal(r.rank)} \${r.rank}위</b>
          <span class="grow">\${r.who.length ? r.who.map((w) => \`<b>\${esc(w.no)}. \${esc(w.name)}</b> <span class="muted">(\${w.total}개)</span>\`).join(', ') : \`<span class="muted">해당 없음\${r.rank > 1 && rw.rankRewards.slice(0, r.rank - 1).some((x) => x.who.length > 1) ? ' (윗 순위에 공동 순위가 있어요)' : ''}</span>\`}</span></div>
        <div class="muted" style="margin-top:4px">\${esc(r.reward)}</div></div>\`).join('');
    $('drawRule').textContent = \`일퀘 올클(등교일 \${d.cfg.schoolDays.length}일 모두 완료) → 1장 · 순합계 도장 \${rw.threshold}개 이상 → 1장 · 둘 다 → 2장 (랭킹 보상과 중복 가능)\`;
    const list = rw.draws.filter((x) => !$('drawOnly').checked || x.tickets > 0 || x.done > 0);
    $('drawTable').innerHTML = \`<tr><th class="left">투투</th><th>일퀘</th><th>올클</th><th>도장</th><th>\${rw.threshold}↑</th><th>뽑기권</th><th>뽑기 완료</th></tr>\` +
      (list.map((x) => \`<tr><td class="left">\${esc(x.no)}. \${esc(x.name)}</td>
        <td>\${x.questDays}/\${x.dayCount}</td><td class="\${x.allClear ? 'plus' : 'muted'}">\${x.allClear ? '✓' : '·'}</td>
        <td>\${x.total}</td><td class="\${x.stampGoal ? 'plus' : 'muted'}">\${x.stampGoal ? '✓' : '·'}</td>
        <td class="yellow" style="font-weight:900">\${x.tickets}</td>
        <td><button class="btn sm ghost" data-draw="\${esc(x.no)}" data-n="\${x.done - 1}" \${x.done <= 0 ? 'disabled' : ''}>−</button>
          <b style="display:inline-block;min-width:44px" class="\${x.tickets && x.done >= x.tickets ? 'plus' : ''}">\${x.done}/\${x.tickets}</b>
          <button class="btn sm" data-draw="\${esc(x.no)}" data-n="\${x.done + 1}" \${x.done >= x.tickets ? 'disabled' : ''}>뽑기 완료 +1</button></td></tr>\`).join('') ||
        '<tr><td colspan="7" class="muted">아직 뽑기 대상자가 없어요.</td></tr>');
  }

  async function setDrawDone(no, n) {
    try { setData(await call('adminSetDrawDone', S.token, no, n)); toast('저장했어요.'); } catch (e) { toast(e.message, true); }
  }

  function renderManual() {
    const d = S.data;
    const valid = new Set(d.students.map((s) => s.no));
    S.sel.forEach((no) => { if (!valid.has(no)) S.sel.delete(no); });
    $('groupChips').innerHTML =
      \`<button class="chip" data-group="__all">반 전체 선택</button><button class="chip" data-group="__none">선택 해제</button>\`;
    $('studentChips').innerHTML = d.students.map((s) =>
      \`<button class="chip \${S.sel.has(s.no) ? 'on' : ''}" data-no="\${esc(s.no)}">\${esc(s.no)}. \${esc(s.name)}</button>\`).join('');
    $('selCount').textContent = \`\${S.sel.size}명 선택됨\`;
  }

  function renderLedger() {
    const d = S.data;
    const f = $('lFilter'), fm = $('lMission');
    const keep = f.value, keepM = fm.value;
    f.innerHTML = \`<option value="">전체 \${esc(d.cfg.nickname)}</option>\` +
      d.students.map((s) => \`<option value="\${esc(s.no)}">\${esc(s.no)}. \${esc(s.name)}</option>\`).join('');
    fm.innerHTML = \`<option value="">전체 미션</option>\` + d.missions.map((m) => \`<option value="\${esc(m)}">\${esc(m)}</option>\`).join('');
    f.value = keep; fm.value = keepM;
    const showCancelled = $('lCancelled').checked;
    const rows = d.ledger.filter((r) =>
      (!f.value || r.no === f.value) && (!fm.value || r.mission === fm.value) && (showCancelled || !r.cancelled));
    const head = \`<tr><th>날짜</th><th>시각</th><th class="left">이름</th><th>미션</th><th>점수</th><th>입력자</th><th>교시/과목</th><th class="left">메모</th><th></th></tr>\`;
    const body = rows.map((r) => \`<tr class="\${r.cancelled ? 'cancelled' : ''}">
      <td>\${esc(r.date.slice(5))}</td><td>\${esc(String(r.ts).slice(11, 16))}</td>
      <td class="left">\${esc(r.no)}. \${esc(r.name)}</td><td>\${esc(r.mission)}</td>
      <td class="\${scoreCls(r.score)}">\${signed(r.score)}</td>
      <td>\${esc(r.inputType)}\${r.inputBy && r.inputBy !== r.inputType ? ' · ' + esc(r.inputBy) : ''}</td>
      <td>\${esc([r.period && r.period + '교시', r.subject].filter(Boolean).join(' '))}</td>
      <td class="left" style="white-space:normal;min-width:140px">\${esc(r.memo)}\${r.cancelled ? \`<div class="minus" style="text-decoration:none;font-size:12px">취소: \${esc(r.cancelReason)}</div>\` : ''}</td>
      <td>\${r.cancelled || !r.id ? '' : \`<button class="btn sm danger" data-cancel="\${esc(r.id)}">취소</button>\`}</td></tr>\`).join('');
    $('ledgerTable').innerHTML = head + (body || \`<tr><td colspan="9" class="muted">기록이 없어요.</td></tr>\`);
  }

  function renderSettings() {
    const d = S.data, c = d.cfg;
    $('lockState').innerHTML = \`현재: <span class="pill \${c.rankLocked ? 'on' : 'off'}">\${c.rankLocked ? '🔒 잠금 ON' : '🔓 공개 (잠금 OFF)'}</span>\`;
    $('lockBtn').textContent = c.rankLocked ? '랭킹 공개하기' : '랭킹 잠그기';
    $('lockBtn').className = c.rankLocked ? 'btn yellow' : 'btn';
    $('testState').innerHTML = \`현재: <span class="pill \${c.testMode ? 'on' : 'off'}">\${c.testMode ? '🧪 테스트 모드 ON' : 'OFF (실제 운영)'}</span>\`;
    $('testBtn').textContent = c.testMode ? '테스트 모드 끄기' : '테스트 모드 켜기';
    $('testBtn').className = c.testMode ? 'btn yellow' : 'btn';
    const rows = [
      ['학생 호칭', c.nickname],
      ['기간', \`\${c.startDate} ~ \${c.endDate}\`],
      ['등교일', \`\${c.schoolDays.length}일 · \${c.schoolDays.map((x) => x.slice(5)).join(', ')}\`],
      ['랭킹 공개 인원', \`상위 \${c.rankPublicCount}명\`],
      ['뽑기 도장 기준', \`\${c.drawStampThreshold}개\`],
      ['칭찬 최소 글자 수', \`\${c.praiseMinLength}자\`],
      ['금지어', \`\${c.bannedWordCount}개 등록\`],
      ['지목 결과 공개', c.accuseResultPublic ? 'ON' : 'OFF'],
      ['교시 수', \`\${c.periodCount}교시\`],
      ['교과 선생님 코드', c.teacherCode || '(없음)'],
    ];
    $('cfgTable').innerHTML = rows.map(([k, v]) => \`<tr><th class="left" style="position:static">\${esc(k)}</th><td class="left" style="white-space:normal">\${esc(v)}</td></tr>\`).join('');
    $('rewards').innerHTML = c.rewards.map((r, i) => \`<div style="margin:4px 0"><span class="yellow" style="font-weight:700">\${i + 1}위</span> \${esc(r)}</div>\`).join('');
    $('sheetLink').href = d.spreadsheetUrl;
  }

  // ---------- 동작 ----------
  function switchTab(tab) {
    S.tab = tab;
    document.querySelectorAll('#tabs .tab').forEach((b) => b.classList.toggle('on', b.dataset.tab === tab));
    ['overview', 'quest', 'praise', 'spy', 'reward', 'manual', 'ledger', 'settings'].forEach((t) => $('tab-' + t).classList.toggle('hidden', t !== tab));
  }

  async function submitManual() {
    const d = S.data;
    const score = Number($('mScore').value);
    const reason = $('mReason').value.trim();
    const date = $('mDate').value;
    if (!S.sel.size) return toast(\`\${d.cfg.nickname}를 선택해 주세요.\`, true);
    if (!Number.isInteger(score) || score === 0) return toast('점수는 0이 아닌 정수로 입력해 주세요.', true);
    if (!reason) return toast('사유를 꼭 입력해 주세요.', true);
    const names = d.students.filter((s) => S.sel.has(s.no)).map((s) => s.name);
    const ok = await modal({
      title: '도장 입력 확인',
      html: \`<p><b class="\${scoreCls(score)}" style="font-size:20px">\${signed(score)}</b> · \${esc(date)}</p>
             <p>\${esc(names.join(', '))} (\${names.length}명)</p><p class="muted">사유: \${esc(reason)}</p>\`,
      okText: '추가하기',
    });
    if (!ok) return;
    try {
      setData(await call('adminAddManual', S.token, { studentNos: Array.from(S.sel), score, date, reason }));
      S.sel.clear(); $('mReason').value = ''; renderManual();
      toast(\`\${names.length}명에게 \${signed(score)} 기록했어요.\`);
    } catch (e) { toast(e.message, true); }
  }

  async function groupStamp() {
    const d = S.data, date = $('gDate').value, memo = $('gMemo').value.trim();
    const ok = await modal({ title: '반 전체 단체 도장',
      html: \`<p><b class="plus" style="font-size:20px">+3</b> · \${esc(date)}</p><p>\${esc(d.cfg.nickname)} 전원 \${d.students.length}명</p>\${memo ? \`<p class="muted">메모: \${esc(memo)}</p>\` : ''}\`,
      okText: '전원에게 +3' });
    if (!ok) return;
    try { setData(await call('adminGroupStamp', S.token, { date, memo })); $('gMemo').value = ''; toast(\`\${d.students.length}명에게 단체 +3 기록했어요.\`); }
    catch (e) { toast(e.message, true); }
  }

  async function cancelRecord(id) {
    const r = S.data.ledger.find((x) => x.id === id);
    if (!r) return;
    const reason = await modal({
      title: '기록 취소',
      html: \`<p>\${esc(r.date)} · \${esc(r.name)} · \${esc(r.mission)} <b class="\${scoreCls(r.score)}">\${signed(r.score)}</b></p>
             <p class="muted">기록은 지워지지 않고 "취소"로 표시되며 합계에서 빠집니다.</p>\`,
      input: '취소 사유 (필수)',
      okText: '취소 처리',
      danger: true,
    });
    if (!reason) return;
    try { setData(await call('adminCancelRecord', S.token, id, reason)); toast('취소했어요.'); }
    catch (e) { toast(e.message, true); }
  }

  async function toggleLock() {
    const next = !S.data.cfg.rankLocked;
    const ok = await modal({ title: next ? '랭킹 잠그기' : '랭킹 공개하기',
      html: next ? '<p>투투 화면에 "랭킹 공개 전입니다"가 표시됩니다.</p>' : '<p>투투 화면에 상위 랭킹이 공개됩니다.</p>' });
    if (!ok) return;
    try { setData(await call('adminSetRankLock', S.token, next)); toast(next ? '랭킹을 잠갔어요.' : '랭킹을 공개했어요.'); }
    catch (e) { toast(e.message, true); }
  }

  // ---------- 이벤트 ----------
  $('loginBtn').onclick = login;
  $('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  $('logoutBtn').onclick = () => { if (S.token) google.script.run.logout(S.token); logoutLocal(); };
  $('refreshBtn').onclick = () => refresh(false);
  $('reloadBtn').onclick = async () => { await refresh(true); toast('시트에서 다시 읽었어요.'); };
  $('sortBtn').onclick = () => { S.sort = S.sort === 'rank' ? 'no' : 'rank'; renderOverview(); };
  $('lockBtn').onclick = toggleLock;
  $('testBtn').onclick = async () => {
    const on = !S.data.cfg.testMode;
    const ok = await modal({ title: on ? '테스트 모드 켜기' : '테스트 모드 끄기',
      html: on ? '<p>오늘을 등교일로 취급해요. 모든 화면 위에 "🧪 테스트 모드" 표시가 나와요.</p>' : '<p>실제 운영 상태로 돌아가요. 테스트 기록은 아래 버튼으로 지워 주세요.</p>' });
    if (!ok) return;
    try { setData(await call('adminSetTestMode', S.token, on)); toast(on ? '테스트 모드를 켰어요.' : '테스트 모드를 껐어요.'); } catch (e) { toast(e.message, true); }
  };
  $('clearBtn').onclick = async () => {
    const text = await modal({ title: '테스트 기록 모두 지우기',
      html: '<p class="minus">되돌릴 수 없어요! 도장·칭찬·일퀘·암행어사·지목·뽑기 기록이 모두 지워져요.</p><p>계속하려면 아래에 <b class="yellow">테스트 기록 삭제</b>를 그대로 입력하세요.</p>',
      input: '테스트 기록 삭제', okText: '모두 지우기', danger: true });
    if (!text) return;
    try { setData(await call('adminClearTestData', S.token, text)); toast('테스트 기록을 모두 지웠어요.'); } catch (e) { toast(e.message, true); }
  };
  $('manualBtn').onclick = submitManual;
  $('groupBtn').onclick = groupStamp;
  $('spyBtn').onclick = appointSpy;
  $('drawOnly').addEventListener('change', renderReward);
  $('drawTable').onclick = (e) => { const b = e.target.closest('[data-draw]'); if (b && !b.disabled) setDrawDone(b.dataset.draw, Number(b.dataset.n)); };
  $('spyHist').onclick = (e) => { const b = e.target.closest('[data-dismiss]'); if (b) dismissSpy(Number(b.dataset.dismiss)); };
  $('spyWeeks').onclick = (e) => {
    const a = e.target.closest('[data-week]'); if (!a) return; e.preventDefault();
    const w = S.data.spy.weeks.find((x) => String(x.week) === a.dataset.week);
    if (w) { $('spyStart').value = w.start; $('spyEnd').value = w.end; }
  };
  $('tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) switchTab(b.dataset.tab); };
  $('studentChips').onclick = (e) => {
    const b = e.target.closest('[data-no]');
    if (!b) return;
    const no = b.dataset.no;
    S.sel.has(no) ? S.sel.delete(no) : S.sel.add(no);
    renderManual();
  };
  $('groupChips').onclick = (e) => {
    const b = e.target.closest('[data-group]');
    if (!b) return;
    const g = b.dataset.group;
    if (g === '__none') S.sel.clear();
    else S.data.students.forEach((s) => S.sel.add(s.no));
    renderManual();
  };
  $('scoreQuick').onclick = (e) => { const b = e.target.closest('[data-score]'); if (b) $('mScore').value = b.dataset.score; };
  $('ledgerTable').onclick = (e) => { const b = e.target.closest('[data-cancel]'); if (b) cancelRecord(b.dataset.cancel); };
  ['pDate', 'pFrom', 'pTo'].forEach((id) => $(id).addEventListener('change', renderPraise));
  $('praiseList').onclick = (e) => { const b = e.target.closest('[data-hide]'); if (b) togglePraise(b.dataset.hide, b.dataset.hidden !== '1'); };
  $('questTable').onclick = (e) => { const c = e.target.closest('[data-qd]'); if (c) $('questDetail').textContent = c.dataset.qd; };
  ['lFilter', 'lMission', 'lCancelled'].forEach((id) => $(id).addEventListener('change', renderLedger));

  // 60초마다 자동 갱신 (입력 중인 탭·모달이 열려 있으면 건너뜀)
  setInterval(() => {
    if (S.token && S.tab !== 'manual' && !$('modal-root').innerHTML && document.visibilityState === 'visible') refresh(false);
  }, 60000);

  S.token = load('adminToken');
  if (S.token) refresh(false);
</script>
</body>
</html>
`,
  "ComingSoon": `<!DOCTYPE html>
<html lang="ko">
<head>
  <base target="_top">
  <meta charset="utf-8">
  <?!= include('Styles') ?>
</head>
<body>
  <div class="wrap" style="max-width:560px">
    <div class="metal hero">
      <h1 class="title-font"><?!= titleHtml ?></h1>
      <div class="deco"></div>
      <div class="sub">- <?= subtitle ?> -</div>
    </div>
    <div class="box" style="text-align:center">
      <h2 class="title-font">🚀 준비 중이에요</h2>
      <p>캠페인 화면을 곧 열어 드릴게요!</p>
    </div>
  </div>
</body>
</html>
`,
  "Student": `<!DOCTYPE html>
<html lang="ko">
<head>
  <base target="_top">
  <meta charset="utf-8">
  <?!= include('Styles') ?>
  <style>
    .wrap { max-width: 560px; }
    .bubble-title {
      font-family: 'Jua', 'Noto Sans KR', sans-serif; text-align: center; margin: 0; line-height: 1.1;
      font-size: clamp(30px, 9vw, 42px); color: #c8f0ff; letter-spacing: 1px;
      text-shadow: 3px 0 #1a4fa8, -3px 0 #1a4fa8, 0 3px #1a4fa8, 0 -3px #1a4fa8,
        2px 2px #1a4fa8, -2px -2px #1a4fa8, 2px -2px #1a4fa8, -2px 2px #1a4fa8, 0 6px 0 #0b2a66, 0 0 18px #5cc8ff;
    }
    .space-sub { font-family: 'Jua', sans-serif; text-align: center; color: #fff; font-size: 14px; margin-bottom: 6px; opacity: .9; }

    /* 우주 패널 */
    .space {
      position: relative; overflow: hidden; margin-top: 14px; padding: 18px 12px 16px; border-radius: 18px;
      background:
        radial-gradient(2px 2px at 8% 20%, #fff 50%, transparent 51%),
        radial-gradient(1.5px 1.5px at 85% 12%, #fff 50%, transparent 51%),
        radial-gradient(1.5px 1.5px at 70% 78%, #fffa 50%, transparent 51%),
        radial-gradient(2px 2px at 15% 88%, #fff 50%, transparent 51%),
        radial-gradient(1px 1px at 50% 6%, #fff 50%, transparent 51%),
        radial-gradient(ellipse at 50% 0%, #3b3f8f 0%, #1c1f55 45%, #0d1030 100%);
      border: 1px solid #3b4aa0; box-shadow: 0 0 24px #2f8bff33;
    }
    .space .deco { position: absolute; font-size: 30px; pointer-events: none; filter: drop-shadow(0 0 6px #0008); }

    /* 행성 도장판 */
    .planet {
      position: relative; width: min(84vw, 380px); aspect-ratio: 1; margin: 6px auto 0; border-radius: 50%;
      background:
        radial-gradient(ellipse 30% 18% at 28% 30%, var(--pland, #36c9e8) 60%, transparent 62%),
        radial-gradient(ellipse 22% 30% at 72% 62%, var(--pland, #36c9e8) 60%, transparent 62%),
        radial-gradient(ellipse 26% 14% at 40% 78%, var(--pland, #36c9e8) 60%, transparent 62%),
        radial-gradient(circle at 32% 28%, var(--pbase, #3fa9ff, #1668d8 55%, #0b3f9e));
      box-shadow: 0 0 34px #2f8bff99, inset -18px -22px 40px #0006;
      display: flex; flex-direction: column; justify-content: center; gap: 2.2%;
      font-size: clamp(14px, 4.6vw, 20px);
    }
    .prow { display: flex; justify-content: center; gap: 2.2%; }
    .slot {
      width: 12.6%; aspect-ratio: 1; border-radius: 50%; background: #fff; color: #2a63c9;
      display: flex; align-items: center; justify-content: center; font-family: 'Jua', sans-serif;
      box-shadow: 0 2px 0 #0003;
    }
    .slot.on {
      background: radial-gradient(circle at 35% 35%, #fffbd0, #ffd23f 55%, #f5a300);
      color: #8a4b00; font-size: 1.25em; box-shadow: 0 0 12px #ffd23f, 0 2px 0 #0003;
    }
    .slot.new { animation: pop .6s ease-out; }
    @keyframes pop { 0% { transform: scale(0) rotate(-40deg); } 70% { transform: scale(1.25); } 100% { transform: scale(1); } }
    .stamp-count { text-align: center; margin-top: 12px; font-family: 'Jua', sans-serif; font-size: 22px; }
    .stamp-count b { color: var(--yellow); font-size: 30px; }
    .bonus { text-align: center; color: var(--yellow); margin-top: 4px; letter-spacing: 2px; }
    .planet-name { text-align: center; font-family: 'Jua', sans-serif; color: #cfe3ff; margin-top: 4px; }
    .done-row { display: flex; flex-wrap: wrap; justify-content: center; gap: 6px; margin: 6px 0 2px; }
    .done-planet { display: inline-flex; flex-direction: column; align-items: center; font-size: 26px; line-height: 1;
      background: #ffffff12; border: 1px solid #ffffff22; border-radius: 12px; padding: 6px 8px; }
    .done-planet small { font-size: 11px; color: var(--yellow); margin-top: 3px; font-family: 'Jua', sans-serif; }

    /* 랭킹 */
    .rank-row { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px; margin-top: 6px; background: #0a1a33; }
    .rank-row.me { background: #ffd23f22; box-shadow: inset 0 0 0 1px var(--yellow); }
    .rank-row .rk { width: 38px; text-align: center; font-weight: 900; font-size: 20px; }
    .rank-row .nm { flex: 1; font-weight: 700; }
    .rank-row .sc { color: var(--yellow); font-weight: 900; }
    .myrank { margin-top: 12px; text-align: center; font-size: 18px; font-weight: 700; }
    .myrank b { color: var(--yellow); font-size: 26px; }
    .up { color: #ff6b8a; } .down { color: #5cc8ff; }

    /* 카드 */
    .mini { display: grid; grid-template-columns: repeat(2, 1fr); gap: 8px; }
    .mini .card { text-align: center; }
    .mini .card .v { font-size: 24px; }

    /* 일퀘판 (종이 일퀘판 모양) */
    .qtable { width: 100%; border-collapse: separate; border-spacing: 0 4px; font-size: 15px; }
    .qtable th { background: #fff3c4; color: #1c1f55; position: static; padding: 8px 6px; font-family: 'Jua', sans-serif; font-size: 16px; }
    .qtable th:first-child { border-radius: 8px 0 0 8px; } .qtable th:last-child { border-radius: 0 8px 8px 0; }
    .qtable td { background: #e6e9f0; color: #1c1f55; padding: 8px 6px; }
    .qtable td:first-child { border-radius: 8px 0 0 8px; font-family: 'Jua', sans-serif; white-space: nowrap; }
    .qtable td:last-child { border-radius: 0 8px 8px 0; }
    .qtable tr.today td { background: #cfeaff; box-shadow: inset 0 0 0 2px #5cc8ff; }
    .mark { font-family: 'Jua', sans-serif; font-size: 22px; }
    .mark.o { color: #1a9b4b; } .mark.x { color: #d64545; }

    /* 수업 싸인판 */
    .signs { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 6px; }
    .sign { aspect-ratio: 1 / 1.1; background: #fff; border-radius: 8px; color: #1c1f55; position: relative; padding: 4px 2px; font-size: 11px; overflow: hidden; word-break: keep-all; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; }
    .sign .n { position: absolute; top: 3px; left: 6px; font-family: 'Black Han Sans', sans-serif; font-size: 14px; }
    .sign.on { background: linear-gradient(180deg, #fffbe0, #ffe58a); }
    .sign.on .s { font-weight: 900; font-size: 13px; }
    .sign.mvp { background: linear-gradient(180deg, #ffe0f0, #ffb3d9); }

    .rec { display: flex; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid #ffffff12; font-size: 14px; }
    .rec .d { color: var(--muted); width: 52px; flex: 0 0 auto; }
    .rec .l { flex: 1; }
    details summary { cursor: pointer; color: var(--sky); font-weight: 700; padding: 6px 0; }
    /* 시간표 */
    .tt { display: grid; grid-template-columns: repeat(auto-fit, minmax(64px, 1fr)); gap: 6px; }
    .tt div { background: #0a1a33; border: 1px solid var(--navy-line); border-radius: 10px; padding: 6px 4px; text-align: center; }
    .tt b { display: block; font-size: 15px; color: var(--text); }
    .tt small { color: var(--muted); font-size: 11px; }

    /* 오늘의 퀘스트 */
    .quest { background: #0a1a33; border: 1px solid var(--navy-line); border-radius: 12px; padding: 12px; margin-top: 10px; }
    .quest.done { border-color: var(--green); box-shadow: 0 0 10px #4ade8044; }
    .quest.fail { border-color: var(--red); }
    .quest .qh { display: flex; align-items: center; gap: 8px; font-weight: 900; font-size: 17px; }
    .quest .qh .st { margin-left: auto; font-size: 13px; padding: 2px 10px; border-radius: 999px; background: #20314f; color: var(--muted); white-space: nowrap; }
    .quest.done .qh .st { background: var(--green); color: #052e16; }
    .quest.fail .qh .st { background: var(--red); color: #fff; }
    .chip:disabled { opacity: .35; cursor: not-allowed; text-decoration: line-through; }
    .greeted { display: inline-flex; align-items: center; gap: 6px; background: #13294b; border: 1px solid var(--sky); border-radius: 999px; padding: 6px 6px 6px 12px; margin: 4px 6px 0 0; }
    .greeted button { appearance: none; border: 0; background: #ffffff22; color: #fff; border-radius: 50%; width: 26px; height: 26px; cursor: pointer; }
    .dz { display: flex; align-items: center; gap: 6px; padding: 6px 0; border-bottom: 1px solid #ffffff10; }
    .dz .p { flex: 1; font-size: 15px; }
    .dz .p small { color: var(--muted); }
    .dz button { appearance: none; font: inherit; font-size: 14px; cursor: pointer; border-radius: 10px; min-height: 40px; padding: 4px 8px; border: 1px solid var(--navy-line); background: #081427; color: var(--muted); }
    .dz button.on.o { background: #1a9b4b; color: #fff; border-color: #1a9b4b; }
    .dz button.on.x { background: #d64545; color: #fff; border-color: #d64545; }
    .rule { background: #ffd23f1a; border: 1px solid #ffd23f66; color: #ffe9a8; border-radius: 10px; padding: 8px 10px; margin-top: 8px; font-size: 13px; line-height: 1.5; }
    .rule b { color: var(--yellow); }
    .letter.hid { background: #20314f; color: var(--muted); text-align: center; }
    .counter { text-align: right; font-size: 12px; color: var(--muted); }
    .stamp-done { text-align: center; font-size: 20px; font-weight: 900; color: var(--yellow); padding: 8px 0; }

    /* 받은 칭찬함 */
    .letter { background: linear-gradient(180deg, #fff8e6, #ffeccc); color: #3b2a12; border-radius: 12px; padding: 12px 14px; margin-top: 8px; }
    .letter .from { font-weight: 900; color: #b4531a; }
    .letter .d { color: #8a6d4b; font-size: 12px; }
    .letter .txt { margin: 6px 0 8px; white-space: pre-wrap; word-break: break-word; }
    .thanks { appearance: none; font: inherit; cursor: pointer; border: 0; border-radius: 999px; padding: 6px 14px; background: #ff7aa8; color: #fff; font-weight: 700; }
    .thanks:disabled { background: #e8c6d3; color: #8a5b6c; cursor: default; }

    /* 암행어사 */
    .spybox { border-color: #b18cff; box-shadow: 0 0 18px #8b5cf655; background: linear-gradient(180deg, #2a1650, #160c33); }
    .spybox h2 { color: #d9c4ff; }
    .secret { display: inline-block; font-size: 12px; background: #b18cff; color: #1a0b38; border-radius: 999px; padding: 1px 8px; margin-left: 6px; vertical-align: middle; }
    .jrow { display: flex; align-items: center; gap: 8px; margin-top: 8px; }
    .jrow .rk { flex: 0 0 92px; font-weight: 900; }
    .jrow .rk.good { color: var(--sky); } .jrow .rk.bad { color: var(--red); }
    .result { text-align: center; padding: 14px 8px; border-radius: 12px; font-size: 18px; font-weight: 900; }
    .result.ok { background: #1a9b4b33; color: #b8f5cf; border: 1px solid #1a9b4b; }
    .result.no { background: #20314f; color: var(--muted); }
    .news { background: #ffd23f1a; border: 1px solid #ffd23f55; border-radius: 10px; padding: 8px 10px; margin-top: 6px; }

    .jump { position: sticky; top: 0; z-index: 30; display: flex; gap: 6px; overflow-x: auto; -webkit-overflow-scrolling: touch;
      margin: 10px -14px 0; padding: 8px 14px; background: #03050aee; backdrop-filter: blur(6px); border-bottom: 1px solid #2a4a7c88; scrollbar-width: none; }
    .jump::-webkit-scrollbar { display: none; }
    .jump a { flex: 0 0 auto; cursor: pointer; padding: 6px 12px; border-radius: 999px; background: #0a1a33; border: 1px solid var(--navy-line);
      color: var(--text); font-size: 14px; font-weight: 700; text-decoration: none; white-space: nowrap; }
    .jump a:active { background: var(--sky); color: #04203d; }
    .box, .space { scroll-margin-top: 60px; }

    .topbar { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
    .topbar .hi { flex: 1; font-weight: 700; }
    .topbar .hi b { color: var(--yellow); }
  </style>
</head>
<body>
<div id="loading"></div>
<div class="wrap">
  <div class="metal hero">
    <h1 class="title-font"><?!= titleHtml ?></h1>
    <div class="deco"></div>
    <div class="sub">- <?= subtitle ?> -</div>
  </div>

  <!-- 로그인 -->
  <section id="login" class="box">
    <h2 class="title-font">🚀 <?= nickname ?> 입장</h2>
    <label for="no">번호</label>
    <input id="no" type="text" inputmode="numeric" pattern="[0-9]*" maxlength="3" autocomplete="off" placeholder="예: 7">
    <label for="code">로그인 코드 (4자리)</label>
    <input id="code" type="password" inputmode="numeric" pattern="[0-9]*" maxlength="8" autocomplete="off" placeholder="선생님께 받은 코드">
    <button class="btn yellow block" style="margin-top:14px" id="loginBtn">입장하기</button>
    <p class="muted" style="margin-top:10px">한 번 입장하면 캠페인 기간 동안 로그인이 유지돼요.</p>
  </section>

  <!-- 내 화면 -->
  <section id="app" class="hidden">
    <div class="topbar">
      <div class="hi" id="hi"></div>
      <button class="btn sm ghost" id="refreshBtn">새로고침</button>
      <button class="btn sm danger" id="logoutBtn">나가기</button>
    </div>

    <!-- 바로가기 -->
    <nav class="jump" id="jump">
      <a data-to="rankBox">🏆 랭킹</a><a data-to="questBox">⭐ 퀘스트</a><a data-to="boardSec">🌍 도장판</a>
      <a data-to="inboxSec">💌 칭찬함</a><a data-to="accuseBox">🔍 지목</a><a data-to="rewardSec">🎁 보상</a>
    </nav>

    <!-- 랭킹 -->
    <div class="box" id="rankBox"></div>

    <!-- 암행어사 임무 (본인이 암행어사일 때만 서버가 내려줌) -->
    <div class="box spybox hidden" id="spyBox"></div>

    <!-- 오늘의 시간표 + 퀘스트 -->
    <div class="box" id="questBox">
      <h2 class="title-font">📅 오늘의 시간표</h2>
      <div class="tt" id="tt"></div>
      <div class="muted" id="ttMemo" style="margin-top:6px"></div>
      <div class="neon-line"></div>
      <h2 class="title-font">⭐ 오늘의 퀘스트</h2>
      <div id="questStatus"></div>

      <div class="quest" id="qPraise">
        <div class="qh">💌 친구에게 칭찬 1회 <span class="st" id="qPraiseSt"></span></div>
        <div id="praiseDone" class="hidden" style="margin-top:8px"></div>
        <div id="praiseHidden" class="warn hidden"></div>
        <div id="praiseForm">
          <div class="rule">👀 담임 선생님이 모든 칭찬을 확인해요.<br>
            <b>비난·비판·놀림</b>이 담긴 내용이나 <b>구체적이지 않은 칭찬</b>은<br>숨김 처리되고 칭찬 미션도 취소돼요.</div>
          <label>칭찬할 친구 (한 번 칭찬한 친구는 다시 고를 수 없어요)</label>
          <div class="chips" id="friendChips"></div>
          <label for="praiseText">칭찬 문장</label>
          <textarea id="praiseText" rows="3" maxlength="200" placeholder="친구의 멋진 점을 구체적으로 써 주세요!"></textarea>
          <div class="counter" id="praiseCount"></div>
          <button class="btn yellow block" id="praiseBtn" style="margin-top:8px">칭찬 보내기 💌</button>
        </div>
      </div>

      <div class="quest" id="qGreet">
        <div class="qh">🙇 복도에서 선생님께 인사 2회 <span class="st" id="qGreetSt"></span></div>
        <div id="greetList" style="margin-top:6px"></div>
        <div id="greetForm">
          <label>인사한 선생님 (서로 다른 선생님 2분)</label>
          <div class="chips" id="teacherChips"></div>
          <div class="row" style="margin-top:8px">
            <input id="greetInput" type="text" maxlength="20" placeholder="목록에 없으면 직접 입력 (예: 교장선생님)" class="grow">
            <button class="btn sm" id="greetBtn" style="flex:0 0 auto;min-height:46px">추가</button>
          </div>
        </div>
      </div>

      <div class="quest" id="qDoze">
        <div class="qh">😴 수업 시간에 졸지 않기 <span class="st" id="qDozeSt"></span></div>
        <div class="muted" id="dozeHelp" style="margin:4px 0"></div>
        <div id="dozeList"></div>
      </div>
    </div>

    <!-- 도장판 -->
    <div class="space" id="boardSec">
      <span class="deco" style="left:10px;top:70px">🪐</span>
      <span class="deco" style="right:12px;top:16px;font-size:22px">⭐</span>
      <span class="deco" style="right:8px;bottom:40px;font-size:36px">🛸</span>
      <div class="space-sub">- <?= subtitle ?> -</div>
      <h2 class="bubble-title" id="boardTitle"></h2>
      <div id="donePlanets"></div>
      <div class="planet-name" id="planetName"></div>
      <div class="planet" id="planet"></div>
      <div class="stamp-count" id="stampCount"></div>
      <div class="bonus" id="bonus"></div>
    </div>

    <!-- 요약 카드 -->
    <div class="box">
      <h2 class="title-font">📊 미션별 도장</h2>
      <div class="mini" id="groups"></div>
      <div class="neon-line"></div>
      <div class="mini" id="extra"></div>
      <div id="drawMsg" class="muted" style="text-align:center;margin-top:10px"></div>
    </div>

    <!-- 일퀘판 -->
    <div class="space">
      <div class="space-sub">일퀘 3가지를 모두 완료하면 도장 +1!</div>
      <h2 class="bubble-title" id="questTitle"></h2>
      <table class="qtable" style="margin-top:10px">
        <thead><tr><th style="width:84px">날짜</th><th>일퀘 달성 여부</th><th>칭찬한 친구</th></tr></thead>
        <tbody id="questBody"></tbody>
      </table>
    </div>

    <!-- 암행어사 지목 -->
    <div class="box" id="accuseBox">
      <h2 class="title-font">🔍 욕설 암행어사를 찾아라!</h2>
      <div id="accuseBody"></div>
      <div id="newsBox"></div>
    </div>

    <!-- 받은 칭찬함 -->
    <div class="box" id="inboxSec">
      <h2 class="title-font">💌 받은 칭찬함</h2>
      <div id="inbox"></div>
      <p class="muted" style="margin-bottom:0">받은 칭찬은 나만 볼 수 있어요.</p>
    </div>

    <!-- 수업 싸인판 -->
    <div class="space">
      <h2 class="bubble-title" id="signTitle"></h2>
      <div class="space-sub" style="margin:6px 0 10px">수업 적극 참여 +2 · 수업 MVP +3</div>
      <div class="signs" id="signs"></div>
    </div>

    <!-- 보상 안내 -->
    <div class="box" id="rewardSec">
      <h2 class="title-font">🏆 보상 안내</h2>
      <div id="rewardGuide"></div>
    </div>

    <!-- 기록 -->
    <div class="box">
      <h2 class="title-font">📜 내 도장 기록</h2>
      <div id="minusBox"></div>
      <details id="allRec"><summary>전체 기록 보기</summary><div id="records"></div></details>
    </div>

    <p class="muted" style="text-align:center" id="stamp"></p>
  </section>
</div>

<div id="toast"></div>
<div id="modal-root"></div>

<script>
  const S = { accuseTo: '', judge: {}, token: null, data: null, lastTotal: null, busy: false, acting: false, seq: 0, appliedSeq: 0, praiseTo: '' };
  const $ = (id) => document.getElementById(id);
  const WD = ['일', '월', '화', '수', '목', '금', '토'];
  const PLANET_ROWS = [3, 5, 6, 5, 4]; // 종이 도장판과 같은 23칸

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function store(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function signed(n) { return n > 0 ? '+' + n : String(n); }
  function md(d) { const [, m, dd] = d.split('-'); return \`\${Number(m)}/\${Number(dd)}\`; }
  function wd(d) { const [y, m, dd] = d.split('-').map(Number); return WD[new Date(y, m - 1, dd).getDay()]; }

  let toastTimer = null;
  function toast(msg, isErr) {
    const t = $('toast');
    t.textContent = msg; t.className = isErr ? 'err' : ''; t.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.style.display = 'none'), 2600);
  }

  function call(fn, ...args) {
    $('loading').style.display = 'block';
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler((r) => { $('loading').style.display = 'none'; resolve(r); })
        .withFailureHandler((err) => {
          $('loading').style.display = 'none';
          let msg = (err && err.message) || String(err);
          if (msg.indexOf('AUTH:') >= 0) { logoutLocal(); msg = msg.replace(/^.*AUTH:\\s*/, ''); }
          reject(new Error(msg.replace(/^(Error|Exception):\\s*/, '')));
        })[fn](...args);
    });
  }

  // ---------- 로그인 ----------
  async function login() {
    const no = $('no').value.trim(), code = $('code').value.trim();
    if (!no || !code) return toast('번호와 코드를 입력해 주세요.', true);
    $('loginBtn').disabled = true;
    try {
      const r = await call('studentLogin', no, code);
      S.token = r.token;
      store('tutuToken', r.token);
      store('tutuNo', no);
      $('code').value = '';
      await refresh();
    } catch (e) { toast(e.message, true); }
    $('loginBtn').disabled = false;
  }
  function logoutLocal() {
    S.token = null; S.data = null; S.lastTotal = null;
    store('tutuToken', null);
    $('app').classList.add('hidden');
    $('login').classList.remove('hidden');
  }
  async function refresh(quiet) {
    if (!S.token || S.busy || S.acting) return;
    S.busy = true;
    const my = ++S.seq;
    try {
      const d = await call('studentGetHome', S.token);
      if (my >= S.appliedSeq) { S.appliedSeq = my; apply(d); }
    } catch (e) { if (!quiet || !S.token) toast(e.message, true); }
    S.busy = false;
  }

  function apply(d) {
    $('login').classList.add('hidden');
    $('app').classList.remove('hidden');
    // 자동 갱신 결과가 지난번과 같으면 화면을 다시 그리지 않는다 (휴대폰 버벅임 방지)
    const key = JSON.stringify(Object.assign({}, d, { serverTime: '', notice: '' }));
    S.data = d;
    if (key !== S.lastKey) { S.lastKey = key; render(); }
    else $('stamp').textContent = \`마지막 갱신 \${d.serverTime} · 30초마다 자동 갱신\`;
    if (d.notice) toast(d.notice);
  }

  /**
   * 퀘스트 입력 동작: 누른 순서대로 서버에 보내고(줄 세우기),
   * 마지막 응답이 오면 그때 한 번 화면을 맞춘다. 중간에 받은 알림(도장 +1 등)은 모아서 보여 준다.
   */
  let actChain = Promise.resolve();
  function act(fn, ...args) {
    S.pending = (S.pending || 0) + 1;
    S.acting = true;
    S.appliedSeq = ++S.seq; // 이미 출발한 자동 갱신 응답은 버린다 (내 입력보다 오래된 데이터)
    const job = actChain.then(async () => {
      let ok = false;
      try {
        const d = await call(fn, S.token, ...args);
        if (d.notice) S.notice = d.notice;
        S.result = d;
        ok = true;
      } catch (e) {
        toast(e.message, true);
        S.failed = true;
      } finally {
        S.pending--;
        if (!S.pending) {
          S.acting = false;
          if (S.result) {
            const d = S.result;
            d.notice = S.notice || d.notice;
            S.result = null; S.notice = '';
            S.lastKey = ''; // 방금 누른 결과는 항상 다시 그림
            apply(d);
          }
          if (S.failed) { S.failed = false; S.lastKey = ''; refresh(true); } // 실패하면 서버 상태로 되돌림
        }
      }
      return ok;
    });
    actChain = job.catch(() => {});
    return job;
  }

  // ---------- 렌더 ----------
  function render() {
    const d = S.data;
    const nick = d.nickname;
    $('hi').innerHTML = \`🚀 <b>\${esc(d.me.name)}</b> \${esc(nick)}, 안녕!\` +
      \`<div class="muted">\${md(d.today)}(\${wd(d.today)}) · \${d.dayIndex ? \`\${d.dayIndex}/\${d.dayCount}일차\` : '등교일이 아니에요'}</div>\`;
    renderRanking(d);
    renderToday(d);
    renderBoard(d);
    renderSummary(d);
    renderQuest(d);
    renderSigns(d);
    renderRecords(d);
    renderInbox(d);
    renderSpy(d);
    renderRewardGuide(d);
    $('stamp').textContent = \`마지막 갱신 \${d.serverTime} · 30초마다 자동 갱신\`;
  }

  function renderRanking(d) {
    const r = d.ranking;
    if (r.locked) {
      $('rankBox').innerHTML = \`<h2 class="title-font">🏆 랭킹</h2>
        <div style="text-align:center;padding:18px 0;font-size:20px;font-weight:700">🔒 랭킹 공개 전입니다</div>
        <p class="muted" style="text-align:center;margin:0">도장을 열심히 모으면서 기다려 주세요!</p>\`;
      return;
    }
    const medal = (k) => (k === 1 ? '🥇' : k === 2 ? '🥈' : k === 3 ? '🥉' : k);
    const rows = r.top.map((t) => \`<div class="rank-row \${t.isMe ? 'me' : ''}">
        <div class="rk">\${medal(t.rank)}</div><div class="nm">\${esc(t.name)}\${t.isMe ? ' (나)' : ''}</div>
        <div class="sc">\${t.total}개</div></div>\`).join('');
    let delta = '';
    if (r.myDelta > 0) delta = \` <span class="up">▲\${r.myDelta}</span>\`;
    else if (r.myDelta < 0) delta = \` <span class="down">▼\${-r.myDelta}</span>\`;
    else if (r.myDelta === 0) delta = ' <span class="muted">-</span>';
    $('rankBox').innerHTML = \`<h2 class="title-font">🏆 오늘의 랭킹 TOP \${r.publicCount}</h2>\${rows || '<p class="muted">아직 기록이 없어요.</p>'}
      <div class="myrank">내 순위: <b>\${r.myRank}위</b>\${delta}</div>
      \${r.prevDate ? \`<div class="muted" style="text-align:center">▲▼ \${md(r.prevDate)} 대비 · 내 순위는 나만 볼 수 있어요</div>\` : '<div class="muted" style="text-align:center">내 순위는 나만 볼 수 있어요</div>'}\`;
  }

  // 행성 하나 = 23칸 (종이 도장판). 다 채우면 다음 행성이 열리고 번호는 이어진다.
  const PLANET_SIZE = PLANET_ROWS.reduce((a, b) => a + b, 0);
  const PLANET_THEMES = [
    { name: '푸른 행성', base: '#3fa9ff, #1668d8 55%, #0b3f9e', land: '#36c9e8', icon: '🌍' },
    { name: '보라 행성', base: '#c08bff, #7a3fd8 55%, #46208f', land: '#e0a8ff', icon: '🔮' },
    { name: '노을 행성', base: '#ffb36b, #e86a2c 55%, #9e3512', land: '#ffd38a', icon: '🪐' },
    { name: '초록 행성', base: '#6be3a0, #1fa860 55%, #0d6b3a', land: '#b4f5c9', icon: '🌳' },
    { name: '분홍 행성', base: '#ff9ccf, #e0479a 55%, #8f1f5c', land: '#ffd0e8', icon: '🌸' },
    { name: '황금 행성', base: '#ffe680, #f0b400 55%, #9e6b00', land: '#fff3b0', icon: '👑' },
  ];

  function renderBoard(d) {
    const total = d.total;
    const filled = Math.max(0, total);
    const prev = S.lastTotal == null ? filled : Math.max(0, S.lastTotal);
    const cur = Math.floor(filled / PLANET_SIZE); // 지금 채우는 행성 번호 (0부터)
    const theme = PLANET_THEMES[cur % PLANET_THEMES.length];
    const start = cur * PLANET_SIZE;
    $('boardTitle').textContent = \`\${d.me.name} 도장판\`;

    // 완성한 행성들
    let done = '';
    for (let i = 0; i < cur; i++) {
      const t = PLANET_THEMES[i % PLANET_THEMES.length];
      done += \`<span class="done-planet" title="\${esc(t.name)}">\${t.icon}<small>\${i * PLANET_SIZE + 1}~\${(i + 1) * PLANET_SIZE}</small></span>\`;
    }
    $('donePlanets').innerHTML = cur ? \`<div class="muted" style="text-align:center;color:#cfe3ff">완성한 행성 \${cur}개</div><div class="done-row">\${done}</div>\` : '';
    $('planetName').textContent = \`\${cur + 1}번째 · \${theme.name}\`;

    const planet = $('planet');
    planet.style.setProperty('--pbase', theme.base);
    planet.style.setProperty('--pland', theme.land);
    let n = 0;
    planet.innerHTML = PLANET_ROWS.map((cnt) => {
      let row = '';
      for (let i = 0; i < cnt; i++) {
        n++;
        const num = start + n;
        const on = num <= filled;
        const isNew = on && num > prev;
        row += \`<div class="slot \${on ? 'on' : ''} \${isNew ? 'new' : ''}">\${on ? '★' : num}</div>\`;
      }
      return \`<div class="prow">\${row}</div>\`;
    }).join('');
    $('stampCount').innerHTML = \`도장 <b>\${total}</b>개\`;
    const left = (cur + 1) * PLANET_SIZE - filled;
    $('bonus').textContent = \`다음 행성까지 \${left}개!\`;
    if (S.lastTotal != null) {
      if (Math.floor(Math.max(0, S.lastTotal) / PLANET_SIZE) < cur) toast(\`🎉 \${cur}번째 행성 완성! 새 행성이 열렸어요!\`);
      else if (total > S.lastTotal) toast(\`도장 \${signed(total - S.lastTotal)}! 🎉\`);
    }
    S.lastTotal = total;
  }

  function renderSummary(d) {
    $('groups').innerHTML = d.groups.map((g) =>
      \`<div class="card"><div class="k">\${g.icon} \${esc(g.label)}</div><div class="v \${g.total < 0 ? 'minus' : ''}">\${g.total}</div></div>\`).join('');
    const dr = d.draw;
    $('extra').innerHTML =
      \`<div class="card"><div class="k">🔥 일퀘 연속</div><div class="v">\${d.streak}일</div></div>\` +
      \`<div class="card"><div class="k">🎟 쿠폰 뽑기권</div><div class="v">\${dr.tickets}장</div></div>\`;
    const parts = [];
    parts.push(dr.stampGoal ? \`🎉 도장 \${dr.threshold}개 달성! 뽑기권 +1\` : \`도장 \${dr.threshold}개까지 <b class="yellow">\${dr.toGoal}개</b> 남았어요!\`);
    parts.push(dr.allClear ? '🎉 일퀘 올클리어! 뽑기권 +1' : \`일퀘를 \${d.dayCount}일 모두 완료하면 뽑기권 +1 (지금 \${dr.questDays}/\${d.dayCount}일)\`);
    if (dr.tickets || dr.done) parts.push(\`🎟 쿠폰 뽑기: <b class="yellow">\${dr.done}/\${dr.tickets}</b>장 사용 · 담임 선생님께 뽑기를 받아요!\`);
    $('drawMsg').innerHTML = parts.join('<br>');
  }

  function renderQuest(d) {
    $('questTitle').textContent = \`\${d.me.name} 일퀘판\`;
    $('questBody').innerHTML = d.questBoard.map((q) => {
      const mark = q.state === 'O' ? '<span class="mark o">O</span>'
        : q.state === 'X' ? '<span class="mark x">X</span>'
        : q.state === 'today' ? '<span style="font-weight:700">오늘 도전 중!</span>' : '';
      return \`<tr class="\${q.state === 'today' ? 'today' : ''}"><td>\${md(q.date)}(\${wd(q.date)})</td>
        <td style="text-align:center">\${mark}</td><td style="text-align:center">\${q.friend ? esc(q.friend) : q.friendHidden ? '<span style="color:#8a94a8">🙈 숨김</span>' : ''}</td></tr>\`;
    }).join('');
  }

  function renderSigns(d) {
    $('signTitle').textContent = \`\${d.me.name} 싸인판\`;
    const list = d.classSigns;
    const slots = Math.max(15, Math.ceil(list.length / 5) * 5);
    let html = '';
    for (let i = 0; i < slots; i++) {
      const s = list[i];
      if (!s) { html += \`<div class="sign"><span class="n">\${i + 1}</span></div>\`; continue; }
      html += \`<div class="sign on \${s.mvp ? 'mvp' : ''}"><span class="n">\${i + 1}</span>
        <div class="s">\${s.mvp ? '🏅MVP' : '+' + s.score}</div>
        <div>\${esc(s.subject || '수업')}</div><div>\${md(s.date)}\${s.period ? ' ' + esc(s.period) + '교시' : ''}</div></div>\`;
    }
    $('signs').innerHTML = html;
  }

  function renderToday(d) {
    $('tt').innerHTML = d.timetable.length
      ? d.timetable.map((p) => \`<div\${p.excluded ? ' style="opacity:.45"' : ''}><small>\${p.period}교시\${p.excluded ? ' · 제외' : p.start ? ' ' + esc(p.start) : ''}</small><b>\${esc(p.subject)}</b></div>\`).join('')
      : '<p class="muted" style="margin:0">오늘은 수업이 없어요.</p>';
    $('ttMemo').textContent = d.timetableMemo ? '📌 ' + d.timetableMemo : '';

    const q = d.todayQuest;
    const locked = !q.available || q.stamped;
    $('questStatus').innerHTML = !q.available
      ? '<p class="muted">오늘은 캠페인 등교일이 아니라서 퀘스트를 입력할 수 없어요.</p>'
      : q.stamped ? '<div class="stamp-done">🎉 오늘 일퀘 완료! 도장 +1</div>'
      : '<p class="muted" style="margin:0">3가지를 모두 완료하면 도장 +1 (양심에 따라 체크해요!)</p>';

    // 칭찬
    $('qPraise').className = 'quest' + (q.praise.done ? ' done' : '');
    $('qPraiseSt').textContent = q.praise.done ? '완료' : '0/1';
    $('praiseDone').classList.toggle('hidden', !q.praise.done);
    $('praiseDone').innerHTML = q.praise.done ? \`✅ 오늘은 <b class="yellow">\${esc(q.praise.toName)}</b>에게 칭찬했어요!\` : '';
    $('praiseForm').classList.toggle('hidden', q.praise.done || !q.available);
    $('praiseHidden').classList.toggle('hidden', !q.praise.hidden);
    $('praiseHidden').innerHTML = q.praise.hidden ? '🙈 담임 선생님이 칭찬을 숨겼어요. 미션이 취소됩니다.<br>다시 칭찬을 써주세요.' : '';
    $('friendChips').innerHTML = d.friends.map((f) =>
      \`<button class="chip \${S.praiseTo === f.no ? 'on' : ''}" data-friend="\${esc(f.no)}" \${f.praised ? 'disabled' : ''}>\${esc(f.name)}</button>\`).join('');
    updatePraiseCount();

    // 인사
    const g = q.greet;
    $('qGreet').className = 'quest' + (g.done ? ' done' : '');
    $('qGreetSt').textContent = g.done ? '완료' : \`\${g.list.length}/2\`;
    $('greetList').innerHTML = g.list.map((t, i) =>
      \`<span class="greeted">🙇 \${esc(t)} \${locked ? '' : \`<button data-ungreet="\${i}" aria-label="지우기">×</button>\`}</span>\`).join('');
    $('greetForm').classList.toggle('hidden', locked || g.list.length >= 2);
    $('teacherChips').innerHTML = d.teachers.filter((t) => g.list.indexOf(t) < 0)
      .map((t) => \`<button class="chip" data-teacher="\${esc(t)}">\${esc(t)}</button>\`).join('');

    // 졸지 않기
    const z = q.doze;
    $('qDoze').className = 'quest' + (z.done ? ' done' : z.failed ? ' fail' : '');
    $('qDozeSt').textContent = z.done ? '완료' : z.failed ? '실패' : \`\${z.answered}/\${z.periods.length}\`;
    $('dozeHelp').innerHTML = \`교시마다 골라 주세요. 😴 졸았어요가 <b>\${z.allowed}개 이하</b>면 성공! (지금 😴 \${z.dozed}개)\`;
    $('dozeList').innerHTML = z.periods.map((p) => \`<div class="dz">
        <div class="p">\${p.period}교시 <small>\${esc(p.subject)}</small></div>
        <button class="o \${p.val === 'O' ? 'on' : ''}" data-doze="\${p.period}" data-val="O" \${locked ? 'disabled' : ''}>😊 안 졸았어요</button>
        <button class="x \${p.val === 'X' ? 'on' : ''}" data-doze="\${p.period}" data-val="X" \${locked ? 'disabled' : ''}>😴 졸았어요</button>
      </div>\`).join('');
  }

  function updatePraiseCount() {
    const d = S.data;
    if (!d) return;
    const n = $('praiseText').value.replace(/\\s/g, '').length;
    $('praiseCount').textContent = \`\${n}자 / 최소 \${d.praiseMinLength}자\`;
    $('praiseCount').style.color = n >= d.praiseMinLength ? 'var(--green)' : '';
  }

  function options(list, sel, placeholder) {
    return \`<option value="">\${placeholder}</option>\` + list.map((f) => \`<option value="\${esc(f.no)}" \${sel === f.no ? 'selected' : ''}>\${esc(f.name)}</option>\`).join('');
  }

  function renderSpy(d) {
    // 암행어사 임무
    const m = d.spy.mission;
    $('spyBox').classList.toggle('hidden', !m);
    if (m && !$('spyBox').contains(document.activeElement)) {
      const head = \`<h2 class="title-font">🕵️ 암행어사 임무 <span class="secret">나만 보여요 · 비밀!</span></h2>
        <p class="muted" style="margin:0">임기: \${md(m.start)} ~ \${md(m.end)} · 친구들에게 정체를 들키지 않게 조심!</p>\`;
      if (!m.isSchoolDay) $('spyBox').innerHTML = head + '<p>오늘은 등교일이 아니라 판정이 없어요.</p>';
      else if (m.judgedToday) $('spyBox').innerHTML = head + \`<div class="stamp-done">✅ 오늘 판정 완료! (활동 보상 +\${m.reward})</div>\`;
      else {
        const rows = (kind, label, scores) => [0, 1, 2].map((i) => \`<div class="jrow"><span class="rk \${kind}">\${label} \${i + 1}위 <small>(\${scores[i]})</small></span>
          <select data-j="\${kind}\${i}">\${options(d.friends, S.judge[kind + i] || '', kind === 'good' ? '친구 선택 (필수)' : '없음')}</select></div>\`).join('');
        $('spyBox').innerHTML = head + \`<h3>😊 바른 언어 TOP 3</h3>\${rows('good', '바른', ['+5', '+3', '+1'])}
          <h3>🤬 나쁜 언어 TOP 3 <small class="muted">(없으면 비워도 돼요)</small></h3>\${rows('bad', '나쁜', ['−5', '−3', '−1'])}
          <button class="btn yellow block" style="margin-top:12px" id="judgeBtn">판정 제출하기 (활동 보상 +\${m.reward})</button>\`;
        $('judgeBtn').onclick = submitJudge;
        $('spyBox').onchange = (e) => { if (e.target.dataset.j) S.judge[e.target.dataset.j] = e.target.value; };
      }
    }

    // 지목
    const a = d.spy.accuse;
    if (a.used) {
      $('accuseBody').innerHTML = \`<p class="muted" style="margin-top:0">지목 기회: <b>사용함</b> (\${md(a.date)} · \${esc(a.targetName)})</p>\` +
        (a.success
          ? \`<div class="result ok">🎉 검거 성공! 암행어사 활동 보상 \${a.moved}개를 가져왔어요!</div>\`
          : '<div class="result no">아쉽지만 암행어사가 아니었어요.</div>');
    } else if (!$('accuseBody').contains(document.activeElement)) {
      $('accuseBody').innerHTML = \`<p style="margin-top:0">누가 몰래 우리 반 언어를 지켜보고 있을까요? 🕵️<br>
          <b class="yellow">기간 중 딱 1번</b> 지목할 수 있어요. 맞히면 암행어사가 받은 활동 보상 도장을 모두 가져와요!</p>
        <p class="muted">지목 기회: <b class="plus">1번 남음</b> · 틀려도 벌점은 없어요.</p>
        <select id="accuseSel">\${options(d.friends, S.accuseTo, '암행어사라고 생각하는 친구')}</select>
        <button class="btn danger block" style="margin-top:8px" id="accuseBtn">🔍 지목하기</button>\`;
      $('accuseSel').onchange = (e) => (S.accuseTo = e.target.value);
      $('accuseBtn').onclick = submitAccuse;
    }
    $('newsBox').innerHTML = d.spy.news.length
      ? '<h3>📰 검거 소식</h3>' + d.spy.news.map((n) => \`<div class="news">🚨 \${md(n.date)} <b>\${esc(n.accuser)}</b>이(가) 암행어사 <b>\${esc(n.spy)}</b>을(를) 검거! (도장 \${n.moved}개 이동)</div>\`).join('')
      : '';
  }

  function confirmBox(title, html, okText) {
    return new Promise((resolve) => {
      const root = $('modal-root');
      root.innerHTML = \`<div class="modal-bg"><div class="modal"><div class="box"><h2 class="title-font">\${esc(title)}</h2>\${html}
        <div class="row" style="margin-top:14px"><button class="btn ghost" id="m-no">취소</button><button class="btn yellow" id="m-ok">\${esc(okText)}</button></div></div></div></div>\`;
      $('m-no').onclick = () => { root.innerHTML = ''; resolve(false); };
      $('m-ok').onclick = () => { root.innerHTML = ''; resolve(true); };
    });
  }

  async function submitJudge() {
    const pick = (k) => [0, 1, 2].map((i) => document.querySelector(\`[data-j="\${k}\${i}"]\`).value);
    const good = pick('good'), badAll = pick('bad');
    if (good.some((x) => !x)) return toast('바른 언어 1·2·3위를 모두 골라 주세요.', true);
    const bad = badAll.filter(Boolean);
    if (badAll.findIndex((x) => !x) >= 0 && badAll.slice(badAll.findIndex((x) => !x)).some(Boolean)) return toast('나쁜 언어는 1위부터 순서대로 골라 주세요.', true);
    const all = good.concat(bad);
    if (new Set(all).size !== all.length) return toast('한 친구를 두 번 고를 수 없어요.', true);
    const nm = (no) => (S.data.friends.find((f) => f.no === no) || {}).name || no;
    const ok = await confirmBox('오늘 판정 제출', \`<p>😊 \${good.map(nm).map(esc).join(', ')}</p><p>🤬 \${bad.length ? bad.map(nm).map(esc).join(', ') : '없음'}</p><p class="muted">제출하면 바꿀 수 없어요.</p>\`, '제출');
    if (ok && (await act('spyJudge', good, bad))) S.judge = {};
  }

  async function submitAccuse() {
    const no = $('accuseSel').value;
    if (!no) return toast('지목할 친구를 골라 주세요.', true);
    const name = (S.data.friends.find((f) => f.no === no) || {}).name || '';
    const ok = await confirmBox('정말 지목할까요?', \`<p style="font-size:20px;text-align:center"><b class="yellow">\${esc(name)}</b></p><p>지목 기회는 <b>기간 중 1번</b>뿐이에요. 되돌릴 수 없어요!</p>\`, '지목하기');
    if (ok) act('accuseSpy', no);
  }

  function renderRewardGuide(d) {
    const medal = ['🥇', '🥈', '🥉', '🏅', '🏅'];
    $('rewardGuide').innerHTML = d.rewards.map((r, i) => r ? \`<div class="rec"><span class="d" style="width:64px;color:var(--yellow);font-weight:900">\${medal[i] || '🏅'} \${i + 1}위</span><span class="l">\${esc(r)}</span></div>\` : '').join('') +
      \`<div class="rec"><span class="d" style="width:64px;color:var(--sky);font-weight:900">🎟 뽑기</span><span class="l">일퀘 모두 클리어 또는 도장 \${d.draw.threshold}개 이상이면 랜덤 쿠폰 뽑기! (둘 다면 2번, 랭킹 보상과 중복 가능)</span></div>\`;
  }

  function renderInbox(d) {
    $('inbox').innerHTML = d.inbox.length
      ? d.inbox.map((p) => p.hidden ? \`<div class="letter hid">🙈 담임 선생님이 숨긴 칭찬이에요 <span style="font-size:12px">(\${md(p.date)})</span></div>\` : \`<div class="letter">
          <div><span class="from">From. \${esc(p.fromName)}</span> <span class="d">\${md(p.date)}</span></div>
          <div class="txt">\${esc(p.text)}</div>
          <button class="thanks" data-thank="\${esc(p.id)}" \${p.thanked ? 'disabled' : ''}>\${p.thanked ? '💗 고마워 보냄' : '💗 고마워'}</button>
        </div>\`).join('')
      : '<p class="muted">아직 받은 칭찬이 없어요. 먼저 친구를 칭찬해 볼까요?</p>';
  }

  function renderRecords(d) {
    const line = (r) => \`<div class="rec"><span class="d">\${md(r.date)}</span><span class="l">\${esc(r.label)}</span>
      <span class="\${r.score < 0 ? 'minus' : 'plus'}">\${signed(r.score)}</span></div>\`;
    const minus = d.records.filter((r) => r.score < 0);
    $('minusBox').innerHTML = minus.length
      ? \`<h3>차감 내역 (총 \${d.minusTotal})</h3>\${minus.map(line).join('')}\`
      : '<p class="muted">차감된 도장이 없어요. 👍</p>';
    $('records').innerHTML = d.records.length ? d.records.map(line).join('') : '<p class="muted">아직 기록이 없어요.</p>';
  }

  // ---------- 이벤트 ----------
  $('loginBtn').onclick = login;
  $('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') login(); });
  $('refreshBtn').onclick = () => refresh(false);
  $('jump').onclick = (e) => { const a = e.target.closest('[data-to]'); if (a) $(a.dataset.to).scrollIntoView({ behavior: 'smooth', block: 'start' }); };
  $('friendChips').onclick = (e) => {
    const b = e.target.closest('[data-friend]');
    if (!b || b.disabled) return;
    S.praiseTo = b.dataset.friend;
    document.querySelectorAll('#friendChips .chip').forEach((c) => c.classList.toggle('on', c === b));
  };
  $('praiseText').addEventListener('input', updatePraiseCount);
  $('praiseBtn').onclick = async () => {
    const d = S.data, text = $('praiseText').value.trim();
    if (!S.praiseTo) return toast('칭찬할 친구를 골라 주세요.', true);
    if (text.replace(/\\s/g, '').length < d.praiseMinLength) return toast(\`칭찬은 \${d.praiseMinLength}자 이상 써 주세요.\`, true);
    $('praiseBtn').disabled = true;
    if (await act('praiseSubmit', S.praiseTo, text)) { $('praiseText').value = ''; S.praiseTo = ''; }
    $('praiseBtn').disabled = false;
  };
  $('teacherChips').onclick = (e) => { const b = e.target.closest('[data-teacher]'); if (b) act('questGreet', b.dataset.teacher); };
  $('greetBtn').onclick = async () => {
    const v = $('greetInput').value.trim();
    if (!v) return toast('선생님 이름을 입력해 주세요.', true);
    if (await act('questGreet', v)) $('greetInput').value = '';
  };
  $('greetList').onclick = (e) => { const b = e.target.closest('[data-ungreet]'); if (b) act('questUngreet', Number(b.dataset.ungreet)); };
  $('dozeList').onclick = (e) => {
    const b = e.target.closest('[data-doze]');
    if (!b || b.disabled) return;
    const val = b.classList.contains('on') ? '' : b.dataset.val; // 같은 버튼을 다시 누르면 선택 취소
    // 누르자마자 색부터 바꾸고(서버 응답을 기다리지 않음), 저장은 뒤에서 순서대로
    b.parentElement.querySelectorAll('button').forEach((x) => x.classList.remove('on'));
    if (val) b.classList.add('on');
    act('questDoze', Number(b.dataset.doze), val);
  };
  $('inbox').onclick = (e) => { const b = e.target.closest('[data-thank]'); if (b && !b.disabled) act('praiseThank', b.dataset.thank); };
  $('logoutBtn').onclick = logoutLocal;

  setInterval(() => { if (S.token && document.visibilityState === 'visible') refresh(true); }, 30000);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && S.token) refresh(true); });

  $('no').value = load('tutuNo') || '';
  S.token = load('tutuToken');
  if (S.token) refresh(false);
</script>
</body>
</html>
`,
  "Styles": `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Black+Han+Sans&family=Jua&family=Noto+Sans+KR:wght@400;700;900&display=swap" rel="stylesheet">
<style>
  /* 포스터 톤: 검은 배경 + 은색 메탈 프레임 + 파란 네온 + 네이비 박스, 강조 노랑·하늘 */
  :root {
    --bg: #03050a;
    --navy: #13294b;
    --navy-2: #0d1d38;
    --navy-line: #2a4a7c;
    --metal-hi: #f4f6f8;
    --metal-mid: #b9c0c8;
    --metal-lo: #7d8691;
    --ink: #13294b;
    --neon: #2f8bff;
    --sky: #5cc8ff;
    --yellow: #ffd23f;
    --red: #ff6b6b;
    --green: #4ade80;
    --text: #eef3fb;
    --muted: #9fb3d1;
    --cut: 18px;
    --radius: 12px;
    font-size: 16px;
  }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; }
  body {
    min-height: 100vh;
    background:
      radial-gradient(1px 1px at 12% 18%, #ffffff66 50%, transparent 51%),
      radial-gradient(1px 1px at 72% 8%, #ffffff55 50%, transparent 51%),
      radial-gradient(1.5px 1.5px at 42% 62%, #ffffff44 50%, transparent 51%),
      radial-gradient(1px 1px at 88% 44%, #ffffff55 50%, transparent 51%),
      radial-gradient(1px 1px at 22% 82%, #ffffff44 50%, transparent 51%),
      radial-gradient(ellipse at 50% -10%, #0b2a5a 0%, transparent 60%),
      var(--bg);
    color: var(--text);
    font-family: 'Noto Sans KR', 'Apple SD Gothic Neo', 'Malgun Gothic', sans-serif;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
  }
  /* 포스터 양옆의 파란 네온 */
  body::before, body::after {
    content: ''; position: fixed; top: 12%; bottom: 12%; width: 3px; z-index: 0; pointer-events: none;
    background: linear-gradient(transparent, var(--neon) 20%, var(--neon) 30%, transparent 45%, transparent 70%, var(--neon) 82%, transparent);
    box-shadow: 0 0 12px var(--neon), 0 0 28px var(--neon);
    opacity: .75;
  }
  body::before { left: 0; }
  body::after { right: 0; }

  .wrap { position: relative; z-index: 1; max-width: 1100px; margin: 0 auto; padding: 16px 14px 60px; }
  .title-font { font-family: 'Black Han Sans', 'Noto Sans KR', sans-serif; font-weight: 400; letter-spacing: .5px; }

  /* 은색 메탈 프레임 (모서리 깎임) */
  .metal {
    position: relative;
    background: linear-gradient(135deg, var(--metal-hi) 0%, var(--metal-mid) 28%, var(--metal-hi) 48%, var(--metal-lo) 72%, var(--metal-hi) 100%);
    color: var(--ink);
    clip-path: polygon(var(--cut) 0, calc(100% - var(--cut)) 0, 100% var(--cut), 100% calc(100% - var(--cut)), calc(100% - var(--cut)) 100%, var(--cut) 100%, 0 calc(100% - var(--cut)), 0 var(--cut));
    padding: 18px 20px;
  }
  .hero { text-align: center; padding: 22px 18px 18px; }
  .hero h1 { margin: 0; font-size: clamp(26px, 6vw, 44px); line-height: 1.15; color: var(--ink); word-break: keep-all; }
  .hero h1 .line { display: block; }
  .hero .sub { margin-top: 6px; font-weight: 700; color: var(--ink); opacity: .85; font-size: clamp(13px, 3.4vw, 17px); }
  .hero .deco { height: 8px; margin: 10px auto 0; max-width: 520px;
    background: repeating-linear-gradient(135deg, var(--ink) 0 8px, transparent 8px 14px); opacity: .85; }
  .hero .tag { display: inline-block; margin-top: 10px; background: var(--ink); color: var(--sky); padding: 3px 12px; border-radius: 999px; font-size: 13px; font-weight: 700; }

  /* 네이비 박스 (오른쪽 위 모서리 깎임) */
  .box {
    background: linear-gradient(180deg, var(--navy) 0%, var(--navy-2) 100%);
    border: 1px solid var(--navy-line);
    clip-path: polygon(0 0, calc(100% - 26px) 0, 100% 26px, 100% 100%, 0 100%);
    padding: 16px;
    margin-top: 14px;
    box-shadow: inset 0 0 0 1px #ffffff0d;
  }
  .box h2 { margin: 0 0 10px; font-size: 20px; color: var(--sky); }
  .box h3 { margin: 14px 0 8px; font-size: 16px; color: var(--yellow); }
  .neon-line { height: 1px; background: linear-gradient(90deg, transparent, var(--sky), transparent); margin: 12px 0; box-shadow: 0 0 6px var(--sky); }
  .muted { color: var(--muted); font-size: 13px; }
  .yellow { color: var(--yellow); }
  .sky { color: var(--sky); }
  .plus { color: var(--sky); font-weight: 700; }
  .minus { color: var(--red); font-weight: 700; }

  /* 버튼·입력 (모바일 터치용 큰 크기) */
  .btn {
    appearance: none; border: 0; cursor: pointer; font: inherit; font-weight: 700;
    min-height: 46px; padding: 10px 18px; border-radius: 10px;
    background: linear-gradient(180deg, #3a9bff, #1f6fe0); color: #fff;
    box-shadow: 0 0 0 1px #7cc0ff55, 0 0 14px #2f8bff55;
    transition: transform .05s, filter .15s;
  }
  .btn:active { transform: translateY(1px); }
  .btn:disabled { filter: grayscale(.8) brightness(.7); cursor: not-allowed; }
  .btn.yellow { background: linear-gradient(180deg, #ffe066, #f5b800); color: #1a1a1a; box-shadow: 0 0 12px #ffd23f55; }
  .btn.ghost { background: transparent; color: var(--sky); box-shadow: inset 0 0 0 1px var(--sky); }
  .btn.danger { background: transparent; color: var(--red); box-shadow: inset 0 0 0 1px var(--red); }
  .btn.sm { min-height: 34px; padding: 4px 12px; font-size: 14px; border-radius: 8px; }
  .btn.block { width: 100%; }
  input, select, textarea {
    font: inherit; color: var(--text); background: #081427; border: 1px solid var(--navy-line);
    border-radius: 10px; padding: 11px 12px; min-height: 46px; width: 100%;
  }
  input:focus, select:focus, textarea:focus { outline: none; border-color: var(--sky); box-shadow: 0 0 0 2px #5cc8ff33; }
  label { display: block; font-size: 14px; color: var(--muted); margin: 10px 0 4px; }
  .row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
  .row > * { flex: 1 1 auto; }
  .grow { flex: 1 1 200px; }

  /* 칩 (학생 선택 등) */
  .chips { display: flex; flex-wrap: wrap; gap: 8px; }
  .chip {
    appearance: none; font: inherit; cursor: pointer; min-height: 42px; padding: 6px 12px; border-radius: 999px;
    background: #0a1a33; color: var(--text); border: 1px solid var(--navy-line);
  }
  .chip.on { background: var(--sky); color: #04203d; border-color: var(--sky); font-weight: 700; box-shadow: 0 0 10px #5cc8ff88; }

  /* 탭 */
  .tabs { display: flex; gap: 6px; margin-top: 14px; overflow-x: auto; -webkit-overflow-scrolling: touch; }
  .tab {
    appearance: none; font: inherit; cursor: pointer; white-space: nowrap; min-height: 44px; padding: 8px 16px;
    background: #0a1a33; color: var(--muted); border: 1px solid var(--navy-line); border-radius: 10px 10px 0 0; font-weight: 700;
  }
  .tab.on { background: var(--navy); color: var(--yellow); border-color: var(--sky); box-shadow: 0 -2px 10px #2f8bff44; }

  /* 표 */
  .table-wrap { overflow-x: auto; -webkit-overflow-scrolling: touch; }
  table { width: 100%; border-collapse: collapse; font-size: 14px; }
  th, td { padding: 8px 8px; border-bottom: 1px solid #ffffff14; text-align: center; white-space: nowrap; }
  th { color: var(--sky); font-weight: 700; position: sticky; top: 0; background: var(--navy); }
  td.left, th.left { text-align: left; }
  tr.cancelled td { color: #6f7f99; text-decoration: line-through; }
  .medal { display: inline-block; min-width: 28px; font-weight: 900; }

  /* 카드 */
  .cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 10px; }
  .card { background: #0a1a33; border: 1px solid var(--navy-line); border-radius: 10px; padding: 12px; }
  .card .k { font-size: 12px; color: var(--muted); }
  .card .v { font-size: 22px; font-weight: 900; color: var(--yellow); }

  .warn { background: #3a1d0a; border: 1px solid #ff9f43; color: #ffd8a8; border-radius: 10px; padding: 10px 12px; margin-top: 10px; font-size: 14px; }
  .pill { display: inline-block; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 700; }
  .pill.on { background: var(--yellow); color: #1a1a1a; }
  .pill.off { background: #20314f; color: var(--muted); }

  /* 토스트 / 모달 / 로딩 */
  #toast { position: fixed; left: 50%; bottom: 24px; transform: translateX(-50%); z-index: 50; max-width: 92vw;
    background: #0a1a33; color: var(--text); border: 1px solid var(--sky); border-radius: 12px; padding: 12px 18px;
    box-shadow: 0 0 20px #2f8bff66; display: none; font-weight: 700; }
  #toast.err { border-color: var(--red); box-shadow: 0 0 20px #ff6b6b66; }
  .modal-bg { position: fixed; inset: 0; z-index: 40; background: #000000b0; display: flex; align-items: center; justify-content: center; padding: 16px; }
  .modal { width: 100%; max-width: 420px; }
  .modal .box { margin: 0; }
  #loading { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 60; display: none;
    background: linear-gradient(90deg, transparent, var(--sky), transparent); background-size: 50% 100%;
    animation: scan 1s linear infinite; box-shadow: 0 0 8px var(--sky); }
  @keyframes scan { from { background-position: -50% 0; } to { background-position: 150% 0; } }
  .hidden { display: none !important; }
</style>
`,
  "Teacher": `<!DOCTYPE html>
<html lang="ko">
<head>
  <base target="_top">
  <meta charset="utf-8">
  <?!= include('Styles') ?>
  <style>
    .wrap { max-width: 980px; }
    .hero h1 { font-size: clamp(22px, 4vw, 34px); }
    .big-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
    .tbtn {
      appearance: none; font: inherit; cursor: pointer; min-height: 64px; border-radius: 14px; padding: 10px;
      background: #0a1a33; color: var(--text); border: 1px solid var(--navy-line); font-weight: 700; font-size: 18px;
    }
    .tbtn small { display: block; color: var(--muted); font-weight: 500; font-size: 13px; }
    .tbtn.on { background: var(--sky); color: #04203d; border-color: var(--sky); box-shadow: 0 0 14px #5cc8ff88; }
    .tbtn.on small { color: #04203d; }
    .pgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(110px, 1fr)); gap: 8px; }
    .pgrid .tbtn { min-height: 70px; font-size: 20px; }
    .now-tag { display: inline-block; font-size: 11px; background: var(--yellow); color: #1a1a1a; border-radius: 999px; padding: 0 6px; margin-left: 4px; vertical-align: middle; }

    .classbar { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
    .classbar .who { flex: 1 1 260px; font-size: 20px; font-weight: 900; }
    .classbar .who span { color: var(--yellow); }
    .mvpline { margin-top: 8px; font-weight: 700; }

    .sgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(118px, 1fr)); gap: 10px; }
    .sbtn {
      position: relative; appearance: none; font: inherit; cursor: pointer; min-height: 76px; border-radius: 16px;
      background: #f2f5fb; color: #13294b; border: 0; font-weight: 900; font-size: 20px; padding: 8px 6px;
      box-shadow: 0 3px 0 #9fb3d1;
    }
    .sbtn:active { transform: translateY(2px); box-shadow: 0 1px 0 #9fb3d1; }
    .sbtn .no { display: block; font-size: 12px; color: #6b7a99; font-weight: 700; }
    .sbtn.low { background: #fff8d9; box-shadow: 0 3px 0 #e6c95a, 0 0 0 2px #ffe58a; }
    .sbtn .badges { position: absolute; top: 4px; right: 6px; font-size: 13px; }
    .sbtn .got { position: absolute; top: 4px; left: 6px; font-size: 12px; color: #1a9b4b; font-weight: 900; }
    .legend { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 10px; font-size: 13px; color: var(--muted); }
    .legend i { display: inline-block; width: 14px; height: 14px; border-radius: 4px; vertical-align: -2px; margin-right: 4px; }

    .pick { display: grid; gap: 10px; margin-top: 12px; }
    .pick .btn { min-height: 64px; font-size: 20px; }
    .log { display: flex; align-items: center; gap: 8px; padding: 8px 0; border-bottom: 1px solid #ffffff12; }
    .log .t { color: var(--muted); width: 48px; }
    .log .n { flex: 1; font-weight: 700; }

    #undoBar { position: fixed; left: 50%; bottom: 20px; transform: translateX(-50%); z-index: 55; display: none; align-items: center; gap: 14px;
      background: #0a1a33; border: 1px solid var(--yellow); border-radius: 14px; padding: 10px 12px 10px 18px; box-shadow: 0 0 22px #ffd23f55; font-weight: 700; max-width: 94vw; }
  </style>
</head>
<body>
<div id="loading"></div>
<div class="wrap">
  <div class="metal hero">
    <h1 class="title-font"><?!= titleHtml ?></h1>
    <div class="tag">MISSION3 · 수업 듣고 도장 얻자!</div>
  </div>

  <!-- 1) 태블릿 잠금 해제 (처음 한 번) -->
  <section id="unlock" class="box hidden" style="max-width:440px;margin:14px auto 0">
    <h2 class="title-font">🔐 교과 선생님 화면 열기</h2>
    <p class="muted">처음 한 번만 입력하면 이 기기가 기억해요.</p>
    <label for="code">교과 선생님 공통 코드</label>
    <input id="code" type="password" inputmode="numeric" autocomplete="off">
    <button class="btn yellow block" style="margin-top:12px" id="unlockBtn">열기</button>
  </section>

  <!-- 2) 선생님 + 교시 선택 -->
  <section id="start" class="hidden">
    <div class="box">
      <h2 class="title-font">🧑‍🏫 선생님을 선택해 주세요</h2>
      <div class="big-grid" id="teacherGrid"></div>
      <div id="teacherFree" class="hidden" style="margin-top:10px">
        <p class="muted">설정 시트의 "교과 선생님 목록"이 비어 있어요. 이름을 직접 입력해 주세요.</p>
        <input id="teacherInput" type="text" maxlength="20" placeholder="선생님 이름">
      </div>
    </div>
    <div class="box">
      <h2 class="title-font">⏰ 교시 <span class="muted" id="nowText" style="font-size:14px"></span></h2>
      <div class="pgrid" id="periodGrid"></div>
      <div id="dayNote" class="warn hidden"></div>
      <button class="btn yellow block" style="margin-top:14px;min-height:60px;font-size:20px" id="startBtn">확인</button>
    </div>
  </section>

  <!-- 3) 수업 중: 투투 선택 -->
  <section id="class" class="hidden">
    <div class="box">
      <div class="classbar">
        <div class="who" id="who"></div>
        <button class="btn sm ghost" id="reloadBtn">새로고침</button>
        <button class="btn danger" id="endBtn">수업 끝</button>
      </div>
      <div class="mvpline" id="mvpLine"></div>
    </div>
    <div class="box">
      <h2 class="title-font" id="gridTitle"></h2>
      <div class="sgrid" id="studentGrid"></div>
      <div class="legend">
        <span><b style="color:#1a9b4b">✓</b> 오늘 수업 도장 받음</span>
        <span><i style="background:#fff8d9;box-shadow:0 0 0 2px #ffe58a"></i>최근 수업 도장이 적은 친구</span>
        <span>➕ 이번 교시 +2 · 🏅 이번 교시 MVP</span>
      </div>
    </div>
    <div class="box">
      <h2 class="title-font">📝 이번 교시 기록</h2>
      <div id="logList"></div>
    </div>
  </section>
</div>

<div id="undoBar"><span id="undoText"></span><button class="btn sm yellow" id="undoBtn">되돌리기</button></div>
<div id="toast"></div>
<div id="modal-root"></div>

<script>
  const S = { token: null, init: null, teacher: '', period: null, data: null, lastId: null, idleTimer: null, undoTimer: null };
  const $ = (id) => document.getElementById(id);
  const IDLE_MS = 5 * 60 * 1000;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  }
  function store(k, v) { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch (e) {} }
  function load(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }

  let toastTimer = null;
  function toast(msg, isErr) {
    const t = $('toast');
    t.textContent = msg; t.className = isErr ? 'err' : ''; t.style.display = 'block';
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => (t.style.display = 'none'), 2800);
  }

  function call(fn, ...args) {
    $('loading').style.display = 'block';
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler((r) => { $('loading').style.display = 'none'; resolve(r); })
        .withFailureHandler((err) => {
          $('loading').style.display = 'none';
          let msg = (err && err.message) || String(err);
          if (msg.indexOf('AUTH:') >= 0) { lockDevice(); msg = msg.replace(/^.*AUTH:\\s*/, ''); }
          reject(new Error(msg.replace(/^(Error|Exception):\\s*/, '')));
        })[fn](...args);
    });
  }

  function show(id) { ['unlock', 'start', 'class'].forEach((x) => $(x).classList.toggle('hidden', x !== id)); window.scrollTo(0, 0); }

  // ---------- 잠금 해제 ----------
  function lockDevice() { S.token = null; store('teacherToken', null); show('unlock'); }
  async function unlock() {
    const code = $('code').value.trim();
    if (!code) return toast('코드를 입력해 주세요.', true);
    try {
      const r = await call('teacherUnlock', code);
      S.token = r.token; store('teacherToken', r.token); $('code').value = '';
      await goStart();
    } catch (e) { toast(e.message, true); }
  }

  // ---------- 선생님·교시 선택 ----------
  async function goStart() {
    hideUndo();
    try { S.init = await call('teacherInit', S.token); } catch (e) { return toast(e.message, true); }
    const d = S.init;
    S.period = d.suggestedPeriod || S.period || (d.periods.find((p) => !p.excluded) || { period: 1 }).period;
    if ((d.periods.find((p) => p.period === S.period) || {}).excluded) S.period = (d.periods.find((p) => !p.excluded) || { period: 1 }).period;
    if (!S.teacher) S.teacher = load('lastTeacher') || '';
    if (d.teachers.length && !d.teachers.some((t) => t.name === S.teacher)) S.teacher = '';
    renderStart();
    show('start');
  }

  function renderStart() {
    const d = S.init;
    $('teacherGrid').innerHTML = d.teachers.map((t) =>
      \`<button class="tbtn \${S.teacher === t.name ? 'on' : ''}" data-teacher="\${esc(t.name)}">\${esc(t.name)}<small>\${esc(t.subject)}</small></button>\`).join('');
    $('teacherFree').classList.toggle('hidden', d.teachers.length > 0);
    $('nowText').textContent = \`지금 \${d.now}\${d.suggestedPeriod ? \` → \${d.suggestedPeriod}교시 자동 선택\` : ''}\`;
    $('periodGrid').innerHTML = d.periods.map((p) =>
      \`<button class="tbtn \${S.period === p.period ? 'on' : ''}" data-period="\${p.period}" \${p.excluded ? 'disabled style="opacity:.35;cursor:not-allowed"' : ''}>\${p.period}교시\${d.suggestedPeriod === p.period ? '<span class="now-tag">지금</span>' : ''}
        <small>\${esc(p.subject || '-')}\${p.excluded ? ' · 제외' : p.start ? ' · ' + esc(p.start) : ''}</small></button>\`).join('');
    $('dayNote').classList.toggle('hidden', d.isSchoolDay);
    $('dayNote').textContent = d.isSchoolDay ? '' : '오늘은 캠페인 등교일이 아니라서 도장을 줄 수 없어요.';
  }

  async function startClass() {
    const name = S.init.teachers.length ? S.teacher : $('teacherInput').value.trim();
    if (!name) return toast('선생님을 선택해 주세요.', true);
    if (!S.period) return toast('교시를 선택해 주세요.', true);
    try {
      S.data = await call('teacherSession', S.token, name, S.period);
      S.teacher = name; store('lastTeacher', name);
      renderClass(); show('class'); bumpIdle();
    } catch (e) { toast(e.message, true); }
  }

  // ---------- 수업 중 ----------
  function renderClass() {
    const d = S.data;
    $('who').innerHTML = \`🧑‍🏫 \${esc(d.teacher)} 선생님 · <span>\${d.period}교시</span> \${esc(d.subject)}\`;
    $('mvpLine').innerHTML = d.mvp
      ? \`🏅 오늘 \${d.period}교시 MVP: <b class="yellow">\${esc(d.mvp.name)}</b>\`
      : \`<span class="muted">🏅 오늘 \${d.period}교시 MVP를 아직 뽑지 않았어요.</span>\`;
    $('gridTitle').textContent = \`\${d.nickname} 이름을 눌러 도장을 주세요\`;
    $('studentGrid').innerHTML = d.students.map((s) => \`<button class="sbtn \${s.low ? 'low' : ''}" data-no="\${esc(s.no)}">
        \${s.todayGot ? '<span class="got">✓</span>' : ''}<span class="badges">\${s.classDone ? '➕' : ''}\${s.isMvp ? '🏅' : ''}</span>
        <span class="no">\${esc(s.no)}번</span>\${esc(s.name)}</button>\`).join('');
    $('logList').innerHTML = d.log.length ? d.log.map((r) => \`<div class="log">
        <span class="t">\${esc(r.ts)}</span><span class="n">\${esc(r.name)} \${r.mission === 'MVP' ? '🏅 MVP +3' : '➕ 적극 참여 +2'}</span>
        <span class="muted" style="font-size:13px">\${esc(r.by)}</span>
        <button class="btn sm danger" data-undo="\${esc(r.id)}">되돌리기</button></div>\`).join('')
      : '<p class="muted">아직 기록이 없어요.</p>';
  }

  function pickStudent(no) {
    const d = S.data;
    const s = d.students.find((x) => x.no === no);
    if (!s) return;
    const root = $('modal-root');
    root.innerHTML = \`<div class="modal-bg"><div class="modal"><div class="box">
        <h2 class="title-font" style="text-align:center;font-size:28px">\${esc(s.name)}</h2>
        <div class="pick">
          <button class="btn" data-kind="class" \${s.classDone ? 'disabled' : ''}>➕ 적극 참여 +2\${s.classDone ? ' (이번 교시 받음)' : ''}</button>
          <button class="btn yellow" data-kind="mvp" \${d.mvp ? 'disabled' : ''}>🏅 MVP +3\${d.mvp ? \` (MVP: \${esc(d.mvp.name)})\` : ''}</button>
          <button class="btn ghost" data-kind="">닫기</button>
        </div></div></div></div>\`;
    root.querySelector('.pick').onclick = async (e) => {
      const b = e.target.closest('[data-kind]');
      if (!b || b.disabled) return;
      root.innerHTML = '';
      if (b.dataset.kind) await stamp(no, b.dataset.kind, s.name);
    };
  }

  async function stamp(no, kind, name) {
    try {
      S.data = await call('teacherStamp', S.token, S.teacher, S.period, no, kind);
      renderClass();
      showUndo(\`\${name} \${kind === 'mvp' ? '🏅 MVP +3' : '➕ +2'} 완료!\`, S.data.lastId);
    } catch (e) { toast(e.message, true); }
  }

  async function undo(id) {
    try {
      S.data = await call('teacherUndo', S.token, S.teacher, S.period, id);
      renderClass(); hideUndo(); toast('되돌렸어요.');
    } catch (e) { toast(e.message, true); }
  }

  function showUndo(text, id) {
    $('undoText').textContent = text;
    $('undoBtn').onclick = () => undo(id);
    $('undoBar').style.display = 'flex';
    clearTimeout(S.undoTimer);
    S.undoTimer = setTimeout(hideUndo, 8000);
  }
  function hideUndo() { $('undoBar').style.display = 'none'; clearTimeout(S.undoTimer); }

  // 5분 동안 아무 입력이 없으면 첫 화면으로
  function bumpIdle() {
    clearTimeout(S.idleTimer);
    S.idleTimer = setTimeout(() => { if (!$('class').classList.contains('hidden')) { $('modal-root').innerHTML = ''; goStart(); } }, IDLE_MS);
  }

  // ---------- 이벤트 ----------
  $('unlockBtn').onclick = unlock;
  $('code').addEventListener('keydown', (e) => { if (e.key === 'Enter') unlock(); });
  $('teacherGrid').onclick = (e) => { const b = e.target.closest('[data-teacher]'); if (b) { S.teacher = b.dataset.teacher; renderStart(); } };
  $('periodGrid').onclick = (e) => { const b = e.target.closest('[data-period]'); if (b && !b.disabled) { S.period = Number(b.dataset.period); renderStart(); } };
  $('startBtn').onclick = startClass;
  $('studentGrid').onclick = (e) => { const b = e.target.closest('[data-no]'); if (b) pickStudent(b.dataset.no); };
  $('logList').onclick = (e) => { const b = e.target.closest('[data-undo]'); if (b) undo(b.dataset.undo); };
  $('endBtn').onclick = () => { S.data = null; goStart(); };
  $('reloadBtn').onclick = async () => {
    try { S.data = await call('teacherSession', S.token, S.teacher, S.period); renderClass(); } catch (e) { toast(e.message, true); }
  };
  ['click', 'touchstart'].forEach((ev) => document.addEventListener(ev, bumpIdle, { passive: true }));

  S.token = load('teacherToken');
  if (S.token) goStart(); else show('unlock');
</script>
</body>
</html>
`,
};
