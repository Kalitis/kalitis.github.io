import { getNodePortPosition, getSubruneAttachmentPos } from './utils.js';

export class SignalParticle {
  constructor(connection, signal, data, startTime, travelTime) {
    this.connection = connection;
    this.signal = signal;
    this.data = data;
    this.startTime = startTime;
    this.travelTime = Math.max(1, travelTime);
    this.finished = false;
  }

  getPosition(simTime) {
    if (simTime < this.startTime) return null;
    const endTime = this.startTime + this.travelTime;
    if (simTime >= endTime) {
      this.finished = true;
      return null;
    }
    const p = (simTime - this.startTime) / this.travelTime;
    const from = this.connection.fromNode;
    const to = this.connection.toNode;
    const isAttach = this.connection.bridge?.isAttachment || false;
    let start, end;
    if (isAttach) {
      const host = from.def.isSubrune ? to : from;
      const idx = this.connection.bridge?.attachmentIndex ?? 0;
      const attachPos = getSubruneAttachmentPos(host, idx);
      start = from.def.isSubrune ? getNodePortPosition(from, this.connection.fromPort, 'out') : attachPos;
      end = to.def.isSubrune ? getNodePortPosition(to, this.connection.toPort, 'in') : attachPos;
    } else {
      start = getNodePortPosition(from, this.connection.fromPort, 'out');
      end = getNodePortPosition(to, this.connection.toPort, 'in');
    }
    const cp = this.connection.bridge.cp;
    const cp1 = { x: start.x + (cp.x - start.x) * 0.5, y: start.y };
    const cp2 = { x: end.x - (end.x - cp.x) * 0.5, y: end.y };

    const t = p;
    const x = Math.pow(1 - t, 3) * start.x +
      3 * Math.pow(1 - t, 2) * t * cp1.x +
      3 * (1 - t) * Math.pow(t, 2) * cp2.x +
      Math.pow(t, 3) * end.x;
    const y = Math.pow(1 - t, 3) * start.y +
      3 * Math.pow(1 - t, 2) * t * cp1.y +
      3 * (1 - t) * Math.pow(t, 2) * cp2.y +
      Math.pow(t, 3) * end.y;
    return { x, y, progress: p };
  }
}
