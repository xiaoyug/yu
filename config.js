// 「遇」的全部可调项。改版式、改配色、改文案，只动这个文件。

// 这个文件里不放任何人的名字、机构、联系方式。
// 卡片上的身份信息全部来自 ⚙ 里那三行自我介绍，存在使用者自己的手机上 ——
// 这样同一个网址谁都能用，各是各的。

export const FONT = '"PingFang SC", -apple-system, system-ui, "Noto Sans SC", sans-serif';

// 暖纸色系，沿用 cherish-time 报名页的配色；mark 是 mu 的荧光绿
export const THEME = {
  bg:       '#F6F1E7',
  ink:      '#24211F',
  soft:     '#8A857C',
  accent:   '#C4552A',
  mark:     '#C4552A',
  white:    '#FFFFFF',
  hairline: 'rgba(36,33,31,.15)',
};

export const CARD = {
  W: 1080,
  PAD: 64,             // 卡片高度不写死，按自我介绍的行数算出来，见 card.js 的 cardHeight()

  PHOTO_H: 900,
  FOCUS_Y: 0.38,       // <0.5 → cover 裁切时保留画面上部（合影里脸在上半部）

  QR: 330,             // 必须 ≥ 卡片宽度的 30%，否则微信缩略图里扫不动
  QR_PAD: 16,          // 二维码四周的白边
  QR_R: 20,            // 白块圆角
  QR_GUTTER: 28,       // 白块与文字列之间的间距

  SCENE_SIZE: 28,      // 场景行「muShenzhen · 2026.08.09」
  SCENE_SIZE_SOLO: 38, // 一句话留空时，场景行放大顶上
  LINE_SIZES: [46, 38, 30],   // 行数上限由可用高度算出，不写死
  LINE_LH: 1.45,
  HINT_SIZE: 22,

  // 自我介绍：活动前写好、整场不变的三行。第一行是「我是谁」，稍重；后两行安静一些。
  INTRO_SIZES: [[28, 26, 24], [26, 24, 22], [24, 22, 20]],
  INTRO_LH: 50,
  INTRO_GAP_TOP: 50,   // 二维码提示语到分隔线
  INTRO_GAP_LINE: 52,  // 分隔线到第一行
  INTRO_BOTTOM: 62,    // 最后一行到卡片底边

  HINT: '长按识别二维码 · Scan to connect',

  MIME: 'image/jpeg',
  QUALITY: 0.92,
};
