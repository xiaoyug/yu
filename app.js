// 「遇」的状态机与交互。照片全程只在内存，localStorage 里只存二维码图和活动名。
import { CARD } from './config.js';
import { renderCard, formatDate } from './card.js';

const KEY_QR = 'yu.qr.v1';
const KEY_EVENT = 'yu.event.v1';
const KEY_INTRO = 'yu.intro.v1';

const $ = (id) => document.getElementById(id);
const el = {
  event: $('event'), gear: $('gear'),
  noqr: $('noqr'), noqrFix: $('noqrFix'),
  setup: $('setup'), pickQR: $('pickQR'), qrFile: $('qrFile'), qrThumb: $('qrThumb'),
  introWho: $('introWho'), introInto: $('introInto'), introReach: $('introReach'),
  introTip: $('introTip'),
  shoot: $('shoot'), photo: $('photo'),
  stage: $('stage'), preview: $('preview'), savehint: $('savehint'),
  who: $('who'), line: $('line'),
  save: $('save'), send: $('send'),
};

// 自我介绍：活动前写好，整场不变。三行都可留空。
const INTRO_FIELDS = ['introWho', 'introInto', 'introReach'];

function readIntro() {
  return {
    introWho: el.introWho.value.trim(),
    introInto: el.introInto.value.trim(),
    introReach: el.introReach.value.trim(),
  };
}

function saveIntro() {
  localStorage.setItem(KEY_INTRO, JSON.stringify(readIntro()));
}

function restoreIntro() {
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem(KEY_INTRO) || '{}'); } catch { /* 坏数据就当没写过 */ }
  INTRO_FIELDS.forEach((k) => { el[k].value = saved[k] || ''; });
}

const state = {
  img: null,        // 已解码的合影，只在内存
  qrImg: null,      // 已解码的二维码
  photoURL: null,   // 当前照片的 objectURL，换图时要 revoke
  previewURL: null, // 当前预览图的 objectURL
  file: null,       // 备好的 File —— iOS 要求 share() 里不能有 await，所以提前生成
  saved: false,
};

// 尺寸由 renderCard 定 —— 卡片高度会随自我介绍的行数变
const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');

// ── 工具 ──────────────────────────────────────────────

function decode(src) {
  return new Promise((ok, err) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = () => err(new Error('图片解码失败'));
    img.src = src;
  });
}

const debounce = (fn, ms) => {
  let t;
  return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
};

function stamp() {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
}

// ── 二维码：上传、缩放、存本机 ────────────────────────

// 等比缩放居中放在白底上（contain 而非 cover）——
// 万一没裁成正方形也不会把码拉变形，白边不影响扫描。
function toSquarePNG(img, size = 660) {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(0, 0, size, size);
  const s = Math.min(size / img.naturalWidth, size / img.naturalHeight);
  const w = img.naturalWidth * s;
  const h = img.naturalHeight * s;
  g.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return c.toDataURL('image/png');   // 用 PNG：JPEG 在高对比边缘的伪影会伤扫码率
}

async function loadQRFromStorage() {
  const data = localStorage.getItem(KEY_QR);
  if (!data) return setQRMissing(true);
  try {
    state.qrImg = await decode(data);
    el.qrThumb.src = data;
    el.qrThumb.classList.add('show');
    setQRMissing(false);
  } catch {
    localStorage.removeItem(KEY_QR);
    setQRMissing(true);
  }
}

function setQRMissing(missing) {
  el.noqr.classList.toggle('show', missing);
  el.pickQR.textContent = missing ? '选择图片' : '换一张';
}

async function onPickQR(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await decode(url);
    const data = toSquarePNG(img);
    try {
      localStorage.setItem(KEY_QR, data);
    } catch {
      alert('这张图太大了，存不下。请先在相册里裁小一点再试。');
      return;
    }
    state.qrImg = await decode(data);
    el.qrThumb.src = data;
    el.qrThumb.classList.add('show');
    setQRMissing(false);
    render();
  } catch {
    alert('这张图读不出来，换一张试试。');
  } finally {
    URL.revokeObjectURL(url);
  }
}

// ── 照片 ─────────────────────────────────────────────

