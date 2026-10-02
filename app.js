/**
 * ร้านจ๊าบบาร์ (JAAB BAR) - ICE REDEEM SPA
 * Logic for Marathon Runner Free Ice Redemption
 * Built with vanilla JavaScript & localStorage
 */

// Key used in browser localStorage
const STORAGE_KEY = 'JAABBAR_REDEEMED_BIBS_V1';

// Current active BIB in session
let activeBib = '';
let clockInterval = null;

// ==========================================
// 1. WEB AUDIO SYNTHESIZER (No external mp3 needed)
// ==========================================
class SoundFX {
  constructor() {
    this.ctx = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Play pleasant celebratory chime for redemption
  playSuccess() {
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
      notes.forEach((freq, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const startTime = this.ctx.currentTime + idx * 0.1;
        
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, startTime);
        
        gain.gain.setValueAtTime(0, startTime);
        gain.gain.linearRampToValueAtTime(0.2, startTime + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);
        
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        
        osc.start(startTime);
        osc.stop(startTime + 0.36);
      });
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Play alert buzz for already redeemed error
  playError() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, startTime);
      osc.frequency.setValueAtTime(130, startTime + 0.15);

      gain.gain.setValueAtTime(0.2, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.36);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }

  // Soft tap sound
  playPop() {
    try {
      this.init();
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, startTime);
      osc.frequency.exponentialRampToValueAtTime(300, startTime + 0.08);

      gain.gain.setValueAtTime(0.12, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.09);
    } catch (e) {
      console.warn('Audio play error:', e);
    }
  }
}

const sound = new SoundFX();

// ==========================================
// 2. STORAGE MANAGEMENT (localStorage)
// ==========================================

/**
 * Get all redeemed BIB records from localStorage
 * @returns {Object.<string, {bib: string, redeemedAt: string, formattedTime: string, refCode: string}>}
 */
function getRedeemedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (err) {
    console.error('Failed to read localStorage:', err);
    return {};
  }
}

/**
 * Check if a BIB number has already been redeemed
 * @param {string} bib
 * @returns {boolean}
 */
function isBibAlreadyRedeemed(bib) {
  const data = getRedeemedData();
  const cleanBib = String(bib).trim();
  return Boolean(data[cleanBib]);
}

/**
 * Mark a BIB number as redeemed
 * @param {string} bib
 * @returns {Object} the recorded receipt
 */
function markBibAsRedeemed(bib) {
  const cleanBib = String(bib).trim();
  const data = getRedeemedData();
  
  const now = new Date();
  const refCode = 'JB-' + cleanBib + '-' + Math.floor(1000 + Math.random() * 9000);
  const formattedTime = formatThaiDateTime(now);

  const record = {
    bib: cleanBib,
    redeemedAt: now.toISOString(),
    formattedTime: formattedTime,
    refCode: refCode
  };

  data[cleanBib] = record;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error('Failed to write to localStorage:', err);
  }

  return record;
}

/**
 * Clear all records (Useful for staff or testing)
 */
function clearAllRedeemed() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error('Failed to clear storage:', err);
  }
}

/**
 * Format a Date to a clean Thai string (e.g. 02/10/2026 15:30:45)
 */
function formatThaiDateTime(date) {
  const d = ('0' + date.getDate()).slice(-2);
  const m = ('0' + (date.getMonth() + 1)).slice(-2);
  const y = date.getFullYear() + 543; // Buddhist Era
  const hh = ('0' + date.getHours()).slice(-2);
  const mm = ('0' + date.getMinutes()).slice(-2);
  const ss = ('0' + date.getSeconds()).slice(-2);
  return `${d}/${m}/${y} ${hh}:${mm}:${ss}`;
}

// ==========================================
// 3. VIEW MANAGEMENT
// ==========================================

const VIEWS = ['viewSearch', 'viewCoupon', 'viewError', 'viewSuccess'];

/**
 * Switch the visible screen view
 * @param {string} targetViewId 
 */
