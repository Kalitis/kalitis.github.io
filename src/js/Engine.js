import {
  SIG,
  DEFAULT_BRIDGE_DELAY,
  STRUCTURAL_DELAY,
  SABRUNE_DELAY,
  EFFECTOR_DELAY_FAST,
  EFFECTOR_DELAY_COMPLEX,
  CIRCLE_COMPLEX_DELAY,
  CATEGORY_MAP
} from './constants.js';
import {
  RUNE_DB,
  SUBRUNE_RULES,
  ensureSimpleCircleDef
} from './runeDb.js';
import {
  clone,
  hostHasSubruneAttachmentPoints,
  isSubruneCompatibleHost,
  truthyInput,
  isFreshInput,
  isCarrierSignal,
  signalName,
  LIGHT_BASE_WAVELENGTHS,
  isLightRuneNode,
  getLightBaseWavelength,
  wavelengthToCSS,
  wavelengthToColorName,
  cssRgbWithAlpha,
  computeLightSpectrumState,
  ensureButtonState,
  isBlinkSourceType,
  isAnySourceType,
  isStrongSourceLike,
  isWeakSourceLike,
  buildPrimaryMeta,
  getOrdinaryStrongSourceFlag,
  getCensorStrongSourceFlag,
  clampAutoDelay,
  isStrongPrimarySourceTag,
  stringToBits,
  numberToBits,
  encodeValueToBits,
  numberToBase7Digits,
  encodeValueToDirs,
  isCircleSimple,
  capText,
  safeDisplay,
  encodeSimpleUnits,
  getMaterialCapacity,
  getVirtualCapacity,
  getNodePortPosition,
  getSubruneAttachmentPos
} from './utils.js';
import { Node } from './Node.js';
import { Bridge } from './Bridge.js';
import { Connection } from './Connection.js';
import { SignalParticle } from './SignalParticle.js';
import { drawBar, drawAttachmentPoints } from './drawing.js';

export class Engine {
  constructor() {
    this.nodes = [];
    this.connections = [];
    this.bridges = [];
    this.particles = [];
    this.eventQueue = [];
    this.nextId = 1;

    this.canvas = document.getElementById('main');
    this.ctx = this.canvas.getContext('2d');
    this.consoleEl = document.getElementById('consoleContent');
    this.tooltip = document.getElementById('tooltip');
    this.modal = document.getElementById('editModal');

    this.editingTarget = null;
    this.simulationRunning = false;
    this.initialized = false;
    this.isDeleteMode = false;
    this.simTime = 0;
    this.realTimeOffset = 0;
    this.processedEvents = 0;
    this.maxFirstActivationDelay = 0;
    this.lastStartedSourceId = null;
    this.nextSourceSerial = 1;
    this.activeSourceTags = new Set();
    this.viewport = { x: 0, y: 0, scale: 1 };
    this.bounds = { minX: -2400, minY: -2400, maxX: 2400, maxY: 2400 };
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.cssCanvasWidth = 0;
    this.cssCanvasHeight = 0;
    this.isMobile = window.matchMedia('(max-width: 900px)').matches;
    this.mobilePanel = null;
    this.connectMode = false;
    this.quickConnectFromNode = null;
    this.quickConnectPendingTarget = null;
    this._lastBucketDiagnostics = null;
    this.lastStormInfo = null;
    this.quickConnectPopupEl = null;
    this.quickConnectPopupHeadEl = null;
    this.quickConnectPopupBodyEl = null;
    this.quickConnectPopupCancelEl = null;
    this._quickConnectPopupInitialized = false;
    this.dragConnectPreview = null;
    this.bridgeDragState = null;

    this.resize();
    window.addEventListener('resize', () => { this.isMobile = window.matchMedia('(max-width: 900px)').matches; this.resize(); this.refreshStats(); this.syncMobileUI(); });
    this.renderSidebar();
    this.initQuickConnectPopup();
    this.initInput();
    this.loop();
    this.refreshStats();
    this.syncMobileUI();
    this.applyStaticUi();
    this.resetBootConsole();
  }

  applyStaticUi() {
    document.title = 'Runology Engine v20.9 — Final Clean Build';
    const mobileTitle = document.querySelector('#mobile-bar .mobile-title');
    if (mobileTitle) mobileTitle.textContent = 'ᚱ Runology Engine v20.9';
  }

  resetBootConsole() {
    if (!this.consoleEl) return;
    this.consoleEl.innerHTML = '';
    this.log('⚙️ Runology Engine v20.9', 'sys');
  }

  resize() {
    const wrap = document.getElementById('workspace');
    this.dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    this.cssCanvasWidth = wrap.clientWidth;
    this.cssCanvasHeight = wrap.clientHeight;
    this.canvas.width = Math.max(1, Math.round(this.cssCanvasWidth * this.dpr));
    this.canvas.height = Math.max(1, Math.round(this.cssCanvasHeight * this.dpr));
    this.canvas.style.width = this.cssCanvasWidth + 'px';
    this.canvas.style.height = this.cssCanvasHeight + 'px';
    this.clampViewport();
  }

  clampViewport() {
    const minScale = this.isMobile ? 0.38 : 0.28;
    const maxScale = this.isMobile ? 2.1 : 2.8;
    this.viewport.scale = Math.max(minScale, Math.min(maxScale, this.viewport.scale));
    const visibleW = this.cssCanvasWidth / this.viewport.scale;
    const visibleH = this.cssCanvasHeight / this.viewport.scale;
    const minX = this.bounds.minX;
    const minY = this.bounds.minY;
    const maxX = this.bounds.maxX - visibleW;
    const maxY = this.bounds.maxY - visibleH;
    this.viewport.x = Math.max(minX, Math.min(maxX, this.viewport.x));
    this.viewport.y = Math.max(minY, Math.min(maxY, this.viewport.y));
  }

  screenToWorld(x, y) {
    return {
      x: x / this.viewport.scale + this.viewport.x,
      y: y / this.viewport.scale + this.viewport.y
    };
  }

  panBy(dxScreen, dyScreen) {
    this.viewport.x -= dxScreen / this.viewport.scale;
    this.viewport.y -= dyScreen / this.viewport.scale;
    this.clampViewport();
  }

  zoomAt(factor, screenX, screenY) {
    const before = this.screenToWorld(screenX, screenY);
    this.viewport.scale *= factor;
    this.clampViewport();
    const after = this.screenToWorld(screenX, screenY);
    this.viewport.x += before.x - after.x;
    this.viewport.y += before.y - after.y;
    this.clampViewport();
    this.refreshStats();
  }

  syncMobileUI() {
    document.body.classList.toggle('mobile-sidebar-open', this.mobilePanel === 'library' && this.isMobile);
    document.body.classList.toggle('mobile-console-open', this.mobilePanel === 'console' && this.isMobile);
  }

  toggleMobilePanel(kind) {
    if (!this.isMobile) return;
    this.mobilePanel = this.mobilePanel === kind ? null : kind;
    this.syncMobileUI();
  }

  log(message, type = 'sys') {
    const div = document.createElement('div');
    div.className = 'log-entry log-' + type;
    const prefix = this.initialized ? `[${Math.round(this.simTime)}мс]` : '[SYS]';
    div.innerHTML = '<span class="log-time">' + prefix + '</span>' + message;
    this.consoleEl.appendChild(div);
    this.consoleEl.scrollTop = this.consoleEl.scrollHeight;
    while (this.consoleEl.children.length > 80) {
      this.consoleEl.removeChild(this.consoleEl.firstChild);
    }
  }

  refreshStats() {
    document.getElementById('statTime').textContent = Math.round(this.simTime) + ' мс';
    document.getElementById('statQueue').textContent = String(this.eventQueue.length);
    document.getElementById('statDelay').textContent = Math.round(this.maxFirstActivationDelay) + ' мс';
    document.getElementById('statProcessed').textContent = String(this.processedEvents);
    document.getElementById('statMode').textContent = this.simulationRunning ? 'running' : (this.initialized ? 'paused' : 'idle');
    const sourceCountEl = document.getElementById('statSources');
    if (sourceCountEl) sourceCountEl.textContent = String(this.activeSourceTags.size);
    const zoomEl = document.getElementById('statZoom');
    if (zoomEl) zoomEl.textContent = Math.round(this.viewport.scale * 100) + '%';
  }

  resizeSpecialNode(node) {
    if (!node || !node.def) return;
    const type = node.def.type;
    if (isCircleSimple(node)) {
      this.ensureSimpleCircleNode(node);
      return;
    }
    if (type === 'effector_light_rgb' || node.type === 'mono_light' || node.type === 'miro_light') {
      node.w = Math.max(node.w, 182);
      node.h = Math.max(node.h, 72);
      return;
    }
    if (type === 'logic_reverse' || type === 'logic_reverse_auto') {
      node.w = Math.max(node.w, 188);
      node.h = Math.max(node.h, 72);
      return;
    }
    if (type === 'censor_moment' || type === 'censor_hold') {
      node.w = Math.max(node.w, 194);
      node.h = Math.max(node.h, 74);
      return;
    }
  }

  toggleConnectMode() {
    this.connectMode = !this.connectMode;
    this.quickConnectFromNode = null;
    if (!this.connectMode) this.hideQuickConnectPopup();
    ensureButtonState();
    this.log(this.connectMode ? '🔗 Режим быстрого соединения включён.' : '🔗 Режим быстрого соединения выключен.', 'sys');
  }

  initQuickConnectPopup() {
    if (this._quickConnectPopupInitialized) return;
    this.quickConnectPopupEl = document.getElementById('quickConnectPortPopup');
    if (!this.quickConnectPopupEl) return;
    this.quickConnectPopupHeadEl = this.quickConnectPopupEl.querySelector('.qcp-head');
    this.quickConnectPopupBodyEl = this.quickConnectPopupEl.querySelector('.qcp-body');
    this.quickConnectPopupCancelEl = this.quickConnectPopupEl.querySelector('.qcp-cancel');
    if (this.quickConnectPopupCancelEl) {
      this.quickConnectPopupCancelEl.addEventListener('click', () => {
        this.hideQuickConnectPopup();
        this.quickConnectFromNode = null;
        this.log('🔗 Соединение отменено.', 'warn');
      });
    }
    document.addEventListener('pointerdown', (e) => {
      if (!this.quickConnectPopupEl || !this.quickConnectPopupEl.classList.contains('open')) return;
      if (this.quickConnectPopupEl.contains(e.target)) return;
      this.hideQuickConnectPopup();
    }, true);
    this._quickConnectPopupInitialized = true;
  }

  hideQuickConnectPopup() {
    if (!this.quickConnectPopupEl) return;
    this.quickConnectPopupEl.classList.remove('open');
    this.quickConnectPopupEl.style.left = '-9999px';
    this.quickConnectPopupEl.style.top = '-9999px';
    if (this.quickConnectPopupBodyEl) this.quickConnectPopupBodyEl.innerHTML = '';
    this.quickConnectPendingTarget = null;
  }

  clampQuickConnectPopupToViewport(left, top) {
    if (!this.quickConnectPopupEl) return { left, top };
    const maxLeft = Math.max(8, window.innerWidth - this.quickConnectPopupEl.offsetWidth - 8);
    const maxTop = Math.max(8, window.innerHeight - this.quickConnectPopupEl.offsetHeight - 8);
    return {
      left: Math.max(8, Math.min(maxLeft, left)),
      top: Math.max(8, Math.min(maxTop, top))
    };
  }

  openQuickConnectPopup(fromNode, toNode, screenX, screenY) {
    if (!this.quickConnectPopupEl || !this.quickConnectPopupBodyEl || !this.quickConnectPopupHeadEl) return;
    const options = this.getQuickConnectTargetOptions(fromNode, toNode);
    this.quickConnectPopupHeadEl.textContent = 'Куда подключить: ' + toNode.label;
    this.quickConnectPopupBodyEl.innerHTML = '';
    this.quickConnectPendingTarget = toNode;

    const info = document.createElement('div');
    info.className = 'qcp-sub';
    info.textContent = 'Выбери доступный входной порт. Выходы к выходам тут не соединяются.';
    this.quickConnectPopupBodyEl.appendChild(info);

    if (!options.length) {
      const empty = document.createElement('div');
      empty.className = 'qcp-empty';
      empty.textContent = 'Нет свободных совместимых входных портов у этого блока.';
      this.quickConnectPopupBodyEl.appendChild(empty);
    } else {
      for (const option of options) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'qcp-btn';
        btn.innerHTML = option.label + '<span class="qcp-meta">' + option.meta + '</span>';
        btn.addEventListener('click', (ev) => {
          ev.preventDefault();
          ev.stopPropagation();
          const created = this.createConnection(fromNode, option.fromPort, toNode, option.toPort);
          if (created) {
            this.log('🔗 Создан мостик: ' + fromNode.label + ' [' + this.describePort(fromNode, option.fromPort, 'out') + '] → ' + toNode.label + ' [' + this.describePort(toNode, option.toPort, 'in') + ']', 'sys');
          }
          this.quickConnectFromNode = null;
          this.quickConnectPendingTarget = null;
          this.hideQuickConnectPopup();
        });
        this.quickConnectPopupBodyEl.appendChild(btn);
      }
    }

