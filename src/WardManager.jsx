import { useState, useEffect, useCallback, useRef } from "react";

// ── Config ─────────────────────────────────────────────────────────────────────
const SUPABASE_URL = "https://kpwfldmucvfbgasnkcag.supabase.co";
const SUPABASE_KEY = "sb_publishable_--WwMN5Z4CSgeHcrBN3VRw_ssGCevfr";
const SUPER_PIN    = "CD##SUPER99";
const TABLE        = "ward_data";

const GROUP_PINS = {
  "cg1":  "CG1LEAD",  "cg2":  "CG2LEAD",  "cg3":  "CG3LEAD",
  "cg4":  "CG4LEAD",  "cg5":  "CG5LEAD",  "cg6":  "CG6LEAD",
  "cg7":  "CG7LEAD",  "cg8":  "CG8LEAD",  "cg9":  "CG9LEAD",
  "cg10": "CG10LEAD",
};

const ALL_LEADER_PINS = Object.values(GROUP_PINS);
const isAdminPin  = (p) => ALL_LEADER_PINS.includes(p) || p === SUPER_PIN;
const isLeaderPin = (p, wardId) => p === GROUP_PINS[wardId] || p === SUPER_PIN;

const WARD_TEMPLATES = {
  default:  { label:"Default (Bed-based)",  desc:"Assign students to numbered beds. Used for Gynaecology, Medicine, Obstetrics." },
  medicine: { label:"Medicine",              desc:"Bed-based with named ward sections (e.g. Elective, Emergency, HDU), Shadow HO banner, and shadow assigned from active Shadow HOs." },
  surgery:  { label:"Surgery",              desc:"Bed-based with named ward sections (e.g. Elective, Emergency, HDU), Shadow HO banner, and shadow assigned from active Shadow HOs." },
  paed:     { label:"Paediatrics",          desc:"Assign by admission order with patient name/age. Two student groups, ward sections, Shadow HO banner." },
  psych:    { label:"Psychiatry",           desc:"Assign by admission order with patient name. Two student groups, ward sections, Shadow HO banner. Adapted for psychiatric ward workflow." },
};

const LOGO_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFgAAABKCAYAAAA/i5OkAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAABgklEQVR4nO3aXW+DMAyFYTP1//9lejdFUSj5cBLbeZ+bVWhd6cmpoQwRAAAAAAAAAAjjfthW2n6cv8Hn39lPZEYDLiHsxNX5vJYQe18jhJ4Gtzb06EbPGBFIjH5803ZeP7YdS6vBxwf5ZCTgu/D46Hlb0tO81hBLo0Nb+j5GXkf9k9jaYKsN1dov9ff3afz91qYcP5s1D3J5mMeHK8J5cG77DC65Co+9tnf7DE49hbgjXLMLGmFEaIarvlBWV772o9qy/zP+5iuLDd4SxCzWAg4VrsjYQU5byC8uVhocMlwRGwGHDVdk/4ionbluL+LvDriHq7AtjIgRVi+f/vMesIjxkCMELGI45CgBixgNefdBruYgZTK4Wh4aXPpviRseAnaNgCdbHfBxN2avDDi/E+iIoHePiNqg3S7GqtO0t4DcBvhmd4M1mTyVWxFw2HbWiNJgk+0VWRPw7G9iZsMVWdtg7SBmLJz6Yq2+2GP2RulZrO1oKXRr+wgAAAAAAAAAHn0BpuAyXZaUVW4AAAAASUVORK5CYII=";

// ── Supabase helpers ───────────────────────────────────────────────────────────
const H = { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json" };

const db = {
  async getAll() {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?select=id,value,updated_at`, { headers: H });
    return await r.json();
  },
  async get(id) {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.${id}&select=value,updated_at`, { headers: H });
    const rows = await r.json(); return rows?.[0] ?? null;
  },
  async upsert(id, value) {
    const ts = new Date().toISOString();
    await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
      method: "POST", headers: { ...H, Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id, value: JSON.stringify(value), updated_at: ts })
    });
    return ts;
  }
};

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:"#f5f5f7", surface:"#ffffff", surfaceEl:"#f0f0f5",
  border:"#c8c8d0", borderMid:"#b0b0bc",
  text:"#0a0a0f", textSub:"#3a3a44", textMuted:"#7a7a88",
  green:"#1a9e3f", red:"#d92b20",
  shadow:"0 1px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
  shadowMd:"0 4px 18px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
};
const SF = "-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif";
const hexToRgb = h => { const r=/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(h); return r?`${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}`:"0,122,255"; };

// ── Icons ──────────────────────────────────────────────────────────────────────
const Icon = ({ name, size=14, color="currentColor" }) => {
  const s = { width:size, height:size, display:"inline-block", flexShrink:0 };
  const icons = {
    history:  <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M13 3H3a1 1 0 00-1 1v8a1 1 0 001 1h10a1 1 0 001-1V4a1 1 0 00-1-1z" stroke={color} strokeWidth="1.5"/><path d="M5 7.5l2 2 4-3" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    floor:    <svg style={s} viewBox="0 0 16 16" fill="none"><rect x="2" y="11" width="12" height="2" rx="1" stroke={color} strokeWidth="1.5"/><path d="M5 11V6a1 1 0 011-1h4a1 1 0 011 1v5" stroke={color} strokeWidth="1.5"/><path d="M8 5V3" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>,
    plus:     <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M8 3v10M3 8h10" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></svg>,
    settings: <svg style={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.2" stroke={color} strokeWidth="1.4"/><path d="M8 1.5v1.2M8 13.3v1.2M1.5 8h1.2M13.3 8h1.2M3.4 3.4l.85.85M11.75 11.75l.85.85M3.4 12.6l.85-.85M11.75 4.25l.85-.85" stroke={color} strokeWidth="1.3" strokeLinecap="round"/></svg>,
    key:      <svg style={s} viewBox="0 0 16 16" fill="none"><circle cx="6" cy="7" r="3" stroke={color} strokeWidth="1.5"/><path d="M8.5 9.5l5 5M11 12l1.5-1.5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>,
    check:    <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    close:    <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M4 4l8 8M12 4l-8 8" stroke={color} strokeWidth="1.8" strokeLinecap="round"/></svg>,
    user:     <svg style={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke={color} strokeWidth="1.5"/><path d="M3 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round"/></svg>,
    shadow:   <svg style={s} viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5.5" r="2.5" stroke={color} strokeWidth="1.5" strokeDasharray="2 1.5"/><path d="M3 13c0-2.761 2.239-5 5-5s5 2.239 5 5" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeDasharray="2 1.5"/></svg>,
    newdot:   <svg style={s} viewBox="0 0 16 16" fill={color}><circle cx="8" cy="8" r="4"/><circle cx="8" cy="8" r="6.5" fill="none" stroke={color} strokeWidth="1" opacity="0.35"/></svg>,
    back:     <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke={color} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/></svg>,
    ward:     <svg style={s} viewBox="0 0 16 16" fill="none"><rect x="2" y="4" width="12" height="9" rx="1.5" stroke={color} strokeWidth="1.5"/><path d="M5 4V3a1 1 0 011-1h4a1 1 0 011 1v1M8 7.5v3M6.5 9h3" stroke={color} strokeWidth="1.4" strokeLinecap="round"/></svg>,
    eye:      <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M1.5 8C2.5 5 5 3 8 3s5.5 2 6.5 5c-1 3-3.5 5-6.5 5S2.5 11 1.5 8z" stroke={color} strokeWidth="1.4"/><circle cx="8" cy="8" r="2" stroke={color} strokeWidth="1.4"/></svg>,
    edit:     <svg style={s} viewBox="0 0 16 16" fill="none"><path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z" stroke={color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>,
  };
  return icons[name] || null;
};

// ── Style helpers ──────────────────────────────────────────────────────────────
const labelStyle = { fontSize:"0.68rem", color:C.textSub, letterSpacing:"0.04em", textTransform:"uppercase", display:"block", fontWeight:600, fontFamily:SF };
const iS = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, padding:"11px 14px", fontSize:"0.88rem", outline:"none", fontFamily:SF, boxShadow:C.shadow };
const rB = { background:C.surfaceEl, border:`1px solid ${C.border}`, color:C.textMuted, borderRadius:8, padding:"0 12px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", height:42 };
const aMB = { marginTop:10, background:"none", border:`1px dashed ${C.border}`, color:C.textSub, borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:"0.78rem", width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:SF };
const accentBtn = (t,rgb) => ({ background:t, border:"none", color:"#fff", borderRadius:12, cursor:"pointer", fontWeight:600, fontFamily:SF, boxShadow:`0 4px 14px rgba(${rgb},0.3)` });

// ── Bed key helpers (Default & Medicine) ────────────────────────────────────────
// Range-based sections can legitimately overlap in number (e.g. HDU 1-2 and
// Prenatal 1-14 are different physical beds that both happen to be numbered "1").
// To avoid them colliding on a single flat beds[] entry, every range-based bed is
// stored under a section-qualified key "SectionName::N". Special beds (named IDs)
// and floor beds (F1, F2…) are already unique and keep bare keys.
const BED_KEY_SEP = "::";

const qualifyBedKey = (sectionName, bedNum) => {
  if (!sectionName) return String(bedNum);
  return `${sectionName}${BED_KEY_SEP}${bedNum}`;
};

// Split a storage key back into { section, num } for display/lookup.
const splitBedKey = (key) => {
  const idx = key.indexOf(BED_KEY_SEP);
  if (idx === -1) return { section: null, num: key };
  return { section: key.slice(0, idx), num: key.slice(idx + BED_KEY_SEP.length) };
};

// Find every section whose numeric range contains n (range-based sections only).
const sectionsContaining = (sections, n) => {
  const matches = [];
  for (const sec of sections) {
    const rangeStr = sec.range || "";
    if (rangeStr.includes("-")) {
      const [start, end] = rangeStr.split("-").map(s => Number(s.trim()));
      if (!isNaN(start) && !isNaN(end) && n >= start && n <= end) matches.push(sec.name);
    }
  }
  return matches;
};

// Migrate a legacy flat beds{} object (bare numeric keys) into section-qualified
// keys, based on the ward's current section ranges. Special beds and floor beds
// are passed through unchanged. If a legacy bed number matches more than one
// section's range (the overlap bug), the bed's data is copied into each matching
// section's qualified key so no existing data is lost.
const migrateDefaultBeds = (rawBeds, sections) => {
  if (!rawBeds) return {};
  const out = {};
  for (const [key, bed] of Object.entries(rawBeds)) {
    if (!bed) continue;
    // Already qualified, a special bed, or a floor bed — keep as-is.
    if (key.includes(BED_KEY_SEP) || bed.specialBedSection || bed.isFloor || isNaN(Number(key))) {
      out[key] = bed;
      continue;
    }
    const n = Number(key);
    const matches = sectionsContaining(sections, n);
    if (matches.length === 0) {
      // No section claims this bed number — keep it bare (e.g. "Other"/unassigned).
      out[key] = bed;
    } else {
      matches.forEach(secName => { out[qualifyBedKey(secName, n)] = { ...bed }; });
    }
  }
  return out;
};

// Whether a bed has any data worth protecting from accidental deletion —
// covers both Default's flat-field shape and Medicine's patients[] shape.
const bedHasData = (bed) => {
  if (!bed) return false;
  if (Array.isArray(bed.patients)) {
    return bed.patients.some(p => (p.assigned?.length>0) || (p.shadows?.length>0) || p.diagnosis || p.consultant || p.notes);
  }
  return (bed.assigned?.length>0) || (bed.shadows?.length>0) || !!bed.diagnosis || !!bed.consultant || !!bed.notes;
};

// Remove beds no longer implied by current section ranges / special bed list.
// Beds that still have data are kept (never silently dropped) and reported back
// via the returned `protectedKeys` so the caller can warn the user.
const pruneStaleBeds = (existingBeds, wardSections, specialBeds) => {
  const validKeys = new Set();
  wardSections.forEach(sec=>{
    if (sec.range?.includes("-")) {
      const [start,end] = sec.range.split("-").map(s=>parseInt(String(s).trim()));
      if (!isNaN(start) && !isNaN(end)) {
        for (let n=start;n<=end;n++) validKeys.add(qualifyBedKey(sec.name,n));
      }
    }
  });
  specialBeds.forEach(sb=>validKeys.add(sb.id));
  const out = {};
  const protectedKeys = [];
  for (const [key, bed] of Object.entries(existingBeds)) {
    if (bed?.isFloor) { out[key] = bed; continue; } // floor patients are never section/range-bound
    if (validKeys.has(key)) { out[key] = bed; continue; }
    if (bedHasData(bed)) { out[key] = bed; protectedKeys.push(key); continue; }
    // Empty and no longer implied by config — safe to drop.
  }
  return { beds: out, protectedKeys };
};


const DEFAULT_OP_COLORS = { "pre-op": { bg:"rgba(249,115,22,0.12)", border:"rgba(249,115,22,0.3)", color:"#c2410c", activeBg:"rgba(249,115,22,0.18)", activeBorder:"#f97316" }, "post-op": { bg:"rgba(56,189,248,0.08)", border:"rgba(56,189,248,0.3)", color:"#0369a1", activeBg:"rgba(56,189,248,0.18)", activeBorder:"#38bdf8" } };

function BrandingBar({ theme }) {
  return (
    <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:40,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 16px 8px",background:"rgba(245,245,247,0.88)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderTop:`1px solid rgba(0,0,0,0.06)`}}>
      <div style={{display:"flex",alignItems:"baseline",gap:0,opacity:0.25}}>
        <span style={{fontSize:"0.72rem",fontWeight:700,color:C.text,letterSpacing:"-0.04em",fontFamily:SF}}>Clinical</span>
        <span style={{fontSize:"0.72rem",fontWeight:300,color:theme||"#007aff",letterSpacing:"-0.02em",fontFamily:SF}}>Dashboard</span>
      </div>
      <img src={LOGO_B64} alt="logo" style={{height:16,opacity:0.18,filter:"grayscale(100%)",userSelect:"none",pointerEvents:"none"}}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  const seniorMode = new URLSearchParams(window.location.search).get("view")==="senior";
  const directWard = new URLSearchParams(window.location.search).get("ward");
  const [screen, setScreen]     = useState("loading"); // loading | home | ward | create
  const [wards,  setWards]      = useState([]);
  const [activeWardId, setActiveWardId] = useState(null);
  const [toast,  setToast]      = useState(null);
  const localTs  = useRef({});
  const pollRef  = useRef(true);

  const showToast = (msg, type="success") => { setToast({msg,type}); setTimeout(()=>setToast(null),2500); };

  // ── Load all wards ──────────────────────────────────────────────────────────
  const loadAll = useCallback(async () => {
    try {
      const rows = await db.getAll();
      // Migrate legacy single-ward data (ward-manager-v3) into cg1 if not already done
      const legacyRow = (rows||[]).find(r=>r.id==="ward-manager-v3");
      const cg1Exists = (rows||[]).some(r=>r.id==="ward:cg1");
      if (legacyRow && !cg1Exists) {
        try {
          const legacy = JSON.parse(legacyRow.value);
          if (legacy.setup) { await db.upsert("ward:cg1", legacy); }
        } catch {}
        // Re-fetch after migration
        const rows2 = await db.getAll();
        const parsed2 = (rows2||[])
          .filter(r=>r.id.startsWith("ward:"))
          .map(r=>{ try{const v=JSON.parse(r.value);return{...v,id:r.id.replace("ward:",""),_ts:r.updated_at};}catch{return null;} })
          .filter(Boolean);
        setWards(parsed2);
        parsed2.forEach(w=>{ localTs.current[w.id]=w._ts; });
        return;
      }
      const parsed = (rows||[])
        .filter(r => r.id.startsWith("ward:"))
        .map(r => { try { const v=JSON.parse(r.value); return {...v, id:r.id.replace("ward:",""), _ts:r.updated_at}; } catch { return null; } })
        .filter(Boolean);
      setWards(parsed);
      parsed.forEach(w => { localTs.current[w.id] = w._ts; });
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      await loadAll();
      if (directWard) {
        setActiveWardId(directWard);
        setScreen("ward");
      } else {
        setScreen("home");
      }
    })();

    // Poll for homepage updates every 8s
    const homePoll = setInterval(async () => {
      if (!pollRef.current) return;
      await loadAll();
    }, 8000);
    return () => { clearInterval(homePoll); pollRef.current = false; };
  }, [loadAll]);

  const saveWard = useCallback(async (wardId, wardData) => {
    const ts = await db.upsert(`ward:${wardId}`, wardData);
    localTs.current[wardId] = ts;
    setWards(ws => ws.map(w => w.id===wardId ? {...wardData, id:wardId, _ts:ts} : w));
    return ts;
  }, []);

  const deleteWard = useCallback(async (wardId) => {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}?id=eq.ward:${wardId}`, {
        method: "DELETE",
        headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
      });
      setWards(ws => ws.filter(w => w.id !== wardId));
      setScreen("home");
      setActiveWardId(null);
    } catch { showToast("Delete failed","error"); }
  }, []);

  if (screen==="loading") return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,color:C.textSub,fontFamily:SF}}>Loading…</div>
  );

  if (screen==="ward" && activeWardId) {
    const ward = wards.find(w=>w.id===activeWardId);
    return <WardView
      wardId={activeWardId}
      ward={ward}
      onBack={()=>{ setScreen("home"); pollRef.current=true; loadAll(); }}
      onSave={saveWard}
      onDelete={deleteWard}
      showToast={showToast}
      localTs={localTs}
      seniorMode={seniorMode}
    />;
  }

  if (screen==="create") return (
    <CreateWardScreen
      wards={wards}
      onSave={saveWard}
      showToast={showToast}
      onBack={()=>setScreen("home")}
      onCreated={()=>{ loadAll(); setScreen("home"); }}
    />
  );

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:SF,paddingBottom:60}}>
      {/* Header */}
      <div style={{background:"rgba(245,245,247,0.88)",borderBottom:`1px solid ${C.border}`,padding:"14px 18px",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div>
            <div style={{display:"flex",alignItems:"baseline",gap:0}}>
              <span style={{fontSize:"1rem",fontWeight:700,color:C.text,letterSpacing:"-0.04em"}}>Clinical</span>
              <span style={{fontSize:"1rem",fontWeight:300,color:"#007aff",letterSpacing:"-0.02em"}}>Dashboard</span>
            </div>
            <div style={{fontSize:"0.68rem",color:C.textMuted,marginTop:1}}>{seniorMode ? "Senior view — read only" : "All active wards"}</div>
          </div>
          {!seniorMode && <AdminButton onCreateWard={()=>setScreen("create")}/>}
          {seniorMode && <span style={{fontSize:"0.62rem",fontWeight:600,color:"#007aff",background:"rgba(0,122,255,0.08)",border:"1px solid rgba(0,122,255,0.2)",borderRadius:20,padding:"4px 10px"}}>READ ONLY</span>}
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"20px 16px 80px"}}>
        {wards.length===0
          ? <div style={{textAlign:"center",padding:"80px 20px",color:C.textMuted}}>
              <div style={{marginBottom:12}}><Icon name="ward" size={32} color={C.border}/></div>
              <div style={{fontSize:"0.9rem"}}>No wards set up yet.</div>
              <div style={{fontSize:"0.8rem",marginTop:4}}>Use the admin button to create the first ward.</div>
            </div>
          : <div style={{display:"flex",flexDirection:"column",gap:14}}>
              {[...wards].sort((a,b)=>getWardPatientCount(b)-getWardPatientCount(a)).map(ward => <WardCard key={ward.id} ward={ward} onOpen={()=>{ setActiveWardId(ward.id); setScreen("ward"); pollRef.current=false; }}/>)}
            </div>
        }
      </div>
      <BrandingBar theme="#007aff"/>
      {toast && <Toast toast={toast}/>}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}`}</style>
    </div>
  );
}

// ── Patient count helper (used for homepage sort) ─────────────────────────────
function getWardPatientCount(ward) {
  const setup = ward.setup || {};
  const beds = ward.beds || {};
  const patients = ward.patients || [];
  const tmpl = setup.template || "default";
  if (tmpl === "paed" || tmpl === "surgery" || tmpl === "psych") return patients.length;
  if (tmpl === "medicine") {
    return Object.values(beds).reduce((sum, b) => sum + (b?.patients?.length || 0), 0);
  }
  // default
  return Object.keys(beds).filter(k => {
    const b = beds[k];
    return b && (b.diagnosis || b.consultant || b.notes || b.assigned?.length > 0 || b.shadows?.length > 0 || b.isNew || b.historyTaken);
  }).length;
}

// ── Ward card on homepage ──────────────────────────────────────────────────────
function WardCard({ ward, onOpen }) {
  const setup    = ward.setup || {};
  const beds     = ward.beds  || {};
  const patients = ward.patients || [];
  const theme    = setup.themeColor || "#007aff";
  const rgb      = hexToRgb(theme);
  const isPaed    = setup.template === "paed";
  const isSurgery = setup.template === "surgery";
  const isPsych   = setup.template === "psych";
  const bedKeys  = Object.keys(beds);

  // Default template stats
  const newCount  = bedKeys.filter(k=>beds[k]?.isNew).length;
  const histCount = bedKeys.filter(k=>beds[k]?.historyTaken).length;
  const assigned  = bedKeys.filter(k=>beds[k]?.assigned?.length>0||beds[k]?.shadows?.length>0).length;

  // Patient count
  const patientCount = (isPaed||isSurgery||isPsych)
    ? patients.length
    : bedKeys.filter(k=>{ const b=beds[k]; return b&&(b.diagnosis||b.consultant||b.notes||b.assigned?.length>0||b.shadows?.length>0||b.isNew||b.historyTaken||b.opStatus); }).length;

  // Paed/Surgery/Psych stats
  const ptNew  = patients.filter(p=>p.isNew).length;
  const ptHist = patients.filter(p=>p.historyTaken).length;
  const paedNew  = ptNew;
  const paedHist = ptHist;
  const paedTotal = patients.filter(p=>p.name||p.patientName).length;

  return (
    <div onClick={onOpen} style={{background:C.surface,border:`1px solid rgba(0,0,0,0.08)`,borderRadius:18,padding:"18px 18px 14px",cursor:"pointer",boxShadow:"0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.05)",transition:"transform 0.12s, box-shadow 0.12s",userSelect:"none"}}
      onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 28px rgba(0,0,0,0.1)";}}
      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 4px 20px rgba(0,0,0,0.07), 0 1px 4px rgba(0,0,0,0.05)";}}>
      {/* Top row */}
      <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:12}}>
        <div>
          <div style={{fontSize:"1.15rem",fontWeight:700,color:C.text,letterSpacing:"-0.03em",lineHeight:1}}>{setup.wardName||"Unnamed Ward"}</div>
          <div style={{fontSize:"0.78rem",color:C.textSub,marginTop:3,fontWeight:400}}>{setup.appointmentType||""}</div>
        </div>
        <div style={{background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.18)`,borderRadius:8,padding:"4px 10px"}}>
          <span style={{fontSize:"0.7rem",fontWeight:600,color:theme}}>{patientCount} patients</span>
        </div>
      </div>

      {/* Stats row */}
      <div style={{display:"flex",gap:8,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
        {((isPaed||isSurgery||isPsych) ? [
          { icon:"newdot",  color:C.red,   label:"New",      val:ptNew },
          { icon:"history", color:C.green, label:"Hx taken", val:`${ptHist}/${patientCount}` },
        ] : [
          { icon:"newdot",  color:C.red,   label:"New",      val:newCount },
          { icon:"history", color:C.green, label:"Hx taken", val:`${histCount}/${assigned}` },
        ]).map(s=>(
          <div key={s.label} style={{display:"flex",alignItems:"center",gap:5,flex:1}}>
            <Icon name={s.icon} size={12} color={s.color}/>
            <span style={{fontSize:"0.72rem",fontWeight:600,color:s.color}}>{s.val}</span>
            <span style={{fontSize:"0.65rem",color:C.textMuted}}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Share links */}
      <div style={{display:"flex",gap:12,marginTop:10,paddingTop:10,borderTop:`1px solid ${C.border}`}} onClick={e=>e.stopPropagation()}>
        <button onClick={()=>{const u=`${window.location.origin}${window.location.pathname}?ward=${ward.id}`;navigator.clipboard?.writeText(u).then(()=>alert("Student link copied!")).catch(()=>alert(u));}}
          style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",color:C.textMuted,fontSize:"0.7rem",cursor:"pointer",fontFamily:SF,padding:0}}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M6.5 9.5l3-3M9 4.5l1.5-1.5a2.121 2.121 0 013 3L12 7.5M7 11.5l-1.5 1.5a2.121 2.121 0 01-3-3L4 8.5" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round"/></svg>
          Student link
        </button>
        <button onClick={()=>{const u=`${window.location.origin}${window.location.pathname}?ward=${ward.id}&view=senior`;navigator.clipboard?.writeText(u).then(()=>alert("Read-only link copied!")).catch(()=>alert(u));}}
          style={{display:"flex",alignItems:"center",gap:5,background:"none",border:"none",color:C.textMuted,fontSize:"0.7rem",cursor:"pointer",fontFamily:SF,padding:0}}>
          <svg width="11" height="11" viewBox="0 0 16 16" fill="none"><path d="M6.5 9.5l3-3M9 4.5l1.5-1.5a2.121 2.121 0 013 3L12 7.5M7 11.5l-1.5 1.5a2.121 2.121 0 01-3-3L4 8.5" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round"/></svg>
          Read-only link
        </button>
      </div>
    </div>
  );
}

// ── Admin button — PIN gate only, create screen is at App level ────────────────
function AdminButton({ onCreateWard }) {
  const [open,   setOpen]  = useState(false);
  const [pin,    setPin]   = useState("");
  const [pinErr, setPinErr]= useState(false);

  const tryPin = () => {
    if (isAdminPin(pin)) { setOpen(false); setPin(""); onCreateWard(); }
    else { setPinErr(true); setTimeout(()=>setPinErr(false),1500); }
  };

  return (
    <>
      <button onClick={()=>setOpen(true)} style={{display:"flex",alignItems:"center",gap:6,background:C.surface,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:20,padding:"6px 14px",fontSize:"0.75rem",cursor:"pointer",fontFamily:SF,boxShadow:C.shadow}}>
        <Icon name="plus" size={12} color={C.textSub}/> New Ward
      </button>
      {open && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,boxShadow:C.shadowMd,border:`1px solid ${C.border}`}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <Icon name="key" size={16} color="#007aff"/>
              <h3 style={{margin:0,color:C.text,fontWeight:600}}>Leader Access</h3>
            </div>
            <p style={{margin:"0 0 16px",color:C.textSub,fontSize:"0.84rem"}}>Enter your leader PIN to create a new ward.</p>
            <input type="password" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryPin()} placeholder="Leader PIN"
              style={{...iS,width:"100%",boxSizing:"border-box",textAlign:"center",letterSpacing:"0.2em",borderColor:pinErr?C.red:undefined}}/>
            {pinErr && <div style={{color:C.red,fontSize:"0.78rem",textAlign:"center",marginTop:6}}>Incorrect PIN</div>}
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button onClick={()=>{setOpen(false);setPin("");}} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={tryPin} style={{flex:1,...accentBtn("#007aff","0,122,255"),padding:"11px",fontSize:"0.9rem"}}>Unlock</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ── Full-page create ward screen ───────────────────────────────────────────────
function CreateWardScreen({ wards, onSave, showToast, onBack, onCreated }) {
  const groupOptions = Object.keys(GROUP_PINS).filter(id=>!wards.find(w=>w.id===id));
  const [form, setForm] = useState({
    groupId: groupOptions[0]||"cg1", wardName:"", appointmentType:"", bedCount:"",
    themeColor:"#007aff", template:"default",
    students:[{name:"",group:""}], consultants:[{name:"",color:"#6366f1"}],
    // Paed-specific (also shared by psych)
    paedGroups:[{name:"Group A",students:[{name:"",no:""}]},{name:"Group B",students:[{name:"",no:""}]}],
    wardSections:[{name:"General",count:""},{name:"HDU",count:""},{name:"NICU",count:""},{name:"NBU",count:""}],
    shadowHOs:[{post:"Shadow HO 1",name:""},{post:"Shadow HO 2",name:""},{post:"Shadow HO 3",name:""}],
    // Psych-specific ward section defaults
    psychSections:[{name:"Male Ward",count:""},{name:"Female Ward",count:""}],
  });
  const [error, setError] = useState("");

  const create = async () => {
    setError("");
    if (!form.wardName||!form.appointmentType) { setError("Please fill in Ward Name and Rotation."); return; }
    if (form.template==="default" && !form.bedCount) { setError("Please enter Number of Beds."); return; }
    if (wards.find(w=>w.id===form.groupId)) { setError("This clinical group already has a ward."); return; }
    if (groupOptions.length===0) { setError("All clinical groups already have wards."); return; }

    let setup;
    if (form.template==="paed") {
      setup = {
        wardName: form.wardName, appointmentType: form.appointmentType,
        themeColor: form.themeColor, template: "paed",
        paedGroups: form.paedGroups.map(g=>({name:g.name, students:g.students.filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),no:s.no?.trim()||""}))})),
        wardSections: form.wardSections.filter(s=>s.name?.trim()&&s.count).map(s=>({name:s.name.trim(),count:parseInt(s.count)||0})),
        shadowHOs: form.shadowHOs,
        consultants: form.consultants.filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"})),
      };
    } else if (form.template==="psych") {
      const psychSections = (form.psychSections||[{name:"Male Ward",count:""},{name:"Female Ward",count:""}])
        .filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),count:parseInt(s.count)||0}));
      setup = {
        wardName: form.wardName, appointmentType: form.appointmentType,
        themeColor: form.themeColor, template: "psych",
        paedGroups: form.paedGroups.map(g=>({name:g.name, students:g.students.filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),no:s.no?.trim()||""}))})),
        wardSections: psychSections,
        consultants: form.consultants.filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"})),
        customTags: (form.customTags||[]).filter(t=>t.label?.trim()).map(t=>({label:t.label.trim(),color:t.color||"#6366f1"})),
        pairings: [],
      };
    } else if (form.template==="surgery") {
      const wardSections = (form.wardSections||[]).filter(s=>s.name?.trim());
      if (wardSections.length===0) { setError("Add at least one ward section."); return; }
      const students    = form.students.filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),group:s.group?.trim()||""}));
      const consultants = form.consultants.filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"}));
      const sections    = wardSections.map(s=>({name:s.name.trim(),range:s.range?.trim()||""}));
      const shadowHOs   = form.shadowHOs || [];
      const specialBeds = (form.specialBeds||[]).filter(b=>b.id?.trim()).map(b=>({id:b.id.trim(),section:b.section?.trim()||""}));
      const customTags  = (form.customTags||[]).filter(t=>t.label?.trim()).map(t=>({label:t.label.trim(),color:t.color||"#6366f1"}));
      await onSave(form.groupId, { setup:{ wardName:form.wardName, appointmentType:form.appointmentType, themeColor:form.themeColor, template:"surgery", students, consultants, wardSections:sections, shadowHOs, customTags, specialBeds, pairings:[] }, patients:[] });
      showToast("Ward created!"); onCreated(); return;
    } else if (form.template==="medicine") {
      const wardSections = (form.wardSections||[]).filter(s=>s.name?.trim()&&s.range?.trim());
      if (wardSections.length===0) { setError("Add at least one ward section with a bed range."); return; }
      const sections    = wardSections.map(s=>({name:s.name.trim(),range:s.range.trim()}));
      const mkBed = (extra={}) => ({ assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, opStatus:"", ...extra });
      const beds = {};
      // Section-qualified beds — one entry per section per bed number in its range,
      // so overlapping ranges (e.g. HDU 1-2 and Prenatal 1-14) don't collide.
      sections.forEach(sec=>{
        if (sec.range?.includes("-")) {
          const [start,end] = sec.range.split("-").map(s=>parseInt(s.trim()));
          if (!isNaN(start) && !isNaN(end)) {
            for (let n=start;n<=end;n++) beds[qualifyBedKey(sec.name,n)] = mkBed();
          }
        }
      });
      // Derive bed count from the highest bed number across all ranges (kept for setup.bedCount display)
      let maxBed = 0;
      for (const sec of wardSections) {
        const parts = sec.range.split("-").map(Number);
        const hi = Math.max(...parts.filter(n=>!isNaN(n)));
        if (hi > maxBed) maxBed = hi;
      }
      const count = maxBed || 80;
      const students    = form.students.filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),group:s.group?.trim()||""}));
      const consultants = form.consultants.filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"}));
      const shadowHOs   = form.shadowHOs || [{post:"Shadow HO 1",name:""},{post:"Shadow HO 2",name:""},{post:"Shadow HO 3",name:""}];
      // Add special beds to the beds object
      const specialBeds = (form.specialBeds||[]).filter(b=>b.id?.trim());
      const customTags  = (form.customTags||[]).filter(t=>t.label?.trim()).map(t=>({label:t.label.trim(),color:t.color||"#6366f1"}));
      specialBeds.forEach(b=>{ beds[b.id.trim()]=mkBed({specialBedSection:b.section?.trim()||"",tags:[]}); });
      await onSave(form.groupId, { setup:{ wardName:form.wardName, appointmentType:form.appointmentType, bedCount:count, themeColor:form.themeColor, template:form.template, students, consultants, wardSections:sections, shadowHOs, specialBeds, customTags }, beds });
      showToast("Ward created!"); onCreated(); return;
    }
    await onSave(form.groupId, { setup, patients:[], beds:{} });
    showToast("Ward created!"); onCreated();
  };

  const addStudent    = () => setForm(f=>({...f,students:[...f.students,{name:"",group:""}]}));
  const updStudent    = (i,k,v) => setForm(f=>{ const a=[...f.students]; a[i]={...a[i],[k]:v}; return {...f,students:a}; });
  const remStudent    = (i) => setForm(f=>({...f,students:f.students.filter((_,idx)=>idx!==i)}));
  const addConsultant = () => setForm(f=>({...f,consultants:[...f.consultants,{name:"",color:"#6366f1"}]}));
  const updConsultant = (i,k,v) => setForm(f=>{ const a=[...f.consultants]; a[i]={...a[i],[k]:v}; return {...f,consultants:a}; });
  const remConsultant = (i) => setForm(f=>({...f,consultants:f.consultants.filter((_,idx)=>idx!==i)}));

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:SF,paddingBottom:60}}>
      <div style={{background:"rgba(245,245,247,0.88)",borderBottom:`1px solid ${C.border}`,padding:"12px 18px",position:"sticky",top:0,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",zIndex:50}}>
        <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",color:C.textSub,padding:0}}><Icon name="back" size={18} color={C.textSub}/></button>
          <span style={{fontSize:"0.9rem",fontWeight:600,color:C.text}}>Create New Ward</span>
        </div>
      </div>

      <div style={{maxWidth:560,margin:"0 auto",padding:"28px 20px 60px"}}>
        <div style={{marginBottom:18}}>
          <label style={labelStyle}>Clinical Group</label>
          <select value={form.groupId} onChange={e=>setForm(f=>({...f,groupId:e.target.value}))} style={{...iS,width:"100%",marginTop:6,boxSizing:"border-box"}}>
            {groupOptions.map(id=><option key={id} value={id}>{id.toUpperCase()}</option>)}
          </select>
        </div>
        {/* Template selector - dropdown */}
        <div style={{marginBottom:22}}>
          <label style={labelStyle}>Ward Template</label>
          <select value={form.template} onChange={e=>setForm(f=>({...f,template:e.target.value}))}
            style={{...iS,width:"100%",marginTop:6,boxSizing:"border-box"}}>
            {Object.entries(WARD_TEMPLATES).map(([key,t])=>(
              <option key={key} value={key}>{t.label}</option>
            ))}
          </select>
          <div style={{fontSize:"0.72rem",color:C.textMuted,marginTop:6,paddingLeft:2}}>{WARD_TEMPLATES[form.template]?.desc}</div>
        </div>

        <div style={{marginBottom:18}}>
          <label style={labelStyle}>Ward Name</label>
          <input value={form.wardName} onChange={e=>setForm(f=>({...f,wardName:e.target.value}))} placeholder="e.g. Paediatric Ward" style={{...iS,width:"100%",marginTop:6,boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:18}}>
          <label style={labelStyle}>Rotation / Appointment</label>
          <input value={form.appointmentType} onChange={e=>setForm(f=>({...f,appointmentType:e.target.value}))} placeholder="e.g. Paediatrics – Week 1" style={{...iS,width:"100%",marginTop:6,boxSizing:"border-box"}}/>
        </div>

        {form.template==="default" && (
          <div style={{marginBottom:18}}>
            <label style={labelStyle}>Number of Beds</label>
            <input type="number" value={form.bedCount} onChange={e=>setForm(f=>({...f,bedCount:e.target.value}))} placeholder="e.g. 20" style={{...iS,width:"100%",marginTop:6,boxSizing:"border-box"}}/>
          </div>
        )}

        <div style={{marginBottom:22}}>
          <label style={labelStyle}>Accent Colour</label>
          <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",boxShadow:C.shadow}}>
            <input type="color" value={form.themeColor} onChange={e=>setForm(f=>({...f,themeColor:e.target.value}))} style={{width:40,height:40,border:"none",borderRadius:8,cursor:"pointer",padding:0,background:"none"}}/>
            <div style={{flex:1,height:8,borderRadius:4,background:`linear-gradient(90deg,${C.surfaceEl},${form.themeColor})`}}/>
            <span style={{fontSize:"0.75rem",color:C.textMuted,fontFamily:"monospace"}}>{form.themeColor}</span>
          </div>
        </div>

        {form.template==="paed" ? (
          <PaedSetupFields form={form} setForm={setForm} theme={form.themeColor}/>
        ) : form.template==="psych" ? (
          <PsychSetupFields form={form} setForm={setForm} theme={form.themeColor}/>
        ) : form.template==="medicine" ? (
          <MedicineSetupFields form={form} setForm={setForm}/>
        ) : form.template==="surgery" ? (
          <SurgerySetupFields form={form} setForm={setForm}/>
        ) : (
          <>
            {/* Default students */}
            <div style={{marginBottom:22}}>
              <label style={labelStyle}>Students</label>
              <div style={{display:"grid",gridTemplateColumns:"1fr 56px",gap:4,marginTop:8,marginBottom:4,paddingLeft:2}}>
                <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em"}}>NAME</span>
                <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em",textAlign:"center"}}>GRP NO.</span>
              </div>
              {form.students.map((s,i)=>(
                <div key={i} style={{display:"flex",gap:6,marginTop:6}}>
                  <input value={s.name} onChange={e=>setForm(f=>{const a=[...f.students];a[i]={...a[i],name:e.target.value};return{...f,students:a};})} placeholder={`Student ${i+1}`} style={{...iS,flex:1,padding:"9px 12px"}}/>
                  <input value={s.group} onChange={e=>setForm(f=>{const a=[...f.students];a[i]={...a[i],group:e.target.value};return{...f,students:a};})} placeholder="1" style={{...iS,width:48,padding:"9px 8px",textAlign:"center",flexShrink:0}}/>
                  {form.students.length>1 && <button onClick={()=>setForm(f=>({...f,students:f.students.filter((_,idx)=>idx!==i)}))} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
                </div>
              ))}
              <button onClick={()=>setForm(f=>({...f,students:[...f.students,{name:"",group:""}]}))} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Student</button>
            </div>
            {/* Consultants */}
            <div style={{marginBottom:32}}>
              <label style={labelStyle}>Consultants</label>
              {form.consultants.map((c,i)=>(
                <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
                  <input type="color" value={c.color||"#6366f1"} onChange={e=>setForm(f=>{const a=[...f.consultants];a[i]={...a[i],color:e.target.value};return{...f,consultants:a};})} style={{width:38,height:38,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",padding:2,background:"none",flexShrink:0}}/>
                  <input value={c.name} onChange={e=>setForm(f=>{const a=[...f.consultants];a[i]={...a[i],name:e.target.value};return{...f,consultants:a};})} placeholder="Name or title" style={{...iS,flex:1}}/>
                  {form.consultants.length>1 && <button onClick={()=>setForm(f=>({...f,consultants:f.consultants.filter((_,idx)=>idx!==i)}))} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
                </div>
              ))}
              <button onClick={()=>setForm(f=>({...f,consultants:[...f.consultants,{name:"",color:"#6366f1"}]}))} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Consultant</button>
            </div>
          </>
        )}

        {error && <div style={{background:`rgba(${hexToRgb(C.red)},0.08)`,border:`1px solid rgba(${hexToRgb(C.red)},0.3)`,borderRadius:10,padding:"10px 14px",marginBottom:16,fontSize:"0.82rem",color:C.red}}>{error}</div>}

        <button onClick={create} style={{...accentBtn(form.themeColor,hexToRgb(form.themeColor)),width:"100%",padding:"15px",fontSize:"0.95rem"}}>
          Create Ward
        </button>
      </div>
      <BrandingBar theme={form.themeColor}/>
    </div>
  );
}

// ── PaedSetupFields ────────────────────────────────────────────────────────────
// ── Medicine Setup Fields ───────────────────────────────────────────────────────
function MedicineSetupFields({ form, setForm }) {
  const wardSections = form.wardSections || [{name:"Elective",range:""},{name:"Emergency",range:""},{name:"HDU",range:""}];
  const shadowHOs    = form.shadowHOs    || [{post:"Shadow HO 1",name:""},{post:"Shadow HO 2",name:""},{post:"Shadow HO 3",name:""}];
  const students     = form.students     || [{name:"",group:""}];
  const consultants  = form.consultants  || [{name:"",color:"#6366f1"}];

  const addSection   = () => setForm(f=>({...f,wardSections:[...(f.wardSections||wardSections),{name:"",range:""}]}));
  const updSection   = (i,k,v) => setForm(f=>{ const s=[...(f.wardSections||wardSections)]; s[i]={...s[i],[k]:v}; return {...f,wardSections:s}; });
  const remSection   = (i) => setForm(f=>({...f,wardSections:(f.wardSections||wardSections).filter((_,idx)=>idx!==i)}));
  const updShadowHO  = (i,v) => setForm(f=>{ const s=[...(f.shadowHOs||shadowHOs)]; s[i]={...s[i],name:v}; return {...f,shadowHOs:s}; });
  const addShadowHO  = () => { const n=(form.shadowHOs||shadowHOs).length+1; setForm(f=>({...f,shadowHOs:[...(f.shadowHOs||shadowHOs),{post:`Shadow HO ${n}`,name:""}]})); };
  const remShadowHO  = (i) => setForm(f=>({...f,shadowHOs:(f.shadowHOs||shadowHOs).filter((_,idx)=>idx!==i)}));
  const addStudent   = () => setForm(f=>({...f,students:[...(f.students||students),{name:"",group:""}]}));
  const updStudent   = (i,k,v) => setForm(f=>{ const a=[...(f.students||students)]; a[i]={...a[i],[k]:v}; return {...f,students:a}; });
  const remStudent   = (i) => setForm(f=>({...f,students:(f.students||students).filter((_,idx)=>idx!==i)}));
  const addConsultant= () => setForm(f=>({...f,consultants:[...(f.consultants||consultants),{name:"",color:"#6366f1"}]}));
  const updConsultant= (i,k,v) => setForm(f=>{ const a=[...(f.consultants||consultants)]; a[i]={...a[i],[k]:v}; return {...f,consultants:a}; });
  const remConsultant= (i) => setForm(f=>({...f,consultants:(f.consultants||consultants).filter((_,idx)=>idx!==i)}));

  const specialBeds  = form.specialBeds  || [];
  const addSpecialBed= () => setForm(f=>({...f,specialBeds:[...(f.specialBeds||[]),{id:"",section:""}]}));
  const updSpecialBed= (i,k,v) => setForm(f=>{ const a=[...(f.specialBeds||[])]; a[i]={...a[i],[k]:v}; return {...f,specialBeds:a}; });
  const remSpecialBed= (i) => setForm(f=>({...f,specialBeds:(f.specialBeds||[]).filter((_,idx)=>idx!==i)}));

  return (
    <div>
      {/* Ward Sections */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Ward Sections</label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 8px"}}>Enter a bed range e.g. <strong>1-20</strong> or <strong>21-36</strong></p>
        {wardSections.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input value={s.name} onChange={e=>updSection(i,"name",e.target.value)} placeholder="e.g. Elective" style={{...iS,flex:1,padding:"9px 12px"}}/>
            <input value={s.range||""} onChange={e=>updSection(i,"range",e.target.value)} placeholder="1-20" style={{...iS,width:76,padding:"9px 8px",textAlign:"center"}}/>
            {wardSections.length>1 && <button onClick={()=>remSection(i)} style={rB}><Icon name="close" size={11} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={addSection} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Section</button>
      </div>

      {/* Special Beds */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Special Beds</label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 8px"}}>Add beds with custom IDs e.g. <strong>28A</strong>, <strong>28B</strong>, <strong>ICU-1</strong></p>
        {specialBeds.map((b,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input value={b.id} onChange={e=>updSpecialBed(i,"id",e.target.value)} placeholder="Bed ID (e.g. 28A)" style={{...iS,flex:1,padding:"9px 12px"}}/>
            <input value={b.section||""} onChange={e=>updSpecialBed(i,"section",e.target.value)} placeholder="Section" style={{...iS,width:90,padding:"9px 8px",textAlign:"center"}}/>
            <button onClick={()=>remSpecialBed(i)} style={rB}><Icon name="close" size={11} color={C.textMuted}/></button>
          </div>
        ))}
        <button onClick={addSpecialBed} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Special Bed</button>
      </div>

      {/* Custom Tags */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Custom Tags</label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 8px"}}>Add your own tags e.g. Pre-op, Post-op, Dialysis, Isolation.</p>
        {(form.customTags||[]).map((tag,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input type="color" value={tag.color||"#6366f1"} onChange={e=>setForm(f=>{const a=[...(f.customTags||[])];a[i]={...a[i],color:e.target.value};return{...f,customTags:a};})} style={{width:38,height:38,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",padding:2,background:"none",flexShrink:0}}/>
            <input value={tag.label} onChange={e=>setForm(f=>{const a=[...(f.customTags||[])];a[i]={...a[i],label:e.target.value};return{...f,customTags:a};})} placeholder="Tag name" style={{...iS,flex:1}}/>
            <button onClick={()=>setForm(f=>({...f,customTags:(f.customTags||[]).filter((_,idx)=>idx!==i)}))} style={rB}><Icon name="close" size={11} color={C.textMuted}/></button>
          </div>
        ))}
        <button onClick={()=>setForm(f=>({...f,customTags:[...(f.customTags||[]),{label:"",color:"#6366f1"}]}))} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Tag</button>
      </div>

      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Shadow HO Posts</label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 8px"}}>3-day rotating posts. Leaders can update names anytime.</p>
        {shadowHOs.map((ho,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
            <span style={{fontSize:"0.78rem",color:C.textSub,width:96,flexShrink:0,fontWeight:500}}>{ho.post}</span>
            <input value={ho.name} onChange={e=>updShadowHO(i,e.target.value)} placeholder="Assigned student" style={{...iS,flex:1,padding:"8px 12px"}}/>
            {shadowHOs.length>1 && <button onClick={()=>remShadowHO(i)} style={rB}><Icon name="close" size={11} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={addShadowHO} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Shadow HO Post</button>
      </div>

      {/* Students */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Students</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 56px",gap:4,marginTop:8,marginBottom:4,paddingLeft:2}}>
          <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em"}}>NAME</span>
          <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em",textAlign:"center"}}>GRP NO.</span>
        </div>
        {students.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:6}}>
            <input value={s.name} onChange={e=>updStudent(i,"name",e.target.value)} placeholder={`Student ${i+1}`} style={{...iS,flex:1,padding:"9px 12px"}}/>
            <input value={s.group} onChange={e=>updStudent(i,"group",e.target.value)} placeholder="1" style={{...iS,width:48,padding:"9px 8px",textAlign:"center",flexShrink:0}}/>
            {students.length>1 && <button onClick={()=>remStudent(i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={addStudent} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Student</button>
      </div>

      {/* Consultants */}
      <div style={{marginBottom:32}}>
        <label style={labelStyle}>Consultants</label>
        {consultants.map((c,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input type="color" value={c.color||"#6366f1"} onChange={e=>updConsultant(i,"color",e.target.value)} style={{width:38,height:38,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",padding:2,background:"none",flexShrink:0}}/>
            <input value={c.name} onChange={e=>updConsultant(i,"name",e.target.value)} placeholder="Name or title" style={{...iS,flex:1}}/>
            {consultants.length>1 && <button onClick={()=>remConsultant(i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={addConsultant} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Consultant</button>
      </div>
    </div>
  );
}

function SurgerySetupFields({ form, setForm }) {
  const wardSections = form.wardSections || [{name:"Acute",range:""},{name:"Chronic",range:""},{name:"Pre-Op",range:""},{name:"HDU",range:""}];
  const shadowHOs    = form.shadowHOs    || [{post:"Shadow HO 1",name:""},{post:"Shadow HO 2",name:""},{post:"Shadow HO 3",name:""}];
  const students     = form.students     || [{name:"",group:""}];
  const consultants  = form.consultants  || [{name:"",color:"#6366f1"}];

  const addSection   = () => setForm(f=>({...f,wardSections:[...(f.wardSections||wardSections),{name:"",range:""}]}));
  const updSection   = (i,k,v) => setForm(f=>{ const s=[...(f.wardSections||wardSections)]; s[i]={...s[i],[k]:v}; return {...f,wardSections:s}; });
  const remSection   = (i) => setForm(f=>({...f,wardSections:(f.wardSections||wardSections).filter((_,idx)=>idx!==i)}));
  const updShadowHO  = (i,v) => setForm(f=>{ const s=[...(f.shadowHOs||shadowHOs)]; s[i]={...s[i],name:v}; return {...f,shadowHOs:s}; });
  const addShadowHO  = () => { const n=(form.shadowHOs||shadowHOs).length+1; setForm(f=>({...f,shadowHOs:[...(f.shadowHOs||shadowHOs),{post:`Shadow HO ${n}`,name:""}]})); };
  const remShadowHO  = (i) => setForm(f=>({...f,shadowHOs:(f.shadowHOs||shadowHOs).filter((_,idx)=>idx!==i)}));
  const addStudent   = () => setForm(f=>({...f,students:[...(f.students||students),{name:"",group:""}]}));
  const updStudent   = (i,k,v) => setForm(f=>{ const a=[...(f.students||students)]; a[i]={...a[i],[k]:v}; return {...f,students:a}; });
  const remStudent   = (i) => setForm(f=>({...f,students:(f.students||students).filter((_,idx)=>idx!==i)}));
  const addConsultant= () => setForm(f=>({...f,consultants:[...(f.consultants||consultants),{name:"",color:"#6366f1"}]}));
  const updConsultant= (i,k,v) => setForm(f=>{ const a=[...(f.consultants||consultants)]; a[i]={...a[i],[k]:v}; return {...f,consultants:a}; });
  const remConsultant= (i) => setForm(f=>({...f,consultants:(f.consultants||consultants).filter((_,idx)=>idx!==i)}));

  const specialBeds  = form.specialBeds  || [];
  const addSpecialBed= () => setForm(f=>({...f,specialBeds:[...(f.specialBeds||[]),{id:"",section:""}]}));
  const updSpecialBed= (i,k,v) => setForm(f=>{ const a=[...(f.specialBeds||[])]; a[i]={...a[i],[k]:v}; return {...f,specialBeds:a}; });
  const remSpecialBed= (i) => setForm(f=>({...f,specialBeds:(f.specialBeds||[]).filter((_,idx)=>idx!==i)}));

  return (
    <div>
      {/* Ward Sections */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Ward Sections</label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 8px"}}>Enter a bed range e.g. <strong>1-20</strong> or <strong>21-36</strong></p>
        {wardSections.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input value={s.name} onChange={e=>updSection(i,"name",e.target.value)} placeholder="e.g. Elective" style={{...iS,flex:1,padding:"9px 12px"}}/>
            <input value={s.range||""} onChange={e=>updSection(i,"range",e.target.value)} placeholder="1-20" style={{...iS,width:76,padding:"9px 8px",textAlign:"center"}}/>
            {wardSections.length>1 && <button onClick={()=>remSection(i)} style={rB}><Icon name="close" size={11} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={addSection} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Section</button>
      </div>

      {/* Special Beds */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Special Beds</label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 8px"}}>Add beds with custom IDs e.g. <strong>28A</strong>, <strong>28B</strong>, <strong>ICU-1</strong></p>
        {specialBeds.map((b,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input value={b.id} onChange={e=>updSpecialBed(i,"id",e.target.value)} placeholder="Bed ID (e.g. 28A)" style={{...iS,flex:1,padding:"9px 12px"}}/>
            <input value={b.section||""} onChange={e=>updSpecialBed(i,"section",e.target.value)} placeholder="Section" style={{...iS,width:90,padding:"9px 8px",textAlign:"center"}}/>
            <button onClick={()=>remSpecialBed(i)} style={rB}><Icon name="close" size={11} color={C.textMuted}/></button>
          </div>
        ))}
        <button onClick={addSpecialBed} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Special Bed</button>
      </div>

      {/* Custom Tags */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Custom Tags</label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 8px"}}>Add your own tags e.g. Pre-op, Post-op, Dialysis, Isolation.</p>
        {(form.customTags||[]).map((tag,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input type="color" value={tag.color||"#6366f1"} onChange={e=>setForm(f=>{const a=[...(f.customTags||[])];a[i]={...a[i],color:e.target.value};return{...f,customTags:a};})} style={{width:38,height:38,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",padding:2,background:"none",flexShrink:0}}/>
            <input value={tag.label} onChange={e=>setForm(f=>{const a=[...(f.customTags||[])];a[i]={...a[i],label:e.target.value};return{...f,customTags:a};})} placeholder="Tag name" style={{...iS,flex:1}}/>
            <button onClick={()=>setForm(f=>({...f,customTags:(f.customTags||[]).filter((_,idx)=>idx!==i)}))} style={rB}><Icon name="close" size={11} color={C.textMuted}/></button>
          </div>
        ))}
        <button onClick={()=>setForm(f=>({...f,customTags:[...(f.customTags||[]),{label:"",color:"#6366f1"}]}))} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Tag</button>
      </div>

      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Shadow HO Posts</label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 8px"}}>3-day rotating posts. Leaders can update names anytime.</p>
        {shadowHOs.map((ho,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
            <span style={{fontSize:"0.78rem",color:C.textSub,width:96,flexShrink:0,fontWeight:500}}>{ho.post}</span>
            <input value={ho.name} onChange={e=>updShadowHO(i,e.target.value)} placeholder="Assigned student" style={{...iS,flex:1,padding:"8px 12px"}}/>
            {shadowHOs.length>1 && <button onClick={()=>remShadowHO(i)} style={rB}><Icon name="close" size={11} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={addShadowHO} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Shadow HO Post</button>
      </div>

      {/* Students */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Students</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 56px",gap:4,marginTop:8,marginBottom:4,paddingLeft:2}}>
          <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em"}}>NAME</span>
          <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em",textAlign:"center"}}>GRP NO.</span>
        </div>
        {students.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:6}}>
            <input value={s.name} onChange={e=>updStudent(i,"name",e.target.value)} placeholder={`Student ${i+1}`} style={{...iS,flex:1,padding:"9px 12px"}}/>
            <input value={s.group} onChange={e=>updStudent(i,"group",e.target.value)} placeholder="1" style={{...iS,width:48,padding:"9px 8px",textAlign:"center",flexShrink:0}}/>
            {students.length>1 && <button onClick={()=>remStudent(i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={addStudent} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Student</button>
      </div>

      {/* Consultants */}
      <div style={{marginBottom:32}}>
        <label style={labelStyle}>Consultants</label>
        {consultants.map((c,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input type="color" value={c.color||"#6366f1"} onChange={e=>updConsultant(i,"color",e.target.value)} style={{width:38,height:38,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",padding:2,background:"none",flexShrink:0}}/>
            <input value={c.name} onChange={e=>updConsultant(i,"name",e.target.value)} placeholder="Name or title" style={{...iS,flex:1}}/>
            {consultants.length>1 && <button onClick={()=>remConsultant(i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={addConsultant} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Consultant</button>
      </div>
    </div>
  );
}

function PaedSetupFields({ form, setForm }) {
  const paedGroups   = form.paedGroups   || [{name:"Group A",students:[{name:"",no:""}]},{name:"Group B",students:[{name:"",no:""}]}];
  const wardSections = form.wardSections || [{name:"General",count:""},{name:"HDU",count:""},{name:"NICU",count:""},{name:"NBU",count:""}];
  const shadowHOs    = form.shadowHOs    || [{post:"Shadow HO 1",name:""},{post:"Shadow HO 2",name:""},{post:"Shadow HO 3",name:""}];
  const consultants  = form.consultants  || [{name:"",color:"#6366f1"}];

  const updGroup    = (gi,k,v) => setForm(f=>{ const g=[...(f.paedGroups||paedGroups)]; g[gi]={...g[gi],[k]:v}; return {...f,paedGroups:g}; });
  const addStudent  = (gi) => setForm(f=>{ const g=[...(f.paedGroups||paedGroups)]; g[gi]={...g[gi],students:[...(g[gi].students||[]),{name:"",no:""}]}; return {...f,paedGroups:g}; });
  const updStudent  = (gi,si,k,v) => setForm(f=>{ const g=[...(f.paedGroups||paedGroups)]; const s=[...(g[gi].students||[])]; s[si]={...s[si],[k]:v}; g[gi]={...g[gi],students:s}; return {...f,paedGroups:g}; });
  const remStudent  = (gi,si) => setForm(f=>{ const g=[...(f.paedGroups||paedGroups)]; g[gi]={...g[gi],students:(g[gi].students||[]).filter((_,i)=>i!==si)}; return {...f,paedGroups:g}; });

  const addSection  = () => setForm(f=>({...f,wardSections:[...(f.wardSections||wardSections),{name:"",count:""}]}));
  const updSection  = (i,k,v) => setForm(f=>{ const s=[...(f.wardSections||wardSections)]; s[i]={...s[i],[k]:v}; return {...f,wardSections:s}; });
  const remSection  = (i) => setForm(f=>({...f,wardSections:(f.wardSections||wardSections).filter((_,idx)=>idx!==i)}));

  const updShadowHO   = (i,v) => setForm(f=>{ const s=[...(f.shadowHOs||shadowHOs)]; s[i]={...s[i],name:v}; return {...f,shadowHOs:s}; });
  const addShadowHO   = () => { const n=(form.shadowHOs||shadowHOs).length+1; setForm(f=>({...f,shadowHOs:[...(f.shadowHOs||shadowHOs),{post:`Shadow HO ${n}`,name:""}]})); };
  const remShadowHO   = (i) => setForm(f=>({...f,shadowHOs:(f.shadowHOs||shadowHOs).filter((_,idx)=>idx!==i)}));
  const updConsultant = (i,k,v) => setForm(f=>{ const a=[...(f.consultants||consultants)]; a[i]={...a[i],[k]:v}; return {...f,consultants:a}; });

  return (
    <div>
      {/* Groups */}
      {paedGroups.map((grp,gi)=>(
        <div key={gi} style={{marginBottom:22,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 14px 10px"}}>
          <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:gi===0?"#6366f1":"#f97316",flexShrink:0}}/>
            <input value={grp.name} onChange={e=>updGroup(gi,"name",e.target.value)} placeholder={`Group ${gi+1} name`}
              style={{...iS,flex:1,padding:"7px 10px",fontSize:"0.85rem",fontWeight:600,background:"transparent",border:"none",boxShadow:"none"}}/>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 52px",gap:4,marginBottom:4,paddingLeft:2}}>
            <span style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.05em"}}>NAME</span>
            <span style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.05em",textAlign:"center"}}>NO.</span>
          </div>
          {grp.students.map((s,si)=>(
            <div key={si} style={{display:"flex",gap:6,marginTop:6}}>
              <input value={s.name} onChange={e=>updStudent(gi,si,"name",e.target.value)} placeholder={`Student ${si+1}`} style={{...iS,flex:1,padding:"8px 10px"}}/>
              <input value={s.no} onChange={e=>updStudent(gi,si,"no",e.target.value)} placeholder="1" style={{...iS,width:48,padding:"8px 6px",textAlign:"center"}}/>
              {grp.students.length>1 && <button onClick={()=>remStudent(gi,si)} style={rB}><Icon name="close" size={11} color={C.textMuted}/></button>}
            </div>
          ))}
          <button onClick={()=>addStudent(gi)} style={{...aMB,marginTop:8,fontSize:"0.75rem"}}><Icon name="plus" size={11} color={C.textSub}/> Add Student</button>
        </div>
      ))}

      {/* Ward Sections */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Ward Sections</label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 8px"}}>Enter a bed number range e.g. <strong>1-36</strong> or <strong>19-28</strong></p>
        {wardSections.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input value={s.name} onChange={e=>updSection(i,"name",e.target.value)} placeholder="Section (e.g. HDU)" style={{...iS,flex:1,padding:"9px 12px"}}/>
            <input value={s.range||s.count||""} onChange={e=>updSection(i,"range",e.target.value)} placeholder="1-36" style={{...iS,width:76,padding:"9px 8px",textAlign:"center"}}/>
            {wardSections.length>1 && <button onClick={()=>remSection(i)} style={rB}><Icon name="close" size={11} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={addSection} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Section</button>
      </div>

      {/* Shadow HOs */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Shadow HO Posts</label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 10px"}}>Assign names to 3-day rotating posts. Leaders can update these anytime.</p>
        {shadowHOs.map((ho,i)=>(
          <div key={i} style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
            <span style={{fontSize:"0.78rem",color:C.textSub,width:96,flexShrink:0,fontWeight:500}}>{ho.post}</span>
            <input value={ho.name} onChange={e=>updShadowHO(i,e.target.value)} placeholder="Assigned student" style={{...iS,flex:1,padding:"8px 12px"}}/>
            {shadowHOs.length>1 && <button onClick={()=>remShadowHO(i)} style={rB}><Icon name="close" size={11} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={addShadowHO} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Shadow HO Post</button>
      </div>

      {/* Consultants */}
      <div style={{marginBottom:32}}>
        <label style={labelStyle}>Consultants</label>
        {consultants.map((c,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input type="color" value={c.color||"#6366f1"} onChange={e=>updConsultant(i,"color",e.target.value)} style={{width:38,height:38,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",padding:2,background:"none",flexShrink:0}}/>
            <input value={c.name} onChange={e=>updConsultant(i,"name",e.target.value)} placeholder="Name or title" style={{...iS,flex:1}}/>
            {consultants.length>1 && <button onClick={()=>setForm(f=>({...f,consultants:(f.consultants||consultants).filter((_,idx)=>idx!==i)}))} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={()=>setForm(f=>({...f,consultants:[...(f.consultants||consultants),{name:"",color:"#6366f1"}]}))} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Consultant</button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WARD VIEW  (full ward, scoped to one group)
// ══════════════════════════════════════════════════════════════════════════════
function WardView({ wardId, ward: initialWard, onBack, onSave, onDelete, showToast, localTs, seniorMode=false }) {
  const [ward, setWard] = useState(initialWard || { setup:null, beds:{}, patients:[] });

  // Poll this ward for updates
  const pollActive = useRef(true);
  useEffect(() => {
    pollActive.current = true;
    const poll = async () => {
      if (!pollActive.current) return;
      try {
        const row = await db.get(`ward:${wardId}`);
        if (row) {
          const ts = row.updated_at;
          if (!localTs.current[wardId] || new Date(ts) > new Date(localTs.current[wardId])) {
            const parsed = JSON.parse(row.value);
            localTs.current[wardId] = ts;
            setWard(parsed);
          }
        }
      } catch {}
      if (pollActive.current) setTimeout(poll, 5000);
    };
    setTimeout(poll, 5000);
    return () => { pollActive.current = false; };
  }, [wardId]);

  useEffect(() => { if (initialWard) setWard(initialWard); }, [initialWard]);

  const saveWard = useCallback(async (newWard) => {
    const ts = await db.upsert(`ward:${wardId}`, newWard);
    localTs.current[wardId] = ts;
    setWard(newWard);
    return ts;
  }, [wardId, onSave]);

  const setup = ward.setup || {};
  const template = setup.template || "default"; // existing wards default to "default"

  if (template === "paed") {
    return <PaedWardView wardId={wardId} ward={ward} onBack={onBack} saveWard={saveWard} onDelete={onDelete} showToast={showToast} seniorMode={seniorMode}/>;
  }

  if (template === "psych") {
    return <PsychWardView wardId={wardId} ward={ward} onBack={onBack} saveWard={saveWard} onDelete={onDelete} showToast={showToast} seniorMode={seniorMode}/>;
  }

  if (template === "medicine") {
    return <MedicineWardView wardId={wardId} ward={ward} onBack={onBack} saveWard={saveWard} onDelete={onDelete} showToast={showToast} seniorMode={seniorMode}/>;
  }

  if (template === "surgery") {
    return <SurgeryWardView wardId={wardId} ward={ward} onBack={onBack} saveWard={saveWard} onDelete={onDelete} showToast={showToast} seniorMode={seniorMode}/>;
  }

  // Default template continues below
  return <DefaultWardView wardId={wardId} ward={ward} onBack={onBack} saveWard={saveWard} onDelete={onDelete} showToast={showToast} seniorMode={seniorMode}/>;
}

// ── Default Ward View ──────────────────────────────────────────────────────────
// Read-only quick-view panel — shown when tapping a bed tile
function BedViewPanel({ bedNum, bed, sec, setup, theme, rgb, seniorMode, onClose, onEdit }) {
  const cObj  = (setup.consultants||[]).find(c=>(typeof c==="object"?c.name:c)===bed.consultant);
  const cRgb  = cObj?.color ? hexToRgb(cObj.color) : null;
  const hasAssigned = bed.assigned?.length > 0;
  const hasShadow   = bed.shadows?.length  > 0;
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.22)",zIndex:150,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}}
      onClick={e=>{if(e.target===e.currentTarget)onClose();}}>
      <div style={{width:"100%",maxHeight:"82vh",display:"flex",flexDirection:"column",background:C.surface,borderRadius:"22px 22px 0 0",boxShadow:"0 -4px 40px rgba(0,0,0,0.12)"}}>

        {/* Fixed header */}
        <div style={{flexShrink:0,padding:"10px 20px 0"}}>
          <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"0 auto 16px"}}/>

          {/* Title row */}
          <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <div>
                <div style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600}}>{bed.isFloor?"Floor Patient":sec||"Bed"}</div>
                <div style={{fontSize:"2rem",fontWeight:700,color:cRgb?`rgb(${cRgb})`:theme,lineHeight:1,letterSpacing:"-0.04em"}}>{splitBedKey(String(bedNum)).num}</div>
                {(bed.patientName||bed.bht)&&<div style={{marginTop:4}}>
                  {bed.patientName&&<div style={{fontSize:"0.88rem",fontWeight:600,color:C.text,lineHeight:1.2}}>{bed.patientName}</div>}
                  {bed.bht&&<div style={{fontSize:"0.7rem",color:C.textMuted,marginTop:1}}>BHT {bed.bht}</div>}
                </div>}
              </div>
              <div style={{display:"flex",flexDirection:"column",gap:5,paddingTop:2}}>
                {bed.isNew&&<span style={{fontSize:"0.6rem",fontWeight:700,padding:"2px 7px",borderRadius:6,background:`rgba(${hexToRgb(C.red)},0.1)`,color:C.red,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,display:"flex",alignItems:"center",gap:4}}><Icon name="newdot" size={8} color={C.red}/>New</span>}
                {bed.historyTaken&&<span style={{fontSize:"0.6rem",fontWeight:700,padding:"2px 7px",borderRadius:6,background:`rgba(${hexToRgb(C.green)},0.1)`,color:C.green,border:`1px solid rgba(${hexToRgb(C.green)},0.25)`,display:"flex",alignItems:"center",gap:4}}><Icon name="history" size={8} color={C.green}/>History</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              {!seniorMode&&(
                <button onClick={onEdit} title="Edit" style={{background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:50,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                  <Icon name="edit" size={14} color={C.textSub}/>
                </button>
              )}
              <button onClick={onClose} style={{background:C.surfaceEl,border:"none",borderRadius:50,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}>
                <Icon name="close" size={13} color={C.textSub}/>
              </button>
            </div>
          </div>

          {/* Consultant + tag pills */}
          <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
            {bed.consultant&&(
              <span style={{display:"flex",alignItems:"center",gap:5,background:cRgb?`rgba(${cRgb},0.1)`:C.surfaceEl,border:`1px solid ${cRgb?`rgba(${cRgb},0.3)`:C.border}`,color:cRgb?`rgb(${cRgb})`:C.textSub,borderRadius:20,padding:"4px 10px",fontSize:"0.74rem",fontWeight:600}}>
                {cRgb&&<div style={{width:7,height:7,borderRadius:"50%",background:`rgb(${cRgb})`,flexShrink:0}}/>}
                {bed.consultant}
              </span>
            )}
            {(bed.tags||[]).map(t=>{const tag=(setup.customTags||[]).find(ct=>ct.label===t);return tag?<span key={t} style={{fontSize:"0.72rem",fontWeight:700,padding:"4px 10px",borderRadius:20,background:`rgba(${hexToRgb(tag.color)},0.12)`,color:tag.color,border:`1px solid rgba(${hexToRgb(tag.color)},0.3)`}}>{t}</span>:null;})}
          </div>

          {/* Diagnosis */}
          {bed.diagnosis&&<div style={{fontSize:"0.88rem",color:C.text,fontStyle:"italic",fontWeight:500,marginBottom:12,lineHeight:1.4}}>{bed.diagnosis}</div>}

          {/* Students */}
          {(hasAssigned||hasShadow)&&(
            <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:14}}>
              {(bed.assigned||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;const g=typeof s==="object"?s.group:"";return<span key={i} style={{display:"flex",alignItems:"center",gap:5,background:`rgba(${rgb},0.09)`,border:`1px solid rgba(${rgb},0.2)`,color:theme,borderRadius:8,padding:"5px 10px",fontSize:"0.78rem",fontWeight:500}}><Icon name="user" size={11} color={theme}/>{n}{g&&<sup style={{fontSize:"0.6em",marginLeft:1,opacity:0.6}}>{g}</sup>}</span>;})}
              {(bed.shadows||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;return<span key={i} style={{display:"flex",alignItems:"center",gap:5,background:C.surfaceEl,border:`1px dashed ${C.borderMid}`,color:C.textSub,borderRadius:8,padding:"5px 10px",fontSize:"0.78rem"}}><Icon name="shadow" size={11} color={C.textMuted}/>{n}<span style={{fontSize:"0.65rem",color:C.textMuted,marginLeft:2}}>(shadow)</span></span>;})}
            </div>
          )}

          {bed.notes&&<div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:600,marginBottom:6}}>Notes</div>}
        </div>

        {/* Scrollable notes */}
        {bed.notes ? (
          <div style={{flex:1,overflowY:"auto",padding:"0 20px 36px",WebkitOverflowScrolling:"touch"}}>
            <div style={{background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:14,padding:"14px 16px",fontSize:"0.88rem",color:C.text,lineHeight:1.7,whiteSpace:"pre-wrap",wordBreak:"break-word"}}>{bed.notes}</div>
          </div>
        ) : (
          <div style={{padding:"4px 20px 36px",color:C.textMuted,fontSize:"0.82rem",fontStyle:"italic"}}>No notes recorded.</div>
        )}

      </div>
    </div>
  );
}

function DefaultWardView({ wardId, ward, onBack, saveWard, onDelete, showToast, seniorMode }) {
  const [isLeader,   setIsLeader]   = useState(false);
  const [pinInput,   setPinInput]   = useState("");
  const [pinError,   setPinError]   = useState(false);
  const [showPin,    setShowPin]    = useState(false);
  const [view,       setView]       = useState("home");
  const [activeTab,  setActiveTab]  = useState("ward");
  const [archiveWeek,setArchiveWeek]= useState("");
  const [showChangeBed, setShowChangeBed] = useState(false);
  const [selectedBed,setSelectedBed]= useState(null);
  const [bedEdit,    setBedEdit]    = useState({ consultant:"", diagnosis:"", notes:"", historyTaken:false, opStatus:"", tags:[] });
  const [assignModal,setAssignModal]= useState(null);
  const [editMode,   setEditMode]   = useState(false);
  const [showReset,  setShowReset]  = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showDeleteBedConfirm, setShowDeleteBedConfirm] = useState(false);
  const [setupForm,  setSetupForm]  = useState({ wardName:"", appointmentType:"", bedCount:"", themeColor:"#007aff", students:[{name:"",group:""}], consultants:[{name:"",color:"#6366f1"}], wardSections:[], specialBeds:[], customTags:[{label:"Pre-op",color:"#f97316"},{label:"Post-op",color:"#0ea5e9"}] });
  const [shadowEditing, setShadowEditing] = useState(false);
  const [shadowForm, setShadowForm] = useState(null);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [viewBed, setViewBed] = useState(null); // bed key for read-only quick-view panel
  // ── Add Patient (unassigned pool) ────────────────────────────────────────
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [addPtForm, setAddPtForm] = useState({ name:"", bht:"", isFloor:false, bedNum:"", section:"", assigned:[], shadows:[] });
  const [addPtError, setAddPtError] = useState("");
  // ── Assign unassigned patient to bed ─────────────────────────────────────
  const [assigningPatient, setAssigningPatient] = useState(null); // patient obj being assigned

  const setup  = ward.setup || {};
  const sections   = setup.wardSections || [];
  const beds   = migrateDefaultBeds(ward.beds, sections);
  const theme  = setup.themeColor || "#007aff";
  const rgb    = hexToRgb(theme);
  const shadowHOs  = setup.shadowHOs   || [];
  // Unassigned patient pool (BHT/name entries that haven't been assigned to a bed yet)
  const unassignedPatients = ward.unassignedPatients || [];

  const save = useCallback(async (newWard) => {
    await saveWard(newWard);
  }, [saveWard]);

  // ── Setup (first time) ────────────────────────────────────────────────────
  const handleSetupSubmit = async () => {
    if (!setupForm.wardName||!setupForm.appointmentType||!setupForm.bedCount) { showToast("Fill all fields","error"); return; }
    const count = parseInt(setupForm.bedCount);
    if (isNaN(count)||count<1||count>200) { showToast("Beds 1–200","error"); return; }
    const students    = setupForm.students.filter(s=>s.name.trim()).map(s=>({name:s.name.trim(),group:s.group.trim()}));
    const consultants = setupForm.consultants.filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"}));
    const shadowHOsSave = (setupForm.shadowHOs||[]);
    const rotationDays = setupForm.rotationDays||7;
    const wardSections = (setupForm.wardSections||[]).filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),range:s.range?.trim()||""}));
    const specialBeds  = (setupForm.specialBeds||[]).filter(b=>b.id?.trim()).map(b=>({id:b.id.trim(),section:b.section?.trim()||""}));
    const customTags   = (setupForm.customTags||[]).filter(t=>t.label?.trim()).map(t=>({label:t.label.trim(),color:t.color||"#6366f1"}));
    // Use the max of bedCount and the highest range end across all sections
    const sectionMax = wardSections.reduce((max,s)=>{
      if (s.range?.includes("-")) { const end=parseInt(s.range.split("-")[1])||0; return Math.max(max,end); }
      return max;
    }, 0);
    const effectiveCount = Math.max(count, sectionMax);
    const bedObj = {};
    const mkBed = (extra={}) => ({ assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, opStatus:"", ...extra });
    // Plain numbered beds (no section claims them)
    for (let i=1;i<=effectiveCount;i++) {
      if (sectionsContaining(wardSections, i).length===0) bedObj[i]=mkBed();
    }
    // Section-qualified beds — one entry per section per bed number in its range,
    // so overlapping ranges (e.g. HDU 1-2 and Prenatal 1-14) don't collide.
    wardSections.forEach(sec=>{
      if (sec.range?.includes("-")) {
        const [start,end] = sec.range.split("-").map(s=>parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let n=start;n<=end;n++) bedObj[qualifyBedKey(sec.name,n)] = mkBed();
        }
      }
    });
    // Add special beds
    specialBeds.forEach(sb=>{ bedObj[sb.id]=mkBed({specialBedSection:sb.section}); });
    await save({ setup:{ wardName:setupForm.wardName, appointmentType:setupForm.appointmentType, bedCount:effectiveCount, themeColor:setupForm.themeColor, students, consultants, shadowHOs:shadowHOsSave, rotationDays, wardSections, specialBeds, customTags }, beds:bedObj });
    showToast("Ward configured!");
  };

  const handleSaveEdit = async () => {
    const students    = setupForm.students.filter(s=>s.name.trim()).map(s=>({name:s.name.trim(),group:s.group.trim()}));
    const consultants = setupForm.consultants.filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"}));
    const shadowHOsSave = (setupForm.shadowHOs||[]);
    const rotationDays = setupForm.rotationDays||7;
    const wardSections = (setupForm.wardSections||[]).filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),range:s.range?.trim()||""}));
    const specialBeds  = (setupForm.specialBeds||[]).filter(b=>b.id?.trim()).map(b=>({id:b.id.trim(),section:b.section?.trim()||""}));
    const customTags   = (setupForm.customTags||[]).filter(t=>t.label?.trim()).map(t=>({label:t.label.trim(),color:t.color||"#6366f1"}));
    const mkBed = (extra={}) => ({ assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, opStatus:"", ...extra });
    // `beds` is already migrated to qualified keys at load time; just ensure every
    // bed implied by the (possibly newly-edited) section ranges exists.
    const existingBeds = { ...beds };
    wardSections.forEach(sec=>{
      if (sec.range?.includes("-")) {
        const [start,end] = sec.range.split("-").map(s=>parseInt(s.trim()));
        if (!isNaN(start) && !isNaN(end)) {
          for (let n=start;n<=end;n++) {
            const key = qualifyBedKey(sec.name,n);
            if (!existingBeds[key]) existingBeds[key]=mkBed();
          }
        }
      }
    });
    specialBeds.forEach(sb=>{ if (!existingBeds[sb.id]) existingBeds[sb.id]=mkBed({specialBedSection:sb.section}); });
    const { beds: prunedBeds, protectedKeys } = pruneStaleBeds(existingBeds, wardSections, specialBeds);
    await save({ ...ward, beds:prunedBeds, setup:{ ...setup, wardName:setupForm.wardName, appointmentType:setupForm.appointmentType, themeColor:setupForm.themeColor, template:setupForm.template||setup.template||"default", students, consultants, shadowHOs:shadowHOsSave, rotationDays, wardSections, specialBeds, customTags } });
    setEditMode(false);
    if (protectedKeys.length>0) {
      showToast(`Settings saved. ${protectedKeys.length} bed${protectedKeys.length>1?"s":""} kept (still occupied) despite no longer matching a section — clear or move ${protectedKeys.length>1?"them":"it"} first to remove.`);
    } else {
      showToast("Settings saved!");
    }
  };

  // ── PIN ────────────────────────────────────────────────────────────────────
  const tryPin = () => {
    if (isLeaderPin(pinInput, wardId)) { setIsLeader(true); setShowPin(false); setPinInput(""); showToast("Leader access granted"); }
    else { setPinError(true); setTimeout(()=>setPinError(false),1500); }
  };

  // ── Bed ops ────────────────────────────────────────────────────────────────
  const updateBed = useCallback(async (bedNum, updates) => {
    const newWard = { ...ward, beds:{ ...beds, [bedNum]:{ ...beds[bedNum], ...updates } } };
    await save(newWard);
  }, [ward, beds, save]);

  const toggleFlag   = (bedNum, flag) => updateBed(bedNum, { [flag]:!beds[bedNum][flag] });
  const saveBedEdit  = async (bedNum) => { await updateBed(bedNum, { ...bedEdit, patientName:bedEdit.patientName||"", bht:bedEdit.bht||"" }); };
  const toggleHistory= async (bedNum) => {
    const nh = !beds[bedNum].historyTaken;
    const updates = { historyTaken:nh }; if (nh) updates.isNew=false;
    await updateBed(bedNum, updates);
    setBedEdit(b=>({...b, historyTaken:nh}));
  };
  const clearBed = async (bedNum) => {
    await updateBed(bedNum, { assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, opStatus:"", tags:[], patientName:"", bht:"" });
    setBedEdit({ consultant:"", diagnosis:"", notes:"", historyTaken:false, opStatus:"", tags:[] });
    setShowClearConfirm(false); showToast("Bed cleared");
  };

  // ── Archive ────────────────────────────────────────────────────────────────
  const getWeekKey = (date=new Date()) => {
    const y = date.getFullYear();
    const start = new Date(y, 0, 1);
    const week = Math.ceil(((date - start) / 86400000 + start.getDay() + 1) / 7);
    return `${y}-W${String(week).padStart(2,"0")}`;
  };

  const archiveBed = async (bedNum) => {
    const bed = beds[bedNum];
    const weekKey = getWeekKey();
    const archive = ward.archive || {};
    const weekArchive = archive[weekKey] || {};
    weekArchive[bedNum] = { ...bed, archivedAt: new Date().toISOString() };
    const cleared = { assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, opStatus:"" };
    await save({ ...ward, beds:{ ...beds, [bedNum]:cleared }, archive:{ ...archive, [weekKey]:weekArchive } });
    setView("home"); setSelectedBed(null); showToast("Bed archived");
  };

  const restoreBed = async (weekKey, archivedBedNum, targetBedNum) => {
    const toBed = targetBedNum || archivedBedNum;
    const archivedBed = (ward.archive||{})[weekKey]?.[archivedBedNum];
    if (!archivedBed) return;
    const { archivedAt, ...restoredData } = archivedBed;
    const archive = { ...(ward.archive||{}) };
    const weekArchive = { ...archive[weekKey] };
    delete weekArchive[archivedBedNum];
    if (Object.keys(weekArchive).length===0) delete archive[weekKey];
    else archive[weekKey] = weekArchive;
    await save({ ...ward, beds:{ ...beds, [toBed]:restoredData }, archive });
    showToast(`Bed restored to ${toBed}`);
  };

  const deleteArchivedBed = async (weekKey, bedNum) => {
    const archive = { ...(ward.archive||{}) };
    const weekArchive = { ...archive[weekKey] };
    delete weekArchive[bedNum];
    if (Object.keys(weekArchive).length===0) delete archive[weekKey];
    else archive[weekKey] = weekArchive;
    await save({ ...ward, archive });
    showToast("Archived record deleted");
  };

  const changeBedNumber = async (fromBed, toBed) => {
    const bedData = { ...beds[fromBed] };
    const cleared  = { assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, opStatus:"" };
    await save({ ...ward, beds:{ ...beds, [fromBed]:cleared, [toBed]:bedData } });
    setShowChangeBed(false); setView("home"); setSelectedBed(null); showToast(`Moved to Bed ${toBed}`);
  };
  const deleteBed = async (bedNum) => {
    const rest = { ...beds };
    delete rest[bedNum];
    await save({ ...ward, beds: rest });
    setShowDeleteBedConfirm(false); setView("home"); setSelectedBed(null); showToast("Bed deleted");
  };
  const assignStudents = async (bedNum, assigned, shadows) => {
    const wasEmpty = !(beds[bedNum]?.assigned?.length>0 || beds[bedNum]?.shadows?.length>0);
    const hasStudents = assigned.length>0 || shadows.length>0;
    const updates = { assigned, shadows };
    if (wasEmpty && hasStudents) updates.isNew = true;
    await updateBed(bedNum, updates);
    setAssignModal(null); setView("home"); setSelectedBed(null); showToast("Students assigned");
  };
  const addFloorPatient = async () => {
    const floorKeys = Object.keys(beds).filter(k=>beds[k].isFloor);
    const key = `F${floorKeys.length+1}`;
    const newBeds = { ...beds, [key]:{ assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:true, isFloor:true, opStatus:"" } };
    await save({ ...ward, beds:newBeds }); showToast("Floor patient added");
  };
  const removeFloorPatient = async (bedNum) => {
    const newBeds = { ...beds }; delete newBeds[bedNum];
    await save({ ...ward, beds:newBeds });
    setView("home"); setSelectedBed(null); showToast("Floor patient removed");
  };

  // ── Unassigned patient pool ops ───────────────────────────────────────────
  const addUnassignedPatient = async () => {
    setAddPtError("");
    const name = addPtForm.name.trim();
    const bht  = addPtForm.bht.trim();
    if (!name && !bht) { setAddPtError("Enter at least a name or BHT number."); return; }

    const assigned = addPtForm.assigned || [];
    const shadows  = addPtForm.shadows  || [];

    // If a bed is selected, assign directly to that bed
    if (!addPtForm.isFloor && addPtForm.bedNum) {
      const key = addPtForm.section
        ? Object.keys(beds).find(k=>getBedSection(k)===addPtForm.section && splitBedKey(String(k)).num===String(addPtForm.bedNum))
        : String(addPtForm.bedNum);
      if (key && beds[key]) {
        const updates = { patientName:name, bht, isNew:true, assigned, shadows };
        await save({ ...ward, beds:{ ...beds, [key]:{ ...beds[key], ...updates } } });
        setAddPtForm({ name:"", bht:"", isFloor:false, bedNum:"", section:"", assigned:[], shadows:[] });
        setShowAddPatient(false);
        showToast(`${name||bht||"Patient"} assigned to Bed ${splitBedKey(String(key)).num}`);
        return;
      }
    }

    // If floor patient
    if (addPtForm.isFloor) {
      const floorKeys = Object.keys(beds).filter(k=>beds[k].isFloor);
      const key = `F${floorKeys.length+1}`;
      await save({ ...ward, beds:{ ...beds, [key]:{ assigned, shadows, patientName:name, bht, consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:true, isFloor:true, opStatus:"" } } });
      setAddPtForm({ name:"", bht:"", isFloor:false, bedNum:"", section:"", assigned:[], shadows:[] });
      setShowAddPatient(false);
      showToast(`${name||bht||"Patient"} added as floor patient`);
      return;
    }

    // Otherwise save as unassigned (with any pre-selected students)
    const newPt = { id:`upt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`, name, bht, assigned, shadows, addedAt:new Date().toISOString() };
    await save({ ...ward, unassignedPatients:[...unassignedPatients, newPt] });
    setAddPtForm({ name:"", bht:"", isFloor:false, bedNum:"", section:"", assigned:[], shadows:[] });
    setShowAddPatient(false);
    showToast("Patient added — unassigned");
  };

  const removeUnassignedPatient = async (ptId) => {
    await save({ ...ward, unassignedPatients:unassignedPatients.filter(p=>p.id!==ptId) });
  };

  const assignUnassignedToBed = async (patientId, bedNum) => {
    const pt = unassignedPatients.find(p=>p.id===patientId);
    if (!pt || !beds[bedNum]) return;
    const updates = {
      patientName: pt.name || "",
      bht: pt.bht || "",
      assigned: pt.assigned || [],
      shadows: pt.shadows || [],
      isNew: true,
    };
    await save({
      ...ward,
      beds: { ...beds, [bedNum]:{ ...beds[bedNum], ...updates } },
      unassignedPatients: unassignedPatients.filter(p=>p.id!==patientId),
    });
    setAssigningPatient(null);
    showToast(`${pt.name||pt.bht||"Patient"} assigned to Bed ${splitBedKey(String(bedNum)).num}`);
  };
  const resetWard = async () => {
    await save({ setup:null, beds:{} });
    setSetupForm({ wardName:"", appointmentType:"", bedCount:"", themeColor:"#007aff", students:[{name:"",group:""}], consultants:[{name:"",color:"#6366f1"}] });
    setShowReset(false); setIsLeader(false); showToast("Ward reset");
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const sectionOrderIndex = (secName) => { const i = sections.findIndex(s=>s.name===secName); return i===-1?999:i; };
  const bedKeys = Object.keys(beds).sort((a,b)=>{
    const A = splitBedKey(a), B = splitBedKey(b);
    const aFloor = beds[a]?.isFloor, bFloor = beds[b]?.isFloor;
    if (aFloor && !bFloor) return 1; if (!aFloor && bFloor) return -1;
    // Section-qualified beds sort by section order, then number
    if (A.section && B.section) {
      if (A.section !== B.section) return sectionOrderIndex(A.section)-sectionOrderIndex(B.section);
      const an=Number(A.num), bn=Number(B.num);
      if (!isNaN(an)&&!isNaN(bn)) return an-bn;
      return A.num.localeCompare(B.num);
    }
    if (A.section && !B.section) return -1;
    if (!A.section && B.section) return 1;
    const af=isNaN(a),bf=isNaN(b);
    if(af&&!bf)return 1; if(!af&&bf)return -1;
    if(!af&&!bf)return Number(a)-Number(b);
    return a.localeCompare(b);
  });

  // Section helpers — section is now encoded directly in the qualified bed key.
  const getBedSection = (bedNum) => {
    if (beds[bedNum]?.specialBedSection) return beds[bedNum].specialBedSection;
    const { section } = splitBedKey(String(bedNum));
    return section;
  };

  const filteredBedKeys = sectionFilter==="all" ? bedKeys : bedKeys.filter(k=>{
    if (beds[k]?.isFloor) return sectionFilter==="floor";
    const sec = getBedSection(k);
    return sec===sectionFilter || (!sec && sectionFilter==="other");
  });
  const stats = {
    newPt:        bedKeys.filter(k=>beds[k]?.isNew).length,
    historyTaken: bedKeys.filter(k=>beds[k]?.historyTaken).length,
    totalAssigned:bedKeys.filter(k=>beds[k]?.assigned?.length>0||beds[k]?.shadows?.length>0).length,
    floor:        bedKeys.filter(k=>beds[k]?.isFloor).length,
  };
  const selBed = selectedBed ? beds[selectedBed] : null;

  // ── Setup view ─────────────────────────────────────────────────────────────
  if (!setup.wardName) return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:SF,paddingBottom:60}}>
      <div style={{background:"rgba(245,245,247,0.88)",borderBottom:`1px solid ${C.border}`,padding:"12px 18px",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",alignItems:"center",gap:10}}>
          <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",color:C.textSub,padding:0}}><Icon name="back" size={18} color={C.textSub}/></button>
          <span style={{fontSize:"0.9rem",fontWeight:600,color:C.text}}>Ward Setup</span>
        </div>
      </div>
      {!isLeader ? (
        <div style={{maxWidth:400,margin:"80px auto 0",padding:"0 20px",textAlign:"center"}}>
          <div style={{marginBottom:20}}><Icon name="key" size={32} color={C.border}/></div>
          <h2 style={{color:C.text,fontWeight:600,marginBottom:8}}>Leader Access Required</h2>
          <p style={{color:C.textSub,fontSize:"0.86rem",marginBottom:20}}>Only the group leader can set up this ward.</p>
          <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryPin()} placeholder="Enter leader PIN"
            style={{...iS,width:"100%",boxSizing:"border-box",textAlign:"center",letterSpacing:"0.2em",borderColor:pinError?C.red:undefined}}/>
          {pinError && <div style={{color:C.red,fontSize:"0.78rem",marginTop:6}}>Incorrect PIN</div>}
          <button onClick={tryPin} style={{...accentBtn(theme,rgb),width:"100%",marginTop:12,padding:"13px",fontSize:"0.9rem"}}>Unlock</button>
          <button onClick={onBack} style={{width:"100%",marginTop:8,background:"none",border:"none",color:C.textMuted,fontSize:"0.84rem",cursor:"pointer",fontFamily:SF,padding:"8px"}}>← Back to all wards</button>
        </div>
      ) : (
        <div style={{maxWidth:520,margin:"0 auto",padding:"30px 20px"}}>
          <SetupForm form={setupForm} setForm={setSetupForm} onSubmit={handleSetupSubmit} submitLabel="Create Ward" theme={theme}/>
        </div>
      )}
      <BrandingBar theme={theme}/>
    </div>
  );

  // ── Edit settings overlay ──────────────────────────────────────────────────
  if (editMode) return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:SF,paddingBottom:60}}>
      <div style={{background:"rgba(245,245,247,0.88)",borderBottom:`1px solid ${C.border}`,padding:"12px 18px",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={()=>setEditMode(false)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",color:C.textSub,padding:0}}><Icon name="back" size={18} color={C.textSub}/></button>
            <span style={{fontSize:"0.9rem",fontWeight:600,color:C.text}}>Edit Settings</span>
          </div>
        </div>
      </div>
      <div style={{maxWidth:520,margin:"0 auto",padding:"24px 20px"}}>
        <div style={{marginBottom:18}}>
          <label style={labelStyle}>Ward Template</label>
          <select value={setupForm.template||"default"} onChange={e=>setSetupForm(f=>({...f,template:e.target.value}))}
            style={{...iS,width:"100%",marginTop:6,boxSizing:"border-box"}}>
            {Object.entries(WARD_TEMPLATES).map(([key,t])=>(
              <option key={key} value={key}>{t.label}</option>
            ))}
          </select>
          <div style={{fontSize:"0.7rem",color:C.textMuted,marginTop:4,paddingLeft:2}}>{WARD_TEMPLATES[setupForm.template||"default"]?.desc}</div>
        </div>
        <SetupForm form={setupForm} setForm={setSetupForm} onSubmit={handleSaveEdit} submitLabel="Save Changes" theme={theme} hideBedsField/>
        <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:12,display:"flex",flexDirection:"column",gap:8}}>
          <button onClick={()=>setShowReset(true)} style={{width:"100%",background:"none",border:`1px solid rgba(${hexToRgb(C.red)},0.3)`,color:C.red,borderRadius:12,padding:"12px",cursor:"pointer",fontSize:"0.85rem",fontFamily:SF}}>
            Reset Ward (New Rotation)
          </button>
          <button onClick={()=>setShowDelete(true)} style={{width:"100%",background:`rgba(${hexToRgb(C.red)},0.07)`,border:`1px solid ${C.red}`,color:C.red,borderRadius:12,padding:"12px",cursor:"pointer",fontSize:"0.85rem",fontFamily:SF,fontWeight:600}}>
            Delete Ward Permanently
          </button>
        </div>
      </div>
      <BrandingBar theme={theme}/>
    </div>
  );

  // ── Main ward view ─────────────────────────────────────────────────────────
  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:SF,"--accent":theme,"--accent-rgb":rgb}}>
      {/* Header */}
      <div style={{background:"rgba(245,245,247,0.88)",borderBottom:`1px solid ${C.border}`,padding:"12px 18px",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",color:C.textSub,padding:0}}><Icon name="back" size={18} color={C.textSub}/></button>
            <div>
              <div style={{fontSize:"0.72rem",fontWeight:600,color:C.text,letterSpacing:"-0.01em"}}>{setup.wardName}</div>
              <div style={{fontSize:"1.2rem",color:C.textSub,marginTop:-4,fontWeight:400,letterSpacing:"-0.02em",lineHeight:1.15}}>{setup.appointmentType}</div>
              <div style={{fontSize:"0.6rem",color:C.textMuted,marginTop:2,fontWeight:500,letterSpacing:"0.04em",textTransform:"uppercase"}}>{WARD_TEMPLATES[setup.template||"default"]?.label||"Default"}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {!seniorMode && (isLeader
              ? <span style={{background:theme,color:"#fff",fontSize:"0.62rem",fontWeight:600,padding:"4px 10px",borderRadius:20,letterSpacing:"0.04em"}}>LEADER</span>
              : <button onClick={()=>setShowPin(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.surface,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:20,padding:"5px 12px",fontSize:"0.72rem",cursor:"pointer",fontFamily:SF,boxShadow:C.shadow}}>
                  <Icon name="key" size={12} color={C.textSub}/> Login
                </button>
            )}
            {seniorMode && <span style={{fontSize:"0.62rem",fontWeight:600,color:"#007aff",background:"rgba(0,122,255,0.08)",border:"1px solid rgba(0,122,255,0.2)",borderRadius:20,padding:"4px 10px"}}>READ ONLY</span>}
            {isLeader && !seniorMode && <button onClick={()=>{
              setEditMode(true);
              setSetupForm({
                wardName: setup.wardName||"",
                appointmentType: setup.appointmentType||"",
                bedCount: setup.bedCount||"",
                themeColor: setup.themeColor||"#007aff",
                students: setup.students?.length ? setup.students.map(s=>typeof s==="string"?{name:s,group:""}:s) : [{name:"",group:""}],
                consultants: setup.consultants?.length ? setup.consultants.map(c=>typeof c==="string"?{name:c,color:"#6366f1"}:c) : [{name:"",color:"#6366f1"}],
                shadowHOs: (setup.shadowHOs||[]).map(h=>({...h})),
                rotationDays: setup.rotationDays||7,
                wardSections: (setup.wardSections||[]).map(s=>({...s})),
                specialBeds: (setup.specialBeds||[]).map(b=>({...b})),
                customTags: (setup.customTags?.length ? setup.customTags : [{label:"Pre-op",color:"#f97316"},{label:"Post-op",color:"#0ea5e9"}]).map(t=>({...t})),
              });
            }} style={{display:"flex",alignItems:"center",justifyContent:"center",background:C.surface,border:`1px solid ${C.border}`,color:C.textMuted,borderRadius:50,width:32,height:32,cursor:"pointer",boxShadow:C.shadow}}>
              <Icon name="settings" size={14} color={C.textMuted}/>
            </button>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{borderBottom:`1px solid ${C.border}`,background:"rgba(245,245,247,0.88)",position:"sticky",top:"57px",zIndex:49,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",padding:"0 16px"}}>
          {[{id:"ward",label:"Ward"},...(!seniorMode?[{id:"students",label:"Students"}]:[]),{id:"archive",label:"Archive"}].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:"11px 16px",fontSize:"0.8rem",fontWeight:500,fontFamily:SF,background:"none",border:"none",cursor:"pointer",color:activeTab===t.id?theme:C.textMuted,borderBottom:activeTab===t.id?`2px solid ${theme}`:"2px solid transparent",marginBottom:"-1px",transition:"color 0.15s",letterSpacing:"-0.01em"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"20px 16px 100px"}}>
        {activeTab==="ward" && <>
          {/* Shadow HO Banner */}
          {shadowHOs.length>0 && (
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 16px",marginBottom:16,boxShadow:C.shadow}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:"0.65rem",fontWeight:600,color:C.textMuted,letterSpacing:"0.05em",textTransform:"uppercase"}}>Shadow HO Posts · {setup.rotationDays||7}-day rotation</span>
                {isLeader&&!seniorMode&&<button onClick={()=>{setShadowForm(shadowHOs.map(h=>({...h})));setShadowEditing(true);}} style={{background:"none",border:"none",color:theme,fontSize:"0.72rem",cursor:"pointer",fontFamily:SF,fontWeight:500}}>Edit</button>}
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {shadowHOs.map((ho,i)=>(
                  <div key={i} style={{flex:1,minWidth:100,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px"}}>
                    <div style={{fontSize:"0.6rem",color:C.textMuted,fontWeight:500,marginBottom:2}}>{ho.post}</div>
                    <div style={{fontSize:"0.82rem",fontWeight:600,color:ho.name?C.text:C.textMuted}}>{ho.name||"Unassigned"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:24}}>
            {[
              { label:"New",            icon:"newdot",  color:C.red,   value:String(stats.newPt) },
              { label:"Histories Taken",icon:"history", color:C.green, value:`${stats.historyTaken}/${stats.totalAssigned}` },
              { label:"Floor",          icon:"floor",   color:theme,   value:String(stats.floor) },
            ].map(s=>(
              <div key={s.label} style={{background:C.surface,border:"1px solid rgba(0,0,0,0.08)",borderRadius:14,padding:"12px 10px",textAlign:"center",boxShadow:"0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",justifyContent:"center",marginBottom:5}}><Icon name={s.icon} size={14} color={s.color}/></div>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:s.color,letterSpacing:"-0.04em"}}>{s.value}</div>
                <div style={{fontSize:"0.6rem",color:C.textSub,marginTop:2,letterSpacing:"0.04em",textTransform:"uppercase",fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>

          {isLeader && !seniorMode && (
            <button onClick={()=>{ setAddPtForm({name:"",bht:"",isFloor:false,bedNum:"",section:"",assigned:[],shadows:[]}); setAddPtError(""); setShowAddPatient(true); }}
              style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:"12px",fontSize:"0.85rem",marginBottom:20,background:C.surface,border:`1.5px dashed rgba(${rgb},0.4)`,color:theme,borderRadius:13,cursor:"pointer",fontFamily:SF,fontWeight:500,boxShadow:C.shadow}}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <rect x="2" y="3" width="9" height="11" rx="1.5" stroke={theme} strokeWidth="1.4"/>
                <path d="M5 6.5h5M5 9h3" stroke={theme} strokeWidth="1.3" strokeLinecap="round"/>
                <path d="M12 1v4M10 3h4" stroke={theme} strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Add New Patient
            </button>
          )}

          {/* Unassigned patients — same grid as bed tiles */}
          {unassignedPatients.length > 0 && (
            <div style={{marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                <span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={10} color={C.red}/></span>
                <span style={{fontSize:"0.62rem",fontWeight:700,color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase"}}>Unassigned</span>
                <span style={{background:`rgba(${rgb},0.12)`,color:theme,fontSize:"0.6rem",fontWeight:700,padding:"2px 7px",borderRadius:10}}>{unassignedPatients.length}</span>
                {!seniorMode && <span style={{fontSize:"0.65rem",color:C.textMuted,marginLeft:"auto"}}>Tap to assign bed</span>}
              </div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10,marginBottom:8}}>
                {unassignedPatients.map(pt=>(
                  <div key={pt.id}
                    onClick={!seniorMode ? ()=>setAssigningPatient(pt) : undefined}
                    style={{
                      background:C.surface,
                      border:`1.5px dashed rgba(${rgb},0.4)`,
                      borderRadius:14, padding:"12px 11px", cursor:seniorMode?"default":"pointer",
                      position:"relative",
                      boxShadow:"0 2px 10px rgba(0,0,0,0.05)",
                      transition:"transform 0.12s, box-shadow 0.12s", userSelect:"none",
                      minHeight:90,
                    }}
                    onMouseEnter={e=>{if(!seniorMode){e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 10px 24px rgba(0,0,0,0.1)";}}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,0.05)";}}
                  >
                    {/* blinker + remove */}
                    <div style={{position:"absolute",top:8,right:8,display:"flex",gap:4,alignItems:"center"}}>
                      {isLeader && !seniorMode && (
                        <button onClick={e=>{e.stopPropagation();removeUnassignedPatient(pt.id);}}
                          style={{background:"none",border:"none",cursor:"pointer",padding:2,display:"flex",alignItems:"center",borderRadius:4}}>
                          <Icon name="close" size={10} color={C.textMuted}/>
                        </button>
                      )}
                      <span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={9} color={C.red}/></span>
                    </div>
                    <div style={{fontSize:"0.55rem",color:`rgba(${rgb},0.7)`,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:1}}>Unassigned</div>
                    {pt.name
                      ? <div style={{fontSize:"0.88rem",fontWeight:700,color:C.text,lineHeight:1.2,letterSpacing:"-0.01em",marginBottom:2}}>{pt.name}</div>
                      : <div style={{fontSize:"0.78rem",fontWeight:500,color:C.textMuted,marginBottom:2}}>Unnamed</div>
                    }
                    {pt.bht && <div style={{fontSize:"0.6rem",color:C.textMuted,fontWeight:500,marginBottom:4}}>BHT {pt.bht}</div>}
                    {/* Student chips if pre-assigned */}
                    {!seniorMode && ((pt.assigned||[]).length>0||(pt.shadows||[]).length>0) && (
                      <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:4}}>
                        {(pt.assigned||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;return <span key={i} style={{fontSize:"0.52rem",background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.22)`,borderRadius:4,padding:"1px 5px",color:theme,fontWeight:600}}>{n.split(" ")[0]}</span>;})}
                        {(pt.shadows||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;return <span key={i} style={{fontSize:"0.52rem",background:"rgba(0,0,0,0.04)",border:"1px dashed rgba(0,0,0,0.14)",borderRadius:4,padding:"1px 5px",color:C.textMuted}}>{n.split(" ")[0]}</span>;})}
                      </div>
                    )}
                    {!seniorMode && (
                      <div style={{position:"absolute",bottom:9,right:9}}>
                        <div style={{background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.25)`,borderRadius:7,padding:"3px 7px",fontSize:"0.6rem",color:theme,fontWeight:600}}>Assign →</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Section filter pills — deduplicated by name */}
          {sections.length>0 && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {["all",...[...new Set(sections.map(s=>s.name))],...(stats.floor>0?["floor"]:[])].map(sec=>(
                <button key={sec} onClick={()=>setSectionFilter(sec)}
                  style={{padding:"5px 12px",borderRadius:20,fontSize:"0.74rem",fontWeight:sectionFilter===sec?600:400,cursor:"pointer",fontFamily:SF,
                    background:sectionFilter===sec?theme:C.surface,
                    border:`1px solid ${sectionFilter===sec?theme:C.border}`,
                    color:sectionFilter===sec?"#fff":C.textSub}}>
                  {sec==="all"?"All Beds":sec==="floor"?"Floor":sec}
                </button>
              ))}
            </div>
          )}

          {/* Bed grid — Paed-style tiles */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10}}>
            {filteredBedKeys.map(bedNum=>{
              const bed = beds[bedNum];
              const hasAssigned=bed.assigned?.length>0;
              const hasShadow  =bed.shadows?.length>0;
              const filled=hasAssigned||bed.diagnosis||bed.consultant||bed.notes;
              const cObj=(setup.consultants||[]).find(c=>(typeof c==="object"?c.name:c)===bed.consultant);
              const cRgb=cObj?.color?hexToRgb(cObj.color):null;
              const sec=getBedSection(bedNum);
              return (
                <div key={bedNum}
                  onClick={isLeader && !seniorMode
                    ? ()=>{ setSelectedBed(bedNum); setBedEdit({consultant:bed.consultant||"",diagnosis:bed.diagnosis||"",notes:bed.notes||"",historyTaken:!!bed.historyTaken,opStatus:bed.opStatus||"",tags:bed.tags||[],patientName:bed.patientName||"",bht:bed.bht||""}); setView("bed"); }
                    : ()=>setViewBed(bedNum)
                  }
                  style={{
                    background: cRgb?`rgba(${cRgb},0.06)`:C.surface,
                    border: bed.historyTaken?`1px solid rgba(${hexToRgb(C.green)},0.25)`:cRgb?`1px solid rgba(${cRgb},0.22)`:`1px solid rgba(0,0,0,${filled?0.1:0.07})`,
                    borderRadius:14, padding:"12px 11px", cursor:"pointer",
                    position:"relative",
                    boxShadow: filled ? "0 6px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.05)" : "0 2px 10px rgba(0,0,0,0.05)",
                    transition:"transform 0.12s, box-shadow 0.12s", userSelect:"none",
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 28px rgba(0,0,0,0.11), 0 2px 6px rgba(0,0,0,0.06)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=filled?"0 6px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.05)":"0 2px 10px rgba(0,0,0,0.05)";}}
                >
                  {/* Top-right: status flags */}
                  <div style={{position:"absolute",top:9,right:9,display:"flex",gap:4,alignItems:"center"}}>
                    {bed.historyTaken&&<Icon name="history" size={11} color={C.green}/>}
                    {bed.isNew&&<span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={10} color={C.red}/></span>}
                  </div>

                  {/* Section label + bed number — Paed style */}
                  <div style={{fontSize:"0.55rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:1}}>{bed.isFloor?"Floor":sec||"Bed"}</div>
                  <div style={{fontSize:"1.25rem",fontWeight:700,color:cRgb?`rgb(${cRgb})`:theme,lineHeight:1,letterSpacing:"-0.03em",marginBottom:4}}>{splitBedKey(String(bedNum)).num}</div>

                  {/* Patient name + BHT */}
                  {bed.patientName&&<div style={{fontSize:"0.72rem",fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:1}}>{bed.patientName}</div>}
                  {bed.bht&&<div style={{fontSize:"0.6rem",color:C.textMuted,fontWeight:500,marginBottom:2}}>BHT {bed.bht}</div>}

                  {/* Consultant */}
                  {bed.consultant&&<div style={{fontSize:"0.58rem",color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{bed.consultant}</div>}

                  {/* Diagnosis */}
                  {bed.diagnosis&&<div style={{fontSize:"0.62rem",color:C.text,fontStyle:"italic",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{bed.diagnosis}</div>}

                  {/* Notes */}
                  {bed.notes&&<div style={{fontSize:"0.58rem",color:C.textMuted,lineHeight:1.35,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",marginBottom:3}}>{bed.notes}</div>}

                  {/* Tag pills */}
                  {(bed.tags||[]).length>0&&(
                    <div style={{display:"flex",flexWrap:"wrap",gap:3,marginBottom:3}}>
                      {(bed.tags||[]).map(t=>{const tag=(setup.customTags||[]).find(ct=>ct.label===t);return tag?<span key={t} style={{fontSize:"0.5rem",fontWeight:700,padding:"1px 5px",borderRadius:4,background:`rgba(${hexToRgb(tag.color)},0.12)`,color:tag.color,border:`1px solid rgba(${hexToRgb(tag.color)},0.3)`}}>{t}</span>:null;})}
                    </div>
                  )}

                  {/* Student chips — Paed compact style */}
                  {!seniorMode&&(hasAssigned||hasShadow)&&(
                    <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:4}}>
                      {(bed.assigned||[]).map((s,i)=>{
                        const n=typeof s==="object"?s.name:s;
                        const g=typeof s==="object"?s.group:"";
                        return <span key={i} style={{fontSize:"0.52rem",background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.22)`,borderRadius:4,padding:"1px 5px",color:theme,fontWeight:600}}>{n.split(" ")[0]}{g&&<sup style={{fontSize:"0.42rem"}}>{g}</sup>}</span>;
                      })}
                      {(bed.shadows||[]).map((s,i)=>{
                        const n=typeof s==="object"?s.name:s;
                        return <span key={i} style={{fontSize:"0.52rem",background:"rgba(0,0,0,0.04)",border:"1px dashed rgba(0,0,0,0.14)",borderRadius:4,padding:"1px 5px",color:C.textMuted}}>{n.split(" ")[0]}</span>;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>}
        {activeTab==="students" && <StudentsTab beds={beds} bedKeys={bedKeys} students={setup.students||[]} theme={theme} rgb={rgb} getBedSection={getBedSection} onBedClick={(bedNum,bed)=>{ setSelectedBed(bedNum); setBedEdit({consultant:bed.consultant||"",diagnosis:bed.diagnosis||"",notes:bed.notes||"",historyTaken:!!bed.historyTaken,opStatus:bed.opStatus||"",tags:bed.tags||[],patientName:bed.patientName||"",bht:bed.bht||""}); setView("bed"); }}/>}

        {activeTab==="archive" && (
          <ArchiveTab archive={ward.archive||{}} beds={beds} theme={theme} rgb={rgb} onRestore={restoreBed} onDelete={deleteArchivedBed}/>
        )}
      </div>

      {/* Bed sheet */}
      {!seniorMode && view==="bed" && selectedBed && selBed && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:100,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>{if(e.target===e.currentTarget){setView("home");setSelectedBed(null);setShowClearConfirm(false);setShowChangeBed(false);}}}>
          <div style={{width:"100%",maxHeight:"88vh",overflowY:"auto",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",boxShadow:"0 -4px 40px rgba(0,0,0,0.12)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 22px"}}/>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:18}}>
              <div>
                <div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:500}}>{selBed.isFloor?"Floor Patient":"Bed"}</div>
                <h2 style={{margin:"3px 0 0",fontSize:"2rem",fontWeight:700,color:theme,letterSpacing:"-0.04em"}}>{splitBedKey(String(selectedBed)).num}</h2>
                {(selBed.patientName||selBed.bht)&&<div style={{marginTop:4}}>
                  {selBed.patientName&&<div style={{fontSize:"0.9rem",fontWeight:600,color:C.text}}>{selBed.patientName}</div>}
                  {selBed.bht&&<div style={{fontSize:"0.72rem",color:C.textMuted}}>BHT {selBed.bht}</div>}
                </div>}
              </div>
              <button onClick={()=>{setView("home");setSelectedBed(null);setShowClearConfirm(false);setShowChangeBed(false);}} style={{background:C.surfaceEl,border:"none",color:C.textSub,borderRadius:50,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginTop:4}}>
                <Icon name="close" size={13} color={C.textSub}/>
              </button>
            </div>

            {isLeader && <div style={{display:"flex",gap:8,marginBottom:18}}>
              <button onClick={()=>setAssignModal(selectedBed)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"10px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF,fontWeight:600}}>
                <Icon name="user" size={12} color="#fff"/> Assign
              </button>
              {selBed.isFloor && <button onClick={()=>removeFloorPatient(selectedBed)} style={{display:"flex",alignItems:"center",justifyContent:"center",background:`rgba(${hexToRgb(C.red)},0.07)`,border:`1px solid ${C.red}`,color:C.red,borderRadius:10,padding:"10px 12px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF}}>
                <Icon name="close" size={13} color={C.red}/>
              </button>}
            </div>}

            {/* Patient Name & BHT fields */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              <div>
                <label style={labelStyle}>Patient Name</label>
                <input value={bedEdit.patientName||""} onChange={e=>setBedEdit(b=>({...b,patientName:e.target.value}))} placeholder="e.g. Jane Doe" style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={labelStyle}>BHT No.</label>
                <input value={bedEdit.bht||""} onChange={e=>setBedEdit(b=>({...b,bht:e.target.value}))} placeholder="e.g. 123456" style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box"}}/>
              </div>
            </div>

            {/* New patient */}
            <div onClick={()=>toggleFlag(selectedBed,"isNew")} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:selBed.isNew?`rgba(${hexToRgb(C.red)},0.06)`:C.surfaceEl,border:`1px solid ${selBed.isNew?`rgba(${hexToRgb(C.red)},0.3)`:C.border}`,borderRadius:13,cursor:"pointer",marginBottom:10,userSelect:"none"}}>
              <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${selBed.isNew?C.red:C.borderMid}`,background:selBed.isNew?C.red:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                {selBed.isNew && <Icon name="check" size={12} color="#fff"/>}
              </div>
              <div><div style={{fontSize:"0.88rem",color:selBed.isNew?C.red:C.text,fontWeight:500}}>New Patient</div><div style={{fontSize:"0.7rem",color:C.textMuted,marginTop:1}}>Tap to toggle</div></div>
              <div style={{marginLeft:"auto"}}><Icon name="newdot" size={14} color={selBed.isNew?C.red:C.textMuted}/></div>
            </div>

            {/* History */}
            <div onClick={()=>toggleHistory(selectedBed)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:bedEdit.historyTaken?`rgba(${hexToRgb(C.green)},0.07)`:C.surfaceEl,border:`1px solid ${bedEdit.historyTaken?`rgba(${hexToRgb(C.green)},0.3)`:C.border}`,borderRadius:13,cursor:"pointer",marginBottom:18,userSelect:"none"}}>
              <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${bedEdit.historyTaken?C.green:C.borderMid}`,background:bedEdit.historyTaken?C.green:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                {bedEdit.historyTaken && <Icon name="check" size={12} color="#fff"/>}
              </div>
              <div><div style={{fontSize:"0.88rem",color:bedEdit.historyTaken?C.green:C.text,fontWeight:500}}>History Taken</div><div style={{fontSize:"0.7rem",color:C.textMuted,marginTop:1}}>Tap to toggle</div></div>
              <div style={{marginLeft:"auto"}}><Icon name="history" size={14} color={bedEdit.historyTaken?C.green:C.textMuted}/></div>
            </div>

            {(selBed.assigned?.length>0||selBed.shadows?.length>0)&&<div style={{marginBottom:16}}>
              <div style={{fontSize:"0.62rem",color:C.textMuted,marginBottom:8,letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:500}}>Assigned</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {(selBed.assigned||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;const g=typeof s==="object"?s.group:"";return<span key={i} style={{display:"flex",alignItems:"center",gap:5,background:`rgba(${rgb},0.09)`,border:`1px solid rgba(${rgb},0.2)`,color:theme,borderRadius:8,padding:"5px 10px",fontSize:"0.78rem",fontWeight:500}}><Icon name="user" size={11} color={theme}/>{n}{g&&<span style={{fontSize:"0.6rem",color:`rgba(${rgb},0.5)`,marginLeft:2}}>·{g}</span>}</span>;})}
                {(selBed.shadows||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;const g=typeof s==="object"?s.group:"";return<span key={i} style={{display:"flex",alignItems:"center",gap:5,background:C.surfaceEl,border:`1px dashed ${C.borderMid}`,color:C.textSub,borderRadius:8,padding:"5px 10px",fontSize:"0.78rem"}}><Icon name="shadow" size={11} color={C.textMuted}/>{n}{g&&<span style={{fontSize:"0.6rem",color:C.textMuted,marginLeft:2}}>·{g}</span>}<span style={{fontSize:"0.65rem",color:C.textMuted}}>(shadow)</span></span>;})}
              </div>
            </div>}

            {/* Tags */}
            {(setup.customTags||[]).length>0 && (
              <div style={{marginBottom:16}}>
                <label style={labelStyle}>Tags</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                  {(setup.customTags||[]).map((tag,ti)=>{
                    const isActive=(bedEdit.tags||[]).includes(tag.label);
                    const tagRgb=hexToRgb(tag.color||"#6366f1");
                    return (
                      <button key={ti} onClick={()=>setBedEdit(b=>({...b,tags:isActive?(b.tags||[]).filter(t=>t!==tag.label):[...(b.tags||[]),tag.label]}))}
                        style={{padding:"6px 12px",borderRadius:20,fontSize:"0.78rem",fontWeight:isActive?600:400,cursor:"pointer",fontFamily:SF,transition:"all 0.1s",
                          background:isActive?`rgba(${tagRgb},0.15)`:C.surfaceEl,
                          border:`1px solid ${isActive?tag.color:C.border}`,
                          color:isActive?tag.color:C.textSub}}>
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Consultant */}
            <div style={{marginBottom:16}}>
              <label style={labelStyle}>Consultant</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                {(setup.consultants||[]).length>0
                  ? (setup.consultants||[]).map((c,i)=>{const cName=typeof c==="object"?c.name:c;const cColor=typeof c==="object"?c.color:"#6366f1";const active=bedEdit.consultant===cName;return<button key={i} onClick={()=>setBedEdit(b=>({...b,consultant:b.consultant===cName?"":cName}))} style={{display:"flex",alignItems:"center",gap:7,background:active?`rgba(${hexToRgb(cColor)},0.12)`:C.surfaceEl,border:`1px solid ${active?cColor:C.border}`,color:active?cColor:C.textSub,borderRadius:8,padding:"7px 13px",fontSize:"0.8rem",cursor:"pointer",fontFamily:SF,fontWeight:active?600:400}}><div style={{width:8,height:8,borderRadius:"50%",background:cColor,flexShrink:0}}/>{cName}</button>;})
                  : <input value={bedEdit.consultant} onChange={e=>setBedEdit(b=>({...b,consultant:e.target.value}))} placeholder="Consultant name" style={{...iS,width:"100%",boxSizing:"border-box"}}/>
                }
              </div>
            </div>

            {/* Diagnosis */}
            <div style={{marginBottom:16}}>
              <label style={labelStyle}>Diagnosis</label>
              <input value={bedEdit.diagnosis} onChange={e=>setBedEdit(b=>({...b,diagnosis:e.target.value}))} placeholder="Working diagnosis…" style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box"}}/>
            </div>

            {/* Notes */}
            <div style={{marginBottom:24}}>
              <label style={labelStyle}>Notes</label>
              <textarea value={bedEdit.notes} onChange={e=>setBedEdit(b=>({...b,notes:e.target.value}))} placeholder="Clinical notes, procedure, history…" rows={3} style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:SF}}/>
            </div>

            <button onClick={async()=>{await saveBedEdit(selectedBed);setView("home");setSelectedBed(null);}} style={{...accentBtn(theme,rgb),width:"100%",padding:"14px",fontSize:"0.95rem"}}>Save</button>

            {/* Bottom action buttons */}
            {!showClearConfirm && !showChangeBed && !showDeleteBedConfirm && (
              <div style={{display:"flex",gap:8,marginTop:10,flexWrap:"wrap"}}>
                <button onClick={()=>setShowChangeBed(true)}
                  style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:12,padding:"11px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF}}>
                  Change Bed
                </button>
                <button onClick={()=>archiveBed(selectedBed)}
                  style={{flex:1,background:`rgba(${hexToRgb("#f97316")},0.07)`,border:"1px solid rgba(249,115,22,0.3)",color:"#c2410c",borderRadius:12,padding:"11px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF}}>
                  Archive
                </button>
                <button onClick={()=>setShowClearConfirm(true)}
                  style={{flex:1,background:`rgba(${hexToRgb(C.red)},0.06)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,color:C.red,borderRadius:12,padding:"11px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF}}>
                  Clear
                </button>
                {isLeader && (
                  <button onClick={()=>setShowDeleteBedConfirm(true)}
                    style={{flex:"1 1 100%",background:"none",border:`1px solid rgba(${hexToRgb(C.red)},0.3)`,color:C.red,borderRadius:12,padding:"9px",fontSize:"0.72rem",cursor:"pointer",fontFamily:SF}}>
                    Delete Bed Slot…
                  </button>
                )}
              </div>
            )}

            {/* Delete bed confirmation */}
            {showDeleteBedConfirm && (
              <div style={{marginTop:10,background:`rgba(${hexToRgb(C.red)},0.05)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,borderRadius:13,padding:"14px"}}>
                {bedHasData(selBed) ? (
                  <p style={{margin:"0 0 12px",fontSize:"0.82rem",color:C.text,textAlign:"center"}}>
                    This bed still has data (patient, diagnosis, or notes). Clear it first before deleting the slot.
                  </p>
                ) : (
                  <p style={{margin:"0 0 12px",fontSize:"0.82rem",color:C.text,textAlign:"center"}}>
                    Permanently delete this bed slot? This removes it from the ward entirely — use this for duplicate or leftover beds, not to discharge a patient.
                  </p>
                )}
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setShowDeleteBedConfirm(false)} style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"10px",cursor:"pointer",fontFamily:SF,fontSize:"0.82rem"}}>Cancel</button>
                  {!bedHasData(selBed) && <button onClick={()=>deleteBed(selectedBed)} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"10px",cursor:"pointer",fontFamily:SF,fontSize:"0.82rem",fontWeight:600}}>Delete</button>}
                </div>
              </div>
            )}

            {/* Change bed picker */}
            {showChangeBed && (
              <div style={{marginTop:10,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:13,padding:"14px"}}>
                <div style={{fontSize:"0.72rem",color:C.textSub,fontWeight:600,marginBottom:10}}>Move to which bed?</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:12}}>
                  {bedKeys.filter(k=>{
                    if (k===selectedBed) return false;
                    const { section, num } = splitBedKey(k);
                    if (isNaN(Number(num))) return false; // skip special/floor beds
                    // Only offer beds within the same section as the bed being moved
                    return section === splitBedKey(String(selectedBed)).section;
                  }).map(k=>{
                    const b = beds[k];
                    const occupied = b&&(b.assigned?.length>0||b.shadows?.length>0||b.diagnosis||b.consultant||b.notes);
                    return (
                      <button key={k} onClick={()=>!occupied&&changeBedNumber(selectedBed,k)} disabled={occupied}
                        style={{padding:"10px 4px",borderRadius:9,fontSize:"0.82rem",fontWeight:700,cursor:occupied?"default":"pointer",letterSpacing:"-0.02em",transition:"all 0.1s",fontFamily:SF,
                          background:occupied?"rgba(0,0,0,0.04)":`rgba(${rgb},0.1)`,
                          border:`1px solid ${occupied?"rgba(0,0,0,0.1)":`rgba(${rgb},0.3)`}`,
                          color:occupied?C.textMuted:theme,
                          opacity:occupied?0.5:1}}>
                        {splitBedKey(k).num}
                      </button>
                    );
                  })}
                </div>
                <button onClick={()=>setShowChangeBed(false)} style={{width:"100%",background:"none",border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"9px",cursor:"pointer",fontFamily:SF,fontSize:"0.82rem"}}>Cancel</button>
              </div>
            )}

            {showClearConfirm && (
              <div style={{marginTop:10,background:`rgba(${hexToRgb(C.red)},0.05)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,borderRadius:13,padding:"14px"}}>
                <p style={{margin:"0 0 12px",fontSize:"0.82rem",color:C.textSub,textAlign:"center"}}>Clear all patient data for this bed?</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setShowClearConfirm(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"10px",cursor:"pointer",fontSize:"0.85rem",fontFamily:SF}}>Cancel</button>
                  <button onClick={()=>clearBed(selectedBed)} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"10px",cursor:"pointer",fontWeight:600,fontSize:"0.85rem",fontFamily:SF}}>Clear</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignModal && <AssignModal bedNum={assignModal} students={setup.students||[]} currentAssigned={beds[assignModal]?.assigned||[]} currentShadows={beds[assignModal]?.shadows||[]} shadowHOs={shadowHOs} theme={theme} rgb={rgb} beds={beds} onConfirm={(a,s)=>assignStudents(assignModal,a,s)} onClose={()=>setAssignModal(null)}/>}

      {/* Quick-view panel — read-only */}
      {viewBed && beds[viewBed] && <BedViewPanel
        bedNum={viewBed}
        bed={beds[viewBed]}
        sec={getBedSection(viewBed)}
        setup={setup}
        theme={theme}
        rgb={rgb}
        seniorMode={seniorMode}
        onClose={()=>setViewBed(null)}
        onEdit={()=>{
          const vb=beds[viewBed];
          setViewBed(null);
          setSelectedBed(viewBed);
          setBedEdit({consultant:vb.consultant||"",diagnosis:vb.diagnosis||"",notes:vb.notes||"",historyTaken:!!vb.historyTaken,opStatus:vb.opStatus||"",tags:vb.tags||[],patientName:vb.patientName||"",bht:vb.bht||""});
          setView("bed");
        }}
      />}

      {/* Shadow HO edit modal */}
      {shadowEditing && shadowForm && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:300,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>e.target===e.currentTarget&&setShadowEditing(false)}>
          <div style={{width:"100%",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",maxHeight:"60vh",overflowY:"auto",boxShadow:"0 -4px 40px rgba(0,0,0,0.12)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 18px"}}/>
            <h3 style={{margin:"0 0 14px",color:C.text,fontWeight:600}}>Update Shadow HO Posts</h3>
            {shadowForm.map((ho,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
                <span style={{fontSize:"0.78rem",color:C.textSub,width:100,flexShrink:0,fontWeight:500}}>{ho.post}</span>
                <select value={ho.name} onChange={e=>{const s=[...shadowForm];s[i]={...s[i],name:e.target.value};setShadowForm(s);}}
                  style={{...iS,flex:1,padding:"9px 12px"}}>
                  <option value="">— Unassigned —</option>
                  {(setup.students||[]).filter(s=>s.name).map(s=><option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            ))}
            <div style={{display:"flex",gap:10,marginTop:6}}>
              <button onClick={()=>setShadowEditing(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={async()=>{ await save({...ward,setup:{...setup,shadowHOs:shadowForm}}); setShadowEditing(false); showToast("Shadow HO posts updated"); }} style={{flex:1,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Pin modal */}
      {showPin && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,boxShadow:C.shadowMd}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><Icon name="key" size={16} color={theme}/><h3 style={{margin:0,color:C.text,fontSize:"1.1rem",fontWeight:600}}>Leader Access</h3></div>
            <p style={{margin:"0 0 18px",color:C.textSub,fontSize:"0.84rem"}}>Enter your group leader PIN.</p>
            <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryPin()} placeholder="Enter PIN" style={{...iS,width:"100%",boxSizing:"border-box",fontSize:"1.1rem",letterSpacing:"0.2em",textAlign:"center",borderColor:pinError?C.red:undefined,animation:pinError?"shake 0.3s":"none"}}/>
            {pinError && <div style={{color:C.red,fontSize:"0.78rem",textAlign:"center",marginTop:6}}>Incorrect PIN</div>}
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button onClick={()=>{setShowPin(false);setPinInput("");}} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={tryPin} style={{flex:1,...accentBtn(theme,rgb),padding:"11px",fontSize:"0.9rem"}}>Unlock</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset confirm */}
      {showReset && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,boxShadow:C.shadowMd}}>
            <h3 style={{margin:"0 0 8px",color:C.text,fontWeight:600}}>Start New Rotation?</h3>
            <p style={{margin:"0 0 18px",color:C.textSub,fontSize:"0.84rem"}}>Clears all patient data. Cannot be undone.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowReset(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={resetWard} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:700,fontFamily:SF}}>Reset</button>
            </div>
          </div>
        </div>
      )}

      {showDelete && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,border:`1px solid ${C.red}`,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,boxShadow:C.shadowMd}}>
            <h3 style={{margin:"0 0 8px",color:C.red,fontWeight:700}}>Delete Ward?</h3>
            <p style={{margin:"0 0 4px",color:C.text,fontSize:"0.88rem",fontWeight:500}}>{setup.wardName}</p>
            <p style={{margin:"0 0 18px",color:C.textSub,fontSize:"0.82rem"}}>This permanently removes the ward and all its data from the system. This cannot be undone.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowDelete(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={()=>{ setShowDelete(false); onDelete && onDelete(wardId); }} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:700,fontFamily:SF}}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Patient modal — comprehensive form */}
      {showAddPatient && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.28)",zIndex:300,display:"flex",alignItems:"flex-end",backdropFilter:"blur(5px)"}} onClick={e=>e.target===e.currentTarget&&setShowAddPatient(false)}>
          <div style={{width:"100%",maxHeight:"92vh",overflowY:"auto",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 52px",boxShadow:"0 -4px 40px rgba(0,0,0,0.15)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 20px"}}/>
            {/* Header */}
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:20}}>
              <div style={{width:38,height:38,borderRadius:11,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.2)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                <svg width="18" height="18" viewBox="0 0 16 16" fill="none">
                  <rect x="2" y="3" width="9" height="11" rx="1.5" stroke={theme} strokeWidth="1.4"/>
                  <path d="M5 6.5h5M5 9h3" stroke={theme} strokeWidth="1.3" strokeLinecap="round"/>
                  <path d="M12 1v4M10 3h4" stroke={theme} strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
              </div>
              <div>
                <h3 style={{margin:0,fontSize:"1.05rem",fontWeight:700,color:C.text}}>Add New Patient</h3>
                <div style={{fontSize:"0.72rem",color:C.textMuted,marginTop:1}}>From admission book · assign bed and students now or later</div>
              </div>
            </div>

            {/* Name + BHT */}
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              <div>
                <label style={labelStyle}>Patient Name</label>
                <input autoFocus value={addPtForm.name} onChange={e=>setAddPtForm(f=>({...f,name:e.target.value}))}
                  placeholder="e.g. Jane Doe" style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box"}}/>
              </div>
              <div>
                <label style={labelStyle}>BHT No.</label>
                <input value={addPtForm.bht} onChange={e=>setAddPtForm(f=>({...f,bht:e.target.value}))}
                  placeholder="e.g. 123456" style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box"}}/>
              </div>
            </div>

            {/* Bed assignment */}
            <div style={{marginBottom:16}}>
              <label style={labelStyle}>Bed Assignment</label>
              {/* Floor toggle */}
              <div onClick={()=>setAddPtForm(f=>({...f,isFloor:!f.isFloor,bedNum:"",section:""}))}
                style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:addPtForm.isFloor?`rgba(${rgb},0.06)`:C.surfaceEl,border:`1px solid ${addPtForm.isFloor?`rgba(${rgb},0.3)`:C.border}`,borderRadius:11,cursor:"pointer",userSelect:"none",marginTop:8,marginBottom:8}}>
                <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${addPtForm.isFloor?theme:C.borderMid}`,background:addPtForm.isFloor?theme:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                  {addPtForm.isFloor&&<Icon name="check" size={11} color="#fff"/>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <Icon name="floor" size={13} color={addPtForm.isFloor?theme:C.textMuted}/>
                  <span style={{fontSize:"0.84rem",color:addPtForm.isFloor?theme:C.text,fontWeight:500}}>Floor patient (no bed)</span>
                </div>
              </div>

              {/* Bed picker — only if not floor */}
              {!addPtForm.isFloor && (
                <>
                  {sections.length>0 ? (
                    sections.map(sec=>{
                      const rangeStr = sec.range||"";
                      let bedNums = [];
                      if (rangeStr.includes("-")) {
                        const [st,en]=rangeStr.split("-").map(Number);
                        for(let n=st;n<=en;n++) bedNums.push(String(n));
                      }
                      if (bedNums.length===0) return null;
                      return (
                        <div key={sec.name} style={{marginBottom:10}}>
                          <div style={{fontSize:"0.66rem",color:C.textMuted,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:6}}>{sec.name}</div>
                          <div style={{display:"flex",flexWrap:"wrap",gap:5}}>
                            {bedNums.map(n=>{
                              const key=Object.keys(beds).find(k=>getBedSection(k)===sec.name&&splitBedKey(String(k)).num===n);
                              const bed=key?beds[key]:null;
                              const occupied=!!(bed&&(bed.patientName||bed.diagnosis||bed.consultant||bed.notes||(bed.assigned||[]).length>0));
                              const isSel=addPtForm.section===sec.name&&addPtForm.bedNum===n;
                              return (
                                <button key={n} onClick={()=>!occupied&&setAddPtForm(f=>({...f,section:isSel?"":sec.name,bedNum:isSel?"":n}))}
                                  disabled={occupied}
                                  style={{padding:"6px 11px",borderRadius:8,fontSize:"0.8rem",fontWeight:700,fontFamily:SF,cursor:occupied?"default":"pointer",
                                    background:isSel?theme:occupied?`rgba(0,0,0,0.04)`:`rgba(${rgb},0.07)`,
                                    border:`1px solid ${isSel?theme:occupied?"rgba(0,0,0,0.08)":`rgba(${rgb},0.25)`}`,
                                    color:isSel?"#fff":occupied?C.textMuted:theme,opacity:occupied?0.5:1}}>
                                  {n}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:8}}>
                      {bedKeys.filter(k=>!beds[k]?.isFloor).map(k=>{
                        const bed=beds[k];
                        const num=splitBedKey(String(k)).num;
                        const occupied=!!(bed.patientName||bed.diagnosis||bed.consultant||bed.notes||(bed.assigned||[]).length>0);
                        const isSel=addPtForm.bedNum===String(k);
                        return (
                          <button key={k} onClick={()=>!occupied&&setAddPtForm(f=>({...f,bedNum:isSel?"":String(k),section:""}))}
                            disabled={occupied}
                            style={{padding:"6px 11px",borderRadius:8,fontSize:"0.8rem",fontWeight:700,fontFamily:SF,cursor:occupied?"default":"pointer",
                              background:isSel?theme:occupied?`rgba(0,0,0,0.04)`:`rgba(${rgb},0.07)`,
                              border:`1px solid ${isSel?theme:occupied?"rgba(0,0,0,0.08)":`rgba(${rgb},0.25)`}`,
                              color:isSel?"#fff":occupied?C.textMuted:theme,opacity:occupied?0.5:1}}>
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  )}
                  {!addPtForm.bedNum && <div style={{fontSize:"0.7rem",color:C.textMuted,marginTop:4}}>No bed selected — patient will be added as unassigned</div>}
                  {addPtForm.bedNum && <div style={{fontSize:"0.72rem",color:theme,fontWeight:600,marginTop:4}}>✓ Bed {addPtForm.bedNum} selected{addPtForm.section?` · ${addPtForm.section}`:""}</div>}
                </>
              )}
            </div>

            {/* Student assignment */}
            {(setup.students||[]).length>0 && (
              <div style={{marginBottom:16}}>
                <label style={labelStyle}>Assign Students</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                  {(setup.students||[]).filter(s=>s.name).map((s,i)=>{
                    const n=typeof s==="object"?s.name:s;
                    const g=typeof s==="object"?s.group:"";
                    const isHO=(shadowHOs||[]).some(h=>h.name===n);
                    const isPrimary=(addPtForm.assigned||[]).some(a=>(typeof a==="object"?a.name:a)===n);
                    const isShadow=(addPtForm.shadows||[]).some(a=>(typeof a==="object"?a.name:a)===n);
                    const sObj={name:n,group:g};
                    return (
                      <button key={i} onClick={()=>{
                        if (isHO) {
                          setAddPtForm(f=>({...f,shadows:isShadow?f.shadows.filter(a=>(typeof a==="object"?a.name:a)!==n):[...f.shadows,sObj]}));
                        } else {
                          if (isPrimary) setAddPtForm(f=>({...f,assigned:f.assigned.filter(a=>(typeof a==="object"?a.name:a)!==n)}));
                          else if (isShadow) setAddPtForm(f=>({...f,shadows:f.shadows.filter(a=>(typeof a==="object"?a.name:a)!==n)}));
                          else setAddPtForm(f=>({...f,assigned:[...f.assigned,sObj]}));
                        }
                      }}
                        style={{display:"flex",alignItems:"center",gap:5,padding:"7px 12px",borderRadius:9,fontSize:"0.78rem",fontWeight:isPrimary||isShadow?600:400,cursor:"pointer",fontFamily:SF,transition:"all 0.1s",
                          background:isPrimary?`rgba(${rgb},0.12)`:isShadow?`rgba(0,0,0,0.06)`:C.surfaceEl,
                          border:`1px solid ${isPrimary?`rgba(${rgb},0.35)`:isShadow?"rgba(0,0,0,0.14)":C.border}`,
                          color:isPrimary?theme:isShadow?C.textSub:C.text}}>
                        <Icon name={isShadow?"shadow":"user"} size={11} color={isPrimary?theme:isShadow?C.textMuted:C.textMuted}/>
                        {n}{g&&<sup style={{fontSize:"0.6em",opacity:0.6}}>{g}</sup>}
                        {isHO&&<span style={{fontSize:"0.58rem",color:C.textMuted,marginLeft:2}}>(HO)</span>}
                      </button>
                    );
                  })}
                </div>
                <div style={{fontSize:"0.68rem",color:C.textMuted,marginTop:6}}>Tap once = primary · HO students auto-shadow</div>
              </div>
            )}

            {addPtError&&<div style={{color:C.red,fontSize:"0.78rem",marginBottom:10}}>{addPtError}</div>}
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <button onClick={()=>setShowAddPatient(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:12,padding:"13px",cursor:"pointer",fontFamily:SF,fontSize:"0.88rem"}}>Cancel</button>
              <button onClick={addUnassignedPatient} style={{flex:2,...accentBtn(theme,rgb),padding:"13px",fontSize:"0.9rem"}}>
                {addPtForm.isFloor?"Add Floor Patient":addPtForm.bedNum?"Assign to Bed "+addPtForm.bedNum:"Add Patient"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign unassigned patient to bed — bed picker sheet */}
      {assigningPatient && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.28)",zIndex:300,display:"flex",alignItems:"flex-end",backdropFilter:"blur(5px)"}} onClick={e=>e.target===e.currentTarget&&setAssigningPatient(null)}>
          <div style={{width:"100%",maxHeight:"80vh",overflowY:"auto",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 48px",boxShadow:"0 -4px 40px rgba(0,0,0,0.13)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 20px"}}/>
            <div style={{marginBottom:18}}>
              <div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:4}}>Assigning Patient</div>
              <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:`rgba(${rgb},0.06)`,border:`1px solid rgba(${rgb},0.2)`,borderRadius:12}}>
                <div style={{width:30,height:30,borderRadius:9,background:`rgba(${rgb},0.12)`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                  <Icon name="user" size={14} color={theme}/>
                </div>
                <div>
                  {assigningPatient.name&&<div style={{fontSize:"0.9rem",fontWeight:600,color:C.text}}>{assigningPatient.name}</div>}
                  {assigningPatient.bht&&<div style={{fontSize:"0.72rem",color:C.textMuted}}>BHT {assigningPatient.bht}</div>}
                </div>
              </div>
            </div>
            <div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:10}}>Select a Bed</div>
            {sections.length>0 ? (
              sections.map(sec=>{
                const secBeds = bedKeys.filter(k=>{
                  if (beds[k]?.isFloor) return false;
                  return getBedSection(k)===sec.name;
                });
                if (secBeds.length===0) return null;
                return (
                  <div key={sec.name} style={{marginBottom:16}}>
                    <div style={{fontSize:"0.72rem",fontWeight:600,color:C.textSub,letterSpacing:"0.03em",marginBottom:8,textTransform:"uppercase"}}>{sec.name}</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(68px,1fr))",gap:6}}>
                      {secBeds.map(bedNum=>{
                        const bed=beds[bedNum];
                        const occupied=!!(bed.patientName||bed.diagnosis||bed.consultant||bed.notes||(bed.assigned||[]).length>0);
                        const num=splitBedKey(String(bedNum)).num;
                        return (
                          <button key={bedNum} onClick={()=>!occupied&&assignUnassignedToBed(assigningPatient.id,bedNum)}
                            disabled={occupied}
                            style={{padding:"10px 4px",borderRadius:10,fontWeight:700,fontSize:"0.85rem",fontFamily:SF,cursor:occupied?"default":"pointer",
                              background:occupied?`rgba(0,0,0,0.04)`:`rgba(${rgb},0.08)`,
                              border:`1px solid ${occupied?"rgba(0,0,0,0.09)":`rgba(${rgb},0.3)`}`,
                              color:occupied?C.textMuted:theme,
                              opacity:occupied?0.55:1,
                              transition:"all 0.1s"}}>
                            {num}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                );
              })
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(68px,1fr))",gap:6,marginBottom:16}}>
                {bedKeys.filter(k=>!beds[k]?.isFloor).map(bedNum=>{
                  const bed=beds[bedNum];
                  const occupied=!!(bed.patientName||bed.diagnosis||bed.consultant||bed.notes||(bed.assigned||[]).length>0);
                  const num=splitBedKey(String(bedNum)).num;
                  return (
                    <button key={bedNum} onClick={()=>!occupied&&assignUnassignedToBed(assigningPatient.id,bedNum)}
                      disabled={occupied}
                      style={{padding:"10px 4px",borderRadius:10,fontWeight:700,fontSize:"0.85rem",fontFamily:SF,cursor:occupied?"default":"pointer",
                        background:occupied?`rgba(0,0,0,0.04)`:`rgba(${rgb},0.08)`,
                        border:`1px solid ${occupied?"rgba(0,0,0,0.09)":`rgba(${rgb},0.3)`}`,
                        color:occupied?C.textMuted:theme,
                        opacity:occupied?0.55:1}}>
                      {num}
                    </button>
                  );
                })}
              </div>
            )}
            <button onClick={()=>setAssigningPatient(null)} style={{width:"100%",background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:12,padding:"12px",cursor:"pointer",fontFamily:SF,fontSize:"0.88rem",marginTop:6}}>Cancel</button>
          </div>
        </div>
      )}

      <BrandingBar theme={theme}/>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}`}</style>
    </div>
  );
}
function PaedWardViewPlaceholder() { return null; } // Components defined below

// ══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function SetupForm({ form, setForm, onSubmit, submitLabel, theme, hideBedsField }) {
  const students    = form.students    || [{name:"",group:""}];
  const consultants = form.consultants || [{name:"",color:"#6366f1"}];
  const shadowHOs   = form.shadowHOs   || [];
  const wardSections = form.wardSections || [];
  const specialBeds  = form.specialBeds  || [];
  const rotationDays = form.rotationDays || 7;
  const addField      = (f)     => setForm(p => ({ ...p, [f]: f==="students" ? [...(p[f]||[]),{name:"",group:""}] : [...(p[f]||[]),{name:"",color:"#6366f1"}] }));
  const removeField   = (f,i)   => setForm(p => ({ ...p, [f]:(p[f]||[]).filter((_,idx)=>idx!==i) }));
  const updateStudent    = (i,k,v) => setForm(p => { const a=[...(p.students||[])]; a[i]={...a[i],[k]:v}; return {...p,students:a}; });
  const updateConsultant = (i,k,v) => setForm(p => { const a=[...(p.consultants||[])]; a[i]={...a[i],[k]:v}; return {...p,consultants:a}; });
  const setShadowHOCount = (n) => {
    const count = Math.max(0, Math.min(10, parseInt(n)||0));
    const current = form.shadowHOs || [];
    if (count > current.length) {
      const added = Array.from({length: count - current.length}, (_,i) => ({post:`Shadow HO ${current.length+i+1}`, name:""}));
      setForm(f=>({...f, shadowHOs:[...current, ...added]}));
    } else {
      setForm(f=>({...f, shadowHOs:current.slice(0, count)}));
    }
  };

  const addSection    = () => setForm(f=>({...f, wardSections:[...(f.wardSections||[]),{name:"",range:""}]}));
  const removeSection = (i) => setForm(f=>({...f, wardSections:(f.wardSections||[]).filter((_,idx)=>idx!==i)}));
  const updateSection = (i,k,v) => setForm(f=>{ const a=[...(f.wardSections||[])]; a[i]={...a[i],[k]:v}; return {...f,wardSections:a}; });
  const addSpecialBed    = () => setForm(f=>({...f, specialBeds:[...(f.specialBeds||[]),{id:"",section:""}]}));
  const removeSpecialBed = (i) => setForm(f=>({...f, specialBeds:(f.specialBeds||[]).filter((_,idx)=>idx!==i)}));
  const updateSpecialBed = (i,k,v) => setForm(f=>{ const a=[...(f.specialBeds||[])]; a[i]={...a[i],[k]:v}; return {...f,specialBeds:a}; });

  const studentNames = students.map(s=>s.name).filter(Boolean);
  const sectionNames = wardSections.map(s=>s.name).filter(Boolean);

  return (
    <div>
      <div style={{marginBottom:18}}>
        <label style={labelStyle}>Ward Name</label>
        <input value={form.wardName} onChange={e=>setForm(f=>({...f,wardName:e.target.value}))} placeholder="e.g. Medicine Male" style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}/>
      </div>
      <div style={{marginBottom:18}}>
        <label style={labelStyle}>Rotation / Appointment</label>
        <input value={form.appointmentType} onChange={e=>setForm(f=>({...f,appointmentType:e.target.value}))} placeholder="e.g. Medicine – Week 1" style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}/>
      </div>
      {!hideBedsField && <div style={{marginBottom:18}}>
        <label style={labelStyle}>Number of Beds</label>
        <input type="number" value={form.bedCount} onChange={e=>setForm(f=>({...f,bedCount:e.target.value}))} placeholder="e.g. 20" style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}/>
      </div>}
      {/* Rotation length */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Rotation Length (days)</label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 8px"}}>Used in the Shadow HO banner label.</p>
        <input type="number" min="1" max="365" value={rotationDays}
          onChange={e=>setForm(f=>({...f,rotationDays:Math.max(1,parseInt(e.target.value)||1)}))}
          placeholder="e.g. 7" style={{...iS,width:"100%",boxSizing:"border-box",marginTop:4}}/>
      </div>
      <div style={{marginBottom:24}}>
        <label style={labelStyle}>Accent Colour</label>
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",boxShadow:C.shadow}}>
          <input type="color" value={form.themeColor} onChange={e=>setForm(f=>({...f,themeColor:e.target.value}))} style={{width:40,height:40,border:"none",borderRadius:8,cursor:"pointer",padding:0,background:"none"}}/>
          <div style={{flex:1,height:8,borderRadius:4,background:`linear-gradient(90deg,${C.surfaceEl},${form.themeColor})`}}/>
          <span style={{fontSize:"0.75rem",color:C.textMuted,fontFamily:"monospace"}}>{form.themeColor}</span>
        </div>
      </div>
      {/* Shadow HO count */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Shadow HO Posts</label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 8px"}}>Number of rotating Shadow HO posts (0 to hide banner).</p>
        <div style={{display:"flex",alignItems:"center",gap:10,marginTop:4}}>
          {[0,1,2,3,4,5].map(n=>(
            <button key={n} onClick={()=>setShadowHOCount(n)}
              style={{flex:1,padding:"9px 4px",borderRadius:9,fontSize:"0.88rem",fontWeight:600,fontFamily:SF,cursor:"pointer",
                background:shadowHOs.length===n?theme:C.surfaceEl,
                border:`1px solid ${shadowHOs.length===n?theme:C.border}`,
                color:shadowHOs.length===n?"#fff":C.textSub}}>
              {n}
            </button>
          ))}
        </div>
        {shadowHOs.length>0 && (
          <div style={{marginTop:12}}>
            <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"0 0 8px"}}>Names can be updated anytime by the leader.</p>
            {shadowHOs.map((ho,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
                <span style={{fontSize:"0.78rem",color:C.textSub,width:96,flexShrink:0,fontWeight:500}}>{ho.post}</span>
                <select value={ho.name} onChange={e=>setForm(f=>{const s=[...(f.shadowHOs||[])];s[i]={...s[i],name:e.target.value};return{...f,shadowHOs:s};})}
                  style={{...iS,flex:1,padding:"8px 12px"}}>
                  <option value="">— Unassigned —</option>
                  {studentNames.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ward Sections */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Ward Sections <span style={{color:C.textMuted,fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 10px"}}>Group beds into sections e.g. Elective (1–10), Emergency (11–20). Used as filter pills on the ward tab.</p>
        {wardSections.map((sec,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input value={sec.name} onChange={e=>updateSection(i,"name",e.target.value)} placeholder="Section name" style={{...iS,flex:2,padding:"10px 12px"}}/>
            <input value={sec.range} onChange={e=>updateSection(i,"range",e.target.value)} placeholder="e.g. 1-10" style={{...iS,width:80,padding:"10px 10px",textAlign:"center",flexShrink:0}}/>
            <button onClick={()=>removeSection(i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>
          </div>
        ))}
        <div style={{marginTop:4,fontSize:"0.62rem",color:C.textMuted,paddingLeft:2}}>Format: start–end e.g. <code>1-10</code> or <code>11-20</code></div>
        <button onClick={addSection} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Section</button>
      </div>

      {/* Special Beds */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Special Beds <span style={{color:C.textMuted,fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 10px"}}>Named beds outside normal numbering e.g. HDU1, Side Room A. Assign to a section for the filter to work.</p>
        {specialBeds.map((bed,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input value={bed.id} onChange={e=>updateSpecialBed(i,"id",e.target.value)} placeholder="Bed ID e.g. HDU1" style={{...iS,flex:1,padding:"10px 12px"}}/>
            {sectionNames.length>0
              ? <select value={bed.section} onChange={e=>updateSpecialBed(i,"section",e.target.value)} style={{...iS,flex:1,padding:"10px 10px"}}>
                  <option value="">No section</option>
                  {sectionNames.map(n=><option key={n} value={n}>{n}</option>)}
                </select>
              : <input value={bed.section} onChange={e=>updateSpecialBed(i,"section",e.target.value)} placeholder="Section (optional)" style={{...iS,flex:1,padding:"10px 12px"}}/>
            }
            <button onClick={()=>removeSpecialBed(i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>
          </div>
        ))}
        <button onClick={addSpecialBed} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Special Bed</button>
      </div>

      {/* Students */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Students</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 56px",gap:4,marginTop:8,marginBottom:4,paddingLeft:2}}>
          <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em"}}>NAME</span>
          <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em",textAlign:"center"}}>GRP NO.</span>
        </div>
        {students.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:6}}>
            <input value={s.name} onChange={e=>updateStudent(i,"name",e.target.value)} placeholder={`Student ${i+1}`} style={{...iS,flex:1,padding:"10px 12px"}}/>
            <input value={s.group} onChange={e=>updateStudent(i,"group",e.target.value)} placeholder="1" style={{...iS,width:48,padding:"10px 8px",textAlign:"center",flexShrink:0}}/>
            {students.length>1 && <button onClick={()=>removeField("students",i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={()=>addField("students")} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Student</button>
      </div>
      {/* Consultants */}
      <div style={{marginBottom:28}}>
        <label style={labelStyle}>Consultants</label>
        {consultants.map((c,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input type="color" value={c.color||"#6366f1"} onChange={e=>updateConsultant(i,"color",e.target.value)} style={{width:38,height:38,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",padding:2,background:"none",flexShrink:0}}/>
            <input value={c.name} onChange={e=>updateConsultant(i,"name",e.target.value)} placeholder="Name or title" style={{...iS,flex:1}}/>
            {consultants.length>1 && <button onClick={()=>removeField("consultants",i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={()=>addField("consultants")} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Consultant</button>
      </div>
      {/* Custom Tags */}
      <div style={{marginBottom:28}}>
        <label style={labelStyle}>Custom Tags <span style={{color:C.textMuted,fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
        <p style={{fontSize:"0.72rem",color:C.textMuted,margin:"4px 0 10px"}}>Add coloured labels for the bed sheet e.g. Catheter, IV Line, Monitoring.</p>
        {(form.customTags||[]).map((tag,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input type="color" value={tag.color||"#6366f1"} onChange={e=>setForm(f=>{const a=[...(f.customTags||[])];a[i]={...a[i],color:e.target.value};return{...f,customTags:a};})} style={{width:38,height:38,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",padding:2,background:"none",flexShrink:0}}/>
            <input value={tag.label} onChange={e=>setForm(f=>{const a=[...(f.customTags||[])];a[i]={...a[i],label:e.target.value};return{...f,customTags:a};})} placeholder="Tag name e.g. Catheter" style={{...iS,flex:1}}/>
            <button onClick={()=>setForm(f=>({...f,customTags:(f.customTags||[]).filter((_,idx)=>idx!==i)}))} style={rB}><Icon name="close" size={11} color={C.textMuted}/></button>
          </div>
        ))}
        <button onClick={()=>setForm(f=>({...f,customTags:[...(f.customTags||[]),{label:"",color:"#6366f1"}]}))} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Tag</button>
      </div>
      <button onClick={onSubmit} style={{...accentBtn(form.themeColor,hexToRgb(form.themeColor)),width:"100%",padding:"15px",fontSize:"0.95rem"}}>{submitLabel}</button>
    </div>
  );
}

// ── Archive Tab ────────────────────────────────────────────────────────────────
function ArchiveTab({ archive, beds, theme, rgb, onRestore, onDelete }) {
  const weeks = Object.keys(archive||{}).sort().reverse();
  const [selectedWeek, setSelectedWeek] = useState(weeks[0]||"");
  const [expanded,     setExpanded]     = useState({});        // {bedNum: bool}
  const [restorePicker,setRestorePicker]= useState(null);      // bedNum being restored
  const [confirmDelete,setConfirmDelete]= useState(null);      // bedNum to delete

  if (weeks.length===0) return (
    <div style={{textAlign:"center",padding:"60px 20px",color:C.textMuted,fontSize:"0.85rem",fontFamily:SF}}>
      No archived beds yet. Archive beds using the Archive button in the bed detail sheet.
    </div>
  );

  const weekData = archive[selectedWeek]||{};
  const archivedBedKeys = Object.keys(weekData).sort((a,b)=>isNaN(a)||isNaN(b)?a.localeCompare(b):Number(a)-Number(b));

  const bedIsFree = (bedNum) => {
    const b = beds[bedNum];
    return !b || !(b.assigned?.length>0||b.shadows?.length>0||b.diagnosis||b.consultant||b.notes);
  };

  const allBedNums = Object.keys(beds).filter(k=>{ const {num}=splitBedKey(k); return !isNaN(Number(num)); }).sort((a,b)=>{
    const A=splitBedKey(a), B=splitBedKey(b);
    if (A.section!==B.section) return (A.section||"").localeCompare(B.section||"");
    return Number(A.num)-Number(B.num);
  });

  const formatWeek = (wk) => {
    const [yr,wNum] = wk.split("-W");
    return `Week ${parseInt(wNum)}, ${yr}`;
  };

  const toggle = (bedNum) => setExpanded(e=>({...e,[bedNum]:!e[bedNum]}));

  return (
    <div>
      {/* Week selector */}
      <div style={{marginBottom:18}}>
        <label style={labelStyle}>Select Week</label>
        <select value={selectedWeek} onChange={e=>{setSelectedWeek(e.target.value);setExpanded({});setRestorePicker(null);setConfirmDelete(null);}}
          style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}>
          {weeks.map(w=><option key={w} value={w}>{formatWeek(w)}</option>)}
        </select>
      </div>

      {archivedBedKeys.length===0
        ? <div style={{textAlign:"center",padding:"30px",color:C.textMuted,fontSize:"0.85rem"}}>No beds archived this week.</div>
        : <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {archivedBedKeys.map(bedNum=>{
              const bed = weekData[bedNum];
              const isOpen = !!expanded[bedNum];
              const sameOk = bedIsFree(bedNum);

              return (
                <div key={bedNum} style={{background:C.surface,border:"1px solid rgba(0,0,0,0.08)",borderRadius:14,boxShadow:"0 4px 14px rgba(0,0,0,0.06)",overflow:"hidden"}}>

                  {/* Collapsed header — always visible */}
                  <div onClick={()=>toggle(bedNum)} style={{display:"flex",alignItems:"center",padding:"13px 14px",cursor:"pointer",userSelect:"none",gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:"0.6rem",color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:500}}>{bed.isFloor?"Floor":"Bed"}</span>
                        <span style={{fontSize:"1.1rem",fontWeight:700,color:theme,letterSpacing:"-0.03em"}}>{splitBedKey(String(bedNum)).num}</span>
                        {bed.diagnosis&&<span style={{fontSize:"0.72rem",color:C.text,fontStyle:"italic",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:140}}>{bed.diagnosis}</span>}
                      </div>
                      <div style={{fontSize:"0.62rem",color:C.textMuted,marginTop:2}}>
                        {bed.archivedAt ? new Date(bed.archivedAt).toLocaleDateString() : "Archived"}
                        {bed.consultant&&` · ${bed.consultant}`}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:5,alignItems:"center"}}>
                      {bed.historyTaken&&<Icon name="history" size={11} color={C.green}/>}
                      {bed.isNew&&<Icon name="newdot" size={9} color={C.red}/>}
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>
                        <path d="M2 4l4 4 4-4" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* Expanded content */}
                  {isOpen && (
                    <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 14px 14px",background:C.surfaceEl}}>
                      {/* Details */}
                      {bed.diagnosis&&<div style={{fontSize:"0.78rem",color:C.text,fontStyle:"italic",marginBottom:4,fontWeight:500}}>{bed.diagnosis}</div>}
                      {bed.consultant&&<div style={{fontSize:"0.72rem",color:C.textSub,marginBottom:4}}>{bed.consultant}</div>}
                      {bed.notes&&<div style={{fontSize:"0.7rem",color:C.textMuted,marginBottom:8,lineHeight:1.4}}>{bed.notes}</div>}
                      {(bed.assigned?.length>0||bed.shadows?.length>0)&&(
                        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                          {(bed.assigned||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;return<span key={i} style={{fontSize:"0.65rem",background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.2)`,borderRadius:6,padding:"2px 8px",color:theme,fontWeight:500}}>{n}</span>;})}
                          {(bed.shadows||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;return<span key={i} style={{fontSize:"0.65rem",background:"rgba(0,0,0,0.03)",border:"1px dashed rgba(0,0,0,0.15)",borderRadius:6,padding:"2px 8px",color:C.textMuted}}>{n}</span>;})}
                        </div>
                      )}

                      {/* Restore to same bed or pick different */}
                      {restorePicker===bedNum ? (
                        <div>
                          <div style={{fontSize:"0.72rem",color:C.textSub,fontWeight:500,marginBottom:8}}>Restore to which bed?</div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
                            {allBedNums.filter(k=>splitBedKey(k).section===splitBedKey(bedNum).section).map(k=>{
                              const free = bedIsFree(k);
                              return (
                                <button key={k} onClick={()=>{if(!free)return; onRestore(selectedWeek,bedNum,k); setRestorePicker(null);}} disabled={!free}
                                  style={{padding:"9px 4px",borderRadius:9,fontSize:"0.82rem",fontWeight:700,cursor:free?"pointer":"not-allowed",fontFamily:SF,
                                    background:free?`rgba(${rgb},0.1)`:"rgba(0,0,0,0.03)",
                                    border:`1px solid ${free?`rgba(${rgb},0.3)`:"rgba(0,0,0,0.08)"}`,
                                    color:free?theme:C.textMuted,opacity:free?1:0.5}}>
                                  {splitBedKey(k).num}
                                </button>
                              );
                            })}
                          </div>
                          <button onClick={()=>setRestorePicker(null)} style={{width:"100%",background:"none",border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"8px",cursor:"pointer",fontFamily:SF,fontSize:"0.8rem"}}>Cancel</button>
                        </div>
                      ) : confirmDelete===bedNum ? (
                        <div style={{background:`rgba(${hexToRgb(C.red)},0.05)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,borderRadius:10,padding:"12px"}}>
                          <p style={{margin:"0 0 10px",fontSize:"0.8rem",color:C.textSub,textAlign:"center"}}>Delete this archived record permanently?</p>
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>setConfirmDelete(null)} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:9,padding:"9px",cursor:"pointer",fontFamily:SF,fontSize:"0.8rem"}}>Cancel</button>
                            <button onClick={()=>{onDelete(selectedWeek,bedNum);setConfirmDelete(null);}}
                              style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:9,padding:"9px",cursor:"pointer",fontWeight:600,fontFamily:SF,fontSize:"0.8rem"}}>Delete</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>setRestorePicker(bedNum)}
                            style={{flex:2,padding:"9px",borderRadius:10,fontSize:"0.8rem",cursor:"pointer",fontFamily:SF,fontWeight:500,
                              background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.25)`,color:theme}}>
                            Restore
                          </button>
                          <button onClick={()=>setConfirmDelete(bedNum)}
                            style={{flex:1,padding:"9px",borderRadius:10,fontSize:"0.8rem",cursor:"pointer",fontFamily:SF,
                              background:`rgba(${hexToRgb(C.red)},0.06)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,color:C.red}}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

function StudentsTab({ beds, bedKeys, students, theme, rgb, getBedSection, onBedClick }) {
  const [selected, setSelected] = useState(null);

  // Build per-student bed lists
  const studentBeds = {};
  students.forEach(s=>{ studentBeds[s.name]={primary:[],shadow:[]}; });
  bedKeys.forEach(bedNum=>{
    const bed=beds[bedNum];
    (bed.assigned||[]).forEach(s=>{const n=typeof s==="object"?s.name:s;if(studentBeds[n])studentBeds[n].primary.push({bedNum,bed});});
    (bed.shadows||[]).forEach(s=>{const n=typeof s==="object"?s.name:s;if(studentBeds[n])studentBeds[n].shadow.push({bedNum,bed});});
  });

  const sorted = [...students].sort((a,b)=>{
    const ag=parseInt(a.group)||999, bg=parseInt(b.group)||999;
    return ag!==bg ? ag-bg : a.name.localeCompare(b.name);
  });

  if (students.length===0) return <div style={{textAlign:"center",padding:"60px 20px",color:C.textMuted,fontSize:"0.85rem"}}>No students added in setup.</div>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {sorted.map(s=>{
        const sb = studentBeds[s.name] || {primary:[],shadow:[]};
        const total = sb.primary.length + sb.shadow.length;
        const isOpen = selected===s.name;

        return (
          <div key={s.name}>
            <div onClick={()=>setSelected(isOpen?null:s.name)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"13px 14px",background:C.surface,
                border:`1px solid ${isOpen?`rgba(${rgb},0.35)`:"rgba(0,0,0,0.08)"}`,
                borderRadius:isOpen?"14px 14px 0 0":14,cursor:"pointer",userSelect:"none",
                boxShadow:isOpen?"none":"0 4px 14px rgba(0,0,0,0.07)",transition:"all 0.15s"}}>
              {/* Accent dot */}
              <div style={{width:8,height:8,borderRadius:"50%",background:theme,flexShrink:0}}/>
              {/* Group badge */}
              {s.group&&<span style={{fontSize:"0.58rem",color:C.textMuted,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:5,padding:"2px 6px",fontFamily:"monospace",flexShrink:0}}>{s.group}</span>}
              {/* Name */}
              <span style={{flex:1,fontSize:"0.9rem",color:C.text,fontWeight:isOpen?600:400}}>{s.name}</span>
              {/* Count chips — all in theme color */}
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                {sb.primary.length>0 && <span style={{fontSize:"0.65rem",fontWeight:600,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.25)`,color:theme,borderRadius:6,padding:"2px 7px"}}>{sb.primary.length}</span>}
                {sb.shadow.length>0  && <span style={{fontSize:"0.65rem",background:"rgba(0,0,0,0.04)",border:"1px dashed rgba(0,0,0,0.15)",color:C.textMuted,borderRadius:6,padding:"2px 7px"}}>{sb.shadow.length}s</span>}
                {total===0 && <span style={{fontSize:"0.65rem",color:C.textMuted}}>—</span>}
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)",flexShrink:0,marginLeft:4}}>
                <path d="M2 4l4 4 4-4" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {isOpen && (
              <div style={{background:C.surfaceEl,border:`1px solid rgba(${rgb},0.2)`,borderTop:"none",borderRadius:"0 0 14px 14px",padding:"12px 14px 14px"}}>
                {total===0
                  ? <div style={{color:C.textMuted,fontSize:"0.8rem",textAlign:"center",padding:"10px 0"}}>No beds assigned yet</div>
                  : <>
                      {sb.primary.length>0 && <>
                        <div style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500,marginBottom:8}}>Primary</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8,marginBottom:sb.shadow.length>0?12:0}}>
                          {sb.primary.map(({bedNum,bed})=><DefaultBedTileSmall key={bedNum} bedNum={bedNum} bed={bed} theme={theme} rgb={rgb} section={getBedSection?getBedSection(bedNum):null} onClick={onBedClick}/>)}
                        </div>
                      </>}
                      {sb.shadow.length>0 && <>
                        <div style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500,marginBottom:8}}>Shadow</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8}}>
                          {sb.shadow.map(({bedNum,bed})=><DefaultBedTileSmall key={bedNum} bedNum={bedNum} bed={bed} theme={theme} rgb={rgb} section={getBedSection?getBedSection(bedNum):null} muted onClick={onBedClick}/>)}
                        </div>
                      </>}
                    </>
                }
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Small bed tile used in Students tab expanded view (Paed-style) — clickable
function DefaultBedTileSmall({ bedNum, bed, theme, rgb, muted, section, onClick }) {
  const filled = bed.diagnosis||bed.consultant||bed.notes;
  const label = bed.isFloor ? "Floor" : section || "Bed";
  return (
    <div
      onClick={onClick ? ()=>onClick(bedNum,bed) : undefined}
      style={{
        background:C.surface,
        border: bed.historyTaken ? `1px solid rgba(${hexToRgb(C.green)},0.25)` : muted ? `1px dashed ${C.borderMid}` : `1px solid rgba(${rgb},0.22)`,
        borderRadius:12, padding:"10px 10px", position:"relative",
        boxShadow: filled ? "0 4px 14px rgba(0,0,0,0.07)" : "0 2px 8px rgba(0,0,0,0.05)",
        cursor: onClick ? "pointer" : "default",
        transition:"transform 0.12s, box-shadow 0.12s",
        userSelect:"none",
      }}
      onMouseEnter={onClick?e=>{e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,0.1)";}:undefined}
      onMouseLeave={onClick?e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=filled?"0 4px 14px rgba(0,0,0,0.07)":"0 2px 8px rgba(0,0,0,0.05)";}:undefined}
    >
      <div style={{position:"absolute",top:7,right:7,display:"flex",gap:3,alignItems:"center"}}>
        {bed.historyTaken&&<Icon name="history" size={10} color={C.green}/>}
        {bed.isNew&&<span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={9} color={C.red}/></span>}
      </div>
      <div style={{fontSize:"0.52rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:1}}>{label}</div>
      <div style={{fontSize:"1.1rem",fontWeight:700,color:muted?C.textMuted:theme,lineHeight:1,letterSpacing:"-0.03em",marginBottom:3}}>{splitBedKey(String(bedNum)).num}</div>
      {bed.consultant&&<div style={{fontSize:"0.56rem",color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:1}}>{bed.consultant}</div>}
      {bed.diagnosis&&<div style={{fontSize:"0.58rem",color:C.text,fontStyle:"italic",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bed.diagnosis}</div>}
      {bed.notes&&<div style={{fontSize:"0.55rem",color:C.textMuted,lineHeight:1.3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",marginTop:2}}>{bed.notes}</div>}
    </div>
  );
}

function BedPill({ bedNum, bed, type, rgb, theme }) {
  return (
    <div style={{background:type==="primary"?`rgba(${rgb},0.06)`:C.surfaceEl,border:`1px ${type==="primary"?"solid":"dashed"} ${type==="primary"?`rgba(${rgb},0.25)`:C.borderMid}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:"0.58rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500}}>{bed.isFloor?"Floor":"Bed"}</span>
          <span style={{fontSize:"1.1rem",fontWeight:700,color:theme,letterSpacing:"-0.03em"}}>{splitBedKey(String(bedNum)).num}</span>
          {type==="shadow"&&<span style={{fontSize:"0.6rem",color:C.textMuted,border:`1px dashed ${C.borderMid}`,borderRadius:4,padding:"1px 5px"}}>shadow</span>}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {bed.historyTaken&&<Icon name="history" size={12} color={C.green}/>}
          {bed.isNew&&<span style={{animation:"blink 1.2s ease-in-out infinite",display:"inline-flex"}}><Icon name="newdot" size={10} color={C.red}/></span>}
        </div>
      </div>
      {bed.diagnosis&&<div style={{fontSize:"0.76rem",color:C.text,fontStyle:"italic",marginBottom:2}}>{bed.diagnosis}</div>}
      {bed.consultant&&<div style={{fontSize:"0.72rem",color:C.textSub}}>{bed.consultant}</div>}
      {bed.notes&&<div style={{fontSize:"0.7rem",color:C.textMuted,marginTop:6,lineHeight:1.4,borderTop:`1px solid ${C.border}`,paddingTop:6}}>{bed.notes}</div>}
    </div>
  );
}

function AssignModal({ bedNum, students, currentAssigned, currentShadows, shadowHOs=[], theme, rgb, beds={}, onConfirm, onClose }) {
  const [assigned, setAssigned] = useState(currentAssigned);
  const [shadows,  setShadows]  = useState(currentShadows);
  const [blockedMsg, setBlockedMsg] = useState(null);

  const shadowHONames = new Set((shadowHOs||[]).map(h=>h.name).filter(Boolean));
  const sorted = [...students].sort((a,b)=>{const ag=parseInt(a.group)||999,bg=parseInt(b.group)||999;return ag!==bg?ag-bg:a.name.localeCompare(b.name);});
  const getName = s => typeof s==="object"?s.name:s;
  const getGroup = s => typeof s==="object"?s.group:"";
  const isAssigned = s => assigned.some(x=>getName(x)===getName(s));
  const isShadow   = s => shadows.some(x=>getName(x)===getName(s));
  const isShadowHO = s => shadowHONames.has(getName(s));

  // Count across all beds (excluding the current bed being assigned)
  const countPrimary = (name) => Object.entries(beds).filter(([k])=>k!==String(bedNum)).filter(([,b])=>(b.assigned||[]).some(x=>(typeof x==="object"?x.name:x)===name)).length;
  const countShadow  = (name) => Object.entries(beds).filter(([k])=>k!==String(bedNum)).filter(([,b])=>(b.shadows||[]).some(x=>(typeof x==="object"?x.name:x)===name)).length;

  const handlePrimary = (s) => {
    if (isShadowHO(s)) { setBlockedMsg("Shadow HOs cannot be assigned as primary"); setTimeout(()=>setBlockedMsg(null),2000); return; }
    if(isAssigned(s)){setAssigned([]);return;} setShadows(sh=>sh.filter(x=>getName(x)!==getName(s))); setAssigned([s]);
  };
  const handleShadow = (s) => {
    if (isShadowHO(s)) { setBlockedMsg("Shadow HOs cannot be shadow-assigned here"); setTimeout(()=>setBlockedMsg(null),2000); return; }
    if(isShadow(s)){setShadows([]);return;} setAssigned(a=>a.filter(x=>getName(x)!==getName(s))); setShadows([s]);
  };

  const eligible   = sorted.filter(s=>!isShadowHO(s));
  const hoStudents = sorted.filter(s=>isShadowHO(s));

  const Chip = ({ s, zone }) => {
    const ip=isAssigned(s), is=isShadow(s);
    const active = zone==="primary" ? ip : is;
    const isPrimary = zone==="primary";
    const accentColor = isPrimary ? theme : C.textSub;
    const accentRgb   = isPrimary ? rgb : hexToRgb("#3a3a44");
    const handler = isPrimary ? ()=>handlePrimary(s) : ()=>handleShadow(s);
    const grp = getGroup(s);
    const name = getName(s);
    const pCount = countPrimary(name);
    const sCount = countShadow(name);

    return (
      <div onClick={handler}
        style={{
          position:"relative", display:"flex", flexDirection:"column",
          alignItems:"center", justifyContent:"center", gap:3,
          padding:"12px 6px 10px", borderRadius:14, cursor:"pointer",
          textAlign:"center", transition:"all 0.12s", userSelect:"none",
          background: active ? `rgba(${accentRgb},0.08)` : C.surfaceEl,
          border: `1px solid ${active ? accentColor : C.border}`,
          boxShadow: active ? `0 0 0 1px ${accentColor}` : "none",
        }}>
        {active && (
          <div style={{position:"absolute",top:5,right:5,width:16,height:16,borderRadius:"50%",
            background:accentColor,display:"flex",alignItems:"center",justifyContent:"center"}}>
            <Icon name="check" size={9} color="#fff"/>
          </div>
        )}
        {grp && <span style={{fontSize:"0.58rem",color:active?accentColor:C.textMuted,fontFamily:"monospace",fontWeight:600,lineHeight:1}}>{grp}</span>}
        <span style={{fontSize:"0.78rem",fontWeight:active?700:500,color:active?accentColor:C.text,
          lineHeight:1.2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%",padding:"0 4px"}}>
          {name.split(" ")[0]}
        </span>
        {/* Count pills — primary solid, shadow dashed */}
        <div style={{display:"flex",gap:3,justifyContent:"center",flexWrap:"wrap",marginTop:1}}>
          {active
            ? <span style={{fontSize:"0.52rem",fontWeight:700,color:accentColor,letterSpacing:"0.02em"}}>{isPrimary?"primary":"shadow"}</span>
            : <>
                {pCount>0 && <span style={{fontSize:"0.58rem",fontWeight:600,color:theme,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.3)`,borderRadius:20,padding:"0px 5px",lineHeight:"16px"}}>{pCount}</span>}
                {sCount>0 && <span style={{fontSize:"0.58rem",fontWeight:500,color:C.textMuted,background:"rgba(0,0,0,0.03)",border:`1px dashed ${C.borderMid}`,borderRadius:20,padding:"0px 5px",lineHeight:"16px"}}>{sCount}s</span>}
                {!pCount&&!sCount && <span style={{fontSize:"0.6rem",color:C.border}}>—</span>}
              </>
          }
        </div>
      </div>
    );
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:"100%",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",maxHeight:"82vh",overflowY:"auto",boxShadow:"0 -4px 40px rgba(0,0,0,0.1)"}}>
        <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 18px"}}/>
        <h3 style={{margin:"0 0 4px",color:C.text,fontSize:"1.05rem",fontWeight:600}}>Assign Students — Bed {bedNum}</h3>
        <p style={{margin:"0 0 16px",fontSize:"0.74rem",color:C.textMuted}}>Tap to select one primary and one shadow.</p>

        {blockedMsg && (
          <div style={{background:`rgba(${hexToRgb(C.red)},0.08)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:"0.78rem",color:C.red,textAlign:"center"}}>
            {blockedMsg}
          </div>
        )}

        {sorted.length===0
          ? <p style={{color:C.textMuted,fontSize:"0.82rem",textAlign:"center",padding:"20px 0"}}>No students in setup.</p>
          : <>
              <div style={{marginBottom:20}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                  <span style={{fontSize:"0.65rem",color:theme,fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase"}}>Primary</span>
                  {assigned.length>0 && <span style={{fontSize:"0.62rem",color:C.textMuted,marginLeft:4}}>· {getName(assigned[0])}</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                  {eligible.map(s=><Chip key={getName(s)} s={s} zone="primary"/>)}
                </div>
              </div>
              <div style={{marginBottom:4}}>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                  <span style={{fontSize:"0.65rem",color:C.textSub,fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase"}}>Shadow</span>
                  {shadows.length>0 && <span style={{fontSize:"0.62rem",color:C.textMuted,marginLeft:4}}>· {getName(shadows[0])}</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                  {eligible.map(s=><Chip key={getName(s)} s={s} zone="shadow"/>)}
                </div>
              </div>
            </>
        }

        {hoStudents.length>0 && (
          <div style={{marginTop:14,padding:"8px 12px",background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:9,fontSize:"0.72rem",color:C.textMuted}}>
            <span style={{fontWeight:600}}>Shadow HOs (not assignable here):</span>{" "}
            {hoStudents.map(s=>getName(s)).join(", ")}
          </div>
        )}

        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={onClose} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontSize:"0.88rem",fontFamily:SF}}>Cancel</button>
          <button onClick={()=>onConfirm(assigned,shadows)} style={{flex:1,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontSize:"0.88rem",fontFamily:SF}}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

function Toast({ toast }) {
  return <div style={{position:"fixed",bottom:60,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?C.red:C.text,color:"#fff",borderRadius:12,padding:"9px 18px",fontSize:"0.82rem",zIndex:400,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",fontFamily:SF}}>{toast.msg}</div>;
}

// ══════════════════════════════════════════════════════════════════════════════
// PAED WARD VIEW
// ══════════════════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════════════════
// SURGERY WARD VIEW — bed-based + sections + shadow HO banner
// ══════════════════════════════════════════════════════════════════════════════
// ── Medicine helpers ──────────────────────────────────────────────────────────
const mkPatient = (overrides={}) => ({
  id: `pt_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
  label: "P1",
  patientName:"",
  diagnosis:"", notes:"", consultant:"", tags:[],
  assigned:[], shadows:[],
  historyTaken:false, isNew:false,
  ...overrides
});

const migrateBed = (bed) => {
  if (!bed) return bed;
  if (Array.isArray(bed.patients) && bed.patients.length > 0) return bed;
  const patients = [];
  if (bed.dualPatient) {
    patients.push(mkPatient({ label:"L", diagnosis:bed.diagnosisL||"", notes:bed.notesL||"", consultant:bed.consultantL||"", tags:bed.tagsL||[], assigned:bed.assignedL||[], shadows:bed.shadowsL||[], historyTaken:!!bed.historyTaken, isNew:!!bed.isNew }));
    patients.push(mkPatient({ label:"R", diagnosis:bed.diagnosisR||"", notes:bed.notesR||"", consultant:bed.consultantR||"", tags:bed.tagsR||[], assigned:bed.assignedR||[], shadows:bed.shadowsR||[], historyTaken:false, isNew:false }));
  } else if (bed.diagnosis||bed.consultant||bed.notes||(bed.assigned||[]).length>0||(bed.shadows||[]).length>0) {
    patients.push(mkPatient({ label:"P1", diagnosis:bed.diagnosis||"", notes:bed.notes||"", consultant:bed.consultant||"", tags:bed.tags||[], assigned:bed.assigned||[], shadows:bed.shadows||[], historyTaken:!!bed.historyTaken, isNew:!!bed.isNew }));
  }
  return { ...bed, patients };
};

// ── Medicine Ward View ────────────────────────────────────────────────────────
function MedicineWardView({ wardId, ward, onBack, saveWard, onDelete, showToast, seniorMode }) {
  const [isLeader,   setIsLeader]   = useState(false);
  const [pinInput,   setPinInput]   = useState("");
  const [pinError,   setPinError]   = useState(false);
  const [showPin,    setShowPin]    = useState(false);
  const [view,       setView]       = useState("home");
  const [activeTab,  setActiveTab]  = useState("ward");
  const [selectedBed,setSelectedBed]= useState(null);
  const [bedEdit,    setBedEdit]    = useState({ patients:[], activePtId:null });
  const [assignModal,setAssignModal]= useState(null);
  const [editMode,   setEditMode]   = useState(false);
  const [showReset,  setShowReset]  = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showChangeBed, setShowChangeBed] = useState(false);
  const [showDeleteBedConfirm, setShowDeleteBedConfirm] = useState(false);
  const [shadowEditing, setShadowEditing] = useState(false);
  const [shadowForm, setShadowForm] = useState(null);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [setupForm,  setSetupForm]  = useState({});

  const setup  = ward.setup || {};
  const sections  = setup.wardSections || [];
  const rawBeds = migrateDefaultBeds(ward.beds, sections);
  const beds   = Object.fromEntries(Object.entries(rawBeds).map(([k,v])=>[k, migrateBed(v)||{patients:[]}]));
  const theme  = setup.themeColor || "#007aff";
  const rgb    = hexToRgb(theme);
  const shadowHOs = setup.shadowHOs || [];
  const consultants = setup.consultants || [];
  const students  = (setup.students || []).map(s=>typeof s==="object"?s:{name:s,group:""});

  // Look up group string for a student name
  const getMedGroup = (name) => students.find(s=>s.name===name)?.group||"";

  const save = useCallback(async (newWard) => { await saveWard(newWard); }, [saveWard]);

  const tryPin = () => {
    if (isLeaderPin(pinInput, wardId)) { setIsLeader(true); setShowPin(false); setPinInput(""); showToast("Leader access granted"); }
    else { setPinError(true); setTimeout(()=>setPinError(false),1500); }
  };

  const updateBed = async (bedNum, updates) => {
    await save({ ...ward, beds:{ ...rawBeds, [bedNum]:{ ...(rawBeds[bedNum]||{}), ...updates } } });
  };

  const saveBedEdit = async (bedNum) => {
    await updateBed(bedNum, { patients: bedEdit.patients });
  };

  const updateActivePt = (field, value) => {
    setBedEdit(be => ({ ...be, patients: be.patients.map(p => p.id===be.activePtId ? {...p, [field]:value} : p) }));
  };

  const addPatientSlot = () => {
    setBedEdit(be => {
      const nextLabel = `P${be.patients.length+1}`;
      const np = mkPatient({ label:nextLabel });
      return { patients:[...be.patients, np], activePtId:np.id };
    });
  };

  const removePatientSlot = (ptId) => {
    setBedEdit(be => {
      const pts = be.patients.filter(p=>p.id!==ptId);
      const relabeled = pts.map((p,i) => /^P\d+$/.test(p.label) ? {...p, label:`P${i+1}`} : p);
      return { patients:relabeled, activePtId: relabeled.length>0 ? relabeled[Math.max(0,relabeled.length-1)].id : null };
    });
  };

  const addFloorPatient = async () => {
    const b = { ...rawBeds };
    const floorKeys = Object.keys(b).filter(k=>b[k]?.isFloor);
    const key = `F${floorKeys.length+1}`;
    const p = mkPatient({ label:"P1", isNew:true });
    b[key] = { patients:[p], isFloor:true, specialBedSection:"" };
    await save({ ...ward, beds:b });
    showToast("Floor patient added");
  };

  const clearBed = async (bedNum) => {
    const existing = rawBeds[bedNum] || {};
    await updateBed(bedNum, { patients:[], isFloor:existing.isFloor||false, specialBedSection:existing.specialBedSection||"" });
    setBedEdit({ patients:[], activePtId:null });
    setShowClearConfirm(false); showToast("Bed cleared");
  };

  const getWeekKey = (date=new Date()) => {
    const y=date.getFullYear(), start=new Date(y,0,1);
    return `${y}-W${String(Math.ceil(((date-start)/86400000+start.getDay()+1)/7)).padStart(2,"0")}`;
  };

  const archiveBed = async (bedNum) => {
    const bed = beds[bedNum];
    const weekKey = getWeekKey();
    const archive = ward.archive||{};
    const weekArchive = archive[weekKey]||{};
    weekArchive[bedNum] = { ...bed, archivedAt: new Date().toISOString() };
    const cleared = { patients:[], isFloor:false, specialBedSection:bed.specialBedSection||"" };
    await save({ ...ward, beds:{ ...rawBeds, [bedNum]:cleared }, archive:{ ...archive, [weekKey]:weekArchive } });
    setView("home"); setSelectedBed(null); showToast("Bed archived");
  };

  const restoreBed = async (weekKey, archivedBedNum, targetBedNum) => {
    const toBed = targetBedNum||archivedBedNum;
    const archivedBed = (ward.archive||{})[weekKey]?.[archivedBedNum];
    if (!archivedBed) return;
    const { archivedAt, ...restoredData } = archivedBed;
    const archive = { ...(ward.archive||{}) };
    const weekArchive = { ...archive[weekKey] };
    delete weekArchive[archivedBedNum];
    if (Object.keys(weekArchive).length===0) delete archive[weekKey];
    else archive[weekKey] = weekArchive;
    await save({ ...ward, beds:{ ...rawBeds, [toBed]:restoredData }, archive });
    showToast(`Restored to Bed ${toBed}`);
  };

  const deleteArchivedBed = async (weekKey, bedNum) => {
    const archive = { ...(ward.archive||{}) };
    const weekArchive = { ...(archive[weekKey]||{}) };
    delete weekArchive[bedNum];
    if (Object.keys(weekArchive).length===0) delete archive[weekKey];
    else archive[weekKey] = weekArchive;
    await save({ ...ward, archive });
    showToast("Archived record deleted");
  };

  const changeBedNumber = async (fromBed, toBed) => {
    const bedData = { ...beds[fromBed] };
    const cleared = { patients:[], isFloor:false, specialBedSection:"" };
    await save({ ...ward, beds:{ ...rawBeds, [fromBed]:cleared, [toBed]:bedData } });
    setShowChangeBed(false); setView("home"); setSelectedBed(null); showToast(`Moved to Bed ${toBed}`);
  };
  const deleteBed = async (bedNum) => {
    const rest = { ...rawBeds };
    delete rest[bedNum];
    await save({ ...ward, beds: rest });
    setShowDeleteBedConfirm(false); setView("home"); setSelectedBed(null); showToast("Bed deleted");
  };

  const saveShadowHOs = async (newHOs) => {
    await save({ ...ward, setup:{ ...setup, shadowHOs:newHOs } });
    setShadowEditing(false); showToast("Shadow HO posts updated");
  };

  const sectionOrderIndex = (secName) => { const i = sections.findIndex(s=>s.name===secName); return i===-1?999:i; };
  const bedKeys = Object.keys(beds).sort((a,b)=>{
    const A = splitBedKey(a), B = splitBedKey(b);
    const aFloor = beds[a]?.isFloor, bFloor = beds[b]?.isFloor;
    if (aFloor && !bFloor) return 1; if (!aFloor && bFloor) return -1;
    if (A.section && B.section) {
      if (A.section !== B.section) return sectionOrderIndex(A.section)-sectionOrderIndex(B.section);
      const an=Number(A.num), bn=Number(B.num);
      if (!isNaN(an)&&!isNaN(bn)) return an-bn;
      return A.num.localeCompare(B.num);
    }
    if (A.section && !B.section) return -1;
    if (!A.section && B.section) return 1;
    const af=isNaN(a),bf=isNaN(b);
    if(af&&!bf) return 1; if(!af&&bf) return -1;
    if(!af&&!bf) return Number(a)-Number(b);
    return a.localeCompare(b);
  });

  const getBedSection = (bedNum) => {
    if (beds[bedNum]?.specialBedSection) return beds[bedNum].specialBedSection;
    const { section } = splitBedKey(String(bedNum));
    return section;
  };

  const filteredBedKeys = sectionFilter==="all" ? bedKeys : bedKeys.filter(k=>{
    if (beds[k]?.isFloor) return sectionFilter==="floor";
    const sec = getBedSection(k);
    return sec===sectionFilter || (!sec && sectionFilter==="other");
  });

  const allPatients = bedKeys.flatMap(k=>(beds[k]?.patients||[]));
  const stats = {
    newPt:        allPatients.filter(p=>p.isNew).length,
    historyTaken: allPatients.filter(p=>p.historyTaken).length,
    total:        allPatients.length,
    floor:        bedKeys.filter(k=>beds[k]?.isFloor).length,
  };

  const selBed = selectedBed ? beds[selectedBed] : null;
  const activePt = bedEdit.patients.find(p=>p.id===bedEdit.activePtId) || null;

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:SF}}>
      {/* Header */}
      <div style={{background:"rgba(245,245,247,0.88)",borderBottom:`1px solid ${C.border}`,padding:"12px 18px",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",padding:0}}><Icon name="back" size={18} color={C.textSub}/></button>
            <div>
              <div style={{fontSize:"0.72rem",fontWeight:600,color:C.text}}>{setup.wardName}</div>
              <div style={{fontSize:"1.2rem",color:C.textSub,marginTop:-4,fontWeight:400,letterSpacing:"-0.02em",lineHeight:1.15}}>{setup.appointmentType}</div>
              <div style={{fontSize:"0.6rem",color:C.textMuted,marginTop:1,fontWeight:500,letterSpacing:"0.04em",textTransform:"uppercase"}}>Medicine</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {!seniorMode&&(isLeader
              ?<span style={{background:theme,color:"#fff",fontSize:"0.62rem",fontWeight:600,padding:"4px 10px",borderRadius:20}}>LEADER</span>
              :<button onClick={()=>setShowPin(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.surface,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:20,padding:"5px 12px",fontSize:"0.72rem",cursor:"pointer",fontFamily:SF,boxShadow:C.shadow}}><Icon name="key" size={12} color={C.textSub}/> Login</button>
            )}
            {seniorMode&&<span style={{fontSize:"0.62rem",fontWeight:600,color:"#007aff",background:"rgba(0,122,255,0.08)",border:"1px solid rgba(0,122,255,0.2)",borderRadius:20,padding:"4px 10px"}}>READ ONLY</span>}
            {isLeader&&!seniorMode&&<button onClick={()=>{ setSetupForm({ wardName:setup.wardName||"", appointmentType:setup.appointmentType||"", themeColor:setup.themeColor||"#007aff", students:(setup.students||[{name:"",group:""}]).map(s=>({...s})), consultants:(setup.consultants||[{name:"",color:"#6366f1"}]).map(c=>({...c})), wardSections:(setup.wardSections||[]).map(s=>({...s})), shadowHOs:(setup.shadowHOs||[{post:"Shadow HO 1",name:""},{post:"Shadow HO 2",name:""},{post:"Shadow HO 3",name:""}]).map(h=>({...h})), specialBeds:(setup.specialBeds||[]).map(b=>({...b})), customTags:(setup.customTags||[]).map(t=>({...t})) }); setEditMode(true); }} style={{display:"flex",alignItems:"center",justifyContent:"center",background:C.surface,border:`1px solid ${C.border}`,color:C.textMuted,borderRadius:50,width:32,height:32,cursor:"pointer",boxShadow:C.shadow}}><Icon name="settings" size={14} color={C.textMuted}/></button>}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{borderBottom:`1px solid ${C.border}`,background:"rgba(245,245,247,0.88)",position:"sticky",top:"53px",zIndex:49,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",padding:"0 16px"}}>
          {[{id:"ward",label:"Ward"},...(!seniorMode?[{id:"students",label:"Students"}]:[]),{id:"archive",label:"Archive"}].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:"11px 16px",fontSize:"0.8rem",fontWeight:500,fontFamily:SF,background:"none",border:"none",cursor:"pointer",color:activeTab===t.id?theme:C.textMuted,borderBottom:activeTab===t.id?`2px solid ${theme}`:"2px solid transparent",marginBottom:"-1px",transition:"color 0.15s"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"16px 16px 100px"}}>

        {activeTab==="ward" && <>

          {/* Shadow HO Banner */}
          {shadowHOs.length>0 && (
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 16px",marginBottom:16,boxShadow:C.shadow}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:"0.65rem",fontWeight:600,color:C.textMuted,letterSpacing:"0.05em",textTransform:"uppercase"}}>Shadow HO Posts · 3-day rotation</span>
                {isLeader&&!seniorMode&&<button onClick={()=>{setShadowForm(shadowHOs.map(h=>({...h})));setShadowEditing(true);}} style={{background:"none",border:"none",color:theme,fontSize:"0.72rem",cursor:"pointer",fontFamily:SF,fontWeight:500}}>Edit</button>}
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {shadowHOs.map((ho,i)=>{
                  const ptCount = allPatients.filter(p=>(p.shadows||[]).some(s=>(typeof s==="object"?s.name:s)===ho.name)).length;
                  return (
                    <div key={i} style={{flex:1,minWidth:100,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px"}}>
                      <div style={{fontSize:"0.6rem",color:C.textMuted,fontWeight:500,marginBottom:2}}>{ho.post}</div>
                      <div style={{fontSize:"0.82rem",fontWeight:600,color:ho.name?C.text:C.textMuted}}>{ho.name||"Unassigned"}</div>
                      {ho.name&&<div style={{fontSize:"0.6rem",color:C.textMuted,marginTop:2}}>{ptCount}pt</div>}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
            {[
              {icon:"ward",    color:theme,    label:"Patients",  val:stats.total},
              {icon:"newdot",  color:C.red,    label:"New",       val:stats.newPt},
              {icon:"history", color:C.green,  label:"Hx taken",  val:`${stats.historyTaken}/${stats.total}`},
            ].map(s=>(
              <div key={s.label} style={{background:C.surface,border:"1px solid rgba(0,0,0,0.08)",borderRadius:14,padding:"12px 10px",textAlign:"center",boxShadow:"0 4px 14px rgba(0,0,0,0.07)"}}>
                <div style={{display:"flex",justifyContent:"center",marginBottom:5}}><Icon name={s.icon} size={14} color={s.color}/></div>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:s.color,letterSpacing:"-0.04em"}}>{s.val}</div>
                <div style={{fontSize:"0.6rem",color:C.textSub,marginTop:2,letterSpacing:"0.04em",textTransform:"uppercase",fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Section filter pills */}
          {sections.length>0 && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {["all",...sections.map(s=>s.name),...(stats.floor>0?["floor"]:[])].map(sec=>(
                <button key={sec} onClick={()=>setSectionFilter(sec)}
                  style={{padding:"5px 12px",borderRadius:20,fontSize:"0.74rem",fontWeight:sectionFilter===sec?600:400,cursor:"pointer",fontFamily:SF,
                    background:sectionFilter===sec?theme:C.surface,
                    border:`1px solid ${sectionFilter===sec?theme:C.border}`,
                    color:sectionFilter===sec?"#fff":C.textSub}}>
                  {sec==="all"?"All Beds":sec}
                </button>
              ))}
            </div>
          )}

          {/* Leader actions */}
          {isLeader&&!seniorMode&&(
            <button onClick={addFloorPatient} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:"11px",fontSize:"0.84rem",marginBottom:16,background:C.surface,border:`1px solid ${C.border}`,color:theme,borderRadius:12,cursor:"pointer",fontFamily:SF,fontWeight:500,boxShadow:C.shadow}}>
              <Icon name="floor" size={14} color={theme}/> Add Floor Patient
            </button>
          )}

          {/* Bed grid — uniform tile size, one per patient; empty beds = same size tile */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:8}}>
            {filteredBedKeys.flatMap(bedNum=>{
              const bed = beds[bedNum];
              const pts = bed.patients || [];
              const secName = getBedSection(bedNum);
              const isMulti = pts.length > 1;

              const openBed = (ptId) => {
                if (seniorMode) return;
                const initPts = pts.map(p=>({...p,assigned:[...(p.assigned||[])],shadows:[...(p.shadows||[])],tags:[...(p.tags||[])]}));
                setSelectedBed(bedNum);
                setBedEdit({ patients:initPts, activePtId:ptId||( initPts.length>0?initPts[0].id:null) });
                setView("bed");
              };

              const addAndOpen = (e) => {
                e.stopPropagation();
                const initPts = pts.map(p=>({...p,assigned:[...(p.assigned||[])],shadows:[...(p.shadows||[])],tags:[...(p.tags||[])]}));
                const nextLabel = `P${initPts.length+1}`;
                const np = mkPatient({ label:nextLabel });
                setSelectedBed(bedNum);
                setBedEdit({ patients:[...initPts,np], activePtId:np.id });
                setView("bed");
              };

              // Empty bed — single tile matching patient tile size
              if (pts.length === 0) {
                return [(
                  <div key={bedNum} onClick={()=>openBed(null)}
                    style={{background:C.surface,border:`1px solid rgba(0,0,0,0.07)`,borderRadius:13,
                      padding:"11px 12px",cursor:seniorMode?"default":"pointer",
                      display:"flex",flexDirection:"column",justifyContent:"flex-end",
                      minHeight:72,position:"relative",
                      boxShadow:"0 1px 4px rgba(0,0,0,0.04)",
                      opacity:0.55,transition:"opacity 0.12s,box-shadow 0.12s"}}
                    onMouseEnter={e=>{if(!seniorMode){e.currentTarget.style.opacity="1";e.currentTarget.style.boxShadow="0 4px 14px rgba(0,0,0,0.08)";}}}
                    onMouseLeave={e=>{e.currentTarget.style.opacity="0.55";e.currentTarget.style.boxShadow="0 1px 4px rgba(0,0,0,0.04)";}}>
                    <span style={{fontSize:"0.5rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,lineHeight:1}}>{bed.isFloor?"Floor":secName||"Bed"}</span>
                    <span style={{fontSize:"1.3rem",fontWeight:700,color:`rgba(${rgb},0.35)`,letterSpacing:"-0.03em",lineHeight:1.1}}>{splitBedKey(String(bedNum)).num}</span>
                  </div>
                )];
              }

              // Patient tiles — one per slot
              return pts.map((pt,pi)=>{
                const cObj = pt.consultant ? consultants.find(c=>(typeof c==="object"?c.name:c)===pt.consultant) : null;
                const cRgb = cObj?.color ? hexToRgb(cObj.color) : null;
                const aN=(pt.assigned||[]).map(s=>typeof s==="object"?s.name:s);
                const sN=(pt.shadows||[]).map(s=>typeof s==="object"?s.name:s);
                const hasAssigned = aN.length>0||sN.length>0;
                const isFirst = pi===0;
                const isLast = pi===pts.length-1;
                const tileBoxShadow = cRgb
                  ? `0 4px 14px rgba(${cRgb},0.1),0 1px 3px rgba(0,0,0,0.05)`
                  : "0 2px 8px rgba(0,0,0,0.06),0 1px 2px rgba(0,0,0,0.04)";
                return (
                  <div key={pt.id}
                    onClick={()=>openBed(pt.id)}
                    style={{
                      background:cRgb?`rgba(${cRgb},0.06)`:C.surface,
                      border:pt.historyTaken
                        ?`1px solid rgba(${hexToRgb(C.green)},0.28)`
                        :cRgb?`1px solid rgba(${cRgb},0.2)`
                        :`1px solid rgba(0,0,0,0.09)`,
                      borderRadius:13,
                      padding:"11px 12px",
                      cursor:seniorMode?"default":"pointer",
                      position:"relative",
                      transition:"transform 0.12s,box-shadow 0.12s",
                      boxShadow:tileBoxShadow,
                      userSelect:"none",
                    }}
                    onMouseEnter={e=>{if(!seniorMode){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 22px rgba(0,0,0,0.1)";}}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=tileBoxShadow;}}
                  >
                    {/* Bed number row — shown on first tile; + button top-right for leaders */}
                    {isFirst&&(
                      <div style={{display:"flex",alignItems:"center",gap:4,marginBottom:isMulti?4:3}}>
                        <span style={{fontSize:"0.5rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,lineHeight:1,flexShrink:0}}>{bed.isFloor?"Floor":secName||"Bed"}</span>
                        <span style={{fontSize:"1.1rem",fontWeight:700,color:theme,letterSpacing:"-0.03em",lineHeight:1}}>{splitBedKey(String(bedNum)).num}</span>
                        {isLeader&&!seniorMode&&(
                          <button
                            onClick={addAndOpen}
                            style={{marginLeft:"auto",width:18,height:18,borderRadius:5,border:`1px solid rgba(${rgb},0.3)`,background:`rgba(${rgb},0.08)`,color:theme,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,padding:0,lineHeight:1,fontSize:"0.75rem",fontWeight:700,fontFamily:SF}}>
                            +
                          </button>
                        )}
                        {/* Status icons sit next to + (or at right if no +) */}
                        {(!isLeader||seniorMode)&&(
                          <div style={{marginLeft:"auto",display:"flex",gap:3,alignItems:"center"}}>
                            {pt.historyTaken&&<Icon name="history" size={10} color={C.green}/>}
                            {pt.isNew&&<span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={9} color={C.red}/></span>}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Status icons for non-first tiles (multi-patient), or inline for leader first tiles */}
                    {isFirst&&isLeader&&!seniorMode&&(pt.historyTaken||pt.isNew)&&(
                      <div style={{display:"flex",gap:3,alignItems:"center",marginBottom:2}}>
                        {pt.historyTaken&&<Icon name="history" size={10} color={C.green}/>}
                        {pt.isNew&&<span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={9} color={C.red}/></span>}
                      </div>
                    )}
                    {!isFirst&&(pt.historyTaken||pt.isNew)&&(
                      <div style={{display:"flex",gap:3,alignItems:"center",marginBottom:2}}>
                        {pt.historyTaken&&<Icon name="history" size={10} color={C.green}/>}
                        {pt.isNew&&<span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={9} color={C.red}/></span>}
                      </div>
                    )}

                    {/* Slot label — only on non-first tiles of multi-patient beds */}
                    {!isFirst&&isMulti&&(
                      <div style={{display:"inline-flex",marginBottom:4,background:`rgba(${rgb},0.09)`,border:`1px solid rgba(${rgb},0.16)`,borderRadius:4,padding:"1px 6px"}}>
                        <span style={{fontSize:"0.5rem",fontWeight:700,color:theme}}>{pt.label||`P${pi+1}`}</span>
                      </div>
                    )}

                    {/* Multi-patient slot label on first tile */}
                    {isFirst&&isMulti&&(
                      <div style={{display:"inline-flex",marginBottom:4,background:`rgba(${rgb},0.09)`,border:`1px solid rgba(${rgb},0.16)`,borderRadius:4,padding:"1px 6px"}}>
                        <span style={{fontSize:"0.5rem",fontWeight:700,color:theme}}>{pt.label||`P${pi+1}`}</span>
                      </div>
                    )}

                    {/* Patient name */}
                    {pt.patientName&&(
                      <div style={{fontSize:"0.72rem",fontWeight:600,color:C.text,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.patientName}</div>
                    )}

                    {/* Consultant dot + name */}
                    {pt.consultant&&(
                      <div style={{fontSize:"0.6rem",color:cRgb?`rgb(${cRgb})`:C.textSub,fontWeight:500,marginBottom:2,display:"flex",alignItems:"center",gap:4}}>
                        {cRgb&&<div style={{width:5,height:5,borderRadius:"50%",background:`rgb(${cRgb})`,flexShrink:0}}/>}
                        {pt.consultant}
                      </div>
                    )}

                    {/* Diagnosis */}
                    {pt.diagnosis&&(
                      <div style={{fontSize:"0.63rem",color:C.text,fontStyle:"italic",fontWeight:500,marginBottom:2,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.diagnosis}</div>
                    )}

                    {/* Notes */}
                    {pt.notes&&(
                      <div style={{fontSize:"0.6rem",color:C.textSub,marginBottom:3,overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",lineHeight:1.35}}>{pt.notes}</div>
                    )}

                    {/* Custom tags */}
                    {(pt.tags||[]).length>0&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:2,marginBottom:3}}>
                        {(pt.tags||[]).map(t=>{const tag=(setup.customTags||[]).find(ct=>ct.label===t);return tag?<span key={t} style={{fontSize:"0.48rem",fontWeight:700,padding:"1px 5px",borderRadius:4,background:`rgba(${hexToRgb(tag.color)},0.12)`,color:tag.color,border:`1px solid rgba(${hexToRgb(tag.color)},0.25)`}}>{t}</span>:null;})}
                      </div>
                    )}

                    {/* Assigned chips */}
                    {!seniorMode&&hasAssigned&&(
                      <div style={{display:"flex",flexWrap:"wrap",gap:2,marginTop:3}}>
                        {aN.map((n,i)=>{const g=getMedGroup(n);return<span key={i} style={{fontSize:"0.52rem",background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.18)`,borderRadius:4,padding:"1px 5px",color:theme,fontWeight:500,display:"inline-flex",alignItems:"baseline",gap:"1px"}}>{n.split(" ")[0]}{g?<sup style={{fontSize:"0.45em",fontWeight:700,opacity:0.75}}>{g}</sup>:null}</span>;})}
                        {sN.map((n,i)=>{const g=getMedGroup(n);return<span key={i} style={{fontSize:"0.52rem",background:"rgba(0,0,0,0.03)",border:"1px dashed rgba(0,0,0,0.12)",borderRadius:4,padding:"1px 5px",color:C.textMuted,display:"inline-flex",alignItems:"baseline",gap:"1px"}}>{n.split(" ")[0]}{g?<sup style={{fontSize:"0.45em",fontWeight:700,opacity:0.6}}>{g}</sup>:null}</span>;})}
                      </div>
                    )}
                  </div>
                );
              });
            })}
          </div>
        </>}

        {activeTab==="students"&&!seniorMode&&<MedStudentsTab beds={beds} bedKeys={bedKeys} students={setup.students||[]} theme={theme} rgb={rgb}/>}
        {activeTab==="archive"&&<MedArchiveTab archive={ward.archive||{}} beds={beds} theme={theme} rgb={rgb} onRestore={restoreBed} onDelete={deleteArchivedBed}/>}
      </div>

      {/* Bed detail sheet */}
      {!seniorMode&&view==="bed"&&selectedBed&&selBed&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:100,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>{if(e.target===e.currentTarget){setView("home");setSelectedBed(null);setShowClearConfirm(false);setShowChangeBed(false);}}}>
          <div style={{width:"100%",maxHeight:"92vh",overflowY:"auto",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",boxShadow:"0 -4px 40px rgba(0,0,0,0.12)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 18px"}}/>

            {/* Bed header */}
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
              <div>
                <div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:500}}>{selBed.isFloor?"Floor Patient":getBedSection(selectedBed)||"Bed"}</div>
                <h2 style={{margin:"3px 0 0",fontSize:"2rem",fontWeight:700,color:theme,letterSpacing:"-0.04em"}}>{splitBedKey(String(selectedBed)).num}</h2>
              </div>
              <div style={{display:"flex",gap:6,alignItems:"center",marginTop:4}}>
                {selBed.isFloor&&<button onClick={async()=>{const b={...rawBeds};delete b[selectedBed];await save({...ward,beds:b});setView("home");setSelectedBed(null);showToast("Floor patient removed");}} style={{display:"flex",alignItems:"center",justifyContent:"center",background:`rgba(${hexToRgb(C.red)},0.07)`,border:`1px solid ${C.red}`,color:C.red,borderRadius:10,padding:"8px 10px",fontSize:"0.78rem",cursor:"pointer"}}><Icon name="close" size={13} color={C.red}/></button>}
                <button onClick={()=>{setView("home");setSelectedBed(null);setShowClearConfirm(false);setShowChangeBed(false);}} style={{background:C.surfaceEl,border:"none",color:C.textSub,borderRadius:50,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="close" size={13} color={C.textSub}/></button>
              </div>
            </div>

            {/* Patient tab bar */}
            {bedEdit.patients.length>0&&(
              <div style={{display:"flex",gap:0,marginBottom:16,background:C.surfaceEl,borderRadius:12,padding:3,overflowX:"auto"}}>
                {bedEdit.patients.map((pt,pi)=>{
                  const isAct = pt.id===bedEdit.activePtId;
                  return (
                    <button key={pt.id} onClick={()=>setBedEdit(be=>({...be,activePtId:pt.id}))}
                      style={{flex:"0 0 auto",padding:"7px 12px",borderRadius:9,fontSize:"0.8rem",fontWeight:isAct?700:400,cursor:"pointer",fontFamily:SF,border:"none",
                        background:isAct?C.surface:"transparent",color:isAct?theme:C.textSub,
                        boxShadow:isAct?C.shadow:"none",transition:"all 0.15s",display:"flex",alignItems:"center",gap:5,maxWidth:130}}>
                      <span style={{display:"inline-flex",alignItems:"center",justifyContent:"center",minWidth:17,height:17,borderRadius:5,fontSize:"0.52rem",fontWeight:700,padding:"0 4px",background:isAct?`rgba(${rgb},0.15)`:"rgba(0,0,0,0.06)",color:isAct?theme:C.textMuted,flexShrink:0}}>{pt.label||`P${pi+1}`}</span>
                      {pt.patientName&&<span style={{fontSize:"0.72rem",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.patientName.split(" ")[0]}</span>}
                      {pt.historyTaken&&<Icon name="history" size={10} color={C.green}/>}
                      {pt.isNew&&<Icon name="newdot" size={9} color={C.red}/>}
                    </button>
                  );
                })}
                {isLeader&&<button onClick={addPatientSlot} style={{flex:"0 0 auto",padding:"7px 12px",borderRadius:9,fontSize:"0.8rem",cursor:"pointer",fontFamily:SF,border:"none",background:"transparent",color:theme,display:"flex",alignItems:"center",gap:4,fontWeight:500}}>
                  <Icon name="plus" size={12} color={theme}/> Add
                </button>}
              </div>
            )}

            {/* Empty state */}
            {bedEdit.patients.length===0&&isLeader&&(
              <button onClick={addPatientSlot} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:"14px",fontSize:"0.88rem",marginBottom:16,background:`rgba(${rgb},0.06)`,border:`1px dashed rgba(${rgb},0.3)`,color:theme,borderRadius:13,cursor:"pointer",fontFamily:SF,fontWeight:500}}>
                <Icon name="plus" size={14} color={theme}/> Add Patient to this Bed
              </button>
            )}
            {bedEdit.patients.length===0&&!isLeader&&(
              <div style={{textAlign:"center",padding:"20px 0",color:C.textMuted,fontSize:"0.82rem"}}>No patients assigned to this bed.</div>
            )}

            {/* Active patient editor */}
            {activePt&&(
              <div>
                {/* Label + Remove row */}
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:12}}>
                  <div style={{flex:1}}>
                    <label style={labelStyle}>Slot Label</label>
                    <input value={activePt.label||""} onChange={e=>updateActivePt("label",e.target.value)}
                      placeholder="e.g. P1, Left, Bed A…" style={{...iS,marginTop:4,width:"100%",boxSizing:"border-box"}}/>
                  </div>
                  {isLeader&&bedEdit.patients.length>1&&(
                    <button onClick={()=>removePatientSlot(activePt.id)}
                      style={{alignSelf:"flex-end",background:`rgba(${hexToRgb(C.red)},0.06)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,color:C.red,borderRadius:10,padding:"10px 12px",cursor:"pointer",fontSize:"0.75rem",fontFamily:SF,whiteSpace:"nowrap"}}>
                      Remove
                    </button>
                  )}
                </div>

                {/* Patient name — optional */}
                <div style={{marginBottom:16}}>
                  <label style={labelStyle}>Patient Name <span style={{color:C.textMuted,fontWeight:400,textTransform:"none",letterSpacing:0}}>(optional)</span></label>
                  <input value={activePt.patientName||""} onChange={e=>updateActivePt("patientName",e.target.value)}
                    placeholder="e.g. Perera M.T." style={{...iS,marginTop:4,width:"100%",boxSizing:"border-box"}}/>
                </div>

                {isLeader&&(
                  <button onClick={()=>setAssignModal({bed:selectedBed,ptId:activePt.id})}
                    style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,width:"100%",padding:"11px",fontSize:"0.84rem",marginBottom:16,background:theme,border:"none",color:"#fff",borderRadius:12,cursor:"pointer",fontFamily:SF,fontWeight:600,boxShadow:`0 4px 14px rgba(${rgb},0.3)`}}>
                    <Icon name="user" size={14} color="#fff"/> Assign Students to {activePt.label||"Patient"}
                  </button>
                )}

                {((activePt.assigned||[]).length>0||(activePt.shadows||[]).length>0)&&(
                  <div style={{marginBottom:16,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 12px"}}>
                    <div style={{fontSize:"0.62rem",color:C.textMuted,marginBottom:8,letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:500}}>Assigned</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                      {(activePt.assigned||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;const g=typeof s==="object"?s.group:getMedGroup(n);return<span key={i} style={{display:"flex",alignItems:"center",gap:5,background:`rgba(${rgb},0.09)`,border:`1px solid rgba(${rgb},0.2)`,color:theme,borderRadius:8,padding:"5px 10px",fontSize:"0.78rem",fontWeight:500}}><Icon name="user" size={11} color={theme}/>{n}{g&&<sup style={{fontSize:"0.6em",fontWeight:700,marginLeft:"2px",opacity:0.7}}>{g}</sup>}</span>;})}
                      {(activePt.shadows||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;const g=typeof s==="object"?s.group:getMedGroup(n);return<span key={i} style={{display:"flex",alignItems:"center",gap:5,background:C.surfaceEl,border:`1px dashed ${C.borderMid}`,color:C.textSub,borderRadius:8,padding:"5px 10px",fontSize:"0.78rem"}}><Icon name="shadow" size={11} color={C.textMuted}/>{n}{g&&<sup style={{fontSize:"0.6em",fontWeight:700,marginLeft:"2px",opacity:0.6}}>{g}</sup>} <span style={{fontSize:"0.65rem",color:C.textMuted}}>(shadow)</span></span>;})}
                    </div>
                  </div>
                )}

                <div style={{display:"flex",gap:8,marginBottom:14}}>
                  <div onClick={()=>updateActivePt("isNew",!activePt.isNew)}
                    style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"11px 12px",background:activePt.isNew?`rgba(${hexToRgb(C.red)},0.06)`:C.surfaceEl,border:`1px solid ${activePt.isNew?`rgba(${hexToRgb(C.red)},0.3)`:C.border}`,borderRadius:12,cursor:"pointer",userSelect:"none"}}>
                    <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${activePt.isNew?C.red:C.borderMid}`,background:activePt.isNew?C.red:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>{activePt.isNew&&<Icon name="check" size={9} color="#fff"/>}</div>
                    <span style={{fontSize:"0.8rem",color:activePt.isNew?C.red:C.text,fontWeight:500}}>New</span>
                    <div style={{marginLeft:"auto"}}><Icon name="newdot" size={12} color={activePt.isNew?C.red:C.textMuted}/></div>
                  </div>
                  <div onClick={()=>updateActivePt("historyTaken",!activePt.historyTaken)}
                    style={{flex:1,display:"flex",alignItems:"center",gap:8,padding:"11px 12px",background:activePt.historyTaken?`rgba(${hexToRgb(C.green)},0.07)`:C.surfaceEl,border:`1px solid ${activePt.historyTaken?`rgba(${hexToRgb(C.green)},0.3)`:C.border}`,borderRadius:12,cursor:"pointer",userSelect:"none"}}>
                    <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${activePt.historyTaken?C.green:C.borderMid}`,background:activePt.historyTaken?C.green:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>{activePt.historyTaken&&<Icon name="check" size={9} color="#fff"/>}</div>
                    <span style={{fontSize:"0.8rem",color:activePt.historyTaken?C.green:C.text,fontWeight:500}}>Hx Taken</span>
                    <div style={{marginLeft:"auto"}}><Icon name="history" size={12} color={activePt.historyTaken?C.green:C.textMuted}/></div>
                  </div>
                </div>

                <div style={{marginBottom:14}}>
                  <label style={labelStyle}>Consultant</label>
                  <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                    {consultants.length>0
                      ? consultants.map((c,i)=>{const cN=typeof c==="object"?c.name:c;const cC=typeof c==="object"?c.color:"#6366f1";const act=activePt.consultant===cN;
                          return <button key={i} onClick={()=>updateActivePt("consultant",act?"":cN)} style={{display:"flex",alignItems:"center",gap:7,background:act?`rgba(${hexToRgb(cC)},0.12)`:C.surfaceEl,border:`1px solid ${act?cC:C.border}`,color:act?cC:C.textSub,borderRadius:8,padding:"7px 13px",fontSize:"0.8rem",cursor:"pointer",fontFamily:SF,fontWeight:act?600:400}}><div style={{width:8,height:8,borderRadius:"50%",background:cC}}/>{cN}</button>;})
                      : <input value={activePt.consultant||""} onChange={e=>updateActivePt("consultant",e.target.value)} placeholder="Consultant" style={{...iS,width:"100%",boxSizing:"border-box"}}/>
                    }
                  </div>
                </div>

                {(setup.customTags||[]).length>0&&(
                  <div style={{marginBottom:14}}>
                    <label style={labelStyle}>Tags</label>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                      {(setup.customTags||[]).map((tag,ti)=>{
                        const isActive=(activePt.tags||[]).includes(tag.label);
                        const tagRgb=hexToRgb(tag.color||"#6366f1");
                        return <button key={ti} onClick={()=>updateActivePt("tags",isActive?(activePt.tags||[]).filter(t=>t!==tag.label):[...(activePt.tags||[]),tag.label])}
                          style={{padding:"6px 12px",borderRadius:20,fontSize:"0.78rem",fontWeight:isActive?600:400,cursor:"pointer",fontFamily:SF,
                            background:isActive?`rgba(${tagRgb},0.15)`:C.surfaceEl,border:`1px solid ${isActive?tag.color:C.border}`,color:isActive?tag.color:C.textSub}}>
                          {tag.label}
                        </button>;
                      })}
                    </div>
                  </div>
                )}

                <div style={{marginBottom:14}}>
                  <label style={labelStyle}>Diagnosis</label>
                  <input value={activePt.diagnosis||""} onChange={e=>updateActivePt("diagnosis",e.target.value)}
                    placeholder="Working diagnosis…" style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box"}}/>
                </div>

                <div style={{marginBottom:20}}>
                  <label style={labelStyle}>Notes</label>
                  <textarea value={activePt.notes||""} onChange={e=>updateActivePt("notes",e.target.value)}
                    rows={3} placeholder="Clinical notes…" style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:SF}}/>
                </div>

                <button onClick={async()=>{await saveBedEdit(selectedBed);setView("home");setSelectedBed(null);}}
                  style={{background:theme,border:"none",color:"#fff",borderRadius:13,cursor:"pointer",fontWeight:600,fontFamily:SF,fontSize:"0.95rem",width:"100%",padding:"14px",boxShadow:`0 4px 14px rgba(${rgb},0.3)`,marginBottom:10}}>
                  Save
                </button>

                {!showClearConfirm&&!showChangeBed&&!showDeleteBedConfirm&&(
                  <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                    <button onClick={()=>setShowChangeBed(true)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:12,padding:"11px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF}}>Change Bed</button>
                    <button onClick={()=>archiveBed(selectedBed)} style={{flex:1,background:`rgba(${hexToRgb("#f97316")},0.07)`,border:"1px solid rgba(249,115,22,0.3)",color:"#c2410c",borderRadius:12,padding:"11px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF}}>Archive</button>
                    <button onClick={()=>setShowClearConfirm(true)} style={{flex:1,background:`rgba(${hexToRgb(C.red)},0.06)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,color:C.red,borderRadius:12,padding:"11px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF}}>Clear All</button>
                    {isLeader && (
                      <button onClick={()=>setShowDeleteBedConfirm(true)} style={{flex:"1 1 100%",background:"none",border:`1px solid rgba(${hexToRgb(C.red)},0.3)`,color:C.red,borderRadius:12,padding:"9px",fontSize:"0.72rem",cursor:"pointer",fontFamily:SF}}>Delete Bed Slot…</button>
                    )}
                  </div>
                )}

                {showDeleteBedConfirm && (
                  <div style={{background:`rgba(${hexToRgb(C.red)},0.05)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,borderRadius:13,padding:"14px"}}>
                    {bedHasData(selBed) ? (
                      <p style={{margin:"0 0 12px",fontSize:"0.82rem",color:C.text,textAlign:"center"}}>
                        This bed still has patients or data. Clear all patients first before deleting the slot.
                      </p>
                    ) : (
                      <p style={{margin:"0 0 12px",fontSize:"0.82rem",color:C.text,textAlign:"center"}}>
                        Permanently delete this bed slot? This removes it from the ward entirely — use this for duplicate or leftover beds, not to discharge a patient.
                      </p>
                    )}
                    <div style={{display:"flex",gap:8}}>
                      <button onClick={()=>setShowDeleteBedConfirm(false)} style={{flex:1,background:"none",border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"10px",cursor:"pointer",fontFamily:SF,fontSize:"0.82rem"}}>Cancel</button>
                      {!bedHasData(selBed) && <button onClick={()=>deleteBed(selectedBed)} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"10px",cursor:"pointer",fontFamily:SF,fontSize:"0.82rem",fontWeight:600}}>Delete</button>}
                    </div>
                  </div>
                )}
              </div>
            )}

            {showChangeBed&&(()=>{
              const sectionOrder = sections.map(s=>s.name);
              const grouped = {};
              bedKeys.filter(k=>k!==selectedBed).forEach(k=>{
                const sec = getBedSection(k)||(beds[k]?.isFloor?"Floor":"Other");
                if(!grouped[sec]) grouped[sec]=[];
                grouped[sec].push(k);
              });
              Object.keys(grouped).forEach(sec=>{grouped[sec].sort((a,b)=>{const an=Number(a),bn=Number(b);if(!isNaN(an)&&!isNaN(bn))return an-bn;if(!isNaN(an))return -1;if(!isNaN(bn))return 1;return a.localeCompare(b);});});
              const orderedSecs=[...sectionOrder.filter(s=>grouped[s]),...Object.keys(grouped).filter(s=>!sectionOrder.includes(s))];
              return (
                <div style={{marginTop:10,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:13,padding:"14px",maxHeight:360,overflowY:"auto"}}>
                  <div style={{fontSize:"0.72rem",color:C.textSub,fontWeight:600,marginBottom:10}}>Move to which bed?</div>
                  {orderedSecs.map(sec=>(
                    <div key={sec} style={{marginBottom:14}}>
                      <div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500,marginBottom:6}}>{sec}</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                        {grouped[sec].map(k=>{const b=beds[k];const occupied=(b?.patients||[]).length>0;
                          return <button key={k} onClick={()=>!occupied&&changeBedNumber(selectedBed,k)} disabled={occupied}
                            style={{padding:"10px 4px",borderRadius:9,fontSize:"0.8rem",fontWeight:700,cursor:occupied?"default":"pointer",fontFamily:SF,
                              background:occupied?"rgba(0,0,0,0.04)":`rgba(${rgb},0.1)`,border:`1px solid ${occupied?"rgba(0,0,0,0.08)":`rgba(${rgb},0.3)`}`,color:occupied?C.textMuted:theme,opacity:occupied?0.45:1}}>{splitBedKey(k).num}</button>;
                        })}
                      </div>
                    </div>
                  ))}
                  <button onClick={()=>setShowChangeBed(false)} style={{width:"100%",background:"none",border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"9px",cursor:"pointer",fontFamily:SF,fontSize:"0.82rem",marginTop:4}}>Cancel</button>
                </div>
              );
            })()}

            {showClearConfirm&&(
              <div style={{marginTop:10,background:`rgba(${hexToRgb(C.red)},0.05)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,borderRadius:13,padding:"14px"}}>
                <p style={{margin:"0 0 12px",fontSize:"0.82rem",color:C.textSub,textAlign:"center"}}>Clear all patients for bed {splitBedKey(String(selectedBed)).num}?</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setShowClearConfirm(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"10px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
                  <button onClick={()=>clearBed(selectedBed)} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"10px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Clear</button>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignModal&&(()=>{
        const {bed:aBed,ptId}=assignModal;
        const pt=bedEdit.patients.find(p=>p.id===ptId);
        if(!pt) return null;
        return <MedicineAssignModal bedNum={aBed} ptLabel={pt.label||"Patient"} students={setup.students||[]} currentAssigned={pt.assigned||[]} currentShadows={pt.shadows||[]} shadowHOs={shadowHOs} allBeds={beds} theme={theme} rgb={rgb}
          onConfirm={(assigned,shadows)=>{setBedEdit(be=>({...be,patients:be.patients.map(p=>p.id===ptId?{...p,assigned,shadows}:p)}));setAssignModal(null);}}
          onClose={()=>setAssignModal(null)}/>;
      })()}

      {/* Shadow HO editing */}
      {shadowEditing&&shadowForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,borderRadius:20,padding:"26px 22px",width:"100%",maxWidth:380,boxShadow:C.shadowMd,border:`1px solid ${C.border}`}}>
            <h3 style={{margin:"0 0 14px",color:C.text,fontWeight:600}}>Shadow HO Posts</h3>
            {shadowForm.map((ho,i)=>(
              <div key={i} style={{marginBottom:12}}>
                <label style={labelStyle}>{ho.post}</label>
                <select value={ho.name} onChange={e=>setShadowForm(f=>{const a=[...f];a[i]={...a[i],name:e.target.value};return a;})} style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}>
                  <option value="">— Unassigned —</option>
                  {(setup.students||[]).filter(s=>s.name).map(s=><option key={s.name} value={s.name}>{s.group?`${s.group} · `:""}{s.name}</option>)}
                </select>
              </div>
            ))}
            <div style={{display:"flex",gap:10,marginTop:8}}>
              <button onClick={()=>setShadowEditing(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={()=>saveShadowHOs(shadowForm)} style={{flex:1,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* PIN */}
      {showPin&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,boxShadow:C.shadowMd}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><Icon name="key" size={16} color={theme}/><h3 style={{margin:0,color:C.text,fontWeight:600}}>Leader Access</h3></div>
            <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryPin()} placeholder="PIN" style={{...iS,width:"100%",boxSizing:"border-box",textAlign:"center",letterSpacing:"0.2em",marginTop:12,borderColor:pinError?C.red:undefined}}/>
            {pinError&&<div style={{color:C.red,fontSize:"0.78rem",textAlign:"center",marginTop:6}}>Incorrect PIN</div>}
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button onClick={()=>{setShowPin(false);setPinInput("");}} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={tryPin} style={{flex:1,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Unlock</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset */}
      {showReset&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,boxShadow:C.shadowMd}}>
            <h3 style={{margin:"0 0 8px",color:C.text,fontWeight:600}}>Start New Rotation?</h3>
            <p style={{margin:"0 0 18px",color:C.textSub,fontSize:"0.84rem"}}>Clears all patient data. Cannot be undone.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowReset(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={async()=>{const cleared={};Object.keys(rawBeds).forEach(k=>{cleared[k]={...rawBeds[k],patients:[]};});await save({...ward,beds:cleared});setShowReset(false);showToast("Ward reset");}} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:700,fontFamily:SF}}>Reset</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete */}
      {showDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,border:`1px solid ${C.red}`,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,boxShadow:C.shadowMd}}>
            <h3 style={{margin:"0 0 8px",color:C.red,fontWeight:700}}>Delete Ward?</h3>
            <p style={{margin:"0 0 18px",color:C.textSub,fontSize:"0.82rem"}}>Permanently removes this ward and all data.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowDelete(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={()=>{setShowDelete(false);onDelete&&onDelete(wardId);}} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:700,fontFamily:SF}}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit settings */}
      {editMode&&(
        <div style={{position:"fixed",inset:0,background:C.bg,zIndex:200,overflowY:"auto",fontFamily:SF}}>
          <div style={{background:"rgba(245,245,247,0.88)",borderBottom:`1px solid ${C.border}`,padding:"12px 18px",position:"sticky",top:0,backdropFilter:"blur(20px)"}}>
            <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",gap:10}}>
              <button onClick={()=>setEditMode(false)} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",padding:0}}><Icon name="back" size={18} color={C.textSub}/></button>
              <span style={{fontSize:"0.9rem",fontWeight:600,color:C.text}}>Edit Ward Settings</span>
            </div>
          </div>
          <div style={{maxWidth:560,margin:"0 auto",padding:"24px 20px 80px"}}>
            <div style={{marginBottom:18}}><label style={labelStyle}>Ward Name</label><input value={setupForm.wardName||""} onChange={e=>setSetupForm(f=>({...f,wardName:e.target.value}))} style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}/></div>
            <div style={{marginBottom:18}}><label style={labelStyle}>Rotation</label><input value={setupForm.appointmentType||""} onChange={e=>setSetupForm(f=>({...f,appointmentType:e.target.value}))} style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}/></div>
            <div style={{marginBottom:22}}>
              <label style={labelStyle}>Accent Colour</label>
              <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px"}}>
                <input type="color" value={setupForm.themeColor||"#007aff"} onChange={e=>setSetupForm(f=>({...f,themeColor:e.target.value}))} style={{width:40,height:40,border:"none",borderRadius:8,cursor:"pointer",padding:0}}/>
                <div style={{flex:1,height:8,borderRadius:4,background:`linear-gradient(90deg,${C.surfaceEl},${setupForm.themeColor||"#007aff"})`}}/>
              </div>
            </div>
            <MedicineSetupFields form={setupForm} setForm={setSetupForm}/>
            <button onClick={async()=>{
              const students=(setupForm.students||[]).filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),group:s.group?.trim()||""}));
              const consultants=(setupForm.consultants||[]).filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"}));
              const wardSections=(setupForm.wardSections||[]).filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),range:s.range||""}));
              const specialBeds=(setupForm.specialBeds||[]).filter(b=>b.id?.trim()).map(b=>({id:b.id.trim(),section:b.section?.trim()||""}));
              const newBeds={...rawBeds};
              // Backfill any beds implied by section ranges that don't exist yet,
              // using section-qualified keys so overlapping ranges stay distinct.
              wardSections.forEach(sec=>{
                if (sec.range?.includes("-")) {
                  const [start,end] = sec.range.split("-").map(s=>parseInt(s.trim()));
                  if (!isNaN(start) && !isNaN(end)) {
                    for (let n=start;n<=end;n++) {
                      const key = qualifyBedKey(sec.name,n);
                      if (!newBeds[key]) newBeds[key] = { patients:[], isFloor:false };
                    }
                  }
                }
              });
              specialBeds.forEach(b=>{if(!newBeds[b.id]){newBeds[b.id]={patients:[],isFloor:false,specialBedSection:b.section};}else{newBeds[b.id]={...newBeds[b.id],specialBedSection:b.section};}});
              const customTags=(setupForm.customTags||[]).filter(t=>t.label?.trim()).map(t=>({label:t.label.trim(),color:t.color||"#6366f1"}));
              const { beds: prunedBeds, protectedKeys } = pruneStaleBeds(newBeds, wardSections, specialBeds);
              await save({...ward,beds:prunedBeds,setup:{...setup,wardName:setupForm.wardName,appointmentType:setupForm.appointmentType,themeColor:setupForm.themeColor,students,consultants,wardSections,shadowHOs:setupForm.shadowHOs||setup.shadowHOs,specialBeds,customTags}});
              setEditMode(false);
              if (protectedKeys.length>0) {
                showToast(`Settings saved. ${protectedKeys.length} bed${protectedKeys.length>1?"s":""} kept (still occupied) despite no longer matching a section — clear or move ${protectedKeys.length>1?"them":"it"} first to remove.`);
              } else {
                showToast("Settings saved!");
              }
            }} style={{background:theme,border:"none",color:"#fff",borderRadius:12,cursor:"pointer",fontWeight:600,fontFamily:SF,fontSize:"0.95rem",width:"100%",padding:"14px",marginBottom:12}}>Save Changes</button>
            <button onClick={()=>{setEditMode(false);setShowReset(true);}} style={{width:"100%",background:"none",border:`1px solid rgba(${hexToRgb(C.red)},0.3)`,color:C.red,borderRadius:12,padding:"12px",cursor:"pointer",fontSize:"0.85rem",fontFamily:SF,marginBottom:8}}>Reset Ward (New Rotation)</button>
            <button onClick={()=>{setEditMode(false);setShowDelete(true);}} style={{width:"100%",background:`rgba(${hexToRgb(C.red)},0.07)`,border:`1px solid ${C.red}`,color:C.red,borderRadius:12,padding:"12px",cursor:"pointer",fontSize:"0.85rem",fontFamily:SF,fontWeight:600}}>Delete Ward Permanently</button>
          </div>
          <BrandingBar theme={theme}/>
        </div>
      )}

      <BrandingBar theme={theme}/>
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}`}</style>
    </div>
  );
}


// ── Medicine Assign Modal ───────────────────────────────────────────────────────
function MedicineAssignModal({ bedNum, ptLabel, students, currentAssigned, currentShadows, shadowHOs, allBeds={}, theme, rgb, onConfirm, onClose }) {
  const [assigned, setAssigned] = useState(currentAssigned);
  const [shadows,  setShadows]  = useState(currentShadows);

  const sorted = [...students].sort((a,b)=>{const ag=parseInt(a.group)||999,bg=parseInt(b.group)||999;return ag!==bg?ag-bg:a.name.localeCompare(b.name);});
  const activeShadowHOs = (shadowHOs||[]).filter(h=>h.name);
  const getName = s=>typeof s==="object"?s.name:s;
  const isAssigned = s=>assigned.some(x=>getName(x)===getName(s));

  // Count patient slots each student is assigned across all beds
  const countFor = (name) => Object.values(allBeds).flatMap(b=>(b.patients||[])).filter(p=>
    (p.assigned||[]).some(s=>getName(s)===name)
  ).length;

  const toggleAssigned = s=>{
    const k=getName(s);
    if(isAssigned(s)){setAssigned(a=>a.filter(x=>getName(x)!==k));return;}
    setShadows(sh=>sh.filter(x=>getName(x)!==k));
    setAssigned(a=>[...a,s]);
  };

  const StudentChip = ({s}) => {
    const isSel = isAssigned(s);
    const name = getName(s);
    const count = countFor(name);
    return (
      <div onClick={()=>toggleAssigned(s)}
        style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
          padding:"8px 4px",borderRadius:10,cursor:"pointer",textAlign:"center",position:"relative",
          background:isSel?`rgba(${rgb},0.12)`:C.surfaceEl,
          border:`1px solid ${isSel?theme:C.border}`,transition:"all 0.1s"}}>
        {isSel&&<div style={{position:"absolute",top:3,right:3,width:13,height:13,borderRadius:"50%",background:theme,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon name="check" size={7} color="#fff"/>
        </div>}
        <span style={{fontSize:"0.65rem",fontWeight:600,color:isSel?theme:C.text,lineHeight:1.2,wordBreak:"break-word"}}>{name.split(" ")[0]}</span>
        {s.group&&<span style={{fontSize:"0.52rem",color:isSel?theme:C.textMuted,fontFamily:"monospace",fontWeight:600}}>{s.group}</span>}
        <span style={{fontSize:"0.52rem",fontWeight:600,color:count>0?(isSel?theme:C.textSub):C.textMuted,background:count>0?"rgba(0,0,0,0.05)":"transparent",borderRadius:4,padding:count>0?"1px 3px":"0"}}>
          {count>0?`${count}pt`:"—"}
        </span>
      </div>
    );
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:250,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:"100%",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",maxHeight:"75vh",overflowY:"auto",boxShadow:"0 -4px 40px rgba(0,0,0,0.1)"}}>
        <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 20px"}}/>
        <h3 style={{margin:"0 0 4px",color:C.text,fontSize:"1.05rem",fontWeight:600}}>Assign Students</h3>
        <div style={{fontSize:"0.75rem",color:C.textMuted,marginBottom:16}}>Bed {bedNum} · <span style={{fontWeight:600,color:theme}}>{ptLabel}</span></div>

        {/* Primary — 4-col grid */}
        <div style={{fontSize:"0.65rem",color:C.textSub,letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:500,marginBottom:8}}>Primary</div>
        <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:20}}>
          {sorted.map(s=><StudentChip key={getName(s)} s={s}/>)}
        </div>

        {/* Shadow HO — grayed row style */}
        <div style={{fontSize:"0.65rem",color:C.textMuted,letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:500,marginBottom:8}}>Shadow HO</div>
        {activeShadowHOs.length===0
          ?<div style={{fontSize:"0.78rem",color:C.textMuted,marginBottom:16}}>No active Shadow HOs — update the banner first.</div>
          :<div style={{display:"flex",flexDirection:"column",gap:5,marginBottom:16}}>
            {activeShadowHOs.map(ho=>{
              const isSel=shadows.some(x=>getName(x)===ho.name);
              return(
                <div key={ho.name} onClick={()=>setShadows(isSel?shadows.filter(x=>getName(x)!==ho.name):[ho.name])}
                  style={{display:"flex",alignItems:"center",gap:10,padding:"9px 12px",
                    background:isSel?"rgba(0,0,0,0.05)":C.surfaceEl,
                    border:`1px dashed ${isSel?"rgba(0,0,0,0.3)":C.border}`,
                    borderRadius:10,cursor:"pointer",opacity:isSel?1:0.65}}>
                  <div style={{width:18,height:18,borderRadius:5,border:`2px dashed ${isSel?C.textSub:C.borderMid}`,background:isSel?"rgba(0,0,0,0.08)":"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                    {isSel&&<Icon name="check" size={9} color={C.textSub}/>}
                  </div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:"0.82rem",color:C.text,fontWeight:isSel?600:400}}>{ho.name}</div>
                    <div style={{fontSize:"0.6rem",color:C.textMuted}}>{ho.post}</div>
                  </div>
                </div>
              );
            })}
          </div>
        }

        <div style={{display:"flex",gap:10}}>
          <button onClick={onClose} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
          <button onClick={()=>onConfirm(assigned,shadows)} style={{flex:1,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Confirm</button>
        </div>
      </div>
    </div>
  );
}


// ── Medicine Archive Tab ──────────────────────────────────────────────────────
function MedArchiveTab({ archive, beds, theme, rgb, onRestore, onDelete }) {
  const weeks = Object.keys(archive||{}).sort().reverse();
  const [selectedWeek, setSelectedWeek] = useState(weeks[0]||"");
  const [expanded, setExpanded] = useState({});
  const [restorePicker, setRestorePicker] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);

  if (weeks.length===0) return (
    <div style={{textAlign:"center",padding:"60px 20px",color:C.textMuted,fontSize:"0.85rem",fontFamily:SF}}>
      No archived beds yet. Archive beds using the Archive button in the bed detail sheet.
    </div>
  );

  const weekData = archive[selectedWeek]||{};
  const archivedBedKeys = Object.keys(weekData).sort((a,b)=>isNaN(a)||isNaN(b)?a.localeCompare(b):Number(a)-Number(b));
  const allBedNums = Object.keys(beds).filter(k=>{ const {num}=splitBedKey(k); return !isNaN(Number(num)); }).sort((a,b)=>{
    const A=splitBedKey(a), B=splitBedKey(b);
    if (A.section!==B.section) return (A.section||"").localeCompare(B.section||"");
    return Number(A.num)-Number(B.num);
  });
  const bedIsFree = (bedNum) => { const b=beds[bedNum]; return !b||(b.patients||[]).length===0; };
  const formatWeek = (wk) => { const [yr,wNum]=wk.split("-W"); return `Week ${parseInt(wNum)}, ${yr}`; };
  const toggle = (bedNum) => setExpanded(e=>({...e,[bedNum]:!e[bedNum]}));

  return (
    <div>
      <div style={{marginBottom:18}}>
        <label style={labelStyle}>Select Week</label>
        <select value={selectedWeek} onChange={e=>{setSelectedWeek(e.target.value);setExpanded({});setRestorePicker(null);setConfirmDelete(null);}}
          style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}>
          {weeks.map(w=><option key={w} value={w}>{formatWeek(w)}</option>)}
        </select>
      </div>
      {archivedBedKeys.length===0
        ? <div style={{textAlign:"center",padding:"30px",color:C.textMuted,fontSize:"0.85rem"}}>No beds archived this week.</div>
        : <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {archivedBedKeys.map(bedNum=>{
              const bed = weekData[bedNum];
              const pts = bed.patients || [];
              const isOpen = !!expanded[bedNum];
              const sameOk = bedIsFree(bedNum);
              return (
                <div key={bedNum} style={{background:C.surface,border:"1px solid rgba(0,0,0,0.08)",borderRadius:14,boxShadow:"0 4px 14px rgba(0,0,0,0.06)",overflow:"hidden"}}>
                  <div onClick={()=>toggle(bedNum)} style={{display:"flex",alignItems:"center",padding:"13px 14px",cursor:"pointer",userSelect:"none",gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:"0.6rem",color:C.textMuted,textTransform:"uppercase",letterSpacing:"0.06em",fontWeight:500}}>{bed.isFloor?"Floor":"Bed"}</span>
                        <span style={{fontSize:"1.1rem",fontWeight:700,color:theme,letterSpacing:"-0.03em"}}>{splitBedKey(String(bedNum)).num}</span>
                        <span style={{fontSize:"0.72rem",color:C.textSub,fontWeight:500}}>{pts.length} pt</span>
                      </div>
                      <div style={{fontSize:"0.62rem",color:C.textMuted,marginTop:2}}>{bed.archivedAt ? new Date(bed.archivedAt).toLocaleDateString() : "Archived"}</div>
                    </div>
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>
                      <path d="M2 4l4 4 4-4" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 14px 14px",background:C.surfaceEl}}>
                      {pts.map((pt,pi)=>(
                        <div key={pt.id||pi} style={{marginBottom:10,paddingLeft:8,borderLeft:`2px solid rgba(${hexToRgb(theme)},0.2)`}}>
                          <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                            <span style={{fontSize:"0.58rem",fontWeight:700,color:theme,background:`rgba(${hexToRgb(theme)},0.1)`,borderRadius:4,padding:"1px 5px"}}>{pt.label||`P${pi+1}`}</span>
                            {pt.historyTaken&&<Icon name="history" size={10} color={C.green}/>}
                            {pt.isNew&&<Icon name="newdot" size={9} color={C.red}/>}
                          </div>
                          {pt.diagnosis&&<div style={{fontSize:"0.75rem",color:C.text,fontStyle:"italic",marginBottom:2}}>{pt.diagnosis}</div>}
                          {pt.consultant&&<div style={{fontSize:"0.7rem",color:C.textSub,marginBottom:3}}>{pt.consultant}</div>}
                          {((pt.assigned||[]).length>0||(pt.shadows||[]).length>0)&&(
                            <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                              {(pt.assigned||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;const g=typeof s==="object"?s.group:"";return<span key={i} style={{fontSize:"0.62rem",background:`rgba(${hexToRgb(theme)},0.08)`,border:`1px solid rgba(${hexToRgb(theme)},0.2)`,borderRadius:5,padding:"2px 7px",color:theme,fontWeight:500,display:"inline-flex",alignItems:"baseline",gap:"1px"}}>{n}{g&&<sup style={{fontSize:"0.55em",fontWeight:700,marginLeft:"2px",opacity:0.7}}>{g}</sup>}</span>;})}
                              {(pt.shadows||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;const g=typeof s==="object"?s.group:"";return<span key={i} style={{fontSize:"0.62rem",background:"rgba(0,0,0,0.03)",border:"1px dashed rgba(0,0,0,0.15)",borderRadius:5,padding:"2px 7px",color:C.textMuted,display:"inline-flex",alignItems:"baseline",gap:"1px"}}>{n}{g&&<sup style={{fontSize:"0.55em",fontWeight:700,marginLeft:"2px",opacity:0.6}}>{g}</sup>}</span>;})}
                            </div>
                          )}
                        </div>
                      ))}
                      {restorePicker===bedNum ? (
                        <div>
                          <div style={{fontSize:"0.72rem",color:C.textSub,fontWeight:500,marginBottom:8}}>Restore to which bed?</div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:10}}>
                            {allBedNums.filter(k=>splitBedKey(k).section===splitBedKey(bedNum).section).map(k=>{
                              const free=bedIsFree(k);
                              return <button key={k} onClick={()=>{if(!free)return; onRestore(selectedWeek,bedNum,k); setRestorePicker(null);}} disabled={!free}
                                style={{padding:"9px 4px",borderRadius:9,fontSize:"0.82rem",fontWeight:700,cursor:free?"pointer":"not-allowed",fontFamily:SF,
                                  background:free?`rgba(${hexToRgb(theme)},0.1)`:"rgba(0,0,0,0.03)",
                                  border:`1px solid ${free?`rgba(${hexToRgb(theme)},0.3)`:"rgba(0,0,0,0.08)"}`,
                                  color:free?theme:C.textMuted,opacity:free?1:0.5}}>{splitBedKey(k).num}</button>;
                            })}
                          </div>
                          <button onClick={()=>setRestorePicker(null)} style={{width:"100%",background:"none",border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"8px",cursor:"pointer",fontFamily:SF,fontSize:"0.8rem"}}>Cancel</button>
                        </div>
                      ) : confirmDelete===bedNum ? (
                        <div style={{background:`rgba(${hexToRgb(C.red)},0.05)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,borderRadius:10,padding:"12px"}}>
                          <p style={{margin:"0 0 10px",fontSize:"0.8rem",color:C.textSub,textAlign:"center"}}>Delete this archived record permanently?</p>
                          <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>setConfirmDelete(null)} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:9,padding:"9px",cursor:"pointer",fontFamily:SF,fontSize:"0.8rem"}}>Cancel</button>
                            <button onClick={()=>{onDelete(selectedWeek,bedNum);setConfirmDelete(null);}}
                              style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:9,padding:"9px",cursor:"pointer",fontWeight:600,fontFamily:SF,fontSize:"0.8rem"}}>Delete</button>
                          </div>
                        </div>
                      ) : (
                        <div style={{display:"flex",gap:8,marginTop:10}}>
                          <button onClick={()=>sameOk?onRestore(selectedWeek,bedNum,bedNum):setRestorePicker(bedNum)}
                            style={{flex:2,padding:"9px",borderRadius:10,fontSize:"0.8rem",cursor:"pointer",fontFamily:SF,fontWeight:500,
                              background:`rgba(${hexToRgb(theme)},0.09)`,border:`1px solid rgba(${hexToRgb(theme)},0.25)`,color:theme}}>
                            {sameOk?`Restore to Bed ${splitBedKey(String(bedNum)).num}`:"Restore to…"}
                          </button>
                          <button onClick={()=>setConfirmDelete(bedNum)}
                            style={{flex:1,padding:"9px",borderRadius:10,fontSize:"0.8rem",cursor:"pointer",fontFamily:SF,
                              background:`rgba(${hexToRgb(C.red)},0.06)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,color:C.red}}>
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}

// ── Medicine Students Tab ─────────────────────────────────────────────────────
function MedStudentsTab({ beds, bedKeys, students, theme, rgb }) {
  const [selected, setSelected] = useState(null);

  // Build per-student patient slot lists from beds[k].patients
  const studentSlots = {};
  students.forEach(s=>{ studentSlots[s.name]={primary:[],shadow:[]}; });
  bedKeys.forEach(bedNum=>{
    const bed = beds[bedNum];
    (bed.patients||[]).forEach(pt=>{
      (pt.assigned||[]).forEach(s=>{const n=typeof s==="object"?s.name:s;if(studentSlots[n])studentSlots[n].primary.push({bedNum,pt});});
      (pt.shadows||[]).forEach(s=>{const n=typeof s==="object"?s.name:s;if(studentSlots[n])studentSlots[n].shadow.push({bedNum,pt});});
    });
  });

  const sorted = [...students].sort((a,b)=>{const ag=parseInt(a.group)||999,bg=parseInt(b.group)||999;return ag!==bg?ag-bg:a.name.localeCompare(b.name);});

  if (students.length===0) return <div style={{textAlign:"center",padding:"60px 20px",color:C.textMuted,fontSize:"0.85rem"}}>No students added in setup.</div>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {sorted.map(s=>{
        const ss = studentSlots[s.name]||{primary:[],shadow:[]};
        const total = ss.primary.length + ss.shadow.length;
        const isOpen = selected===s.name;
        return (
          <div key={s.name}>
            <div onClick={()=>setSelected(isOpen?null:s.name)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"13px 14px",background:C.surface,
                border:`1px solid ${isOpen?`rgba(${rgb},0.35)`:"rgba(0,0,0,0.08)"}`,
                borderRadius:isOpen?"14px 14px 0 0":14,cursor:"pointer",userSelect:"none",
                boxShadow:isOpen?"none":"0 4px 14px rgba(0,0,0,0.07)",transition:"all 0.15s"}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:theme,flexShrink:0}}/>
              {s.group&&<span style={{fontSize:"0.58rem",color:C.textMuted,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:5,padding:"2px 6px",fontFamily:"monospace",flexShrink:0}}>{s.group}</span>}
              <span style={{flex:1,fontSize:"0.9rem",color:C.text,fontWeight:isOpen?600:400}}>{s.name}</span>
              <div style={{display:"flex",gap:4,alignItems:"center"}}>
                {ss.primary.length>0&&<span style={{fontSize:"0.65rem",fontWeight:600,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.25)`,color:theme,borderRadius:6,padding:"2px 7px"}}>{ss.primary.length}</span>}
                {ss.shadow.length>0&&<span style={{fontSize:"0.65rem",background:"rgba(0,0,0,0.04)",border:"1px dashed rgba(0,0,0,0.15)",color:C.textMuted,borderRadius:6,padding:"2px 7px"}}>{ss.shadow.length}s</span>}
                {total===0&&<span style={{fontSize:"0.65rem",color:C.textMuted}}>—</span>}
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)",flexShrink:0,marginLeft:4}}>
                <path d="M2 4l4 4 4-4" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {isOpen&&(
              <div style={{background:C.surfaceEl,border:`1px solid rgba(${rgb},0.2)`,borderTop:"none",borderRadius:"0 0 14px 14px",padding:"12px 14px 14px"}}>
                {total===0
                  ? <div style={{color:C.textMuted,fontSize:"0.8rem",textAlign:"center",padding:"10px 0"}}>No patients assigned yet</div>
                  : <>
                      {ss.primary.length>0&&<>
                        <div style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500,marginBottom:8}}>Primary ({ss.primary.length})</div>
                        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:ss.shadow.length>0?12:0}}>
                          {ss.primary.map(({bedNum,pt},i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:C.surface,border:`1px solid rgba(${rgb},0.15)`,borderRadius:10}}>
                              <span style={{fontSize:"0.75rem",fontWeight:700,color:theme,minWidth:28}}>{splitBedKey(String(bedNum)).num}</span>
                              <span style={{fontSize:"0.58rem",fontWeight:600,color:theme,background:`rgba(${rgb},0.1)`,borderRadius:4,padding:"1px 5px",flexShrink:0}}>{pt.label}</span>
                              <div style={{flex:1,overflow:"hidden"}}>
                                {pt.patientName&&<div style={{fontSize:"0.72rem",fontWeight:600,color:C.text,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.patientName}</div>}
                                {pt.diagnosis&&<div style={{fontSize:"0.65rem",color:C.textSub,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.diagnosis}</div>}
                              </div>
                              {pt.historyTaken&&<Icon name="history" size={11} color={C.green}/>}
                            </div>
                          ))}
                        </div>
                      </>}
                      {ss.shadow.length>0&&<>
                        <div style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500,marginBottom:8}}>Shadow ({ss.shadow.length})</div>
                        <div style={{display:"flex",flexDirection:"column",gap:6}}>
                          {ss.shadow.map(({bedNum,pt},i)=>(
                            <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:C.surfaceEl,border:"1px dashed rgba(0,0,0,0.12)",borderRadius:10,opacity:0.8}}>
                              <span style={{fontSize:"0.75rem",fontWeight:700,color:C.textMuted,minWidth:28}}>{splitBedKey(String(bedNum)).num}</span>
                              <span style={{fontSize:"0.58rem",fontWeight:600,color:C.textMuted,background:"rgba(0,0,0,0.04)",borderRadius:4,padding:"1px 5px",flexShrink:0}}>{pt.label}</span>
                              <div style={{flex:1,overflow:"hidden"}}>
                                {pt.patientName&&<div style={{fontSize:"0.72rem",fontWeight:600,color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.patientName}</div>}
                                {pt.diagnosis&&<div style={{fontSize:"0.65rem",color:C.textMuted,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.diagnosis}</div>}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>}
                    </>
                }
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SURGERY WARD VIEW
// ══════════════════════════════════════════════════════════════════════════════
function PairingStudentsCard({ pi, members, pPts, theme, rgb, shadowHONames, NameWithGroup, onSelectPt }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{background:C.surface,border:`1px solid rgba(${rgb},0.18)`,borderRadius:14,marginBottom:10,overflow:"hidden",boxShadow:C.shadow}}>
      <div onClick={()=>setOpen(o=>!o)} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",cursor:"pointer",userSelect:"none"}}>
        <span style={{fontSize:"0.68rem",fontWeight:700,color:theme,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.2)`,borderRadius:6,padding:"2px 9px",flexShrink:0}}>P{pi+1}</span>
        <div style={{display:"flex",gap:5,flex:1,flexWrap:"wrap",alignItems:"baseline"}}>
          {members.filter(m=>!shadowHONames.has(m)).map((m,mi)=>(
            <span key={m} style={{display:"inline-flex",alignItems:"baseline"}}>
              {mi>0&&<span style={{margin:"0 3px",color:C.textMuted,opacity:0.5}}>×</span>}
              <NameWithGroup name={m} color={C.text} fontSize="0.82rem" fontWeight={500}/>
            </span>
          ))}
        </div>
        <span style={{fontSize:"0.68rem",fontWeight:600,color:theme,background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.18)`,borderRadius:6,padding:"2px 8px",flexShrink:0}}>{pPts.length} pt</span>
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{transition:"transform 0.2s",transform:open?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>
          <path d="M3 5l4 4 4-4" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {open&&(
        <div style={{borderTop:`1px solid ${C.border}`,padding:"10px 12px 12px"}}>
          {pPts.length===0
            ? <div style={{fontSize:"0.75rem",color:C.textMuted,padding:"6px 0"}}>No patients assigned</div>
            : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10}}>
                {pPts.map(pt=>(
                  <div key={pt.id} onClick={()=>onSelectPt(pt)}
                    style={{background:C.surfaceEl,border:pt.historyTaken?`1px solid rgba(52,199,89,0.25)`:`1px solid rgba(0,0,0,0.08)`,borderRadius:12,padding:"10px 10px",cursor:"pointer",position:"relative",boxShadow:"0 2px 8px rgba(0,0,0,0.05)",transition:"transform 0.12s"}}
                    onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";}}
                    onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";}}>
                    <div style={{fontSize:"0.55rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:1}}>{pt.section||"Unassigned"}{pt.side&&pt.side!=="single"?` · ${pt.side}`:""}</div>
                    {pt.bedNo&&<div style={{fontSize:"1.1rem",fontWeight:700,color:theme,lineHeight:1,marginBottom:3}}>{String(pt.bedNo).padStart(2,"0")}</div>}
                    <div style={{fontSize:"0.78rem",fontWeight:700,color:C.text,marginBottom:2,wordBreak:"break-word"}}>{pt.patientName||"—"}</div>
                    {pt.age&&<div style={{fontSize:"0.6rem",color:C.textSub,marginBottom:1}}>{pt.age}</div>}
                    {pt.diagnosis&&<div style={{fontSize:"0.6rem",color:C.text,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.diagnosis}</div>}
                    {pt.historyTaken&&<div style={{position:"absolute",top:7,right:7}}><svg width="10" height="10" viewBox="0 0 16 16" fill="none"><path d="M3 8l4 4 6-7" stroke="#34c759" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg></div>}
                  </div>
                ))}
              </div>
          }
        </div>
      )}
    </div>
  );
}

function ShadowHOStudentsSection({ shadowHOs, patients, theme, rgb, onSelectPt }) {
  const [expandedHO, setExpandedHO] = useState(null);
  const activeHOs = shadowHOs.filter(h=>h.name);
  const C2 = C;
  return (
    <div style={{marginBottom:20}}>
      <div style={{fontSize:"0.65rem",color:C2.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:700,marginBottom:10,paddingLeft:2}}>Shadow HOs</div>
      {activeHOs.map(ho=>{
        const hoPts = patients.filter(p=>p.shadowHO===ho.name);
        const isOpen = expandedHO===ho.name;
        return (
          <div key={ho.name} style={{background:C2.surface,border:`1px solid ${C2.border}`,borderRadius:14,marginBottom:10,overflow:"hidden",boxShadow:C2.shadow}}>
            <div onClick={()=>setExpandedHO(isOpen?null:ho.name)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"11px 14px",cursor:"pointer",userSelect:"none"}}>
              <div style={{flex:1}}>
                <div style={{fontSize:"0.88rem",fontWeight:600,color:C2.text,lineHeight:1.2}}>{ho.name}</div>
                <div style={{fontSize:"0.62rem",color:C2.textMuted,marginTop:1}}>{ho.post}</div>
              </div>
              <span style={{fontSize:"0.68rem",fontWeight:600,color:theme,background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.18)`,borderRadius:6,padding:"2px 8px",flexShrink:0}}>{hoPts.length} pt</span>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)",flexShrink:0}}>
                <path d="M3 5l4 4 4-4" stroke={C2.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {isOpen&&(
              <div style={{borderTop:`1px solid ${C2.border}`,padding:"10px 12px 12px"}}>
                {hoPts.length===0
                  ? <div style={{fontSize:"0.75rem",color:C2.textMuted,padding:"6px 0"}}>No patients assigned</div>
                  : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10}}>
                      {hoPts.map(pt=>(
                        <div key={pt.id} onClick={()=>onSelectPt(pt)}
                          style={{background:C2.surfaceEl,border:pt.historyTaken?`1px solid rgba(52,199,89,0.25)`:`1px solid rgba(0,0,0,0.08)`,borderRadius:12,padding:"10px 10px",cursor:"pointer",position:"relative",boxShadow:"0 2px 8px rgba(0,0,0,0.05)",transition:"transform 0.12s"}}
                          onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-2px)";}}
                          onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";}}>
                          <div style={{fontSize:"0.55rem",color:C2.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:1}}>{pt.section||"Unassigned"}{pt.side&&pt.side!=="single"?` · ${pt.side}`:""}</div>
                          {pt.bedNo&&<div style={{fontSize:"1.1rem",fontWeight:700,color:theme,lineHeight:1,marginBottom:3}}>{String(pt.bedNo).padStart(2,"0")}</div>}
                          <div style={{fontSize:"0.78rem",fontWeight:700,color:C2.text,marginBottom:2,wordBreak:"break-word"}}>{pt.patientName||"—"}</div>
                          {pt.age&&<div style={{fontSize:"0.6rem",color:C2.textSub,marginBottom:1}}>{pt.age}</div>}
                          {pt.diagnosis&&<div style={{fontSize:"0.6rem",color:C2.text,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.diagnosis}</div>}
                        </div>
                      ))}
                    </div>
                }
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SURGERY WARD VIEW — patient-list model, sub-team pairings, bed L/R slots
// ══════════════════════════════════════════════════════════════════════════════
function SurgeryWardView({ wardId, ward, onBack, saveWard, onDelete, showToast, seniorMode }) {
  const [isLeader,          setIsLeader]          = useState(false);
  const [pinInput,          setPinInput]          = useState("");
  const [pinError,          setPinError]          = useState(false);
  const [showPin,           setShowPin]           = useState(false);
  const [activeTab,         setActiveTab]         = useState("ward");
  const [sectionFilter,     setSectionFilter]     = useState("all");
  const [editMode,          setEditMode]          = useState(false);
  const [setupForm,         setSetupForm]         = useState({});
  const [showDelete,        setShowDelete]        = useState(false);
  const [showReset,         setShowReset]         = useState(false);
  const [showAddPt,         setShowAddPt]         = useState(false);
  const [newPt,             setNewPt]             = useState({bht:"",patientName:"",ageYears:"",ageMonths:"",bedNo:"",section:"",side:"single",pairingIdx:null});
  const [selectedPt,        setSelectedPt]        = useState(null);
  const [ptEdit,            setPtEdit]            = useState({});
  const [showClearConfirm,  setShowClearConfirm]  = useState(false);
  const [sideConflict,      setSideConflict]      = useState(null); // {existingPtId, newSide, otherSide}
  const [pairingOpen,       setPairingOpen]       = useState(false);
  const [pairingEdit,       setPairingEdit]       = useState(false);
  const [pairingForm,       setPairingForm]       = useState([]);
  const [shadowAutoAlloc,   setShadowAutoAlloc]   = useState(true); // auto shadow allocation on by default
  const [switchConfirm,     setSwitchConfirm]     = useState(null); // {studentName, fromPairingIdx, toPairingIdx, setter}
  const [shadowEditing,     setShadowEditing]     = useState(false);
  const [shadowForm,        setShadowForm]        = useState(null);
  const [shadowReplaceStep, setShadowReplaceStep] = useState(false);
  const [pendingShadowForm, setPendingShadowForm] = useState(null);
  const [shadowReplaceSelection, setShadowReplaceSelection] = useState({});
  const [searchQuery,       setSearchQuery]       = useState("");

  const setup       = ward.setup    || {};
  const patients    = ward.patients || [];
  const theme       = setup.themeColor || "#007aff";
  const rgb         = hexToRgb(theme);
  const sections    = setup.wardSections || [];
  const shadowHOs   = setup.shadowHOs   || [];
  const consultants = setup.consultants || [];
  const students    = setup.students    || [];
  const pairings    = setup.pairings    || [];
  const shadowHONames = new Set(shadowHOs.map(h=>h.name).filter(Boolean));
  const activeStudents = students.filter(s=>s.name&&!shadowHONames.has(s.name));

  // Lookup group number for a student name
  const getGroup = (name) => students.find(s=>s.name===name)?.group||"";

  // Render a name with superscript group number
  const NameWithGroup = ({name, color, fontSize="0.88rem", fontWeight=500}) => {
    const g = getGroup(name);
    return (
      <span style={{fontSize,fontWeight,color,lineHeight:1.3}}>
        {name}{g&&<sup style={{fontSize:"0.55em",fontWeight:700,marginLeft:"1px",opacity:0.7}}>{g}</sup>}
      </span>
    );
  };

  const save = useCallback(async (w) => { await saveWard(w); }, [saveWard]);

  const tryPin = () => {
    if (isLeaderPin(pinInput, wardId)) { setIsLeader(true); setShowPin(false); setPinInput(""); showToast("Leader access granted"); }
    else { setPinError(true); setTimeout(()=>setPinError(false),1500); }
  };

  const getPairingLabel = (idx) => idx!=null && pairings[idx] ? `P${idx+1}` : null;

  // Pick the shadow HO with fewest patients (ties broken randomly)
  const getSuggestedShadow = () => {
    const active = shadowHOs.filter(h=>h.name);
    if (active.length===0) return null;
    const counts = active.map(h=>({...h, count:patients.filter(p=>p.shadowHO===h.name).length}));
    const minCount = Math.min(...counts.map(h=>h.count));
    const eligible = counts.filter(h=>h.count===minCount);
    return eligible[Math.floor(Math.random()*eligible.length)];
  };

  const updatePatient = async (id, updates) => {
    await save({...ward, patients:patients.map(p=>p.id===id?{...p,...updates}:p)});
  };

  const removePatient = async (id) => {
    const pt = patients.find(p=>p.id===id);
    let newPatients = patients.filter(p=>p.id!==id);
    if (pt&&(pt.side==="L"||pt.side==="R")) {
      const mate = newPatients.find(p=>p.bedNo===pt.bedNo&&p.section===pt.section);
      if (mate) newPatients = newPatients.map(p=>p.id===mate.id?{...p,side:"single"}:p);
    }
    await save({...ward, patients:newPatients});
    setSelectedPt(null); setShowClearConfirm(false);
  };

  const archivePatient = async (id) => {
    const pt = patients.find(p=>p.id===id); if(!pt) return;
    const y=new Date().getFullYear(), s2=new Date(y,0,1), d=new Date();
    const wk=`${y}-W${String(Math.ceil(((d-s2)/86400000+s2.getDay()+1)/7)).padStart(2,"0")}`;
    const archive={...(ward.archive||{})};
    archive[wk]={...(archive[wk]||{}),[id]:{...pt,archivedAt:new Date().toISOString()}};
    let newPatients = patients.filter(p=>p.id!==id);
    if (pt.side==="L"||pt.side==="R") {
      const mate = newPatients.find(p=>p.bedNo===pt.bedNo&&p.section===pt.section);
      if (mate) newPatients = newPatients.map(p=>p.id===mate.id?{...p,side:"single"}:p);
    }
    await save({...ward,patients:newPatients,archive});
    setSelectedPt(null); showToast("Patient archived");
  };

  const addPatient = async () => {
    if (!newPt.patientName.trim()&&!newPt.bht.trim()) { showToast("Enter a name or BHT","error"); return; }
    if (newPt.bedNo&&!newPt.isFloor&&!newPt.side) { showToast("Please select a bed side (L or R)","error"); return; }
    const ageStr=[newPt.ageYears&&`${newPt.ageYears}y`,newPt.ageMonths&&`${newPt.ageMonths}m`].filter(Boolean).join(" ");
    const pairingIdx = newPt.pairingIdx!=null ? newPt.pairingIdx : null;
    const members = pairingIdx!=null&&pairings[pairingIdx] ? (pairings[pairingIdx].members||[]).filter(m=>m&&!shadowHONames.has(m)) : [];
    // Auto-assign floor number if floor patient
    let bedNo = newPt.bedNo?.trim()||"";
    let section = newPt.section||"";
    let isFloor = !!newPt.isFloor;
    if (isFloor) {
      const floorCount = patients.filter(p=>p.isFloor).length;
      bedNo = `F${floorCount+1}`;
      section = "Floor";
    }
    const shadowHO = shadowAutoAlloc ? (getSuggestedShadow()?.name||"") : (newPt.shadowHO||"");
    const pt = { id:Date.now().toString(), bht:newPt.bht.trim(), patientName:newPt.patientName.trim(), age:ageStr, bedNo, section, side:newPt.side||"single", isFloor, pairingIdx, members, shadowHO, consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:true, addedAt:Date.now() };
    await save({...ward, patients:[...patients.map(p=>newPt._conflictId&&p.id===newPt._conflictId?{...p,side:newPt._conflictSide}:p),pt]});
    setNewPt({bht:"",patientName:"",ageYears:"",ageMonths:"",bedNo:"",section:sections[0]?.name||"",side:"single",pairingIdx:null});
    setShowAddPt(false); showToast("Patient added");
  };

  const startShadowEdit = () => { setShadowForm(shadowHOs.map(h=>({...h}))); setShadowEditing(true); };

  const submitShadowNames = (newForm) => {
    const newNames = newForm.map(h=>h.name).filter(Boolean);
    // Outgoing = leaving shadow duty, returning to active — need a pairing slot
    const outgoingNames = shadowHOs.map(h=>h.name).filter(n=>n&&!newNames.includes(n));
    // Incoming = becoming shadow HOs — vacating a pairing slot
    const incomingNew = newNames.filter(n=>!shadowHONames.has(n)&&students.some(s=>s.name===n));
    if (outgoingNames.length>0&&incomingNew.length>0) {
      setPendingShadowForm(newForm); setShadowReplaceSelection({}); setShadowReplaceStep(true); setShadowEditing(false);
    } else { applyShadowUpdate(newForm,{}); }
  };

  const applyShadowUpdate = async (newForm, replaceMap) => {
    // replaceMap: { outgoingName -> incomingName }
    // outgoing person takes the pairing slot of the incoming (who is becoming a shadow HO)
    const newShadowNames = new Set(newForm.map(h=>h.name).filter(Boolean));
    let newPairings = pairings.map(p=>({...p,members:[...(p.members||[])]}));
    Object.entries(replaceMap).forEach(([outgoing,incoming])=>{
      newPairings = newPairings.map(p=>({...p,members:(p.members||[]).map(m=>m===incoming?outgoing:m)}));
    });
    const newPatients = patients.map(pt=>{
      if (pt.pairingIdx==null||!newPairings[pt.pairingIdx]) return pt;
      const members=(newPairings[pt.pairingIdx].members||[]).filter(m=>m&&!newShadowNames.has(m));
      return {...pt,members};
    });
    await save({...ward,patients:newPatients,setup:{...setup,shadowHOs:newForm,pairings:newPairings}});
    setShadowEditing(false); setShadowReplaceStep(false); setPendingShadowForm(null); setShadowReplaceSelection({});
    showToast("Shadow HO posts updated");
  };

  const savePairings = async (newPairings) => {
    const newPatients = patients.map(pt=>{
      if (pt.pairingIdx==null||!newPairings[pt.pairingIdx]) return pt;
      const members=(newPairings[pt.pairingIdx].members||[]).filter(m=>m&&!shadowHONames.has(m));
      return {...pt,members};
    });
    await save({...ward,patients:newPatients,setup:{...setup,pairings:newPairings}});
    setPairingEdit(false); showToast("Pairings saved");
  };

  const searchActive = searchQuery.trim().length > 0;
  const searchLower  = searchQuery.trim().toLowerCase();
  const sectionFiltered = sectionFilter==="all" ? patients : patients.filter(p=>p.section===sectionFilter);
  const filteredPatients = searchActive
    ? patients.filter(p=>(p.patientName||"").toLowerCase().includes(searchLower)||(p.bht||"").toLowerCase().includes(searchLower))
    : sectionFiltered;
  const sectionNames = sections.map(s=>s.name);

  const bedMap = {};
  filteredPatients.filter(p=>p.section&&p.bedNo).forEach(pt=>{
    const sec = pt.section||"Other";
    const bed = pt.bedNo||"?";
    if (!bedMap[sec]) bedMap[sec]={};
    if (!bedMap[sec][bed]) bedMap[sec][bed]=[];
    bedMap[sec][bed].push(pt);
  });
  const orderedSections = [...new Set([...sectionNames,...Object.keys(bedMap)])].filter(s=>bedMap[s]);

  const selPt = selectedPt ? patients.find(p=>p.id===selectedPt) : null;
  const stats = { total:patients.length, histTaken:patients.filter(p=>p.historyTaken).length, isNew:patients.filter(p=>p.isNew).length };

  return (
    <div style={{minHeight:"100vh",background:C.bg,fontFamily:SF}}>
      <div style={{background:"rgba(245,245,247,0.88)",borderBottom:`1px solid ${C.border}`,padding:"12px 18px",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",alignItems:"center",gap:10}}>
            <button onClick={onBack} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",padding:0}}><Icon name="back" size={18} color={C.textSub}/></button>
            <div>
              <div style={{fontSize:"0.72rem",fontWeight:600,color:C.text}}>{setup.wardName}</div>
              <div style={{fontSize:"1.2rem",color:C.textSub,marginTop:-4,fontWeight:400,letterSpacing:"-0.02em",lineHeight:1.15}}>{setup.appointmentType}</div>
              <div style={{fontSize:"0.6rem",color:C.textMuted,marginTop:1,fontWeight:500,letterSpacing:"0.04em",textTransform:"uppercase"}}>Surgery</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {!seniorMode&&(isLeader
              ?<span style={{background:theme,color:"#fff",fontSize:"0.62rem",fontWeight:600,padding:"4px 10px",borderRadius:20}}>LEADER</span>
              :<button onClick={()=>setShowPin(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.surface,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:20,padding:"5px 12px",fontSize:"0.72rem",cursor:"pointer",fontFamily:SF,boxShadow:C.shadow}}><Icon name="key" size={12} color={C.textSub}/> Login</button>
            )}
            {seniorMode&&<span style={{fontSize:"0.62rem",fontWeight:600,color:"#007aff",background:"rgba(0,122,255,0.08)",border:"1px solid rgba(0,122,255,0.2)",borderRadius:20,padding:"4px 10px"}}>READ ONLY</span>}
            {isLeader&&!seniorMode&&<button onClick={()=>{setSetupForm({wardName:setup.wardName||"",appointmentType:setup.appointmentType||"",themeColor:setup.themeColor||"#007aff",students:(setup.students||[]).map(s=>({...s})),consultants:(setup.consultants||[]).map(c=>({...c})),wardSections:(setup.wardSections||[]).map(s=>({...s})),shadowHOs:(setup.shadowHOs||[]).map(h=>({...h})),specialBeds:(setup.specialBeds||[]).map(b=>({...b})),customTags:(setup.customTags||[]).map(t=>({...t}))});setEditMode(true);}} style={{display:"flex",alignItems:"center",justifyContent:"center",background:C.surface,border:`1px solid ${C.border}`,color:C.textMuted,borderRadius:50,width:32,height:32,cursor:"pointer",boxShadow:C.shadow}}><Icon name="settings" size={14} color={C.textMuted}/></button>}
          </div>
        </div>
      </div>

      <div style={{borderBottom:`1px solid ${C.border}`,background:"rgba(245,245,247,0.88)",position:"sticky",top:"53px",zIndex:49,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",padding:"0 16px"}}>
          {[{id:"ward",label:"Ward"},...(!seniorMode?[{id:"students",label:"Students"}]:[]),{id:"archive",label:"Archive"}].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:"11px 16px",fontSize:"0.8rem",fontWeight:500,fontFamily:SF,background:"none",border:"none",cursor:"pointer",color:activeTab===t.id?theme:C.textMuted,borderBottom:activeTab===t.id?`2px solid ${theme}`:"2px solid transparent",marginBottom:"-1px",transition:"color 0.15s"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"16px 16px 100px"}}>

        {activeTab==="ward" && <>

          {shadowHOs.length>0&&(
            <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 16px",marginBottom:16,boxShadow:C.shadow}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:"0.65rem",fontWeight:600,color:C.textMuted,letterSpacing:"0.05em",textTransform:"uppercase"}}>Shadow HO Posts · 3-day rotation</span>
                {isLeader&&!seniorMode&&<button onClick={startShadowEdit} style={{background:"none",border:"none",color:theme,fontSize:"0.72rem",cursor:"pointer",fontFamily:SF,fontWeight:500}}>Edit</button>}
              </div>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {shadowHOs.map((ho,i)=>(
                  <div key={i} style={{flex:1,minWidth:100,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:10,padding:"8px 10px"}}>
                    <div style={{fontSize:"0.6rem",color:C.textMuted,fontWeight:500,marginBottom:2}}>{ho.post}</div>
                    <div style={{fontSize:"0.82rem",fontWeight:600,color:ho.name?C.text:C.textMuted}}>{ho.name||"Unassigned"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pairings matrix */}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,marginBottom:16,boxShadow:C.shadow,overflow:"hidden"}}>
            <div onClick={()=>setPairingOpen(o=>!o)} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"12px 16px",cursor:"pointer",userSelect:"none"}}>
              <span style={{fontSize:"0.65rem",fontWeight:600,color:C.textMuted,letterSpacing:"0.05em",textTransform:"uppercase"}}>Pairings</span>
              <div style={{display:"flex",gap:10,alignItems:"center"}}>
                {isLeader&&!seniorMode&&<button onClick={e=>{e.stopPropagation();setPairingForm(pairings.map(p=>({members:[...(p.members||[])]})));setPairingOpen(true);setPairingEdit(true);}} style={{background:"none",border:"none",color:theme,fontSize:"0.72rem",cursor:"pointer",fontFamily:SF,fontWeight:500}}>Edit</button>}
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{transition:"transform 0.2s",transform:pairingOpen?"rotate(180deg)":"rotate(0deg)"}}>
                  <path d="M3 5l4 4 4-4" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
            </div>
            {pairingOpen&&(
              <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 16px 14px"}}>
                {pairingEdit ? (
                  <div>
                    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                      <p style={{fontSize:"0.72rem",color:C.textMuted,margin:0}}>Tap names to add or remove. Shadow HOs are grayed out.</p>
                      <button onClick={()=>{
                        // Shuffle eligible students into pairs of 2 (last group gets 3 if odd)
                        const eligible = activeStudents.map(s=>s.name).sort(()=>Math.random()-0.5);
                        const newForm = [];
                        for (let i=0; i<eligible.length; i+=2) {
                          const members = [eligible[i]];
                          if (eligible[i+1]) members.push(eligible[i+1]);
                          // If this is second-to-last pair and one student left after, add them here
                          if (i+2===eligible.length-1) { members.push(eligible[i+2]); i++; }
                          newForm.push({members});
                        }
                        setPairingForm(newForm);
                      }} style={{display:"flex",alignItems:"center",gap:5,background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.2)`,color:theme,borderRadius:8,padding:"5px 12px",fontSize:"0.72rem",cursor:"pointer",fontFamily:SF,fontWeight:600,flexShrink:0}}>
                        <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M2 4h8M2 8h5M2 12h3M12 3l2 2-2 2M12 9l2 2-2 2M14 5h-3a2 2 0 00-2 2v2a2 2 0 002 2h3" stroke={theme} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                        Randomize
                      </button>
                    </div>
                    {pairingForm.map((pair,i)=>{
                      const members=(pair.members||[]).filter(Boolean);
                      // Which students are in OTHER pairings (not this one)
                      const otherPairingMap = {};
                      pairingForm.forEach((p,pi)=>{ if(pi!==i)(p.members||[]).filter(Boolean).forEach(m=>{ otherPairingMap[m]=pi; }); });
                      return (
                        <div key={i} style={{background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px",marginBottom:8}}>
                          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:10}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <span style={{fontSize:"0.72rem",fontWeight:700,color:theme}}>Pairing {i+1}</span>
                              {members.length>0&&<span style={{fontSize:"0.72rem",color:C.textSub}}>{members.filter(m=>!shadowHONames.has(m)).map((m,mi)=><span key={m}>{mi>0&&<span style={{margin:"0 3px",opacity:0.5}}>×</span>}<NameWithGroup name={m} color={C.textSub} fontSize="0.72rem" fontWeight={500}/></span>)}</span>}
                            </div>
                            <button onClick={()=>setPairingForm(f=>f.filter((_,idx)=>idx!==i))} style={rB}><Icon name="close" size={11} color={C.textMuted}/></button>
                          </div>
                          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(76px,1fr))",gap:6}}>
                            {students.filter(s=>s.name).map(s=>{
                              const isHO = shadowHONames.has(s.name);
                              const isSelected = members.includes(s.name);
                              const inOtherIdx = otherPairingMap[s.name];
                              const inOther = inOtherIdx!=null;
                              const atMax = members.length>=3 && !isSelected;
                              const disabled = isHO || (atMax && !inOther);
                              return (
                                <div key={s.name}
                                  onClick={()=>{
                                    if (isHO) return;
                                    const f=[...pairingForm];
                                    const m=[...(f[i].members||[])].filter(Boolean);
                                    if (isSelected) {
                                      f[i]={...f[i],members:m.filter(x=>x!==s.name)};
                                    } else {
                                      if (m.length>=3) return;
                                      // Remove from other pairing if there
                                      if (inOther) { const g=[...(f[inOtherIdx].members||[])].filter(Boolean); f[inOtherIdx]={...f[inOtherIdx],members:g.filter(x=>x!==s.name)}; }
                                      f[i]={...f[i],members:[...m,s.name]};
                                    }
                                    setPairingForm(f);
                                  }}
                                  style={{padding:"8px 4px",borderRadius:8,cursor:disabled?"not-allowed":"pointer",textAlign:"center",transition:"all 0.1s",
                                    background:isHO?"rgba(0,0,0,0.02)":isSelected?`rgba(${rgb},0.12)`:inOther?"rgba(245,158,11,0.07)":C.surface,
                                    border:`1px solid ${isHO?C.border:isSelected?theme:inOther?"rgba(245,158,11,0.35)":C.border}`,
                                    opacity:isHO?0.35:disabled?0.5:1}}>
                                  <div style={{fontSize:"0.74rem",fontWeight:600,color:isHO?C.textMuted:isSelected?theme:inOther?"rgb(161,104,0)":C.text,lineHeight:1.2,marginBottom:1}}>{s.name.split(" ")[0]}</div>
                                  {s.group&&<div style={{fontSize:"0.52rem",fontFamily:"monospace",fontWeight:700,color:isHO?C.textMuted:isSelected?theme:C.textMuted}}>{s.group}</div>}
                                  {isHO&&<div style={{fontSize:"0.46rem",color:C.textMuted,marginTop:1}}>Shadow HO</div>}
                                  {inOther&&!isSelected&&<div style={{fontSize:"0.46rem",color:"rgb(161,104,0)",marginTop:1}}>P{inOtherIdx+1}</div>}
                                </div>
                              );
                            })}
                          </div>
                          {members.length>=3&&<div style={{fontSize:"0.65rem",color:C.textMuted,marginTop:8,textAlign:"center"}}>Max 3 members reached</div>}
                        </div>
                      );
                    })}
                    <button onClick={()=>setPairingForm(f=>[...f,{members:[]}])} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Pairing</button>
                    <div style={{display:"flex",gap:10,marginTop:12}}>
                      <button onClick={()=>setPairingEdit(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"10px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
                      <button onClick={()=>savePairings(pairingForm.map(p=>({members:(p.members||[]).filter(Boolean)})).filter(p=>p.members.length>0))} style={{flex:1,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"10px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Save</button>
                    </div>
                  </div>
                ) : pairings.length===0 ? (
                  <div style={{textAlign:"center",color:C.textMuted,fontSize:"0.8rem",padding:"10px 0"}}>{isLeader?"No pairings yet — tap Edit to configure.":"No pairings configured."}</div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {pairings.map((pair,i)=>{
                      const members=(pair.members||[]).filter(Boolean);
                      const ptCount=patients.filter(p=>p.pairingIdx===i).length;
                      const activeMembers=members.filter(m=>!shadowHONames.has(m));
                      const hoMembers=members.filter(m=>shadowHONames.has(m));
                      return (
                        <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:10,background:C.bg,border:`1px solid rgba(${rgb},0.15)`}}>
                          <span style={{fontSize:"0.62rem",fontWeight:700,color:theme,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.2)`,borderRadius:5,padding:"2px 7px",flexShrink:0}}>P{i+1}</span>
                          <div style={{flex:1}}>
                            <div style={{fontSize:"0.88rem",fontWeight:600,color:C.text,lineHeight:1.3}}>
                              {activeMembers.map((m,mi)=>(
                                <span key={m}>
                                  {mi>0&&<span style={{color:C.textMuted,fontWeight:400,margin:"0 4px"}}>×</span>}
                                  <NameWithGroup name={m} color={C.text} fontSize="0.88rem" fontWeight={600}/>
                                </span>
                              ))}
                            </div>
                            {hoMembers.length>0&&<div style={{fontSize:"0.62rem",color:C.textMuted,marginTop:2}}>{hoMembers.join(", ")} — Shadow HO</div>}
                          </div>
                          <span style={{fontSize:"0.65rem",color:C.textMuted,background:C.surfaceEl,borderRadius:5,padding:"2px 7px",flexShrink:0,whiteSpace:"nowrap"}}>{ptCount} pt</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
            {[{label:"Patients",val:stats.total,color:theme},{label:"Hx Taken",val:`${stats.histTaken}/${stats.total}`,color:C.green},{label:"New",val:stats.isNew,color:C.red}].map(s=>(
              <div key={s.label} style={{background:C.surface,border:"1px solid rgba(0,0,0,0.08)",borderRadius:14,padding:"12px 10px",textAlign:"center",boxShadow:"0 4px 14px rgba(0,0,0,0.07)"}}>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:s.color,letterSpacing:"-0.04em"}}>{s.val}</div>
                <div style={{fontSize:"0.6rem",color:C.textSub,marginTop:2,letterSpacing:"0.04em",textTransform:"uppercase",fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>

          {sections.length>0&&(
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {["all",...sections.map(s=>s.name),...(patients.some(p=>p.isFloor)?["Floor"]:[])].map(sec=>(
                <button key={sec} onClick={()=>setSectionFilter(sec)} style={{padding:"5px 12px",borderRadius:20,fontSize:"0.74rem",fontWeight:sectionFilter===sec?600:400,cursor:"pointer",fontFamily:SF,background:sectionFilter===sec?theme:C.surface,border:`1px solid ${sectionFilter===sec?theme:C.border}`,color:sectionFilter===sec?"#fff":C.textSub}}>
                  {sec==="all"?"All":sec}
                </button>
              ))}
            </div>
          )}

          {/* Search bar */}
          <div style={{position:"relative",marginBottom:14}}>
            <svg width="15" height="15" viewBox="0 0 20 20" fill="none" style={{position:"absolute",left:11,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}>
              <circle cx="8.5" cy="8.5" r="5.5" stroke={C.textMuted} strokeWidth="1.6"/>
              <path d="M14 14l3 3" stroke={C.textMuted} strokeWidth="1.6" strokeLinecap="round"/>
            </svg>
            <input type="text" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search patients by name or BHT…" style={{width:"100%",boxSizing:"border-box",padding:"9px 34px 9px 32px",fontSize:"0.82rem",fontFamily:SF,background:C.surface,border:`1px solid ${searchActive?theme:C.border}`,borderRadius:12,color:C.text,outline:"none",boxShadow:searchActive?`0 0 0 3px rgba(${rgb},0.12)`:C.shadow,transition:"border-color 0.15s,box-shadow 0.15s"}}/>
            {searchActive&&(<button onClick={()=>setSearchQuery("")} style={{position:"absolute",right:10,top:"50%",transform:"translateY(-50%)",background:"none",border:"none",cursor:"pointer",padding:2,display:"flex",alignItems:"center"}}><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="7" fill={C.border}/><path d="M5.5 5.5l5 5M10.5 5.5l-5 5" stroke={C.textSub} strokeWidth="1.5" strokeLinecap="round"/></svg></button>)}
          </div>
          {searchActive&&(<div style={{fontSize:"0.7rem",color:C.textMuted,marginBottom:10,paddingLeft:2}}>{filteredPatients.length===0?"No patients found":`${filteredPatients.length} result${filteredPatients.length!==1?"s":""} across all sections`}</div>)}

          {isLeader&&!seniorMode&&(
            <button onClick={()=>{setNewPt({bht:"",patientName:"",ageYears:"",ageMonths:"",bedNo:"",section:"",side:"single",pairingIdx:null,isFloor:false,shadowHO:""});setShowAddPt(true);}} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:"11px",fontSize:"0.84rem",marginBottom:16,background:C.surface,border:`1px solid ${C.border}`,color:theme,borderRadius:12,cursor:"pointer",fontFamily:SF,fontWeight:500,boxShadow:C.shadow}}>
              <Icon name="plus" size={14} color={theme}/> Add Patient
            </button>
          )}

          {patients.length===0
            ? <div style={{textAlign:"center",padding:"40px 20px",color:C.textMuted,fontSize:"0.85rem"}}>{isLeader?"No patients yet. Tap Add Patient to start.":"No patients yet."}</div>
            : <>
              {/* Unassigned patients — always at top */}
              {(()=>{
                const unassigned = filteredPatients.filter(p=>!p.section||!p.bedNo);
                if (unassigned.length===0) return null;
                return (
                  <div style={{marginBottom:24}}>
                    <div style={{fontSize:"0.65rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:700,marginBottom:10,paddingLeft:2}}>Unassigned</div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10}}>
                      {unassigned.map(pt=>{
                        const pLabel=getPairingLabel(pt.pairingIdx);
                        const filled=pt.diagnosis||pt.consultant||pt.patientName;
                        return (
                          <div key={pt.id} onClick={seniorMode?undefined:()=>{setSelectedPt(pt.id);setPtEdit({bht:pt.bht||"",patientName:pt.patientName||"",ageYears:pt.age?.match(/(\d+)y/)?.[1]||"",ageMonths:pt.age?.match(/(\d+)m/)?.[1]||"",bedNo:"",section:"",side:"single",pairingIdx:pt.pairingIdx??null,consultant:pt.consultant||"",diagnosis:pt.diagnosis||"",notes:pt.notes||"",historyTaken:!!pt.historyTaken,isNew:!!pt.isNew,tags:pt.tags||[],shadowHO:pt.shadowHO||""});}}
                            style={{background:C.surface,border:`1px dashed ${C.borderMid}`,borderRadius:14,padding:"12px 11px",cursor:seniorMode?"default":"pointer",position:"relative",boxShadow:"0 2px 10px rgba(0,0,0,0.05)",transition:"transform 0.12s,box-shadow 0.12s",userSelect:"none"}}
                            onMouseEnter={e=>{if(!seniorMode){e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 28px rgba(0,0,0,0.11)";}}}
                            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 2px 10px rgba(0,0,0,0.05)";}}>
                            <div style={{position:"absolute",top:9,right:9,display:"flex",gap:4,alignItems:"center"}}>
                              {pt.historyTaken&&<Icon name="history" size={11} color={C.green}/>}
                              {pt.isNew&&<span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={10} color={C.red}/></span>}
                            </div>
                            <div style={{fontSize:"0.55rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:1}}>Unassigned</div>
                            <div style={{fontSize:"1.25rem",fontWeight:700,color:C.textMuted,lineHeight:1,letterSpacing:"-0.03em",marginBottom:4}}>—</div>
                            <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:3,flexWrap:"wrap"}}>
                              <span style={{fontSize:"0.78rem",fontWeight:700,color:C.text,lineHeight:1.2,wordBreak:"break-word"}}>{pt.patientName||"—"}</span>
                              {pt.age&&<span style={{fontSize:"0.6rem",color:C.textSub,flexShrink:0}}>{pt.age}</span>}
                            </div>
                            {pt.bht&&<div style={{fontSize:"0.55rem",fontFamily:"monospace",color:C.textMuted,marginBottom:2}}>BHT {pt.bht}</div>}
                            {pt.consultant&&(()=>{const cObj=consultants.find(c=>(typeof c==="object"?c.name:c)===pt.consultant);const cColor=cObj?.color;return<div style={{fontSize:"0.58rem",color:cColor||C.textSub,display:"flex",alignItems:"center",gap:3,overflow:"hidden",marginBottom:1}}>{cColor&&<span style={{width:6,height:6,borderRadius:"50%",background:cColor,flexShrink:0}}/>}<span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.consultant}</span></div>;})()} 
                            {pt.diagnosis&&<div style={{fontSize:"0.62rem",color:C.text,fontStyle:"italic",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{pt.diagnosis}</div>}
                            {pt.notes&&<div style={{fontSize:"0.58rem",color:C.textMuted,lineHeight:1.35,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",marginBottom:3}}>{pt.notes}</div>}
                            {pLabel&&(
                              <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:3}}>
                                <span style={{fontSize:"0.52rem",fontWeight:700,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.25)`,borderRadius:4,padding:"1px 5px",color:theme}}>{pLabel}</span>
                                {(pt.members||[]).map(m=>{const g=getGroup(m);return<span key={m} style={{fontSize:"0.52rem",background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:4,padding:"1px 5px",color:C.textSub,display:"inline-flex",alignItems:"baseline",gap:"1px"}}>{m.split(" ")[0]}{g&&<sup style={{fontSize:"0.45em",fontWeight:700,opacity:0.7}}>{g}</sup>}</span>;})}
                              </div>
                            )}
                            {pt.shadowHO&&<div style={{marginTop:3}}><span style={{fontSize:"0.52rem",background:"rgba(0,0,0,0.03)",border:"1px dashed rgba(0,0,0,0.2)",borderRadius:4,padding:"1px 6px",color:C.textMuted,fontStyle:"italic"}}>{pt.shadowHO}</span></div>}
                            {(pt.tags||[]).length>0&&(
                              <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:3}}>
                                {(pt.tags||[]).map(t=>{const tag=(setup.customTags||[]).find(ct=>ct.label===t);return tag?<span key={t} style={{fontSize:"0.5rem",fontWeight:700,padding:"1px 5px",borderRadius:4,background:`rgba(${hexToRgb(tag.color)},0.12)`,color:tag.color,border:`1px solid rgba(${hexToRgb(tag.color)},0.3)`}}>{t}</span>:null;})}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
              {/* Assigned patients grouped by section → bed */}
              {orderedSections.length===0&&filteredPatients.filter(p=>p.section&&p.bedNo).length===0
                ? null
                : orderedSections.map(secName=>(
                <div key={secName} style={{marginBottom:24}}>
                  <div style={{fontSize:"0.65rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:700,marginBottom:10,paddingLeft:2}}>{secName}</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10}}>
                    {Object.entries(bedMap[secName]||{}).sort(([a],[b])=>isNaN(a)||isNaN(b)?a.localeCompare(b):Number(a)-Number(b)).flatMap(([bedNo,bedPts])=>{
                      const ptL = bedPts.find(p=>p.side==="L");
                      const ptR = bedPts.find(p=>p.side==="R");
                      const ptSingle = bedPts.filter(p=>!p.side||p.side==="single");
                      const isDual = ptL||ptR;
                      const openPtEdit = (pt) => { setSelectedPt(pt.id); setPtEdit({bht:pt.bht||"",patientName:pt.patientName||"",ageYears:pt.age?.match(/(\d+)y/)?.[1]||"",ageMonths:pt.age?.match(/(\d+)m/)?.[1]||"",bedNo:pt.bedNo||"",section:pt.section||"",side:pt.side||"single",pairingIdx:pt.pairingIdx??null,consultant:pt.consultant||"",diagnosis:pt.diagnosis||"",notes:pt.notes||"",historyTaken:!!pt.historyTaken,isNew:!!pt.isNew,tags:pt.tags||[],shadowHO:pt.shadowHO||""}); };

                      const Tile = ({pt, sideLabel}) => {
                        const pLabel = getPairingLabel(pt.pairingIdx);
                        const filled = pt.diagnosis||pt.consultant||pt.patientName;
                        return (
                          <div onClick={seniorMode?undefined:()=>openPtEdit(pt)}
                            style={{background:C.surface,border:pt.historyTaken?`1px solid rgba(${hexToRgb(C.green)},0.25)`:`1px solid rgba(0,0,0,${filled?0.1:0.07})`,borderRadius:14,padding:"12px 11px",cursor:seniorMode?"default":"pointer",position:"relative",boxShadow:filled?"0 6px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.05)":"0 2px 10px rgba(0,0,0,0.05)",transition:"transform 0.12s,box-shadow 0.12s",userSelect:"none"}}
                            onMouseEnter={e=>{if(!seniorMode){e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 28px rgba(0,0,0,0.11)";}}}
                            onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=filled?"0 6px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.05)":"0 2px 10px rgba(0,0,0,0.05)";}}>
                            <div style={{position:"absolute",top:9,right:9,display:"flex",gap:4,alignItems:"center"}}>
                              {pt.historyTaken&&<Icon name="history" size={11} color={C.green}/>}
                              {pt.isNew&&<span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={10} color={C.red}/></span>}
                            </div>
                            {/* Section + bed number */}
                            <div style={{fontSize:"0.55rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:1}}>
                              {pt.section}{sideLabel&&<span style={{marginLeft:4,background:`rgba(${rgb},0.1)`,color:theme,borderRadius:3,padding:"0 4px",fontWeight:700}}>{sideLabel}</span>}
                            </div>
                            <div style={{fontSize:"1.25rem",fontWeight:700,color:theme,lineHeight:1,letterSpacing:"-0.03em",marginBottom:4}}>{String(bedNo).padStart(2,"0")}</div>
                            {/* Name + age */}
                            <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:3,flexWrap:"wrap"}}>
                              <span style={{fontSize:"0.78rem",fontWeight:700,color:C.text,lineHeight:1.2,wordBreak:"break-word"}}>{pt.patientName||"—"}</span>
                              {pt.age&&<span style={{fontSize:"0.6rem",color:C.textSub,flexShrink:0}}>{pt.age}</span>}
                            </div>
                            {pt.bht&&<div style={{fontSize:"0.55rem",fontFamily:"monospace",color:C.textMuted,marginBottom:2}}>BHT {pt.bht}</div>}
                            {pt.consultant&&(()=>{const cObj=consultants.find(c=>(typeof c==="object"?c.name:c)===pt.consultant);const cColor=cObj?.color;return<div style={{fontSize:"0.58rem",color:cColor||C.textSub,display:"flex",alignItems:"center",gap:3,overflow:"hidden",marginBottom:1}}>{cColor&&<span style={{width:6,height:6,borderRadius:"50%",background:cColor,flexShrink:0}}/>}<span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.consultant}</span></div>;})()} 
                            {pt.diagnosis&&<div style={{fontSize:"0.62rem",color:C.text,fontStyle:"italic",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{pt.diagnosis}</div>}
                            {pt.notes&&<div style={{fontSize:"0.58rem",color:C.textMuted,lineHeight:1.35,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",marginBottom:3}}>{pt.notes}</div>}
                            {pLabel&&(
                              <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:3}}>
                                <span style={{fontSize:"0.52rem",fontWeight:700,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.25)`,borderRadius:4,padding:"1px 5px",color:theme}}>{pLabel}</span>
                                {(pt.members||[]).map(m=>{const g=getGroup(m);return<span key={m} style={{fontSize:"0.52rem",background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:4,padding:"1px 5px",color:C.textSub,display:"inline-flex",alignItems:"baseline",gap:"1px"}}>{m.split(" ")[0]}{g&&<sup style={{fontSize:"0.45em",fontWeight:700,opacity:0.7}}>{g}</sup>}</span>;})}
                              </div>
                            )}
                            {pt.shadowHO&&<div style={{marginTop:3}}><span style={{fontSize:"0.52rem",background:"rgba(0,0,0,0.03)",border:"1px dashed rgba(0,0,0,0.2)",borderRadius:4,padding:"1px 6px",color:C.textMuted,fontStyle:"italic"}}>{pt.shadowHO}</span></div>}
                            {(pt.tags||[]).length>0&&(
                              <div style={{display:"flex",gap:3,flexWrap:"wrap",marginTop:3}}>
                                {(pt.tags||[]).map(t=>{const tag=(setup.customTags||[]).find(ct=>ct.label===t);return tag?<span key={t} style={{fontSize:"0.5rem",fontWeight:700,padding:"1px 5px",borderRadius:4,background:`rgba(${hexToRgb(tag.color)},0.12)`,color:tag.color,border:`1px solid rgba(${hexToRgb(tag.color)},0.3)`}}>{t}</span>:null;})}
                              </div>
                            )}
                          </div>
                        );
                      };

                      if (isDual) {
                        // L and R each get their own tile; also show any orphaned single patients
                        return [
                          ptL ? <Tile key={`${bedNo}-L`} pt={ptL} sideLabel="L"/> : null,
                          ptR ? <Tile key={`${bedNo}-R`} pt={ptR} sideLabel="R"/> : null,
                          ...ptSingle.map(pt=><Tile key={pt.id} pt={pt} sideLabel="!"/>),
                        ].filter(Boolean);
                      }
                      return ptSingle.map(pt=><Tile key={pt.id} pt={pt} sideLabel=""/>);
                    })}
                  </div>
                </div>
              ))}
            </>
          }
        </>}

        {activeTab==="students"&&!seniorMode&&(
          <div>
            {/* Shadow HO section — expandable */}
            {shadowHOs.filter(h=>h.name).length>0&&(
              <ShadowHOStudentsSection shadowHOs={shadowHOs} patients={patients} theme={theme} rgb={rgb} onSelectPt={(pt)=>{setSelectedPt(pt.id);setPtEdit({bht:pt.bht||"",patientName:pt.patientName||"",ageYears:pt.age?.match(/(\d+)y/)?.[1]||"",ageMonths:pt.age?.match(/(\d+)m/)?.[1]||"",bedNo:pt.bedNo||"",section:pt.section||"",side:pt.side||"single",pairingIdx:pt.pairingIdx??null,consultant:pt.consultant||"",diagnosis:pt.diagnosis||"",notes:pt.notes||"",historyTaken:!!pt.historyTaken,isNew:!!pt.isNew,tags:pt.tags||[],shadowHO:pt.shadowHO||""});}}/>
            )}
            {pairings.length===0&&activeStudents.length===0
              ? <p style={{color:C.textMuted,fontSize:"0.85rem"}}>No students or pairings configured.</p>
              : <>
                  {pairings.map((pair,pi)=>{
                    const members=(pair.members||[]).filter(Boolean);
                    const pPts=patients.filter(p=>p.pairingIdx===pi);
                    return (
                      <PairingStudentsCard key={pi} pi={pi} members={members} pPts={pPts}
                        theme={theme} rgb={rgb} shadowHONames={shadowHONames}
                        NameWithGroup={NameWithGroup}
                        onSelectPt={(pt)=>{setSelectedPt(pt.id);setPtEdit({bht:pt.bht||"",patientName:pt.patientName||"",ageYears:pt.age?.match(/(\d+)y/)?.[1]||"",ageMonths:pt.age?.match(/(\d+)m/)?.[1]||"",bedNo:pt.bedNo||"",section:pt.section||"",side:pt.side||"single",pairingIdx:pt.pairingIdx??null,consultant:pt.consultant||"",diagnosis:pt.diagnosis||"",notes:pt.notes||"",historyTaken:!!pt.historyTaken,isNew:!!pt.isNew,tags:pt.tags||[],shadowHO:pt.shadowHO||""});}}
                      />
                    );
                  })}
                  {activeStudents.filter(s=>!pairings.some(p=>(p.members||[]).includes(s.name))).map(s=>(
                    <div key={s.name} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",marginBottom:8,boxShadow:C.shadow}}>
                      <span style={{fontWeight:600,color:C.text,fontSize:"0.88rem"}}>{s.name}</span>
                      <span style={{fontSize:"0.68rem",color:C.textMuted,marginLeft:8}}>Not in any pairing</span>
                    </div>
                  ))}
                </>
            }
          </div>
        )}

        {activeTab==="archive"&&(
          <div>
            {Object.keys(ward.archive||{}).length===0
              ? <p style={{color:C.textMuted,fontSize:"0.85rem"}}>No archived records yet.</p>
              : Object.entries(ward.archive||{}).sort(([a],[b])=>b.localeCompare(a)).map(([wk,wkData])=>(
                  <div key={wk} style={{marginBottom:20}}>
                    <div style={{fontSize:"0.65rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>{wk}</div>
                    {Object.entries(wkData).map(([id,pt])=>(
                      <div key={id} style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:8,boxShadow:C.shadow}}>
                        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
                          <div>
                            <span style={{fontWeight:600,color:C.text,fontSize:"0.9rem"}}>{pt.patientName||"Patient"}</span>
                            {pt.bht&&<span style={{fontSize:"0.68rem",color:C.textMuted,marginLeft:8,fontFamily:"monospace"}}>BHT {pt.bht}</span>}
                            {pt.bedNo&&<span style={{fontSize:"0.68rem",color:C.textMuted,marginLeft:8}}>Bed {pt.bedNo}{pt.side&&pt.side!=="single"?` ${pt.side}`:""}</span>}
                          </div>
                          {isLeader&&!seniorMode&&<button onClick={async()=>{const archive={...(ward.archive||{})};const wkD={...archive[wk]};delete wkD[id];if(!Object.keys(wkD).length)delete archive[wk];else archive[wk]=wkD;await save({...ward,archive});showToast("Deleted");}} style={{fontSize:"0.72rem",color:C.red,background:"none",border:`1px solid ${C.red}`,borderRadius:6,padding:"3px 8px",cursor:"pointer",fontFamily:SF}}>Delete</button>}
                        </div>
                        {pt.diagnosis&&<div style={{fontSize:"0.75rem",color:C.textSub,fontStyle:"italic"}}>{pt.diagnosis}</div>}
                        {pt.pairingIdx!=null&&<div style={{fontSize:"0.68rem",color:C.textMuted,marginTop:3}}>Pairing {pt.pairingIdx+1}</div>}
                      </div>
                    ))}
                  </div>
                ))
            }
          </div>
        )}
      </div>

      {/* Add Patient modal */}
      {showAddPt&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}}>
          <div style={{width:"100%",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",maxHeight:"85vh",overflowY:"auto",boxShadow:"0 -4px 40px rgba(0,0,0,0.12)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 18px"}}/>
            <h3 style={{margin:"0 0 16px",color:C.text,fontWeight:600}}>Add Patient</h3>

            {/* BHT + Name */}
            <div style={{marginBottom:12}}><label style={labelStyle}>BHT</label><input value={newPt.bht} onChange={e=>setNewPt(p=>({...p,bht:e.target.value}))} placeholder="e.g. 123456" style={{...iS,width:"100%",boxSizing:"border-box",marginTop:4,fontFamily:"monospace"}}/></div>
            <div style={{marginBottom:12}}><label style={labelStyle}>Patient Name</label><input value={newPt.patientName} onChange={e=>setNewPt(p=>({...p,patientName:e.target.value}))} placeholder="Name" style={{...iS,width:"100%",boxSizing:"border-box",marginTop:4}}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:16}}>
              <div><label style={labelStyle}>Age (years)</label><input type="number" value={newPt.ageYears} onChange={e=>setNewPt(p=>({...p,ageYears:e.target.value}))} placeholder="0" style={{...iS,width:"100%",boxSizing:"border-box",marginTop:4}}/></div>
              <div><label style={labelStyle}>Age (months)</label><input type="number" value={newPt.ageMonths} onChange={e=>setNewPt(p=>({...p,ageMonths:e.target.value}))} placeholder="0" style={{...iS,width:"100%",boxSizing:"border-box",marginTop:4}}/></div>
            </div>

            {/* Section & Bed — optional */}
            <div style={{marginBottom:16}}>
              <label style={labelStyle}>Section & Bed <span style={{fontWeight:400,color:C.textMuted,fontSize:"0.72rem"}}>(optional)</span></label>
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6,marginBottom:8}}>
                {sections.map(s=>{
                  const isSel=newPt.section===s.name;
                  return <button key={s.name} onClick={()=>setNewPt(p=>({...p,section:isSel?"":s.name,bedNo:"",side:"single",isFloor:false}))}
                    style={{padding:"5px 14px",borderRadius:20,fontSize:"0.78rem",fontWeight:isSel?600:400,cursor:"pointer",fontFamily:SF,
                      background:isSel?theme:C.surfaceEl,border:`1px solid ${isSel?theme:C.border}`,color:isSel?"#fff":C.textSub}}>{s.name}</button>;
                })}
                {/* Floor pill */}
                <button onClick={()=>setNewPt(p=>({...p,section:p.isFloor?"":p.section,bedNo:"",side:"single",isFloor:!p.isFloor,...(!p.isFloor?{section:""}:{})}))}
                  style={{padding:"5px 14px",borderRadius:20,fontSize:"0.78rem",fontWeight:newPt.isFloor?600:400,cursor:"pointer",fontFamily:SF,
                    background:newPt.isFloor?C.textSub:C.surfaceEl,border:`1px solid ${newPt.isFloor?C.textSub:C.border}`,color:newPt.isFloor?"#fff":C.textSub}}>
                  Floor
                </button>
              </div>
              {newPt.isFloor&&(
                <div style={{padding:"8px 12px",background:"rgba(0,0,0,0.04)",border:`1px dashed ${C.borderMid}`,borderRadius:10,fontSize:"0.75rem",color:C.textSub}}>
                  Will be assigned the next floor number (F1, F2, …) automatically.
                </div>
              )}
              {!newPt.isFloor&&newPt.section&&(()=>{
                const secSetup=sections.find(s=>s.name===newPt.section);
                let rangeBeds=[];
                if(secSetup?.range){const parts=secSetup.range.split("-").map(s=>s.trim());if(parts.length===2&&!isNaN(parts[0])&&!isNaN(parts[1])){for(let n=Number(parts[0]);n<=Number(parts[1]);n++)rangeBeds.push(String(n));}}
                const specBeds=(setup.specialBeds||[]).filter(b=>b.section===newPt.section).map(b=>b.id);
                const allBeds=[...rangeBeds,...specBeds];
                const isFullyOccupied=(bed)=>{
                  const others=patients.filter(p=>p.bedNo===bed&&p.section===newPt.section);
                  return others.some(p=>p.side==="L")&&others.some(p=>p.side==="R");
                };
                const hasAnyOccupant=(bed)=>{
                  return patients.some(p=>p.bedNo===bed&&p.section===newPt.section);
                };
                if(allBeds.length===0) return <div style={{fontSize:"0.75rem",color:C.textMuted,marginBottom:8}}>No bed range for this section — edit settings to add one.</div>;
                return (
                  <div>
                    <div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:600,marginBottom:6}}>Select Bed</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                      {allBeds.map(bed=>{
                        const isSel=newPt.bedNo===bed;
                        const full=isFullyOccupied(bed);
                        const hasOccupant=hasAnyOccupant(bed);
                        return <button key={bed} onClick={()=>!full&&setNewPt(p=>({...p,bedNo:isSel?"":bed,side:isSel?"single":hasOccupant?"":"single",_conflictId:null,_conflictSide:null}))}
                          style={{padding:"6px 12px",borderRadius:9,fontSize:"0.82rem",fontWeight:isSel?700:500,
                            cursor:full&&!isSel?"not-allowed":"pointer",fontFamily:SF,
                            background:isSel?theme:full?"rgba(0,0,0,0.04)":hasOccupant?"rgba(245,158,11,0.08)":C.surface,
                            border:`1px solid ${isSel?theme:full?"rgba(0,0,0,0.08)":hasOccupant?"rgba(245,158,11,0.4)":C.border}`,
                            color:isSel?"#fff":full?C.textMuted:hasOccupant?"rgb(161,104,0)":C.text,
                            opacity:full&&!isSel?0.4:1,
                            boxShadow:isSel?`0 2px 8px rgba(${rgb},0.3)`:"none"}}>{bed}</button>;
                      })}
                    </div>
                    {newPt.bedNo&&(()=>{
                      const others=patients.filter(p=>p.bedNo===newPt.bedNo&&p.section===newPt.section);
                      const singleOccupant=others.find(p=>p.side==="single"||!p.side);
                      const lOccupant=others.find(p=>p.side==="L");
                      const rOccupant=others.find(p=>p.side==="R");
                      const lTaken=!!lOccupant;
                      const rTaken=!!rOccupant;
                      const hasMate=others.length>0;
                      // For a given new side, which existing patient needs to move and where?
                      const getConflict=(val)=>{
                        if(val==="L"&&singleOccupant) return {id:singleOccupant.id,toSide:"R"};
                        if(val==="R"&&singleOccupant) return {id:singleOccupant.id,toSide:"L"};
                        if(val==="L"&&rOccupant&&!lOccupant) return null; // no conflict
                        if(val==="R"&&lOccupant&&!rOccupant) return null; // no conflict
                        if(val==="R"&&rOccupant) return {id:rOccupant.id,toSide:"L"};
                        if(val==="L"&&lOccupant) return {id:lOccupant.id,toSide:"R"};
                        return null;
                      };
                      const warningMsg = singleOccupant
                        ? "This bed has a single-slot patient — selecting L or R will move them to the other side."
                        : hasMate ? "This bed already has a patient — select which side to place the new patient." : null;
                      return (
                        <div>
                          <div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:600,marginBottom:8}}>Bed Side</div>
                          {/* Show current occupants */}
                          <div style={{background:"rgba(245,158,11,0.06)",border:"1px solid rgba(245,158,11,0.2)",borderRadius:10,padding:"8px 12px",marginBottom:10}}>
                            <div style={{fontSize:"0.62rem",color:"rgb(161,104,0)",fontWeight:600,marginBottom:5,letterSpacing:"0.04em",textTransform:"uppercase"}}>Currently in this bed</div>
                            {singleOccupant&&<div style={{fontSize:"0.78rem",color:C.text,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:"0.62rem",background:"rgba(0,0,0,0.08)",borderRadius:4,padding:"1px 6px",color:C.textSub}}>Single</span>{singleOccupant.patientName||singleOccupant.bht||"Patient"}{singleOccupant.age&&<span style={{fontSize:"0.65rem",color:C.textSub}}>{singleOccupant.age}</span>}</div>}
                            {lOccupant&&<div style={{fontSize:"0.78rem",color:C.text,display:"flex",alignItems:"center",gap:8,marginBottom:rOccupant?4:0}}><span style={{fontSize:"0.62rem",background:`rgba(${rgb},0.1)`,borderRadius:4,padding:"1px 6px",color:theme}}>L</span>{lOccupant.patientName||lOccupant.bht||"Patient"}{lOccupant.age&&<span style={{fontSize:"0.65rem",color:C.textSub}}>{lOccupant.age}</span>}</div>}
                            {rOccupant&&<div style={{fontSize:"0.78rem",color:C.text,display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:"0.62rem",background:`rgba(${rgb},0.1)`,borderRadius:4,padding:"1px 6px",color:theme}}>R</span>{rOccupant.patientName||rOccupant.bht||"Patient"}{rOccupant.age&&<span style={{fontSize:"0.65rem",color:C.textSub}}>{rOccupant.age}</span>}</div>}
                          </div>
                          <div style={{display:"flex",gap:6}}>
                            {[{val:"single",label:"Single",taken:hasMate},{val:"L",label:"Left",taken:lTaken&&!singleOccupant},{val:"R",label:"Right",taken:rTaken&&!singleOccupant}].map(({val,label,taken})=>{
                              const isSel=newPt.side===val;
                              const conf=getConflict(val);
                              return <button key={val} onClick={()=>{
                                if(taken&&!isSel) return;
                                setNewPt(p=>({...p,side:val,_conflictId:conf?conf.id:null,_conflictSide:conf?conf.toSide:null}));
                              }}
                                style={{flex:1,padding:"8px",borderRadius:10,fontSize:"0.76rem",fontWeight:isSel?600:400,
                                  cursor:taken&&!isSel?"not-allowed":"pointer",fontFamily:SF,
                                  background:isSel?theme:taken?"rgba(0,0,0,0.03)":C.surfaceEl,
                                  border:`1px solid ${isSel?theme:taken?"rgba(0,0,0,0.08)":C.border}`,
                                  color:isSel?"#fff":taken?C.textMuted:C.textSub,
                                  opacity:taken&&!isSel?0.4:1}}>
                                {label}{taken&&!isSel?" ✗":""}
                              </button>;
                            })}
                          </div>
                          {newPt._conflictId&&<div style={{marginTop:8,padding:"7px 10px",background:`rgba(${rgb},0.06)`,border:`1px solid rgba(${rgb},0.15)`,borderRadius:8,fontSize:"0.72rem",color:theme}}>
                            New patient → <strong>{newPt.side==="L"?"Left":"Right"}</strong> · Existing patient moves to <strong>{newPt._conflictSide==="L"?"Left":"Right"}</strong> on add.
                          </div>}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>

            {/* Pairing — same list style as edit sheet */}
            <div style={{marginBottom:16}}>
              <label style={labelStyle}>Assign Pairing</label>
              {pairings.length===0
                ? <div style={{fontSize:"0.75rem",color:C.textMuted,marginTop:6}}>No pairings configured yet.</div>
                : <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
                    {pairings.map((pair,pi)=>{
                      const isSel=newPt.pairingIdx===pi;
                      const members=(pair.members||[]).filter(m=>m&&!shadowHONames.has(m));
                      const ptCount=patients.filter(p=>p.pairingIdx===pi).length;
                      return (
                        <div key={pi} onClick={()=>setNewPt(p=>({...p,pairingIdx:isSel?null:pi}))}
                          style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:11,cursor:"pointer",position:"relative",
                            background:isSel?`rgba(${rgb},0.08)`:C.surfaceEl,
                            border:`1px solid ${isSel?theme:C.border}`,transition:"all 0.1s"}}>
                          <span style={{fontSize:"0.62rem",fontWeight:700,color:isSel?theme:C.textMuted,background:isSel?`rgba(${rgb},0.12)`:C.surface,border:`1px solid ${isSel?`rgba(${rgb},0.25)`:C.border}`,borderRadius:5,padding:"2px 7px",flexShrink:0}}>P{pi+1}</span>
                          <span style={{flex:1,display:"flex",flexWrap:"wrap",gap:2,alignItems:"baseline"}}>
                            {members.length>0?members.map((m,mi)=><span key={m}>{mi>0&&<span style={{margin:"0 3px",color:isSel?theme:C.textMuted,opacity:0.6}}>×</span>}<NameWithGroup name={m} color={isSel?theme:C.text} fontSize="0.88rem" fontWeight={500}/></span>):<span style={{color:C.textMuted,fontSize:"0.88rem"}}>—</span>}
                          </span>
                          <span style={{fontSize:"0.65rem",color:isSel?theme:C.textMuted,flexShrink:0,marginRight:isSel?22:0}}>{ptCount} pt</span>
                          {isSel&&<div style={{position:"absolute",top:"50%",right:10,transform:"translateY(-50%)",width:18,height:18,borderRadius:"50%",background:theme,display:"flex",alignItems:"center",justifyContent:"center"}}><Icon name="check" size={9} color="#fff"/></div>}
                        </div>
                      );
                    })}
                    <div onClick={()=>setNewPt(p=>({...p,pairingIdx:null}))}
                      style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"9px",borderRadius:11,cursor:"pointer",
                        background:newPt.pairingIdx===null?"rgba(0,0,0,0.04)":C.bg,border:`1px dashed ${newPt.pairingIdx===null?C.textSub:C.border}`}}>
                      <span style={{fontSize:"0.75rem",color:C.textMuted}}>None</span>
                    </div>
                  </div>
              }
            </div>

            {/* Shadow HO Allocator */}
            {shadowHOs.filter(h=>h.name).length>0&&(
              <div style={{marginBottom:16}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <label style={labelStyle}>Shadow HO</label>
                  {isLeader&&!seniorMode&&(
                    <div onClick={()=>setShadowAutoAlloc(a=>!a)}
                      style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",userSelect:"none"}}>
                      <span style={{fontSize:"0.65rem",fontWeight:600,color:shadowAutoAlloc?theme:C.textMuted,fontFamily:SF}}>Auto</span>
                      <div style={{width:34,height:20,borderRadius:10,background:shadowAutoAlloc?theme:"rgba(0,0,0,0.15)",transition:"background 0.2s",position:"relative",flexShrink:0}}>
                        <div style={{position:"absolute",top:2,left:shadowAutoAlloc?16:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                      </div>
                    </div>
                  )}
                </div>
                {shadowAutoAlloc ? (
                  <div>
                    <div style={{fontSize:"0.68rem",color:C.textMuted,marginBottom:6,lineHeight:1.4}}>Automatically assigns the Shadow HO with fewest patients. When equal, picks randomly.</div>
                    {(()=>{
                      const suggested = getSuggestedShadow();
                      const count = suggested ? patients.filter(p=>p.shadowHO===suggested.name).length : 0;
                      return suggested ? (
                        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:`rgba(${rgb},0.06)`,border:`1px solid rgba(${rgb},0.15)`,borderRadius:10}}>
                          <span style={{fontSize:"0.78rem",fontWeight:600,color:theme,flex:1}}>{suggested.name}</span>
                          <span style={{fontSize:"0.65rem",color:C.textMuted}}>{count} pt</span>
                          <span style={{fontSize:"0.6rem",color:C.textMuted,background:C.surfaceEl,borderRadius:4,padding:"1px 6px"}}>{suggested.post}</span>
                        </div>
                      ) : null;
                    })()}
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {shadowHOs.filter(h=>h.name).map(ho=>{
                      const count=patients.filter(p=>p.shadowHO===ho.name).length;
                      const isSel=newPt.shadowHO===ho.name;
                      return (
                        <div key={ho.name} onClick={()=>setNewPt(p=>({...p,shadowHO:isSel?"":ho.name}))}
                          style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:10,cursor:"pointer",
                            background:isSel?`rgba(${rgb},0.08)`:C.surfaceEl,
                            border:`1px solid ${isSel?theme:C.border}`,transition:"all 0.1s"}}>
                          <span style={{flex:1,fontSize:"0.82rem",fontWeight:isSel?600:400,color:isSel?theme:C.text}}>{ho.name}</span>
                          <span style={{fontSize:"0.65rem",color:C.textMuted}}>{count} pt</span>
                          <span style={{fontSize:"0.6rem",color:C.textMuted,background:C.surface,borderRadius:4,padding:"1px 6px",border:`1px solid ${C.border}`}}>{ho.post}</span>
                          {isSel&&<div style={{width:16,height:16,borderRadius:"50%",background:theme,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="check" size={8} color="#fff"/></div>}
                        </div>
                      );
                    })}
                    <div onClick={()=>setNewPt(p=>({...p,shadowHO:""}))}
                      style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"8px",borderRadius:10,cursor:"pointer",
                        background:!newPt.shadowHO?"rgba(0,0,0,0.04)":C.bg,border:`1px dashed ${!newPt.shadowHO?C.textSub:C.border}`}}>
                      <span style={{fontSize:"0.75rem",color:C.textMuted}}>None</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowAddPt(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={addPatient} style={{flex:2,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Add Patient</button>
            </div>
          </div>
        </div>
      )}

      {/* Patient edit sheet */}
      {selectedPt&&selPt&&(
        <div style={{position:"fixed",inset:0,background:C.bg,zIndex:100,overflowY:"auto",fontFamily:SF}}>
          <div style={{background:"rgba(245,245,247,0.88)",borderBottom:`1px solid ${C.border}`,padding:"12px 18px",position:"sticky",top:0,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
            <div style={{maxWidth:560,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <div style={{display:"flex",alignItems:"center",gap:10}}>
                <button onClick={()=>{setSelectedPt(null);setShowClearConfirm(false);setSideConflict(null);}} style={{background:"none",border:"none",cursor:"pointer",display:"flex",alignItems:"center",padding:0}}><Icon name="back" size={18} color={C.textSub}/></button>
                <span style={{fontWeight:700,color:theme,fontSize:"1.1rem"}}>{selPt.patientName||selPt.bht||"Patient"}</span>
              </div>
              {isLeader&&!seniorMode&&<button onClick={()=>archivePatient(selectedPt)} style={{fontSize:"0.72rem",color:C.textSub,background:C.surface,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 10px",cursor:"pointer",fontFamily:SF}}>Archive</button>}
            </div>
          </div>
          <div style={{maxWidth:560,margin:"0 auto",padding:"20px 18px 100px"}}>
            <div style={{marginBottom:14}}>
              <label style={labelStyle}>BHT</label>
              <input value={ptEdit.bht||""} onChange={e=>setPtEdit(p=>({...p,bht:e.target.value}))} placeholder="e.g. 123456" style={{...iS,width:"100%",boxSizing:"border-box",marginTop:4,fontFamily:"monospace"}}/>
            </div>
            <div style={{marginBottom:14}}><label style={labelStyle}>Patient Name</label><input value={ptEdit.patientName||""} onChange={e=>setPtEdit(p=>({...p,patientName:e.target.value}))} placeholder="Name" style={{...iS,width:"100%",boxSizing:"border-box",marginTop:4}}/></div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
              <div><label style={labelStyle}>Age (years)</label><input type="number" value={ptEdit.ageYears||""} onChange={e=>setPtEdit(p=>({...p,ageYears:e.target.value}))} style={{...iS,width:"100%",boxSizing:"border-box",marginTop:4}}/></div>
              <div><label style={labelStyle}>Age (months)</label><input type="number" value={ptEdit.ageMonths||""} onChange={e=>setPtEdit(p=>({...p,ageMonths:e.target.value}))} style={{...iS,width:"100%",boxSizing:"border-box",marginTop:4}}/></div>
            </div>
            <div style={{marginBottom:14}}>
              <label style={labelStyle}>Section & Bed</label>
              {/* Section pills */}
              <div style={{display:"flex",gap:6,flexWrap:"wrap",marginTop:6,marginBottom:10}}>
                {sections.map(s=>{
                  const isSel = ptEdit.section===s.name;
                  return (
                    <button key={s.name} onClick={()=>{setSideConflict(null);setPtEdit(p=>({...p,section:s.name,bedNo:"",side:"single"}));}}
                      style={{padding:"5px 14px",borderRadius:20,fontSize:"0.78rem",fontWeight:isSel?600:400,cursor:"pointer",fontFamily:SF,
                        background:isSel?theme:C.surfaceEl,border:`1px solid ${isSel?theme:C.border}`,color:isSel?"#fff":C.textSub}}>
                      {s.name}
                    </button>
                  );
                })}
                {/* Floor pill — always shown; toggles ptEdit.isFloor */}
                {!ptEdit.isFloor
                  ? <button onClick={()=>{setSideConflict(null);setPtEdit(p=>({...p,isFloor:true,section:"",bedNo:"",side:"single"}));}}
                      style={{padding:"5px 14px",borderRadius:20,fontSize:"0.78rem",fontWeight:400,cursor:"pointer",fontFamily:SF,
                        background:C.surfaceEl,border:`1px dashed ${C.border}`,color:C.textSub}}>
                      Floor
                    </button>
                  : <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <button onClick={()=>{setSideConflict(null);setPtEdit(p=>({...p,isFloor:true,section:"",bedNo:"",side:"single"}));}}
                        style={{padding:"5px 14px",borderRadius:20,fontSize:"0.78rem",fontWeight:600,cursor:"pointer",fontFamily:SF,
                          background:C.textSub,border:`1px solid ${C.textSub}`,color:"#fff"}}>
                        Floor
                      </button>
                      <button onClick={()=>{setSideConflict(null);setPtEdit(p=>({...p,isFloor:false,section:selPt?.section||"",bedNo:selPt?.bedNo||"",side:selPt?.side||"single"}));}}
                        style={{padding:"3px 8px",borderRadius:20,fontSize:"0.72rem",cursor:"pointer",fontFamily:SF,
                          background:"none",border:"none",color:C.textMuted}}>
                        ✕
                      </button>
                    </div>
                }
              </div>
              {/* Floor pending hint */}
              {ptEdit.isFloor&&(
                <div style={{padding:"8px 12px",background:"rgba(0,0,0,0.04)",border:`1px dashed ${C.borderMid||C.border}`,borderRadius:10,fontSize:"0.75rem",color:C.textSub,marginBottom:8}}>
                  Will be moved to floor (next F number) when you save.
                </div>
              )}
              {/* Bed grid from setup ranges + special beds */}
              {!ptEdit.isFloor&&ptEdit.section&&(()=>{
                const secSetup = sections.find(s=>s.name===ptEdit.section);
                let rangeBeds = [];
                if (secSetup?.range) {
                  const parts = secSetup.range.split("-").map(s=>s.trim());
                  if (parts.length===2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
                    for (let n=Number(parts[0]); n<=Number(parts[1]); n++) rangeBeds.push(String(n));
                  }
                }
                const specBeds = (setup.specialBeds||[]).filter(b=>b.section===ptEdit.section).map(b=>b.id);
                const allBeds = [...rangeBeds, ...specBeds];
                const isFullyOccupied = (bed) => {
                  const others = patients.filter(p=>p.bedNo===bed&&p.section===ptEdit.section&&p.id!==selectedPt);
                  return others.some(p=>p.side==="L")&&others.some(p=>p.side==="R");
                };
                const hasAnyOccupant = (bed) => {
                  return patients.some(p=>p.bedNo===bed&&p.section===ptEdit.section&&p.id!==selectedPt);
                };
                if (allBeds.length===0) return <div style={{fontSize:"0.75rem",color:C.textMuted,marginBottom:10}}>No bed range configured for this section. Edit ward settings to add one.</div>;
                return (
                  <div>
                    <div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:600,marginBottom:6}}>Select Bed</div>
                    <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:12}}>
                      {allBeds.map(bed=>{
                        const isSel = ptEdit.bedNo===bed;
                        const full = isFullyOccupied(bed);
                        const hasOccupant = hasAnyOccupant(bed);
                        return (
                          <button key={bed} onClick={()=>!full&&setPtEdit(p=>({...p,bedNo:isSel?"":bed,side:isSel?"single":hasOccupant?"":"single",_conflictId:null,_conflictSide:null}))}
                            style={{padding:"6px 12px",borderRadius:9,fontSize:"0.82rem",fontWeight:isSel?700:500,
                              cursor:full&&!isSel?"not-allowed":"pointer",fontFamily:SF,
                              background:isSel?theme:full?"rgba(0,0,0,0.04)":hasOccupant?"rgba(245,158,11,0.08)":C.surface,
                              border:`1px solid ${isSel?theme:full?"rgba(0,0,0,0.08)":hasOccupant?"rgba(245,158,11,0.4)":C.border}`,
                              color:isSel?"#fff":full?C.textMuted:hasOccupant?"rgb(161,104,0)":C.text,
                              opacity:full&&!isSel?0.4:1,
                              boxShadow:isSel?`0 2px 8px rgba(${rgb},0.3)`:"none"}}>
                            {bed}
                          </button>
                        );
                      })}
                    </div>
                    {ptEdit.bedNo&&(()=>{
                      const others = patients.filter(p=>p.bedNo===ptEdit.bedNo&&p.section===ptEdit.section&&p.id!==selectedPt);
                      const singleOccupant = others.find(p=>p.side==="single"||!p.side);
                      const lOccupant = others.find(p=>p.side==="L");
                      const rOccupant = others.find(p=>p.side==="R");
                      const lTaken = !!lOccupant;
                      const rTaken = !!rOccupant;
                      const hasMate = others.length>0;
                      const getEditConflict=(val)=>{
                        if(val==="L"&&singleOccupant) return {existingPtId:singleOccupant.id,newSide:val,otherSide:"R"};
                        if(val==="R"&&singleOccupant) return {existingPtId:singleOccupant.id,newSide:val,otherSide:"L"};
                        if(val==="R"&&rOccupant) return {existingPtId:rOccupant.id,newSide:val,otherSide:"L"};
                        if(val==="L"&&lOccupant) return {existingPtId:lOccupant.id,newSide:val,otherSide:"R"};
                        return null;
                      };
                      const warningMsg = singleOccupant
                        ? "This bed has a single-slot patient — selecting L or R will move them to the other side."
                        : hasMate ? "This bed already has a patient — select which side to place this patient." : null;
                      return (
                        <div>
                          <div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:600,marginBottom:6}}>Bed Side</div>
                          {warningMsg&&<div style={{fontSize:"0.7rem",color:"rgb(161,104,0)",background:"rgba(245,158,11,0.08)",border:"1px solid rgba(245,158,11,0.25)",borderRadius:8,padding:"6px 10px",marginBottom:8}}>{warningMsg}</div>}
                          <div style={{display:"flex",gap:6}}>
                            {[{val:"single",label:"Single",taken:hasMate},{val:"L",label:"Left",taken:lTaken&&!singleOccupant},{val:"R",label:"Right",taken:rTaken&&!singleOccupant}].map(({val,label,taken})=>{
                              const isSel=ptEdit.side===val;
                              return (
                                <button key={val} onClick={()=>{
                                  if(taken&&!isSel) return;
                                  const conf=getEditConflict(val);
                                  if(conf) setSideConflict(conf);
                                  else setSideConflict(null);
                                  setPtEdit(p=>({...p,side:val}));
                                }}
                                  style={{flex:1,padding:"8px",borderRadius:10,fontSize:"0.76rem",fontWeight:isSel?600:400,
                                    cursor:taken&&!isSel?"not-allowed":"pointer",fontFamily:SF,
                                    background:isSel?theme:taken?"rgba(0,0,0,0.03)":C.surfaceEl,
                                    border:`1px solid ${isSel?theme:taken?"rgba(0,0,0,0.08)":C.border}`,
                                    color:isSel?"#fff":taken?C.textMuted:C.textSub,
                                    opacity:taken&&!isSel?0.4:1}}>
                                  {label}{taken&&!isSel?" ✗":""}
                                </button>
                              );
                            })}
                          </div>
                          {sideConflict&&<div style={{marginTop:8,padding:"7px 10px",background:`rgba(${rgb},0.06)`,border:`1px solid rgba(${rgb},0.15)`,borderRadius:8,fontSize:"0.72rem",color:theme}}>
                            You → <strong>{sideConflict.newSide==="L"?"Left":"Right"}</strong>, existing patient moves to <strong>{sideConflict.otherSide==="L"?"Left":"Right"}</strong>.
                          </div>}
                        </div>
                      );
                    })()}
                  </div>
                );
              })()}
            </div>
            {isLeader&&!seniorMode&&pairings.length>0&&(
              <div style={{marginBottom:14}}>
                <label style={labelStyle}>Pairing</label>
                <div style={{display:"flex",flexDirection:"column",gap:6,marginTop:8}}>
                  {pairings.map((pair,pi)=>{
                    const isSel = ptEdit.pairingIdx===pi;
                    const members = (pair.members||[]).filter(m=>m&&!shadowHONames.has(m));
                    const ptCount = patients.filter(p=>p.pairingIdx===pi&&p.id!==selectedPt).length;
                    return (
                      <div key={pi} onClick={()=>setPtEdit(p=>({...p,pairingIdx:isSel?null:pi}))}
                        style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",borderRadius:11,cursor:"pointer",position:"relative",
                          background:isSel?`rgba(${rgb},0.08)`:C.surfaceEl,
                          border:`1px solid ${isSel?theme:C.border}`,transition:"all 0.1s"}}>
                        <span style={{fontSize:"0.62rem",fontWeight:700,color:isSel?theme:C.textMuted,background:isSel?`rgba(${rgb},0.12)`:C.surface,border:`1px solid ${isSel?`rgba(${rgb},0.25)`:C.border}`,borderRadius:5,padding:"2px 7px",flexShrink:0}}>P{pi+1}</span>
                        <span style={{flex:1,display:"flex",flexWrap:"wrap",gap:2,alignItems:"baseline"}}>{members.length>0?members.map((m,mi)=><span key={m}>{mi>0&&<span style={{margin:"0 3px",color:isSel?theme:C.textMuted,opacity:0.6}}>×</span>}<NameWithGroup name={m} color={isSel?theme:C.text} fontSize="0.88rem" fontWeight={500}/></span>):<span style={{color:C.textMuted}}>—</span>}</span>
                        <span style={{fontSize:"0.65rem",color:isSel?theme:C.textMuted,flexShrink:0,marginRight:isSel?22:0}}>{ptCount} pt</span>
                        {isSel&&<div style={{position:"absolute",top:"50%",right:10,transform:"translateY(-50%)",width:18,height:18,borderRadius:"50%",background:theme,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="check" size={9} color="#fff"/></div>}
                      </div>
                    );
                  })}
                  <div onClick={()=>setPtEdit(p=>({...p,pairingIdx:null}))}
                    style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"9px",borderRadius:11,cursor:"pointer",
                      background:ptEdit.pairingIdx===null?"rgba(0,0,0,0.04)":C.bg,
                      border:`1px dashed ${ptEdit.pairingIdx===null?C.textSub:C.border}`}}>
                    <span style={{fontSize:"0.75rem",color:C.textMuted}}>None</span>
                  </div>
                </div>
              </div>
            )}
            {/* Shadow HO Allocator — edit patient */}
            {shadowHOs.filter(h=>h.name).length>0&&!seniorMode&&(
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:6}}>
                  <label style={labelStyle}>Shadow HO</label>
                  {isLeader&&(
                    <div onClick={()=>setShadowAutoAlloc(a=>!a)}
                      style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer",userSelect:"none"}}>
                      <span style={{fontSize:"0.65rem",fontWeight:600,color:shadowAutoAlloc?theme:C.textMuted,fontFamily:SF}}>Auto</span>
                      <div style={{width:34,height:20,borderRadius:10,background:shadowAutoAlloc?theme:"rgba(0,0,0,0.15)",transition:"background 0.2s",position:"relative",flexShrink:0}}>
                        <div style={{position:"absolute",top:2,left:shadowAutoAlloc?16:2,width:16,height:16,borderRadius:"50%",background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                      </div>
                    </div>
                  )}
                </div>
                {shadowAutoAlloc ? (
                  <div>
                    <div style={{fontSize:"0.68rem",color:C.textMuted,marginBottom:6,lineHeight:1.4}}>Assigns the Shadow HO with fewest patients. Equal counts → random.</div>
                    {(()=>{
                      const suggested = getSuggestedShadow();
                      const count = suggested ? patients.filter(p=>p.shadowHO===suggested.name&&p.id!==selectedPt).length : 0;
                      return suggested ? (
                        <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 12px",background:`rgba(${rgb},0.06)`,border:`1px solid rgba(${rgb},0.15)`,borderRadius:10}}>
                          <span style={{fontSize:"0.78rem",fontWeight:600,color:theme,flex:1}}>{suggested.name}</span>
                          <span style={{fontSize:"0.65rem",color:C.textMuted}}>{count} pt</span>
                          <span style={{fontSize:"0.6rem",color:C.textMuted,background:C.surfaceEl,borderRadius:4,padding:"1px 6px"}}>{suggested.post}</span>
                        </div>
                      ) : <div style={{fontSize:"0.75rem",color:C.textMuted}}>No Shadow HOs configured.</div>;
                    })()}
                  </div>
                ) : (
                  <div style={{display:"flex",flexDirection:"column",gap:6}}>
                    {shadowHOs.filter(h=>h.name).map(ho=>{
                      const count=patients.filter(p=>p.shadowHO===ho.name&&p.id!==selectedPt).length;
                      const isSel=ptEdit.shadowHO===ho.name;
                      return (
                        <div key={ho.name} onClick={()=>setPtEdit(p=>({...p,shadowHO:isSel?"":ho.name}))}
                          style={{display:"flex",alignItems:"center",gap:10,padding:"8px 12px",borderRadius:10,cursor:"pointer",
                            background:isSel?`rgba(${rgb},0.08)`:C.surfaceEl,border:`1px solid ${isSel?theme:C.border}`,transition:"all 0.1s"}}>
                          <span style={{flex:1,fontSize:"0.82rem",fontWeight:isSel?600:400,color:isSel?theme:C.text}}>{ho.name}</span>
                          <span style={{fontSize:"0.65rem",color:C.textMuted}}>{count} pt</span>
                          <span style={{fontSize:"0.6rem",color:C.textMuted,background:C.surface,borderRadius:4,padding:"1px 6px",border:`1px solid ${C.border}`}}>{ho.post}</span>
                          {isSel&&<div style={{width:16,height:16,borderRadius:"50%",background:theme,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}><Icon name="check" size={8} color="#fff"/></div>}
                        </div>
                      );
                    })}
                    <div onClick={()=>setPtEdit(p=>({...p,shadowHO:""}))}
                      style={{display:"flex",alignItems:"center",justifyContent:"center",padding:"8px",borderRadius:10,cursor:"pointer",
                        background:!ptEdit.shadowHO?"rgba(0,0,0,0.04)":C.bg,border:`1px dashed ${!ptEdit.shadowHO?C.textSub:C.border}`}}>
                      <span style={{fontSize:"0.75rem",color:C.textMuted}}>None</span>
                    </div>
                  </div>
                )}
              </div>
            )}
            {isLeader&&!seniorMode&&(
              <div style={{marginBottom:14}}>
                <button onClick={()=>updatePatient(selectedPt,{isNew:!selPt.isNew})}
                  style={{width:"100%",padding:"9px",borderRadius:10,fontSize:"0.78rem",fontWeight:500,fontFamily:SF,cursor:"pointer",background:selPt.isNew?`rgba(${hexToRgb(C.red)},0.1)`:C.surface,border:`1px solid ${selPt.isNew?C.red:C.border}`,color:selPt.isNew?C.red:C.textMuted}}>
                  New Patient
                </button>
              </div>
            )}
            {!seniorMode&&(
              <div style={{marginBottom:14}}>
         