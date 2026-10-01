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
      return { period: i + 1, subject: p ? p.subject : '', start: p ? p.start : '' };
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
