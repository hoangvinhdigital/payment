/* ====================================================
   app.js – Payment Page Logic
   ==================================================== */

// ── BANK DATA ─────────────────────────────────────────
const BANKS = {
  mb1: {
    short:    'MBBank',
    full:     'Ngân Hàng Quân Đội',
    account:  '090695',
    display:  '090695',
    owner:    'NGUYEN HOANG VINH',
    color:    '#2563eb',
    bankCode: 'MB',           // VietQR bank code
    useVietQR: true,
    logo:     createMBLogo,
  },
  mb2: {
    short:    'MBBank',
    full:     'Ngân Hàng Quân Đội',
    account:  '596783',
    display:  '596783',
    owner:    'NGUYEN HOANG VINH',
    color:    '#2563eb',
    bankCode: 'MB',           // VietQR bank code
    useVietQR: true,
    logo:     createMBLogo,
  },
  zalopay: {
    short:    'ZaloPay',
    full:     'Ví điện tử ZaloPay',
    account:  '99ZP25308M37546289',
    display:  '039 777 2987',
    owner:    'ZALOPAY_NGUYEN HOANG VINH',
    color:    '#008FE5',
    bankCode: 'BVB',
    useVietQR: true,
    qrUrl:    'https://api.vietqr.io/image/970454-99ZP25308M37546289-W0b99Bg.jpg?accountName=ZALOPAY%20NGUYEN%20HOANG%20VINH&amount=0',
    logo:     createZaloPayLogo,
  },
};

let currentBank = null;

// ── LOGO CREATORS (returns HTML string) ─────────────
function createMBLogo() {
  return `<img src="https://api.vietqr.io/img/MB.png" alt="MBBank" style="width:100%;height:100%;object-fit:contain;" onerror="this.outerHTML='<span style=color:#00308F;font-weight:800;font-size:12px>MB</span>'" />`;
}
function createZaloPayLogo() {
  return `<img src="https://cdn.haitrieu.com/wp-content/uploads/2022/10/Logo-ZaloPay-Square.png" alt="ZaloPay" style="width:100%;height:100%;object-fit:cover; border-radius:50%;" onerror="this.outerHTML='<span style=color:#008FE5;font-weight:800;font-size:14px>ZP</span>'" />`;
}

// ── QR CODE – VietQR API (banks) / Canvas fallback (MoMo) ────────

/**
 * Build VietQR image URL.
 * Template: qr_only (480×480) – chỉ mã QR thuần, không có header/footer
 * (thông tin đã hiển thị trong receipt bên dưới)
 */
function buildVietQRUrl(bank, amount, note) {
  if (bank.qrUrl) {
    return bank.qrUrl;
  }
  const base = `https://img.vietqr.io/image/${bank.bankCode}-${bank.account}-qr_only.png`;
  const params = new URLSearchParams();
  params.set('accountName', bank.owner);
  if (note)   params.set('addInfo', note);
  if (amount) params.set('amount', amount);
  return `${base}?${params.toString()}`;
}

/** Show VietQR API image inside the modal QR frame */
function showVietQRImage(bank, amount, note) {
  const frame = document.getElementById('modal-qr-frame');

  // Build or reuse <img>
  let img = frame.querySelector('img.vietqr-img');
  const canvas = frame.querySelector('canvas#qr-canvas');

  if (canvas) canvas.style.display = 'none';

  if (!img) {
    img = document.createElement('img');
    img.className = 'vietqr-img';
    img.alt = 'Mã QR VietQR';
    // qr_only: 480×480 → hiển thị tại 240px (pixel-perfect @ 2×)
    img.style.cssText = 'display:block;width:240px;height:240px;object-fit:contain;border-radius:6px;image-rendering:crisp-edges;';
    frame.appendChild(img);
  }

  img.style.display = 'block';

  // Loading state
  img.style.opacity = '0.4';
  img.style.filter  = 'blur(4px)';

  const url = buildVietQRUrl(bank, amount, note);
  img.src = '';
  img.src = url;

  img.onload  = () => { img.style.opacity = '1'; img.style.filter = 'none'; };
  img.onerror = () => {
    // Fallback: draw decorative canvas QR
    img.style.display = 'none';
    if (canvas) {
      canvas.style.display = 'block';
      generateCanvasQR(canvas, `${bank.bankCode}:${bank.account}`);
    }
    showToast('⚠️ Không tải được QR – kiểm tra kết nối mạng', '');
  };
}

