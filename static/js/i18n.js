(function (root) {
  'use strict';

  var STRINGS = {
    ko: {
      title: '9천성',
      tagline: '합이 9인 두 패를 꺾인 선으로 이어 팡!',
      language: '언어', theme: '테마', rules: '규칙', settings: '설정',
      start: '시작', best: '최고기록', sec: '초', score: '점수', pause: '일시정지', paused: '일시정지',
      resume: '계속하기', quit: '그만하기', points: '점',
      retry: '다시하기', share: '결과 공유', home: '처음으로',
      ruleCard: '합이 <b>9</b>인 두 패를<br>최대 <b>{turns}번</b> 꺾이는 선으로 이으면 팡!',
      rulesTitle: '규칙',
      rulesBody:
        '<li>합이 <b>9</b>인 두 패를 차례로 누르세요. (1-8, 2-7, 3-6, 4-5)</li>' +
        '<li>두 패 사이를 <b>빈 칸</b>만 지나 가로·세로 선으로 이을 수 있어야 해요.</li>' +
        '<li>선은 최대 <b>1번</b>까지 꺾일 수 있어요. 보드 바깥 테두리도 지나갈 수 있어요.</li>' +
        '<li>2초 안에 연속으로 터뜨리면 콤보! 3콤보부터 쌍당 +1점.</li>' +
        '<li>판을 모두 비우면 <b>퍼펙트!</b> +10점과 새 보드.</li>' +
        '<li>이을 쌍이 없으면 자동으로 섞어요. 틀려도 감점은 없어요.</li>' +
        '<li class="keys">PC: 방향키 이동 · Space 선택 · Esc 일시정지</li>',
      ok: '확인', sound: '효과음', volume: '볼륨',
      shuffling: '섞는 중…',
      combo: 'x{n} 콤보',
      shareText: '9천성 {score}점!', saved: '결과 이미지를 저장했어요',
    },
    en: {
      title: 'Nine Link',
      tagline: 'Link two tiles that sum to 9 with a bent line — pop!',
      language: 'Language', theme: 'Theme', rules: 'Rules', settings: 'Settings',
      start: 'Start', best: 'Best', sec: 's', score: 'Score', pause: 'Pause', paused: 'Paused',
      resume: 'Resume', quit: 'Quit',
      timeUp: "Time's up!", points: 'pts',
      retry: 'Play again', share: 'Share', home: 'Home',
      ruleCard: 'Link two tiles that sum to <b>9</b><br>with a line of up to <b>{turns}</b> turn(s) — pop!',
      rulesTitle: 'How to play',
      rulesBody:
        '<li>Tap two tiles that add up to <b>9</b>. (1-8, 2-7, 3-6, 4-5)</li>' +
        '<li>They must connect with horizontal/vertical lines through <b>empty cells</b> only.</li>' +
        '<li>The line may turn at most <b>once</b>. It can run around the outside edge.</li>' +
        '<li>Pop again within 2s for a combo! From 3 combo, +1 bonus per pair.</li>' +
        '<li>Clear the whole board for a <b>PERFECT!</b> +10 and a fresh board.</li>' +
        '<li>No moves left? Tiles reshuffle automatically. Mistakes cost nothing.</li>' +
        '<li class="keys">PC: arrows move · Space select · Esc pause</li>',
      ok: 'OK', sound: 'Sound effects', volume: 'Volume',
      shuffling: 'Shuffling…',
      combo: 'x{n} combo',
      shareText: 'Nine Link: {score} pts!', saved: 'Result image saved',
    },
    zh: {
      title: '九连看',
      tagline: '用折线连接和为9的两张牌，砰！',
      language: '语言', theme: '主题', rules: '规则', settings: '设置',
      start: '开始', best: '最高纪录', sec: '秒', score: '得分', pause: '暂停', paused: '已暂停',
      resume: '继续', quit: '退出', points: '分',
      retry: '再来一局', share: '分享结果', home: '返回首页',
      ruleCard: '用最多转弯 <b>{turns}</b> 次的线<br>连接和为 <b>9</b> 的两张牌！',
      rulesTitle: '规则',
      rulesBody:
        '<li>依次点击和为 <b>9</b> 的两张牌。(1-8, 2-7, 3-6, 4-5)</li>' +
        '<li>两张牌之间必须能只经过<b>空格</b>用横竖线连接。</li>' +
        '<li>连线最多只能转弯 <b>1</b> 次，可以绕过棋盘外圈。</li>' +
        '<li>2秒内连续消除即为连击！3连击起每对 +1 分。</li>' +
        '<li>清空整个棋盘即 <b>完美！</b> +10 分并换新棋盘。</li>' +
        '<li>无可消除时自动洗牌，出错不扣分。</li>' +
        '<li class="keys">电脑：方向键移动 · 空格选择 · Esc 暂停</li>',
      ok: '确定', sound: '音效', volume: '音量',
      shuffling: '洗牌中…',
      combo: 'x{n} 连击',
      shareText: '九连看 {score} 分！', saved: '已保存结果图片',
    },
    ja: {
      title: '9天城',
      tagline: '合計9の2枚を折れ線でつないでポン！',
      language: '言語', theme: 'テーマ', rules: 'ルール', settings: '設定',
      start: 'スタート', best: 'ベスト', sec: '秒', score: 'スコア', pause: '一時停止', paused: '一時停止中',
      resume: '再開', quit: 'やめる', points: '点',
      retry: 'もう一回', share: '結果をシェア', home: 'ホーム',
      ruleCard: '合計 <b>9</b> の2枚を<br>最大 <b>{turns}回</b> 曲がる線でつなげばポン！',
      rulesTitle: 'ルール',
      rulesBody:
        '<li>合計が <b>9</b> になる2枚を順にタップ。(1-8, 2-7, 3-6, 4-5)</li>' +
        '<li>2枚の間は<b>空きマス</b>だけを通る縦横の線でつながる必要があります。</li>' +
        '<li>線は <b>1回</b> まで曲がれます。盤の外周も通れます。</li>' +
        '<li>2秒以内に続けて消すとコンボ！3コンボからペアごとに +1点。</li>' +
        '<li>盤を全部消すと <b>パーフェクト！</b> +10点で新しい盤へ。</li>' +
        '<li>つなげるペアがなければ自動でシャッフル。ミスしても減点なし。</li>' +
        '<li class="keys">PC：矢印キーで移動 · Spaceで選択 · Escで一時停止</li>',
      ok: 'OK', sound: '効果音', volume: '音量',
      shuffling: 'シャッフル中…',
      combo: 'x{n} コンボ',
      shareText: '9天城 {score}点！', saved: '結果画像を保存しました',
    }
  };

  var lang = 'ko';
  var params = {};

  function detect() {
    try {
      var saved = localStorage.getItem('nine.lang');
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
    document.title = t('title') + (lang === 'ko' ? ' · Nine Link' : '');
  }

  function setLang(next) {
    if (!STRINGS[next]) return;
    lang = next;
    try { localStorage.setItem('nine.lang', lang); } catch (e) {}
    apply();
  }

  function setParams(p) { params = p; apply(); }

  lang = detect();

  root.I18n = { t: t, apply: apply, setLang: setLang, setParams: setParams, get lang() { return lang; } };
})(this);
