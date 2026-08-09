// 把真正的 config.js + card.js 和占位素材内联成一个自包含的版式预览页。
// 预览页用的是最终代码本身，不是另画一遍 —— 看到的就是产品的输出。
//
//   node tools/yu/dev/build-preview.mjs <素材目录> <输出 html>

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(HERE, '..');
const [assetDir, outPath] = process.argv.slice(2);
if (!assetDir || !outPath) {
  console.error('usage: build-preview.mjs <assetDir> <out.html>');
  process.exit(1);
}

// 去掉 import / export 关键字，让 ES module 能直接跑在普通 <script> 里。
// `X as Y` 的别名要补一句赋值，否则引用会丢。
const flatten = (src) =>
  src
    .replace(/^import\s*\{([^}]*)\}\s*from\s*['"][^'"]+['"];?[ \t]*$/gm, (_, names) =>
      names
        .split(',')
        .map((s) => s.trim().match(/^(\S+)\s+as\s+(\S+)$/))
        .filter(Boolean)
        .map((m) => `const ${m[2]} = ${m[1]};`)
        .join('\n'))
    .replace(/^export (const|function)/gm, '$1');

const config = flatten(readFileSync(join(ROOT, 'config.js'), 'utf8'));
const card = flatten(readFileSync(join(ROOT, 'card.js'), 'utf8'));

const dataURI = (file, mime) =>
  `data:${mime};base64,${readFileSync(join(assetDir, file)).toString('base64')}`;

const PHOTO_LAND = dataURI('photo-land.jpg', 'image/jpeg');
const PHOTO_PORT = dataURI('photo-port.jpg', 'image/jpeg');
const QR = dataURI('qr-placeholder.png', 'image/png');

const CASES = [
  {
    label: '① 一句话留空',
    note: '现场最忙的时候直接跳过打字。场景行放大顶上，卡片不留空洞 —— 这是最该先看的一张。',
    state: { photo: 'land', qr: true, name: 'Alex', line: '', event: 'muShenzhen' },
  },
  {
    label: '② 一句话 · 短',
    note: '最常见的状态。',
    state: { photo: 'land', qr: true, name: 'Alex', line: '聊到你在做的地铁噪音项目', event: 'muShenzhen' },
  },
  {
    label: '③ 一句话 · 中等，中英混排',
    note: '看换行有没有把英文单词拆断、字号有没有自动缩。',
    state: {
      photo: 'port', qr: true, name: '李然',
      line: '你说 Build in Public 最难的是承认还没做出来，这句我记下了',
      event: 'muShenzhen · Garage',
    },
  },
  {
    label: '④ 一句话 · 超长（150 字压力测试）',
    note: '不该溢出纸带，应该缩到最小号并截断加省略号。',
    state: {
      photo: 'land', qr: true, name: 'Marta',
      line: '我们从深圳的硬件供应链一路聊到你在里斯本那个 co-living 的运营模型，然后发现两边其实是同一个问题：怎么让一群陌生人在三周之内产生真实的信任，而不是停留在交换名片的层面上，这个我回去还想再想想',
      event: 'muShenzhen',
    },
  },
  {
    label: '⑤ 称呼也留空',
    note: '署名降级成「Sunny · mu」。',
    state: { photo: 'port', qr: true, name: '', line: '你提到的那本关于城市尺度的书，回头发我', event: 'muShenzhen' },
  },
  {
    label: '⑥ 还没上传二维码（兜底）',
    note: '现场绝不因为缺码而卡住出卡；文字列自动占满整宽。',
    state: { photo: 'land', qr: false, name: 'Alex', line: '聊到你在做的地铁噪音项目', event: 'muShenzhen' },
  },
];

