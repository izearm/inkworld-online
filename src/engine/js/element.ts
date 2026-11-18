// @ts-nocheck
PD.Element = {
  resolve(e, r, o) {
    const CFG = () => PD_DATA.config;
    const EL = CFG().elements, ael = o.dot ? null : (o.elem || r.elem || null), atkE = ael ? (EL.attackOf[ael] || 'normal') : 'normal';
    const em = (EL.chart[atkE] || {})[e.def.element || 'normal'] || 1;
    return { ael, em };
  }
};
