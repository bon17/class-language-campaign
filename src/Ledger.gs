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