const html = `<meta charset="utf-8">
<title>「遇」· 卡片版式预览</title>
<style>
  /* 审片台，不是产品本身：底色刻意用冷中性灰，让暖米色的卡片浮在上面成为「物件」，
     而不是和背景糊成一片。产品自己的暖纸色只出现在卡片里。 */
  :root {
    --bg: #eceef1; --panel: #f7f8fa; --ink: #1b1e24; --soft: #6d7480;
    --line: rgba(20,26,38,.13); --accent: #c4552a;
    --shadow: 0 1px 2px rgba(16,22,34,.08), 0 12px 28px -10px rgba(16,22,34,.22);
  }
  @media (prefers-color-scheme: dark) {
    :root {
      --bg: #101216; --panel: #1a1d23; --ink: #e8eaee; --soft: #949bA7;
      --line: rgba(255,255,255,.11);
      --shadow: 0 1px 2px rgba(0,0,0,.5), 0 14px 32px -12px rgba(0,0,0,.7);
    }
  }
  :root[data-theme="light"] {
    --bg: #eceef1; --panel: #f7f8fa; --ink: #1b1e24; --soft: #6d7480;
    --line: rgba(20,26,38,.13);
    --shadow: 0 1px 2px rgba(16,22,34,.08), 0 12px 28px -10px rgba(16,22,34,.22);
  }
  :root[data-theme="dark"] {
    --bg: #101216; --panel: #1a1d23; --ink: #e8eaee; --soft: #949ba7;
    --line: rgba(255,255,255,.11);
    --shadow: 0 1px 2px rgba(0,0,0,.5), 0 14px 32px -12px rgba(0,0,0,.7);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--ink);
    font-family: "PingFang SC", -apple-system, system-ui, "Noto Sans SC", sans-serif;
    line-height: 1.7; -webkit-text-size-adjust: 100%;
  }
  main { max-width: 600px; margin: 0 auto; padding: 34px 20px 72px; }
  .eyebrow {
    font-size: 11.5px; letter-spacing: .16em; text-transform: uppercase;
    color: var(--soft); margin: 0 0 8px;
  }
  h1 { font-size: 25px; line-height: 1.35; margin: 0 0 8px; text-wrap: balance; }
  .sub { color: var(--soft); font-size: 14px; margin: 0 0 28px; }
  .intro {
    background: var(--panel); border: 1px solid var(--line); border-radius: 12px;
    padding: 18px 20px; font-size: 14.5px; margin-bottom: 40px;
  }
  .intro strong { display: block; margin-bottom: 6px; }
  .intro ul { margin: 0; padding-left: 19px; }
  .intro li { margin: 7px 0; }
  #cards { display: flex; flex-direction: column; gap: 44px; }
  section { margin: 0; }
  h2 { font-size: 16.5px; margin: 0 0 3px; text-wrap: balance; }
  .note { color: var(--soft); font-size: 13.5px; margin: 0 0 14px; }
  .shot {
    width: 100%; display: block; border-radius: 10px; box-shadow: var(--shadow);
  }
  .meta {
    margin: 10px 0 0; font-size: 12px; color: var(--soft);
    font-variant-numeric: tabular-nums; letter-spacing: .01em;
  }
  .thumbrow {
    display: flex; gap: 20px; align-items: flex-start; flex-wrap: wrap;
    background: var(--panel); border: 1px solid var(--line);
    border-radius: 12px; padding: 18px; margin-top: 12px;
  }
  .thumbrow img { width: 200px; border-radius: 7px; display: block; flex: none;
                  box-shadow: var(--shadow); }
  .thumbrow p { margin: 0; font-size: 13.5px; color: var(--soft); flex: 1; min-width: 200px; }
  hr { border: 0; border-top: 1px solid var(--line); margin: 46px 0; }
</style>

<main>
  <p class="eyebrow">版式确认 · 第 0 步</p>
  <h1>「遇」· 卡片版式预览</h1>
  <p class="sub">1080 × 1440，版式 A「便签」。这些卡片是用最终的 <strong>card.js</strong> 现场渲染的，不是设计稿 —— 你看到的就是产品的输出。只有照片和二维码是占位的。</p>

  <div class="intro">
    <strong>请重点看这五件事：</strong>
    <ul>
      <li>场景行「muShenzhen · 2026.08.09」的分量够不够 —— 你说过要让人记住在什么场景下相遇</li>
      <li>「Sunny × Alex」双人署名的感觉对不对（还是你更想要「Sunny · mu」）</li>
      <li>照片和纸带 62.5 : 37.5 的比例，纸带是不是太厚 / 太薄</li>
      <li>一句话留空那张（①）是否仍然完整好看</li>
      <li><strong>最后一节</strong>：二维码在微信缩略图尺寸下够不够大</li>
    </ul>
  </div>

  <div id="cards"></div>

  <hr>

  <section>
    <h2>微信聊天里的缩略图尺寸</h2>
    <p class="note">微信气泡里的图约 200pt 宽。这是对方不点开时看到的大小 —— 判断二维码要不要再放大。</p>
    <div class="thumbrow">
      <img id="thumb" alt="缩略图尺寸模拟">
      <p>对方多半会点开放大再长按识别，所以缩略图里「看得出是个二维码」就够；但如果这里已经糊成一团，就该把二维码再调大。</p>
    </div>
  </section>
</main>

<script>
${config}
${card}

const ASSETS = {
  land: ${JSON.stringify(PHOTO_LAND)},
  port: ${JSON.stringify(PHOTO_PORT)},
  qr:   ${JSON.stringify(QR)},
};
const CASES = ${JSON.stringify(CASES)};
const DATE = ${JSON.stringify(process.env.YU_DATE || '')};

function load(src) {
  return new Promise((ok, err) => {
    const img = new Image();
    img.onload = () => ok(img);
    img.onerror = err;
    img.src = src;
  });
}

(async () => {
  const [land, port, qr] = await Promise.all([load(ASSETS.land), load(ASSETS.port), load(ASSETS.qr)]);
  const photos = { land, port };
  const dateStr = DATE || formatDate(new Date());
  const host = document.getElementById('cards');
  let first = null;

  for (const c of CASES) {
    const canvas = document.createElement('canvas');
    canvas.width = CARD.W;
    canvas.height = CARD.H;
    const info = renderCard(canvas.getContext('2d'), {
      img: photos[c.state.photo],
      qrImg: c.state.qr ? qr : null,
      name: c.state.name,
      line: c.state.line,
      event: c.state.event,
      dateStr,
    });
    const url = canvas.toDataURL('image/jpeg', 0.92);
    if (!first) first = url;

    const sec = document.createElement('section');
    const h2 = document.createElement('h2');
    h2.textContent = c.label;
    const note = document.createElement('p');
    note.className = 'note';
    note.textContent = c.note;
    const img = document.createElement('img');
    img.className = 'shot';
    img.src = url;
    img.alt = c.label;

    const meta = document.createElement('p');
    meta.className = 'meta';
    const bits = ['一句话 ' + (info.lineSize ? info.lineSize + 'px · ' + info.lineCount + ' 行' : '（空）')];
    bits.push('场景行 ' + info.sceneSize + 'px');
    if (info.truncated) bits.push('已截断');
    if (!info.hasQR) bits.push('无二维码');
    meta.textContent = '自适应结果：' + bits.join('　·　');

    sec.append(h2, note, img, meta);
    host.appendChild(sec);
  }

  document.getElementById('thumb').src = first;
})();
</script>
`;

writeFileSync(resolve(outPath), html);
console.log('wrote', resolve(outPath), (html.length / 1024).toFixed(0) + 'KB');