async function onPickPhoto(file) {
  const url = URL.createObjectURL(file);
  let img;
  try {
    // 用 <img> 解码，浏览器会自动应用 EXIF 方向，naturalWidth/Height 已是校正后的尺寸
    img = await decode(url);
  } catch {
    URL.revokeObjectURL(url);
    alert('这张照片读不出来，重拍一张试试。');
    return;
  }
  if (state.photoURL) URL.revokeObjectURL(state.photoURL);
  state.photoURL = url;
  state.img = img;
  state.saved = false;
  el.stage.classList.add('show');
  el.shoot.classList.add('compact');
  el.shoot.querySelector('strong').textContent = '换一张 / 拍下一个人';
  updateButtons();
  render();
}

// ── 渲染 ─────────────────────────────────────────────

const INTRO_LABELS = ['我是谁', '对什么感兴趣', '怎么联系我'];

function render() {
  if (!state.img) return;
  const info = renderCard(ctx, {
    img: state.img,
    qrImg: state.qrImg,
    name: el.who.value,
    line: el.line.value,
    event: el.event.value.trim(),
    dateStr: formatDate(new Date()),
    ...readIntro(),
  });

  // 太长的自我介绍会被截断 —— 现在就说，别等她在活动上才发现
  const cut = (info.introTruncated || []).map((i) => INTRO_LABELS[i]);
  el.introTip.textContent = cut.length ? `「${cut.join('」「')}」太长了，卡片上会截断` : '';

  canvas.toBlob((blob) => {
    if (!blob) return;
    state.file = new File([blob], `yu-${stamp()}.jpg`, { type: CARD.MIME });
    if (state.previewURL) URL.revokeObjectURL(state.previewURL);
    state.previewURL = URL.createObjectURL(blob);
    el.preview.src = state.previewURL;
    updateButtons();
  }, CARD.MIME, CARD.QUALITY);
}

const renderSoon = debounce(render, 150);

function updateButtons() {
  const ready = !!state.file;
  el.save.disabled = !ready;
  el.send.disabled = !ready;
  el.save.classList.toggle('primary', !state.saved);
  el.send.classList.toggle('primary', state.saved);
}

// ── 保存 / 分享 ───────────────────────────────────────
// iOS 要求 navigator.share() 在用户激活的回调里同步调用 —— 中间夹一个 await 会
// 间歇性抛 NotAllowedError。所以 file 在渲染时就备好，这里直接取用。

function shareFile(after) {
  const file = state.file;
  if (!file) return;
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    navigator.share({ files: [file] })      // 只传 files，带 title/text 会让 iOS 降级成纯文本分享
      .then(after)
      .catch((e) => { if (e && e.name !== 'AbortError') fallback(); });
  } else {
    fallback();
  }
}

function fallback() {
  // iOS 上 <a download> 会存进「文件」而不是「照片」，所以走长按菜单最稳
  el.savehint.textContent = '长按上方图片 → 存储到"照片"';
  if (!navigator.canShare) {
    const a = document.createElement('a');
    a.href = state.previewURL;
    a.download = state.file ? state.file.name : 'yu.jpg';
    a.click();
  }
}

// ── 事件绑定 ─────────────────────────────────────────

el.photo.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) onPickPhoto(f);
  e.target.value = '';           // 清空，才能连续选同一张
});

el.qrFile.addEventListener('change', (e) => {
  const f = e.target.files && e.target.files[0];
  if (f) onPickQR(f);
  e.target.value = '';
});

el.pickQR.addEventListener('click', () => el.qrFile.click());
el.noqrFix.addEventListener('click', () => {
  el.setup.classList.add('show');
  el.qrFile.click();
});
el.gear.addEventListener('click', () => el.setup.classList.toggle('show'));

el.who.addEventListener('input', renderSoon);
el.line.addEventListener('input', renderSoon);

INTRO_FIELDS.forEach((k) => el[k].addEventListener('input', () => {
  saveIntro();
  renderSoon();
}));
el.event.addEventListener('input', () => {
  localStorage.setItem(KEY_EVENT, el.event.value.trim());
  renderSoon();
});

el.save.addEventListener('click', () => shareFile(() => {
  state.saved = true;
  el.savehint.textContent = '存好了 —— 接着点 ② 发给 TA';
  updateButtons();
}));
el.send.addEventListener('click', () => shareFile(() => {}));

// ── 启动 ─────────────────────────────────────────────

el.event.value = localStorage.getItem(KEY_EVENT) || '';
restoreIntro();
loadQRFromStorage();
updateButtons();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
