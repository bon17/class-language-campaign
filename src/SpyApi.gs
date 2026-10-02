/**
 * 미션2: 욕설 암행어사를 찾아라!
 * - 담임이 비밀리에 암행어사 지정(임기 1주). 정체는 본인 화면에만 내려보낸다.
 * - 암행어사 일일 판정(하루 1회): 바른 1·2·3위 +5/+3/+1, 나쁜 1·2·3위 −5/−3/−1, 제출 시 활동 보상 +3
 *   → 바로 기록장에 넣지 않고 '정산 대기'. 담임이 [정산하기]를 누르면 그때 한꺼번에 도장이 들어간다
 *     (다른 투투가 도장판 변화를 보고 암행어사를 눈치채지 못하게)
 * - 지목(기간 중 1회): 현 암행어사를 맞히면 그 암행어사가 "암행어사 활동 보상"으로 받은 도장 전부를 가져온다
 *   (기록장에 −/+ 두 줄), 암행어사는 즉시 직위 상실 → 담임에게 "새 암행어사 지정 필요"
 * - 실패하면 기회만 소진. 결과는 본인에게만 (설정 "지목 결과 공개" ON이면 검거 소식 공개)
 */

const SPY_HEADERS = ['주차', '학생번호', '시작일', '종료일', '상태', '변경시각'];
const SPY_JUDGE_HEADERS = ['날짜', '암행어사번호', '바른1위', '바른2위', '바른3위', '나쁜1위', '나쁜2위', '나쁜3위', '타임스탬프', '정산여부', '정산시각', '활동보상처리'];
const JC = { SETTLED: 10, SETTLED_AT: 11, REWARD: 12 }; // 1부터 센 열 번호
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
  return dataRows_(sh, SPY_JUDGE_HEADERS.length).map((r, i) => ({
    row: i + 2,
    date: toDateStr_(r[0]),
    spy: String(r[1]).trim(),
    good: [r[2], r[3], r[4]].map((x) => String(x).trim()).filter(Boolean),
    bad: [r[5], r[6], r[7]].map((x) => String(x).trim()).filter(Boolean),
    settled: bool_(r[JC.SETTLED - 1]),
    reward: String(r[JC.REWARD - 1]).trim(), // '' 대기 / '지급' / '이전됨'(검거로 지목한 투투에게 이미 줌)
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
  const judges = readJudges_();
  const pendingReward = {};
  judges.forEach((j) => { if (!j.settled && j.reward !== '이전됨') pendingReward[j.spy] = (pendingReward[j.spy] || 0) + SPY_REWARD; });
  const data = { spies: readSpies_(), judgedDates: judges.map((j) => j.date), accuses: readAccuses_(), pendingReward };
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
      pendingReward: (d.pendingReward || {})[me.no] || 0,
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
    // 도장은 아직 넣지 않는다 (정산 대기)
    const row = [today, me.no, g[0], g[1], g[2], b[0] || '', b[1] || '', b[2] || '', new Date(), false, '', ''];
    sh.getRange(sh.getLastRow() + 1, 1, 1, SPY_JUDGE_HEADERS.length).setValues([row]);
    invalidateStats_();
  });
  const home = buildStudentHome_(me);
  home.notice = `🕵️ 오늘 판정 제출 완료! 활동 보상 +${SPY_REWARD}은 선생님이 정산할 때 들어와요`;
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
      // 이미 정산된 활동 보상(기록장) + 아직 정산 대기 중인 활동 보상을 모두 옮긴다
      const settled = readLedger_()
        .filter((r) => !r.cancelled && r.no === to && r.mission === '암행어사활동')
        .reduce((sum, r) => sum + r.score, 0);
      const pending = readJudges_().filter((j) => j.spy === to && !j.settled && j.reward !== '이전됨');
      moved = settled + pending.length * SPY_REWARD;
      const recs = [];
      if (settled > 0) recs.push({ date: today, no: to, mission: '검거이전', score: -settled, inputType: '시스템', inputBy: '자동', memo: `검거됨 → ${me.no}번에게 활동 보상 이전` });
      if (moved > 0) recs.push({ date: today, no: me.no, mission: '검거이전', score: moved, inputType: '시스템', inputBy: '자동', memo: `${to}번 암행어사 검거 성공` });
      if (recs.length) appendRecords_(recs);
      // 정산 대기 중이던 활동 보상은 지목한 투투에게 이미 줬으므로, 정산 때 암행어사에게 다시 주지 않는다
      const jsh = sheet_(SHEETS.SPY_JUDGE);
      pending.forEach((j) => jsh.getRange(j.row, JC.REWARD).setValue('이전됨'));
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

/**
 * 정산: 정산 대기 중인 판정을 모두 기록장 도장으로 바꾼다 (판정한 날짜로 기록).
 * 예전 방식(제출 즉시 기록)으로 이미 기록장에 들어간 판정은 다시 넣지 않고 정산 표시만 한다.
 */
function adminSettleSpy(token) {
  requireAdmin_(token);
  let count = 0;
  withLock_(() => {
    ensureSchema_();
    const pending = readJudges_().filter((j) => !j.settled);
    if (!pending.length) throw new Error('정산할 판정이 없어요.');
    const ledger = readLedger_();
    const sh = sheet_(SHEETS.SPY_JUDGE);
    const recs = [];
    const now = new Date();
    pending.forEach((j) => {
      const already = ledger.some((r) => r.mission === '암행어사판정' && r.date === j.date && r.inputBy === j.spy);
      let reward = j.reward;
      if (!already) {
        j.good.forEach((no, i) => recs.push({ date: j.date, no, mission: '암행어사판정', score: GOOD_SCORES[i], inputType: '암행어사', inputBy: j.spy, memo: `바른 언어 ${i + 1}위 (정산)` }));
        j.bad.forEach((no, i) => recs.push({ date: j.date, no, mission: '암행어사판정', score: BAD_SCORES[i], inputType: '암행어사', inputBy: j.spy, memo: `나쁜 언어 ${i + 1}위 (정산)` }));
        if (reward !== '이전됨') {
          recs.push({ date: j.date, no: j.spy, mission: '암행어사활동', score: SPY_REWARD, inputType: '시스템', inputBy: '자동', memo: '판정 제출 보상 (정산)' });
          reward = '지급';
        }
      }
      sh.getRange(j.row, JC.SETTLED, 1, 3).setValues([[true, now, reward || '지급']]);
      count++;
    });
    if (recs.length) appendRecords_(recs);
    invalidateStats_();
  });
  const d = buildAdminDashboard_();
  d.notice = `판정 ${count}건을 정산했어요.`;
  return d;
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
    judges: readJudges_().reverse().map((j) => ({ date: j.date, spy: nm(j.spy), good: j.good.map(nm), bad: j.bad.map(nm), settled: j.settled })),
    pendingCount: readJudges_().filter((j) => !j.settled).length,
    accuses: readAccuses_().reverse().map((a) => ({ ts: a.ts, from: nm(a.from), to: nm(a.to), result: a.result, moved: a.moved })),
    accusedCount: readAccuses_().length,
  };
}
