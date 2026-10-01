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
  }));

  // 연속 달성: 오늘 아직 안 했으면 어제부터 거꾸로 센다
  let streak = 0;
  const past = cfg.schoolDays.filter((d) => d <= today);
  for (let i = past.length - 1; i >= 0; i--) {
    if (questSet.has(past[i])) streak++;
    else if (past[i] === today) continue;
    else break;
  }

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
    serverTime: Utilities.formatDate(new Date(), TZ, 'HH:mm:ss'),
  };
}
