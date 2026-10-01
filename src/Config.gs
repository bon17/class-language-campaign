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
