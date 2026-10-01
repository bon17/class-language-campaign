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

  const t = HtmlService.createTemplate(htmlSource_(file || 'ComingSoon'));
  t.campaignName = cfg.campaignName;
  t.subtitle = cfg.subtitle;
  t.nickname = cfg.nickname;
  return t.evaluate()
    .setTitle(cfg.campaignName)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover');
}

/** HTML 템플릿에서 공통 조각 포함: <?!= include('Styles') ?> */
function include(name) {
  return htmlSource_(name);
}

/**
 * HTML 원본. 한 파일 묶음(dist/Code.gs)에서는 HTML_SOURCES에 들어 있고,
 * src/ 여러 파일로 올린 경우에는 같은 이름의 HTML 파일에서 읽는다.
 */
function htmlSource_(name) {
  if (typeof HTML_SOURCES !== 'undefined' && HTML_SOURCES[name]) return HTML_SOURCES[name];
  return HtmlService.createHtmlOutputFromFile(name).getContent();
}