    this.quickConnectPopupEl.classList.add('open');
    this.quickConnectPopupEl.style.left = '8px';
    this.quickConnectPopupEl.style.top = '8px';
    const pos = this.clampQuickConnectPopupToViewport(screenX + 8, screenY - 8);
    this.quickConnectPopupEl.style.left = pos.left + 'px';
    this.quickConnectPopupEl.style.top = pos.top + 'px';
  }

  getPortCapacity(node, portIndex, kind) {
    return 3;
  }

  getPortConnectionCount(node, portIndex, kind) {
    if (kind === 'out') return this.connections.filter(c => c.fromNode === node && c.fromPort === portIndex).length;
    return this.connections.filter(c => c.toNode === node && c.toPort === portIndex).length;
  }

  getPortRole(node, portIndex, kind) {
    const t = node?.def?.type || '';
    if (node?.def?.isSubrune) return 'attachment';
    if (isCircleSimple(node)) {
      if (kind === 'in') return (portIndex === 0 || portIndex === 1) ? 'strong' : 'data';
      return (portIndex === 0 || portIndex === 1) ? 'strong' : 'data';
    }
    if (kind === 'in') {
      if (t === 'effector_light_rgb') return 'strong';
      if (t === 'logic_if' || t === 'logic_not') return portIndex === 1 ? 'data' : 'strong';
      if (t === 'val_number' || t === 'val_text') return portIndex === 0 ? 'strong' : 'data';
      if (t.startsWith('op_')) return 'data';
      if (t === 'censor_moment' || t === 'censor_hold' || t === 'logic_reverse' || t === 'logic_reverse_auto' || t === 'effector' || t === 'memory_counter' || t === 'circle_complex') return 'strong';
      return 'generic';
    }
    if (t === 'val_number' || t === 'val_text') return portIndex === 0 ? 'strong' : 'data';
    if (t.startsWith('op_') || t === 'memory_counter') return 'data';
    return 'strong';
  }

  describePort(node, portIndex, kind) {
    // Обработка точек крепления
    if (portIndex < 0) return `Точка крепления ${-(portIndex + 1)}`;
    
    const t = node?.def?.type || '';
    
    if (node?.def?.isSubrune) return 'Единый квадратный порт сабруны';
    if (isCircleSimple(node)) {
        if (kind === 'in') {
            if (portIndex === 0) return 'Левый верхний: WEAK/STRONG читает material и проходит вправо';
            if (portIndex === 1) return 'Левый нижний: WEAK/STRONG читает virtual и проходит вправо';
            if (portIndex === 2) return 'Верхний левый: первый DATA записывает material';
            if (portIndex === 3) return 'Верхний правый: DATA пишет virtual';
        } else {
            if (portIndex === 0) return 'Правый верхний: проход WEAK/STRONG material-линии';
            if (portIndex === 1) return 'Правый нижний: проход WEAK/STRONG virtual-линии';
            if (portIndex === 2) return 'Нижний левый: DATA material при чтении';
            if (portIndex === 3) return 'Нижний правый: DATA virtual при чтении';
        }
        return '';
    }
    if (t === 'effector_light_rgb') return kind === 'in' ? 'Силовой вход' : 'Выход';
    if (t === 'logic_if' || t === 'logic_not') return kind === 'in' ? (portIndex === 0 ? 'Силовой вход' : 'Вход условия DATA') : 'Выход';
    if (t === 'val_number' || t === 'val_text') {
      if (kind === 'in') return portIndex === 0 ? 'Вход сигнала 2/3' : 'DATA вход';
      return portIndex === 0 ? 'Выход сигнала 2/3' : 'DATA выход';
    }
    if (t.startsWith('op_')) return kind === 'in' ? ('DATA вход ' + (portIndex + 1)) : 'DATA выход';
    if (t === 'censor_moment' || t === 'censor_hold') return kind === 'in' ? 'Вход цензора' : 'Выход цензора';
    if (t === 'logic_reverse' || t === 'logic_reverse_auto') return kind === 'in' ? 'Порт заряда' : 'Реверс-выход';
    return (kind === 'in' ? 'Вход ' : 'Выход ') + (portIndex + 1);
  }

  pickSourcePortForTarget(fromNode, toNode, toPort) {
    const wanted = this.getPortRole(toNode, toPort, 'in');
    const outputs = Array.from({ length: fromNode.def.outputs }, (_, i) => i);
    const available = outputs.filter(i => this.getPortConnectionCount(fromNode, i, 'out') < this.getPortCapacity(fromNode, i, 'out'));
    if (!available.length) return -1;
    if (wanted === 'data') {
      const dataOut = available.find(i => this.getPortRole(fromNode, i, 'out') === 'data');
      if (dataOut !== undefined) return dataOut;
    }
    if (wanted === 'strong') {
      const strongOut = available.find(i => this.getPortRole(fromNode, i, 'out') !== 'data');
      if (strongOut !== undefined) return strongOut;
    }
    return available[0];
  }

      getQuickConnectTargetOptions(fromNode, toNode) {
        const options = [];
        if (!fromNode || !toNode || fromNode === toNode) return options;

        // 1. Если соединяем сабруну с хостом -> показываем только точки крепления
        if (fromNode.def.isSubrune && !toNode.def.isSubrune && toNode.def.maxSubrunes > 0) {
            const rule = SUBRUNE_RULES[fromNode.def.subruneRuleKey];
            if (rule && isSubruneCompatibleHost(toNode, rule)) {
                const occupied = new Set(this.connections
                    .filter(c => c.bridge?.isAttachment && (c.fromNode === toNode || c.toNode === toNode))
                    .map(c => c.toPort < 0 ? -(c.toPort + 1) : -1));
                for (let i = 0; i < toNode.def.maxSubrunes; i++) {
                    if (!occupied.has(i)) {
                        options.push({
                            fromPort: 0,
                            toPort: -(i + 1),
                            label: `Точка крепления #${i + 1}`,
                            meta: 'Слот сабруны (свободно)'
                        });
                    }
                }
                return options; // Возвращаем ТОЛЬКО слоты для сабрун
            }
        }

        // 2. Стандартная логика для обычных портов
        for (let toPort = 0; toPort < toNode.def.inputs; toPort++) {
            if (this.getPortConnectionCount(toNode, toPort, 'in') >= this.getPortCapacity(toNode, toPort, 'in')) continue;
            const fromPort = this.pickSourcePortForTarget(fromNode, toNode, toPort);
            if (fromPort < 0) continue;
            if (this.getPortConnectionCount(fromNode, fromPort, 'out') >= this.getPortCapacity(fromNode, fromPort, 'out')) continue;
            options.push({
                fromPort,
                toPort,
                label: this.describePort(toNode, toPort, 'in'),
                meta: this.describePort(fromNode, fromPort, 'out') + ' → ' + this.describePort(toNode, toPort, 'in')
            });
        }
        return options.filter((opt, idx, self) => idx === self.findIndex(o => o.fromPort === opt.fromPort && o.toPort === opt.toPort));
    }

  describeNodeCompact(nodeId) {
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) return 'node#' + nodeId;
    return node.label + ' (#' + node.id + ', ' + node.def.type + ')';
  }

  peekBucketDiagnostics(timeValue, maxScan = 600) {
    const diag = { time: timeValue, size: 0, byKind: new Map(), byNode: new Map() };
    for (let i = 0; i < this.eventQueue.length && i < maxScan; i++) {
      const ev = this.eventQueue[i];
      if (ev.time !== timeValue) break;
      diag.size += 1;
      diag.byKind.set(ev.kind || 'unknown', (diag.byKind.get(ev.kind || 'unknown') || 0) + 1);
      const key = ev.nodeId || -1;
      diag.byNode.set(key, (diag.byNode.get(key) || 0) + 1);
    }
    return diag;
  }

  formatBucketDiagnostics(diag) {
    if (!diag) return 'нет данных';
    const kinds = Array.from(diag.byKind.entries()).sort((a,b) => b[1] - a[1]).slice(0,4).map(([k,v]) => k + '=' + v).join(', ');
    const nodes = Array.from(diag.byNode.entries()).sort((a,b) => b[1] - a[1]).slice(0,4).map(([id,v]) => this.describeNodeCompact(id) + ' x' + v).join(' | ');
    return 'слой t=' + Math.round(diag.time) + 'мс, size=' + diag.size + (kinds ? ', kinds: ' + kinds : '') + (nodes ? ', nodes: ' + nodes : '');
  }

  reportEventStorm(payload) {
    const info = payload || {};
    const base = [
      '⛔ Шторм событий: за кадр обработано ' + (info.frameEvents || 0) + ' событий и ' + (info.frameBuckets || 0) + ' тайм-слоёв.',
      info.sameTimeBuckets ? ('Одинаковый simTime подряд: ' + info.sameTimeBuckets + '.') : '',
      info.queueLeft !== undefined ? ('В очереди осталось: ' + info.queueLeft + '.') : '',
      info.reason === 'same_time_loop'
        ? 'Вероятная причина: цикл без достаточной задержки или самовозврат в тот же момент времени.'
        : 'Вероятная причина: очень плотная схема или событийная петля, которую UI не успевает дорисовать за один кадр.'
    ].filter(Boolean).join(' ');
    const bucketText = this.formatBucketDiagnostics(info.lastBucket || this._lastBucketDiagnostics || null);
    this.log(base + ' Последний обработанный слой: ' + bucketText, 'error');
    this.lastStormInfo = {
      simTime: this.simTime,
      frameEvents: info.frameEvents || 0,
      frameBuckets: info.frameBuckets || 0,
      sameTimeBuckets: info.sameTimeBuckets || 0,
      queueLeft: info.queueLeft || 0,
      bucket: info.lastBucket || this._lastBucketDiagnostics || null,
      reason: info.reason || 'budget'
    };
  }

  createNode(type, x, y) {
    const node = new Node(this.nextId++, type, x, y);
    if (isAnySourceType(type)) {
      node.sourceSerial = this.nextSourceSerial++;
      const prefix = isStrongSourceLike(type) ? 'М' : 'СМ';
      node.label = node.def.label + ' ' + prefix + node.sourceSerial;
      node.sourceTag = prefix + node.sourceSerial;
    }
    if (isBlinkSourceType(type)) {
      node.runtime = node.runtime || {};
      node.runtime.blinker = {
        enabled: false,
        generation: 0,
        intervalMs: 2000,
        cycleStartTime: 0,
        nextTickTime: 0
      };
    }
    this.resizeSpecialNode(node);
    this.nodes.push(node);
    return node;
  }

  ensureSimpleCircleNode(node) {
    if (!node || !node.def || !isCircleSimple(node)) return node;
    ensureSimpleCircleDef(node.def);
    node.runtime = node.runtime || {};
    while ((node.inputs || []).length < 4) {
      node.inputs.push({
        signal: SIG.NONE,
        data: null,
        lastTime: -1,
        arrivalCount: 0,
        sourceTag: null,
        meta: null,
        connectionId: null,
        sourceNodeId: null,
        fromNodeId: null,
        fromNodeType: null
      });
    }
    node.w = 392;
    node.h = 220;
    return node;
  }

  cloneMeta(meta) {
    if (!meta) return { scale: null, frequency: null, direction: null, tags: [], originSourceType: null, originSourceTag: null, pulseIndex: null, primaryStrong: false, primaryStrongToken: null, primarySeenBy: [], blinkSource: false, freqShift: 0 };
    return {
      scale: meta.scale || null,
      frequency: meta.frequency || null,
      direction: meta.direction || null,
      tags: Array.isArray(meta.tags) ? meta.tags.slice() : [],
      originSourceType: meta.originSourceType || null,
      originSourceTag: meta.originSourceTag || null,
      pulseIndex: meta.pulseIndex || null,
      primaryStrong: !!meta.primaryStrong,
      primaryStrongToken: meta.primaryStrongToken || null,
      primarySeenBy: Array.isArray(meta.primarySeenBy) ? meta.primarySeenBy.slice() : [],
      blinkSource: !!meta.blinkSource,
      freqShift: Number.isFinite(meta.freqShift) ? meta.freqShift : 0
    };
  }

  mergeMeta(meta, patch) {
    const out = this.cloneMeta(meta);
    if (!patch) return out;
    if (patch.scale) out.scale = patch.scale;
    if (patch.frequency) out.frequency = patch.frequency;
    if (patch.direction) out.direction = patch.direction;
    if (patch.tag && !out.tags.includes(patch.tag)) out.tags.push(patch.tag);
    if (patch.freqShift !== undefined) out.freqShift = (out.freqShift || 0) + Number(patch.freqShift || 0);
    return out;
  }

  buildEffectText(node, meta) {
    const parts = [node.def.effectText || node.label];
    const extras = [];
    if (meta) {
      if (meta.scale) extras.push(meta.scale);
      if (meta.frequency) extras.push(meta.frequency);
      if (meta.direction) extras.push('направление: ' + meta.direction);
      if (meta.tags && meta.tags.length) extras.push(...meta.tags);
    }
    if (extras.length) parts.push('(' + extras.join(', ') + ')');
    return parts.join(' ');
  }

  getConnectionById(id) {
    return this.connections.find(c => c.id === id) || null;
  }

  getInflatedNodeRect(node, pad = 0) {
    return {
      left: node.x - pad,
      top: node.y - pad,
      right: node.x + node.w + pad,
      bottom: node.y + node.h + pad
    };
  }

  repelPointFromNodes(point, ignoreNodeIds = new Set(), radius = 52) {
    const out = { x: point.x, y: point.y };
    for (let pass = 0; pass < 4; pass++) {
      for (const node of this.nodes) {
        if (!node || ignoreNodeIds.has(node.id)) continue;
        const rect = this.getInflatedNodeRect(node, radius * 0.45);
        const closestX = Math.max(rect.left, Math.min(rect.right, out.x));
        const closestY = Math.max(rect.top, Math.min(rect.bottom, out.y));
        let dx = out.x - closestX;
        let dy = out.y - closestY;
        let dist = Math.hypot(dx, dy);

        if (dist < 0.001) {
          const cx = node.x + node.w / 2;
          const cy = node.y + node.h / 2;
          dx = out.x - cx;
          dy = out.y - cy;
          if (Math.abs(dx) < Math.abs(dy)) dx = dx >= 0 ? 1 : -1;
          else dy = dy >= 0 ? 1 : -1;
          dist = Math.hypot(dx, dy) || 1;
        }

        if (dist < radius) {
          const force = (radius - dist) / radius;
          out.x += (dx / dist) * force * radius * 1.12;
          out.y += (dy / dist) * force * radius * 1.12;
        }
      }
    }
    return out;
  }

  getBridgeClearancePad() {
    return (this.isMobile ? 8 : 6) / Math.max(0.001, this.viewport.scale);
  }

  isPointInsideRect(point, rect) {
    return point.x > rect.left && point.x < rect.right && point.y > rect.top && point.y < rect.bottom;
  }

  nudgeBridgeControlsAroundNodes(bridge, start, end, controls) {
    const ignore = new Set([bridge.a.id, bridge.b.id]);
    const baseDx = end.x - start.x;
    const baseDy = end.y - start.y;
    const baseDist = Math.hypot(baseDx, baseDy) || 1;
    const nx = -baseDy / baseDist;
    const ny = baseDx / baseDist;
    const sign = bridge.wrapSign || 1;
    const clearance = this.getBridgeClearancePad();

    for (let pass = 0; pass < 10; pass++) {
      let changed = false;
      const pts = [start, ...controls, end];
      for (const node of this.nodes) {
        if (!node || ignore.has(node.id)) continue;
        const rect = this.getInflatedNodeRect(node, clearance);
        const cx = (rect.left + rect.right) / 2;
        const cy = (rect.top + rect.bottom) / 2;
        let hit = null;

        for (let seg = 0; seg < pts.length - 1 && !hit; seg++) {
          const p0 = pts[seg];
          const p1 = pts[seg + 1];
          for (let s = 0; s <= 16; s++) {
            const t = s / 16;
            const sample = { x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t };
            if (this.isPointInsideRect(sample, rect)) {
              hit = { seg, sample };
              break;
            }
          }
        }

        if (!hit) continue;
        changed = true;
        const sample = hit.sample;
        const distLeft = Math.abs(sample.x - rect.left);
        const distRight = Math.abs(rect.right - sample.x);
        const distTop = Math.abs(sample.y - rect.top);
        const distBottom = Math.abs(rect.bottom - sample.y);
        const minX = Math.min(distLeft, distRight);
        const minY = Math.min(distTop, distBottom);
        let pushX = 0;
        let pushY = 0;
        if (minX < minY) pushX = sample.x < cx ? -(minX + clearance + 12) : (minX + clearance + 12);
        else pushY = sample.y < cy ? -(minY + clearance + 12) : (minY + clearance + 12);
        const wrap = Math.max(16, baseDist * 0.055) * sign;
        pushX += nx * wrap;
        pushY += ny * wrap;

        const candidates = [];
        if (hit.seg === 0) candidates.push(0);
        else if (hit.seg >= controls.length) candidates.push(controls.length - 1);
        else {
          candidates.push(Math.max(0, hit.seg - 1));
          candidates.push(Math.min(controls.length - 1, hit.seg));
        }
        const uniq = [...new Set(candidates.filter(idx => idx >= 0 && idx < controls.length))];
        for (const idx of uniq) {
          const weight = idx === 1 ? 1.0 : 0.86;
          controls[idx] = this.clampBridgeHandlePoint(bridge, idx, {
            x: controls[idx].x + pushX * weight,
            y: controls[idx].y + pushY * weight
          });
        }
      }
      if (!changed) break;
    }
    return controls;
  }

  clampBridgeHandlePoint(bridge, handleIndex, point) {
    const start = this.getPortPos(bridge.a, bridge.fromPort, 'out');
    const end = this.getPortPos(bridge.b, bridge.toPort, 'in');
    const t = (bridge.handleTs && bridge.handleTs[handleIndex] !== undefined) ? bridge.handleTs[handleIndex] : (handleIndex + 1) / 4;
    const base = {
      x: start.x + (end.x - start.x) * t,
      y: start.y + (end.y - start.y) * t
    };
    const dx = point.x - base.x;
    const dy = point.y - base.y;
    const dist = Math.hypot(end.x - start.x, end.y - start.y) || 1;
    const limit = Math.min(360, Math.max(handleIndex === 1 ? 104 : 74, dist * (handleIndex === 1 ? 0.42 : 0.3) + 54));
    const d = Math.hypot(dx, dy);
    if (d <= limit || d === 0) return { x: point.x, y: point.y };
    const scale = limit / d;
    return { x: base.x + dx * scale, y: base.y + dy * scale };
  }

  getBridgeCurvePoints(bridge) {
    const start = this.getPortPos(bridge.a, bridge.fromPort, 'out');
    const end = this.getPortPos(bridge.b, bridge.toPort, 'in');
    if (!Array.isArray(bridge.cps) || bridge.cps.length !== 3) {
      bridge.handleTs = [0.22, 0.5, 0.78];
      bridge.cps = bridge.handleTs.map((t) => ({
        x: start.x + (end.x - start.x) * t,
        y: start.y + (end.y - start.y) * t
      }));
    }
    const ignore = new Set([bridge.a.id, bridge.b.id]);
    let controls = bridge.cps.map((cp, idx) => this.repelPointFromNodes(this.clampBridgeHandlePoint(bridge, idx, cp), ignore, 30));
    controls = this.nudgeBridgeControlsAroundNodes(bridge, start, end, controls);
    controls = controls.map((cp, idx) => this.repelPointFromNodes(this.clampBridgeHandlePoint(bridge, idx, cp), ignore, 22));
    bridge.cp = controls[1] || bridge.cp;
    bridge.cps = controls.map((cp) => ({ x: cp.x, y: cp.y }));
    return { start, end, controls, points: [start, ...controls, end] };
  }

  getBridgePathSamples(bridge, resolution = 12) {
    const { points } = this.getBridgeCurvePoints(bridge);
    if (points.length < 2) return points.slice();
    const out = [{ x: points[0].x, y: points[0].y }];
    const quadPoint = (p0, p1, p2, t) => {
      const mt = 1 - t;
      return {
        x: mt * mt * p0.x + 2 * mt * t * p1.x + t * t * p2.x,
        y: mt * mt * p0.y + 2 * mt * t * p1.y + t * t * p2.y
      };
    };
    let currentStart = points[0];
    for (let i = 1; i < points.length - 2; i++) {
      const control = points[i];
      const end = { x: (points[i].x + points[i + 1].x) / 2, y: (points[i].y + points[i + 1].y) / 2 };
      for (let s = 1; s <= resolution; s++) out.push(quadPoint(currentStart, control, end, s / resolution));
      currentStart = end;
    }
    const penult = points[points.length - 2];
    const last = points[points.length - 1];
    for (let s = 1; s <= resolution; s++) out.push(quadPoint(currentStart, penult, last, s / resolution));
    return out;
  }

  sampleBridgePoint(bridge, t) {
    const pts = this.getBridgePathSamples(bridge, 12);
    const segLens = [];
    let total = 0;
    for (let i = 0; i < pts.length - 1; i++) {
      const len = Math.hypot(pts[i + 1].x - pts[i].x, pts[i + 1].y - pts[i].y);
      segLens.push(len);
      total += len;
    }
    if (total <= 0) return { x: pts[0].x, y: pts[0].y };
    let target = Math.max(0, Math.min(1, t)) * total;
    for (let i = 0; i < segLens.length; i++) {
      const len = segLens[i];
      if (target <= len || i === segLens.length - 1) {
        const local = len <= 0 ? 0 : (target / len);
        return {
          x: pts[i].x + (pts[i + 1].x - pts[i].x) * local,
          y: pts[i].y + (pts[i + 1].y - pts[i].y) * local
        };
      }
      target -= len;
    }
    return { x: pts[pts.length - 1].x, y: pts[pts.length - 1].y };
  }

  getBridgeMidpoint(bridge) {
    return this.sampleBridgePoint(bridge, 0.5);
  }

  getBridgeHandleVisual(bridge, index) {
    const t = (bridge.handleTs && bridge.handleTs[index] !== undefined) ? bridge.handleTs[index] : [0.22, 0.5, 0.78][index];
    const p = this.sampleBridgePoint(bridge, t);
    const prev = this.sampleBridgePoint(bridge, Math.max(0, t - 0.02));
    const next = this.sampleBridgePoint(bridge, Math.min(1, t + 0.02));
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    return { x: p.x, y: p.y, tx: dx / len, ty: dy / len, nx: -dy / len, ny: dx / len, t };
  }

  getBridgeHandleAt(x, y) {
    const threshold = (this.isMobile ? 26 : 20) / this.viewport.scale;
    let best = null;
    let bestDist = Infinity;
    for (const bridge of this.bridges) {
      for (let i = 0; i < 3; i++) {
        const p = this.getBridgeHandleVisual(bridge, i);
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < threshold && d < bestDist) {
          best = { bridge, index: i };
          bestDist = d;
        }
      }
    }
    return best;
  }

  ensureCircleMemory(node) {
    node.runtime = node.runtime || {};
    const matCap = getMaterialCapacity(node);
    const virtCap = getVirtualCapacity(node);
    const source = String(node.customValue == null ? '' : node.customValue);
    let mem = node.runtime.circleMemory;
    if (!mem) {
      mem = {
        initializedFromSource: false,
        materialValue: '',
        materialUnits: [],
        materialLocked: false,
        virtualValue: '',
        virtualUnits: [],
        virtualWriteCount: 0,
        lastMaterialWriteAt: -1,
        lastVirtualWriteAt: -1,
        lastMaterialReadAt: -1,
        lastVirtualReadAt: -1
      };
      node.runtime.circleMemory = mem;
    }
    if (!mem.initializedFromSource) {
      const initial = safeDisplay(source);
      mem.materialValue = initial;
      mem.materialUnits = initial !== '' ? encodeSimpleUnits(node, initial, matCap) : [];
      mem.materialLocked = initial !== '';
      mem.initializedFromSource = true;
    }
    if (!Array.isArray(mem.virtualUnits)) mem.virtualUnits = [];
    if (!Array.isArray(mem.materialUnits)) mem.materialUnits = [];
    mem.materialCapacity = matCap;
    mem.virtualCapacity = virtCap;
    return mem;
  }

  getReverseLaunchButtonRect(node) {
    return { cx: node.x + node.w - 18, cy: node.y + 18, r: 11, hitR: 15 };
  }

  isReverseLaunchButtonHit(node, x, y) {
    const btn = this.getReverseLaunchButtonRect(node);
    return Math.hypot(x - btn.cx, y - btn.cy) <= btn.hitR;
  }

  drawReverseLaunchButton(node) {
    const ctx = this.ctx;
    const btn = this.getReverseLaunchButtonRect(node);
    const armed = (node.runtime.reverseArms || []).length;
    ctx.save();
    ctx.beginPath();
    ctx.arc(btn.cx, btn.cy, btn.r / this.viewport.scale, 0, Math.PI * 2);
    ctx.fillStyle = armed > 0 ? '#60a5fa' : '#0f172a';
    ctx.fill();
    ctx.strokeStyle = '#bfdbfe';
    ctx.lineWidth = 2 / this.viewport.scale;
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + (11 / this.viewport.scale) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↩', btn.cx, btn.cy + (0.5 / this.viewport.scale));
    ctx.fillStyle = '#cbd5e1';
    ctx.font = (8 / this.viewport.scale) + 'px sans-serif';
    ctx.fillText(String(armed), btn.cx, btn.cy + btn.r / this.viewport.scale + (9 / this.viewport.scale));
    ctx.restore();
  }

  getCensorVisualPercent(node) {
    if (node.def.type === 'censor_moment') {
      const state = node.runtime.censorMoment;
      if (!state) return 0;
      if (state.charging && state.readyTime > state.chargeStart && this.simTime < state.readyTime) {
        return Math.max(0, Math.min(1, (this.simTime - state.chargeStart) / (state.readyTime - state.chargeStart)));
      }
      return state.state === 'spitting' ? 1 : 0;
    }
    if (node.def.type === 'censor_hold') {
      const state = node.runtime.censorHold;
      if (!state) return 0;
      const coolMs = Number(node.def.coolMs || 5000);
      if (state.charging && state.readyTime > state.chargeStart && this.simTime < state.readyTime) {
        return Math.max(0, Math.min(1, (this.simTime - state.chargeStart) / (state.readyTime - state.chargeStart)));
      }
      if (state.hotUntil > this.simTime) {
        return Math.max(0, Math.min(1, (state.hotUntil - this.simTime) / coolMs));
      }
      return 0;
    }
    return 0;
  }

  armReverseFromInput(node, input, time) {
    if (!input || input.signal !== SIG.STRONG) return false;
    const sourceFlag = getOrdinaryStrongSourceFlag(input.meta);
    if (!sourceFlag) return false;
    if (!input.connectionId) return false;
    node.runtime.reverseArms = Array.isArray(node.runtime.reverseArms) ? node.runtime.reverseArms : [];
    if (node.runtime.reverseArms.length >= 3) node.runtime.reverseArms.shift();
    node.runtime.reverseArms.push({
      connectionId: input.connectionId,
      sourceTag: sourceFlag,
      sourceNodeId: input.sourceNodeId || null,
      meta: this.cloneMeta(input.meta),
      armedAt: time
    });
    this.updateNodeActivation(node, time, SIG.STRONG, sourceFlag, input.sourceNodeId || null);
    this.log('↩️ [' + sourceFlag + '] ' + node.label + ' накопил обратный заряд (' + node.runtime.reverseArms.length + '/3).', 'run');
    return true;
  }

  armReverseAutoFromInput(node, input, time) {
    if (!input || input.signal !== SIG.STRONG) return false;
    const sourceFlag = getOrdinaryStrongSourceFlag(input.meta);
    if (!sourceFlag) return false;
    if (!input.connectionId) return false;
    const state = node.runtime.reverseAuto = node.runtime.reverseAuto || { queue: [], token: 0 };
    if (state.queue.length >= 3) state.queue.shift();
    state.token += 1;
    const token = state.token;
    const delayMs = clampAutoDelay(node.customValue || node.def.defaultValue || 1500);
    state.queue.push({
      token,
      connectionId: input.connectionId,
      sourceTag: sourceFlag,
      sourceNodeId: input.sourceNodeId || null,
      meta: this.cloneMeta(input.meta),
      armedAt: time,
      fireAt: time + delayMs
    });
    this.eventQueue.push({ kind: 'reverse_auto_fire', time: time + delayMs, nodeId: node.id, token });
    this.sortQueue();
    this.updateNodeActivation(node, time, SIG.STRONG, sourceFlag, input.sourceNodeId || null);
    this.log('↩️⏱ [' + sourceFlag + '] ' + node.label + ' накопил автореверс (' + state.queue.length + '/3).', 'run');
    return true;
  }

  getReverseContinuationConnections(node, event) {
    const visited = new Set(Array.isArray(event.visitedConnectionIds) ? event.visitedConnectionIds : []);
    const sourceFlag = getOrdinaryStrongSourceFlag(event.meta) || event.sourceTag || null;
    const candidates = [];
    for (const input of (node.inputs || [])) {
      if (!input || !input.connectionId || input.connectionId === event.connectionId) continue;
      if (visited.has(input.connectionId)) continue;
      if (input.signal === SIG.NONE) continue;
      const inputFlag = getOrdinaryStrongSourceFlag(input.meta) || input.sourceTag || null;
      if (sourceFlag && inputFlag !== sourceFlag) continue;
      candidates.push(input);
    }
    if (!candidates.length) return [];
    const newestTime = Math.max(...candidates.map(inp => Number(inp.lastTime) || -1));
    return candidates
      .filter(inp => (Number(inp.lastTime) || -1) === newestTime)
      .map(inp => this.getConnectionById(inp.connectionId))
      .filter(Boolean);
  }

  fireReverseButton(node) {
    if (!node || node.def.type !== 'logic_reverse') return false;
    node.runtime.reverseArms = node.runtime.reverseArms || [];
    if (!node.runtime.reverseArms.length) {
      this.log('↩️ ' + node.label + ': нет накопленного обратного заряда.', 'warn');
      return false;
    }
    const arm = node.runtime.reverseArms.pop();
    const conn = this.getConnectionById(arm.connectionId);
    if (!conn) {
      this.log('↩️ ' + node.label + ': исходный мостик для реверса потерян.', 'warn');
      return false;
    }
    const startTime = this.initialized ? this.simTime : 0;
    this.scheduleReverseArrival(conn, SIG.STRONG, startTime + node.def.delay, arm.sourceTag, arm.meta, arm.sourceNodeId, 1, []);
    this.run();
    this.log('↩️ [' + (arm.sourceTag || '?') + '] ' + node.label + ' запустил обратный ход. Осталось зарядов: ' + node.runtime.reverseArms.length, 'run');
    return true;
  }

  handleCustomEvent(node, event) {
    if (!node) return;
    if (event.kind === 'blinker_tick' && isBlinkSourceType(node.def.type)) {
      const bl = node.runtime && node.runtime.blinker;
      if (!bl || !bl.enabled || bl.generation !== event.generation) return;
      bl.cycleStartTime = event.time;
      bl.nextTickTime = event.time + bl.intervalMs;
      this.startSourcePulse(node, event.time);
      this.scheduleBlinkerTick(node, bl.nextTickTime, bl.generation);
      return;
    }
    if (event.kind === 'reverse_auto_fire' && node.def.type === 'logic_reverse_auto') {
      const state = node.runtime.reverseAuto || { queue: [] };
      const idx = state.queue.findIndex(a => a.token === event.token);
      if (idx < 0) return;
      const arm = state.queue.splice(idx, 1)[0];
      const conn = this.getConnectionById(arm.connectionId);
      if (!conn) return this.log('↩️⏱ ' + node.label + ': исходный мостик для автореверса потерян.', 'warn');
      this.scheduleReverseArrival(conn, SIG.STRONG, event.time + node.def.delay, arm.sourceTag, arm.meta, arm.sourceNodeId, 1, []);
      this.log('↩️⏱ [' + (arm.sourceTag || '?') + '] ' + node.label + ' автоматически запустил обратный ход.', 'run');
      return;
    }
    if (event.kind === 'censor_ready' && node.def.type === 'censor_moment') {
      const state = node.runtime.censorMoment;
      if (!state || event.token !== state.cycleToken || !state.charging) return;
      state.charging = false; state.state = 'spitting';
      const shots = state.pendingShots.slice(); state.pendingShots = [];
      for (let i = 0; i < shots.length; i++) this.eventQueue.push({ kind: 'censor_spit', time: event.time + i * 1000, nodeId: node.id, token: state.cycleToken, shot: shots[i], index: i, total: shots.length });
      this.sortQueue();
      this.log('🟢 ' + node.label + ' прогрет до 100% и готов выплюнуть ' + shots.length + ' импульс(а).', 'run');
      return;
    }
    if (event.kind === 'censor_spit' && node.def.type === 'censor_moment') {
      const state = node.runtime.censorMoment;
      if (!state || event.token !== state.cycleToken) return;
      const shot = event.shot || {};
      this.updateNodeActivation(node, event.time, SIG.STRONG, shot.sourceTag || null, shot.sourceNodeId || null);
      this.emitFromNode(node, event.time + node.def.delay, SIG.STRONG, null, null, shot.sourceTag || null, shot.meta || null, shot.sourceNodeId || null);
      this.log('💥 ' + (shot.sourceTag ? '[' + shot.sourceTag + '] ' : '') + node.label + ' выплюнул импульс ' + (event.index + 1) + '/' + event.total + '.', 'run');
      if (event.index === event.total - 1) { state.state = 'idle'; state.chargeStart = -1; state.readyTime = -1; }
      return;
    }
    if (event.kind === 'censor_ready' && node.def.type === 'censor_hold') {
      return;
    }
  }

    createConnection(fromNode, fromPort, toNode, toPort, opts = {}) {
    if (!fromNode || !toNode) return null;

    // Поддержка отрицательных индексов для точек крепления сабрун
    let attachmentIndex = -1;
    if (toPort < 0) {
        attachmentIndex = -(toPort + 1);
    }

    const isSubruneConnect = fromNode.def.isSubrune || toNode.def.isSubrune || attachmentIndex >= 0;
    let hostNode = null, subNode = null;

    if (isSubruneConnect) {
        if (fromNode.def.isSubrune && toNode.def.isSubrune) {
            if (!opts.silent) this.log('🚫 Сабруны нельзя крепить друг к другу.', 'warn');
            return null;
        }
        hostNode = fromNode.def.isSubrune ? toNode : fromNode;
        subNode = fromNode.def.isSubrune ? fromNode : toNode;

        // Если индекс не передан явно (<0), ищем первый свободный слот
        if (attachmentIndex < 0) {
            const occupied = new Set(this.connections
                .filter(c => c.bridge?.isAttachment && (c.fromNode === hostNode || c.toNode === hostNode))
                .map(c => c.toPort < 0 ? -(c.toPort + 1) : -1));
            for (let i = 0; i < (hostNode.def.maxSubrunes || 3); i++) {
                if (!occupied.has(i)) { attachmentIndex = i; break; }
            }
        }

        if (attachmentIndex < 0 || attachmentIndex >= (hostNode.def.maxSubrunes || 3)) {
            if (!opts.silent) this.log('🚫 Все точки крепления сабрун на ' + hostNode.label + ' заняты.', 'warn');
            return null;
        }

        const rule = SUBRUNE_RULES[subNode.def.subruneRuleKey];
        if (!rule) {
            if (!opts.silent) this.log('🚫 У ' + subNode.label + ' нет правил прикрепления.', 'warn');
            return null;
        }
        if (!isSubruneCompatibleHost(hostNode, rule)) {
            if (!opts.silent) this.log('🚫 Сабруна ' + subNode.label + ' несовместима с ' + hostNode.label + ' (' + hostNode.def.family + ').', 'warn');
            return null;
        }
        opts = { ...opts, isAttachment: true, attachmentIndex: attachmentIndex };
    } else {
        // Обычная проверка портов (только для не-сабрунных соединений)
        if (fromPort < 0 || fromPort >= (fromNode.def?.outputs || 0)) {
            if (!opts.silent) this.log('🚫 У блока ' + fromNode.label + ' нет выходного порта #' + (fromPort + 1) + '.', 'warn');
            return null;
        }
        if (toPort < 0 || toPort >= (toNode.def?.inputs || 0)) {
            if (!opts.silent) this.log('🚫 У блока ' + toNode.label + ' нет входного порта #' + (toPort + 1) + '.', 'warn');
            return null;
        }
        if (fromNode === toNode && fromPort === toPort) {
            if (!opts.silent) this.log('🚫 Нельзя соединить порт сам с собой.', 'warn');
            return null;
        }
        const same = this.connections.find(c => c.fromNode === fromNode && c.fromPort === fromPort && c.toNode === toNode && c.toPort === toPort);
        if (same) {
            if (!opts.silent) this.log('ℹ️ Такой мостик уже существует.', 'sys');
            return same;
        }
        const outCount = this.getPortConnectionCount(fromNode, fromPort, 'out');
        const outCap = this.getPortCapacity(fromNode, fromPort, 'out');
        if (outCount >= outCap) {
            if (!opts.silent) this.log('🚫 Выходной порт уже заполнен.', 'warn');
            return null;
        }
        const inCount = this.getPortConnectionCount(toNode, toPort, 'in');
        const inCap = this.getPortCapacity(toNode, toPort, 'in');
        if (inCount >= inCap) {
            if (!opts.silent) this.log('🚫 Входной порт уже заполнен.', 'warn');
            return null;
        }
    }

    const bridge = new Bridge(this.nextId++, fromNode, fromPort, toNode, toPort, opts);
    const connection = new Connection(this.nextId++, fromNode, fromPort, toNode, toPort, bridge);
    this.bridges.push(bridge);
    this.connections.push(connection);

    if (opts.isAttachment && hostNode && subNode && !hostNode.attachedSubrunes.includes(subNode)) {
        hostNode.attachedSubrunes.push(subNode);
    }
    return connection;
}

  clearSimulationState() {
    this.simTime = 0;
    this.realTimeOffset = performance.now();
    this.eventQueue = [];
    this.particles = [];
    this.processedEvents = 0;
    this.maxFirstActivationDelay = 0;
    this.initialized = false;
    this.activeSourceTags.clear();
    for (const node of this.nodes) node.reset();
    for (const bridge of this.bridges) bridge.reset();
    this.refreshStats();
  }

  clear() {
    this.stop(false);
    this.nodes = [];
    this.connections = [];
    this.bridges = [];
    this.particles = [];
    this.eventQueue = [];
    this.nextId = 1;
    this.consoleEl.innerHTML = '';
    this.clearSimulationState();
    this.log('Очищено.', 'sys');
  }

  stop(log = true) {
    this.simulationRunning = false;
    if (log) {
      this.log('⏹ Остановлено. Первый максимум задержки: ' + Math.round(this.maxFirstActivationDelay) + ' мс.', 'warn');
    }
    this.refreshStats();
  }

  hasActiveSelfTimedStates() {
    for (const node of this.nodes) {
      if (!node || !node.def || !node.runtime) continue;
      if (node.def.type === 'censor_hold') {
        const state = node.runtime.censorHold;
        if (state && Number(state.hotUntil) > this.simTime) return true;
      }
    }
    return false;
  }

  updateSelfTimedStates() {
    for (const node of this.nodes) {
      if (!node || !node.def || !node.runtime) continue;
      if (node.def.type === 'censor_hold') {
        const state = node.runtime.censorHold;
        if (!state) continue;
        if (Number(state.hotUntil) > 0 && this.simTime >= Number(state.hotUntil)) {
          state.hotUntil = -1;
          state.opened = false;
          state.charging = false;
          state.state = 'idle';
          state.chargeStart = -1;
          state.readyTime = -1;
          state.triggerSourceTag = null;
        }
      }
    }
  }

  canAcceptSignal(node, signal, portIndex = null) {
    const type = node.def.type;
    if (isCircleSimple(node)) return signal === SIG.DATA || signal === SIG.WEAK || signal === SIG.STRONG;
    if (type === 'logic_reverse' || type === 'logic_reverse_auto') return signal === SIG.STRONG;
    if (type === 'censor_moment') return signal === SIG.STRONG;
    if (type === 'censor_hold') return signal === SIG.WEAK || signal === SIG.STRONG;
    if (type === 'effector_light_rgb') return signal === SIG.STRONG;
    if (type === 'detector_toggle') return true;
    if (type === 'effect_modifier_scale' || type === 'effect_modifier_direction' || type === 'effect_modifier_frequency') return signal === SIG.DATA || signal === SIG.WEAK || signal === SIG.STRONG;
    if (type === 'memory_counter_dir') return signal === SIG.STRONG;
    if (type === 'source_strong' || type === 'source_weak' || type === 'source_strong_blink' || type === 'source_weak_blink') return true;
    if (type === 'router_join' || type === 'router_split' || type === 'delay_block') return signal === SIG.DATA || signal === SIG.WEAK || signal === SIG.STRONG;
    if (type === 'val_number' || type === 'val_text') {
      if (portIndex === 0) return signal === SIG.WEAK || signal === SIG.STRONG;
      if (portIndex === 1) return signal === SIG.DATA;
      return signal === SIG.DATA || signal === SIG.WEAK || signal === SIG.STRONG;
    }
    if (type.startsWith('op_')) return signal === SIG.DATA;
    if (type === 'logic_if' || type === 'logic_not') {
      if (portIndex === 0) return signal === SIG.STRONG;
      if (portIndex === 1) return signal === SIG.DATA;
      return signal === SIG.DATA || signal === SIG.STRONG;
    }
    if (type === 'logic_and' || type === 'logic_or') return signal === SIG.DATA || signal === SIG.STRONG;
    if (type === 'memory_counter' || type === 'effector' || type === 'circle_complex') return signal === SIG.STRONG;
    return false;
  }

  scheduleArrival(connection, signal, data, departTime, sourceTag = null, meta = null, sourceNodeId = null) {
    if (signal === SIG.NONE) return;
    const arrivalTime = departTime + connection.bridge.delay;
    connection.bridge.activeSignal = signal;
    connection.bridge.glow = 1;
    connection.bridge.lastUsedAt = departTime;
    connection.bridge.lastSourceTag = sourceTag;
    this.particles.push(new SignalParticle(connection, signal, data, departTime, connection.bridge.delay));
    this.eventQueue.push({
      kind: 'arrive',
      time: arrivalTime,
      nodeId: connection.toNode.id,
      port: connection.toPort,
      signal,
      data,
      sourceTag,
      meta: this.cloneMeta(meta),
      sourceNodeId,
      connectionId: connection.id,
      fromNodeId: connection.fromNode.id,
      fromNodeType: connection.fromNode.def.type
    });
  }

  scheduleReverseArrival(connection, signal, departTime, sourceTag = null, meta = null, sourceNodeId = null, hop = 0, visitedConnectionIds = null) {
    if (!connection || signal === SIG.NONE) return;
    if (hop > 64) return;
    const visited = Array.isArray(visitedConnectionIds) ? visitedConnectionIds.slice() : [];
    if (!visited.includes(connection.id)) visited.push(connection.id);
    const pseudo = {
      fromNode: connection.toNode,
      toNode: connection.fromNode,
      fromPort: connection.toPort,
      toPort: connection.fromPort,
      bridge: connection.bridge
    };
    connection.bridge.activeSignal = signal;
    connection.bridge.glow = 1;
    connection.bridge.lastUsedAt = departTime;
    connection.bridge.lastSourceTag = sourceTag;
    this.particles.push(new SignalParticle(pseudo, signal, null, departTime, connection.bridge.delay));
    this.eventQueue.push({
      kind: 'reverse_arrive',
      time: departTime + connection.bridge.delay,
      nodeId: connection.fromNode.id,
      signal,
      sourceTag,
      meta: this.cloneMeta(meta),
      sourceNodeId,
      connectionId: connection.id,
      reverseHop: hop,
      visitedConnectionIds: visited
    });
  }

  emitFromNode(node, time, signal, data = null, specificOutPort = null, sourceTag = null, meta = null, sourceNodeId = null) {
    if (signal === SIG.NONE) return;
    const tag = sourceTag || node.state.lastSourceTag || node.sourceTag || null;
    const sid = sourceNodeId || node.state.lastSourceNodeId || null;
    const outgoing = this.connections.filter(c => c.fromNode === node && (specificOutPort === null || c.fromPort === specificOutPort));
    for (const connection of outgoing) {
      this.scheduleArrival(connection, signal, data, time, tag, meta, sid);
    }
  }

  updateNodeActivation(node, time, signal, sourceTag = null, sourceNodeId = null) {
    node.state.active = true;
    node.state.signal = signal;
    node.state.lastActivationTime = time;
    node.state.lastSourceTag = sourceTag || node.state.lastSourceTag || node.sourceTag || null;
    node.state.lastSourceNodeId = sourceNodeId || node.state.lastSourceNodeId || null;
    node.state.visitCount += 1;
    node.state.glow = 1;
    node.state.flash = Math.max(node.state.flash, signal === SIG.STRONG ? 1 : 0.4);
    if (node.state.firstActivationTime === -1) {
      node.state.firstActivationTime = time;
      this.maxFirstActivationDelay = Math.max(this.maxFirstActivationDelay, time);
    }
  }

  valueFromCustom(node) {
    if (node.def.type === 'val_number') {
      const parsed = Number(node.customValue);
      return Number.isFinite(parsed) ? parsed : 0;
    }
    return String(node.customValue || '');
  }

  getInput(node, idx) {
    return node.inputs[idx] || { signal: SIG.NONE, data: null, lastTime: -1 };
  }

  calculateOperator(node) {
    const type = node.def.type;
    const a = this.getInput(node, 0).data;
    const rawB = this.getInput(node, 1).data;
    let b = rawB;

    if ((b === null || b === undefined || b === '') && node.customValue !== '') {
      b = node.def.type === 'op_contains' ? String(node.customValue) : Number(node.customValue);
      if (Number.isNaN(b)) b = node.customValue;
    }

    switch (type) {
      case 'op_add': return (Number(a) || 0) + (Number(b) || 0);
      case 'op_sub': return (Number(a) || 0) - (Number(b) || 0);
      case 'op_mul': return (Number(a) || 0) * (Number(b) || 0);
      case 'op_div': return (Number(b) || 0) === 0 ? 0 : (Number(a) || 0) / (Number(b) || 1);
      case 'op_mod': return (Number(b) || 0) === 0 ? 0 : (Number(a) || 0) % (Number(b) || 1);
      case 'op_round': return Math.round(Number(a) || 0);
      case 'op_abs': return Math.abs(Number(a) || 0);
      case 'op_sqrt': return Math.sqrt(Math.max(0, Number(a) || 0));
      case 'op_random': {
        const min = Number(a) || 0;
        const max = Number(b) || 0;
        return min + Math.random() * (max - min);
      }
      case 'op_lt': return (Number(a) || 0) < (Number(b) || 0) ? 1 : 0;
      case 'op_gt': return (Number(a) || 0) > (Number(b) || 0) ? 1 : 0;
      case 'op_eq': return String(a) === String(b) ? 1 : 0;
      case 'op_contains': return String(a || '').includes(String(b || '')) ? 1 : 0;
      case 'op_join': return String(a ?? '') + String(b ?? '');
      case 'op_letter': {
        const s = String(a ?? '');
        const idx = Math.max(0, (Number(b) || 1) - 1);
        return s[idx] || '';
      }
      case 'op_length': return String(a ?? '').length;
      default: return a;
    }
  }

  evaluateNode(node, time, reason = 'event') {
    // Сброс и расчет мультипликаторов сабрун перед оценкой узла
node.subruneState.scale = 1;
node.subruneState.magicCost = 1;
node.subruneState.freqShift = 0;
node.subruneState.direction = null;

for (const sub of node.attachedSubrunes) {
    const rule = SUBRUNE_RULES[sub.def.subruneRuleKey] || SUBRUNE_RULES[sub.type];
    if (!rule) continue;
    if (rule.type === 'scale') {
        node.subruneState.scale *= rule.factor;
        node.subruneState.magicCost *= rule.magicCost;
    }
    if (rule.type === 'frequency') {
        node.subruneState.freqShift += rule.shift;
        node.subruneState.magicCost *= rule.magicCost;
    }
    if (rule.type === 'direction') {
        node.subruneState.direction = rule.value;
    }
}
    const type = node.def.type;
    const sourceTag = node.state.lastSourceTag || node.sourceTag || null;
    const sourceNodeId = node.state.lastSourceNodeId || null;
    const strongIn = node.inputs && node.inputs[0] ? this.getInput(node, 0) : null;
    const dataIn = node.inputs && node.inputs[1] ? this.getInput(node, 1) : null;

    if (type === 'source_strong' || type === 'source_weak' || type === 'source_strong_blink' || type === 'source_weak_blink') {
      const signal = (type === 'source_strong' || type === 'source_strong_blink') ? SIG.STRONG : SIG.WEAK;
      const meta = this.cloneMeta(node.state.pendingSourceMeta || buildPrimaryMeta(node, node.sourceTag || ('M' + node.id), 1));
      node.state.pendingSourceMeta = null;
      this.updateNodeActivation(node, time, signal, meta.originSourceTag || node.sourceTag || null, node.id);
      this.emitFromNode(node, time + node.def.delay, signal, null, null, meta.originSourceTag || node.sourceTag || null, meta, node.id);
      return;
    }

    if (isCircleSimple(node)) {
      this.ensureSimpleCircleNode(node);
      const mem = this.ensureCircleMemory(node);
      const in0 = this.getInput(node, 0); // левый верхний: trigger material
      const in1 = this.getInput(node, 1); // левый нижний: trigger virtual
      const in2 = this.getInput(node, 2); // верхний левый: material data in
      const in3 = this.getInput(node, 3); // верхний правый: virtual data in
      const tag = node.state.lastSourceTag || node.sourceTag || null;
      const changed0 = !!(in0 && in0.lastTime === time);
      const changed1 = !!(in1 && in1.lastTime === time);
      const changed2 = !!(in2 && in2.lastTime === time);
      const changed3 = !!(in3 && in3.lastTime === time);

      if (changed2 && in2.signal === SIG.DATA && !mem.materialLocked) {
        const v = safeDisplay(in2.data);
        mem.materialValue = v;
        mem.materialUnits = encodeSimpleUnits(node, v, mem.materialCapacity);
        mem.materialLocked = true;
        node.customValue = String(v);
        mem.lastMaterialWriteAt = time;
        node.state.glow = 1;
        this.updateNodeActivation(node, time, SIG.DATA, in2.sourceTag || tag, in2.sourceNodeId || null);
        this.log('💾 ' + (in2.sourceTag ? '[' + in2.sourceTag + '] ' : '') + node.label + ' записал material (' + mem.materialUnits.length + '/' + mem.materialCapacity + ').', 'data');
      }

      if (changed3 && in3.signal === SIG.DATA) {
        const hadVirtual = mem.virtualWriteCount > 0 || (mem.virtualValue !== '' && mem.virtualValue !== null && mem.virtualValue !== undefined);
        const v = safeDisplay(in3.data);
        mem.virtualValue = v;
        mem.virtualUnits = encodeSimpleUnits(node, v, mem.virtualCapacity);
        mem.virtualWriteCount += 1;
        mem.lastVirtualWriteAt = time;
        node.state.glow = 1;
        this.updateNodeActivation(node, time, SIG.DATA, in3.sourceTag || tag, in3.sourceNodeId || null);
        this.log('💾 ' + (in3.sourceTag ? '[' + in3.sourceTag + '] ' : '') + node.label + (hadVirtual ? ' перезаписал' : ' записал') + ' virtual (' + mem.virtualUnits.length + '/' + mem.virtualCapacity + ').', 'data');
      }

      if (changed0 && (in0.signal === SIG.WEAK || in0.signal === SIG.STRONG)) {
        this.updateNodeActivation(node, time, in0.signal, in0.sourceTag || tag, in0.sourceNodeId || null);
        mem.lastMaterialReadAt = time;
        this.emitFromNode(node, time + node.def.delay, in0.signal, null, 0, in0.sourceTag || tag, in0.meta, in0.sourceNodeId || null);
        this.emitFromNode(node, time + node.def.delay, SIG.DATA, mem.materialValue, 2, in0.sourceTag || tag, in0.meta, in0.sourceNodeId || null);
        this.log('📤 ' + (in0.sourceTag ? '[' + in0.sourceTag + '] ' : '') + node.label + ' вывел material.', 'run');
      }

      if (changed1 && (in1.signal === SIG.WEAK || in1.signal === SIG.STRONG)) {
        this.updateNodeActivation(node, time, in1.signal, in1.sourceTag || tag, in1.sourceNodeId || null);
        mem.lastVirtualReadAt = time;
        this.emitFromNode(node, time + node.def.delay, in1.signal, null, 1, in1.sourceTag || tag, in1.meta, in1.sourceNodeId || null);
        this.emitFromNode(node, time + node.def.delay, SIG.DATA, mem.virtualValue, 3, in1.sourceTag || tag, in1.meta, in1.sourceNodeId || null);
        this.log('📤 ' + (in1.sourceTag ? '[' + in1.sourceTag + '] ' : '') + node.label + ' вывел virtual.', 'run');
      }

      return;
    }

    if (type === 'logic_reverse') {
      if (!strongIn || strongIn.signal === SIG.NONE) return;
      this.armReverseFromInput(node, strongIn, time);
      return;
    }

    if (type === 'logic_reverse_auto') {
      if (!strongIn || strongIn.signal === SIG.NONE) return;
      this.armReverseAutoFromInput(node, strongIn, time);
      return;
    }

    if (type === 'censor_moment') {
      if (!strongIn || strongIn.signal !== SIG.STRONG) return;
      const sourceFlag = getCensorStrongSourceFlag(strongIn.meta);
      const state = node.runtime.censorMoment;
      if (!sourceFlag || state.seenStrongSources.has(sourceFlag)) return;
      state.seenStrongSources.add(sourceFlag);
      state.pendingShots.push({ sourceTag: sourceFlag, sourceNodeId: strongIn.sourceNodeId || null, meta: this.cloneMeta(strongIn.meta) });
      state.state = 'charging';
      if (!state.charging) {
        state.charging = true;
        state.chargeStart = time;
        state.readyTime = time + Number(node.def.thresholdMs || 1200);
        state.cycleToken += 1;
        this.eventQueue.push({ kind: 'censor_ready', time: state.readyTime, nodeId: node.id, token: state.cycleToken });
      }
      this.updateNodeActivation(node, time, SIG.STRONG, sourceFlag, strongIn.sourceNodeId || sourceNodeId);
      return;
    }

    if (type === 'censor_hold') {
      const input = strongIn || dataIn;
      if (!input || input.signal === SIG.NONE) return;
      const state = node.runtime.censorHold;
      const now = time;
      const sourceFlag = input.signal === SIG.STRONG ? getCensorStrongSourceFlag(input.meta) : null;
      if (input.signal === SIG.STRONG && sourceFlag && !state.seenStrongSources.has(sourceFlag) && state.hotUntil <= now) {
        state.seenStrongSources.add(sourceFlag);
        state.charging = false;
        state.opened = true;
        state.state = 'open';
        state.chargeStart = now;
        state.readyTime = now;
        state.hotUntil = now + Number(node.def.coolMs || 5000);
        state.triggerSourceTag = sourceFlag;
        this.updateNodeActivation(node, time, SIG.STRONG, sourceFlag, input.sourceNodeId || sourceNodeId);
        this.log('🟢 [' + sourceFlag + '] ' + node.label + ' мгновенно разогрелся и теперь остывает 5 секунд.', 'run');
        return;
      }
      if (state.hotUntil > now && (input.signal === SIG.WEAK || input.signal === SIG.STRONG)) {
        const repeatFlag = getCensorStrongSourceFlag(input.meta);
        if (repeatFlag && state.seenStrongSources.has(repeatFlag)) return;
        this.updateNodeActivation(node, time, input.signal, input.sourceTag || sourceTag, input.sourceNodeId || sourceNodeId);
        this.emitFromNode(node, time + node.def.delay, input.signal, input.data, 0, input.sourceTag || sourceTag, input.meta, input.sourceNodeId || sourceNodeId);
      }
      return;
    }

    if (type === 'effector_light_rgb') {
      if (!strongIn || strongIn.signal !== SIG.STRONG) return;
      const spectrum = computeLightSpectrumState(node, strongIn.meta);
      if (spectrum) {
        node.state.effectColorCode = 0;
        node.state.effectWavelength = spectrum.wavelength;
        node.state.effectColorName = spectrum.colorName;
        node.state.effectColor = spectrum.colorCss;
        node.state.frequencyShiftPct = (spectrum.totalShift * 100).toFixed(1);
        node.state.flash = 1;
      } else {
        node.state.effectColorCode = 0;
        node.state.effectColorName = 'жёлтый';
      }
      this.updateNodeActivation(node, time, SIG.STRONG, strongIn.sourceTag || sourceTag, strongIn.sourceNodeId || sourceNodeId);
      const text = '💡 ' + (strongIn.sourceTag ? '[' + strongIn.sourceTag + '] ' : '') + node.label + ': свечение ' + (node.state.effectColorName || 'жёлтый') + (node.state.effectWavelength ? (' (λ = ' + node.state.effectWavelength + ' нм)') : '');
      this.log(text + ' | задержка цепи = ' + Math.round(time) + ' мс', 'run');
      this.emitFromNode(node, time + node.def.delay, SIG.STRONG, null, 0, strongIn.sourceTag || sourceTag, strongIn.meta || null, strongIn.sourceNodeId || sourceNodeId);
      return;
    }

    if (type === 'detector_toggle') {
      const value = String(node.customValue || '0') === '1' ? 1 : 0;
      node.data.value = value;
      node.data.lastUpdatedTime = time;
      this.updateNodeActivation(node, time, SIG.DATA, sourceTag, sourceNodeId);
      this.emitFromNode(node, time + node.def.delay, SIG.DATA, value, null, sourceTag, null, sourceNodeId);
      return;
    }
    if (type === 'val_number' || type === 'val_text') {
      const carrierIn = this.getInput(node, 0);
      const dataInput = this.getInput(node, 1);
      const hasCarrier = carrierIn && isCarrierSignal(carrierIn.signal) && carrierIn.lastTime === time;
      const hasData = dataInput && dataInput.signal === SIG.DATA && dataInput.lastTime === time;
      if (!hasCarrier && !hasData) return;

      let value = hasData ? dataInput.data : this.valueFromCustom(node);
      if (hasData) node.customValue = String(value == null ? '' : value);
      node.data.value = value;
      node.data.lastUpdatedTime = time;

      if (hasData) {
        this.updateNodeActivation(node, time, SIG.DATA, dataInput.sourceTag || sourceTag, dataInput.sourceNodeId || sourceNodeId);
      }
      if (hasCarrier) {
        this.updateNodeActivation(node, time, carrierIn.signal, carrierIn.sourceTag || sourceTag, carrierIn.sourceNodeId || sourceNodeId);
        this.emitFromNode(node, time + node.def.delay, carrierIn.signal, value, 0, carrierIn.sourceTag || sourceTag, carrierIn.meta || null, carrierIn.sourceNodeId || sourceNodeId);
      }
      const dataSource = hasData ? dataInput : carrierIn;
      this.emitFromNode(node, time + node.def.delay, SIG.DATA, value, 1, dataSource.sourceTag || sourceTag, dataSource.meta || null, dataSource.sourceNodeId || sourceNodeId);
      return;
    }
    if (type.startsWith('op_')) {
      const requiredInputs = node.def.inputs;
      for (let i = 0; i < requiredInputs; i++) {
        if (this.getInput(node, i).signal !== SIG.DATA && !(requiredInputs === 2 && i === 1 && node.customValue !== '')) return;
      }
      const result = this.calculateOperator(node);
      node.data.value = result;
      node.data.lastUpdatedTime = time;
      this.updateNodeActivation(node, time, SIG.DATA, sourceTag, sourceNodeId);
      this.log('🧮 ' + (sourceTag ? '[' + sourceTag + '] ' : '') + node.label + ' = ' + String(result), 'data');
      this.emitFromNode(node, time + node.def.delay, SIG.DATA, result, null, sourceTag, null, sourceNodeId);
      return;
    }
    if (type === 'router_split') {
      const input = this.getInput(node, 0);
      if (input.signal === SIG.NONE) return;
      this.updateNodeActivation(node, time, input.signal, input.sourceTag || sourceTag, input.sourceNodeId || sourceNodeId);
      for (let port = 0; port < node.def.outputs; port++) {
        this.emitFromNode(node, time + node.def.delay, input.signal, input.data, port, input.sourceTag || sourceTag, input.meta, input.sourceNodeId || sourceNodeId);
      }
      return;
    }
    if (type === 'router_join') {
      const i0 = this.getInput(node, 0), i1 = this.getInput(node, 1);
      const chosen = [i0, i1].sort((a, b) => (b.lastTime - a.lastTime) || (b.signal - a.signal))[0];
      if (!chosen || chosen.signal === SIG.NONE) return;
      const outData = chosen.signal === SIG.DATA ? chosen.data : (i0.data ?? i1.data ?? null);
      const outMeta = chosen.meta || i0.meta || i1.meta || null;
      this.updateNodeActivation(node, time, chosen.signal, chosen.sourceTag || sourceTag, chosen.sourceNodeId || sourceNodeId);
      this.emitFromNode(node, time + node.def.delay, chosen.signal, outData, null, chosen.sourceTag || sourceTag, outMeta, chosen.sourceNodeId || sourceNodeId);
      return;
    }
    if (type === 'delay_block') {
      const input = this.getInput(node, 0);
      if (input.signal === SIG.NONE) return;
      this.updateNodeActivation(node, time, input.signal, input.sourceTag || sourceTag, input.sourceNodeId || sourceNodeId);
      this.emitFromNode(node, time + node.def.delay, input.signal, input.data, null, input.sourceTag || sourceTag, input.meta, input.sourceNodeId || sourceNodeId);
      return;
    }
    if (type === 'logic_if') {
      if (!strongIn || strongIn.signal !== SIG.STRONG) return;
      const condition = this.getInput(node, 1);
      this.updateNodeActivation(node, time, SIG.STRONG, strongIn.sourceTag || sourceTag, strongIn.sourceNodeId || sourceNodeId);
      if (condition && condition.signal === SIG.DATA && truthyInput(condition)) {
        this.emitFromNode(node, time + node.def.delay, SIG.STRONG, null, null, strongIn.sourceTag || sourceTag, strongIn.meta || condition.meta || null, strongIn.sourceNodeId || sourceNodeId);
      }
      return;
    }
    if (type === 'logic_and') {
      const a = this.getInput(node, 0), b = this.getInput(node, 1);
      const carrier = a.signal === SIG.STRONG ? a : (b.signal === SIG.STRONG ? b : null);
      if (!carrier) return;
      if (a.signal === SIG.NONE || b.signal === SIG.NONE) return;
      if (!(truthyInput(a) && truthyInput(b))) return;
      this.updateNodeActivation(node, time, SIG.STRONG, carrier.sourceTag || sourceTag, carrier.sourceNodeId || sourceNodeId);
      this.emitFromNode(node, time + node.def.delay, SIG.STRONG, null, null, carrier.sourceTag || sourceTag, carrier.meta || a.meta || b.meta, carrier.sourceNodeId || sourceNodeId);
      return;
    }
    if (type === 'logic_or') {
      const a = this.getInput(node, 0), b = this.getInput(node, 1);
      const carrier = a.signal === SIG.STRONG ? a : (b.signal === SIG.STRONG ? b : null);
      if (!carrier) return;
      if (!(truthyInput(a) || truthyInput(b))) return;
      this.updateNodeActivation(node, time, SIG.STRONG, carrier.sourceTag || sourceTag, carrier.sourceNodeId || sourceNodeId);
      this.emitFromNode(node, time + node.def.delay, SIG.STRONG, null, null, carrier.sourceTag || sourceTag, carrier.meta || a.meta || b.meta, carrier.sourceNodeId || sourceNodeId);
      return;
    }
    if (type === 'logic_not') {
      if (!strongIn || strongIn.signal !== SIG.STRONG) return;
      const condition = this.getInput(node, 1);
      this.updateNodeActivation(node, time, SIG.STRONG, strongIn.sourceTag || sourceTag, strongIn.sourceNodeId || sourceNodeId);
      if (!(condition && condition.signal === SIG.DATA && truthyInput(condition))) {
        this.emitFromNode(node, time + node.def.delay, SIG.STRONG, null, null, strongIn.sourceTag || sourceTag, strongIn.meta || condition?.meta || null, strongIn.sourceNodeId || sourceNodeId);
      }
      return;
    }
    if (type === 'memory_counter') {
      const input = this.getInput(node, 0);
      if (input.signal !== SIG.STRONG) return;
      const max = Math.pow(2, node.memory.capacityBits) - 1;
      node.memory.value = (node.memory.value + 1) % (max + 1);
      node.data.value = node.memory.value;
      node.data.lastUpdatedTime = time;
      this.updateNodeActivation(node, time, SIG.STRONG, input.sourceTag || sourceTag, input.sourceNodeId || sourceNodeId);
      this.log('💾 ' + (input.sourceTag ? '[' + input.sourceTag + '] ' : '') + node.label + ' = ' + node.memory.value + ' (' + node.getBinaryString() + ')', 'run');
      this.emitFromNode(node, time + node.def.delay, SIG.DATA, node.memory.value, null, input.sourceTag || sourceTag, input.meta, input.sourceNodeId || sourceNodeId);
      return;
    }
    if (type === 'memory_counter_dir') {
      const input = this.getInput(node, 0);
      if (input.signal !== SIG.STRONG) return;
      const max = Number(node.def.counterMax || 6);
      node.memory.value = (node.memory.value + 1) % (max + 1);
      node.data.value = node.memory.value;
      node.data.lastUpdatedTime = time;
      this.updateNodeActivation(node, time, SIG.STRONG, input.sourceTag || sourceTag, input.sourceNodeId || sourceNodeId);
      this.log('💾 ' + (input.sourceTag ? '[' + input.sourceTag + '] ' : '') + node.label + ' = ' + node.memory.value + ' / ' + max, 'run');
      this.emitFromNode(node, time + node.def.delay, SIG.DATA, node.memory.value, null, input.sourceTag || sourceTag, input.meta, input.sourceNodeId || sourceNodeId);
      return;
    }
    if (type === 'effect_modifier_scale' || type === 'effect_modifier_direction' || type === 'effect_modifier_frequency') {
      const input = this.getInput(node, 0);
      if (input.signal === SIG.NONE) return;
      const patch = {};
      if (type === 'effect_modifier_scale') patch.scale = node.def.modScale;
      if (type === 'effect_modifier_direction') patch.direction = node.def.modDirection;
      if (type === 'effect_modifier_frequency') {
        patch.frequency = node.def.modFrequency;
        const isUp = String(node.def.modFrequency || '').includes('повышенная');
        patch.freqShift = isUp ? 0.15 : -0.15;
      }
      const meta = this.mergeMeta(input.meta, patch);
      this.updateNodeActivation(node, time, input.signal, input.sourceTag || sourceTag, input.sourceNodeId || sourceNodeId);
      this.emitFromNode(node, time + node.def.delay, input.signal, input.data, null, input.sourceTag || sourceTag, meta, input.sourceNodeId || sourceNodeId);
      return;
    }
    if (isLightRuneNode(node)) {
      const input = this.getInput(node, 0);
      if (!input || input.signal !== SIG.STRONG) return;
      const spectrum = computeLightSpectrumState(node, input.meta);
      if (spectrum) {
        node.state.effectWavelength = spectrum.wavelength;
        node.state.effectColorName = spectrum.colorName;
        node.state.effectColor = spectrum.colorCss;
        node.state.frequencyShiftPct = (spectrum.totalShift * 100).toFixed(1);
        node.state.flash = 1;
      }
      this.updateNodeActivation(node, time, SIG.STRONG, input.sourceTag || sourceTag, input.sourceNodeId || sourceNodeId);
      const logText = '💡 ' + (input.sourceTag ? '[' + input.sourceTag + '] ' : '') + node.label + ': свечение ' + (node.state.effectColorName || 'жёлтый') + (node.state.effectWavelength ? (' (λ = ' + node.state.effectWavelength + ' нм)') : '');
      this.log(logText + ' | задержка цепи = ' + Math.round(time) + ' мс', 'run');
      this.emitFromNode(node, time + node.def.delay, SIG.STRONG, null, null, input.sourceTag || sourceTag, input.meta, input.sourceNodeId || sourceNodeId);
      return;
    }
    if (type === 'effector' || type === 'circle_complex') {
      const input = this.getInput(node, 0);
      if (!input || input.signal !== SIG.STRONG) return;
      this.updateNodeActivation(node, time, SIG.STRONG, input.sourceTag || sourceTag, input.sourceNodeId || sourceNodeId);
      const effText = this.buildEffectText(node, input.meta);
const scaleTxt = node.subruneState.scale !== 1 ? ` | Сила: x${node.subruneState.scale.toFixed(2)}` : '';
const dirTxt = node.subruneState.direction ? ` | Направление: ${node.subruneState.direction}` : '';
this.log('✨ ' + (input.sourceTag ? '[' + input.sourceTag + '] ' : '') + effText + scaleTxt + dirTxt, 'run');
      this.emitFromNode(node, time + node.def.delay, SIG.STRONG, null, null, input.sourceTag || sourceTag, input.meta, input.sourceNodeId || sourceNodeId);
      return;
    }
  }

  sortQueue() {
    this.eventQueue.sort((a, b) => a.time - b.time || a.nodeId - b.nodeId);
  }

  processNextTimeBucket() {
    if (this.eventQueue.length === 0) return false;
    this.sortQueue();
    const nextTime = this.eventQueue[0].time;
    this._lastBucketDiagnostics = this.peekBucketDiagnostics(nextTime, 1200);
    this.simTime = nextTime;
    const bucket = [];
    while (this.eventQueue.length > 0 && this.eventQueue[0].time === nextTime) bucket.push(this.eventQueue.shift());
    const affectedIds = new Set();
    for (const event of bucket) {
      this.processedEvents += 1;
      const node = this.nodes.find(n => n.id === event.nodeId);
      if (!node) continue;
      if (event.kind === 'censor_ready' || event.kind === 'censor_spit' || event.kind === 'reverse_auto_fire' || event.kind === 'blinker_tick') { this.handleCustomEvent(node, event); continue; }
      if (event.kind === 'source') {
        node.state.lastSourceTag = event.sourceTag || node.sourceTag || null;
        node.state.lastSourceNodeId = event.sourceNodeId || node.id;
        node.state.pendingSourceMeta = this.cloneMeta(event.sourceMeta || buildPrimaryMeta(node, event.sourceTag || node.sourceTag || ('M' + node.id), 1));
        this.activeSourceTags.add(node.state.lastSourceTag || ('N' + node.id));
        affectedIds.add(node.id); continue;
      }
      if (event.kind === 'prime' || event.kind === 'reeval') { if (event.kind === 'reeval') { node.state.lastSourceTag = event.sourceTag || node.state.lastSourceTag || null; node.state.lastSourceNodeId = event.sourceNodeId || node.state.lastSourceNodeId || null; } affectedIds.add(node.id); continue; }
      if (event.kind === 'arrive') {
        if (!this.canAcceptSignal(node, event.signal, event.port)) { this.log('🚫 ' + node.label + ' [' + this.describePort(node, event.port, 'in') + '] отверг ' + signalName(event.signal), 'warn'); continue; }
        const input = node.inputs[event.port]; if (!input) continue;
        input.signal = event.signal; input.data = event.data; input.meta = this.cloneMeta(event.meta); input.sourceTag = event.sourceTag || null; input.sourceNodeId = event.sourceNodeId || null; input.lastTime = event.time; input.arrivalCount += 1; input.connectionId = event.connectionId || null; input.fromNodeId = event.fromNodeId || null; input.fromNodeType = event.fromNodeType || null;
        node.state.lastSourceTag = event.sourceTag || node.state.lastSourceTag || null; node.state.lastSourceNodeId = event.sourceNodeId || node.state.lastSourceNodeId || null; affectedIds.add(node.id); continue;
      }
      if (event.kind === 'reverse_arrive') {
        this.updateNodeActivation(node, event.time, SIG.STRONG, event.sourceTag || node.state.lastSourceTag || null, event.sourceNodeId || null);
        node.state.flash = 1;
        this.log('↩️ ' + (event.sourceTag ? '[' + event.sourceTag + '] ' : '') + 'обратный ход дошёл до ' + node.label + ' | t=' + Math.round(event.time) + ' мс', 'run');
        const upstream = this.getReverseContinuationConnections(node, event);
        for (const conn of upstream) this.scheduleReverseArrival(conn, SIG.STRONG, event.time + node.def.delay, event.sourceTag, event.meta, event.sourceNodeId, (event.reverseHop || 0) + 1, event.visitedConnectionIds || []);
        continue;
      }
    }
    for (const nodeId of affectedIds) {
      const node = this.nodes.find(n => n.id === nodeId);
      if (!node) continue;
      const hasReeval = bucket.some(e => e.kind === 'reeval' && e.nodeId === nodeId);
      this.evaluateNode(node, nextTime, hasReeval ? 'reeval' : 'event');
    }
    this.refreshStats();
    return true;
  }

  collectConnectedNodeIds(seedNodes) {
    const seeds = Array.isArray(seedNodes) ? seedNodes.filter(Boolean) : [];
    if (!seeds.length) return new Set(this.nodes.map(node => node.id));
    const visited = new Set();
    const queue = [];
    for (const node of seeds) {
      if (!node || visited.has(node.id)) continue;
      visited.add(node.id);
      queue.push(node);
    }
    while (queue.length) {
      const current = queue.shift();
      for (const conn of this.connections) {
        let next = null;
        if (conn.fromNode === current) next = conn.toNode;
        else if (conn.toNode === current) next = conn.fromNode;
        if (next && !visited.has(next.id)) {
          visited.add(next.id);
          queue.push(next);
        }
      }
    }
    return visited;
  }

  primeDataNodes(atTime = 0, seedNodes = null) {
    const allowedIds = this.collectConnectedNodeIds(seedNodes);
    for (const node of this.nodes) {
      if (!allowedIds.has(node.id)) continue;
      if (node.def.type === 'detector_toggle') {
        this.eventQueue.push({
          kind: 'prime',
          time: atTime,
          nodeId: node.id
        });
      }
    }
  }

  startSourcePulse(sourceNode, atTime = null) {
    if (!sourceNode || !sourceNode.def || !isAnySourceType(sourceNode.def.type)) return;
    const shouldFreshRestart = this.initialized
      && !this.simulationRunning
      && this.eventQueue.length === 0
      && !this.hasActiveSelfTimedStates()
      && !isBlinkSourceType(sourceNode.def.type);
    const shouldScopedPrime = !this.initialized || shouldFreshRestart || (atTime === null && !this.simulationRunning && this.eventQueue.length === 0);
    sourceNode.runtimeSourcePulseCounter = (sourceNode.runtimeSourcePulseCounter || 0) + 1;
    const pulseIndex = sourceNode.runtimeSourcePulseCounter;
    const prefix = isStrongSourceLike(sourceNode.def.type) ? 'М' : 'СМ';
    const sourceTag = sourceNode.sourceTag || (prefix + sourceNode.id);
    const sourceMeta = buildPrimaryMeta(sourceNode, sourceTag, pulseIndex);
    sourceNode.state.pendingSourceMeta = this.cloneMeta(sourceMeta);
    const time = atTime === null ? ((this.initialized && !shouldFreshRestart) ? this.simTime : 0) : atTime;
    if (!this.initialized || shouldFreshRestart) {
      this.clearSimulationState();
      this.initialized = true;
    }
    if (shouldScopedPrime) {
      this.primeDataNodes(time, [sourceNode]);
    }
    this.lastStartedSourceId = sourceNode.id;
    this.eventQueue.push({ kind: 'source', time, nodeId: sourceNode.id, sourceTag, sourceNodeId: sourceNode.id, sourceMeta: this.cloneMeta(sourceMeta) });
    this.sortQueue();
    this.activeSourceTags.add(sourceTag);
    if (!isBlinkSourceType(sourceNode.def.type)) {
      this.log('🚀 Запуск от узла: ' + sourceNode.label + ' [' + sourceTag + '] | primary=' + sourceMeta.primaryStrongToken, 'run');
    }
    this.refreshStats();
  }

  scheduleBlinkerTick(node, time, generation) {
    if (!node) return;
    this.eventQueue.push({ kind: 'blinker_tick', time, nodeId: node.id, generation });
    this.sortQueue();
  }

  toggleBlinkingSource(node) {
    if (!node || !node.def || !isBlinkSourceType(node.def.type)) return false;
    node.runtime = node.runtime || {};
    node.runtime.blinker = node.runtime.blinker || { enabled: false, generation: 0, intervalMs: 2000, cycleStartTime: 0, nextTickTime: 0 };
    const bl = node.runtime.blinker;
    const now = this.initialized ? this.simTime : 0;
    if (!bl.enabled) {
      if (!this.initialized) {
        this.clearSimulationState();
        this.initialized = true;
        this.primeDataNodes(now);
      }
      bl.enabled = true;
      bl.generation += 1;
      bl.cycleStartTime = now;
      bl.nextTickTime = now + bl.intervalMs;
      this.scheduleBlinkerTick(node, bl.nextTickTime, bl.generation);
      this.run();
      this.log('⏱ ' + node.label + ' включён: цикл ' + bl.intervalMs + ' мс, импульс на 100%.', 'run');
    } else {
      bl.enabled = false;
      bl.generation += 1;
      bl.cycleStartTime = now;
      bl.nextTickTime = 0;
      this.eventQueue = this.eventQueue.filter(ev => !(ev.kind === 'blinker_tick' && ev.nodeId === node.id));
      this.sortQueue();
      this.log('⏱ ' + node.label + ' выключен.', 'warn');
      this.refreshStats();
    }
    return true;
  }

  startAllSources(atTime = null) {
    const sources = this.nodes.filter(n => n.def.type === 'source_strong' || n.def.type === 'source_weak');
    if (!sources.length) {
      this.log('Нет источников для запуска.', 'warn');
      return false;
    }
    const time = atTime === null ? (this.initialized ? this.simTime : 0) : atTime;
    if (!this.initialized) {
      this.clearSimulationState();
      this.initialized = true;
    }
    this.primeDataNodes(time, sources);
    for (const source of sources) {
      this.startSourcePulse(source, time);
    }
    return true;
  }

  run() {
    if (!this.initialized) {
      const ok = this.startAllSources(0);
      if (!ok) return;
    }
    this.simulationRunning = true;
    this.realTimeOffset = performance.now() - this.simTime;
    this.refreshStats();
    this.log('▶ Непрерывный режим включён.', 'run');
  }

  stepSimulation() {

    if (!this.initialized) {
      const ok = this.startAllSources(0);
      if (!ok) return;
    }

    this.simulationRunning = false;
    const ok = this.processNextTimeBucket();
    if (!ok) {
      this.log('Очередь пуста.', 'warn');
      this.refreshStats();
    }
  }

  loop() {
    if (this.simulationRunning) {
      const targetSimTime = performance.now() - this.realTimeOffset;
      const queueFactor = Math.max(1, Math.min(10, Math.ceil(this.eventQueue.length / 800)));
      const budgetEvents = Math.min(60000, Math.max(8000, 8000 * queueFactor));
      const budgetBuckets = Math.min(12000, Math.max(1500, 1500 * queueFactor));
      let frameEvents = 0;
      let frameBuckets = 0;
      let sameTimeBuckets = 0;
      let lastBucketTime = null;
      let stormReason = null;
      while (this.eventQueue.length > 0) {
        this.sortQueue();
        const nextTime = this.eventQueue[0].time;
        if (nextTime > targetSimTime) break;
        const beforeProcessed = this.processedEvents;
        const beforeTime = nextTime;
        const done = this.processNextTimeBucket();
        if (!done) break;
        const delta = this.processedEvents - beforeProcessed;
        frameEvents += Math.max(0, delta);
        frameBuckets += 1;
        if (lastBucketTime === beforeTime) sameTimeBuckets += 1;
        else {
          lastBucketTime = beforeTime;
          sameTimeBuckets = 1;
        }
        if (sameTimeBuckets > 2200) {
          stormReason = 'same_time_loop';
          break;
        }
        if (frameEvents > budgetEvents || frameBuckets > budgetBuckets) {
          stormReason = 'budget';
          break;
        }
      }
      if (stormReason) {
        this.reportEventStorm({
          reason: stormReason,
          frameEvents,
          frameBuckets,
          sameTimeBuckets,
          queueLeft: this.eventQueue.length,
          lastBucket: this._lastBucketDiagnostics || null
        });
      }
      this.simTime = Math.max(this.simTime, targetSimTime);
      this.updateSelfTimedStates();
      if (this.eventQueue.length === 0 && this.initialized && !this.hasActiveSelfTimedStates()) this.stop(false);
      this.refreshStats();
    }
    this.draw();
    requestAnimationFrame(() => this.loop());
  }

  
  getCircleProcessorGeom(node) {
    this.ensureSimpleCircleNode(node);
    const side = 34;
    const topBottom = 30;
    const bodyX = node.x + side;
    const bodyY = node.y + topBottom;
    const bodyW = node.w - side * 2;
    const bodyH = node.h - topBottom * 2;
    const tabH = 34;
    const leftTopY = bodyY + bodyH * 0.18;
    const leftBottomY = bodyY + bodyH * 0.64;
    const topLeftX = bodyX + bodyW * 0.18;
    const topRightX = bodyX + bodyW * 0.62;
    return {
      bodyX, bodyY, bodyW, bodyH,
      bodyRight: bodyX + bodyW,
      bodyBottom: bodyY + bodyH,
      leftTabs: [
        { x1: node.x, x2: bodyX, y1: leftTopY, y2: leftTopY + tabH },
        { x1: node.x, x2: bodyX, y1: leftBottomY, y2: leftBottomY + tabH }
      ],
      rightTabs: [
        { x1: bodyX + bodyW, x2: node.x + node.w, y1: leftTopY, y2: leftTopY + tabH },
        { x1: bodyX + bodyW, x2: node.x + node.w, y1: leftBottomY, y2: leftBottomY + tabH }
      ],
      topTabs: [
        { x1: topLeftX, x2: topLeftX + 54, y1: node.y, y2: bodyY },
        { x1: topRightX, x2: topRightX + 54, y1: node.y, y2: bodyY }
      ],
      bottomTabs: [
        { x1: topLeftX, x2: topLeftX + 54, y1: bodyY + bodyH, y2: node.y + node.h },
        { x1: topRightX, x2: topRightX + 54, y1: bodyY + bodyH, y2: node.y + node.h }
      ]
    };
  }

