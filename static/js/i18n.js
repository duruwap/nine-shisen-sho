(function (root) {
  'use strict';

  var STRINGS = {
    ko: {
      title: '넘버 사천성',
      tagline: '목표 숫자를 만드는 두 패를 이어 팡!',
      language: '언어', theme: '테마', rules: '규칙', settings: '설정',
      start: '시작', best: '최고기록', sec: '초', score: '점수', pause: '일시정지', paused: '일시정지',
      resume: '계속하기', quit: '그만하기', points: '점',
      retry: '다시하기', share: '결과 공유', home: '처음으로',
      target: '목표', next: '다음',
      ruleCard: '두 패의 합이 위의 <b>목표 숫자</b>가 되게<br>최대 <b>{turns}번</b> 꺾이는 선으로 이으면 팡!',
      rulesTitle: '규칙',
      rulesBody:
        '<li>화면 위의 <b>목표 숫자</b>와 합이 같은 두 패를 차례로 누르세요.</li>' +
        '<li>한 쌍을 터뜨릴 때마다 목표가 바뀌어요. 다음 목표 두 개가 미리 보여요.</li>' +
        '<li>두 패 사이를 <b>빈 칸</b>만 지나 가로·세로 선으로 이을 수 있어야 해요. 선은 최대 <b>1번</b> 꺾일 수 있어요.</li>' +
        '<li>지운 칸 하나에 1점 (한 쌍 = 2점).</li>' +
        '<li>판을 모두 비우면 <b>퍼펙트!</b> 새 보드가 나와요.</li>' +
        '<li>목표를 만들 수 있는 쌍이 없으면 자동으로 섞어요. 틀려도 감점은 없어요.</li>' +
        '<li class="keys">PC: 방향키 이동 · Space 선택 · Esc 일시정지</li>',
      ok: '확인', sound: '효과음', volume: '볼륨',
      shuffling: '섞는 중…',
      shareText: '넘버 사천성 {score}점!', saved: '결과 이미지를 저장했어요'
    },
    en: {
      title: 'Number Shisen-sho',
      tagline: 'Link two tiles that add up to the target — pop!',
      language: 'Language', theme: 'Theme', rules: 'Rules', settings: 'Settings',
      start: 'Start', best: 'Best', sec: 's', score: 'Score', pause: 'Pause', paused: 'Paused',
      resume: 'Resume', quit: 'Quit', points: 'pts',
      retry: 'Play again', share: 'Share', home: 'Home',
      target: 'Target', next: 'Next',
      ruleCard: 'Link two tiles that add up to the <b>target</b><br>with a line of up to <b>{turns}</b> turn — pop!',
      rulesTitle: 'How to play',
      rulesBody:
        '<li>Tap two tiles whose sum equals the <b>target</b> at the top.</li>' +
        '<li>The target changes after every pop. The next two are shown in advance.</li>' +
        '<li>They must connect with horizontal/vertical lines through <b>empty cells</b> only, turning at most <b>once</b>.</li>' +
        '<li>1 point per cleared cell (2 per pair).</li>' +
        '<li>Clear the whole board for a <b>PERFECT!</b> and a fresh board.</li>' +
        '<li>No pair can make the target? Tiles reshuffle automatically. Mistakes cost nothing.</li>' +
        '<li class="keys">PC: arrows move · Space select · Esc pause</li>',
      ok: 'OK', sound: 'Sound effects', volume: 'Volume',
      shuffling: 'Shuffling…',
      shareText: 'Number Shisen-sho: {score} pts!', saved: 'Result image saved'
    },
    zh: {
      title: '数字连连看',
      tagline: '连接和为目标数字的两张牌，砰！',
      language: '语言', theme: '主题', rules: '规则', settings: '设置',
      start: '开始', best: '最高纪录', sec: '秒', score: '得分', pause: '暂停', paused: '已暂停',
      resume: '继续', quit: '退出', points: '分',
      retry: '再来一局', share: '分享结果', home: '返回首页',
      target: '目标', next: '下一个',
      ruleCard: '用最多转弯 <b>{turns}</b> 次的线<br>连接和为<b>目标数字</b>的两张牌！',
      rulesTitle: '规则',
      rulesBody:
        '<li>依次点击和等于上方<b>目标数字</b>的两张牌。</li>' +
        '<li>每消除一对，目标就会改变。可以提前看到接下来的两个目标。</li>' +
        '<li>两张牌之间必须能只经过<b>空格</b>用横竖线连接，最多转弯 <b>1</b> 次。</li>' +
        '<li>每消除一格得 1 分（一对 = 2 分）。</li>' +
        '<li>清空整个棋盘即 <b>完美！</b> 并换新棋盘。</li>' +
        '<li>无法凑出目标时自动洗牌，出错不扣分。</li>' +
        '<li class="keys">电脑：方向键移动 · 空格选择 · Esc 暂停</li>',
      ok: '确定', sound: '音效', volume: '音量',
      shuffling: '洗牌中…',
      shareText: '数字连连看 {score} 分！', saved: '已保存结果图片'
    },
    ja: {
      title: 'ナンバー四川省',
      tagline: 'ターゲットの数になる2枚をつないでポン！',
      language: '言語', theme: 'テーマ', rules: 'ルール', settings: '設定',
      start: 'スタート', best: 'ベスト', sec: '秒', score: 'スコア', pause: '一時停止', paused: '一時停止中',
      resume: '再開', quit: 'やめる', points: '点',
      retry: 'もう一回', share: '結果をシェア', home: 'ホーム',
      target: 'ターゲット', next: '次',
      ruleCard: '合計が<b>ターゲット</b>になる2枚を<br>最大 <b>{turns}回</b> 曲がる線でつなげばポン！',
      rulesTitle: 'ルール',
      rulesBody:
        '<li>上の<b>ターゲット</b>と合計が同じになる2枚を順にタップ。</li>' +
        '<li>ペアを消すたびにターゲットが変わります。次の2つは先に表示されます。</li>' +
        '<li>2枚の間は<b>空きマス</b>だけを通る縦横の線でつながる必要があり、曲がれるのは <b>1回</b> までです。</li>' +
        '<li>消したマス1つにつき1点（1ペア = 2点）。</li>' +
        '<li>盤を全部消すと <b>パーフェクト！</b> 新しい盤へ。</li>' +
        '<li>ターゲットを作れるペアがなければ自動でシャッフル。ミスしても減点なし。</li>' +
        '<li class="keys">PC：矢印キーで移動 · Spaceで選択 · Escで一時停止</li>',
      ok: 'OK', sound: '効果音', volume: '音量',
      shuffling: 'シャッフル中…',
      shareText: 'ナンバー四川省 {score}点！', saved: '結果画像を保存しました'
    }
  };

  var lang = 'ko';
  var params = {};

  function detect() {
    try {
      var saved = localStorage.getItem('numshisen.lang');
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
    try { localStorage.setItem('numshisen.lang', lang); } catch (e) {}
    apply();
  }

  function setParams(p) { params = p; apply(); }

  lang = detect();

  root.I18n = { t: t, apply: apply, setLang: setLang, setParams: setParams, get lang() { return lang; } };
})(this);
