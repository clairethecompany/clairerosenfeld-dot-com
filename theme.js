/**
 * Theme Engine for clairerosenfeld.com
 *
 * Manages multiple color themes with smooth transitions, persistence,
 * time-based auto-switching, and accessibility contrast checking.
 */

const THEMES = {
  midnight: {
    name: 'Midnight',
    icon: '&#127769;',
    bg: '#0f172a',
    surface: '#1e293b',
    border: '#334155',
    text: '#e2e8f0',
    textMuted: '#94a3b8',
    textDim: '#64748b',
    accent: '#7c3aed',
    accentSecondary: '#ec4899',
    accentTertiary: '#3b82f6',
    success: '#4ade80',
    warning: '#f59e0b',
    error: '#f87171',
    glass: 'rgba(255, 255, 255, 0.05)',
  },
  cyberpunk: {
    name: 'Cyberpunk',
    icon: '&#129302;',
    bg: '#0a0a0f',
    surface: '#12121a',
    border: '#1f1f2e',
    text: '#00ff88',
    textMuted: '#00cc6a',
    textDim: '#008844',
    accent: '#ff0066',
    accentSecondary: '#00ffff',
    accentTertiary: '#ff6600',
    success: '#00ff88',
    warning: '#ffff00',
    error: '#ff0033',
    glass: 'rgba(0, 255, 136, 0.03)',
  },
  sunset: {
    name: 'Sunset',
    icon: '&#127749;',
    bg: '#1a0a1e',
    surface: '#2a1230',
    border: '#3d1f45',
    text: '#fde68a',
    textMuted: '#d4a574',
    textDim: '#8b6a4f',
    accent: '#f97316',
    accentSecondary: '#e11d48',
    accentTertiary: '#a855f7',
    success: '#84cc16',
    warning: '#f59e0b',
    error: '#ef4444',
    glass: 'rgba(249, 115, 22, 0.05)',
  },
  forest: {
    name: 'Forest',
    icon: '&#127794;',
    bg: '#0a1a0f',
    surface: '#122218',
    border: '#1e3a25',
    text: '#d1fae5',
    textMuted: '#86efac',
    textDim: '#4ade80',
    accent: '#22c55e',
    accentSecondary: '#14b8a6',
    accentTertiary: '#84cc16',
    success: '#4ade80',
    warning: '#fbbf24',
    error: '#f87171',
    glass: 'rgba(34, 197, 94, 0.05)',
  },
  light: {
    name: 'Corporate',
    icon: '&#128084;',
    bg: '#f8fafc',
    surface: '#ffffff',
    border: '#e2e8f0',
    text: '#0f172a',
    textMuted: '#475569',
    textDim: '#94a3b8',
    accent: '#2563eb',
    accentSecondary: '#7c3aed',
    accentTertiary: '#0891b2',
    success: '#16a34a',
    warning: '#ca8a04',
    error: '#dc2626',
    glass: 'rgba(0, 0, 0, 0.02)',
  },
};

class ThemeEngine {
  constructor() {
    this.currentTheme = null;
    this.transitionDuration = 400;
    this.listeners = [];
    this.autoSwitchEnabled = false;
    this.autoSwitchInterval = null;
    this.contrastWarnings = [];
  }

  init() {
    const saved = localStorage.getItem('claire-theme');
    const theme = saved && THEMES[saved] ? saved : this.getTimeBasedTheme();
    this.apply(theme, false);
    this.renderSwitcher();
    this.setupKeyboardShortcut();
  }

