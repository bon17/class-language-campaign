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
  const sh = ss_().getSheetByName(SHEETS.DRAW);
  const out = {};
  if (!sh || sh.getLastRow() < 2) return out;
  sh.getRange(2, 1, sh.getLastRow() - 1, DRAW_HEADERS.length).getValues().forEach((r) => {
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
