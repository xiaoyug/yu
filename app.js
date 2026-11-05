import { CARD } from './config.js';
import { renderCard } from './card.js';

const $ = id => document.getElementById(id);
const fields = ['introWho', 'introOffer', 'introInto', 'introReach'];
const KEY = { intro: 'yu.intro.v1', qr: 'yu.qr.v1', event: 'yu.event.v1', date: 'yu.date.v1' };
function storageNotice() {
  $('storageNotice').hidden = false;
  $('storageNotice').textContent = '无法保存到当前浏览器，请先保存卡片再离开。 / Browser storage is unavailable. Save your card before leaving.';
}
function read(key) { try { return localStorage.getItem(key); } catch { storageNotice(); return null; } }
function write(key, value) { try { localStorage.setItem(key, value); } catch { storageNotice(); } }
let intro = {};
try { const parsed = JSON.parse(read(KEY.intro) || '{}'); if (parsed && typeof parsed === 'object') intro = parsed; } catch { /* Ignore malformed legacy data. */ }
fields.forEach(key => { $(key).value = typeof intro[key] === 'string' ? intro[key] : ''; });
$('event').value = read(KEY.event) ?? 'MuFriends';
$('date').value = read(KEY.date) || '2026-11-06';

const canvas = document.createElement('canvas');
const ctx = canvas.getContext('2d');
const state = { img: null, qrImg: null, photoURL: null, previewURL: null, file: null };
let brandReady = false;
let version = 0, timer, photoRequest = 0, qrRequest = 0, photoPending = false;
const decode = src => new Promise((resolve, reject) => {
  const img = new Image(); img.onload = () => resolve(img); img.onerror = reject; img.src = src;
});
function buttons(ready) { $('save').disabled = $('send').disabled = !ready; }
function invalidate() { version++; state.file = null; buttons(false); }
function render() {
  const current = ++version;
  state.file = null; buttons(false);
  renderCard(ctx, {
    ...state, event: $('event').value.trim(), dateStr: $('date').value.replaceAll('-', '.'),
    name: $('who').value.trim(), line: $('line').value.trim(),
    ...Object.fromEntries(fields.map(key => [key, $(key).value.trim()])),
  });
  canvas.toBlob(blob => {
    if (current !== version) return;
    if (!blob) { $('status').textContent = '生成失败，请重试。 / Could not generate the card. Please try again.'; return; }
    state.file = new File([blob], `yu-${$('date').value || 'card'}-${Date.now()}.jpg`, {type: CARD.MIME});
    const previous = state.previewURL;
    state.previewURL = URL.createObjectURL(blob);
    $('preview').src = state.previewURL;
    if (previous) URL.revokeObjectURL(previous);
    buttons(!photoPending && brandReady);
  }, CARD.MIME, CARD.QUALITY);
}
function schedule() {
  invalidate(); clearTimeout(timer); $('status').textContent = '';
  timer = setTimeout(render, 150);
}
fields.forEach(key => $(key).addEventListener('input', () => {
  write(KEY.intro, JSON.stringify(Object.fromEntries(fields.map(k => [k, $(k).value]))));
  schedule();
}));
for (const key of ['event', 'date']) $(key).addEventListener('input', () => { write(KEY[key], $(key).value); schedule(); });
for (const key of ['who', 'line']) $(key).addEventListener('input', schedule);

