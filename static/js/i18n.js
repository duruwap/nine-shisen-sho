(function (root) {
  'use strict';

  var STRINGS = {
    ko: {
      title: '9천성',
      tagline: '합이 9인 두 패를 꺾인 선으로 이어 팡!',
      language: '언어', theme: '테마', rules: '규칙', settings: '설정',
      modeNormal: '기본', modeNormalDesc: '최대 2번 꺾임',
      modeHard: '하드', modeHardDesc: '최대 1번 꺾임',
      start: '시작', best: '최고기록', sec: '초', score: '점수',
      hint: '힌트', pause: '일시정지', paused: '일시정지',
      resume: '계속하기', quit: '그만하기',
      timeUp: '시간 종료!', points: '점', newBest: '🎉 최고기록!',
      pairs: '터뜨린 쌍', maxCombo: '최고 콤보', clears: '판 클리어', hintsUsed: '힌트 사용',
      retry: '다시하기', share: '결과 공유', home: '처음으로',
      ruleCard: '합이 <b>9</b>인 두 패를<br>최대 <b>{turns}번</b> 꺾이는 선으로 이으면 팡!',
      rulesTitle: '규칙',
      rulesBody:
        '<li>합이 <b>9</b>인 두 패를 차례로 누르세요. (1-8, 2-7, 3-6, 4-5)</li>' +
        '<li>두 패 사이를 <b>빈 칸</b>만 지나 가로·세로 선으로 이을 수 있어야 해요.</li>' +
        '<li>선은 기본 <b>2번</b>, 하드는 <b>1번</b>까지 꺾일 수 있어요. 보드 바깥 테두리도 지나갈 수 있어요.</li>' +
        '<li>2초 안에 연속으로 터뜨리면 콤보! 3콤보부터 쌍당 +1점.</li>' +
        '<li>판을 모두 비우면 +10점과 새 보드.</li>' +
        '<li>이을 쌍이 없으면 자동으로 섞어요. 틀려도 감점은 없어요.</li>' +
        '<li class="keys">PC: 방향키 이동 · Space 선택 · H 힌트 · Esc 일시정지</li>',
      ok: '확인', sound: '효과음', volume: '볼륨',
      shuffling: '섞는 중…', noHints: '힌트를 다 썼어요',
      combo: 'x{n} 콤보', clear: '판 클리어! +10',
      shareText: '9천성 {score}점! ({pairs}쌍, 최고 {combo}콤보)',
      copied: '결과를 복사했어요', saved: '결과 이미지를 저장했어요',
      modeLabelNormal: '기본 모드', modeLabelHard: '하드 모드'
    },
    en: {
      title: 'Nine Link',
      tagline: 'Link two tiles that sum to 9 with a bent line — pop!',
      language: 'Language', theme: 'Theme', rules: 'Rules', settings: 'Settings',
      modeNormal: 'Normal', modeNormalDesc: 'Up to 2 turns',
      modeHard: 'Hard', modeHardDesc: 'Up to 1 turn',
      start: 'Start', best: 'Best', sec: 's', score: 'Score',
      hint: 'Hint', pause: 'Pause', paused: 'Paused',
      resume: 'Resume', quit: 'Quit',
      timeUp: "Time's up!", points: 'pts', newBest: '🎉 New best!',
      pairs: 'Pairs popped', maxCombo: 'Max combo', clears: 'Boards cleared', hintsUsed: 'Hints used',
      retry: 'Play again', share: 'Share', home: 'Home',
      ruleCard: 'Link two tiles that sum to <b>9</b><br>with a line of up to <b>{turns}</b> turn(s) — pop!',
      rulesTitle: 'How to play',
      rulesBody:
        '<li>Tap two tiles that add up to <b>9</b>. (1-8, 2-7, 3-6, 4-5)</li>' +
        '<li>They must connect with horizontal/vertical lines through <b>empty cells</b> only.</li>' +
        '<li>The line may turn up to <b>2</b> times (<b>1</b> in Hard). It can run around the outside edge.</li>' +
        '<li>Pop again within 2s for a combo! From 3 combo, +1 bonus per pair.</li>' +
        '<li>Clear the whole board for +10 and a fresh board.</li>' +
        '<li>No moves left? Tiles reshuffle automatically. Mistakes cost nothing.</li>' +
        '<li class="keys">PC: arrows move · Space select · H hint · Esc pause</li>',
      ok: 'OK', sound: 'Sound effects', volume: 'Volume',
      shuffling: 'Shuffling…', noHints: 'No hints left',
      combo: 'x{n} combo', clear: 'Board clear! +10',
      shareText: 'Nine Link: {score} pts! ({pairs} pairs, max combo {combo})',
      copied: 'Result copied', saved: 'Result image saved',
      modeLabelNormal: 'Normal mode', modeLabelHard: 'Hard mode'
    },
    zh: {
      title: '九连看',
      tagline: '用折线连接和为9的两张牌，砰！',
      language: '语言', theme: '主题', rules: '规则', settings: '设置',
      modeNormal: '普通', modeNormalDesc: '最多转弯2次',
      modeHard: '困难', modeHardDesc: '最多转弯1次',
      start: '开始', best: '最高纪录', sec: '秒', score: '得分',
      hint: '提示', pause: '暂停', paused: '已暂停',
      resume: '继续', quit: '退出',
      timeUp: '时间到！', points: '分', newBest: '🎉 新纪录！',
      pairs: '消除对数', maxCombo: '最高连击', clears: '清空次数', hintsUsed: '使用提示',
      retry: '再来一局', share: '分享结果', home: '返回首页',
      ruleCard: '用最多转弯 <b>{turns}</b> 次的线<br>连接和为 <b>9</b> 的两张牌！',
      rulesTitle: '规则',
      rulesBody:
        '<li>依次点击和为 <b>9</b> 的两张牌。(1-8, 2-7, 3-6, 4-5)</li>' +
        '<li>两张牌之间必须能只经过<b>空格</b>用横竖线连接。</li>' +
        '<li>普通模式最多转弯 <b>2</b> 次，困难模式 <b>1</b> 次。可以绕过棋盘外圈。</li>' +
        '<li>2秒内连续消除即为连击！3连击起每对 +1 分。</li>' +
        '<li>清空整个棋盘 +10 分并换新棋盘。</li>' +
        '<li>无可消除时自动洗牌，出错不扣分。</li>' +
        '<li class="keys">电脑：方向键移动 · 空格选择 · H 提示 · Esc 暂停</li>',
      ok: '确定', sound: '音效', volume: '音量',
      shuffling: '洗牌中…', noHints: '提示已用完',
      combo: 'x{n} 连击', clear: '清空！+10',
      shareText: '九连看 {score} 分！（{pairs} 对，最高 {combo} 连击）',
      copied: '已复制结果', saved: '已保存结果图片',
      modeLabelNormal: '普通模式', modeLabelHard: '困难模式'
    },
    ja: {
      title: '9天城',
      tagline: '合計9の2枚を折れ線でつないでポン！',
      language: '言語', theme: 'テーマ', rules: 'ルール', settings: '設定',
      modeNormal: 'ノーマル', modeNormalDesc: '最大2回曲がる',
      modeHard: 'ハード', modeHardDesc: '最大1回曲がる',
      start: 'スタート', best: 'ベスト', sec: '秒', score: 'スコア',
      hint: 'ヒント', pause: '一時停止', paused: '一時停止中',
      resume: '再開', quit: 'やめる',
      timeUp: 'タイムアップ！', points: '点', newBest: '🎉 ベスト更新！',
      pairs: '消したペア', maxCombo: '最大コンボ', clears: '全消し', hintsUsed: 'ヒント使用',
      retry: 'もう一回', share: '結果をシェア', home: 'ホーム',
      ruleCard: '合計 <b>9</b> の2枚を<br>最大 <b>{turns}回</b> 曲がる線でつなげばポン！',
      rulesTitle: 'ルール',
      rulesBody:
        '<li>合計が <b>9</b> になる2枚を順にタップ。(1-8, 2-7, 3-6, 4-5)</li>' +
        '<li>2枚の間は<b>空きマス</b>だけを通る縦横の線でつながる必要があります。</li>' +
        '<li>線はノーマルで <b>2回</b>、ハードで <b>1回</b> まで曲がれます。盤の外周も通れます。</li>' +
        '<li>2秒以内に続けて消すとコンボ！3コンボからペアごとに +1点。</li>' +
        '<li>盤を全部消すと +10点で新しい盤へ。</li>' +
        '<li>つなげるペアがなければ自動でシャッフル。ミスしても減点なし。</li>' +
        '<li class="keys">PC：矢印キーで移動 · Spaceで選択 · Hでヒント · Escで一時停止</li>',
      ok: 'OK', sound: '効果音', volume: '音量',
      shuffling: 'シャッフル中…', noHints: 'ヒントがありません',
      combo: 'x{n} コンボ', clear: '全消し！+10',
      shareText: '9天城 {score}点！（{pairs}ペア、最大{combo}コンボ）',
      copied: '結果をコピーしました', saved: '結果画像を保存しました',
      modeLabelNormal: 'ノーマルモード', modeLabelHard: 'ハードモード'
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
