// @ts-nocheck
// ===== save: บันทึกลง localStorage (ห่อ try/catch — บางเบราว์เซอร์ปิด storage) =====
PD.Save = {
  disablePersistence() {
    this.write = () => true;
    this.read = () => null;
    this.has = () => false;
    this.clear = () => {};
  },
  KEY: 'paperdungeon_inkworld_save_v1',
  has() { try { return !!localStorage.getItem(this.KEY); } catch (e) { return false; } },
  write(S) { try { S._savedAt = Date.now(); localStorage.setItem(this.KEY, JSON.stringify(S)); return true; } catch (e) { return false; } }, // _savedAt: ใช้เทียบเซฟใหม่กว่ากับเซิร์ฟเวอร์ออนไลน์
  read() { try { const s = localStorage.getItem(this.KEY); return s ? JSON.parse(s) : null; } catch (e) { return null; } },
  clear() { try { localStorage.removeItem(this.KEY); } catch (e) { } }
};
