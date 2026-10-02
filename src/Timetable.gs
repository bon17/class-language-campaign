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
  const cache = cache_();
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
