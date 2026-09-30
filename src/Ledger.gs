/**
 * 기록장: 모든 도장 적립·차감의 유일한 원본.
 * - 쓰기는 반드시 withLock_ 안에서 appendRecords_ / cancelRecord_ 로만 한다.
 * - 합계·랭킹은 기록장에서 계산하고 CacheService에 보관, 쓰기가 일어나면 무효화한다.
 */

const LEDGER_HEADERS = ['타임스탬프', '날짜', '학생번호', '미션구분', '점수', '입력자유형', '입력자', '교시', '과목', '메모', '취소여부', '기록ID', '취소사유'];
const LC = LEDGER_HEADERS.reduce((m, h, i) => ((m[h] = i), m), {});

const MISSIONS = ['일퀘', '암행어사판정', '암행어사활동', '수업참여', 'MVP', '단체', '검거이전', '수동'];
const INPUT_TYPES = ['학생', '암행어사', '교과', '담임', '시스템'];

const STUDENT_HEADERS = ['번호', '이름', '로그인코드', '모둠'];

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
      group: String(r[3]).trim(),
    }))
    .filter((s) => s.no && s.name)
    .sort((a, b) => Number(a.no) - Number(b.no) || a.no.localeCompare(b.no));
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

// ---------- 합계·랭킹 ----------

function invalidateStats_() {
  CacheService.getScriptCache().remove(CACHE_KEYS.STATS);
}

/** 캐시된 전체 통계 (로그인 코드·입력자 등 민감정보 없음) */
function getStats_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get(CACHE_KEYS.STATS);
  if (hit) return JSON.parse(hit);
  const stats = computeStats_(readStudents_(), readLedger_());
  cache.put(CACHE_KEYS.STATS, JSON.stringify(stats), 300);
  return stats;
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
    return (map[s.no] = { no: s.no, name: s.name, group: s.group, total: 0, plus: 0, minus: 0, byMission, rank: 0 });
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