/** Legacy canvas-based decorative QR (used for MoMo & fallback) */
function generateCanvasQR(canvas, text) {
  const ctx = canvas.getContext('2d');
  const size = canvas.width;
  ctx.clearRect(0, 0, size, size);

  const hash = simpleHash(text);
  const modules = 21;
  const cell = Math.floor(size / modules);

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, size, size);
  ctx.fillStyle = '#000000';

  drawFinder(ctx, 0, 0, cell);
  drawFinder(ctx, (modules - 7) * cell, 0, cell);
  drawFinder(ctx, 0, (modules - 7) * cell, cell);

  const rng = seededRNG(hash);
  for (let r = 0; r < modules; r++) {
    for (let c = 0; c < modules; c++) {
      if (isFinderZone(r, c, modules)) continue;
      if (rng() > 0.5) ctx.fillRect(c * cell, r * cell, cell, cell);
    }
  }

  const lSize = cell * 4;
  const lX = (size - lSize) / 2;
  const lY = (size - lSize) / 2;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(lX - 2, lY - 2, lSize + 4, lSize + 4);
  ctx.fillStyle = '#000000';
  ctx.font = `bold ${cell * 1.5}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('QR', size / 2, size / 2);
}

function drawFinder(ctx, x, y, cell) {
  // Outer 7×7 black
  ctx.fillStyle = '#000000';
  ctx.fillRect(x, y, cell * 7, cell * 7);
  // Inner white 5×5
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x + cell, y + cell, cell * 5, cell * 5);
  // Inner black 3×3
  ctx.fillStyle = '#000000';
  ctx.fillRect(x + cell * 2, y + cell * 2, cell * 3, cell * 3);
}

function isFinderZone(r, c, m) {
  return (r < 9 && c < 9) || (r < 9 && c >= m - 8) || (r >= m - 8 && c < 9);
}

function simpleHash(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return h;
}

function seededRNG(seed) {
  let s = seed;
  return function () {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xFFFFFFFF;
  };
}

// ── OPEN / CLOSE QR MODAL ─────────────────────────────
function openQR(bankKey) {
  const bank = BANKS[bankKey];
  if (!bank) return;
  currentBank = bank;

  // Set header
  document.getElementById('modal-bank-name').textContent = bank.short;
  document.getElementById('modal-bank-full').textContent = bank.full;
  document.getElementById('modal-account').textContent   = bank.display;
  document.getElementById('modal-owner').textContent     = bank.owner;

  // Set logo
  const logoEl = document.getElementById('modal-logo');
  logoEl.innerHTML = bank.logo();
  logoEl.style.background = bank.color + '22';

  // Set QR frame tint
  const frame = document.getElementById('modal-qr-frame');
  frame.style.boxShadow = `0 0 0 4px ${bank.color}33`;

  // Generate / fetch QR
  const canvas = document.getElementById('qr-canvas');
  if (bank.useVietQR) {
    // Fetch real QR from VietQR API
    canvas.style.display = 'none';
    showVietQRImage(bank);
  } else {
    // MoMo: show canvas, hide any previous VietQR img
    const existingImg = frame.querySelector('img.vietqr-img');
    if (existingImg) existingImg.style.display = 'none';
    canvas.style.display = 'block';
    generateCanvasQR(canvas, bank.qrData);
  }

  // Update scan label
  const scanLabel = document.querySelector('.scan-label');
  if (scanLabel) {
    scanLabel.textContent = bank.useVietQR
      ? 'Quét bằng app ngân hàng bất kỳ'
      : (bankKey === 'zalopay' ? 'Quét bằng ứng dụng ZaloPay' : 'Quét bằng ứng dụng e-Wallet');
  }

  // Set Deeplink
  const deeplinkBtn = document.getElementById('modal-deeplink-btn');
  if (deeplinkBtn) {
    if (bank.useVietQR) {
      deeplinkBtn.style.display = 'flex';
      deeplinkBtn.href = `https://dl.vietqr.io/pay?app=&ba=${bank.account}@${bank.bankCode}`;
    } else {
      deeplinkBtn.style.display = 'none';
      deeplinkBtn.href = '#';
    }
  }

  // Open
  const overlay = document.getElementById('qr-modal');
  if (!overlay.classList.contains('open')) {
    playSwooshSound();
  }
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeQR() {
  const overlay = document.getElementById('qr-modal');
  if (overlay.classList.contains('open')) {
    playCloseSound();
  }
  overlay.classList.remove('open');
  document.body.style.overflow = '';
  currentBank = null;
}

