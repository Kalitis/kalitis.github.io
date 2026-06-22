export function drawBar(ctx, x, y, w, h, ratio, fillFromTop, color) {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  ctx.fillRect(x, y, w, h);
  const filled = Math.max(0, Math.min(h, h * Math.max(0, Math.min(1, ratio))));
  ctx.fillStyle = color;
  if (fillFromTop) ctx.fillRect(x, y, w, filled);
  else ctx.fillRect(x, y + h - filled, w, filled);
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.lineWidth = 1;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

export function drawAttachmentPoints(ctx, node, scale) {
  if (!node || !node.def) return;
  const count = node.def.maxSubrunes || 0;
  if (count <= 0) return;

  const r = 4.5 / scale;
  const spacing = 20 / scale;

  const nTop = Math.ceil(count / 2);
  const nBot = count - nTop;

  const cx = node.x + node.w / 2;
  const topY = node.y - 10 / scale;
  const botY = node.y + node.h + 10 / scale;

  for (let i = 0; i < count; i++) {
    const isTop = (i % 2 === 0);
    const k = Math.floor(i / 2);

    let startX;
    if (isTop) {
      startX = cx - ((nTop - 1) * spacing) / 2;
    } else {
      startX = cx - ((nBot - 1) * spacing) / 2;
    }

    const x = startX + k * spacing;
    const y = isTop ? topY : botY;

    const isOccupied = node.attachedSubrunes && node.attachedSubrunes.length > i;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, isTop ? node.y : node.y + node.h);
    ctx.strokeStyle = 'rgba(100, 116, 139, 0.5)';
    ctx.lineWidth = 1.2 / scale;
    ctx.setLineDash([3 / scale, 2 / scale]);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = '#020617';
    ctx.fill();
    ctx.strokeStyle = '#64748b';
    ctx.lineWidth = 1.5 / scale;
    ctx.stroke();

    if (isOccupied) {
      ctx.beginPath();
      ctx.arc(x, y, r + 2.5 / scale, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)';
      ctx.lineWidth = 1.5 / scale;
      ctx.stroke();
    }
  }
}
