// DOM bubbles that hover over things in the world (ready badges, prices, names).
import * as THREE from 'three';

export class Labels {
  constructor(root, rig) { this.root = root; this.rig = rig; this.items = new Map(); this.tmp = { x: 0, y: 0, z: 0 }; this.v = new THREE.Vector3(); }
  add(id, o) {
    let it = this.items.get(id);
    if (!it) {
      const el = document.createElement('button'); el.type = 'button'; el.className = 'wl'; el.tabIndex = -1;
      el.addEventListener('pointerdown', (e) => e.stopPropagation());
      el.addEventListener('click', (e) => { e.stopPropagation(); const cur = this.items.get(id); if (cur && cur.onTap) cur.onTap(); });
      this.root.appendChild(el); it = { el, pos: new THREE.Vector3(), last: '' }; this.items.set(id, it);
    }
    it.pos.set(o.x, o.y, o.z); it.onTap = o.onTap; it.max = o.max || 60; it.prio = o.prio || 0;
    if (o.html !== it.last) { it.el.innerHTML = o.html; it.last = o.html; }
    it.el.className = 'wl ' + (o.cls || '');
    if (o.label) it.el.setAttribute('aria-label', o.label);
    it.hide = false;
    return it;
  }
  remove(id) { const it = this.items.get(id); if (it) { it.el.remove(); this.items.delete(id); } }
  hide(id, h = true) { const it = this.items.get(id); if (it) it.hide = h; }
  update() {
    const rig = this.rig, cam = rig.camera, W = rig.w, H = rig.h;
    for (const it of this.items.values()) {
      if (it.hide) { it.el.style.display = 'none'; continue; }
      this.v.copy(it.pos).project(cam);
      const x = (this.v.x * 0.5 + 0.5) * W, y = (-this.v.y * 0.5 + 0.5) * H;
      const vis = this.v.z < 1 && x > -40 && x < W + 40 && y > -40 && y < H + 40;
      if (!vis) { it.el.style.display = 'none'; continue; }
      it.el.style.display = '';
      it.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-100%)`;
    }
  }
  clear() { for (const it of this.items.values()) it.el.remove(); this.items.clear(); }
}