function closeQRModal(e) {
  if (e.target === document.getElementById('qr-modal')) closeQR();
}

// Keyboard close
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeQR();
});

// ── AUDIO ─────────────────────────────────────────────
function playPopSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(600, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(150, ctx.currentTime + 0.1);
    
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch(e) {}
}

function playSwooshSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(300, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

function playCloseSound() {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(400, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.15);
    
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.15);
  } catch(e) {}
}

// ── COPY HELPERS ──────────────────────────────────────
function copyText(text, btn) {
  playPopSound();
  
  navigator.clipboard.writeText(text).then(() => {
    if (btn) {
      btn.classList.add('copied');
      btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`;
      setTimeout(() => {
        btn.classList.remove('copied');
        btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`;
      }, 2000);
    }
    showToast('✓ Đã sao chép vào clipboard!', 'success');
  }).catch(() => {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('✓ Đã sao chép!', 'success');
  });
}

function copyModalAcc() {
  if (currentBank) copyText(currentBank.account, null);
}

// ── TOAST ──────────────────────────────────────────────
let toastTimeout;
function showToast(msg, type = '') {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show ' + type;
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    toast.className = 'toast';
  }, 2800);
}

// ── PARTICLES ─────────────────────────────────────────
(function initParticles() {
  const canvas = document.getElementById('particles-canvas');
  const ctx    = canvas.getContext('2d');
  let W, H, particles = [];

  function resize() {
    W = canvas.width  = window.innerWidth;
    H = canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function Particle() {
    this.reset();
  }
  Particle.prototype.reset = function () {
    this.x  = Math.random() * W;
    this.y  = Math.random() * H;
    this.r  = Math.random() * 1.5 + 0.3;
    this.vx = (Math.random() - 0.5) * 0.3;
    this.vy = (Math.random() - 0.5) * 0.3;
    this.alpha = Math.random() * 0.5 + 0.1;
    const hues = [260, 210, 155, 320, 200];
    this.hue = hues[Math.floor(Math.random() * hues.length)];
  };
  Particle.prototype.update = function () {
    this.x += this.vx;
    this.y += this.vy;
    if (this.x < 0 || this.x > W || this.y < 0 || this.y > H) this.reset();
  };
  Particle.prototype.draw = function (ctx) {
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2);
    ctx.fillStyle = `hsla(${this.hue},80%,75%,${this.alpha})`;
    ctx.fill();
  };

  for (let i = 0; i < 80; i++) particles.push(new Particle());

  function loop() {
    ctx.clearRect(0, 0, W, H);
    particles.forEach(p => { p.update(); p.draw(ctx); });
    requestAnimationFrame(loop);
  }
  loop();
})();

// ── SCROLL REVEAL ─────────────────────────────────────
(function initReveal() {
  const elements = document.querySelectorAll('.hero-card, .bank-card, .note-section');
  elements.forEach((el, i) => {
    el.classList.add('reveal');
    el.style.transitionDelay = (i * 80) + 'ms';
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });

  elements.forEach(el => observer.observe(el));
})();

// ── AVATAR FALLBACK ───────────────────────────────────
(function () {
  const img = document.getElementById('avatar-img');
  if (img) {
    img.addEventListener('error', () => {
      img.style.display = 'none';
      const placeholder = document.createElement('div');
      placeholder.style.cssText = `
        position:absolute; inset:4px; border-radius:50%;
        background: linear-gradient(135deg, #8b5cf6, #3b82f6);
        display:flex; align-items:center; justify-content:center;
        font-size:32px; font-weight:700; color:#fff;
      `;
      placeholder.textContent = 'HN';
      img.parentElement.appendChild(placeholder);
    });
  }
})();