$('pickQR').addEventListener('click', () => $('qrFile').click());
$('qrFile').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  const request = ++qrRequest;
  const url = URL.createObjectURL(file);
  try {
    const img = await decode(url);
    const square = document.createElement('canvas'); square.width = square.height = 660;
    const g = square.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 660, 660);
    const scale = Math.min(660 / img.naturalWidth, 660 / img.naturalHeight);
    const w = img.naturalWidth * scale, h = img.naturalHeight * scale;
    g.drawImage(img, (660-w)/2, (660-h)/2, w, h);
    const data = square.toDataURL('image/png');
    const decoded = await decode(data);
    if (request !== qrRequest) return;
    write(KEY.qr, data); state.qrImg = decoded; $('qrThumb').src = data; render();
  } catch { $('status').textContent = '二维码图片无法读取，请换一张。 / Could not read this QR image. Try another.'; }
  finally { URL.revokeObjectURL(url); }
});
$('photo').addEventListener('change', async e => {
  const file = e.target.files[0]; e.target.value = ''; if (!file) return;
  const request = ++photoRequest;
  photoPending = true;
  invalidate();
  const url = URL.createObjectURL(file);
  try {
    const img = await decode(url);
    if (request !== photoRequest) { URL.revokeObjectURL(url); return; }
    if (state.photoURL) URL.revokeObjectURL(state.photoURL);
    state.img = img; state.photoURL = url; photoPending = false;
    $('photoActions').hidden = false;
    $('shoot').textContent = '换一张照片 / Replace photo';
    render();
  } catch {
    URL.revokeObjectURL(url);
    if (request !== photoRequest) return;
    photoPending = false;
    $('status').textContent = '照片无法读取，请换一张。 / Could not read this photo. Try another.';
    render();
  }
});
function removePhoto() {
  photoRequest++; photoPending = false;
  if (state.photoURL) URL.revokeObjectURL(state.photoURL);
  state.img = state.photoURL = null;
  $('photoActions').hidden = true;
  $('shoot').textContent = '加一张合影（选填）/ Add a photo (optional)';
  render();
}
$('removePhoto').addEventListener('click', removePhoto);
$('newEncounter').addEventListener('click', () => {
  $('who').value = $('line').value = '';
  $('status').textContent = '';
  removePhoto();
});
function fallback(file, url) {
  $('status').textContent = '长按卡片存储到照片，或使用下载的图片。 / Touch and hold the card to save, or use the downloaded image.';
  const a = document.createElement('a'); a.href = url; a.download = file.name; a.click();
}
function share(saving) {
  const file = state.file, url = state.previewURL;
  if (!file) return;
  if (navigator.share && navigator.canShare?.({files: [file]})) {
    navigator.share({files: [file]}).then(() => {
      $('status').textContent = saving
        ? '系统菜单已关闭，请确认卡片已保存到相册。 / Menu closed. Please check that the card is in Photos.'
        : '分享菜单已关闭。 / Share menu closed.';
    }).catch(error => { if (error.name !== 'AbortError') fallback(file, url); });
  } else fallback(file, url);
}
$('save').addEventListener('click', () => share(true));
$('send').addEventListener('click', () => share(false));
render();
const savedQR = read(KEY.qr);
if (savedQR) {
  const request = qrRequest;
  decode(savedQR).then(img => {
    if (request !== qrRequest) return;
    state.qrImg = img; $('qrThumb').src = savedQR; render();
  }).catch(() => { $('status').textContent = '请重新上传二维码。 / Please upload your QR code again.'; });
}
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js').then(() => navigator.serviceWorker.ready).then(() => {
    $('offlineStatus').textContent = '已准备好离线使用 / Ready to use offline';
  }).catch(() => {
    $('offlineStatus').textContent = '离线准备未完成，请联网后重新打开 / Offline setup incomplete. Reopen while online.';
  });
} else $('offlineStatus').textContent = '此浏览器不支持离线使用 / Offline access is unavailable in this browser';

// Decode the original logo and self-contained illustration before enabling export.
Promise.all([decode('./assets/mushenzhen-logo.png'), decode('./assets/friends-art.svg')])
  .then(([logoImg, artImg]) => {
    state.logoImg = logoImg; state.artImg = artImg; brandReady = true; render();
  }).catch(() => {
    $('status').textContent = '品牌图片未加载，请联网后重新打开。 / Brand images could not load. Reopen while online.';
  });
