(function (root) {
  'use strict';

  var STRINGS = {
    ko: {
      title: '드래그 넘버',
      tagline: '숫자를 드래그로 묶어 목표 숫자를 만들면 팡!',
      language: '언어', theme: '테마', rules: '규칙', settings: '설정',
      start: '시작', best: '최고기록', sec: '초', score: '점수', pause: '일시정지', paused: '일시정지',
      resume: '계속하기', quit: '그만하기', points: '점',
      retry: '다시하기', share: '결과 공유', home: '처음으로',
      target: '목표',
      ruleCard: '숫자들을 <b>드래그</b>로 네모나게 묶어<br>합이 위의 <b>목표 숫자</b>가 되면 팡!',
      rulesTitle: '규칙',
      rulesBody:
        '<li>보드 위를 <b>드래그</b>해서 네모 영역을 그리세요.</li>' +
        '<li>영역 안 숫자의 합이 화면 위 <b>목표 숫자</b>와 같으면 모두 터져요. 숫자는 2개 이상 묶어야 해요.</li>' +
        '<li>드래그하는 동안 영역 모서리에 지금 합이 보여요. 딱 맞으면 초록색!</li>' +
        '<li>터질 때마다 목표가 바뀌어요. 다음 목표 두 개가 미리 보여요.</li>' +
        '<li>남은 숫자로 만들 수 없는 목표는 알림과 함께 가능한 숫자로 바뀌어요.</li>' +
        '<li>지운 칸 하나에 1점.</li>' +
        '<li>판을 모두 비우면 <b>퍼펙트!</b> 새 보드가 나와요.</li>' +
        '<li class="keys">PC: 마우스 드래그 · Esc 일시정지</li>',
      ok: '확인', sound: '효과음', volume: '볼륨',
      newBoard: '새 보드!',
      noCombo: '만들 수 있는 조합이 없어서 목표를 바꿨어요',
      shareText: '드래그 넘버 {score}점!', saved: '결과 이미지를 저장했어요'
    },
    en: {
      title: 'Drag Number',
      tagline: 'Drag a box around numbers that add up to the target — pop!',
      language: 'Language', theme: 'Theme', rules: 'Rules', settings: 'Settings',
      start: 'Start', best: 'Best', sec: 's', score: 'Score', pause: 'Pause', paused: 'Paused',
      resume: 'Resume', quit: 'Quit', points: 'pts',
      retry: 'Play again', share: 'Share', home: 'Home',
      target: 'Target',
      ruleCard: '<b>Drag</b> a box around numbers<br>that add up to the <b>target</b> — pop!',
      rulesTitle: 'How to play',
      rulesBody:
        '<li><b>Drag</b> on the board to draw a box.</li>' +
        '<li>If the numbers inside add up to the <b>target</b> at the top, they all pop. Take at least 2 numbers.</li>' +
        '<li>The running sum shows on the box corner while you drag. Green means it matches!</li>' +
        '<li>The target changes after every pop. The next two are shown in advance.</li>' +
        '<li>If the remaining numbers can no longer make a target, you\'ll see a notice and it changes to one that can be made.</li>' +
        '<li>1 point per cleared cell.</li>' +
        '<li>Clear the whole board for a <b>PERFECT!</b> and a fresh board.</li>' +
        '<li class="keys">PC: mouse drag · Esc pause</li>',
      ok: 'OK', sound: 'Sound effects', volume: 'Volume',
      newBoard: 'New board!',
      noCombo: 'No combination left — target changed',
      shareText: 'Drag Number: {score} pts!', saved: 'Result image saved'
    },
    zh: {
      title: '拖拽数字',
      tagline: '拖动框选数字，凑出目标数字就消除！',
      language: '语言', theme: '主题', rules: '规则', settings: '设置',
      start: '开始', best: '最高纪录', sec: '秒', score: '得分', pause: '暂停', paused: '已暂停',
      resume: '继续', quit: '退出', points: '分',
      retry: '再来一局', share: '分享结果', home: '返回首页',
      target: '目标',
      ruleCard: '<b>拖动</b>框选数字<br>和等于<b>目标数字</b>就消除！',
      rulesTitle: '规则',
      rulesBody:
        '<li>在棋盘上<b>拖动</b>画出矩形框。</li>' +
        '<li>框内数字之和等于上方<b>目标数字</b>时全部消除。至少要框选 2 个数字。</li>' +
        '<li>拖动时框的角上会显示当前的和，变绿就是对了！</li>' +
        '<li>每次消除后目标都会改变，可以提前看到接下来的两个目标。</li>' +
        '<li>剩下的数字凑不出的目标会提示并换成能凑出的数字。</li>' +
        '<li>每消除一格得 1 分。</li>' +
        '<li>清空整个棋盘即 <b>完美！</b> 并换新棋盘。</li>' +
        '<li class="keys">电脑：鼠标拖动 · Esc 暂停</li>',
      ok: '确定', sound: '音效', volume: '音量',
      newBoard: '新棋盘！',
      noCombo: '已无法凑出，目标已更换',
      shareText: '拖拽数字 {score} 分！', saved: '已保存结果图片'
    },
    ja: {
      title: 'ドラッグナンバー',
      tagline: '数字をドラッグで囲んでターゲットの数を作ればポン！',
      language: '言語', theme: 'テーマ', rules: 'ルール', settings: '設定',
      start: 'スタート', best: 'ベスト', sec: '秒', score: 'スコア', pause: '一時停止', paused: '一時停止中',
      resume: '再開', quit: 'やめる', points: '点',
      retry: 'もう一回', share: '結果をシェア', home: 'ホーム',
      target: 'ターゲット',
      ruleCard: '数字を<b>ドラッグ</b>で四角く囲んで<br>合計が<b>ターゲット</b>になればポン！',
      rulesTitle: 'ルール',
      rulesBody:
        '<li>盤の上を<b>ドラッグ</b>して四角い枠を描きます。</li>' +
        '<li>枠の中の数字の合計が上の<b>ターゲット</b>と同じなら全部消えます。2つ以上囲んでください。</li>' +
        '<li>ドラッグ中は枠の角に今の合計が表示されます。緑ならぴったり！</li>' +
        '<li>消すたびにターゲットが変わります。次の2つは先に表示されます。</li>' +
        '<li>残りの数字で作れないターゲットは、お知らせとともに作れる数字に変わります。</li>' +
        '<li>消したマス1つにつき1点。</li>' +
        '<li>盤を全部消すと <b>パーフェクト！</b> 新しい盤へ。</li>' +
        '<li class="keys">PC：マウスでドラッグ · Escで一時停止</li>',
      ok: 'OK', sound: '効果音', volume: '音量',
      newBoard: '新しい盤！',
      noCombo: '作れる組み合わせがないのでターゲットを変更しました',
      shareText: 'ドラッグナンバー {score}点！', saved: '結果画像を保存しました'
    }
  };

  var lang = 'ko';
  var params = {};

  function detect() {
    try {
      var saved = localStorage.getItem('dragnum.lang');
      if (saved && STRINGS[saved]) return saved;
    } catch (e) {}
    var nav = (navigator.language || 'ko').slice(0, 2).toLowerCase();
    return STRINGS[nav] ? nav : 'ko';
  }

  function t(key, vars) {
    var s = (STRINGS[lang] && STRINGS[lang][key]) || STRINGS.ko[key] || key;
    vars = vars || params;
    return s.replace(/\{(\w+)\}/g, function (_, k) { return vars[k] != null ? vars[k] : ''; });
  }

  function apply() {
    document.documentElement.lang = lang;
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t(el.dataset.i18n);
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t(el.dataset.i18nHtml);
    });
    document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
      el.title = t(el.dataset.i18nTitle);
      el.setAttribute('aria-label', el.title);
    });
    document.title = t('title');
  }

  function setLang(next) {
    if (!STRINGS[next]) return;
    lang = next;
    try { localStorage.setItem('dragnum.lang', lang); } catch (e) {}
    apply();
  }

  function setParams(p) { params = p; apply(); }

  lang = detect();

  root.I18n = { t: t, apply: apply, setLang: setLang, setParams: setParams, get lang() { return lang; } };
})(this);
