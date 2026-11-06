// 卡片渲染。纯函数，只依赖 ctx 和已解码的图片对象，不碰 DOM，方便单独调试。
import { FONT, THEME, CARD as C } from './config.js';

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
  const atoms = atomize(text).flatMap((atom) =>
    ctx.measureText(atom).width > maxW ? Array.from(atom) : [atom]);
  for (const atom of atoms) {
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

// Measure content before drawing so bilingual topics wrap without clipping.
export function introLines(state) {
  return [state.introWho, state.introOffer, state.introInto, state.introReach]
    .map(s => (s || '').trim()).filter(Boolean);
}

function layout(ctx, state) {
  const blocks = [], topics = [];
  let y = state.img ? C.PHOTO_H + 354 : 280;
  const add = (text, size, color, weight = '400', width = C.W - C.PAD * 2) => {
    if (!text) return;
    ctx.font = `${weight} ${size}px ${FONT}`;
    const lines = wrap(ctx, text, width);
    blocks.push({lines, size, color, weight, y});
    y += lines.length * size * 1.45;
  };
  add([state.event, state.dateStr].filter(Boolean).join(' · '), 28, THEME.soft, '600');
  y += 28;
  add((state.introWho || '').trim() || '聊聊吧 / Let’s talk', 52, THEME.ink, '600');
  for (const [key, label] of [
    ['introOffer', '你可以找我聊 / Talk to me about'],
    ['introInto', '我想要聊 / I’d love to talk about'],
  ]) {
    const value = (state[key] || '').trim();
    if (!value) continue;
    y += 54;
    const topicTop = y - 14;
    add(label, 28, THEME.accent, '600');
    y += 14;
    add(value, 42, THEME.ink);
    topics.push({y: topicTop, height: y - topicTop + 18, color: key === 'introOffer' ? '#F9F463' : '#A7D6F5'});
    y += 22;
  }
  if (state.name || state.line) {
    y += 38;
    add('这次相遇 / This encounter', 26, THEME.soft, '600');
    if (state.name) add(`与 / With ${state.name}`, 32, THEME.ink);
    if (state.line) add(state.line, 32, THEME.ink);
  }
  if (state.introReach) { y += 36; add(state.introReach, 28, THEME.soft); }
  const qrY = y + 40;
  const height = Math.ceil(state.qrImg ? qrY + C.QR + 96 : y + 64);
  return {blocks, topics, qrY, height};
}

export function cardHeight(state, ctx) {
  return layout(ctx, state).height;
}

export function renderCard(ctx, state) {
  const result = layout(ctx, state);
  ctx.canvas.width = C.W;
  ctx.canvas.height = result.height;
  ctx.fillStyle = THEME.bg;
  ctx.fillRect(0, 0, C.W, result.height);
  // Brand header stays separate from faces and the contact QR.
  if (state.logoImg) ctx.drawImage(state.logoImg, 154, 335, 693, 329, 766, 50, 250, 119);
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  ctx.fillStyle = THEME.ink; ctx.font = `italic 800 92px ${FONT}`;
  ctx.fillText('MuFriends', C.PAD, 62);
  ctx.fillStyle = '#ED78C9'; ctx.fillRect(C.PAD, 184, 108, 14);
  ctx.fillStyle = '#F7ED32'; ctx.fillRect(C.PAD + 122, 184, 108, 14);
  ctx.fillStyle = '#28A9D6'; ctx.fillRect(C.PAD + 244, 184, 108, 14);
  if (state.img) {
    ctx.fillStyle = THEME.ink;
    ctx.fillRect(C.PAD - 3, 247, C.W - C.PAD * 2 + 6, C.PHOTO_H + 6);
    drawCover(ctx, state.img, C.PAD, 250, C.W - C.PAD * 2, C.PHOTO_H, C.FOCUS_Y);
  }
  for (const topic of result.topics) {
    ctx.fillStyle = THEME.ink;
    ctx.fillRect(C.PAD - 20, topic.y - 2, C.W - C.PAD * 2 + 40, topic.height + 4);
    ctx.fillStyle = topic.color;
    ctx.fillRect(C.PAD - 18, topic.y, C.W - C.PAD * 2 + 36, topic.height);
  }
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  for (const block of result.blocks) {
    ctx.font = `${block.weight} ${block.size}px ${FONT}`;
    ctx.fillStyle = block.color;
    block.lines.forEach((line, i) => ctx.fillText(line, C.PAD, block.y + i * block.size * 1.45));
  }
  if (state.qrImg) {
    const x = (C.W - C.QR) / 2;
    ctx.fillStyle = THEME.white;
    ctx.fillRect(x - 16, result.qrY - 16, C.QR + 32, C.QR + 32);
    ctx.drawImage(state.qrImg, x, result.qrY, C.QR, C.QR);
    ctx.font = `24px ${FONT}`;
    ctx.fillStyle = THEME.soft;
    ctx.textAlign = 'center';
    ctx.fillText(C.HINT, C.W / 2, result.qrY + C.QR + 28);
  }
  return {hasQR: !!state.qrImg, height: result.height, introCount: introLines(state).length, introTruncated: []};
}
