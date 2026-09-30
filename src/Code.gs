/**
 * 웹앱 진입점.
 *   (기본)          투투 화면        — 2단계에서 추가
 *   ?page=teacher   교과 선생님 화면  — 4단계에서 추가
 *   ?page=admin     담임 대시보드
 */
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) || '';
  const cfg = getConfig();
  const files = { admin: 'Admin' };
  const file = files[page];

  let output;
  if (file) {
    const t = HtmlService.createTemplateFromFile(file);
    t.campaignName = cfg.campaignName;
    t.subtitle = cfg.subtitle;
    t.nickname = cfg.nickname;
    output = t.evaluate();
  } else {
    const t = HtmlService.createTemplateFromFile('ComingSoon');
    t.campaignName = cfg.campaignName;
    t.subtitle = cfg.subtitle;
    output = t.evaluate();
  }
  return output
    .setTitle(cfg.campaignName)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** HTML 템플릿에서 공통 조각 포함: <?!= include('Styles') ?> */
function include(name) {
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
