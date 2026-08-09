// 卡片渲染。纯函数，只依赖 ctx 和已解码的图片对象，不碰 DOM，方便单独调试。
import { OWNER, FONT, THEME, CARD as C } from './config.js';

// 连续拉丁字母数字算一个原子（不拆单词），CJK 逐字为原子。
// for..of 而非 split('')，才能正确处理 emoji 和代理对。
const LATIN = /[A-Za-z0-9'’\-@._&/]/;

export function atomize(s) {
  const out = [];
  let buf = '';
  for (const ch of s) {
    if (LATIN.test(ch)) { buf += ch; continue; }
    if (buf) { out.push(buf); buf = ''; }
    out.push(ch);
  }
  if (buf) out.push(buf);
  return out;
}

// 贪心填充。空格不占行首，行尾的空格不计入宽度。
export function wrap(ctx, text, maxW) {
  const lines = [];
  let cur = '';
  for (const atom of atomize(text)) {
    if (atom === '\n') { lines.push(cur); cur = ''; continue; }
    const next = cur + atom;
    if (cur && ctx.measureText(next.trimEnd()).width > maxW) {
      lines.push(cur.trimEnd());
      cur = atom === ' ' ? '' : atom;
    } else {
      cur = next;
    }
  }
  if (cur.trim()) lines.push(cur.trimEnd());
  return lines;
}

// 行数上限由可用高度决定，不是拍脑袋定的常数 —— 字号越小能放的行越多，
// 所以长文案会自动降级换取容量，而不是被砍掉。
const capFor = (size, maxH) => Math.max(1, Math.floor(maxH / (size * C.LINE_LH)));

// 在 LINE_SIZES 里挑第一个能放下的字号；最小号仍放不下才截断加省略号。
function fitLines(ctx, text, maxW, maxH) {
  for (const size of C.LINE_SIZES) {
    ctx.font = `${size}px ${FONT}`;
    const lines = wrap(ctx, text, maxW);
    if (lines.length <= capFor(size, maxH)) return { size, lines };
  }
  const size = C.LINE_SIZES[C.LINE_SIZES.length - 1];
  ctx.font = `${size}px ${FONT}`;
  const lines = wrap(ctx, text, maxW).slice(0, capFor(size, maxH));
  const last = lines.length - 1;
  while (lines[last].length > 1 && ctx.measureText(lines[last] + '…').width > maxW) {
    lines[last] = lines[last].slice(0, -1);
  }
  lines[last] += '…';
  return { size, lines };
}

// 单行文字（场景行）：先缩字号，缩到最小仍超宽才截断。活动名可能很长。
function fitOneLine(ctx, text, maxW, sizes, weight) {
  let size = sizes[sizes.length - 1];
  for (const s of sizes) {
    ctx.font = `${weight} ${s}px ${FONT}`;
    if (ctx.measureText(text).width <= maxW) return { size: s, text };
  }
  ctx.font = `${weight} ${size}px ${FONT}`;
  let out = text;
  while (out.length > 1 && ctx.measureText(out + '…').width > maxW) out = out.slice(0, -1);
  return { size, text: out + '…' };
}

// cover 裁切：填满目标框，focusY 控制纵向取哪一段。
function drawCover(ctx, img, x, y, w, h, focusY) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const s = Math.max(w / iw, h / ih);
  const dw = iw * s;
  const dh = ih * s;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, w, h);
  ctx.clip();
  ctx.drawImage(img, x + (w - dw) / 2, y + (h - dh) * focusY, dw, dh);
  ctx.restore();
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function formatDate(d) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`;
}

// 场景行：活动名和日期，两者都可能缺。
function sceneText(state) {
  return [state.event, state.dateStr].filter(Boolean).join(' · ');
}

// 署名：有称呼就并列两个名字，这张卡是「我们遇见过」而不是「我的名片」。
function signText(state) {
  const who = (state.name || '').trim();
  return who ? `${OWNER.name} × ${who}` : `${OWNER.name} · ${OWNER.org}`;
}

/**
 * 把卡片画进 ctx。ctx 的 canvas 必须是 C.W × C.H。
 * state = { img, qrImg, name, line, event, dateStr }
 * img 和 qrImg 都可以为 null —— 缺照片画占位底，缺二维码则文字列占满整宽。
 * 返回这次实际用了什么排版（字号、行数、有没有截断），便于调试和预览标注。
 */
export function renderCard(ctx, state) {
  const { W, H, PAD, PHOTO_H } = C;

  ctx.clearRect(0, 0, W, H);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';

  // ── 纸带底 ──
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, W, H);

  // ── 照片区 ──
  if (state.img) {
    drawCover(ctx, state.img, 0, 0, W, PHOTO_H, C.FOCUS_Y);
  } else {
    ctx.fillStyle = '#E7E0D2';
    ctx.fillRect(0, 0, W, PHOTO_H);
  }

  const hasQR = !!state.qrImg;

  // ── 二维码白块（右下）──
  const blockSize = C.QR + C.QR_PAD * 2;
  const blockX = W - PAD - blockSize;
  const blockY = 948;
  let hintBaseline = 0;

  if (hasQR) {
    ctx.save();
    ctx.fillStyle = THEME.white;
    roundRect(ctx, blockX, blockY, blockSize, blockSize, C.QR_R);
    ctx.fill();
    ctx.restore();
    ctx.drawImage(state.qrImg, blockX + C.QR_PAD, blockY + C.QR_PAD, C.QR, C.QR);

    hintBaseline = blockY + blockSize + 34;
    ctx.font = `${C.HINT_SIZE}px ${FONT}`;
    ctx.fillStyle = THEME.soft;
    ctx.textAlign = 'center';
    ctx.fillText(C.HINT, blockX + blockSize / 2, hintBaseline);
    ctx.textAlign = 'left';
  }

  // ── 文字列 ──
  const textX = PAD;
  const textW = hasQR ? blockX - PAD - C.QR_GUTTER : W - PAD * 2;

  const signBaseline = H - 60;
  const scene = sceneText(state);
  const line = (state.line || '').trim();

  const bodyBottom = hasQR ? hintBaseline - 26 : signBaseline - 40;
  const info = { hasQR, sceneSize: 0, lineSize: 0, lineCount: 0, truncated: false };

  if (line) {
    // 场景行在上，一句话居中于剩余空间
    const s = fitOneLine(ctx, scene, textW, [C.SCENE_SIZE, 24, 22], '700');
    ctx.font = `700 ${s.size}px ${FONT}`;
    ctx.fillStyle = THEME.ink;
    ctx.fillText(s.text, textX, PHOTO_H + 98);

    const regionTop = PHOTO_H + 130;
    const { size, lines } = fitLines(ctx, line, textW, bodyBottom - regionTop);
    const lh = size * C.LINE_LH;
    const start = regionTop
      + Math.max(0, (bodyBottom - regionTop - lines.length * lh) / 2)
      + size * 0.82;

    ctx.font = `${size}px ${FONT}`;
    ctx.fillStyle = THEME.ink;
    lines.forEach((t, i) => ctx.fillText(t, textX, start + i * lh));

    info.sceneSize = s.size;
    info.lineSize = size;
    info.lineCount = lines.length;
    info.truncated = lines[lines.length - 1].endsWith('…');
  } else {
    // 一句话留空：场景行放大，垂直居中于文字带，卡片不留空洞
    const s = fitOneLine(ctx, scene, textW, [C.SCENE_SIZE_SOLO, 32, 28, 24], '700');
    ctx.font = `700 ${s.size}px ${FONT}`;
    ctx.fillStyle = THEME.ink;
    ctx.fillText(s.text, textX, (PHOTO_H + bodyBottom) / 2 + s.size * 0.36);
    info.sceneSize = s.size;
  }

  // ── 署名 ──
  const dotR = 7;
  ctx.fillStyle = THEME.mark;
  ctx.beginPath();
  ctx.arc(textX + dotR, signBaseline - 8, dotR, 0, Math.PI * 2);
  ctx.fill();

  ctx.font = `${C.SIGN_SIZE}px ${FONT}`;
  ctx.fillStyle = THEME.soft;
  ctx.fillText(signText(state), textX + dotR * 2 + 12, signBaseline);

  return info;
}
