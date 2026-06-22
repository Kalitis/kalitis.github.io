import { Engine } from './Engine.js';
import { isCircleSimple, clampAutoDelay } from './utils.js';

export const engine = new Engine();
console.log("Imported!");
window.engine = engine;
globalThis.engine = engine;

window.closeModal = function closeModal() {
  engine.modal.style.pointerEvents = 'none';
  engine.modal.style.display = 'none';
  engine.editingTarget = null;
};

window.saveModalSettings = function saveModalSettings() {
  if (!engine.editingTarget) return closeModal();

  const valueInput = document.getElementById('modalValue');
  const delayInput = document.getElementById('modalDelay');
  const newDelay = Math.max(0, Number(delayInput.value) || 0);

  if (engine.editingTarget.kind === 'node') {
    const node = engine.nodes.find(n => n.id === engine.editingTarget.id);
    if (node) {
      node.def.delay = newDelay;
      if (isCircleSimple(node)) {
        engine.log('⚙️ Обновлена круговая инфоруна ' + node.label + ': delay ' + newDelay + ' мс', 'sys');
      } else {
        let valueChanged = false;
        if (valueInput.style.display !== 'none') {
          const nextValue = node.def.type === 'logic_reverse_auto' ? String(clampAutoDelay(valueInput.value)) : valueInput.value;
          valueChanged = String(node.customValue ?? '') !== String(nextValue ?? '');
          node.customValue = nextValue;
        }
        if (typeof engine.resizeSpecialNode === 'function') engine.resizeSpecialNode(node);
        if (valueChanged && (node.def.type === 'val_number' || node.def.type === 'val_text' || node.def.type === 'detector_toggle')) {
          node.data.value = node.def.type === 'detector_toggle'
            ? (String(node.customValue || '0') === '1' ? 1 : 0)
            : engine.valueFromCustom(node);
          node.data.lastUpdatedTime = engine.simTime;
          if (engine.initialized && node.def.type === 'detector_toggle') {
            engine.eventQueue.push({
              kind: 'reeval',
              time: engine.simTime,
              nodeId: node.id,
              sourceTag: node.state.lastSourceTag || null,
              sourceNodeId: node.state.lastSourceNodeId || null
            });
            engine.sortQueue();
          }
        }
        engine.log('⚙️ Обновлён блок ' + node.label + ': delay ' + newDelay + ' мс', 'sys');
      }
    }
  } else if (engine.editingTarget.kind === 'bridge') {
    const bridge = engine.bridges.find(b => b.id === engine.editingTarget.id);
    if (bridge) {
      bridge.delay = newDelay;
      engine.log('⚙️ Обновлён мостик: delay ' + newDelay + ' мс', 'sys');
    }
  }

  closeModal();
};
