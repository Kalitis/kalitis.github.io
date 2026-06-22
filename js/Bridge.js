import { DEFAULT_BRIDGE_DELAY, SABRUNE_DELAY, SIG } from './constants.js';
import { getNodePortPosition, getSubruneAttachmentPos } from './utils.js';

export class Bridge {
  constructor(id, fromNode, fromPort, toNode, toPort, opts = {}) {
    this.id = id;
    this.a = fromNode;
    this.b = toNode;
    this.fromPort = fromPort;
    this.toPort = toPort;
    this.delay = DEFAULT_BRIDGE_DELAY;
    this.isAttachment = !!opts?.isAttachment;
    if (this.isAttachment) {
      this.delay = SABRUNE_DELAY;
    }
    this.activeSignal = SIG.NONE;
    this.glow = 0;
    this.lastUsedAt = -1;
    this.lastSourceTag = null;

    const scale = window.engine ? window.engine.viewport.scale : 1;
    let start, end;

    if (this.isAttachment) {
      const host = fromNode.def.isSubrune ? toNode : fromNode;
      const sub = fromNode.def.isSubrune ? fromNode : toNode;
      const idx = opts?.attachmentIndex ?? 0;
      const attachPos = getSubruneAttachmentPos(host, idx);

      start = fromNode.def.isSubrune ? getNodePortPosition(fromNode, fromPort, 'out') : attachPos;
      end = toNode.def.isSubrune ? getNodePortPosition(toNode, toPort, 'in') : attachPos;
    } else {
      start = getNodePortPosition(fromNode, fromPort, 'out');
      end = getNodePortPosition(toNode, toPort, 'in');
    }

    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const dist = Math.hypot(dx, dy) || 1;
    const nx = -dy / dist;
    const ny = dx / dist;
    const sign = ((fromNode.id + toNode.id) % 2 === 0) ? 1 : -1;
    const bend = Math.min(170, Math.max(34, dist * 0.16 + Math.abs(dy) * 0.08)) * sign;
    this.wrapSign = sign;
    this.handleTs = [0.22, 0.5, 0.78];
    this.cps = this.handleTs.map((t, idx) => {
      const weight = idx === 1 ? 1.12 : 0.72;
      return {
        x: start.x + dx * t + nx * bend * weight,
        y: start.y + dy * t + ny * bend * weight
      };
    });
    this.cp = this.cps[1];
  }

  reset() {
    this.activeSignal = SIG.NONE;
    this.glow = 0;
    this.lastUsedAt = -1;
    this.lastSourceTag = null;
    if (Array.isArray(this.cps) && this.cps[1]) this.cp = this.cps[1];
  }
}