function showView(targetViewId) {
  VIEWS.forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    if (id === targetViewId) {
      el.classList.remove('hidden');
    } else {
      el.classList.add('hidden');
    }
  });

  // Manage live clock interval for coupon view
  if (targetViewId === 'viewCoupon') {
    startLiveClock();
  } else {
    stopLiveClock();
  }

  // Auto-focus input on search view
  if (targetViewId === 'viewSearch') {
    const bibInput = document.getElementById('bibInput');
    if (bibInput) {
      setTimeout(() => {
        bibInput.focus();
        bibInput.select();
      }, 150);
    }
  }

  // Refresh lucide icons for newly rendered content
  if (window.lucide) {
    window.lucide.createIcons();
  }

  updateHeaderBadge();
}

/**
 * Live Security Clock on Coupon to prevent screenshot tampering
 */
function startLiveClock() {
  stopLiveClock();
  const updateClock = () => {
    const clockEl = document.getElementById('couponLiveClock');
    if (clockEl) {
      const now = new Date();
      const hh = ('0' + now.getHours()).slice(-2);
      const mm = ('0' + now.getMinutes()).slice(-2);
      const ss = ('0' + now.getSeconds()).slice(-2);
      clockEl.textContent = `${hh}:${mm}:${ss}`;
    }
  };
  updateClock();
  clockInterval = setInterval(updateClock, 1000);
}

function stopLiveClock() {
  if (clockInterval) {
    clearInterval(clockInterval);
    clockInterval = null;
  }
}

// ==========================================
// 4. CORE APPLICATION ACTIONS
// ==========================================

/**
 * Handle "ค้นหา / ตรวจสอบสิทธิ์" (Search & Check BIB)
 */
function handleCheckBib() {
  sound.playPop();
  const bibInput = document.getElementById('bibInput');
  const errorMsg = document.getElementById('bibInputError');
  const rawValue = bibInput.value.trim();

  // Validate: must be positive integer
  if (!rawValue || !/^\d+$/.test(rawValue)) {
    if (errorMsg) {
      errorMsg.textContent = 'กรุณากรอกหมายเลข BIB เป็นตัวเลขเท่านั้น';
      errorMsg.classList.remove('hidden');
    }
    bibInput.classList.add('border-rose-500', 'animate-shake');
    setTimeout(() => bibInput.classList.remove('animate-shake'), 500);
    sound.playError();
    return;
  }

  // Clear validation error styling
  if (errorMsg) errorMsg.classList.add('hidden');
  bibInput.classList.remove('border-rose-500');

  activeBib = rawValue;

  // RULE CHECK: 1 redemption per 1 BIB
  if (isBibAlreadyRedeemed(activeBib)) {
    // BIB HAS ALREADY BEEN USED!
    const data = getRedeemedData();
    const record = data[activeBib];

    // Populate Error View
    document.getElementById('errorBibDisplay').textContent = '#' + activeBib;
    document.getElementById('errorRedeemTime').textContent = record ? record.formattedTime : '-';
    document.getElementById('errorRedeemRef').textContent = record ? record.refCode : '-';

    // Play alert sound & trigger haptics
    sound.playError();
    if (navigator.vibrate) {
      navigator.vibrate([100, 50, 100]);
    }

    showToast('⚠️ สิทธิ์หมายเลข BIB นี้ถูกใช้ไปแล้ว!', 'error');
    showView('viewError');
    return;
  }

  // BIB is ELIGIBLE & UNUSED: Show Digital Coupon with Massive BIB Text!
  const couponBibEl = document.getElementById('displayCouponBib');
  if (couponBibEl) {
    couponBibEl.textContent = activeBib;
  }

  showView('viewCoupon');
}

/**
 * Handle "ยืนยันรับสิทธิ์" on the Digital Coupon
 */