getPortPos(node, index, type) {
    const t = node.def.type;
    
    // Логика для точек крепления сабрун
    if (index < 0) {
        const subIndex = -(index + 1);
        const count = node.def.maxSubrunes || 0;
        if (subIndex >= count) return { x: node.x, y: node.y };
        const scale = this.viewport.scale;
        const nTop = Math.ceil(count / 2);
        const nBot = count - nTop;
        const cx = node.x + node.w / 2;
        const topY = node.y - 10 / scale;
        const botY = node.y + node.h + 10 / scale;
        const spacing = 20 / scale;
        const isTop = (subIndex % 2 === 0);
        const k = Math.floor(subIndex / 2);
        let startX;
        if (isTop) startX = cx - ((nTop - 1) * spacing) / 2;
        else startX = cx - ((nBot - 1) * spacing) / 2;
        const x = startX + k * spacing;
        const y = isTop ? topY : botY;
        return { x, y };
    }

    if (node.def.isSubrune) {
        return { x: node.x + node.w, y: node.y + node.h * 0.5 };
    }
    if (isCircleSimple(node)) {
        const g = this.getCircleProcessorGeom(node);
        const inset = 6 / this.viewport.scale;
        if (type === 'in') {
            if (index === 0) return { x: g.leftTabs[0].x1 + inset, y: (g.leftTabs[0].y1 + g.leftTabs[0].y2) / 2 };
            if (index === 1) return { x: g.leftTabs[1].x1 + inset, y: (g.leftTabs[1].y1 + g.leftTabs[1].y2) / 2 };
            if (index === 2) return { x: (g.topTabs[0].x1 + g.topTabs[0].x2) / 2, y: g.topTabs[0].y1 + inset };
            if (index === 3) return { x: (g.topTabs[1].x1 + g.topTabs[1].x2) / 2, y: g.topTabs[1].y1 + inset };
        } else {
            if (index === 0) return { x: g.rightTabs[0].x2 - inset, y: (g.rightTabs[0].y1 + g.rightTabs[0].y2) / 2 };
            if (index === 1) return { x: g.rightTabs[1].x2 - inset, y: (g.rightTabs[1].y1 + g.rightTabs[1].y2) / 2 };
            if (index === 2) return { x: (g.bottomTabs[0].x1 + g.bottomTabs[0].x2) / 2, y: g.bottomTabs[0].y2 - inset };
            if (index === 3) return { x: (g.bottomTabs[1].x1 + g.bottomTabs[1].x2) / 2, y: g.bottomTabs[1].y2 - inset };
        }
    }
    if (t === 'effector_light_rgb') {
        if (type === 'in' && index === 0) return { x: node.x, y: node.y + node.h * 0.5 };
        if (type === 'out' && index === 0) return { x: node.x + node.w, y: node.y + node.h * 0.5 };
    }
    if (t === 'logic_reverse' || t === 'logic_reverse_auto') return { x: node.x, y: node.y + node.h * 0.5 };
    const count = type === 'in' ? node.def.inputs : node.def.outputs;
    const y = node.y + node.h * (index + 1) / (count + 1);
    return { x: type === 'in' ? node.x : node.x + node.w, y };
}

  getPortAt(x, y, preferType = null) {
    const threshold = (this.isMobile ? 24 : 18) / this.viewport.scale;
    let best = null;
    let bestDist = Infinity;
    for (const node of this.nodes) {
        const scanKinds = (node.def.isSubrune && preferType)
            ? [preferType, preferType === 'out' ? 'in' : 'out']
            : ['in', 'out'];
        for (const kind of scanKinds) {
            const count = kind === 'in' ? node.def.inputs : node.def.outputs;
            for (let i = 0; i < count; i++) {
                const p = this.getPortPos(node, i, kind);
                const d = Math.hypot(x - p.x, y - p.y);
                if (d < threshold && d < bestDist) {
                    best = { node, index: i, type: kind };
                    bestDist = d;
                }
            }
        }
        
        // Проверка точек крепления сабрун
        const subCount = node.def.maxSubrunes || 0;
        if (subCount > 0) {
            const scale = this.viewport.scale;
            const nTop = Math.ceil(subCount / 2);
            const nBot = subCount - nTop;
            const cx = node.x + node.w / 2;
            const topY = node.y - 10 / scale;
            const botY = node.y + node.h + 10 / scale;
            const spacing = 20 / scale;
            for (let i = 0; i < subCount; i++) {
                const isTop = (i % 2 === 0);
                const k = Math.floor(i / 2);
                let startX;
                if (isTop) startX = cx - ((nTop - 1) * spacing) / 2;
                else startX = cx - ((nBot - 1) * spacing) / 2;
                const px = startX + k * spacing;
                const py = isTop ? topY : botY;
                const d = Math.hypot(x - px, y - py);
                if (d < threshold && d < bestDist) {
                    best = { node, index: -(i + 1), type: 'in' };
                    bestDist = d;
                }
            }
        }
    }
    return best;
}

  getBridgeAt(x, y) {
    const portShield = (this.isMobile ? 14 : 12) / this.viewport.scale;
    for (const node of this.nodes) {
      for (let i = 0; i < node.def.inputs; i++) {
        const p = this.getPortPos(node, i, 'in');
        if (Math.hypot(x - p.x, y - p.y) < portShield) return null;
      }
      for (let i = 0; i < node.def.outputs; i++) {
        const p = this.getPortPos(node, i, 'out');
        if (Math.hypot(x - p.x, y - p.y) < portShield) return null;
      }
    }
    const threshold = (this.isMobile ? 12 : 10) / this.viewport.scale;
    let best = null;
    let bestDist = Infinity;
    for (const bridge of this.bridges) {
      const controls = this.getBridgeCurvePoints(bridge).controls;
      for (const p of controls) {
        const dHandle = Math.hypot(x - p.x, y - p.y);
        if (dHandle < threshold * 1.15 && dHandle < bestDist) {
          best = bridge;
          bestDist = dHandle;
        }
      }
      for (let i = 0; i <= 40; i++) {
        const p = this.sampleBridgePoint(bridge, i / 40);
        const d = Math.hypot(x - p.x, y - p.y);
        if (d < threshold && d < bestDist) {
          best = bridge;
          bestDist = d;
        }
      }
    }
    return best;
  }

  deleteNode(node) {
    // Очистка ссылок на сабруны у хостов
    for (const n of this.nodes) {
        n.attachedSubrunes = n.attachedSubrunes.filter(s => s !== node);
    }
    this.nodes = this.nodes.filter(n => n !== node);
    const related = this.connections.filter(c => c.fromNode === node || c.toNode === node);
    for (const conn of related) {
      this.bridges = this.bridges.filter(b => b !== conn.bridge);
    }
    this.connections = this.connections.filter(c => c.fromNode !== node && c.toNode !== node);
    this.log('🗑 Удалён блок: ' + node.label, 'warn');
  }

  deleteBridge(bridge, silent = false) {
    // Если мостик был прикреплением, открепляем сабруну логически
    if (bridge.isAttachment) {
        const host = bridge.a.def.isSubrune ? bridge.b : bridge.a;
        const sub  = bridge.a.def.isSubrune ? bridge.a : bridge.b;
        if (host && host.attachedSubrunes) {
            const idx = host.attachedSubrunes.indexOf(sub);
            if (idx !== -1) {
                host.attachedSubrunes.splice(idx, 1);
                this.log('🔌 Сабруна ' + sub.label + ' откреплена от ' + host.label, 'sys');
            }
        }
    }
    this.bridges = this.bridges.filter(b => b !== bridge);
    this.connections = this.connections.filter(c => c.bridge !== bridge);
    if (!silent) this.log('🗑 Удалён мостик.', 'warn');
}

  toggleDeleteMode() {
    this.isDeleteMode = !this.isDeleteMode;
    document.getElementById('btnDelete').classList.toggle('active', this.isDeleteMode);
    if (this.isDeleteMode) {
      this.log('🗑 Режим удаления включён.', 'warn');
    }
  }

  openModal(target) {
    this.editingTarget = target;
    const modalValue = document.getElementById('modalValue');
    const modalDelay = document.getElementById('modalDelay');
    const modalValueLabel = document.getElementById('modalValueLabel');
    if (target.kind === 'node') {
      const node = this.nodes.find(n => n.id === target.id);
      if (!node) return;
      modalDelay.value = node.def.delay;
      const needsValue = node.def.editable || node.def.type === 'val_number' || node.def.type === 'val_text' || node.def.type === 'logic_reverse_auto';
      if (needsValue) {
        modalValue.style.display = 'block';
        modalValueLabel.style.display = 'block';
        modalValue.value = node.customValue || '';
        modalValue.placeholder = '';
        modalValueLabel.textContent = 'Значение / константа';
        if (node.def.type === 'logic_reverse_auto') {
          modalValue.value = String(clampAutoDelay(node.customValue || node.def.defaultValue || 1500));
          modalValue.placeholder = '500..3000';
          modalValueLabel.textContent = 'Автозадержка реверса (мс)';
        }
      } else {
        modalValue.style.display = 'none';
        modalValueLabel.style.display = 'none';
        modalValue.value = '';
      }
      if (isCircleSimple(node)) {
        modalValue.style.display = 'none';
        modalValueLabel.style.display = 'none';
        modalValue.value = '';
      }
    } else if (target.kind === 'bridge') {
      const bridge = this.bridges.find(b => b.id === target.id);
      if (!bridge) return;
      modalDelay.value = bridge.delay;
      modalValue.style.display = 'none';
      modalValueLabel.style.display = 'none';
      modalValue.value = '';
    }
    this.modal.style.pointerEvents = 'auto';
    this.modal.style.display = 'flex';
  }

  drawBridge(bridge) {
    const ctx = this.ctx;
    const curve = this.getBridgeCurvePoints(bridge);
    const points = curve.points;

    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length - 2; i++) {
      const xc = (points[i].x + points[i + 1].x) / 2;
      const yc = (points[i].y + points[i + 1].y) / 2;
      ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
    }
    if (points.length >= 2) {
      const penult = points[points.length - 2];
      const last = points[points.length - 1];
      ctx.quadraticCurveTo(penult.x, penult.y, last.x, last.y);
    }
    ctx.strokeStyle = bridge.glow > 0 ? this.getSignalColor(bridge.activeSignal) : '#334155';
    ctx.lineWidth = (bridge.glow > 0 ? 3.6 : 2.4) / this.viewport.scale;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.stroke();
    if (bridge.isAttachment) {
    ctx.save();
    ctx.setLineDash([6 / this.viewport.scale, 4 / this.viewport.scale]);
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.6)';
    ctx.lineWidth = 2 / this.viewport.scale;
    ctx.stroke();
    ctx.restore();
}

    bridge.glow = Math.max(0, bridge.glow - 0.02);

    const drawDiamond = (center, halfLen, halfThick, fill, stroke, text = '') => {
      const tx = center.tx, ty = center.ty, nx = center.nx, ny = center.ny;
      const p1 = { x: center.x + tx * halfLen, y: center.y + ty * halfLen };
      const p2 = { x: center.x + nx * halfThick, y: center.y + ny * halfThick };
      const p3 = { x: center.x - tx * halfLen, y: center.y - ty * halfLen };
      const p4 = { x: center.x - nx * halfThick, y: center.y - ny * halfThick };
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.lineTo(p3.x, p3.y);
      ctx.lineTo(p4.x, p4.y);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1.8 / this.viewport.scale;
      ctx.stroke();
      if (text) {
        ctx.fillStyle = '#e5e7eb';
        ctx.font = 'bold ' + (8.2 / this.viewport.scale) + 'px monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, center.x, center.y + (0.2 / this.viewport.scale));
      }
    };

    for (let i = 0; i < 3; i++) {
      const p = this.getBridgeHandleVisual(bridge, i);
      if (i === 1) {
        drawDiamond(
          p,
          (this.isMobile ? 22 : 19) / this.viewport.scale,
          (this.isMobile ? 12 : 10) / this.viewport.scale,
          bridge.glow > 0 ? 'rgba(30,41,59,0.96)' : 'rgba(15,23,42,0.96)',
          bridge.glow > 0 ? this.getSignalColor(bridge.activeSignal) : '#cbd5e1',
          bridge.delay + ' мс'
        );
      } else {
        drawDiamond(
          p,
          (this.isMobile ? 12 : 10) / this.viewport.scale,
          (this.isMobile ? 8 : 6.5) / this.viewport.scale,
          'rgba(15,23,42,0.94)',
          bridge.glow > 0 ? this.getSignalColor(bridge.activeSignal) : '#94a3b8'
        );
      }
    }
  }

  drawParticle(particle) {
    const pos = particle.getPosition(this.simTime);
    if (!pos) return false;
    const ctx = this.ctx;
    const color = this.getSignalColor(particle.signal);
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, (particle.signal === SIG.STRONG ? 6 : 5) / this.viewport.scale, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowBlur = 16;
    ctx.shadowColor = color;
    if (particle.signal === SIG.DATA && particle.data !== null) {
      ctx.font = (9 / this.viewport.scale) + 'px monospace';
      ctx.fillStyle = '#e2e8f0';
      ctx.textAlign = 'left';
      ctx.fillText(String(particle.data), pos.x + 8, pos.y - 8);
    }
    return true;
  }

  drawNode(node) {
    const ctx = this.ctx;
    node.state.glow = Math.max(0, node.state.glow - 0.025);
    node.state.flash = Math.max(0, node.state.flash - 0.02);

    const lightBaseColor = isLightRuneNode(node) ? (node.state.effectColor || wavelengthToCSS(getLightBaseWavelength(node) || 580)) : null;
    const stroke = node.state.glow > 0 ? (lightBaseColor || this.getSignalColor(node.state.signal, node)) : '#475569';
    ctx.shadowBlur = node.state.glow > 0 ? 18 : 0;
    ctx.shadowColor = node.state.glow > 0 ? stroke : 'transparent';
    ctx.fillStyle = '#0f172a';
    ctx.strokeStyle = stroke;
    ctx.lineWidth = (node.state.glow > 0 ? 3 : 2) / this.viewport.scale;
    ctx.beginPath();
    ctx.roundRect(node.x, node.y, node.w, node.h, 10);
    ctx.fill();
    ctx.stroke();
    ctx.shadowBlur = 0;
    drawAttachmentPoints(this.ctx, node, this.viewport.scale); // 👈 Вставьте сюда

    // ✅ Отрисовка прикрепленных сабрун (вставьте сюда)
    // ✅ Отрисовка прикрепленных сабрун (ОБНОВЛЕННЫЙ БЛОК)
if (node.attachedSubrunes && node.attachedSubrunes.length > 0) {
    const total = node.attachedSubrunes.length;
    const spacing = 20 / this.viewport.scale; // Должно совпадать с drawAttachmentPoints
    
    // Используем maxSubrunes для расчета сетки, чтобы точки стояли на местах слотов
    const m = node.def.maxSubrunes || total; 
    const nT = Math.ceil(m / 2);
    const nB = m - nT;
    const cx = node.x + node.w / 2;
    const topY = node.y - 10 / this.viewport.scale;
    const botY = node.y + node.h + 10 / this.viewport.scale;
    
    for (let i = 0; i < total; i++) {
        // Повторяем логику расчета координат из drawAttachmentPoints
        const isTop = (i % 2 === 0);
        const k = Math.floor(i / 2);
        
        let startX;
        if (isTop) {
            startX = cx - ((nT - 1) * spacing) / 2;
        } else {
            startX = cx - ((nB - 1) * spacing) / 2;
        }
        
        const x = startX + k * spacing;
        const y = isTop ? topY : botY;

        const sub = node.attachedSubrunes[i];
        const side = 12 / this.viewport.scale; // Размер иконки

        ctx.beginPath();
        ctx.roundRect(x - side/2, y - side/2, side, side, 2 / this.viewport.scale);
        ctx.fillStyle = '#0f172a';
        ctx.fill();
        ctx.strokeStyle = sub.def.color;
        ctx.lineWidth = 1.5 / this.viewport.scale;
        ctx.stroke();
        
        ctx.fillStyle = sub.def.color;
        ctx.font = (6 / this.viewport.scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(sub.def.label.substring(0, 3), x, y);
    }
}

    if (node.state.flash > 0) {
      const flashColor = lightBaseColor ? cssRgbWithAlpha(lightBaseColor, 0.12 + node.state.flash * 0.18) : ('rgba(251, 191, 36,' + (0.12 + node.state.flash * 0.18) + ')');
      ctx.fillStyle = flashColor;
      ctx.beginPath();
      ctx.roundRect(node.x - 4, node.y - 4, node.w + 8, node.h + 8, 14);
      ctx.fill();
    }

    ctx.fillStyle = isLightRuneNode(node) && node.state.effectColor ? node.state.effectColor : node.def.color;
    ctx.fillRect(node.x + 5, node.y + 5, 6, node.h - 10);

    ctx.fillStyle = '#fff';
    ctx.font = (11 / this.viewport.scale) + 'px sans-serif';
    ctx.textAlign = 'left';
    let display = node.label;
    if ((node.def.type === 'val_number' || node.def.type === 'val_text' || node.def.editable) && node.customValue !== '') {
      display = node.def.type.startsWith('op_') ? (node.label + ' ' + node.customValue) : (node.label + ': ' + node.customValue);
    }
    if (isCircleSimple(node)) display = node.label;
    ctx.fillText(display, node.x + 16, node.y + 18);

    ctx.font = (10 / this.viewport.scale) + 'px sans-serif';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText('delay ' + node.def.delay + 'мс', node.x + 16, node.y + 34);

    ctx.textAlign = 'right';
    ctx.fillStyle = this.getSignalColor(node.state.signal);
    ctx.fillText('S=' + node.state.signal + (node.state.lastSourceTag ? ' ' + node.state.lastSourceTag : ''), node.x + node.w - 10, node.y + 18);

    if (node.data.value !== null) {
      let dv = node.data.value;
      if (typeof dv === 'number' && !Number.isInteger(dv)) dv = dv.toFixed(2);
      dv = String(dv);
      if (dv.length > 18) dv = dv.slice(0, 15) + '...';
      ctx.fillStyle = '#22d3ee';
      ctx.font = (11 / this.viewport.scale) + 'px monospace';
      ctx.fillText('D=' + dv, node.x + node.w - 10, node.y + 36);
    }

    if (node.def.type === 'memory_counter') {
      ctx.fillStyle = '#020617';
      ctx.strokeStyle = '#fcd34d';
      ctx.lineWidth = 1.5 / this.viewport.scale;
      ctx.beginPath();
      ctx.roundRect(node.x + node.w - 50, node.y + 40, 40, 12, 5);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#fcd34d';
      ctx.font = (10 / this.viewport.scale) + 'px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(node.getBinaryString(), node.x + node.w - 30, node.y + 49);
    }

    if (node.def.type === 'source_strong' || node.def.type === 'source_weak' || node.def.type === 'source_strong_blink' || node.def.type === 'source_weak_blink') {
      this.drawSourceLaunchButton(node);
    }
    if (node.def.type === 'logic_reverse') {
      this.drawReverseLaunchButton(node);
    }

    if (isCircleSimple(node)) {
      const g = this.getCircleProcessorGeom(node);
      const mem = this.ensureCircleMemory(node);
      const matRatio = (mem.materialUnits.length || 0) / Math.max(1, mem.materialCapacity || 1);
      const virtRatio = (mem.virtualUnits.length || 0) / Math.max(1, mem.virtualCapacity || 1);
      const barW = 18 / this.viewport.scale;
      const barH = Math.max(44 / this.viewport.scale, g.bodyH * 0.30);
      const leftX = g.bodyX + 14 / this.viewport.scale;
      const rightX = g.bodyRight - barW - 14 / this.viewport.scale;
      const topY = g.bodyY + 12 / this.viewport.scale;
      const bottomY = g.bodyBottom - barH - 12 / this.viewport.scale;
      ctx.save();
      ctx.fillStyle = 'rgba(5,10,18,0.88)';
      ctx.fillRect(g.bodyX + 6 / this.viewport.scale, g.bodyY + 6 / this.viewport.scale, g.bodyW - 12 / this.viewport.scale, g.bodyH - 12 / this.viewport.scale);
      drawBar(ctx, leftX, topY, barW, barH, matRatio, true, 'rgba(244,114,182,0.88)');
      drawBar(ctx, leftX, bottomY, barW, barH, matRatio, false, 'rgba(244,114,182,0.88)');
      drawBar(ctx, rightX, topY, barW, barH, virtRatio, true, node.def.type === 'circle_memory_bit' ? 'rgba(34,211,238,0.9)' : 'rgba(167,139,250,0.9)');
      drawBar(ctx, rightX, bottomY, barW, barH, virtRatio, false, node.def.type === 'circle_memory_bit' ? 'rgba(34,211,238,0.9)' : 'rgba(167,139,250,0.9)');
      ctx.fillStyle = '#e5e7eb';
      ctx.textAlign = 'center';
      ctx.font = (11 / this.viewport.scale) + 'px sans-serif';
      ctx.fillText(node.label, g.bodyX + g.bodyW / 2, g.bodyY + 18 / this.viewport.scale);
      ctx.font = (9 / this.viewport.scale) + 'px sans-serif';
      ctx.fillStyle = '#f9a8d4';
      ctx.fillText('MATERIAL', leftX + barW / 2, g.bodyY + g.bodyH / 2);
      ctx.fillStyle = node.def.type === 'circle_memory_bit' ? '#67e8f9' : '#c4b5fd';
      ctx.fillText('VIRTUAL', rightX + barW / 2, g.bodyY + g.bodyH / 2);
      ctx.textAlign = 'left';
      ctx.fillStyle = '#cbd5e1';
      const tx = g.bodyX + 44 / this.viewport.scale;
      let ty = g.bodyY + 44 / this.viewport.scale;
      ctx.fillText(('Материал: ' + (mem.materialUnits.length || 0) + '/' + mem.materialCapacity).slice(0, 48), tx, ty);
      ty += 14 / this.viewport.scale;
      ctx.fillText(('Virtual: ' + (mem.virtualUnits.length || 0) + '/' + mem.virtualCapacity).slice(0, 48), tx, ty);
      ty += 14 / this.viewport.scale;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText(('M=' + String(mem.materialValue == null ? '' : mem.materialValue)).slice(0, 44), tx, ty);
      ty += 14 / this.viewport.scale;
      ctx.fillText(('V=' + String(mem.virtualValue == null ? '' : mem.virtualValue)).slice(0, 44), tx, ty);
      ctx.restore();
    }

    if (node.def.type === 'censor_moment' || node.def.type === 'censor_hold') {
      const p = this.getCensorVisualPercent(node);
      const barX = node.x + 16;
      const barY = node.y + node.h - 10;
      const barW = node.w - 70;
      const barH = 5;
      ctx.save();
      ctx.fillStyle = '#07111d';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 4);
      ctx.fill();
      const color = p < 0.34 ? '#22c55e' : (p < 0.67 ? '#facc15' : '#ef4444');
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(0.5, barW * p), barH, 4);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = (8 / this.viewport.scale) + 'px sans-serif';
      ctx.textAlign = 'left';
      let extra = '';
      if (node.def.type === 'censor_moment') extra = ' x' + ((node.runtime.censorMoment?.pendingShots?.length) || 0);
      if (node.def.type === 'censor_hold' && node.runtime.censorHold?.hotUntil > this.simTime) extra = ' HOT';
      ctx.fillText(Math.round(p * 100) + '%' + extra, barX + barW + 6, barY + 5);
      ctx.restore();
    }

    if (node.def.type === 'logic_reverse_auto') {
      const state = node.runtime.reverseAuto || { queue: [] };
      const nextArm = (state.queue || []).filter(a => a.fireAt > this.simTime).sort((a, b) => a.fireAt - b.fireAt)[0] || null;
      const delayMs = clampAutoDelay(node.customValue || node.def.defaultValue || 1500);
      const progress = nextArm ? Math.max(0, Math.min(1, 1 - ((nextArm.fireAt - this.simTime) / Math.max(1, delayMs)))) : 0;
      const barX = node.x + 14;
      const barY = node.y + node.h - 12;
      const barW = node.w - 28;
      const barH = 6;
      ctx.save();
      ctx.fillStyle = '#07111d';
      ctx.beginPath();
      ctx.roundRect(barX, barY, barW, barH, 4);
      ctx.fill();
      ctx.fillStyle = '#38bdf8';
      ctx.beginPath();
      ctx.roundRect(barX, barY, Math.max(0.5, barW * progress), barH, 4);
      ctx.fill();
      ctx.fillStyle = '#cbd5e1';
      ctx.font = (8 / this.viewport.scale) + 'px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('AUTO ' + Math.round(delayMs / 1000 * 10) / 10 + 's  q=' + ((state.queue || []).length), barX, barY - 3);
      ctx.restore();
    }

    if (isLightRuneNode(node)) {
      const bulbColor = node.state.effectColor || wavelengthToCSS(getLightBaseWavelength(node) || 580);
      const cx = node.x + node.w - 24;
      const cy = node.y + node.h * 0.5;
      const radius = 10 / this.viewport.scale;
      ctx.save();
      ctx.shadowColor = bulbColor;
      ctx.shadowBlur = (node.state.flash || 0) > 0 ? 20 / this.viewport.scale : 9 / this.viewport.scale;
      ctx.fillStyle = bulbColor;
      if (node.type === 'mono_light') {
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.9, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1 / this.viewport.scale;
        ctx.stroke();
      } else if (node.type === 'miro_light') {
        ctx.beginPath();
        ctx.moveTo(cx, cy - radius);
        ctx.lineTo(cx + radius * 0.95, cy);
        ctx.lineTo(cx, cy + radius);
        ctx.lineTo(cx - radius * 0.95, cy);
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1 / this.viewport.scale;
        ctx.stroke();
      } else {
        ctx.beginPath();
        ctx.arc(cx, cy, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,255,255,0.35)';
        ctx.lineWidth = 1 / this.viewport.scale;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, radius * 0.55, 0, Math.PI * 2);
        ctx.fillStyle = cssRgbWithAlpha(bulbColor, 0.55);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
      {
        const currentWavelength = typeof node.state.effectWavelength === 'number'
          ? node.state.effectWavelength
          : (getLightBaseWavelength(node) || 580);
        const barW = Math.min(node.w - 32 / this.viewport.scale, 122 / this.viewport.scale);
        const barH = 6 / this.viewport.scale;
        const barX = node.x + (node.w - barW) / 2;
        const barY = node.y + node.h - 15 / this.viewport.scale;
        const minWl = 380, maxWl = 780;
        ctx.fillStyle = 'rgba(2,6,23,0.78)';
        ctx.beginPath();
        ctx.roundRect(barX - 2 / this.viewport.scale, barY - 2 / this.viewport.scale, barW + 4 / this.viewport.scale, barH + 4 / this.viewport.scale, 4 / this.viewport.scale);
        ctx.fill();
        for (let px = 0; px < barW; px += Math.max(1 / this.viewport.scale, 1.5)) {
          const wl = minWl + (px / barW) * (maxWl - minWl);
          ctx.fillStyle = wavelengthToCSS(wl);
          ctx.fillRect(barX + px, barY, Math.max(1 / this.viewport.scale, 1.5), barH);
        }
        const markerX = barX + ((currentWavelength - minWl) / (maxWl - minWl)) * barW;
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.3 / this.viewport.scale;
        ctx.beginPath();
        ctx.moveTo(markerX, barY - 3 / this.viewport.scale);
        ctx.lineTo(markerX, barY + barH + 3 / this.viewport.scale);
        ctx.stroke();
        ctx.fillStyle = '#e5e7eb';
        ctx.font = (7.5 / this.viewport.scale) + 'px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(String(currentWavelength) + ' нм', markerX, barY - 5 / this.viewport.scale);
      }
      ctx.restore();
    }
  }

  getSourceLaunchButtonRect(node) {
    if (node && node.def && isBlinkSourceType(node.def.type)) {
      const pad = 8 / this.viewport.scale;
      const w = 42 / this.viewport.scale;
      const h = 20 / this.viewport.scale;
      const x = node.x + node.w - w - pad;
      const y = node.y + pad;
      return {
        x, y, w, h,
        rx: 10 / this.viewport.scale,
        cx: x + w / 2,
        cy: y + h / 2,
        hitPad: 8 / this.viewport.scale
      };
    }
    const r = 12 / this.viewport.scale;
    const cx = node.x + node.w - (18 / this.viewport.scale);
    const cy = node.y + node.h / 2;
    return { cx, cy, r, hitR: Math.max(r * 1.35, 16 / this.viewport.scale) };
  }

  drawSourceLaunchButton(node) {
    const ctx = this.ctx;
    if (node && node.def && isBlinkSourceType(node.def.type)) {
      const btn = this.getSourceLaunchButtonRect(node);
      const on = !!(node.runtime && node.runtime.blinker && node.runtime.blinker.enabled);
      const track = on ? '#123226' : '#182233';
      const border = on ? '#22c55e' : '#64748b';
      const knob = on ? '#22c55e' : '#94a3b8';
      const knobR = btn.h * 0.36;
      const knobCx = on ? (btn.x + btn.w - btn.h * 0.5) : (btn.x + btn.h * 0.5);
      const knobCy = btn.cy;
      ctx.save();
      ctx.fillStyle = track;
      ctx.strokeStyle = border;
      ctx.lineWidth = 2 / this.viewport.scale;
      ctx.beginPath();
      ctx.roundRect(btn.x, btn.y, btn.w, btn.h, btn.rx);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = on ? 'rgba(34,197,94,0.18)' : 'rgba(148,163,184,0.10)';
      ctx.beginPath();
      ctx.roundRect(btn.x + 2 / this.viewport.scale, btn.y + 2 / this.viewport.scale, btn.w - 4 / this.viewport.scale, btn.h - 4 / this.viewport.scale, btn.rx);
      ctx.fill();
      ctx.fillStyle = knob;
      ctx.beginPath();
      ctx.arc(knobCx, knobCy, knobR, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = on ? '#dcfce7' : '#e2e8f0';
      ctx.lineWidth = 1.2 / this.viewport.scale;
      ctx.beginPath();
      ctx.arc(knobCx, knobCy, knobR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold ' + (9 / this.viewport.scale) + 'px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🛜', knobCx, knobCy + (0.2 / this.viewport.scale));
      ctx.fillStyle = on ? '#86efac' : '#cbd5e1';
      ctx.font = 'bold ' + (7 / this.viewport.scale) + 'px sans-serif';
      ctx.fillText(on ? 'ON' : 'OFF', btn.cx, btn.y + btn.h + (8 / this.viewport.scale));
      ctx.restore();
      return;
    }
    const btn = this.getSourceLaunchButtonRect(node);
    const baseColor = node.def.type === 'source_strong' ? '#ef4444' : '#8b5cf6';
    const glowColor = node.def.type === 'source_strong' ? 'rgba(239,68,68,0.22)' : 'rgba(139,92,246,0.22)';
    ctx.save();
    ctx.fillStyle = glowColor;
    ctx.beginPath();
    ctx.arc(btn.cx, btn.cy, btn.r * 1.45, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#020617';
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = 2 / this.viewport.scale;
    ctx.beginPath();
    ctx.arc(btn.cx, btn.cy, btn.r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold ' + (11 / this.viewport.scale) + 'px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('▶', btn.cx + (0.5 / this.viewport.scale), btn.cy + (0.5 / this.viewport.scale));
    ctx.fillStyle = '#cbd5e1';
    ctx.font = (8 / this.viewport.scale) + 'px sans-serif';
    ctx.fillText('RUN', btn.cx, btn.cy + btn.r + (9 / this.viewport.scale));
    ctx.restore();
  }

  isSourceLaunchButtonHit(node, x, y) {
    const btn = this.getSourceLaunchButtonRect(node);
    if (node && node.def && isBlinkSourceType(node.def.type)) {
      return x >= btn.x - btn.hitPad && x <= btn.x + btn.w + btn.hitPad && y >= btn.y - btn.hitPad && y <= btn.y + btn.h + btn.hitPad;
    }
    return Math.hypot(x - btn.cx, y - btn.cy) <= btn.hitR;
  }



  drawPorts(node) {
    const ctx = this.ctx;
    const radius = (this.isMobile ? 8.6 : 7.4) / this.viewport.scale;
    const ring = (this.isMobile ? 14 : 12) / this.viewport.scale;

    const drawRoundPort = (p, strokeStyle, fillStyle = '#020617') => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, ring, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(148,163,184,0.08)';
      ctx.fill();
      ctx.beginPath();
      ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = fillStyle;
      ctx.fill();
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 2.2 / this.viewport.scale;
      ctx.stroke();
    };

    const drawSquarePort = (p, strokeStyle, fillStyle = '#020617') => {
      const ringSize = ring * 1.95;
      const size = radius * 1.95;
      ctx.fillStyle = 'rgba(148,163,184,0.08)';
      ctx.fillRect(p.x - ringSize / 2, p.y - ringSize / 2, ringSize, ringSize);
      ctx.fillStyle = fillStyle;
      ctx.fillRect(p.x - size / 2, p.y - size / 2, size, size);
      ctx.strokeStyle = strokeStyle;
      ctx.lineWidth = 2.2 / this.viewport.scale;
      ctx.strokeRect(p.x - size / 2, p.y - size / 2, size, size);
    };

    if (node.def.isSubrune) {
      const p = this.getPortPos(node, 0, 'out');
      const input = node.inputs[0] || { signal: SIG.NONE };
      const stroke = input.signal === SIG.NONE ? node.def.color : this.getSignalColor(input.signal);
      drawSquarePort(p, stroke, '#020617');
      return;
    }

    for (let i = 0; i < node.def.inputs; i++) {
      const p = this.getPortPos(node, i, 'in');
      const input = node.inputs[i] || { signal: SIG.NONE };
      drawRoundPort(p, input.signal === SIG.NONE ? '#475569' : this.getSignalColor(input.signal));
    }

    for (let i = 0; i < node.def.outputs; i++) {
      const p = this.getPortPos(node, i, 'out');
      drawRoundPort(p, node.def.color);
    }
  }

  drawOverlay() {
    const ctx = this.ctx;
    ctx.fillStyle = '#e2e8f0';
    ctx.font = (10 / this.viewport.scale) + 'px monospace';
    ctx.textAlign = 'left';
    for (const node of this.nodes) {
      ctx.fillStyle = '#93c5fd';
      const srcSuffix = node.state.lastSourceTag ? ' ' + node.state.lastSourceTag : '';
      ctx.fillText('t=' + (node.state.firstActivationTime >= 0 ? Math.round(node.state.firstActivationTime) : '--') + srcSuffix, node.x + 4, node.y + node.h + 12);
      if (node.data.value !== null) {
        ctx.fillStyle = '#22d3ee';
        ctx.fillText('v=' + String(node.data.value).slice(0, 12), node.x + 4, node.y + node.h + 24);
      }
    }
  }

  drawGrid() {
    const ctx = this.ctx;
    const step = 40;
    const left = this.viewport.x;
    const top = this.viewport.y;
    const right = this.viewport.x + this.cssCanvasWidth / this.viewport.scale;
    const bottom = this.viewport.y + this.cssCanvasHeight / this.viewport.scale;
    const startX = Math.floor(left / step) * step;
    const startY = Math.floor(top / step) * step;
    ctx.beginPath();
    for (let x = startX; x <= right; x += step) {
      ctx.moveTo(x, top);
      ctx.lineTo(x, bottom);
    }
    for (let y = startY; y <= bottom; y += step) {
      ctx.moveTo(left, y);
      ctx.lineTo(right, y);
    }
    ctx.strokeStyle = '#172131';
    ctx.lineWidth = 1 / this.viewport.scale;
    ctx.stroke();
  }

  draw() {
    const ctx = this.ctx;
    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.clearRect(0, 0, this.cssCanvasWidth, this.cssCanvasHeight);
    ctx.fillStyle = '#05070b';
    ctx.fillRect(0, 0, this.cssCanvasWidth, this.cssCanvasHeight);
    ctx.save();
    ctx.scale(this.viewport.scale, this.viewport.scale);
    ctx.translate(-this.viewport.x, -this.viewport.y);

    this.drawGrid();
    for (const bridge of this.bridges) {
      this.drawBridge(bridge);
    }

    this.particles = this.particles.filter(p => this.drawParticle(p));
    for (const node of this.nodes) {
      this.drawNode(node);
      this.drawPorts(node);
    }

    if (this.dragConnectPreview && this.dragConnectPreview.start && this.dragConnectPreview.current) {
      const start = this.dragConnectPreview.start;
      const current = this.dragConnectPreview.current;
      ctx.beginPath();
      ctx.moveTo(start.x, start.y);
      const midX = (start.x + current.x) / 2;
      ctx.bezierCurveTo(midX, start.y, midX, current.y, current.x, current.y);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 2.2 / this.viewport.scale;
      ctx.setLineDash([8 / this.viewport.scale, 5 / this.viewport.scale]);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    this.drawOverlay();
    ctx.restore();
  }

  getSignalColor(signal, node = null) {
    if (node && isLightRuneNode(node) && node.state && node.state.effectColor) return node.state.effectColor;
    if (signal === SIG.DATA) return '#22d3ee';
    if (signal === SIG.WEAK) return '#a78bfa';
    if (signal === SIG.STRONG) return '#ef4444';
    return '#475569';
  }

  initInput() {
    let draggingNode = null;
    let dragOffset = { x: 0, y: 0 };
    let connectStart = null;
    let draggingBridge = null;
    let panning = false;
    let lastScreen = { x: 0, y: 0 };
    let activePointers = new Map();
    let pinchState = null;

    const clearConnectPreview = () => {
      this.dragConnectPreview = null;
    };

    const updateConnectPreview = (world) => {
      if (!connectStart) return;
      this.dragConnectPreview = {
        start: this.getPortPos(connectStart.node, connectStart.index, connectStart.type),
        current: { x: world.x, y: world.y }
      };
    };

    const screenPoint = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      return { sx: e.clientX - rect.left, sy: e.clientY - rect.top, rect };
    };

    const startBridgeHandleDrag = (bridge, index, world) => {
      draggingBridge = { bridge, index, last: { x: world.x, y: world.y } };
      this.bridgeDragState = draggingBridge;
    };

    const applyBridgeHandleDrag = (state, world) => {
      if (!state || !state.bridge) return;
      const bridge = state.bridge;
      const index = Math.max(0, Math.min(2, state.index || 0));
      if (!Array.isArray(bridge.cps) || !bridge.cps[index]) return;
      const dxWorld = world.x - state.last.x;
      const dyWorld = world.y - state.last.y;
      const clamped = this.clampBridgeHandlePoint(bridge, index, { x: bridge.cps[index].x + dxWorld, y: bridge.cps[index].y + dyWorld });
      const prev = bridge.cps[index];
      const dx = clamped.x - prev.x;
      const dy = clamped.y - prev.y;
      bridge.cps[index] = clamped;
      if (index === 1) {
        if (bridge.cps[0]) bridge.cps[0] = this.clampBridgeHandlePoint(bridge, 0, { x: bridge.cps[0].x + dx * 0.24, y: bridge.cps[0].y + dy * 0.24 });
        if (bridge.cps[2]) bridge.cps[2] = this.clampBridgeHandlePoint(bridge, 2, { x: bridge.cps[2].x + dx * 0.24, y: bridge.cps[2].y + dy * 0.24 });
      } else if (bridge.cps[1]) {
        bridge.cps[1] = this.clampBridgeHandlePoint(bridge, 1, { x: bridge.cps[1].x + dx * 0.18, y: bridge.cps[1].y + dy * 0.18 });
      }
      bridge.cp = bridge.cps[1];
      state.last = { x: world.x, y: world.y };
    };

    const beginPointer = (e) => {
      const { sx, sy } = screenPoint(e);
      const world = this.screenToWorld(sx, sy);
      activePointers.set(e.pointerId, { sx, sy });

      if (this.isMobile && activePointers.size === 2) {
        const pts = [...activePointers.values()];
        pinchState = {
          dist: Math.hypot(pts[0].sx - pts[1].sx, pts[0].sy - pts[1].sy),
          centerX: (pts[0].sx + pts[1].sx) / 2,
          centerY: (pts[0].sy + pts[1].sy) / 2
        };
        draggingNode = null;
        draggingBridge = null;
        this.bridgeDragState = null;
        connectStart = null;
        clearConnectPreview();
        panning = false;
        return;
      }

      if (this.isDeleteMode) {
        const handle = this.getBridgeHandleAt(world.x, world.y);
        const bridge = handle ? handle.bridge : this.getBridgeAt(world.x, world.y);
        if (bridge) {
          this.deleteBridge(bridge);
          this.toggleDeleteMode();
          return;
        }
        for (let i = this.nodes.length - 1; i >= 0; i--) {
          const n = this.nodes[i];
          if (world.x >= n.x && world.x <= n.x + n.w && world.y >= n.y && world.y <= n.y + n.h) {
            this.deleteNode(n);
            this.toggleDeleteMode();
            return;
          }
        }
        this.toggleDeleteMode();
        return;
      }

      const port = this.getPortAt(world.x, world.y, 'out');
      if (port) {
        connectStart = port;
        updateConnectPreview(world);
        return;
      }

      const handleHit = this.getBridgeHandleAt(world.x, world.y);
      if (handleHit) {
        startBridgeHandleDrag(handleHit.bridge, handleHit.index, world);
        return;
      }

      const bridge = this.getBridgeAt(world.x, world.y);
      if (bridge) {
        const controls = this.getBridgeCurvePoints(bridge).controls;
        let nearestIndex = 1;
        let nearestDist = Infinity;
        for (let i = 0; i < controls.length; i++) {
          const d = Math.hypot(world.x - controls[i].x, world.y - controls[i].y);
          if (d < nearestDist) {
            nearestDist = d;
            nearestIndex = i;
          }
        }
        startBridgeHandleDrag(bridge, nearestIndex, world);
        return;
      }

      for (let i = this.nodes.length - 1; i >= 0; i--) {
        const n = this.nodes[i];
        if (world.x >= n.x && world.x <= n.x + n.w && world.y >= n.y && world.y <= n.y + n.h) {
          if (this.connectMode) {
            if (!this.quickConnectFromNode) {
              if ((n.def?.outputs || 0) <= 0) {
                this.log('🔗 Этот блок не может быть началом соединения: у него нет выходных портов.', 'warn');
                return;
              }
              const hasFreeOut = Array.from({ length: n.def.outputs }, (_, portIndex) => portIndex).some(portIndex => this.getPortConnectionCount(n, portIndex, 'out') < this.getPortCapacity(n, portIndex, 'out'));
              if (!hasFreeOut) {
                this.log('🔗 У блока ' + n.label + ' все выходные порты уже заняты по лимиту.', 'warn');
                return;
              }
              this.quickConnectFromNode = n;
              n.state.flash = 1;
              this.hideQuickConnectPopup();
              this.log('🔗 Начало соединения: ' + n.label + '. Теперь нажми на второй блок.', 'sys');
              return;
            }
            if (this.quickConnectFromNode === n) {
              this.quickConnectFromNode = null;
              this.hideQuickConnectPopup();
              this.log('🔗 Соединение отменено: выбран тот же блок.', 'warn');
              return;
            }
            this.openQuickConnectPopup(this.quickConnectFromNode, n, e.clientX, e.clientY);
            return;
          }

          if (n.def.type === 'logic_reverse' && this.isReverseLaunchButtonHit(n, world.x, world.y)) {
            this.fireReverseButton(n);
            return;
          }
          if ((n.def.type === 'source_strong' || n.def.type === 'source_weak' || n.def.type === 'source_strong_blink' || n.def.type === 'source_weak_blink') && this.isSourceLaunchButtonHit(n, world.x, world.y)) {
            if (isBlinkSourceType(n.def.type)) {
              this.toggleBlinkingSource(n);
            } else {
              if (this.initialized) {
                this.primeDataNodes(this.simTime);
              }
              this.startSourcePulse(n);
              this.run();
            }
            return;
          }

          draggingNode = n;
          dragOffset = { x: world.x - n.x, y: world.y - n.y };
          this.nodes.splice(i, 1);
          this.nodes.push(n);
          return;
        }
      }

      panning = true;
      lastScreen = { x: sx, y: sy };
    };

    const movePointer = (e) => {
      const info = screenPoint(e);
      const sx = info.sx, sy = info.sy;
      const world = this.screenToWorld(sx, sy);
      if (activePointers.has(e.pointerId)) {
        activePointers.set(e.pointerId, { sx, sy });
      }

      if (this.isMobile && activePointers.size === 2) {
        const pts = [...activePointers.values()];
        const dist = Math.hypot(pts[0].sx - pts[1].sx, pts[0].sy - pts[1].sy);
        const centerX = (pts[0].sx + pts[1].sx) / 2;
        const centerY = (pts[0].sy + pts[1].sy) / 2;
        if (pinchState && pinchState.dist > 0) {
          this.panBy(centerX - pinchState.centerX, centerY - pinchState.centerY);
          const factor = dist / pinchState.dist;
          if (Number.isFinite(factor) && factor > 0) {
            this.zoomAt(factor, centerX, centerY);
          }
        }
        pinchState = { dist, centerX, centerY };
        return;
      }

      if (draggingNode) {
        draggingNode.x = Math.max(this.bounds.minX, Math.min(this.bounds.maxX - draggingNode.w, world.x - dragOffset.x));
        draggingNode.y = Math.max(this.bounds.minY, Math.min(this.bounds.maxY - draggingNode.h, world.y - dragOffset.y));
      } else if (draggingBridge) {
        applyBridgeHandleDrag(draggingBridge, world);
      } else if (connectStart) {
        updateConnectPreview(world);
      } else if (panning) {
        this.panBy(sx - lastScreen.x, sy - lastScreen.y);
        lastScreen = { x: sx, y: sy };
      }

      const hoveredNode = this.nodes.find(n => world.x >= n.x && world.x <= n.x + n.w && world.y >= n.y && world.y <= n.y + n.h);
      const hoveredHandle = this.getBridgeHandleAt(world.x, world.y);
      const hoveredBridge = hoveredHandle ? hoveredHandle.bridge : this.getBridgeAt(world.x, world.y);

      if (hoveredNode) {
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (e.clientX + 14) + 'px';
        this.tooltip.style.top = (e.clientY + 14) + 'px';
        let html = '<strong>' + hoveredNode.label + '</strong><br>' + hoveredNode.def.desc;
        html += '<br>Сигнал: <b>' + hoveredNode.state.signal + '</b>';
        if (hoveredNode.state.lastSourceTag) html += '<br>Источник: <b>' + hoveredNode.state.lastSourceTag + '</b>';
        if (hoveredNode.data.value !== null) html += '<br>Данные: <b>' + hoveredNode.data.value + '</b>';
        if (hoveredNode.state.firstActivationTime >= 0) html += '<br>Первая активация: <b>' + hoveredNode.state.firstActivationTime + ' мс</b>';
        this.tooltip.innerHTML = html;
      } else if (hoveredBridge) {
        this.tooltip.style.display = 'block';
        this.tooltip.style.left = (e.clientX + 14) + 'px';
        this.tooltip.style.top = (e.clientY + 14) + 'px';
        this.tooltip.innerHTML = '<strong>Мостик</strong><br>Задержка: <b>' + hoveredBridge.delay + ' мс</b><br>Последний сигнал: <b>' + hoveredBridge.activeSignal + '</b>' + (hoveredBridge.lastSourceTag ? '<br>Источник: <b>' + hoveredBridge.lastSourceTag + '</b>' : '') + '<br>Тяни за рёбра жёсткости, чтобы изгибать мостик.';
      } else {
        this.tooltip.style.display = 'none';
      }
    };

    const endPointer = (e) => {
      const { sx, sy } = screenPoint(e);
      const world = this.screenToWorld(sx, sy);
      if (connectStart) {
        const target = this.getPortAt(world.x, world.y, connectStart.type === 'out' ? 'in' : 'out');
        if (target && target.node !== connectStart.node && target.type !== connectStart.type) {
          if (connectStart.type === 'out') {
            this.createConnection(connectStart.node, connectStart.index, target.node, target.index);
          } else {
            this.createConnection(target.node, target.index, connectStart.node, connectStart.index);
          }
        }
      }
      activePointers.delete(e.pointerId);
      if (activePointers.size < 2) pinchState = null;
      draggingNode = null;
      draggingBridge = null;
      this.bridgeDragState = null;
      connectStart = null;
      clearConnectPreview();
      panning = false;
    };

    this.canvas.addEventListener('pointerdown', beginPointer);
    this.canvas.addEventListener('pointermove', movePointer);
    this.canvas.addEventListener('pointerup', endPointer);
    this.canvas.addEventListener('pointercancel', endPointer);
    this.canvas.addEventListener('wheel', (e) => {
      if (this.isMobile) return;
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      this.zoomAt(factor, sx, sy);
    }, { passive: false });

    this.canvas.ondblclick = (e) => {
      if (this.isDeleteMode) return;
      const rect = this.canvas.getBoundingClientRect();
      const world = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);

      const handle = this.getBridgeHandleAt(world.x, world.y);
      const bridge = handle ? handle.bridge : this.getBridgeAt(world.x, world.y);
      if (bridge) {
        this.openModal({ kind: 'bridge', id: bridge.id });
        return;
      }

      for (const node of this.nodes) {
        if (world.x >= node.x && world.x <= node.x + node.w && world.y >= node.y && world.y <= node.y + node.h) {
          this.openModal({ kind: 'node', id: node.id });
          return;
        }
      }
    };
  }

  buildCircleColorDemo() {
    this.clear();
    const src = this.createNode('source_strong', 80, 300);
    const split = this.createNode('mi_split', 250, 300);
    const d1 = this.createNode('sl_delay', 420, 300); d1.def.delay = 700;
    const d2 = this.createNode('sl_delay', 590, 300); d2.def.delay = 700;
    const virtWrite = this.createNode('val_number', 520, 90); virtWrite.customValue = '2';
    const circle = this.createNode('kg_dirhizadirfir', 760, 170);
    circle.customValue = '';
    this.resizeSpecialNode(circle);
    const virtRead = this.createNode('val_number', 1280, 120); virtRead.customValue = '0';
    const light = this.createNode('pr_light', 1280, 280);

    this.createConnection(src, 0, split, 0);
    this.createConnection(split, 0, virtWrite, 0);  // сигнал запускает число, без этого оно не пишет само
    this.createConnection(virtWrite, 1, circle, 3); // DATA из числа пишет virtual
    this.createConnection(split, 1, d1, 0);
    this.createConnection(d1, 0, d2, 0);
    this.createConnection(d2, 0, circle, 1);        // левый нижний strong читает virtual
    this.createConnection(circle, 1, light, 0);     // правый нижний strong показывает проход сигнала
    this.createConnection(circle, 3, virtRead, 1);  // нижний правый DATA virtual -> DATA-вход числа

    this.log('🎨 Демо-круг: число записывает virtual, сильный сигнал читает virtual через левый нижний вход, число-приёмник показывает прочитанную virtual-дату, свет показывает сам факт прохождения сигнала.', 'sys');
  }

  buildPhytoDemo() {
    this.clear();

    this.viewport.scale = this.isMobile ? 0.5 : 0.62;
    this.viewport.x = -80;
    this.viewport.y = 20;
    this.clampViewport();

    const src = this.createNode('source_strong', 90, 330);
    const split1 = this.createNode('mi_split', 300, 330);
    this.createConnection(src, 0, split1, 0);

    const modGreen = this.createNode('mod_freq_up', 520, 120);
    const lightGreen = this.createNode('miro_light', 760, 120);
    this.createConnection(split1, 0, modGreen, 0);
    this.createConnection(modGreen, 0, lightGreen, 0);

    const split2 = this.createNode('mi_split', 500, 430);
    this.createConnection(split1, 1, split2, 0);

    const modRed = this.createNode('mod_freq_down', 720, 330);
    const lightRed = this.createNode('miro_light', 960, 330);
    this.createConnection(split2, 0, modRed, 0);
    this.createConnection(modRed, 0, lightRed, 0);

    const modViolet1 = this.createNode('mod_freq_up', 720, 560);
    const modViolet2 = this.createNode('mod_freq_up', 930, 560);
    const lightViolet = this.createNode('mono_light', 1170, 560);
    this.createConnection(split2, 1, modViolet1, 0);
    this.createConnection(modViolet1, 0, modViolet2, 0);
    this.createConnection(modViolet2, 0, lightViolet, 0);

    this.log('🌿 Демо: фитолампы собраны на обычных рунах света без прСвет.', 'sys');
    this.log('🟢 Верхний ряд: миСвет + повышение частоты → зелёный спектр.', 'run');
    this.log('🔴 Средний ряд: миСвет + понижение частоты → красно-оранжевый спектр.', 'run');
    this.log('🟣 Нижний ряд: моСвет + двойное повышение частоты → фиолетовый/УФ-край.', 'run');

    this.run();
    this.startSourcePulse(src, 0);
  }

  renderSidebar() {
    const list = document.getElementById('runeList');
    if (!list) return;
    list.innerHTML = '';

    const CATEGORY_ORDER = [
      'Источники',
      'Структура и соединения',
      'Логика',
      'Цензоры и реверс',
      'Модификаторы',
      'Память и счётчики',
      'Круготечные',
      'Детекторы',
      'Сабруны-модификаторы',
      'Руны-модификаторы',
      'Математика',
      'Сравнение',
      'Строки',
      'Значения',
      'Эффекторы — моноруны',
      'Эффекторы — миротечные',
      'Эффекторы — прямотечные',
      'Эффекторы — сложнотечные',
      'Эффекторы — запретотечные',
      'Прочее'
    ];
    const SOURCE_ORDER = [
      'source_strong',
      'source_weak',
      'source_strong_blink',
      'source_weak_blink'
    ];

    const grouped = {};
    for (const [id, def] of Object.entries(RUNE_DB)) {
      const category = CATEGORY_MAP[def.family] || 'Прочее';
      if (!grouped[category]) grouped[category] = [];
      grouped[category].push({ id, def });
    }

    const orderedCategories = [];
    const seen = new Set();
    for (const name of CATEGORY_ORDER) {
      if (grouped[name]) {
        orderedCategories.push([name, grouped[name]]);
        seen.add(name);
      }
    }
    for (const [name, items] of Object.entries(grouped)) {
      if (!seen.has(name)) orderedCategories.push([name, items]);
    }

    for (const [category, itemsRaw] of orderedCategories) {
      const items = itemsRaw.slice();
      if (category === 'Источники') {
        items.sort((a, b) => {
          const ia = SOURCE_ORDER.indexOf(a.id);
          const ib = SOURCE_ORDER.indexOf(b.id);
          const oa = ia === -1 ? 999 : ia;
          const ob = ib === -1 ? 999 : ib;
          if (oa !== ob) return oa - ob;
          return String(a.def.label).localeCompare(String(b.def.label), 'ru');
        });
      } else {
        items.sort((a, b) => String(a.def.label).localeCompare(String(b.def.label), 'ru'));
      }

      const wrap = document.createElement('div');
      wrap.className = 'rune-category';
      wrap.innerHTML = '<h4>' + category + '</h4>';

      for (const item of items) {
        const row = document.createElement('div');
        row.className = 'rune-item';
        row.draggable = true;
        const subPoints = item.def.maxSubrunes || 0;
        const subText = subPoints > 0 ? `<br><span style="color:#fbbf24">Точки сабрун: ${subPoints}</span>` : '';
        row.innerHTML = `
        <div class="color-dot" style="background:${item.def.color};color:${item.def.color}"></div>
        <div style="min-width:0">
        <div class="item-title">${item.def.label}</div>
        <div class="item-desc">${item.def.desc}<br>Delay: ${item.def.delay} мс${subText}</div>
        </div>
        `;
        row.addEventListener('dragstart', e => e.dataTransfer.setData('text/plain', item.id));
        row.addEventListener('click', () => {
          if (!this.isMobile) return;
          const center = this.screenToWorld(this.cssCanvasWidth * 0.5, this.cssCanvasHeight * 0.45);
          this.createNode(item.id, center.x - 80, center.y - 28);
          this.toggleMobilePanel('library');
        });
        wrap.appendChild(row);
      }

      list.appendChild(wrap);
    }

    const workspace = document.getElementById('workspace');
    if (workspace && !workspace.dataset.runologyDropBound) {
      workspace.addEventListener('dragover', (e) => {
        e.preventDefault();
        return false;
      });
      workspace.addEventListener('drop', (e) => {
        e.preventDefault();
        const type = e.dataTransfer.getData('text/plain');
        if (!type || !RUNE_DB[type]) return false;
        const rect = this.canvas.getBoundingClientRect();
        const world = this.screenToWorld(e.clientX - rect.left, e.clientY - rect.top);
        this.createNode(type, world.x - 60, world.y - 25);
        return false;
      });
      workspace.dataset.runologyDropBound = '1';
    }
  }

  buildSignalDemo() {
    this.clear();
    this.viewport.x = 0; this.viewport.y = 0; this.viewport.scale = this.isMobile ? 0.6 : 0.9; this.clampViewport();

    const sourceStrong = this.createNode('source_strong', 70, 170);
    const sourceWeak = this.createNode('source_weak', 70, 390);
    const numA = this.createNode('val_number', 260, 110);
    numA.customValue = '10';
    const numB = this.createNode('val_number', 430, 210);
    numB.customValue = '5';

    const cmp = this.createNode('op_gt', 640, 285);
    const gate = this.createNode('and_gate', 850, 230);
    const light = this.createNode('miro_light', 1080, 230);
    const weakTrap = this.createNode('mono_whistle', 850, 420);

    this.createConnection(sourceStrong, 0, numA, 0);
    this.createConnection(numA, 0, numB, 0);
    this.createConnection(numA, 1, cmp, 0);
    this.createConnection(numB, 1, cmp, 1);
    this.createConnection(numB, 0, gate, 0);
    this.createConnection(cmp, 0, gate, 1);
    this.createConnection(gate, 0, light, 0);

    this.createConnection(sourceWeak, 0, weakTrap, 0);

    this.log('✅ Демо собрано: число передаёт DATA только после входного сигнала; И требует сильный сигнал и DATA-условие; слабый источник не включает эффектор.', 'sys');
  }

  buildTimerDemo() {
    this.clear();
    this.viewport.x = 0; this.viewport.y = 0; this.viewport.scale = this.isMobile ? 0.6 : 0.9; this.clampViewport();

    const src = this.createNode('source_strong', 60, 260);
    const joinStart = this.createNode('mi_join', 230, 260);
    const split = this.createNode('mi_split', 430, 260);

    this.createConnection(src, 0, joinStart, 0);
    this.createConnection(joinStart, 0, split, 0);

    let prev = split;
    let outPort = 0;
    for (let i = 0; i < 12; i++) {
      const d = this.createNode('sl_delay', 560 + i * 44, 180);
      d.def.delay = 80;
      this.createConnection(prev, outPort, d, 0);
      prev = d;
      outPort = 0;
    }

    const light = this.createNode('miro_light', 1120, 180);
    this.createConnection(prev, 0, light, 0);
    this.createConnection(light, 0, joinStart, 1);

    const spark = this.createNode('pr_spark', 570, 360);
    const whistle = this.createNode('miro_whistle', 760, 360);
    this.createConnection(split, 1, spark, 0);
    this.createConnection(spark, 0, whistle, 0);

    const counter2 = this.createNode('sl_dorhidorleli', 570, 520);
    const cmpEq3 = this.createNode('op_eq', 780, 520);
    cmpEq3.customValue = '3';
    const ifGate = this.createNode('if_then', 990, 520);
    const minuteLight = this.createNode('pr_light', 1210, 520);
    const balanceSink = this.createNode('complex_destroy', 1360, 520);

    this.createConnection(split, 1, counter2, 0);
    this.createConnection(counter2, 0, cmpEq3, 0);
    this.createConnection(cmpEq3, 0, ifGate, 1);
    this.createConnection(split, 0, ifGate, 0);
    this.createConnection(ifGate, 0, minuteLight, 0);
    this.createConnection(minuteLight, 0, balanceSink, 0);

    this.log('⏱ Таймерный демо-контур собран. Основной сильный цикл идёт по задержкам через join/split, счётчик на боковой ветке считает круги и включает отдельный эффект на значении 3.', 'sys');
  }
}