  apply(themeKey, animate = true) {
    const theme = THEMES[themeKey];
    if (!theme) return;

    const root = document.documentElement;

    if (animate) {
      root.style.transition = `all ${this.transitionDuration}ms ease`;
      setTimeout(() => { root.style.transition = ''; }, this.transitionDuration + 50);
    }

    Object.entries(theme).forEach(([key, value]) => {
      if (key === 'name' || key === 'icon') return;
      const cssVar = '--' + key.replace(/([A-Z])/g, '-$1').toLowerCase();
      root.style.setProperty(cssVar, value);
    });

    root.style.setProperty('--theme-name', `"${theme.name}"`);
    this.currentTheme = themeKey;
    localStorage.setItem('claire-theme', themeKey);

    document.body.style.background = theme.bg;
    document.body.style.color = theme.text;

    this.checkContrast(theme);
    this.notifyListeners(themeKey, theme);
    this.updateSwitcherUI(themeKey);
  }

  getTimeBasedTheme() {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 9) return 'sunset';
    if (hour >= 9 && hour < 17) return 'light';
    if (hour >= 17 && hour < 20) return 'sunset';
    if (hour >= 20 && hour < 23) return 'forest';
    return 'midnight';
  }

  next() {
    const keys = Object.keys(THEMES);
    const idx = keys.indexOf(this.currentTheme);
    const nextIdx = (idx + 1) % keys.length;
    this.apply(keys[nextIdx]);
  }

  previous() {
    const keys = Object.keys(THEMES);
    const idx = keys.indexOf(this.currentTheme);
    const prevIdx = (idx - 1 + keys.length) % keys.length;
    this.apply(keys[prevIdx]);
  }

  enableAutoSwitch(intervalMs = 30000) {
    this.autoSwitchEnabled = true;
    this.autoSwitchInterval = setInterval(() => this.next(), intervalMs);
  }

  disableAutoSwitch() {
    this.autoSwitchEnabled = false;
    if (this.autoSwitchInterval) {
      clearInterval(this.autoSwitchInterval);
      this.autoSwitchInterval = null;
    }
  }

  onThemeChange(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  notifyListeners(key, theme) {
    this.listeners.forEach((cb) => cb(key, theme));
  }

  checkContrast(theme) {
    this.contrastWarnings = [];
    const bgLuminance = this.getLuminance(theme.bg);
    const textLuminance = this.getLuminance(theme.text);
    const ratio = this.getContrastRatio(bgLuminance, textLuminance);
    if (ratio < 4.5) {
      this.contrastWarnings.push({
        pair: 'bg/text',
        ratio: ratio.toFixed(2),
        level: ratio < 3 ? 'fail' : 'aa-large-only',
      });
    }
  }

  getLuminance(hex) {
    const rgb = this.hexToRgb(hex);
    if (!rgb) return 0;
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }

  getContrastRatio(l1, l2) {
    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);
    return (lighter + 0.05) / (darker + 0.05);
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : null;
  }

  renderSwitcher() {
    const switcher = document.createElement('div');
    switcher.id = 'theme-switcher';
    switcher.style.cssText = `
      position: fixed; bottom: 1.5rem; right: 1.5rem; display: flex; gap: 0.35rem;
      padding: 0.5rem; background: rgba(15,23,42,0.9); border: 1px solid #334155;
      border-radius: 12px; backdrop-filter: blur(10px); z-index: 9999;
    `;

    Object.entries(THEMES).forEach(([key, theme]) => {
      const btn = document.createElement('button');
      btn.innerHTML = theme.icon;
      btn.title = theme.name;
      btn.dataset.theme = key;
      btn.style.cssText = `
        width: 36px; height: 36px; border: 2px solid transparent; border-radius: 8px;
        background: ${theme.bg}; cursor: pointer; font-size: 1rem;
        display: flex; align-items: center; justify-content: center;
        transition: all 0.2s;
      `;
      btn.addEventListener('click', () => this.apply(key));
      btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.15)'; });
      btn.addEventListener('mouseleave', () => { btn.style.transform = 'scale(1)'; });
      switcher.appendChild(btn);
    });

    document.body.appendChild(switcher);
  }

  updateSwitcherUI(activeKey) {
    const switcher = document.getElementById('theme-switcher');
    if (!switcher) return;
    switcher.querySelectorAll('button').forEach((btn) => {
      const isActive = btn.dataset.theme === activeKey;
      btn.style.borderColor = isActive ? THEMES[activeKey].accent : 'transparent';
      btn.style.boxShadow = isActive ? `0 0 8px ${THEMES[activeKey].accent}44` : 'none';
    });
  }

  setupKeyboardShortcut() {
    document.addEventListener('keydown', (e) => {
      if (e.key === 't' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const tag = document.activeElement?.tagName;
        if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
        this.next();
      }
    });
  }

  getThemeInfo() {
    return {
      current: this.currentTheme,
      name: THEMES[this.currentTheme]?.name,
      available: Object.keys(THEMES),
      contrastWarnings: this.contrastWarnings,
      autoSwitch: this.autoSwitchEnabled,
    };
  }

  exportTheme() {
    return JSON.stringify(THEMES[this.currentTheme], null, 2);
  }
}