function handleConfirmRedeem() {
  if (!activeBib) {
    showView('viewSearch');
    return;
  }

  // Safety check before saving
  if (isBibAlreadyRedeemed(activeBib)) {
    handleCheckBib();
    return;
  }

  // Save to localStorage
  const record = markBibAsRedeemed(activeBib);

  // Sound & Haptics
  sound.playSuccess();
  if (navigator.vibrate) {
    navigator.vibrate([120, 80, 200]);
  }

  // Fire celebratory confetti 🎉
  triggerCelebrationConfetti();

  // Populate Success View
  document.getElementById('successBibDisplay').textContent = '#' + record.bib;
  document.getElementById('successRedeemTime').textContent = record.formattedTime;
  document.getElementById('successRedeemRef').textContent = record.refCode;

  showToast(`🎉 รับสิทธิ์น้ำแข็งฟรีสำเร็จ! (BIB #${record.bib})`, 'success');
  showView('viewSuccess');

  // Clear the input in search view for next user
  const bibInput = document.getElementById('bibInput');
  if (bibInput) {
    bibInput.value = '';
    toggleClearButton();
  }
}

/**
 * Burst of confetti for victorious marathon feeling
 */
function triggerCelebrationConfetti() {
  if (typeof confetti !== 'function') return;

  const count = 200;
  const defaults = {
    origin: { y: 0.7 }
  };

  function fire(particleRatio, opts) {
    confetti(Object.assign({}, defaults, opts, {
      particleCount: Math.floor(count * particleRatio)
    }));
  }

  fire(0.25, {
    spread: 26,
    startVelocity: 55,
    colors: ['#00f2fe', '#4facfe', '#06b6d4']
  });
  fire(0.2, {
    spread: 60,
    colors: ['#f59e0b', '#10b981', '#38bdf8']
  });
  fire(0.35, {
    spread: 100,
    decay: 0.91,
    scalar: 0.8
  });
  fire(0.1, {
    spread: 120,
    startVelocity: 25,
    decay: 0.92,
    colors: ['#ffffff', '#00f2fe']
  });
}

// ==========================================
// 5. QUICK SHORTCUTS & INPUT HELPERS
// ==========================================

function setQuickBib(bibNumber) {
  sound.playPop();
  const input = document.getElementById('bibInput');
  if (input) {
    input.value = bibNumber;
    toggleClearButton();
    const errorMsg = document.getElementById('bibInputError');
    if (errorMsg) errorMsg.classList.add('hidden');
    input.classList.remove('border-rose-500');
    input.focus();
  }
}

function clearBibInput() {
  sound.playPop();
  const input = document.getElementById('bibInput');
  if (input) {
    input.value = '';
    input.focus();
    toggleClearButton();
    const errorMsg = document.getElementById('bibInputError');
    if (errorMsg) errorMsg.classList.add('hidden');
    input.classList.remove('border-rose-500');
  }
}

function toggleClearButton() {
  const input = document.getElementById('bibInput');
  const btnClear = document.getElementById('btnClearBib');
  if (!input || !btnClear) return;

  if (input.value.length > 0) {
    btnClear.classList.remove('hidden');
  } else {
    btnClear.classList.add('hidden');
  }
}

// ==========================================
// 6. HISTORY DRAWER & ADMIN CONTROLS
// ==========================================

function openHistoryModal() {
  sound.playPop();
  renderHistoryList();
  const modal = document.getElementById('modalHistory');
  if (modal) {
    modal.classList.remove('hidden');
  }
}

function closeHistoryModal() {
  sound.playPop();
  const modal = document.getElementById('modalHistory');
  if (modal) {
    modal.classList.add('hidden');
  }
}

function updateHeaderBadge() {
  const data = getRedeemedData();
  const total = Object.keys(data).length;
  const badge = document.getElementById('headerRedeemedBadge');
  const statTotal = document.getElementById('statTotalRedeemed');
  if (badge) badge.textContent = total;
  if (statTotal) statTotal.textContent = total;
}

