// Shared card styling. All personal content comes from this browser's settings.
export const FONT = '"PingFang SC", -apple-system, system-ui, "Noto Sans SC", sans-serif';
export const THEME = {
  bg: '#FFFFFF', ink: '#080808', soft: '#595959', accent: '#080808', white: '#FFFFFF',
};
export const CARD = {
  W: 1080, PAD: 64, PHOTO_H: 900, FOCUS_Y: 0.38, QR: 330,
  HINT: '长按识别二维码 · Scan to connect',
  MIME: 'image/jpeg', QUALITY: 0.92,
};
// 照片墙（Supabase 中转，大屏每 5 秒拉取一次）
export const WALL = {
  url: 'https://mufriends.mushenzhen.xyz/proxy',
  anonKey: 'sb_publishable_TeAH2DCcPXl2e-MVtwyPOQ_kIEQ79YB',
};
