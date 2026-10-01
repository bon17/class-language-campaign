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
    const all = readPraise_();
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
    if (!p || p.to !== me.no || p.hidden) throw new Error('칭찬을 찾을 수 없어요.');
    if (p.thanked) return;
    sheet_(SHEETS.PRAISE).getRange(p.row, 7).setValue(true);
    invalidateStats_();
  });
  return buildStudentHome_(me);
}

function withNotice_(home, stamped, msg) {
  home.notice = stamped ? '🎉 일퀘 3가지 완료! 도장 +1' : msg || '';
  return home;
}
