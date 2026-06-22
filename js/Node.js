import { SIG } from './constants.js';
import { RUNE_DB } from './runeDb.js';
import { clone, isLightRuneNode, computeLightSpectrumState } from './utils.js';

export class Node {
  constructor(id, type, x, y) {
    this.id = id;
    this.type = type;
    this.def = clone(RUNE_DB[type]);
    this.x = x;
    this.y = y;
    this.w = type.startsWith('op_') || type.startsWith('val_') ? 122 : 168;
    this.h = 56;
    this.label = this.def.label;
    this.customValue = this.def.defaultValue !== undefined ? this.def.defaultValue : '';

    this.state = {
      active: false,
      signal: SIG.NONE,
      lastActivationTime: -1,
      firstActivationTime: -1,
      glow: 0,
      flash: 0,
      visitCount: 0,
      lastSourceTag: null
    };

    this.data = {
      value: null,
      lastUpdatedTime: -1
    };

    this.memory = {
      capacityBits: this.def.capacityBits || 0,
      value: 0
    };

    this.inputs = [];
    for (let i = 0; i < this.def.inputs; i++) {
      this.inputs.push({
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

    this.attachedSubrunes = [];
    this.maxSubrunes = this.def.maxSubrunes || 0;

    this.reset();
  }

  reset() {
    this.state.active = false;
    this.state.signal = SIG.NONE;
    this.state.lastActivationTime = -1;
    this.state.firstActivationTime = -1;
    this.state.glow = 0;
    this.state.flash = 0;
    this.state.visitCount = 0;
    this.state.lastSourceTag = null;
    this.state.lastSourceNodeId = null;
    this.state.pendingSourceMeta = null;
    const baseSpectrum = isLightRuneNode(this) ? computeLightSpectrumState(this, { freqShift: 0 }) : null;
    this.state.effectColorName = baseSpectrum ? baseSpectrum.colorName : null;
    this.state.effectColorCode = 0;
    this.state.effectWavelength = baseSpectrum ? baseSpectrum.wavelength : null;
    this.state.effectColor = baseSpectrum ? baseSpectrum.colorCss : null;
    this.state.frequencyShiftPct = baseSpectrum ? (baseSpectrum.totalShift * 100).toFixed(1) : '0.0';
    this.data.value = null;
    this.subruneState = { scale: 1, magicCost: 1, freqShift: 0, direction: null };
    this.data.lastUpdatedTime = -1;
    for (const input of this.inputs) {
      input.signal = SIG.NONE;
      input.data = null;
      input.lastTime = -1;
      input.arrivalCount = 0;
      input.sourceTag = null;
      input.meta = null;
      input.connectionId = null;
      input.sourceNodeId = null;
      input.fromNodeId = null;
      input.fromNodeType = null;
    }
    this.memory.value = 0;
    this.runtime = {
      censorChargeMs: 0,
      censorChargeStart: -1,
      censorThresholdMs: this.def.thresholdMs || 0,
      censorState: 'idle',
      censorColor: '#22c55e',
      censorSourceTag: null,
      censorSourceNodeId: null,
      censorArmed: false,
      censorOpenedAt: -1,
      holdPassedForSourceTag: null,
      holdLastDirectTime: -1,
      reverseCredits: 0,
      lastMetaSummary: '',
      circleMemory: null,
      reverseArms: [],
      reverseAuto: { queue: [], token: 0 },
      censorMoment: {
        seenStrongSources: new Set(),
        chargeStart: -1,
        readyTime: -1,
        charging: false,
        pendingShots: [],
        cycleToken: 0,
        displayPct: 0,
        state: 'idle'
      },
      censorHold: {
        seenStrongSources: new Set(),
        chargeStart: -1,
        readyTime: -1,
        hotUntil: -1,
        charging: false,
        opened: false,
        cycleToken: 0,
        triggerSourceTag: null,
        displayPct: 0,
        state: 'idle'
      },
      blinker: {
        enabled: false,
        generation: 0,
        intervalMs: 2000,
        cycleStartTime: 0,
        nextTickTime: 0
      }
    };
    for (const input of this.inputs) {
      input.signal = SIG.NONE;
      input.data = null;
      input.lastTime = -1;
      input.arrivalCount = 0;
      input.sourceTag = null;
      input.meta = null;
      input.connectionId = null;
      input.sourceNodeId = null;
      input.fromNodeId = null;
      input.fromNodeType = null;
    }
  }

  getBinaryString() {
    if (!this.memory.capacityBits) return '';
    return this.memory.value.toString(2).padStart(this.memory.capacityBits, '0');
  }
}