function renderHistoryList(filterQuery = '') {
  const container = document.getElementById('historyListContainer');
  if (!container) return;

  const data = getRedeemedData();
  const list = Object.values(data).reverse(); // Newest first

  const query = filterQuery.trim().toLowerCase();
  const filtered = query 
    ? list.filter(item => item.bib.includes(query) || (item.refCode && item.refCode.toLowerCase().includes(query)))
    : list;

  updateHeaderBadge();

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="py-10 text-center text-slate-500 text-xs">
        <i data-lucide="inbox" class="w-8 h-8 mx-auto mb-2 text-slate-600"></i>
        <p>${query ? 'ไม่พบหมายเลข BIB ที่ค้นหา' : 'ยังไม่มีประวัติการรับสิทธิ์'}</p>
        <p class="text-[10px] text-slate-600 mt-1">เมื่อมีการกดรับสิทธิ์ จะแสดงรายการที่นี่</p>
      </div>
    `;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  container.innerHTML = filtered.map(item => `
    <div class="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex items-center justify-between gap-3 text-xs">
      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center font-display font-bold text-cyan-300 text-sm">
          #${item.bib}
        </div>
        <div>
          <div class="font-semibold text-slate-200 flex items-center gap-1">
            <span>BIB ${item.bib}</span>
            <span class="text-[10px] text-emerald-400 font-normal">● รับแล้ว</span>
          </div>
          <div class="text-[10px] text-slate-400 font-mono">${item.formattedTime}</div>
        </div>
      </div>
      <div class="text-right">
        <span class="text-[10px] font-mono text-amber-400/80 bg-slate-900 px-2 py-0.5 rounded border border-slate-800">
          ${item.refCode || 'JB-' + item.bib}
        </span>
      </div>
    </div>
  `).join('');

  if (window.lucide) window.lucide.createIcons();
}

/**
 * Reset localStorage with confirm prompt (useful for testing)
 */
function handleResetDatabase() {
  sound.playPop();
  const confirmed = window.confirm('ต้องการล้างประวัติการใช้สิทธิ์ทั้งหมดในเครื่องนี้เพื่อทดสอบใหม่หรือไม่?');
  if (confirmed) {
    clearAllRedeemed();
    renderHistoryList();
    showToast('ล้างข้อมูลเรียบร้อยแล้ว พร้อมเริ่มทดสอบใหม่', 'info');
    closeHistoryModal();
    showView('viewSearch');
  }
}

// ==========================================
// 7. TOAST NOTIFICATIONS
// ==========================================

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  const bgClass = type === 'error' 
    ? 'bg-rose-950/90 border-rose-500/60 text-rose-200' 
    : type === 'success'
    ? 'bg-emerald-950/90 border-emerald-500/60 text-emerald-200'
    : 'bg-slate-900/90 border-cyan-500/50 text-slate-200';

  toast.className = `toast-enter px-4 py-2.5 rounded-2xl border backdrop-blur-md shadow-xl text-xs font-semibold flex items-center gap-2 max-w-sm ${bgClass}`;
  toast.innerHTML = `<span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// ==========================================
// 8. EVENT LISTENERS & INITIALIZATION
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // Initialize Lucide icons
  if (window.lucide) {
    window.lucide.createIcons();
  }

  // Update badge
  updateHeaderBadge();

  // Listen to input changes
  const bibInput = document.getElementById('bibInput');
  if (bibInput) {
    // Only allow numeric characters
    bibInput.addEventListener('input', (e) => {
      e.target.value = e.target.value.replace(/[^0-9]/g, '');
      toggleClearButton();
      const errorMsg = document.getElementById('bibInputError');
      if (errorMsg && e.target.value.length > 0) {
        errorMsg.classList.add('hidden');
        bibInput.classList.remove('border-rose-500');
      }
    });

    // Enter key submits form
    bibInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        handleCheckBib();
      }
    });
  }

  // History search filter
  const historySearchInput = document.getElementById('historySearchInput');
  if (historySearchInput) {
    historySearchInput.addEventListener('input', (e) => {
      renderHistoryList(e.target.value);
    });
  }

  // Modal open/close listeners
  const btnOpenHistory = document.getElementById('btnOpenHistory');
  if (btnOpenHistory) {
    btnOpenHistory.addEventListener('click', openHistoryModal);
  }

  const btnCloseHistory = document.getElementById('btnCloseHistory');
  if (btnCloseHistory) {
    btnCloseHistory.addEventListener('click', closeHistoryModal);
  }

  // Close modal when tapping backdrop
  const modalHistory = document.getElementById('modalHistory');
  if (modalHistory) {
    modalHistory.addEventListener('click', (e) => {
      if (e.target === modalHistory) {
        closeHistoryModal();
      }
    });
  }

  // Default view
  showView('viewSearch');
});