// Analytics tracker (fake but fun)
class VisitorTracker {
  constructor() {
    this.sessionId = 'sess-' + Math.random().toString(36).slice(2, 10);
    this.pageViews = [];
    this.interactions = [];
    this.startTime = Date.now();
  }

  trackPageView(page) {
    this.pageViews.push({
      page,
      timestamp: new Date().toISOString(),
      referrer: document.referrer || 'direct',
      viewport: `${window.innerWidth}x${window.innerHeight}`,
    });
    this.updateVisitorCount();
  }

  trackInteraction(type, target, metadata = {}) {
    this.interactions.push({
      type,
      target,
      metadata,
      timestamp: new Date().toISOString(),
      timeOnPage: Math.round((Date.now() - this.startTime) / 1000),
    });
  }

  updateVisitorCount() {
    const key = 'claire-visitor-count';
    const count = parseInt(localStorage.getItem(key) || '0', 10) + 1;
    localStorage.setItem(key, String(count));
    const el = document.getElementById('visitor-count');
    if (el) el.textContent = this.formatCount(count);
  }

  formatCount(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
    return String(n);
  }

  getSessionSummary() {
    const duration = Math.round((Date.now() - this.startTime) / 1000);
    return {
      sessionId: this.sessionId,
      duration: `${Math.floor(duration / 60)}m ${duration % 60}s`,
      pageViews: this.pageViews.length,
      interactions: this.interactions.length,
      topInteractions: this.getTopInteractions(),
      scrollDepth: this.getScrollDepth(),
    };
  }

  getTopInteractions() {
    const counts = {};
    this.interactions.forEach((i) => {
      counts[i.type] = (counts[i.type] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([type, count]) => ({ type, count }));
  }

  getScrollDepth() {
    const scrolled = window.scrollY + window.innerHeight;
    const total = document.documentElement.scrollHeight;
    return Math.round((scrolled / total) * 100);
  }
}

// Initialize on load
window.addEventListener('DOMContentLoaded', () => {
  window.themeEngine = new ThemeEngine();
  window.themeEngine.init();

  window.tracker = new VisitorTracker();
  window.tracker.trackPageView(window.location.pathname);

  // Track theme changes
  window.themeEngine.onThemeChange((key) => {
    window.tracker.trackInteraction('theme_change', key);
  });

  // Track clicks
  document.addEventListener('click', (e) => {
    const target = e.target.closest('a, button, .project');
    if (target) {
      window.tracker.trackInteraction('click', target.textContent?.slice(0, 30), {
        tag: target.tagName,
        href: target.href || null,
      });
    }
  });

  // Console helper
  console.log('%cTheme Commands:', 'color: #7c3aed; font-weight: bold;');
  console.log('  themeEngine.next()          - Next theme');
  console.log('  themeEngine.apply("cyberpunk") - Apply specific theme');
  console.log('  themeEngine.enableAutoSwitch() - Party mode');
  console.log('  themeEngine.getThemeInfo()  - Current theme info');
  console.log('  tracker.getSessionSummary() - Your visit stats');
  console.log('  Press "t" to cycle themes');
});
