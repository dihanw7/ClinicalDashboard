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
  default:  { label:"Default (Bed-based)",  desc:"Assign students to numbered beds. Used for Gynaecology, Medicine, Obstetrics, Psychiatry." },
  medicine: { label:"Medicine",              desc:"Bed-based with named ward sections (e.g. Elective, Emergency, HDU), Shadow HO banner, and shadow assigned from active Shadow HOs." },
  surgery:  { label:"Surgery",              desc:"Bed-based with named ward sections (e.g. Elective, Emergency, HDU), Shadow HO banner, and shadow assigned from active Shadow HOs." },
  paed:     { label:"Paediatrics",          desc:"Assign by admission order with patient name/age. Two student groups, ward sections, Shadow HO banner." },
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
  };
  return icons[name] || null;
};

// ── Style helpers ──────────────────────────────────────────────────────────────
const labelStyle = { fontSize:"0.68rem", color:C.textSub, letterSpacing:"0.04em", textTransform:"uppercase", display:"block", fontWeight:600, fontFamily:SF };
const iS = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, padding:"11px 14px", fontSize:"0.88rem", outline:"none", fontFamily:SF, boxShadow:C.shadow };
const rB = { background:C.surfaceEl, border:`1px solid ${C.border}`, color:C.textMuted, borderRadius:8, padding:"0 12px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", height:42 };
const aMB = { marginTop:10, background:"none", border:`1px dashed ${C.border}`, color:C.textSub, borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:"0.78rem", width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:SF };
const accentBtn = (t,rgb) => ({ background:t, border:"none", color:"#fff", borderRadius:12, cursor:"pointer", fontWeight:600, fontFamily:SF, boxShadow:`0 4px 14px rgba(${rgb},0.3)` });

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
              {wards.map(ward => <WardCard key={ward.id} ward={ward} onOpen={()=>{ setActiveWardId(ward.id); setScreen("ward"); pollRef.current=false; }}/>)}
            </div>
        }
      </div>
      <BrandingBar theme="#007aff"/>
      {toast && <Toast toast={toast}/>}
      <style>{`@keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}`}</style>
    </div>
  );
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
  const bedKeys  = Object.keys(beds);

  // Default template stats
  const newCount  = bedKeys.filter(k=>beds[k]?.isNew).length;
  const histCount = bedKeys.filter(k=>beds[k]?.historyTaken).length;
  const assigned  = bedKeys.filter(k=>beds[k]?.assigned?.length>0||beds[k]?.shadows?.length>0).length;

  // Patient count
  const patientCount = (isPaed||isSurgery)
    ? patients.length
    : bedKeys.filter(k=>{ const b=beds[k]; return b&&(b.diagnosis||b.consultant||b.notes||b.assigned?.length>0||b.shadows?.length>0||b.isNew||b.historyTaken||b.opStatus); }).length;

  // Paed/Surgery stats
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
        {((isPaed||isSurgery) ? [
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
    // Paed-specific
    paedGroups:[{name:"Group A",students:[{name:"",no:""}]},{name:"Group B",students:[{name:"",no:""}]}],
    wardSections:[{name:"General",count:""},{name:"HDU",count:""},{name:"NICU",count:""},{name:"NBU",count:""}],
    shadowHOs:[{post:"Shadow HO 1",name:""},{post:"Shadow HO 2",name:""},{post:"Shadow HO 3",name:""}],
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
      // Derive bed count from the highest bed number across all ranges
      let maxBed = 0;
      for (const sec of wardSections) {
        const parts = sec.range.split("-").map(Number);
        const hi = Math.max(...parts.filter(n=>!isNaN(n)));
        if (hi > maxBed) maxBed = hi;
      }
      const count = maxBed || 80;
      const beds = {};
      for (let i=1;i<=count;i++) beds[i]={ assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, opStatus:"" };
      const students    = form.students.filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),group:s.group?.trim()||""}));
      const consultants = form.consultants.filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"}));
      const sections    = wardSections.map(s=>({name:s.name.trim(),range:s.range.trim()}));
      const shadowHOs   = form.shadowHOs || [{post:"Shadow HO 1",name:""},{post:"Shadow HO 2",name:""},{post:"Shadow HO 3",name:""}];
      // Add special beds to the beds object
      const specialBeds = (form.specialBeds||[]).filter(b=>b.id?.trim());
      const customTags  = (form.customTags||[]).filter(t=>t.label?.trim()).map(t=>({label:t.label.trim(),color:t.color||"#6366f1"}));
      specialBeds.forEach(b=>{ beds[b.id.trim()]={ assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, specialBedSection:b.section?.trim()||"", tags:[] }; });
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
  const [bedEdit,    setBedEdit]    = useState({ consultant:"", diagnosis:"", notes:"", historyTaken:false, opStatus:"" });
  const [assignModal,setAssignModal]= useState(null);
  const [editMode,   setEditMode]   = useState(false);
  const [showReset,  setShowReset]  = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [setupForm,  setSetupForm]  = useState({ wardName:"", appointmentType:"", bedCount:"", themeColor:"#007aff", students:[{name:"",group:""}], consultants:[{name:"",color:"#6366f1"}], wardSections:[], specialBeds:[] });
  const [shadowEditing, setShadowEditing] = useState(false);
  const [shadowForm, setShadowForm] = useState(null);
  const [sectionFilter, setSectionFilter] = useState("all");

  const setup  = ward.setup || {};
  const beds   = ward.beds  || {};
  const theme  = setup.themeColor || "#007aff";
  const rgb    = hexToRgb(theme);
  const shadowHOs  = setup.shadowHOs   || [];
  const sections   = setup.wardSections || [];

  const save = useCallback(async (newWard) => {
    await saveWard(newWard);
  }, [saveWard]);

  // ── Setup (first time) ────────────────────────────────────────────────────
  const handleSetupSubmit = async () => {
    if (!setupForm.wardName||!setupForm.appointmentType||!setupForm.bedCount) { showToast("Fill all fields","error"); return; }
    const count = parseInt(setupForm.bedCount);
    if (isNaN(count)||count<1||count>80) { showToast("Beds 1–80","error"); return; }
    const students    = setupForm.students.filter(s=>s.name.trim()).map(s=>({name:s.name.trim(),group:s.group.trim()}));
    const consultants = setupForm.consultants.filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"}));
    const shadowHOsSave = (setupForm.shadowHOs||[]);
    const rotationDays = setupForm.rotationDays||7;
    const wardSections = (setupForm.wardSections||[]).filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),range:s.range?.trim()||""}));
    const specialBeds  = (setupForm.specialBeds||[]).filter(b=>b.id?.trim()).map(b=>({id:b.id.trim(),section:b.section?.trim()||""}));
    const bedObj = {};
    for (let i=1;i<=count;i++) bedObj[i]={ assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, opStatus:"" };
    // Add special beds
    specialBeds.forEach(sb=>{ bedObj[sb.id]={ assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, opStatus:"", specialBedSection:sb.section }; });
    await save({ setup:{ wardName:setupForm.wardName, appointmentType:setupForm.appointmentType, bedCount:count, themeColor:setupForm.themeColor, students, consultants, shadowHOs:shadowHOsSave, rotationDays, wardSections, specialBeds }, beds:bedObj });
    showToast("Ward configured!");
  };

  const handleSaveEdit = async () => {
    const students    = setupForm.students.filter(s=>s.name.trim()).map(s=>({name:s.name.trim(),group:s.group.trim()}));
    const consultants = setupForm.consultants.filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"}));
    const shadowHOsSave = (setupForm.shadowHOs||[]);
    const rotationDays = setupForm.rotationDays||7;
    const wardSections = (setupForm.wardSections||[]).filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),range:s.range?.trim()||""}));
    const specialBeds  = (setupForm.specialBeds||[]).filter(b=>b.id?.trim()).map(b=>({id:b.id.trim(),section:b.section?.trim()||""}));
    await save({ ...ward, setup:{ ...setup, wardName:setupForm.wardName, appointmentType:setupForm.appointmentType, themeColor:setupForm.themeColor, template:setupForm.template||setup.template||"default", students, consultants, shadowHOs:shadowHOsSave, rotationDays, wardSections, specialBeds } });
    setEditMode(false); showToast("Settings saved!");
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
  const saveBedEdit  = async (bedNum) => { await updateBed(bedNum, bedEdit); };
  const toggleHistory= async (bedNum) => {
    const nh = !beds[bedNum].historyTaken;
    const updates = { historyTaken:nh }; if (nh) updates.isNew=false;
    await updateBed(bedNum, updates);
    setBedEdit(b=>({...b, historyTaken:nh}));
  };
  const clearBed = async (bedNum) => {
    await updateBed(bedNum, { assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, opStatus:"" });
    setBedEdit({ consultant:"", diagnosis:"", notes:"", historyTaken:false, opStatus:"" });
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
  const assignStudents = async (bedNum, assigned, shadows) => {
    await updateBed(bedNum, { assigned, shadows });
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
  const resetWard = async () => {
    await save({ setup:null, beds:{} });
    setSetupForm({ wardName:"", appointmentType:"", bedCount:"", themeColor:"#007aff", students:[{name:"",group:""}], consultants:[{name:"",color:"#6366f1"}] });
    setShowReset(false); setIsLeader(false); showToast("Ward reset");
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const bedKeys = Object.keys(beds).sort((a,b)=>{
    const af=isNaN(a),bf=isNaN(b);
    if(af&&!bf)return 1; if(!af&&bf)return -1;
    if(!af&&!bf)return Number(a)-Number(b);
    return a.localeCompare(b);
  });

  // Section helpers (like Medicine)
  const getBedSection = (bedNum) => {
    if (beds[bedNum]?.specialBedSection) return beds[bedNum].specialBedSection;
    const n = Number(bedNum);
    if (isNaN(n)) return null;
    for (const sec of sections) {
      const rangeStr = sec.range||"";
      if (rangeStr.includes("-")) {
        const [start,end] = rangeStr.split("-").map(Number);
        if (n>=start && n<=end) return sec.name;
      }
    }
    return null;
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
            <button onClick={addFloorPatient} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:"11px",fontSize:"0.84rem",marginBottom:20,background:C.surface,border:`1px solid ${C.border}`,color:theme,borderRadius:12,cursor:"pointer",fontFamily:SF,fontWeight:500,boxShadow:C.shadow}}>
              <Icon name="floor" size={14} color={theme}/> Add Floor Patient
            </button>
          )}

          {/* Section filter pills */}
          {sections.length>0 && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {["all",...sections.map(s=>s.name),...(stats.floor>0?["floor"]:[])].map(sec=>(
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
                  onClick={seniorMode ? undefined : ()=>{ setSelectedBed(bedNum); setBedEdit({consultant:bed.consultant||"",diagnosis:bed.diagnosis||"",notes:bed.notes||"",historyTaken:!!bed.historyTaken,opStatus:bed.opStatus||""}); setView("bed"); }}
                  style={{
                    background: cRgb?`rgba(${cRgb},0.06)`:C.surface,
                    border: bed.historyTaken?`1px solid rgba(${hexToRgb(C.green)},0.25)`:cRgb?`1px solid rgba(${cRgb},0.22)`:`1px solid rgba(0,0,0,${filled?0.1:0.07})`,
                    borderRadius:14, padding:"12px 11px", cursor:seniorMode?"default":"pointer",
                    position:"relative",
                    boxShadow: filled ? "0 6px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.05)" : "0 2px 10px rgba(0,0,0,0.05)",
                    transition:"transform 0.12s, box-shadow 0.12s", userSelect:"none",
                  }}
                  onMouseEnter={seniorMode?undefined:e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 28px rgba(0,0,0,0.11), 0 2px 6px rgba(0,0,0,0.06)";}}
                  onMouseLeave={seniorMode?undefined:e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=filled?"0 6px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.05)":"0 2px 10px rgba(0,0,0,0.05)";}}
                >
                  {/* Top-right flags */}
                  <div style={{position:"absolute",top:9,right:9,display:"flex",gap:4,alignItems:"center"}}>
                    {bed.historyTaken&&<Icon name="history" size={11} color={C.green}/>}
                    {bed.isNew&&<span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={10} color={C.red}/></span>}
                  </div>

                  {/* Section label + bed number — Paed style */}
                  <div style={{fontSize:"0.55rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:1}}>{bed.isFloor?"Floor":sec||"Bed"}</div>
                  <div style={{fontSize:"1.25rem",fontWeight:700,color:cRgb?`rgb(${cRgb})`:theme,lineHeight:1,letterSpacing:"-0.03em",marginBottom:4}}>{bedNum}</div>

                  {/* Consultant */}
                  {bed.consultant&&<div style={{fontSize:"0.58rem",color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{bed.consultant}</div>}

                  {/* Diagnosis */}
                  {bed.diagnosis&&<div style={{fontSize:"0.62rem",color:C.text,fontStyle:"italic",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{bed.diagnosis}</div>}

                  {/* Notes */}
                  {bed.notes&&<div style={{fontSize:"0.58rem",color:C.textMuted,lineHeight:1.35,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",marginBottom:3}}>{bed.notes}</div>}

                  {/* Op status badge */}
                  {bed.opStatus&&<div style={{display:"inline-block",marginBottom:3,fontSize:"0.52rem",fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase",padding:"2px 6px",borderRadius:4,background:DEFAULT_OP_COLORS[bed.opStatus]?.bg,color:DEFAULT_OP_COLORS[bed.opStatus]?.color,border:`1px solid ${DEFAULT_OP_COLORS[bed.opStatus]?.border}`}}>{bed.opStatus}</div>}

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
        {activeTab==="students" && <StudentsTab beds={beds} bedKeys={bedKeys} students={setup.students||[]} theme={theme} rgb={rgb} onBedClick={(bedNum,bed)=>{ setSelectedBed(bedNum); setBedEdit({consultant:bed.consultant||"",diagnosis:bed.diagnosis||"",notes:bed.notes||"",historyTaken:!!bed.historyTaken,opStatus:bed.opStatus||""}); setView("bed"); }}/>}

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
                <h2 style={{margin:"3px 0 0",fontSize:"2rem",fontWeight:700,color:theme,letterSpacing:"-0.04em"}}>{selectedBed}</h2>
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

            {/* Op status */}
            <div style={{marginBottom:16}}>
              <label style={labelStyle}>Op Status</label>
              <div style={{display:"flex",gap:8,marginTop:8}}>
                {Object.entries(DEFAULT_OP_COLORS).map(([val,o])=>{
                  const active=bedEdit.opStatus===val;
                  return <button key={val} onClick={()=>setBedEdit(b=>({...b,opStatus:active?"":val}))} style={{flex:1,padding:"9px",borderRadius:10,cursor:"pointer",fontFamily:SF,fontSize:"0.82rem",fontWeight:active?700:500,textTransform:"capitalize",transition:"all 0.12s",background:active?o.activeBg:o.bg,border:`1px solid ${active?o.activeBorder:o.border}`,color:active?o.color:C.textSub}}>{val}</button>;
                })}
              </div>
            </div>

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
            {!showClearConfirm && !showChangeBed && (
              <div style={{display:"flex",gap:8,marginTop:10}}>
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
              </div>
            )}

            {/* Change bed picker */}
            {showChangeBed && (
              <div style={{marginTop:10,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:13,padding:"14px"}}>
                <div style={{fontSize:"0.72rem",color:C.textSub,fontWeight:600,marginBottom:10}}>Move to which bed?</div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6,marginBottom:12}}>
                  {bedKeys.filter(k=>!isNaN(k)&&k!==selectedBed).map(k=>{
                    const b = beds[k];
                    const occupied = b&&(b.assigned?.length>0||b.shadows?.length>0||b.diagnosis||b.consultant||b.notes);
                    return (
                      <button key={k} onClick={()=>!occupied&&changeBedNumber(selectedBed,k)} disabled={occupied}
                        style={{padding:"10px 4px",borderRadius:9,fontSize:"0.82rem",fontWeight:700,cursor:occupied?"default":"pointer",letterSpacing:"-0.02em",transition:"all 0.1s",fontFamily:SF,
                          background:occupied?"rgba(0,0,0,0.04)":`rgba(${rgb},0.1)`,
                          border:`1px solid ${occupied?"rgba(0,0,0,0.1)":`rgba(${rgb},0.3)`}`,
                          color:occupied?C.textMuted:theme,
                          opacity:occupied?0.5:1}}>
                        {k}
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
      {assignModal && <AssignModal bedNum={assignModal} students={setup.students||[]} currentAssigned={beds[assignModal]?.assigned||[]} currentShadows={beds[assignModal]?.shadows||[]} shadowHOs={shadowHOs} theme={theme} rgb={rgb} onConfirm={(a,s)=>assignStudents(assignModal,a,s)} onClose={()=>setAssignModal(null)}/>}

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

      <BrandingBar theme={theme}/>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PAED WARD VIEW — see PaedWardView and PaedAssignModal components at bottom
// ══════════════════════════════════════════════════════════════════════════════
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

  const allBedNums = Object.keys(beds).filter(k=>!isNaN(k)).sort((a,b)=>Number(a)-Number(b));

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
                        <span style={{fontSize:"1.1rem",fontWeight:700,color:theme,letterSpacing:"-0.03em"}}>{bedNum}</span>
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
                            {allBedNums.map(k=>{
                              const free = bedIsFree(k);
                              return (
                                <button key={k} onClick={()=>{if(!free)return; onRestore(selectedWeek,bedNum,k); setRestorePicker(null);}} disabled={!free}
                                  style={{padding:"9px 4px",borderRadius:9,fontSize:"0.82rem",fontWeight:700,cursor:free?"pointer":"not-allowed",fontFamily:SF,
                                    background:free?`rgba(${rgb},0.1)`:"rgba(0,0,0,0.03)",
                                    border:`1px solid ${free?`rgba(${rgb},0.3)`:"rgba(0,0,0,0.08)"}`,
                                    color:free?theme:C.textMuted,opacity:free?1:0.5}}>
                                  {k}
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

function StudentsTab({ beds, bedKeys, students, theme, rgb, onBedClick }) {
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
                          {sb.primary.map(({bedNum,bed})=><DefaultBedTileSmall key={bedNum} bedNum={bedNum} bed={bed} theme={theme} rgb={rgb} onClick={onBedClick}/>)}
                        </div>
                      </>}
                      {sb.shadow.length>0 && <>
                        <div style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500,marginBottom:8}}>Shadow</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8}}>
                          {sb.shadow.map(({bedNum,bed})=><DefaultBedTileSmall key={bedNum} bedNum={bedNum} bed={bed} theme={theme} rgb={rgb} muted onClick={onBedClick}/>)}
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
function DefaultBedTileSmall({ bedNum, bed, theme, rgb, muted, onClick }) {
  const filled = bed.diagnosis||bed.consultant||bed.notes;
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
      <div style={{fontSize:"0.52rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:1}}>{bed.isFloor?"Floor":"Bed"}</div>
      <div style={{fontSize:"1.1rem",fontWeight:700,color:muted?C.textMuted:theme,lineHeight:1,letterSpacing:"-0.03em",marginBottom:3}}>{bedNum}</div>
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
          <span style={{fontSize:"1.1rem",fontWeight:700,color:theme,letterSpacing:"-0.03em"}}>{bedNum}</span>
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

function AssignModal({ bedNum, students, currentAssigned, currentShadows, shadowHOs=[], theme, rgb, onConfirm, onClose }) {
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

  const handlePrimary = (s) => {
    if (isShadowHO(s)) { setBlockedMsg("Shadow HOs cannot be assigned as primary"); setTimeout(()=>setBlockedMsg(null),2000); return; }
    if(isAssigned(s)){setAssigned([]);return;} setShadows(sh=>sh.filter(x=>getName(x)!==getName(s))); setAssigned([s]);
  };
  const handleShadow = (s) => {
    if (isShadowHO(s)) { setBlockedMsg("Shadow HOs cannot be shadow-assigned here"); setTimeout(()=>setBlockedMsg(null),2000); return; }
    if(isShadow(s)){setShadows([]);return;} setAssigned(a=>a.filter(x=>getName(x)!==getName(s))); setShadows([s]);
  };

  // Split students: non-HO eligible, HO-only
  const eligible = sorted.filter(s=>!isShadowHO(s));
  const hoStudents = sorted.filter(s=>isShadowHO(s));

  const StudentCard = ({ s, zone }) => {
    const ip=isAssigned(s), is=isShadow(s), isHO=isShadowHO(s);
    const active = zone==="primary" ? ip : is;
    const accentBg = zone==="primary" ? `rgba(${rgb},0.1)` : "rgba(0,0,0,0.04)";
    const accentBorder = zone==="primary" ? `rgba(${rgb},0.35)` : C.borderMid;
    const accentColor = zone==="primary" ? theme : C.textSub;
    const handler = zone==="primary" ? ()=>handlePrimary(s) : ()=>handleShadow(s);
    return (
      <button
        onClick={isHO?undefined:handler}
        disabled={isHO}
        style={{
          display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
          padding:"10px 6px", borderRadius:12, cursor:isHO?"not-allowed":"pointer",
          fontFamily:SF, textAlign:"center", transition:"all 0.12s", gap:3,
          background: active ? (zone==="primary"?`rgba(${rgb},0.12)`:C.surfaceEl) : C.surface,
          border: `${active?"2px":"1px"} ${zone==="shadow"&&active?"dashed":"solid"} ${active?accentBorder:C.border}`,
          color: active ? accentColor : C.textSub,
          opacity: isHO ? 0.35 : 1,
          boxShadow: active ? (zone==="primary"?`0 4px 14px rgba(${rgb},0.18)`:"none") : "0 2px 8px rgba(0,0,0,0.05)",
        }}
      >
        <div style={{width:28,height:28,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center",
          background:active?(zone==="primary"?theme:"rgba(0,0,0,0.08)"):C.surfaceEl,
          border:`1px solid ${active?(zone==="primary"?theme:C.borderMid):C.border}`,
          marginBottom:2, flexShrink:0}}>
          <Icon name={zone==="primary"?"user":"shadow"} size={13} color={active?(zone==="primary"?"#fff":C.textSub):C.textMuted}/>
        </div>
        <div style={{fontSize:"0.72rem",fontWeight:active?700:500,lineHeight:1.2,letterSpacing:"-0.01em",color:active?accentColor:C.text,
          overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:"100%",padding:"0 2px"}}>
          {getName(s).split(" ")[0]}
        </div>
        {getGroup(s) && <div style={{fontSize:"0.55rem",color:active?accentColor:C.textMuted,fontFamily:"monospace",fontWeight:600}}>{getGroup(s)}</div>}
        {active && <div style={{fontSize:"0.52rem",letterSpacing:"0.04em",textTransform:"uppercase",fontWeight:700,color:active?accentColor:C.textMuted,marginTop:1}}>{zone==="primary"?"●":"◌"}</div>}
      </button>
    );
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:"100%",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 -4px 40px rgba(0,0,0,0.1)"}}>
        <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 18px"}}/>
        <h3 style={{margin:"0 0 4px",color:C.text,fontSize:"1.05rem",fontWeight:600}}>Assign Students — Bed {bedNum}</h3>
        <p style={{margin:"0 0 14px",fontSize:"0.74rem",color:C.textMuted}}>Tap a card to assign. One primary and one shadow per bed.</p>

        {blockedMsg && (
          <div style={{background:`rgba(${hexToRgb(C.red)},0.08)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,borderRadius:8,padding:"8px 12px",marginBottom:14,fontSize:"0.78rem",color:C.red,textAlign:"center"}}>
            {blockedMsg}
          </div>
        )}

        {sorted.length===0
          ? <p style={{color:C.textMuted,fontSize:"0.82rem",textAlign:"center",padding:"20px 0"}}>No students in setup.</p>
          : <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>

              {/* Primary zone */}
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                  <div style={{width:10,height:10,borderRadius:3,background:`rgba(${rgb},0.25)`,border:`1px solid rgba(${rgb},0.5)`}}/>
                  <span style={{fontSize:"0.65rem",color:theme,fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase"}}>Primary</span>
                  {assigned.length>0 && <span style={{fontSize:"0.62rem",color:C.textMuted,marginLeft:"auto"}}>✓ {getName(assigned[0]).split(" ")[0]}</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
                  {eligible.map(s=><StudentCard key={getName(s)} s={s} zone="primary"/>)}
                </div>
              </div>

              {/* Shadow zone */}
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:10}}>
                  <div style={{width:10,height:10,borderRadius:3,border:`1px dashed ${C.borderMid}`}}/>
                  <span style={{fontSize:"0.65rem",color:C.textSub,fontWeight:700,letterSpacing:"0.04em",textTransform:"uppercase"}}>Shadow</span>
                  {shadows.length>0 && <span style={{fontSize:"0.62rem",color:C.textMuted,marginLeft:"auto"}}>✓ {getName(shadows[0]).split(" ")[0]}</span>}
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:6}}>
                  {eligible.map(s=><StudentCard key={getName(s)} s={s} zone="shadow"/>)}
                </div>
              </div>
            </div>
        }

        {/* Shadow HOs note */}
        {hoStudents.length>0 && (
          <div style={{marginTop:14,padding:"8px 12px",background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:9,fontSize:"0.72rem",color:C.textMuted}}>
            <span style={{fontWeight:600}}>Shadow HOs (not assignable here):</span>{" "}
            {hoStudents.map(s=>getName(s)).join(", ")}
          </div>
        )}

        <div style={{display:"flex",gap:10,marginTop:18}}>
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
function MedicineWardView({ wardId, ward, onBack, saveWard, onDelete, showToast, seniorMode }) {
  // Medicine shares almost all state/logic with DefaultWardView but adds:
  // 1. Shadow HO banner (from setup.shadowHOs)
  // 2. Ward sections displayed as a filter above bed grid
  // 3. Shadow in AssignModal restricted to active Shadow HOs

  const [isLeader,   setIsLeader]   = useState(false);
  const [pinInput,   setPinInput]   = useState("");
  const [pinError,   setPinError]   = useState(false);
  const [showPin,    setShowPin]    = useState(false);
  const [view,       setView]       = useState("home");
  const [activeTab,  setActiveTab]  = useState("ward");
  const [selectedBed,setSelectedBed]= useState(null);
  const [bedEdit,    setBedEdit]    = useState({ consultant:"", diagnosis:"", notes:"", historyTaken:false, opStatus:"" });
  const [assignModal,setAssignModal]= useState(null); // {bed, side:""|"L"|"R"}
  const [editMode,   setEditMode]   = useState(false);
  const [showReset,  setShowReset]  = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showChangeBed, setShowChangeBed] = useState(false);
  const [shadowEditing, setShadowEditing] = useState(false);
  const [shadowForm, setShadowForm] = useState(null);
  const [sectionFilter, setSectionFilter] = useState("all");
  const [setupForm,  setSetupForm]  = useState({});

  const setup  = ward.setup || {};
  const beds   = ward.beds  || {};
  const theme  = setup.themeColor || "#007aff";
  const rgb    = hexToRgb(theme);
  const sections  = setup.wardSections || [];
  const shadowHOs = setup.shadowHOs || [];
  const consultants = setup.consultants || [];

  const save = useCallback(async (newWard) => { await saveWard(newWard); }, [saveWard]);

  const tryPin = () => {
    if (isLeaderPin(pinInput, wardId)) { setIsLeader(true); setShowPin(false); setPinInput(""); showToast("Leader access granted"); }
    else { setPinError(true); setTimeout(()=>setPinError(false),1500); }
  };

  const updateBed = async (bedNum, updates) => {
    const newWard = { ...ward, beds:{ ...beds, [bedNum]:{ ...beds[bedNum], ...updates } } };
    await save(newWard);
  };

  const toggleFlag = async (bedNum, flag) => {
    await updateBed(bedNum, { [flag]: !beds[bedNum][flag] });
  };

  const toggleHistory = async (bedNum) => {
    const v = !beds[bedNum].historyTaken;
    await updateBed(bedNum, { historyTaken:v, isNew:v?false:beds[bedNum].isNew });
    setBedEdit(b=>({...b, historyTaken:v}));
  };

  const saveBedEdit = async (bedNum) => {
    const {patientSide, ...rest} = bedEdit;
    await updateBed(bedNum, rest);
  };

  const addFloorPatient = async () => {
    const b = { ...beds };
    const floorKeys = Object.keys(b).filter(k=>b[k].isFloor);
    const key = `F${floorKeys.length+1}`;
    b[key] = { assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:true, isFloor:true };
    await save({ ...ward, beds:b });
    showToast("Floor patient added");
  };

  const clearBed = async (bedNum) => {
    const existing = beds[bedNum] || {};
    await updateBed(bedNum, {
      assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, opStatus:"",
      dualPatient:false,
      assignedL:[], shadowsL:[], diagnosisL:"", notesL:"", consultantL:"", tagsL:[],
      assignedR:[], shadowsR:[], diagnosisR:"", notesR:"", consultantR:"", tagsR:[],
      tags:[],
      isFloor: existing.isFloor||false,
      specialBedSection: existing.specialBedSection||"",
    });
    setBedEdit({ patientName:"", consultant:"", diagnosis:"", notes:"", historyTaken:false, dualPatient:false, patientSide:"L",
      diagnosisL:"", diagnosisR:"", notesL:"", notesR:"", consultantL:"", consultantR:"", tags:[], tagsL:[], tagsR:[] });
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
    const cleared = { assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, opStatus:"" };
    await save({ ...ward, beds:{ ...beds, [bedNum]:cleared }, archive:{ ...archive, [weekKey]:weekArchive } });
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
    await save({ ...ward, beds:{ ...beds, [toBed]:restoredData }, archive });
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
    const cleared = { assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, opStatus:"" };
    await save({ ...ward, beds:{ ...beds, [fromBed]:cleared, [toBed]:bedData } });
    setShowChangeBed(false); setView("home"); setSelectedBed(null); showToast(`Moved to Bed ${toBed}`);
  };

  const saveShadowHOs = async (newHOs) => {
    await save({ ...ward, setup:{ ...setup, shadowHOs:newHOs } });
    setShadowEditing(false); showToast("Shadow HO posts updated");
  };

  const bedKeys = Object.keys(beds).sort((a,b)=>{
    const af=isNaN(a),bf=isNaN(b);
    if(af&&!bf) return 1; if(!af&&bf) return -1;
    if(!af&&!bf) return Number(a)-Number(b);
    return a.localeCompare(b);
  });

  // Filter beds by section if selected
  const getBedSection = (bedNum) => {
    // Special bed — use stored section
    if (beds[bedNum]?.specialBedSection) return beds[bedNum].specialBedSection;
    // Non-numeric ID with no specialBedSection — show as-is
    const n = Number(bedNum);
    if (isNaN(n)) return null;
    for (const sec of sections) {
      const rangeStr = sec.range||"";
      if (rangeStr.includes("-")) {
        const [start,end] = rangeStr.split("-").map(Number);
        if (n>=start && n<=end) return sec.name;
      }
    }
    return null;
  };

  const filteredBedKeys = sectionFilter==="all" ? bedKeys : bedKeys.filter(k=>{
    if (beds[k]?.isFloor) return sectionFilter==="floor";
    const sec = getBedSection(k);
    return sec===sectionFilter || (!sec && sectionFilter==="other");
  });

  const stats = {
    newPt:        bedKeys.filter(k=>beds[k]?.isNew).length,
    historyTaken: bedKeys.filter(k=>beds[k]?.historyTaken).length,
    assigned:     bedKeys.filter(k=>beds[k]?.assigned?.length>0||beds[k]?.shadows?.length>0).length,
    floor:        bedKeys.filter(k=>beds[k]?.isFloor).length,
  };

  const selBed = selectedBed ? beds[selectedBed] : null;

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
              <div style={{fontSize:"0.6rem",color:C.textMuted,marginTop:1,fontWeight:500,letterSpacing:"0.04em",textTransform:"uppercase"}}>{"Medicine"}</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {!seniorMode&&(isLeader
              ?<span style={{background:theme,color:"#fff",fontSize:"0.62rem",fontWeight:600,padding:"4px 10px",borderRadius:20}}>LEADER</span>
              :<button onClick={()=>setShowPin(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.surface,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:20,padding:"5px 12px",fontSize:"0.72rem",cursor:"pointer",fontFamily:SF,boxShadow:C.shadow}}><Icon name="key" size={12} color={C.textSub}/> Login</button>
            )}
            {seniorMode&&<span style={{fontSize:"0.62rem",fontWeight:600,color:"#007aff",background:"rgba(0,122,255,0.08)",border:"1px solid rgba(0,122,255,0.2)",borderRadius:20,padding:"4px 10px"}}>READ ONLY</span>}
            {isLeader&&!seniorMode&&<button onClick={()=>{ setSetupForm({ wardName:setup.wardName||"", appointmentType:setup.appointmentType||"", bedCount:setup.bedCount||"", themeColor:setup.themeColor||"#007aff", students:(setup.students||[{name:"",group:""}]).map(s=>({...s})), consultants:(setup.consultants||[{name:"",color:"#6366f1"}]).map(c=>({...c})), wardSections:(setup.wardSections||[]).map(s=>({...s})), shadowHOs:(setup.shadowHOs||[{post:"Shadow HO 1",name:""},{post:"Shadow HO 2",name:""},{post:"Shadow HO 3",name:""}]).map(h=>({...h})), specialBeds:(setup.specialBeds||[]).map(b=>({...b})), customTags:(setup.customTags||[]).map(t=>({...t})) }); setEditMode(true); }} style={{display:"flex",alignItems:"center",justifyContent:"center",background:C.surface,border:`1px solid ${C.border}`,color:C.textMuted,borderRadius:50,width:32,height:32,cursor:"pointer",boxShadow:C.shadow}}><Icon name="settings" size={14} color={C.textMuted}/></button>}
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
                  const ptCount=Object.values(beds).filter(b=>(b.shadows||[]).some(s=>(typeof s==="object"?s.name:s)===ho.name)||(b.shadowsL||[]).some(s=>(typeof s==="object"?s.name:s)===ho.name)||(b.shadowsR||[]).some(s=>(typeof s==="object"?s.name:s)===ho.name)).length;
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
          <div style={{display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:10,marginBottom:20}}>
            {[
              {icon:"newdot",  color:C.red,   label:"New",          val:stats.newPt},
              {icon:"history", color:C.green, label:"Hx taken",     val:`${stats.historyTaken}/${stats.assigned}`},
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

          {/* Bed grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10}}>
            {filteredBedKeys.map(bedNum=>{
              const bed = beds[bedNum];
              const hasAssigned = bed.assigned?.length>0;
              const hasShadow   = bed.shadows?.length>0;
              const filled = hasAssigned||bed.diagnosis||bed.consultant;
              const cObj = consultants.find(c=>(typeof c==="object"?c.name:c)===bed.consultant);
              const cRgb = cObj?.color ? hexToRgb(cObj.color) : null;
              const secName = getBedSection(bedNum);
              return (
                <div key={bedNum}
                  onClick={seniorMode?undefined:()=>{ setSelectedBed(bedNum); setBedEdit({patientName:bed.patientName||"",consultant:bed.consultant||"",diagnosis:bed.diagnosis||"",notes:bed.notes||"",historyTaken:!!bed.historyTaken,dualPatient:!!bed.dualPatient,patientSide:"L",diagnosisL:bed.diagnosisL||"",diagnosisR:bed.diagnosisR||"",notesL:bed.notesL||"",notesR:bed.notesR||"",consultantL:bed.consultantL||"",consultantR:bed.consultantR||"",tags:bed.tags||[],tagsL:bed.tagsL||[],tagsR:bed.tagsR||[]}); setView("bed"); }}
                  style={{background:cRgb?`rgba(${cRgb},0.07)`:C.surface,border:bed.historyTaken?`1px solid rgba(${hexToRgb(C.green)},0.2)`:cRgb?`1px solid rgba(${cRgb},0.22)`:`1px solid rgba(0,0,0,${filled?0.1:0.08})`,boxShadow:cRgb?`0 6px 20px rgba(${cRgb},0.1),0 1px 4px rgba(0,0,0,0.05)`:filled?"0 6px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.05)":"0 2px 10px rgba(0,0,0,0.06),0 1px 3px rgba(0,0,0,0.04)",borderRadius:14,padding:"12px 11px",cursor:seniorMode?"default":"pointer",position:"relative",transition:"transform 0.12s, box-shadow 0.12s",userSelect:"none"}}
                  onMouseEnter={e=>{if(!seniorMode){e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 28px rgba(0,0,0,0.12)"}}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=cRgb?`0 6px 20px rgba(${cRgb},0.1),0 1px 4px rgba(0,0,0,0.05)`:filled?"0 6px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.05)":"0 2px 10px rgba(0,0,0,0.06),0 1px 3px rgba(0,0,0,0.04)";}}
                >
                  <div style={{position:"absolute",top:9,right:9,display:"flex",gap:4,alignItems:"center"}}>
                    {bed.historyTaken&&<Icon name="history" size={11} color={C.green}/>}
                    {bed.isNew&&<span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={10} color={C.red}/></span>}
                  </div>
                  <div style={{fontSize:"0.58rem",color:C.textMuted,marginBottom:3,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600}}>{bed.isFloor?"Floor":secName||"Bed"}</div>
                  <div style={{fontSize:"1.25rem",fontWeight:700,color:theme,lineHeight:1,letterSpacing:"-0.03em"}}>{bedNum}</div>
                  {bed.patientName&&<div style={{fontSize:"0.6rem",color:C.textSub,marginTop:2,fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{bed.patientName}</div>}
                  {bed.dualPatient ? (
                    <div style={{marginTop:5}}>
                      {[{side:"L",diag:bed.diagnosisL,con:bed.consultantL,tags:bed.tagsL},{side:"R",diag:bed.diagnosisR,con:bed.consultantR,tags:bed.tagsR}].map(({side,diag,con,tags})=>(
                        <div key={side} style={{display:"flex",alignItems:"flex-start",gap:5,marginBottom:3}}>
                          <span style={{fontSize:"0.52rem",fontWeight:700,background:`rgba(${rgb},0.15)`,color:theme,borderRadius:3,padding:"1px 4px",marginTop:1,flexShrink:0}}>{side}</span>
                          <div>
                            {diag&&<div style={{fontSize:"0.62rem",color:C.text,fontStyle:"italic",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:100}}>{diag}</div>}
                            {con&&<div style={{fontSize:"0.58rem",color:C.textSub}}>{con}</div>}
                            {(tags||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:2}}>
                              {(tags||[]).map(t=>{const tag=(setup.customTags||[]).find(ct=>ct.label===t);return tag?<span key={t} style={{fontSize:"0.5rem",fontWeight:700,padding:"1px 5px",borderRadius:4,background:`rgba(${hexToRgb(tag.color)},0.12)`,color:tag.color,border:`1px solid rgba(${hexToRgb(tag.color)},0.3)`}}>{t}</span>:null;})}
                            </div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      {bed.consultant&&<div style={{fontSize:"0.62rem",color:C.textSub,marginTop:5,fontWeight:500}}>{bed.consultant}</div>}
                      {bed.diagnosis&&<div style={{fontSize:"0.65rem",color:C.text,marginTop:2,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{bed.diagnosis}</div>}
                      {bed.notes&&<div style={{fontSize:"0.6rem",color:C.textSub,marginTop:4,lineHeight:1.35,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{bed.notes}</div>}
                      {(bed.tags||[]).length>0&&<div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:5}}>
                        {(bed.tags||[]).map(t=>{const tag=(setup.customTags||[]).find(ct=>ct.label===t);return tag?<span key={t} style={{fontSize:"0.52rem",fontWeight:700,padding:"2px 6px",borderRadius:5,background:`rgba(${hexToRgb(tag.color)},0.12)`,color:tag.color,border:`1px solid rgba(${hexToRgb(tag.color)},0.3)`}}>{t}</span>:null;})}
                      </div>}
                    </>
                  )}
                  {!seniorMode&&(()=>{
                    if(bed.dualPatient){
                      return(
                        <div style={{marginTop:5,display:"flex",flexDirection:"column",gap:3}}>
                          {[{side:"L",a:bed.assignedL||[],sh:bed.shadowsL||[]},{side:"R",a:bed.assignedR||[],sh:bed.shadowsR||[]}].map(({side,a,sh})=>(
                            (a.length>0||sh.length>0)?<div key={side} style={{display:"flex",alignItems:"center",gap:4,flexWrap:"wrap"}}>
                              <span style={{fontSize:"0.48rem",fontWeight:700,background:`rgba(${rgb},0.15)`,color:theme,borderRadius:3,padding:"1px 4px",flexShrink:0}}>{side}</span>
                              {a.map((s,i)=>{const n=typeof s==="object"?s.name:s;const g=typeof s==="object"?s.group:"";return<span key={i} style={{fontSize:"0.55rem",background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.18)`,borderRadius:4,padding:"1px 5px",color:theme,fontWeight:500}}>{n.split(" ")[0]}{g&&<sup style={{fontSize:"0.42rem",color:`rgba(${rgb},0.6)`}}>{g}</sup>}</span>;})}
                              {sh.map((s,i)=>{const n=typeof s==="object"?s.name:s;return<span key={i} style={{fontSize:"0.55rem",background:"rgba(0,0,0,0.03)",border:"1px dashed rgba(0,0,0,0.12)",borderRadius:4,padding:"1px 5px",color:C.textMuted}}>{n.split(" ")[0]}</span>;})}
                            </div>:null
                          ))}
                        </div>
                      );
                    }
                    return(hasAssigned||hasShadow)?<div style={{marginTop:7,display:"flex",flexWrap:"wrap",gap:3}}>
                      {(bed.assigned||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;const g=typeof s==="object"?s.group:"";return<span key={i} style={{fontSize:"0.58rem",background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.18)`,borderRadius:5,padding:"2px 5px",color:theme,display:"inline-flex",alignItems:"baseline",gap:2,fontWeight:500}}>{n.split(" ")[0]}{g&&<span style={{fontSize:"0.45rem",lineHeight:1,position:"relative",top:"-1px",color:`rgba(${rgb},0.6)`}}>{g}</span>}</span>;})}
                      {(bed.shadows||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;return<span key={i} style={{fontSize:"0.58rem",background:"rgba(0,0,0,0.03)",border:"1px dashed rgba(0,0,0,0.12)",borderRadius:5,padding:"2px 5px",color:C.textMuted,display:"inline-flex",alignItems:"baseline",gap:2}}>{n.split(" ")[0]}</span>;})}
                    </div>:null;
                  })()}
                </div>
              );
            })}
          </div>
        </>}

        {activeTab==="students"&&!seniorMode&&<StudentsTab beds={beds} bedKeys={bedKeys} students={setup.students||[]} theme={theme} rgb={rgb}/>}
        {activeTab==="archive"&&<ArchiveTab archive={ward.archive||{}} beds={beds} theme={theme} rgb={rgb} onRestore={restoreBed} onDelete={deleteArchivedBed}/>}
      </div>

      {/* Bed detail sheet */}
      {!seniorMode&&view==="bed"&&selectedBed&&selBed&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:100,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>{if(e.target===e.currentTarget){setView("home");setSelectedBed(null);setShowClearConfirm(false);setShowChangeBed(false);}}}>
          <div style={{width:"100%",maxHeight:"88vh",overflowY:"auto",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",boxShadow:"0 -4px 40px rgba(0,0,0,0.12)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 22px"}}/>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
              <div>
                <div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:500}}>{selBed.isFloor?"Floor Patient":getBedSection(selectedBed)||"Bed"}</div>
                <h2 style={{margin:"3px 0 0",fontSize:"2rem",fontWeight:700,color:theme,letterSpacing:"-0.04em"}}>{selectedBed}</h2>
              </div>
              <button onClick={()=>{setView("home");setSelectedBed(null);setShowClearConfirm(false);setShowChangeBed(false);}} style={{background:C.surfaceEl,border:"none",color:C.textSub,borderRadius:50,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginTop:4}}><Icon name="close" size={13} color={C.textSub}/></button>
            </div>

            {isLeader&&(
              <div style={{display:"flex",gap:8,marginBottom:18}}>
                <button onClick={()=>toggleFlag(selectedBed,"isNew")} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:selBed.isNew?`rgba(${hexToRgb(C.red)},0.08)`:C.surfaceEl,border:`1px solid ${selBed.isNew?C.red:C.border}`,color:selBed.isNew?C.red:C.textSub,borderRadius:10,padding:"10px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF,fontWeight:500}}>
                  <Icon name="newdot" size={11} color={selBed.isNew?C.red:C.textMuted}/>{selBed.isNew?"New Patient":"Mark New"}
                </button>
                <button onClick={()=>setAssignModal({bed:selectedBed,side:""})} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"10px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF,fontWeight:600}}>
                  <Icon name="user" size={12} color="#fff"/> {bedEdit.dualPatient?"Assign All":"Assign"}
                </button>
                {bedEdit.dualPatient&&<>
                  <button onClick={()=>setAssignModal({bed:selectedBed,side:"L"})} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.3)`,color:theme,borderRadius:10,padding:"10px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF,fontWeight:600}}>
                    <span style={{fontSize:"0.6rem",fontWeight:700,background:`rgba(${rgb},0.2)`,borderRadius:3,padding:"1px 4px"}}>L</span> Assign
                  </button>
                  <button onClick={()=>setAssignModal({bed:selectedBed,side:"R"})} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:4,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.3)`,color:theme,borderRadius:10,padding:"10px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF,fontWeight:600}}>
                    <span style={{fontSize:"0.6rem",fontWeight:700,background:`rgba(${rgb},0.2)`,borderRadius:3,padding:"1px 4px"}}>R</span> Assign
                  </button>
                </>}
                {selBed.isFloor&&<button onClick={async()=>{const b={...beds};delete b[selectedBed];await save({...ward,beds:b});setView("home");setSelectedBed(null);showToast("Floor patient removed");}} style={{display:"flex",alignItems:"center",justifyContent:"center",background:`rgba(${hexToRgb(C.red)},0.07)`,border:`1px solid ${C.red}`,color:C.red,borderRadius:10,padding:"10px 12px",fontSize:"0.78rem",cursor:"pointer"}}><Icon name="close" size={13} color={C.red}/></button>}
              </div>
            )}

            {/* Patient name (optional) */}
            <div style={{marginBottom:16}}>
              <label style={labelStyle}>Patient Name <span style={{color:C.textMuted,fontWeight:400}}>(optional)</span></label>
              <input value={bedEdit.patientName||""} onChange={e=>setBedEdit(b=>({...b,patientName:e.target.value}))} placeholder="e.g. Perera M.T." style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box"}}/>
            </div>

            {/* Dual patient toggle */}
            <div style={{marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:bedEdit.dualPatient?10:0}}>
                <span style={{fontSize:"0.78rem",color:C.textSub,fontWeight:500}}>Two patients this bed</span>
                <div onClick={()=>setBedEdit(b=>({...b,dualPatient:!b.dualPatient,patientSide:!b.dualPatient?"L":"L"}))}
                  style={{width:42,height:24,borderRadius:12,background:bedEdit.dualPatient?theme:"rgba(0,0,0,0.12)",cursor:"pointer",position:"relative",transition:"background 0.2s",flexShrink:0}}>
                  <div style={{position:"absolute",top:3,left:bedEdit.dualPatient?20:3,width:18,height:18,borderRadius:9,background:"#fff",transition:"left 0.2s",boxShadow:"0 1px 3px rgba(0,0,0,0.2)"}}/>
                </div>
              </div>
              {bedEdit.dualPatient && (
                <div style={{display:"flex",gap:6}}>
                  {["L","R"].map(side=>(
                    <button key={side} onClick={()=>setBedEdit(b=>({...b,patientSide:side}))}
                      style={{flex:1,padding:"8px",borderRadius:9,fontSize:"0.82rem",fontWeight:bedEdit.patientSide===side?700:500,cursor:"pointer",fontFamily:SF,
                        background:bedEdit.patientSide===side?theme:C.surfaceEl,
                        border:`1px solid ${bedEdit.patientSide===side?theme:C.border}`,
                        color:bedEdit.patientSide===side?"#fff":C.textSub}}>
                      {side==="L"?"← Left":"Right →"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* New patient toggle */}
            <div onClick={()=>toggleFlag(selectedBed,"isNew")} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:selBed.isNew?`rgba(${hexToRgb(C.red)},0.06)`:C.surfaceEl,border:`1px solid ${selBed.isNew?`rgba(${hexToRgb(C.red)},0.3)`:C.border}`,borderRadius:13,cursor:"pointer",marginBottom:10,userSelect:"none"}}>
              <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${selBed.isNew?C.red:C.borderMid}`,background:selBed.isNew?C.red:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>{selBed.isNew&&<Icon name="check" size={12} color="#fff"/>}</div>
              <div><div style={{fontSize:"0.88rem",color:selBed.isNew?C.red:C.text,fontWeight:500}}>New Patient</div></div>
              <div style={{marginLeft:"auto"}}><Icon name="newdot" size={14} color={selBed.isNew?C.red:C.textMuted}/></div>
            </div>

            {/* History */}
            <div onClick={()=>toggleHistory(selectedBed)} style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:bedEdit.historyTaken?`rgba(${hexToRgb(C.green)},0.07)`:C.surfaceEl,border:`1px solid ${bedEdit.historyTaken?`rgba(${hexToRgb(C.green)},0.3)`:C.border}`,borderRadius:13,cursor:"pointer",marginBottom:20,userSelect:"none"}}>
              <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${bedEdit.historyTaken?C.green:C.borderMid}`,background:bedEdit.historyTaken?C.green:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>{bedEdit.historyTaken&&<Icon name="check" size={12} color="#fff"/>}</div>
              <div><div style={{fontSize:"0.88rem",color:bedEdit.historyTaken?C.green:C.text,fontWeight:500}}>History Taken</div></div>
              <div style={{marginLeft:"auto"}}><Icon name="history" size={14} color={bedEdit.historyTaken?C.green:C.textMuted}/></div>
            </div>

            {/* Assigned */}
            {(selBed.assigned?.length>0||selBed.shadows?.length>0)&&(
              <div style={{marginBottom:16}}>
                <div style={{fontSize:"0.65rem",color:C.textMuted,marginBottom:8,letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:500}}>Assigned</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {(selBed.assigned||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;const g=typeof s==="object"?s.group:"";return<span key={i} style={{display:"flex",alignItems:"center",gap:5,background:`rgba(${rgb},0.09)`,border:`1px solid rgba(${rgb},0.2)`,color:theme,borderRadius:8,padding:"5px 10px",fontSize:"0.78rem",fontWeight:500}}><Icon name="user" size={11} color={theme}/>{n}{g&&<span style={{fontSize:"0.6rem",color:`rgba(${rgb},0.5)`,marginLeft:2}}>·{g}</span>}</span>;})}
                  {(selBed.shadows||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;return<span key={i} style={{display:"flex",alignItems:"center",gap:5,background:C.surfaceEl,border:`1px dashed ${C.borderMid}`,color:C.textSub,borderRadius:8,padding:"5px 10px",fontSize:"0.78rem"}}><Icon name="shadow" size={11} color={C.textMuted}/>{n} <span style={{fontSize:"0.65rem",color:C.textMuted}}>(shadow)</span></span>;})}
                </div>
              </div>
            )}

            {/* Consultant */}
            <div style={{marginBottom:16}}>
              <label style={labelStyle}>Consultant{bedEdit.dualPatient&&<span style={{marginLeft:6,fontSize:"0.65rem",color:theme,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.2)`,borderRadius:4,padding:"1px 6px"}}>{bedEdit.patientSide}</span>}</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                {consultants.length>0
                  ?consultants.map((c,i)=>{
                    const cN=typeof c==="object"?c.name:c;const cC=typeof c==="object"?c.color:"#6366f1";
                    const fieldKey = bedEdit.dualPatient ? (bedEdit.patientSide==="L"?"consultantL":"consultantR") : "consultant";
                    const act=bedEdit[fieldKey]===cN;
                    return<button key={i} onClick={()=>setBedEdit(b=>({...b,[fieldKey]:b[fieldKey]===cN?"":cN}))} style={{display:"flex",alignItems:"center",gap:7,background:act?`rgba(${hexToRgb(cC)},0.12)`:C.surfaceEl,border:`1px solid ${act?cC:C.border}`,color:act?cC:C.textSub,borderRadius:8,padding:"7px 13px",fontSize:"0.8rem",cursor:"pointer",fontFamily:SF,fontWeight:act?600:400}}><div style={{width:8,height:8,borderRadius:"50%",background:cC}}/>{cN}</button>;})
                  :<input value={bedEdit.dualPatient?(bedEdit.patientSide==="L"?bedEdit.consultantL||"":bedEdit.consultantR||""):bedEdit.consultant} onChange={e=>{const k=bedEdit.dualPatient?(bedEdit.patientSide==="L"?"consultantL":"consultantR"):"consultant";setBedEdit(b=>({...b,[k]:e.target.value}));}} placeholder="Consultant" style={{...iS,width:"100%",boxSizing:"border-box"}}/>
                }
              </div>
            </div>

            {/* Custom Tags */}
            {(setup.customTags||[]).length>0&&(
              <div style={{marginBottom:14}}>
                <label style={labelStyle}>Tags{bedEdit.dualPatient&&<span style={{marginLeft:6,fontSize:"0.65rem",color:theme,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.2)`,borderRadius:4,padding:"1px 6px"}}>{bedEdit.patientSide}</span>}</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                  {(setup.customTags||[]).map((tag,ti)=>{
                    const tagKey = bedEdit.dualPatient?(bedEdit.patientSide==="L"?"tagsL":"tagsR"):"tags";
                    const activeTags = bedEdit[tagKey]||[];
                    const isActive = activeTags.includes(tag.label);
                    const tagRgb = hexToRgb(tag.color||"#6366f1");
                    return(
                      <button key={ti} onClick={()=>setBedEdit(b=>{const k=bedEdit.dualPatient?(b.patientSide==="L"?"tagsL":"tagsR"):"tags";const cur=b[k]||[];return{...b,[k]:isActive?cur.filter(t=>t!==tag.label):[...cur,tag.label]};})}
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

            <div style={{marginBottom:14}}>
              <label style={labelStyle}>Diagnosis{bedEdit.dualPatient&&<span style={{marginLeft:6,fontSize:"0.65rem",color:theme,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.2)`,borderRadius:4,padding:"1px 6px"}}>{bedEdit.patientSide}</span>}</label>
              <input value={bedEdit.dualPatient?(bedEdit.patientSide==="L"?bedEdit.diagnosisL||"":bedEdit.diagnosisR||""):bedEdit.diagnosis}
                onChange={e=>{const k=bedEdit.dualPatient?(bedEdit.patientSide==="L"?"diagnosisL":"diagnosisR"):"diagnosis";setBedEdit(b=>({...b,[k]:e.target.value}));}}
                placeholder="Working diagnosis…" style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={labelStyle}>Notes{bedEdit.dualPatient&&<span style={{marginLeft:6,fontSize:"0.65rem",color:theme,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.2)`,borderRadius:4,padding:"1px 6px"}}>{bedEdit.patientSide}</span>}</label>
              <textarea value={bedEdit.dualPatient?(bedEdit.patientSide==="L"?bedEdit.notesL||"":bedEdit.notesR||""):bedEdit.notes}
                onChange={e=>{const k=bedEdit.dualPatient?(bedEdit.patientSide==="L"?"notesL":"notesR"):"notes";setBedEdit(b=>({...b,[k]:e.target.value}));}}
                rows={3} placeholder="Clinical notes…" style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:SF}}/>
            </div>

            <button onClick={async()=>{await saveBedEdit(selectedBed);setView("home");setSelectedBed(null);}} style={{background:theme,border:"none",color:"#fff",borderRadius:13,cursor:"pointer",fontWeight:600,fontFamily:SF,fontSize:"0.95rem",width:"100%",padding:"14px",boxShadow:`0 4px 14px rgba(${rgb},0.3)`}}>Save</button>

            {/* Bottom buttons */}
            {!showClearConfirm&&!showChangeBed&&(
              <div style={{display:"flex",gap:8,marginTop:10}}>
                <button onClick={()=>setShowChangeBed(true)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:12,padding:"11px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF}}>Change Bed</button>
                <button onClick={()=>archiveBed(selectedBed)} style={{flex:1,background:`rgba(${hexToRgb("#f97316")},0.07)`,border:"1px solid rgba(249,115,22,0.3)",color:"#c2410c",borderRadius:12,padding:"11px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF}}>Archive</button>
                <button onClick={()=>setShowClearConfirm(true)} style={{flex:1,background:`rgba(${hexToRgb(C.red)},0.06)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,color:C.red,borderRadius:12,padding:"11px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF}}>Clear</button>
              </div>
            )}
            {showChangeBed&&(()=>{
              // Group all beds by section
              const sectionOrder = sections.map(s=>s.name);
              const grouped = {};
              bedKeys.filter(k=>k!==selectedBed).forEach(k=>{
                const sec = getBedSection(k) || (beds[k]?.isFloor?"Floor":"Other");
                if(!grouped[sec]) grouped[sec]=[];
                grouped[sec].push(k);
              });
              // Sort each section's beds: numeric first, then alpha
              Object.keys(grouped).forEach(sec=>{
                grouped[sec].sort((a,b)=>{
                  const an=Number(a),bn=Number(b);
                  if(!isNaN(an)&&!isNaN(bn)) return an-bn;
                  if(!isNaN(an)) return -1; if(!isNaN(bn)) return 1;
                  return a.localeCompare(b);
                });
              });
              const orderedSecs = [...sectionOrder.filter(s=>grouped[s]),...Object.keys(grouped).filter(s=>!sectionOrder.includes(s))];
              return (
                <div style={{marginTop:10,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:13,padding:"14px",maxHeight:360,overflowY:"auto"}}>
                  <div style={{fontSize:"0.72rem",color:C.textSub,fontWeight:600,marginBottom:10}}>Move to which bed?</div>
                  {orderedSecs.map(sec=>(
                    <div key={sec} style={{marginBottom:14}}>
                      <div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500,marginBottom:6}}>{sec}</div>
                      <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
                        {grouped[sec].map(k=>{
                          const b=beds[k];
                          const occupied=b&&(b.assigned?.length>0||b.shadows?.length>0||b.diagnosis||b.consultant||b.notes);
                          return(
                            <button key={k} onClick={()=>!occupied&&changeBedNumber(selectedBed,k)} disabled={occupied}
                              style={{padding:"10px 4px",borderRadius:9,fontSize:"0.8rem",fontWeight:700,cursor:occupied?"default":"pointer",fontFamily:SF,
                                background:occupied?"rgba(0,0,0,0.04)":`rgba(${rgb},0.1)`,
                                border:`1px solid ${occupied?"rgba(0,0,0,0.08)":`rgba(${rgb},0.3)`}`,
                                color:occupied?C.textMuted:theme,opacity:occupied?0.45:1}}>
                              {k}
                            </button>
                          );
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
                <p style={{margin:"0 0 12px",fontSize:"0.82rem",color:C.textSub,textAlign:"center"}}>Clear all patient data for this bed?</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setShowClearConfirm(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"10px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
                  <button onClick={()=>clearBed(selectedBed)} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"10px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Clear</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Medicine assign modal — shadow restricted to Shadow HOs */}
      {assignModal&&(()=>{
        const {bed:aBed, side} = assignModal;
        const assignedKey = side==="L"?"assignedL":side==="R"?"assignedR":"assigned";
        const shadowsKey  = side==="L"?"shadowsL" :side==="R"?"shadowsR" :"shadows";
        return <MedicineAssignModal
          bedNum={aBed} side={side}
          students={setup.students||[]}
          currentAssigned={beds[aBed]?.[assignedKey]||[]}
          currentShadows={beds[aBed]?.[shadowsKey]||[]}
          shadowHOs={shadowHOs} theme={theme} rgb={rgb}
          onConfirm={async(a,s)=>{ await updateBed(aBed,{[assignedKey]:a,[shadowsKey]:s}); setAssignModal(null); showToast("Students assigned"); }}
          onClose={()=>setAssignModal(null)} allBeds={beds}/>;
      })()}

      {/* Shadow HO edit */}
      {shadowEditing&&shadowForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,borderRadius:20,padding:"26px 22px",width:"100%",maxWidth:380,boxShadow:C.shadowMd,border:`1px solid ${C.border}`}}>
            <h3 style={{margin:"0 0 14px",color:C.text,fontWeight:600}}>Shadow HO Posts</h3>
            {shadowForm.map((ho,i)=>(
              <div key={i} style={{marginBottom:12}}>
                <label style={labelStyle}>{ho.post}</label>
                <select value={ho.name} onChange={e=>setShadowForm(f=>{const a=[...f];a[i]={...a[i],name:e.target.value};return a;})} style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}>
                  <option value="">— Unassigned —</option>
                  {(setup.students||[]).filter(s=>s.name).map(s=>(
                    <option key={s.name} value={s.name}>{s.group?`${s.group} · `:""}{s.name}</option>
                  ))}
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
              <button onClick={async()=>{ const cleared={}; Object.keys(beds).forEach(k=>{cleared[k]={...beds[k],assigned:[],shadows:[],consultant:"",diagnosis:"",notes:"",historyTaken:false,isNew:false,opStatus:""};}); await save({...ward,beds:cleared}); setShowReset(false); showToast("Ward reset"); }} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:700,fontFamily:SF}}>Reset</button>
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
              const students    = (setupForm.students||[]).filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),group:s.group?.trim()||""}));
              const consultants = (setupForm.consultants||[]).filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"}));
              const wardSections= (setupForm.wardSections||[]).filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),range:s.range||""}));
              const specialBeds = (setupForm.specialBeds||[]).filter(b=>b.id?.trim()).map(b=>({id:b.id.trim(),section:b.section?.trim()||""}));
              // Add any new special beds to the beds object
              const newBeds = {...beds};
              specialBeds.forEach(b=>{ if(!newBeds[b.id]){ newBeds[b.id]={ assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, opStatus:"", specialBedSection:b.section }; } else { newBeds[b.id]={...newBeds[b.id],specialBedSection:b.section}; } });
              const customTags  = (setupForm.customTags||[]).filter(t=>t.label?.trim()).map(t=>({label:t.label.trim(),color:t.color||"#6366f1"}));
              await save({...ward,beds:newBeds,setup:{...setup,wardName:setupForm.wardName,appointmentType:setupForm.appointmentType,themeColor:setupForm.themeColor,students,consultants,wardSections,shadowHOs:setupForm.shadowHOs||setup.shadowHOs,specialBeds,customTags}});
              setEditMode(false); showToast("Settings saved!");
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
function MedicineAssignModal({ bedNum, side, students, currentAssigned, currentShadows, shadowHOs, allBeds={}, theme, rgb, onConfirm, onClose }) {
  const [assigned, setAssigned] = useState(currentAssigned);
  const [shadows,  setShadows]  = useState(currentShadows);

  const sorted = [...students].sort((a,b)=>{const ag=parseInt(a.group)||999,bg=parseInt(b.group)||999;return ag!==bg?ag-bg:a.name.localeCompare(b.name);});
  const activeShadowHOs = (shadowHOs||[]).filter(h=>h.name);
  const getName = s=>typeof s==="object"?s.name:s;
  const isAssigned = s=>assigned.some(x=>getName(x)===getName(s));

  // Count how many beds each student is assigned to across all beds
  const countFor = (name) => Object.values(allBeds).filter(b=>
    (b.assigned||[]).some(s=>getName(s)===name)||(b.assignedL||[]).some(s=>getName(s)===name)||(b.assignedR||[]).some(s=>getName(s)===name)
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
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:"100%",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",maxHeight:"75vh",overflowY:"auto",boxShadow:"0 -4px 40px rgba(0,0,0,0.1)"}}>
        <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 20px"}}/>
        <h3 style={{margin:"0 0 16px",color:C.text,fontSize:"1.05rem",fontWeight:600}}>
          Assign — Bed {bedNum}{side&&<span style={{marginLeft:8,fontSize:"0.75rem",fontWeight:700,background:`rgba(${rgb},0.12)`,color:theme,border:`1px solid rgba(${rgb},0.25)`,borderRadius:5,padding:"2px 8px"}}>{side} side</span>}
        </h3>

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

  const filteredPatients = sectionFilter==="all" ? patients : patients.filter(p=>p.section===sectionFilter);
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
                        const hasSingle=hasAnyOccupant(bed);
                        const hasAny=patients.some(p=>p.bedNo===bed&&p.section===newPt.section);
                        const hasOccupant = patients.some(pt=>pt.bedNo===bed&&pt.section===newPt.section);
                        return <button key={bed} onClick={()=>!full&&setNewPt(p=>({...p,bedNo:isSel?"":bed,side:hasOccupant?"":"single",_conflictId:null,_conflictSide:null}))}
                          style={{padding:"6px 12px",borderRadius:9,fontSize:"0.82rem",fontWeight:isSel?700:500,
                            cursor:full&&!isSel?"not-allowed":"pointer",fontFamily:SF,
                            background:isSel?theme:full?"rgba(0,0,0,0.04)":hasSingle?"rgba(245,158,11,0.08)":C.surface,
                            border:`1px solid ${isSel?theme:full?"rgba(0,0,0,0.08)":hasSingle?"rgba(245,158,11,0.4)":C.border}`,
                            color:isSel?"#fff":full?C.textMuted:hasSingle?"rgb(161,104,0)":C.text,
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
                    <button key={s.name} onClick={()=>setPtEdit(p=>({...p,section:s.name,bedNo:"",side:"single"}))}
                      style={{padding:"5px 14px",borderRadius:20,fontSize:"0.78rem",fontWeight:isSel?600:400,cursor:"pointer",fontFamily:SF,
                        background:isSel?theme:C.surfaceEl,border:`1px solid ${isSel?theme:C.border}`,color:isSel?"#fff":C.textSub}}>
                      {s.name}
                    </button>
                  );
                })}
              </div>
              {/* Bed grid from setup ranges + special beds */}
              {ptEdit.section&&(()=>{
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
                  const others = patients.filter(p=>p.bedNo===bed&&p.id!==selectedPt);
                  return others.some(p=>p.side==="L")&&others.some(p=>p.side==="R");
                };
                const hasAnyOccupant = (bed) => {
                  return patients.some(p=>p.bedNo===bed&&p.id!==selectedPt);
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
                          <button key={bed} onClick={()=>!full&&setPtEdit(p=>({...p,bedNo:isSel&&!hasOccupant?"":bed,side:hasOccupant?"":"single",_conflictId:null,_conflictSide:null}))}
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
                      const others = patients.filter(p=>p.bedNo===ptEdit.bedNo&&p.id!==selectedPt);
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
                <button onClick={()=>{const newVal=!selPt.historyTaken;updatePatient(selectedPt,{historyTaken:newVal});setPtEdit(p=>({...p,historyTaken:newVal}));}}
                  style={{width:"100%",padding:"9px",borderRadius:10,fontSize:"0.78rem",fontWeight:500,fontFamily:SF,cursor:"pointer",background:selPt.historyTaken?`rgba(${hexToRgb(C.green)},0.1)`:C.surface,border:`1px solid ${selPt.historyTaken?C.green:C.border}`,color:selPt.historyTaken?C.green:C.textMuted}}>
                  {selPt.historyTaken?"✓ History Taken":"History Taken"}
                </button>
              </div>
            )}
            <div style={{marginBottom:14}}>
              <label style={labelStyle}>Consultant</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
                {[{name:"",color:""},...consultants.map(c=>typeof c==="object"?c:{name:c,color:"#6366f1"})].map(c=>{
                  const isSel = (ptEdit.consultant||"")===(c.name||"");
                  const cRgb = c.color ? hexToRgb(c.color) : null;
                  return (
                    <button key={c.name||"none"} onClick={()=>setPtEdit(p=>({...p,consultant:c.name||""}))}
                      style={{display:"flex",alignItems:"center",gap:6,padding:"7px 12px",borderRadius:10,cursor:"pointer",fontFamily:SF,fontSize:"0.8rem",fontWeight:isSel?600:400,transition:"all 0.1s",
                        background:isSel&&cRgb?`rgba(${cRgb},0.1)`:isSel?C.surfaceEl:C.surface,
                        border:`1px solid ${isSel&&c.color?c.color:isSel?C.textSub:C.border}`,
                        color:isSel&&c.color?c.color:isSel?C.textSub:C.textSub}}>
                      {c.color
                        ? <span style={{width:8,height:8,borderRadius:"50%",background:c.color,flexShrink:0,display:"inline-block"}}/>
                        : <span style={{width:8,height:8,borderRadius:"50%",background:C.border,flexShrink:0,display:"inline-block"}}/>
                      }
                      {c.name||"None"}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{marginBottom:12}}><label style={labelStyle}>Diagnosis</label><input value={ptEdit.diagnosis||""} onChange={e=>setPtEdit(p=>({...p,diagnosis:e.target.value}))} placeholder="e.g. Acute appendicitis" style={{...iS,width:"100%",boxSizing:"border-box",marginTop:4}}/></div>
            <div style={{marginBottom:12}}><label style={labelStyle}>Notes</label><textarea value={ptEdit.notes||""} onChange={e=>setPtEdit(p=>({...p,notes:e.target.value}))} rows={3} style={{...iS,width:"100%",boxSizing:"border-box",marginTop:4,resize:"vertical",lineHeight:1.5}}/></div>
            {/* Tags — visible to all */}
            {(setup.customTags||[]).length>0&&!seniorMode&&(
              <div style={{marginBottom:16}}>
                <label style={labelStyle}>Tags</label>
                <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:6}}>
                  {(setup.customTags||[]).map(tag=>{
                    const sel=(ptEdit.tags||[]).includes(tag.label);
                    return (
                      <button key={tag.label} onClick={()=>setPtEdit(p=>{const t=p.tags||[];return{...p,tags:sel?t.filter(x=>x!==tag.label):[...t,tag.label]};})}
                        style={{padding:"5px 12px",borderRadius:20,fontSize:"0.74rem",fontWeight:sel?600:400,cursor:"pointer",fontFamily:SF,
                          background:sel?`rgba(${hexToRgb(tag.color)},0.15)`:C.surface,
                          border:`1px solid ${sel?tag.color:C.border}`,color:sel?tag.color:C.textSub}}>
                        {tag.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
            {isLeader&&!seniorMode&&(
              <>
                <button onClick={async()=>{
                  const ageStr=[ptEdit.ageYears&&`${ptEdit.ageYears}y`,ptEdit.ageMonths&&`${ptEdit.ageMonths}m`].filter(Boolean).join(" ");
                  const members=ptEdit.pairingIdx!=null&&pairings[ptEdit.pairingIdx]?(pairings[ptEdit.pairingIdx].members||[]).filter(m=>m&&!shadowHONames.has(m)):[];
                  const shadowHO=shadowAutoAlloc?(getSuggestedShadow()?.name||selPt.shadowHO||""):(ptEdit.shadowHO||"");
                  let newPatients = patients.map(p=>p.id===selectedPt?{...p,bht:ptEdit.bht,patientName:ptEdit.patientName,age:ageStr,bedNo:ptEdit.bedNo,section:ptEdit.section,side:ptEdit.side,pairingIdx:ptEdit.pairingIdx,members,shadowHO,consultant:ptEdit.consultant,diagnosis:ptEdit.diagnosis,notes:ptEdit.notes,tags:ptEdit.tags||[]}:p);
                  if(sideConflict) newPatients=newPatients.map(p=>p.id===sideConflict.existingPtId?{...p,side:sideConflict.otherSide}:p);
                  await save({...ward,patients:newPatients});
                  setSideConflict(null); showToast("Saved"); setSelectedPt(null); setShowClearConfirm(false);
                }} style={{...accentBtn(theme,rgb),width:"100%",padding:"13px",fontSize:"0.9rem",marginBottom:10}}>Save</button>
                {!showClearConfirm
                  ?<button onClick={()=>setShowClearConfirm(true)} style={{width:"100%",background:"none",border:`1px solid rgba(${hexToRgb(C.red)},0.3)`,color:C.red,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF,fontSize:"0.85rem"}}>Remove Patient</button>
                  :<div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setShowClearConfirm(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
                    <button onClick={()=>removePatient(selectedPt)} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:700,fontFamily:SF}}>Remove</button>
                  </div>
                }
              </>
            )}
            {!isLeader&&!seniorMode&&(
              <button onClick={async()=>{
                const ageStr=[ptEdit.ageYears&&`${ptEdit.ageYears}y`,ptEdit.ageMonths&&`${ptEdit.ageMonths}m`].filter(Boolean).join(" ");
                const shadowHO=shadowAutoAlloc?(getSuggestedShadow()?.name||selPt.shadowHO||""):(ptEdit.shadowHO||"");
                let newPatients = patients.map(p=>p.id===selectedPt?{...p,bht:ptEdit.bht,patientName:ptEdit.patientName,age:ageStr,bedNo:ptEdit.bedNo,section:ptEdit.section,side:ptEdit.side,shadowHO,consultant:ptEdit.consultant,diagnosis:ptEdit.diagnosis,notes:ptEdit.notes,historyTaken:ptEdit.historyTaken,tags:ptEdit.tags||[]}:p);
                if(sideConflict) newPatients=newPatients.map(p=>p.id===sideConflict.existingPtId?{...p,side:sideConflict.otherSide}:p);
                await save({...ward,patients:newPatients});
                setSideConflict(null); showToast("Saved"); setSelectedPt(null);
              }} style={{...accentBtn(theme,rgb),width:"100%",padding:"13px",fontSize:"0.9rem"}}>Save</button>
            )}
          </div>
        </div>
      )}

      {/* Pairing switch confirmation */}
      {switchConfirm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"24px 22px",width:"100%",maxWidth:320,boxShadow:C.shadowMd}}>
            <h3 style={{margin:"0 0 8px",color:C.text,fontWeight:600,fontSize:"1rem"}}>Switch Pairing?</h3>
            <p style={{margin:"0 0 18px",color:C.textSub,fontSize:"0.82rem",lineHeight:1.5}}>
              <strong>{switchConfirm.studentName}{getGroup(switchConfirm.studentName)&&<sup style={{fontSize:"0.7em",marginLeft:"1px"}}>{getGroup(switchConfirm.studentName)}</sup>}</strong> is currently in <strong>Pairing {switchConfirm.fromPairingIdx+1}</strong> ({(pairings[switchConfirm.fromPairingIdx]?.members||[]).filter(m=>m&&!shadowHONames.has(m)&&m!==switchConfirm.studentName).join(" × ")||"solo"}).
              {" "}Move them to the pairing you selected?
            </p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setSwitchConfirm(null)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={()=>{
                switchConfirm.setter(switchConfirm.fromPairingIdx);
                setSwitchConfirm(null);
              }} style={{flex:1,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Switch</button>
            </div>
          </div>
        </div>
      )}

      {/* Shadow HO step 1 */}
      {shadowEditing&&shadowForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:300,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>e.target===e.currentTarget&&setShadowEditing(false)}>
          <div style={{width:"100%",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",maxHeight:"70vh",overflowY:"auto",boxShadow:"0 -4px 40px rgba(0,0,0,0.12)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 18px"}}/>
            <h3 style={{margin:"0 0 6px",color:C.text,fontWeight:600}}>Update Shadow HO Posts</h3>
            <p style={{margin:"0 0 14px",fontSize:"0.75rem",color:C.textMuted}}>Pairings auto-update on next step.</p>
            {shadowForm.map((ho,i)=>(
              <div key={i} style={{display:"flex",gap:8,marginBottom:10,alignItems:"center"}}>
                <span style={{fontSize:"0.78rem",color:C.textSub,width:100,flexShrink:0,fontWeight:500}}>{ho.post}</span>
                <select value={ho.name} onChange={e=>{const s=[...shadowForm];s[i]={...s[i],name:e.target.value};setShadowForm(s);}} style={{...iS,flex:1,padding:"9px 12px"}}>
                  <option value="">— Unassigned —</option>
                  {students.filter(s=>s.name).map(s=><option key={s.name} value={s.name}>{s.name}</option>)}
                </select>
              </div>
            ))}
            <div style={{display:"flex",gap:10,marginTop:6}}>
              <button onClick={()=>setShadowEditing(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={()=>submitShadowNames(shadowForm)} style={{flex:1,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Next</button>
            </div>
          </div>
        </div>
      )}

      {/* Shadow HO step 2 */}
      {shadowReplaceStep&&pendingShadowForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:310,display:"flex",alignItems:"flex-end",backdropFilter:"blur(6px)"}}>
          <div style={{width:"100%",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 -4px 40px rgba(0,0,0,0.15)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 18px"}}/>
            <h3 style={{margin:"0 0 6px",color:C.text,fontWeight:600}}>Pairing Replacement</h3>
            <p style={{margin:"0 0 16px",fontSize:"0.75rem",color:C.textMuted}}>The students returning from Shadow HO duty need a pairing slot. Select whose slot each one takes.</p>
            {(()=>{
              const newNames = new Set(pendingShadowForm.map(h=>h.name).filter(Boolean));
              // Outgoing = leaving shadow duty, returning to active
              const outgoing = shadowHOs.map(h=>h.name).filter(n=>n&&!newNames.has(n));
              // Incoming = active students becoming shadow HOs (vacating a pairing slot)
              const incoming = [...newNames].filter(n=>!shadowHONames.has(n)&&students.some(s=>s.name===n));
              return outgoing.map((outName,i)=>{
                const g = getGroup(outName);
                const selected = shadowReplaceSelection[outName];
                return (
                  <div key={outName} style={{marginBottom:20}}>
                    <div style={{fontSize:"0.72rem",fontWeight:600,color:C.text,marginBottom:8}}>
                      {outName.split(" ")[0]}{g&&<sup style={{fontSize:"0.6em",fontWeight:700,marginLeft:"1px"}}>{g}</sup>} takes the slot of:
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:8}}>
                      {incoming.map(inName=>{
                        const isSel = selected===inName;
                        const alreadyUsed = Object.entries(shadowReplaceSelection).some(([k,v])=>v===inName&&k!==outName);
                        const ig = getGroup(inName);
                        // Show inName's current pairing mates
                        const pair = pairings.find(p=>(p.members||[]).includes(inName));
                        const mates = (pair?.members||[]).filter(m=>m&&m!==inName&&!shadowHONames.has(m));
                        return (
                          <div key={inName} onClick={()=>!alreadyUsed&&setShadowReplaceSelection(r=>({...r,[outName]:isSel?undefined:inName}))}
                            style={{padding:"10px 10px",borderRadius:11,cursor:alreadyUsed?"not-allowed":"pointer",textAlign:"center",
                              background:isSel?`rgba(${rgb},0.1)`:alreadyUsed?"rgba(0,0,0,0.02)":C.surfaceEl,
                              border:`1px solid ${isSel?theme:alreadyUsed?C.border:C.borderMid}`,opacity:alreadyUsed?0.4:1}}>
                            <div style={{fontSize:"0.88rem",fontWeight:isSel?700:600,color:isSel?theme:C.text,marginBottom:2}}>
                              {inName.split(" ")[0]}{ig&&<sup style={{fontSize:"0.55em",fontWeight:700,marginLeft:"1px",opacity:0.7}}>{ig}</sup>}
                            </div>
                            {mates.length>0 ? (
                              <div style={{fontSize:"0.58rem",color:isSel?theme:C.textSub,marginTop:3,lineHeight:1.4}}>
                                {mates.map((m,mi)=>{const mg=getGroup(m);return<span key={m}>{mi>0&&<span style={{margin:"0 2px",opacity:0.5}}>×</span>}{m.split(" ")[0]}{mg&&<sup style={{fontSize:"0.55em",fontWeight:700,marginLeft:"1px",opacity:0.7}}>{mg}</sup>}</span>;})}
                              </div>
                            ) : <div style={{fontSize:"0.56rem",color:C.textMuted,marginTop:3}}>No pairing</div>}
                          </div>
                        );
                      })}
                      <div onClick={()=>setShadowReplaceSelection(r=>({...r,[outName]:"__none__"}))}
                        style={{padding:"10px 8px",borderRadius:11,cursor:"pointer",textAlign:"center",
                          background:selected==="__none__"?C.surfaceEl:C.bg,border:`1px dashed ${selected==="__none__"?C.textSub:C.border}`}}>
                        <div style={{fontSize:"0.75rem",color:C.textMuted}}>No slot</div>
                      </div>
                    </div>
                  </div>
                );
              });
            })()}
            <div style={{display:"flex",gap:10,marginTop:4}}>
              <button onClick={()=>{setShadowReplaceStep(false);setShadowEditing(true);}} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Back</button>
              <button onClick={()=>applyShadowUpdate(pendingShadowForm,Object.fromEntries(Object.entries(shadowReplaceSelection).filter(([,v])=>v&&v!=="__none__")))} style={{flex:1,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Confirm</button>
            </div>
          </div>
        </div>
      )}

      {/* PIN */}
      {showPin&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(6px)"}} onClick={e=>e.target===e.currentTarget&&setShowPin(false)}>
          <div style={{width:"100%",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",boxShadow:"0 -4px 40px rgba(0,0,0,0.12)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 18px"}}/>
            <h3 style={{margin:"0 0 14px",color:C.text,fontWeight:600}}>Leader Login</h3>
            <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryPin()} placeholder="Enter PIN" autoFocus style={{...iS,width:"100%",boxSizing:"border-box",marginBottom:10,border:`1px solid ${pinError?C.red:C.border}`}}/>
            {pinError&&<div style={{color:C.red,fontSize:"0.78rem",marginBottom:10}}>Incorrect PIN</div>}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setShowPin(false);setPinInput("");}} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={tryPin} style={{flex:1,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Login</button>
            </div>
          </div>
        </div>
      )}

      {/* Reset */}
      {showReset&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,boxShadow:C.shadowMd}}>
            <h3 style={{margin:"0 0 8px",color:C.text,fontWeight:600}}>Start New Rotation?</h3>
            <p style={{margin:"0 0 18px",color:C.textSub,fontSize:"0.84rem"}}>Clears all patients. Cannot be undone.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowReset(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={async()=>{await save({...ward,patients:[]});setShowReset(false);showToast("Ward reset");}} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:700,fontFamily:SF}}>Reset</button>
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
          <div style={{background:"rgba(245,245,247,0.88)",borderBottom:`1px solid ${C.border}`,padding:"12px 18px",position:"sticky",top:0,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
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
            <SurgerySetupFields form={setupForm} setForm={setSetupForm}/>
            <button onClick={async()=>{
              const studs=(setupForm.students||[]).filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),group:s.group?.trim()||""}));
              const cons=(setupForm.consultants||[]).filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"}));
              const secs=(setupForm.wardSections||[]).filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),range:s.range?.trim()||""}));
              const specialBeds=(setupForm.specialBeds||[]).filter(b=>b.id?.trim()).map(b=>({id:b.id.trim(),section:b.section?.trim()||""}));
              const tags=(setupForm.customTags||[]).filter(t=>t.label?.trim()).map(t=>({label:t.label.trim(),color:t.color||"#6366f1"}));
              await save({...ward,setup:{...setup,wardName:setupForm.wardName,appointmentType:setupForm.appointmentType,themeColor:setupForm.themeColor,students:studs,consultants:cons,wardSections:secs,shadowHOs:setupForm.shadowHOs||setup.shadowHOs,customTags:tags,specialBeds}});
              setEditMode(false);showToast("Settings saved!");
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

function PaedWardView({ wardId, ward, onBack, saveWard, onDelete, showToast, seniorMode }) {
  const [activeTab, setActiveTab] = useState("ward");
  const [isLeader,  setIsLeader]  = useState(false);  const [pinInput,  setPinInput]  = useState("");
  const [pinError,  setPinError]  = useState(false);
  const [showPin,   setShowPin]   = useState(false);
  const [editMode,  setEditMode]  = useState(false);
  const [editForm,  setEditForm]  = useState({});
  const [showDelete,setShowDelete]= useState(false);
  const [selectedPt,setSelectedPt]= useState(null);
  const [showAddPt, setShowAddPt] = useState(false);
  const [newPt,     setNewPt]     = useState({name:"",ageYears:"",ageMonths:"",autoAssign:true});
  const [ptEdit,    setPtEdit]    = useState({consultant:"",diagnosis:"",notes:"",historyTaken:false,isNew:false,section:"",bedNo:"",opStatus:""});
  const [assignTarget, setAssignTarget] = useState(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [shadowEditing, setShadowEditing] = useState(false);
  const [shadowForm, setShadowForm] = useState(null);

  const setup    = ward.setup || {};
  const patients = ward.patients || [];
  const theme    = setup.themeColor || "#007aff";
  const rgb      = hexToRgb(theme);
  const groups   = setup.paedGroups || [];
  const sections = setup.wardSections || [];
  const shadowHOs= setup.shadowHOs || [{post:"Shadow HO 1",name:""},{post:"Shadow HO 2",name:""},{post:"Shadow HO 3",name:""}];
  const consultants = setup.consultants || [];

  const save = useCallback(async (newWard) => { await saveWard(newWard); }, [saveWard]);

  const tryPin = () => {
    if (isLeaderPin(pinInput, wardId)) { setIsLeader(true); setShowPin(false); setPinInput(""); showToast("Leader access granted"); }
    else { setPinError(true); setTimeout(()=>setPinError(false),1500); }
  };

  // ── Auto-assign logic ──────────────────────────────────────────────────────
  const computeAutoAssign = (existingPatients) => {
    const activeShadowHONames = (shadowHOs||[]).map(h=>h.name).filter(Boolean);
    const activeShadowHOSet   = new Set(activeShadowHONames);

    const g0 = groups[0] || {students:[]};
    const g1 = groups[1] || {students:[]};
    const g0students = (g0.students||[]).filter(s=>s.name && !activeShadowHOSet.has(s.name));
    const g1students = (g1.students||[]).filter(s=>s.name && !activeShadowHOSet.has(s.name));

    const countPrimary = (name) => existingPatients.filter(p=>p.primary1===name||p.primary2===name).length;
    const countShadow  = (name) => existingPatients.filter(p=>p.shadow===name).length;

    const pickFrom = (students, reversed) => {
      const ordered = reversed ? [...students].reverse() : students;
      const zero = ordered.find(s => countPrimary(s.name)===0);
      if (zero) return zero.name;
      return [...ordered].sort((a,b)=>countPrimary(a.name)-countPrimary(b.name))[0]?.name || null;
    };

    const p1 = pickFrom(g0students, false);
    const p2 = pickFrom(g1students, true);

    // Shadow: pick from active Shadow HOs only, fewest shadow assignments first
    const shadow = activeShadowHONames.length>0
      ? [...activeShadowHONames].sort((a,b)=>countShadow(a)-countShadow(b))[0]
      : null;

    return {primary1: p1||null, primary2: p2||null, shadow: shadow||null};
  };

  const addPatient = async () => {
    if (!newPt.name.trim()) { showToast("Enter patient name","error"); return; }
    const ageStr = [newPt.ageYears&&`${newPt.ageYears}y`, newPt.ageMonths&&`${newPt.ageMonths}m`].filter(Boolean).join(" ");
    const assignment = newPt.autoAssign
      ? computeAutoAssign(patients)
      : {primary1: newPt.manualP1||null, primary2: newPt.manualP2||null, shadow: newPt.manualShadow||null};
    const pt = { id:Date.now().toString(), name:newPt.name.trim(), age:ageStr, primary1:assignment.primary1, primary2:assignment.primary2, shadow:assignment.shadow, consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:true, section:"", bedNo:"", opStatus:"", addedAt:Date.now() };
    await save({ ...ward, patients:[...patients, pt] });
    setNewPt({name:"",ageYears:"",ageMonths:"",autoAssign:true}); setShowAddPt(false); showToast("Patient added");
  };

  const updatePatient = async (id, updates) => {
    await save({...ward, patients:patients.map(p => p.id===id ? {...p,...updates} : p)});
  };

  const removePatient = async (id) => {
    await save({...ward, patients:patients.filter(p=>p.id!==id)});
    setSelectedPt(null); setShowClearConfirm(false);
  };

  // ── Archive ────────────────────────────────────────────────────────────────
  const getWeekKey = (date=new Date()) => {
    const y=date.getFullYear(), start=new Date(y,0,1);
    return `${y}-W${String(Math.ceil(((date-start)/86400000+start.getDay()+1)/7)).padStart(2,"0")}`;
  };

  const archivePatient = async (id) => {
    const pt = patients.find(p=>p.id===id);
    if (!pt) return;
    const weekKey = getWeekKey();
    const archive = ward.archive||{};
    const weekArchive = archive[weekKey]||{};
    weekArchive[id] = { ...pt, archivedAt: new Date().toISOString() };
    await save({ ...ward, patients:patients.filter(p=>p.id!==id), archive:{ ...archive, [weekKey]:weekArchive } });
    setSelectedPt(null); setShowClearConfirm(false); showToast("Patient archived");
  };

  const deleteArchivedPatient = async (weekKey, id) => {
    const archive = { ...(ward.archive||{}) };
    const weekArchive = { ...(archive[weekKey]||{}) };
    delete weekArchive[id];
    if (Object.keys(weekArchive).length===0) delete archive[weekKey];
    else archive[weekKey] = weekArchive;
    await save({ ...ward, archive });
    showToast("Archived record deleted");
  };

  const restorePatient = async (weekKey, id) => {
    const archivedPt = (ward.archive||{})[weekKey]?.[id];
    if (!archivedPt) return;
    const { archivedAt, ...ptData } = archivedPt;
    const archive = { ...(ward.archive||{}) };
    const weekArchive = { ...(archive[weekKey]||{}) };
    delete weekArchive[id];
    if (Object.keys(weekArchive).length===0) delete archive[weekKey];
    else archive[weekKey] = weekArchive;
    await save({ ...ward, patients:[...patients, ptData], archive });
    showToast("Patient restored");
  };

  const saveShadowHOs = async (newHOs) => {
    await save({...ward, setup:{...setup, shadowHOs:newHOs}});
    setShadowEditing(false); showToast("Shadow HO posts updated");
  };

  const allStudents = groups.flatMap(g => (g.students||[]).filter(s=>s.name).map(s=>({...s,groupName:g.name,groupIdx:groups.indexOf(g)})));
  const sectionOrder = sections.map(s=>s.name);

  // Separate assigned (has section+bed) from unassigned
  const assignedPatients   = patients.filter(p=>p.section&&p.bedNo);
  const unassignedPatients = patients.filter(p=>!p.section||!p.bedNo);

  // Sort assigned by section order then bed number
  const sortedAssigned = [...assignedPatients].sort((a,b)=>{
    const si = sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section);
    return si!==0 ? si : parseInt(a.bedNo||0)-parseInt(b.bedNo||0);
  });

  const [sectionFilter, setSectionFilter] = useState("all");

  const filteredPatients = sectionFilter==="unassigned"
    ? unassignedPatients
    : sectionFilter==="all"
      ? [...unassignedPatients, ...sortedAssigned]
      : sortedAssigned.filter(p=>p.section===sectionFilter);

  const selPt = selectedPt ? patients.find(p=>p.id===selectedPt) : null;

  const openPt = (pt) => { setSelectedPt(pt.id); setPtEdit({name:pt.name||"",ageYears:pt.age?.match(/(\d+)y/)?.[1]||"",ageMonths:pt.age?.match(/(\d+)m/)?.[1]||"",consultant:pt.consultant||"",diagnosis:pt.diagnosis||"",notes:pt.notes||"",historyTaken:!!pt.historyTaken,isNew:!!pt.isNew,section:pt.section||"",bedNo:pt.bedNo||"",opStatus:pt.opStatus||""}); };

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
              <div style={{fontSize:"0.6rem",color:C.textMuted,marginTop:1,fontWeight:500,letterSpacing:"0.04em",textTransform:"uppercase"}}>Paediatrics</div>
            </div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {!seniorMode&&(isLeader
              ?<span style={{background:theme,color:"#fff",fontSize:"0.62rem",fontWeight:600,padding:"4px 10px",borderRadius:20}}>LEADER</span>
              :<button onClick={()=>setShowPin(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.surface,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:20,padding:"5px 12px",fontSize:"0.72rem",cursor:"pointer",fontFamily:SF,boxShadow:C.shadow}}><Icon name="key" size={12} color={C.textSub}/> Login</button>
            )}
            {seniorMode&&<span style={{fontSize:"0.62rem",fontWeight:600,color:"#007aff",background:"rgba(0,122,255,0.08)",border:"1px solid rgba(0,122,255,0.2)",borderRadius:20,padding:"4px 10px"}}>READ ONLY</span>}
            {isLeader&&!seniorMode&&<button onClick={()=>{
              setEditForm({
                wardName: setup.wardName||"",
                appointmentType: setup.appointmentType||"",
                themeColor: setup.themeColor||"#007aff",
                paedGroups: setup.paedGroups?.map(g=>({...g,students:(g.students||[]).map(s=>({...s}))})) || [{name:"Group A",students:[{name:"",no:""}]},{name:"Group B",students:[{name:"",no:""}]}],
                wardSections: (setup.wardSections||[{name:"General",count:""},{name:"HDU",count:""},{name:"NICU",count:""},{name:"NBU",count:""}]).map(s=>({...s})),
                shadowHOs: (setup.shadowHOs||[{post:"Shadow HO 1",name:""},{post:"Shadow HO 2",name:""},{post:"Shadow HO 3",name:""}]).map(h=>({...h})),
                consultants: (setup.consultants||[{name:"",color:"#6366f1"}]).map(c=>({...c})),
              });
              setEditMode(true);
            }} style={{display:"flex",alignItems:"center",justifyContent:"center",background:C.surface,border:`1px solid ${C.border}`,color:C.textMuted,borderRadius:50,width:32,height:32,cursor:"pointer",boxShadow:C.shadow}}><Icon name="settings" size={14} color={C.textMuted}/></button>}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{borderBottom:`1px solid ${C.border}`,background:"rgba(245,245,247,0.88)",position:"sticky",top:"53px",zIndex:49,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",padding:"0 16px"}}>
          {[{id:"ward",label:"Ward"},{id:"students",label:"Students"},{id:"archive",label:"Archive"}].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              style={{padding:"11px 16px",fontSize:"0.8rem",fontWeight:500,fontFamily:SF,background:"none",border:"none",cursor:"pointer",
                color:activeTab===t.id?theme:C.textMuted,
                borderBottom:activeTab===t.id?`2px solid ${theme}`:"2px solid transparent",
                marginBottom:"-1px",transition:"color 0.15s",letterSpacing:"-0.01em"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"16px 16px 100px"}}>
        {activeTab==="ward" && <>

          {/* Shadow HO Banner */}
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:14,padding:"12px 16px",marginBottom:16,boxShadow:C.shadow}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
              <span style={{fontSize:"0.65rem",fontWeight:600,color:C.textMuted,letterSpacing:"0.05em",textTransform:"uppercase"}}>Shadow HO Posts · 3-day rotation</span>
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

          {/* Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:16}}>
            {[
              {label:"Patients",  val:patients.length,      color:theme},
              {label:"Histories", val:`${patients.filter(p=>p.historyTaken).length}/${patients.filter(p=>p.name).length}`, color:C.green},
              {label:"New",       val:patients.filter(p=>p.isNew).length, color:C.red},
            ].map(s=>(
              <div key={s.label} style={{background:C.surface,border:"1px solid rgba(0,0,0,0.08)",borderRadius:14,padding:"12px 10px",textAlign:"center",boxShadow:"0 4px 14px rgba(0,0,0,0.07)"}}>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:s.color,letterSpacing:"-0.04em"}}>{s.val}</div>
                <div style={{fontSize:"0.6rem",color:C.textSub,marginTop:2,letterSpacing:"0.04em",textTransform:"uppercase",fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Section filter pills */}
          {sections.length>0 && (
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:16}}>
              {[
                {id:"all",      label:"All"},
                ...sections.map(s=>({id:s.name, label:s.name})),
                {id:"unassigned", label:`Unassigned${unassignedPatients.length>0?" ("+unassignedPatients.length+")":""}`},
              ].map(f=>(
                <button key={f.id} onClick={()=>setSectionFilter(f.id)}
                  style={{padding:"5px 12px",borderRadius:20,fontSize:"0.74rem",fontWeight:sectionFilter===f.id?600:400,cursor:"pointer",fontFamily:SF,
                    background:sectionFilter===f.id?(f.id==="unassigned"?C.textSub:theme):C.surface,
                    border:`1px solid ${sectionFilter===f.id?(f.id==="unassigned"?C.textSub:theme):C.border}`,
                    color:sectionFilter===f.id?"#fff":C.textSub}}>
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Add patient button */}
          {isLeader&&!seniorMode&&(
            <button onClick={()=>setShowAddPt(true)} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:"11px",fontSize:"0.84rem",marginBottom:16,background:C.surface,border:`1px solid ${C.border}`,color:theme,borderRadius:12,cursor:"pointer",fontFamily:SF,fontWeight:500,boxShadow:C.shadow}}>
              <Icon name="plus" size={14} color={theme}/> Add Patient
            </button>
          )}

          {/* Patient grid */}
          {filteredPatients.length===0
            ? <div style={{textAlign:"center",padding:"40px 20px",color:C.textMuted,fontSize:"0.85rem"}}>{patients.length===0?(isLeader?"No patients yet. Tap Add Patient to start.":"No patients yet."):"No patients in this section."}</div>
            : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10}}>
                {filteredPatients.map(pt=>{
                  const hasBed = pt.section&&pt.bedNo;
                  const isUnassigned = !hasBed;
                  const filled = pt.diagnosis||pt.consultant||pt.primary1||pt.primary2;
                  return (
                    <div key={pt.id}
                      onClick={seniorMode?undefined:()=>openPt(pt)}
                      style={{background:C.surface,border:pt.historyTaken?`1px solid rgba(${hexToRgb(C.green)},0.25)`:isUnassigned?`1px dashed ${C.borderMid}`:`1px solid rgba(0,0,0,${filled?0.1:0.07})`,borderRadius:14,padding:"12px 11px",cursor:seniorMode?"default":"pointer",position:"relative",boxShadow:filled?"0 6px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.05)":"0 2px 10px rgba(0,0,0,0.05)",transition:"transform 0.12s, box-shadow 0.12s",userSelect:"none"}}
                      onMouseEnter={e=>{if(!seniorMode){e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 28px rgba(0,0,0,0.11)";}}}
                      onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=filled?"0 6px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.05)":"0 2px 10px rgba(0,0,0,0.05)";}}
                    >
                      {/* Top-right flags */}
                      <div style={{position:"absolute",top:9,right:9,display:"flex",gap:4,alignItems:"center"}}>
                        {pt.historyTaken&&<Icon name="history" size={11} color={C.green}/>}
                        {pt.isNew&&<span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={10} color={C.red}/></span>}
                      </div>

                      {/* Bed label + number OR Unassigned */}
                      {hasBed ? (
                        <>
                          <div style={{fontSize:"0.55rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:1}}>{pt.section}</div>
                          <div style={{fontSize:"1.25rem",fontWeight:700,color:theme,lineHeight:1,letterSpacing:"-0.03em",marginBottom:4}}>
                            {String(pt.bedNo).padStart(2,"0")}
                          </div>
                        </>
                      ) : (
                        <div style={{fontSize:"0.58rem",color:C.textMuted,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:4}}>Unassigned</div>
                      )}

                      {/* Patient name + age — always visible, compact */}
                      <div style={{display:"flex",alignItems:"baseline",gap:4,marginBottom:3,flexWrap:"wrap"}}>
                        <span style={{fontSize:"0.78rem",fontWeight:700,color:C.text,lineHeight:1.2,wordBreak:"break-word"}}>{pt.name}</span>
                        {pt.age&&<span style={{fontSize:"0.6rem",color:C.textSub,flexShrink:0}}>{pt.age}</span>}
                      </div>

                      {/* Consultant */}
                      {pt.consultant&&<div style={{fontSize:"0.58rem",color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{pt.consultant}</div>}

                      {/* Diagnosis */}
                      {pt.diagnosis&&<div style={{fontSize:"0.62rem",color:C.text,fontStyle:"italic",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:2}}>{pt.diagnosis}</div>}

                      {/* Notes */}
                      {pt.notes&&<div style={{fontSize:"0.58rem",color:C.textMuted,lineHeight:1.35,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",marginBottom:3}}>{pt.notes}</div>}

                      {/* Student chips — compact */}
                      {(pt.primary1||pt.primary2||pt.shadow)&&(
                        <div style={{display:"flex",flexWrap:"wrap",gap:3,marginTop:4}}>
                          {pt.primary1&&(()=>{const s=allStudents.find(x=>x.name===pt.primary1);return<span style={{fontSize:"0.52rem",background:"rgba(99,102,241,0.1)",border:"1px solid rgba(99,102,241,0.22)",borderRadius:4,padding:"1px 5px",color:"#6366f1",fontWeight:600}}>{pt.primary1.split(" ")[0]}{s?.no&&<sup style={{fontSize:"0.42rem"}}>{s.no}</sup>}</span>;})()}
                          {pt.primary2&&(()=>{const s=allStudents.find(x=>x.name===pt.primary2);return<span style={{fontSize:"0.52rem",background:"rgba(249,115,22,0.1)",border:"1px solid rgba(249,115,22,0.22)",borderRadius:4,padding:"1px 5px",color:"#f97316",fontWeight:600}}>{pt.primary2.split(" ")[0]}{s?.no&&<sup style={{fontSize:"0.42rem"}}>{s.no}</sup>}</span>;})()}
                          {pt.shadow&&<span style={{fontSize:"0.52rem",background:"rgba(0,0,0,0.04)",border:"1px dashed rgba(0,0,0,0.14)",borderRadius:4,padding:"1px 5px",color:C.textMuted}}>{pt.shadow.split(" ")[0]}</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
          }
        </>}

        {activeTab==="students" && <PaedStudentTab patients={patients} groups={groups} theme={theme} rgb={rgb} onSelectPatient={pt=>{ setSelectedPt(pt.id); setPtEdit({name:pt.name||"",ageYears:pt.age?.match(/(\d+)y/)?.[1]||"",ageMonths:pt.age?.match(/(\d+)m/)?.[1]||"",consultant:pt.consultant||"",diagnosis:pt.diagnosis||"",notes:pt.notes||"",historyTaken:!!pt.historyTaken,isNew:!!pt.isNew,section:pt.section||"",bedNo:pt.bedNo||"",opStatus:pt.opStatus||""}); }}/>}

        {activeTab==="archive" && <PaedArchiveTab archive={ward.archive||{}} theme={theme} rgb={rgb} onRestore={restorePatient} onDelete={deleteArchivedPatient}/>}
      </div>

      {/* Patient detail sheet */}
      {selectedPt&&selPt&&!seniorMode&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:100,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>{if(e.target===e.currentTarget){setSelectedPt(null);setShowClearConfirm(false);}}}>
          <div style={{width:"100%",maxHeight:"88vh",overflowY:"auto",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",boxShadow:"0 -4px 40px rgba(0,0,0,0.12)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 20px"}}/>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:16}}>
              <div style={{flex:1,marginRight:12}}>
                <input value={ptEdit.name||""} onChange={e=>setPtEdit(b=>({...b,name:e.target.value}))}
                  style={{...iS,fontSize:"1.15rem",fontWeight:700,letterSpacing:"-0.02em",width:"100%",boxSizing:"border-box",padding:"6px 10px",marginBottom:6}}/>
                <div style={{display:"flex",gap:6,alignItems:"center"}}>
                  <input value={ptEdit.ageYears||""} onChange={e=>setPtEdit(b=>({...b,ageYears:e.target.value}))} type="number" min="0" max="17" placeholder="0"
                    style={{...iS,width:52,padding:"5px 8px",textAlign:"center",fontSize:"0.8rem"}}/>
                  <span style={{fontSize:"0.72rem",color:C.textMuted}}>y</span>
                  <input value={ptEdit.ageMonths||""} onChange={e=>setPtEdit(b=>({...b,ageMonths:e.target.value}))} type="number" min="0" max="11" placeholder="0"
                    style={{...iS,width:52,padding:"5px 8px",textAlign:"center",fontSize:"0.8rem"}}/>
                  <span style={{fontSize:"0.72rem",color:C.textMuted}}>m</span>
                </div>
              </div>
              <button onClick={()=>{setSelectedPt(null);setShowClearConfirm(false);}} style={{background:C.surfaceEl,border:"none",borderRadius:50,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginTop:4,flexShrink:0}}>
                <Icon name="close" size={13} color={C.textSub}/>
              </button>
            </div>

            {isLeader&&<div style={{display:"flex",gap:8,marginBottom:14}}>
              <button onClick={()=>setAssignTarget(selPt.id)} style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"10px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF,fontWeight:600}}>
                <Icon name="user" size={12} color="#fff"/> Assign Students
              </button>
            </div>}

            {/* New patient toggle */}
            <div onClick={()=>{ const v=!ptEdit.isNew; setPtEdit(b=>({...b,isNew:v})); updatePatient(selPt.id,{isNew:v}); }}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:ptEdit.isNew?`rgba(${hexToRgb(C.red)},0.06)`:C.surfaceEl,border:`1px solid ${ptEdit.isNew?`rgba(${hexToRgb(C.red)},0.3)`:C.border}`,borderRadius:12,cursor:"pointer",marginBottom:8,userSelect:"none"}}>
              <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${ptEdit.isNew?C.red:C.borderMid}`,background:ptEdit.isNew?C.red:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {ptEdit.isNew&&<Icon name="check" size={11} color="#fff"/>}
              </div>
              <span style={{fontSize:"0.86rem",color:ptEdit.isNew?C.red:C.text,fontWeight:500}}>New Patient</span>
              <div style={{marginLeft:"auto"}}><Icon name="newdot" size={13} color={ptEdit.isNew?C.red:C.textMuted}/></div>
            </div>

            {/* History taken */}
            <div onClick={()=>{ const v=!ptEdit.historyTaken; setPtEdit(b=>({...b,historyTaken:v,isNew:v?false:b.isNew})); updatePatient(selPt.id,{historyTaken:v,isNew:v?false:selPt.isNew}); }}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:ptEdit.historyTaken?`rgba(${hexToRgb(C.green)},0.07)`:C.surfaceEl,border:`1px solid ${ptEdit.historyTaken?`rgba(${hexToRgb(C.green)},0.3)`:C.border}`,borderRadius:12,cursor:"pointer",marginBottom:14,userSelect:"none"}}>
              <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${ptEdit.historyTaken?C.green:C.borderMid}`,background:ptEdit.historyTaken?C.green:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                {ptEdit.historyTaken&&<Icon name="check" size={11} color="#fff"/>}
              </div>
              <span style={{fontSize:"0.86rem",color:ptEdit.historyTaken?C.green:C.text,fontWeight:500}}>History Taken</span>
              <div style={{marginLeft:"auto"}}><Icon name="history" size={13} color={ptEdit.historyTaken?C.green:C.textMuted}/></div>
            </div>

            {/* Bed */}
            <div style={{marginBottom:14}}>
              <label style={labelStyle}>Bed Location</label>
              <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                {sections.map(sec=>(
                  <button key={sec.name} onClick={()=>setPtEdit(b=>({...b,section:b.section===sec.name?"":sec.name,bedNo:b.section===sec.name?"":b.bedNo}))}
                    style={{background:ptEdit.section===sec.name?theme:C.surfaceEl,border:`1px solid ${ptEdit.section===sec.name?theme:C.border}`,color:ptEdit.section===sec.name?"#fff":C.textSub,borderRadius:8,padding:"6px 12px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF}}>
                    {sec.name}{(sec.range||sec.count)&&<span style={{fontSize:"0.62rem",opacity:0.7,marginLeft:4}}>{sec.range||sec.count}</span>}
                  </button>
                ))}
              </div>
              {ptEdit.section&&(()=>{
                const sec = sections.find(s=>s.name===ptEdit.section);
                const rangeStr = sec?.range || (sec?.count ? `1-${sec.count}` : "");
                const [start,end] = rangeStr.includes("-") ? rangeStr.split("-").map(Number) : [1, parseInt(rangeStr)||0];
                const bedNums = [];
                for (let n=start;n<=end;n++) bedNums.push(n);
                return bedNums.length>0 ? (
                  <div style={{marginTop:8,display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{fontSize:"0.82rem",color:C.textSub,fontWeight:500}}>{ptEdit.section} — Bed</span>
                    <select value={ptEdit.bedNo} onChange={e=>setPtEdit(b=>({...b,bedNo:e.target.value}))} style={{...iS,padding:"6px 10px",fontSize:"0.82rem"}}>
                      <option value="">Select</option>
                      {bedNums.map(n=><option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Consultant */}
            <div style={{marginBottom:14}}>
              <label style={labelStyle}>Consultant</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                {consultants.length>0
                  ?consultants.map((c,i)=>{ const cN=typeof c==="object"?c.name:c; const cC=typeof c==="object"?c.color:"#6366f1"; const act=ptEdit.consultant===cN;
                    return <button key={i} onClick={()=>setPtEdit(b=>({...b,consultant:b.consultant===cN?"":cN}))}
                      style={{display:"flex",alignItems:"center",gap:7,background:act?`rgba(${hexToRgb(cC)},0.12)`:C.surfaceEl,border:`1px solid ${act?cC:C.border}`,color:act?cC:C.textSub,borderRadius:8,padding:"7px 13px",fontSize:"0.8rem",cursor:"pointer",fontFamily:SF,fontWeight:act?600:400}}>
                      <div style={{width:8,height:8,borderRadius:"50%",background:cC}}/>{cN}
                    </button>; })
                  :<input value={ptEdit.consultant} onChange={e=>setPtEdit(b=>({...b,consultant:e.target.value}))} placeholder="Consultant name" style={{...iS,width:"100%",boxSizing:"border-box"}}/>
                }
              </div>
            </div>

            <div style={{marginBottom:14}}>
              <label style={labelStyle}>Diagnosis</label>
              <input value={ptEdit.diagnosis} onChange={e=>{ const v=e.target.value; setPtEdit(b=>({...b,diagnosis:v,isNew:v?false:b.isNew})); if(e.target.value) updatePatient(selPt.id,{isNew:false}); }} placeholder="Working diagnosis…" style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box"}}/>
            </div>
            <div style={{marginBottom:20}}>
              <label style={labelStyle}>Notes</label>
              <textarea value={ptEdit.notes} onChange={e=>{ const v=e.target.value; setPtEdit(b=>({...b,notes:v,isNew:v?false:b.isNew})); if(e.target.value) updatePatient(selPt.id,{isNew:false}); }} rows={3} placeholder="Clinical notes…" style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:SF}}/>
            </div>

            <button onClick={async()=>{
              const ageStr=[ptEdit.ageYears&&`${ptEdit.ageYears}y`,ptEdit.ageMonths&&`${ptEdit.ageMonths}m`].filter(Boolean).join(" ");
              await updatePatient(selPt.id,{...ptEdit,name:ptEdit.name||selPt.name,age:ageStr||selPt.age}); setSelectedPt(null);
            }}
              style={{background:theme,border:"none",color:"#fff",borderRadius:13,cursor:"pointer",fontWeight:600,fontFamily:SF,fontSize:"0.95rem",width:"100%",padding:"14px",boxShadow:`0 4px 14px rgba(${rgb},0.3)`}}>
              Save
            </button>

            {!showClearConfirm
              ?<div style={{display:"flex",gap:8,marginTop:10}}>
                  <button onClick={()=>archivePatient(selPt.id)} style={{flex:1,background:`rgba(${hexToRgb("#f97316")},0.07)`,border:"1px solid rgba(249,115,22,0.3)",color:"#c2410c",borderRadius:12,padding:"11px",fontSize:"0.82rem",cursor:"pointer",fontFamily:SF}}>Archive</button>
                  <button onClick={()=>setShowClearConfirm(true)} style={{flex:1,background:`rgba(${hexToRgb(C.red)},0.06)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,color:C.red,borderRadius:12,padding:"11px",fontSize:"0.82rem",cursor:"pointer",fontFamily:SF}}>Delete</button>
                </div>
              :<div style={{marginTop:10,background:`rgba(${hexToRgb(C.red)},0.05)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,borderRadius:13,padding:"14px"}}>
                <p style={{margin:"0 0 12px",fontSize:"0.82rem",color:C.textSub,textAlign:"center"}}>Permanently delete {selPt.name}? This cannot be undone.</p>
                <div style={{display:"flex",gap:8}}>
                  <button onClick={()=>setShowClearConfirm(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"10px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
                  <button onClick={()=>removePatient(selPt.id)} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"10px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Delete</button>
                </div>
              </div>
            }
          </div>
        </div>
      )}

      {/* Add patient modal */}
      {showAddPt&&(()=>{
        const preview = newPt.autoAssign ? computeAutoAssign(patients) : null;
        return (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,borderRadius:"20px 20px 0 0",padding:"10px 22px 44px",width:"100%",boxShadow:C.shadowMd,maxHeight:"90vh",overflowY:"auto"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 20px"}}/>
            <h3 style={{margin:"0 0 16px",color:C.text,fontWeight:600}}>Add Patient</h3>

            {/* Name */}
            <div style={{marginBottom:14}}>
              <label style={labelStyle}>Patient Name</label>
              <input value={newPt.name} onChange={e=>setNewPt(p=>({...p,name:e.target.value}))} placeholder="Full name" style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}/>
            </div>

            {/* Age — years + months */}
            <div style={{marginBottom:14}}>
              <label style={labelStyle}>Age</label>
              <div style={{display:"flex",gap:8,marginTop:6}}>
                <div style={{flex:1}}>
                  <input type="number" min="0" max="17" value={newPt.ageYears} onChange={e=>setNewPt(p=>({...p,ageYears:e.target.value}))} placeholder="0" style={{...iS,width:"100%",boxSizing:"border-box",textAlign:"center"}}/>
                  <div style={{fontSize:"0.65rem",color:C.textMuted,textAlign:"center",marginTop:3}}>Years</div>
                </div>
                <div style={{flex:1}}>
                  <input type="number" min="0" max="11" value={newPt.ageMonths} onChange={e=>setNewPt(p=>({...p,ageMonths:e.target.value}))} placeholder="0" style={{...iS,width:"100%",boxSizing:"border-box",textAlign:"center"}}/>
                  <div style={{fontSize:"0.65rem",color:C.textMuted,textAlign:"center",marginTop:3}}>Months</div>
                </div>
              </div>
            </div>

            {/* Auto-assign toggle */}
            <div onClick={()=>setNewPt(p=>({...p,autoAssign:!p.autoAssign}))}
              style={{display:"flex",alignItems:"center",gap:12,padding:"12px 14px",background:newPt.autoAssign?`rgba(${rgb},0.06)`:C.surfaceEl,border:`1px solid ${newPt.autoAssign?`rgba(${rgb},0.3)`:C.border}`,borderRadius:12,cursor:"pointer",marginBottom:14,userSelect:"none"}}>
              <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${newPt.autoAssign?theme:C.borderMid}`,background:newPt.autoAssign?theme:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                {newPt.autoAssign&&<Icon name="check" size={12} color="#fff"/>}
              </div>
              <div>
                <div style={{fontSize:"0.88rem",color:newPt.autoAssign?theme:C.text,fontWeight:500}}>Auto-assign students</div>
                <div style={{fontSize:"0.7rem",color:C.textMuted,marginTop:1}}>Fair rotation · excludes active Shadow HOs</div>
              </div>
            </div>

            {/* Assignment preview */}
            {newPt.autoAssign && preview && (
              <div style={{background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:12,padding:"12px 14px",marginBottom:14}}>
                <div style={{fontSize:"0.65rem",color:C.textMuted,letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:500,marginBottom:8}}>Assignment Preview</div>
                <div style={{display:"flex",flexDirection:"column",gap:5}}>
                  {[[preview.primary1,"#6366f1",(groups[0]||{}).name||"Group A","Primary"],[preview.primary2,"#f97316",(groups[1]||{}).name||"Group B","Primary"],[preview.shadow,C.textSub,"Shadow","Shadow"]].map(([name,col,grp,role])=>(
                    <div key={role} style={{display:"flex",alignItems:"center",gap:8}}>
                      <span style={{fontSize:"0.65rem",color:col,fontWeight:600,width:52}}>{role}</span>
                      <span style={{fontSize:"0.78rem",color:name?C.text:C.textMuted,flex:1}}>{name||"—"}</span>
                      {name&&<span style={{fontSize:"0.6rem",color:C.textMuted}}>{grp}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Manual assign inline */}
            {!newPt.autoAssign && (
              <InlineAssignPicker
                groups={groups}
                allStudents={allStudents}
                patients={patients}
                shadowHOs={shadowHOs}
                value={{p1:newPt.manualP1||null, p2:newPt.manualP2||null, shadow:newPt.manualShadow||null}}
                onChange={(p1,p2,shadow)=>setNewPt(p=>({...p,manualP1:p1,manualP2:p2,manualShadow:shadow}))}
                theme={theme} rgb={rgb}
              />
            )}

            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>{setShowAddPt(false);setNewPt({name:"",ageYears:"",ageMonths:"",autoAssign:true,manualP1:null,manualP2:null,manualShadow:null});}} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={addPatient} style={{flex:2,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Add Patient</button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Paed Assign modal */}
      {assignTarget&&(
        <PaedAssignModal patient={patients.find(p=>p.id===assignTarget)} groups={groups} allStudents={allStudents} theme={theme} rgb={rgb} patients={patients} shadowHOs={shadowHOs}
          onConfirm={async(p1,p2,sh)=>{ await updatePatient(assignTarget,{primary1:p1,primary2:p2,shadow:sh}); setAssignTarget(null); showToast("Assigned"); }}
          onClose={()=>setAssignTarget(null)}/>
      )}

      {/* Shadow HO edit */}
      {shadowEditing&&shadowForm&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,borderRadius:20,padding:"26px 22px",width:"100%",maxWidth:380,boxShadow:C.shadowMd,border:`1px solid ${C.border}`}}>
            <h3 style={{margin:"0 0 14px",color:C.text,fontWeight:600}}>Shadow HO Posts</h3>
            {shadowForm.map((ho,i)=>(
              <div key={i} style={{marginBottom:14}}>
                <label style={labelStyle}>{ho.post}</label>
                <select value={ho.name} onChange={e=>setShadowForm(f=>{const a=[...f];a[i]={...a[i],name:e.target.value};return a;})}
                  style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}>
                  <option value="">— Unassigned —</option>
                  {allStudents.map(s=>(
                    <option key={s.name+s.groupName} value={s.name}>
                      {s.no ? `${s.no} · ` : ""}{s.name} ({s.groupName})
                    </option>
                  ))}
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

      {/* PIN modal */}
      {showPin&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,boxShadow:C.shadowMd}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}><Icon name="key" size={16} color={theme}/><h3 style={{margin:0,color:C.text,fontWeight:600}}>Leader Access</h3></div>
            <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryPin()} placeholder="PIN"
              style={{...iS,width:"100%",boxSizing:"border-box",textAlign:"center",letterSpacing:"0.2em",marginTop:12,borderColor:pinError?C.red:undefined}}/>
            {pinError&&<div style={{color:C.red,fontSize:"0.78rem",textAlign:"center",marginTop:6}}>Incorrect PIN</div>}
            <div style={{display:"flex",gap:10,marginTop:14}}>
              <button onClick={()=>{setShowPin(false);setPinInput("");}} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={tryPin} style={{flex:1,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Unlock</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {showDelete&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.3)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,border:`1px solid ${C.red}`,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,boxShadow:C.shadowMd}}>
            <h3 style={{margin:"0 0 8px",color:C.red,fontWeight:700}}>Delete Ward?</h3>
            <p style={{margin:"0 0 18px",color:C.textSub,fontSize:"0.82rem"}}>Permanently removes this ward and all patient data.</p>
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
            {/* Basic fields */}
            <div style={{marginBottom:18}}><label style={labelStyle}>Ward Name</label><input value={editForm.wardName} onChange={e=>setEditForm(f=>({...f,wardName:e.target.value}))} style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}/></div>
            <div style={{marginBottom:18}}><label style={labelStyle}>Rotation</label><input value={editForm.appointmentType} onChange={e=>setEditForm(f=>({...f,appointmentType:e.target.value}))} style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}/></div>
            <div style={{marginBottom:22}}>
              <label style={labelStyle}>Accent Colour</label>
              <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",boxShadow:C.shadow}}>
                <input type="color" value={editForm.themeColor} onChange={e=>setEditForm(f=>({...f,themeColor:e.target.value}))} style={{width:40,height:40,border:"none",borderRadius:8,cursor:"pointer",padding:0}}/>
                <div style={{flex:1,height:8,borderRadius:4,background:`linear-gradient(90deg,${C.surfaceEl},${editForm.themeColor})`}}/>
                <span style={{fontSize:"0.75rem",color:C.textMuted,fontFamily:"monospace"}}>{editForm.themeColor}</span>
              </div>
            </div>
            {/* Full paed fields */}
            <PaedSetupFields form={editForm} setForm={setEditForm}/>
            <button onClick={async()=>{
              await save({...ward, setup:{...setup,
                wardName:editForm.wardName, appointmentType:editForm.appointmentType, themeColor:editForm.themeColor,
                paedGroups:editForm.paedGroups||setup.paedGroups,
                wardSections:editForm.wardSections||setup.wardSections,
                shadowHOs:editForm.shadowHOs||setup.shadowHOs,
                consultants:editForm.consultants||setup.consultants,
              }});
              setEditMode(false); showToast("Settings saved!");
            }} style={{background:theme,border:"none",color:"#fff",borderRadius:12,cursor:"pointer",fontWeight:600,fontFamily:SF,fontSize:"0.95rem",width:"100%",padding:"14px",marginBottom:12}}>
              Save Changes
            </button>
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

// ── Paed Archive Tab ───────────────────────────────────────────────────────────
function PaedArchiveTab({ archive, theme, rgb, onRestore, onDelete }) {
  const weeks = Object.keys(archive||{}).sort().reverse();
  const [selectedWeek, setSelectedWeek] = useState(weeks[0]||"");
  const [expanded,     setExpanded]     = useState({});
  const [confirmDelete,setConfirmDelete]= useState(null);

  if (weeks.length===0) return (
    <div style={{textAlign:"center",padding:"60px 20px",color:C.textMuted,fontSize:"0.85rem",fontFamily:SF}}>
      No archived patients yet. Use the Archive button in the patient detail sheet.
    </div>
  );

  const weekData = archive[selectedWeek]||{};
  const archivedIds = Object.keys(weekData).sort((a,b)=>(weekData[a].addedAt||0)-(weekData[b].addedAt||0));

  const formatWeek = (wk) => {
    const [yr,wNum] = wk.split("-W");
    return `Week ${parseInt(wNum)}, ${yr}`;
  };

  return (
    <div>
      <div style={{marginBottom:18}}>
        <label style={labelStyle}>Select Week</label>
        <select value={selectedWeek} onChange={e=>{setSelectedWeek(e.target.value);setExpanded({});setConfirmDelete(null);}}
          style={{...iS,width:"100%",boxSizing:"border-box",marginTop:6}}>
          {weeks.map(w=><option key={w} value={w}>{formatWeek(w)}</option>)}
        </select>
      </div>

      {archivedIds.length===0
        ? <div style={{textAlign:"center",padding:"30px",color:C.textMuted,fontSize:"0.85rem"}}>No patients archived this week.</div>
        : <div style={{display:"flex",flexDirection:"column",gap:10}}>
            {archivedIds.map(id=>{
              const pt = weekData[id];
              const isOpen = !!expanded[id];
              return (
                <div key={id} style={{background:C.surface,border:"1px solid rgba(0,0,0,0.08)",borderRadius:14,boxShadow:"0 4px 14px rgba(0,0,0,0.06)",overflow:"hidden"}}>
                  {/* Collapsed header */}
                  <div onClick={()=>setExpanded(e=>({...e,[id]:!e[id]}))} style={{display:"flex",alignItems:"center",padding:"13px 14px",cursor:"pointer",userSelect:"none",gap:10}}>
                    <div style={{flex:1}}>
                      <div style={{display:"flex",alignItems:"center",gap:8}}>
                        <span style={{fontSize:"1rem",fontWeight:700,color:C.text,letterSpacing:"-0.02em"}}>{pt.name}</span>
                        {pt.age&&<span style={{fontSize:"0.72rem",color:C.textSub}}>{pt.age}</span>}
                        {pt.diagnosis&&<span style={{fontSize:"0.7rem",color:C.text,fontStyle:"italic",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:120}}>{pt.diagnosis}</span>}
                      </div>
                      <div style={{fontSize:"0.62rem",color:C.textMuted,marginTop:2}}>
                        {pt.archivedAt ? new Date(pt.archivedAt).toLocaleDateString() : "Archived"}
                        {pt.consultant&&` · ${pt.consultant}`}
                      </div>
                    </div>
                    <div style={{display:"flex",gap:5,alignItems:"center"}}>
                      {pt.historyTaken&&<Icon name="history" size={11} color={C.green}/>}
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)"}}>
                        <path d="M2 4l4 4 4-4" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </div>
                  </div>

                  {/* Expanded */}
                  {isOpen && (
                    <div style={{borderTop:`1px solid ${C.border}`,padding:"12px 14px 14px",background:C.surfaceEl}}>
                      {pt.diagnosis&&<div style={{fontSize:"0.78rem",color:C.text,fontStyle:"italic",marginBottom:4,fontWeight:500}}>{pt.diagnosis}</div>}
                      {pt.consultant&&<div style={{fontSize:"0.72rem",color:C.textSub,marginBottom:4}}>{pt.consultant}</div>}
                      {pt.notes&&<div style={{fontSize:"0.7rem",color:C.textMuted,marginBottom:8,lineHeight:1.4}}>{pt.notes}</div>}
                      {(pt.primary1||pt.primary2||pt.shadow)&&(
                        <div style={{display:"flex",flexWrap:"wrap",gap:5,marginBottom:10}}>
                          {pt.primary1&&<span style={{fontSize:"0.65rem",background:"rgba(99,102,241,0.08)",border:"1px solid rgba(99,102,241,0.2)",borderRadius:6,padding:"2px 8px",color:"#6366f1",fontWeight:500}}>{pt.primary1}</span>}
                          {pt.primary2&&<span style={{fontSize:"0.65rem",background:"rgba(249,115,22,0.08)",border:"1px solid rgba(249,115,22,0.2)",borderRadius:6,padding:"2px 8px",color:"#f97316",fontWeight:500}}>{pt.primary2}</span>}
                          {pt.shadow&&<span style={{fontSize:"0.65rem",background:"rgba(0,0,0,0.03)",border:"1px dashed rgba(0,0,0,0.15)",borderRadius:6,padding:"2px 8px",color:C.textMuted}}>{pt.shadow}</span>}
                        </div>
                      )}
                      {pt.section&&pt.bedNo&&(
                        <div style={{display:"inline-flex",alignItems:"center",gap:0,borderRadius:6,overflow:"hidden",border:`1px solid rgba(${rgb},0.2)`,marginBottom:10}}>
                          <span style={{fontSize:"0.6rem",fontWeight:600,background:`rgba(${rgb},0.1)`,color:theme,padding:"2px 6px"}}>{pt.section}</span>
                          <span style={{fontSize:"0.6rem",fontWeight:500,color:C.textSub,padding:"2px 6px",background:C.surface}}>Bed {String(pt.bedNo).padStart(2,"0")}</span>
                        </div>
                      )}

                      {confirmDelete===id
                        ? <div style={{background:`rgba(${hexToRgb(C.red)},0.05)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,borderRadius:10,padding:"12px"}}>
                            <p style={{margin:"0 0 10px",fontSize:"0.8rem",color:C.textSub,textAlign:"center"}}>Delete this archived record permanently?</p>
                            <div style={{display:"flex",gap:8}}>
                              <button onClick={()=>setConfirmDelete(null)} style={{flex:1,background:C.surface,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:9,padding:"9px",cursor:"pointer",fontFamily:SF,fontSize:"0.8rem"}}>Cancel</button>
                              <button onClick={()=>{onDelete(selectedWeek,id);setConfirmDelete(null);}}
                                style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:9,padding:"9px",cursor:"pointer",fontWeight:600,fontFamily:SF,fontSize:"0.8rem"}}>Delete</button>
                            </div>
                          </div>
                        : <div style={{display:"flex",gap:8}}>
                            <button onClick={()=>onRestore(selectedWeek,id)}
                              style={{flex:2,padding:"9px",borderRadius:10,fontSize:"0.8rem",cursor:"pointer",fontFamily:SF,fontWeight:500,
                                background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.25)`,color:theme}}>
                              Restore Patient
                            </button>
                            <button onClick={()=>setConfirmDelete(id)}
                              style={{flex:1,padding:"9px",borderRadius:10,fontSize:"0.8rem",cursor:"pointer",fontFamily:SF,
                                background:`rgba(${hexToRgb(C.red)},0.06)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,color:C.red}}>
                              Delete
                            </button>
                          </div>
                      }
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

// ── Paed Student Tab ───────────────────────────────────────────────────────────
function PaedStudentTab({ patients, groups, theme, rgb, onSelectPatient }) {
  const [selected,  setSelected]  = useState(null);
  const [activeGrp, setActiveGrp] = useState("all");

  const allStudents = groups.flatMap(g =>
    (g.students||[]).filter(s=>s.name).map(s=>({...s, groupName:g.name, groupIdx:groups.indexOf(g)}))
  );

  const getStudentPatients = (name) => ({
    primary: patients.filter(p => p.primary1===name || p.primary2===name),
    shadow:  patients.filter(p => p.shadow===name),
  });

  const sorted = [...allStudents].sort((a,b) => {
    const {primary: ap, shadow: as_} = getStudentPatients(a.name);
    const {primary: bp, shadow: bs_} = getStudentPatients(b.name);
    const aTotal = ap.length + as_.length;
    const bTotal = bp.length + bs_.length;
    if (bTotal !== aTotal) return bTotal - aTotal;           // most patients first
    if (a.groupIdx !== b.groupIdx) return a.groupIdx - b.groupIdx; // then group order
    return a.name.localeCompare(b.name);
  });

  const filtered = activeGrp==="all" ? sorted : sorted.filter(s=>s.groupName===activeGrp);

  const groupColors = ["#6366f1","#f97316"];
  const tabOptions = [{id:"all",label:"All"}, ...groups.map((g,i)=>({id:g.name,label:g.name,color:groupColors[i]}))];

  if (allStudents.length===0) return (
    <div style={{textAlign:"center",padding:"60px 20px",color:C.textMuted,fontSize:"0.85rem"}}>No students added in setup.</div>
  );

  return (
    <div>
      {/* Group sub-tabs */}
      <div style={{display:"flex",gap:6,marginBottom:14,borderBottom:`1px solid ${C.border}`,paddingBottom:0}}>
        {tabOptions.map(t=>(
          <button key={t.id} onClick={()=>{setActiveGrp(t.id);setSelected(null);}}
            style={{padding:"8px 14px",fontSize:"0.78rem",fontWeight:activeGrp===t.id?600:400,fontFamily:SF,
              background:"none",border:"none",cursor:"pointer",
              color:activeGrp===t.id?(t.color||theme):C.textMuted,
              borderBottom:activeGrp===t.id?`2px solid ${t.color||theme}`:"2px solid transparent",
              marginBottom:"-1px",transition:"color 0.15s"}}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8}}>
        {filtered.map(s => {
        const {primary, shadow} = getStudentPatients(s.name);
        const total = primary.length + shadow.length;
        const isOpen = selected===s.name;
        const gc = groupColors[s.groupIdx] || theme;

        return (
          <div key={s.name}>
            <div onClick={()=>setSelected(isOpen?null:s.name)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"13px 14px",background:C.surface,
                border:`1px solid ${isOpen?`rgba(${hexToRgb(gc)},0.35)`:"rgba(0,0,0,0.08)"}`,
                borderRadius:isOpen?"14px 14px 0 0":14,cursor:"pointer",userSelect:"none",
                boxShadow:isOpen?"none":"0 4px 14px rgba(0,0,0,0.07)",transition:"all 0.15s"}}>
              {s.no && <span style={{fontSize:"0.58rem",color:C.textMuted,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:5,padding:"2px 6px",fontFamily:"monospace",flexShrink:0}}>{s.no}</span>}
              <div style={{width:8,height:8,borderRadius:"50%",background:gc,flexShrink:0}}/>
              <span style={{flex:1,fontSize:"0.9rem",color:C.text,fontWeight:isOpen?600:400}}>{s.name}</span>
              <span style={{fontSize:"0.68rem",color:C.textMuted,marginRight:4}}>{s.groupName}</span>
              {/* Patient count chips */}
              <div style={{display:"flex",gap:4}}>
                {primary.length>0 && <span style={{fontSize:"0.65rem",fontWeight:600,background:`rgba(${hexToRgb(gc)},0.1)`,border:`1px solid rgba(${hexToRgb(gc)},0.25)`,color:gc,borderRadius:6,padding:"2px 7px"}}>{primary.length}</span>}
                {shadow.length>0  && <span style={{fontSize:"0.65rem",background:"rgba(0,0,0,0.04)",border:"1px dashed rgba(0,0,0,0.15)",color:C.textMuted,borderRadius:6,padding:"2px 7px"}}>{shadow.length}s</span>}
                {total===0 && <span style={{fontSize:"0.65rem",color:C.textMuted}}>—</span>}
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)",flexShrink:0,marginLeft:4}}>
                <path d="M2 4l4 4 4-4" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>

            {isOpen && (
              <div style={{background:C.surfaceEl,border:`1px solid rgba(${hexToRgb(gc)},0.2)`,borderTop:"none",borderRadius:"0 0 14px 14px",padding:"12px 14px 14px"}}>
                {total===0
                  ? <div style={{color:C.textMuted,fontSize:"0.8rem",textAlign:"center",padding:"10px 0"}}>No patients assigned yet</div>
                  : <>
                      {primary.length>0 && <>
                        <div style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500,marginBottom:8}}>Primary</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8,marginBottom:shadow.length>0?12:0}}>
                          {primary.map(pt=>{
                            const hasBed = pt.section&&pt.bedNo;
                            const filled = pt.diagnosis||pt.consultant;
                            return (
                              <div key={pt.id} onClick={()=>onSelectPatient&&onSelectPatient(pt)}
                                style={{background:C.surface,border:pt.historyTaken?`1px solid rgba(${hexToRgb(C.green)},0.25)`:`1px solid rgba(${hexToRgb(gc)},0.2)`,borderRadius:12,padding:"10px 10px",cursor:onSelectPatient?"pointer":"default",position:"relative",boxShadow:filled?"0 4px 14px rgba(0,0,0,0.07)":"0 2px 8px rgba(0,0,0,0.05)",transition:"transform 0.12s,box-shadow 0.12s",userSelect:"none"}}
                                onMouseEnter={e=>{if(onSelectPatient){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,0.1)";}}}
                                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=filled?"0 4px 14px rgba(0,0,0,0.07)":"0 2px 8px rgba(0,0,0,0.05)";}}>
                                <div style={{position:"absolute",top:7,right:7,display:"flex",gap:3,alignItems:"center"}}>
                                  {pt.historyTaken&&<Icon name="history" size={10} color={C.green}/>}
                                  {pt.isNew&&<span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={9} color={C.red}/></span>}
                                </div>
                                {hasBed ? (
                                  <>
                                    <div style={{fontSize:"0.52rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:1}}>{pt.section}</div>
                                    <div style={{fontSize:"1.1rem",fontWeight:700,color:gc,lineHeight:1,letterSpacing:"-0.03em",marginBottom:3}}>{String(pt.bedNo).padStart(2,"0")}</div>
                                  </>
                                ) : (
                                  <div style={{fontSize:"0.52rem",color:C.textMuted,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:3}}>Unassigned</div>
                                )}
                                <div style={{display:"flex",alignItems:"baseline",gap:3,marginBottom:2,flexWrap:"wrap"}}>
                                  <span style={{fontSize:"0.75rem",fontWeight:700,color:C.text,lineHeight:1.2,wordBreak:"break-word"}}>{pt.name}</span>
                                  {pt.age&&<span style={{fontSize:"0.58rem",color:C.textSub,flexShrink:0}}>{pt.age}</span>}
                                </div>
                                {pt.consultant&&<div style={{fontSize:"0.56rem",color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:1}}>{pt.consultant}</div>}
                                {pt.diagnosis&&<div style={{fontSize:"0.58rem",color:C.text,fontStyle:"italic",fontWeight:500,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.diagnosis}</div>}
                                {pt.notes&&<div style={{fontSize:"0.55rem",color:C.textMuted,lineHeight:1.3,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden",marginTop:2}}>{pt.notes}</div>}
                              </div>
                            );
                          })}
                        </div>
                      </>}
                      {shadow.length>0 && <>
                        <div style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500,marginBottom:8,marginTop:primary.length>0?4:0}}>Shadow</div>
                        <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(130px,1fr))",gap:8}}>
                          {shadow.map(pt=>{
                            const hasBed = pt.section&&pt.bedNo;
                            return (
                              <div key={pt.id} onClick={()=>onSelectPatient&&onSelectPatient(pt)}
                                style={{background:C.surface,border:`1px dashed ${C.borderMid}`,borderRadius:12,padding:"10px 10px",cursor:onSelectPatient?"pointer":"default",position:"relative",boxShadow:"0 2px 8px rgba(0,0,0,0.05)",transition:"transform 0.12s,box-shadow 0.12s",userSelect:"none"}}
                                onMouseEnter={e=>{if(onSelectPatient){e.currentTarget.style.transform="translateY(-2px)";e.currentTarget.style.boxShadow="0 8px 20px rgba(0,0,0,0.1)";}}}
                                onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow="0 2px 8px rgba(0,0,0,0.05)";}}>
                                {hasBed ? (
                                  <>
                                    <div style={{fontSize:"0.52rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600,marginBottom:1}}>{pt.section}</div>
                                    <div style={{fontSize:"1.1rem",fontWeight:700,color:C.textMuted,lineHeight:1,letterSpacing:"-0.03em",marginBottom:3}}>{String(pt.bedNo).padStart(2,"0")}</div>
                                  </>
                                ) : (
                                  <div style={{fontSize:"0.52rem",color:C.textMuted,fontWeight:600,letterSpacing:"0.05em",textTransform:"uppercase",marginBottom:3}}>Unassigned</div>
                                )}
                                <div style={{display:"flex",alignItems:"baseline",gap:3,marginBottom:2,flexWrap:"wrap"}}>
                                  <span style={{fontSize:"0.75rem",fontWeight:600,color:C.text,lineHeight:1.2,wordBreak:"break-word"}}>{pt.name}</span>
                                  {pt.age&&<span style={{fontSize:"0.58rem",color:C.textSub,flexShrink:0}}>{pt.age}</span>}
                                </div>
                                {pt.consultant&&<div style={{fontSize:"0.56rem",color:C.textSub,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",marginBottom:1}}>{pt.consultant}</div>}
                                {pt.diagnosis&&<div style={{fontSize:"0.58rem",color:C.text,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{pt.diagnosis}</div>}
                              </div>
                            );
                          })}
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
    </div>
  );
}

// ── Inline assign picker (used inside add patient modal) ───────────────────────
function InlineAssignPicker({ groups, allStudents, patients, shadowHOs=[], value, onChange, theme, rgb }) {
  const g0 = groups[0]||{name:"Group A",students:[]};
  const g1 = groups[1]||{name:"Group B",students:[]};
  const g0s = (g0.students||[]).filter(s=>s.name);
  const g1s = (g1.students||[]).filter(s=>s.name);

  const activeShadowHOs = (shadowHOs||[]).filter(h=>h.name).map(h=>({name:h.name,post:h.post}));

  const countPrimary = (name) => patients.filter(p=>p.primary1===name||p.primary2===name).length;
  const countShadow  = (name) => patients.filter(p=>p.shadow===name).length;

  const PrimaryChip = ({s, selected, onSelect, color}) => {
    const isSel = selected===s.name;
    const count = countPrimary(s.name);
    return (
      <div onClick={()=>onSelect(isSel?null:s.name)}
        style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:2,
          padding:"8px 4px",borderRadius:10,cursor:"pointer",textAlign:"center",position:"relative",
          background:isSel?`rgba(${hexToRgb(color)},0.12)`:C.surfaceEl,
          border:`1px solid ${isSel?color:C.border}`}}>
        {isSel&&<div style={{position:"absolute",top:3,right:3,width:13,height:13,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon name="check" size={7} color="#fff"/>
        </div>}
        {s.no&&<span style={{fontSize:"0.52rem",color:isSel?color:C.textMuted,fontFamily:"monospace",fontWeight:600}}>{s.no}</span>}
        <span style={{fontSize:"0.7rem",fontWeight:isSel?700:500,color:isSel?color:C.text,lineHeight:1.2,wordBreak:"break-word"}}>{s.name.split(" ")[0]}</span>
        <span style={{fontSize:"0.52rem",color:count>0?(isSel?color:C.textSub):C.textMuted,background:count>0?"rgba(0,0,0,0.05)":"transparent",borderRadius:4,padding:count>0?"1px 3px":"0"}}>
          {count>0?`${count}pt`:"—"}
        </span>
      </div>
    );
  };

  const ShadowChip = ({ho}) => {
    const isSel = value.shadow===ho.name;
    const count = countShadow(ho.name);
    return (
      <div onClick={()=>onChange(value.p1,value.p2,isSel?null:ho.name)}
        style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,cursor:"pointer",
          background:isSel?"rgba(0,0,0,0.05)":C.surface,
          border:`1px dashed ${isSel?C.textSub:C.border}`}}>
        <div style={{width:16,height:16,borderRadius:5,border:`2px dashed ${isSel?C.textSub:C.borderMid}`,background:isSel?"rgba(0,0,0,0.08)":"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
          {isSel&&<Icon name="check" size={8} color={C.textSub}/>}
        </div>
        <div style={{flex:1}}>
          <div style={{fontSize:"0.8rem",color:C.text,fontWeight:isSel?600:400}}>{ho.name}</div>
          <div style={{fontSize:"0.62rem",color:C.textMuted}}>{ho.post}</div>
        </div>
        <span style={{fontSize:"0.65rem",fontWeight:600,color:count>0?C.textSub:C.textMuted,background:count>0?"rgba(0,0,0,0.06)":"transparent",borderRadius:5,padding:count>0?"2px 6px":"0"}}>
          {count>0?`${count} shadow`:"—"}
        </span>
      </div>
    );
  };

  const PrimarySection = ({students,selected,onSelect,label,color}) => (
    <div style={{marginBottom:14}}>
      <div style={{fontSize:"0.62rem",fontWeight:600,color,letterSpacing:"0.04em",marginBottom:6,textTransform:"uppercase"}}>{label}</div>
      {students.length===0
        ?<div style={{fontSize:"0.72rem",color:C.textMuted}}>No students</div>
        :<div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:5}}>
          {students.map(s=><PrimaryChip key={s.name} s={s} selected={selected} onSelect={onSelect} color={color}/>)}
        </div>
      }
    </div>
  );

  return (
    <div style={{background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:12,padding:"14px",marginBottom:14}}>
      <div style={{fontSize:"0.65rem",color:C.textMuted,letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:500,marginBottom:12}}>Manual Assignment</div>
      <PrimarySection students={g0s} selected={value.p1} onSelect={p1=>onChange(p1,value.p2,value.shadow)} label={`Primary — ${g0.name}`} color="#6366f1"/>
      <PrimarySection students={g1s} selected={value.p2} onSelect={p2=>onChange(value.p1,p2,value.shadow)} label={`Primary — ${g1.name}`} color="#f97316"/>
      <div style={{marginBottom:8}}>
        <div style={{fontSize:"0.62rem",fontWeight:600,color:C.textSub,letterSpacing:"0.04em",marginBottom:6,textTransform:"uppercase"}}>Shadow HO</div>
        {activeShadowHOs.length===0
          ?<div style={{fontSize:"0.72rem",color:C.textMuted}}>No active Shadow HOs set. Update the Shadow HO banner first.</div>
          :<div style={{display:"flex",flexDirection:"column",gap:5}}>
            {activeShadowHOs.map(ho=><ShadowChip key={ho.name} ho={ho}/>)}
          </div>
        }
      </div>
    </div>
  );
}

// ── Paed Assign Modal ──────────────────────────────────────────────────────────
function PaedAssignModal({ patient, groups, allStudents, theme, rgb, onConfirm, onClose, patients=[], shadowHOs=[] }) {
  const [p1, setP1] = useState(patient?.primary1||null);
  const [p2, setP2] = useState(patient?.primary2||null);
  const [sh, setSh] = useState(patient?.shadow||null);

  const g0 = groups[0]||{name:"Group A",students:[]};
  const g1 = groups[1]||{name:"Group B",students:[]};
  const g0s = (g0.students||[]).filter(s=>s.name);
  const g1s = (g1.students||[]).filter(s=>s.name);

  const activeShadowHOs = (shadowHOs||[]).filter(h=>h.name);
  const countPrimary = (name) => patients.filter(p=>p.id!==patient?.id&&(p.primary1===name||p.primary2===name)).length;
  const countShadow  = (name) => patients.filter(p=>p.id!==patient?.id&&p.shadow===name).length;

  const StudentChip = ({ s, selected, onSelect, color }) => {
    const count = countPrimary(s.name);
    const isSel = selected===s.name;
    return (
      <div onClick={()=>onSelect(isSel?null:s.name)}
        style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:3,
          padding:"8px 4px",borderRadius:10,cursor:"pointer",textAlign:"center",
          background:isSel?`rgba(${hexToRgb(color)},0.12)`:C.surfaceEl,
          border:`1px solid ${isSel?color:C.border}`,
          transition:"all 0.1s",position:"relative"}}>
        {isSel && <div style={{position:"absolute",top:4,right:4,width:14,height:14,borderRadius:"50%",background:color,display:"flex",alignItems:"center",justifyContent:"center"}}>
          <Icon name="check" size={8} color="#fff"/>
        </div>}
        {s.no && <span style={{fontSize:"0.55rem",color:isSel?color:C.textMuted,fontFamily:"monospace",fontWeight:600}}>{s.no}</span>}
        <span style={{fontSize:"0.72rem",fontWeight:isSel?700:500,color:isSel?color:C.text,lineHeight:1.2,wordBreak:"break-word"}}>{s.name.split(" ")[0]}</span>
        <span style={{fontSize:"0.55rem",fontWeight:600,color:count>0?(isSel?color:C.textSub):C.textMuted,background:count>0?"rgba(0,0,0,0.06)":"transparent",borderRadius:4,padding:count>0?"1px 4px":"0"}}>
          {count>0?`${count}pt`:"—"}
        </span>
      </div>
    );
  };

  const GridSection = ({ students, selected, onSelect, label, color }) => (
    <div style={{marginBottom:16}}>
      <div style={{fontSize:"0.65rem",fontWeight:600,color,letterSpacing:"0.04em",marginBottom:8,textTransform:"uppercase"}}>{label}</div>
      {students.length===0
        ? <div style={{fontSize:"0.75rem",color:C.textMuted,padding:"4px 0"}}>No students in this group</div>
        : <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
            {students.map(s=><StudentChip key={s.name} s={s} selected={selected} onSelect={onSelect} color={color}/>)}
          </div>
      }
    </div>
  );

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:300,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:"100%",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",maxHeight:"80vh",overflowY:"auto",boxShadow:"0 -4px 40px rgba(0,0,0,0.12)"}}>
        <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 18px"}}/>
        <h3 style={{margin:"0 0 4px",color:C.text,fontWeight:600}}>Assign — {patient?.name}</h3>
        <p style={{margin:"0 0 16px",color:C.textMuted,fontSize:"0.76rem"}}>One primary from each group · one Shadow HO as shadow</p>

        <GridSection students={g0s} selected={p1} onSelect={setP1} label={`Primary — ${g0.name}`} color="#6366f1"/>
        <GridSection students={g1s} selected={p2} onSelect={setP2} label={`Primary — ${g1.name}`} color="#f97316"/>

        {/* Shadow — only active Shadow HOs */}
        <div style={{marginBottom:16}}>
          <div style={{fontSize:"0.65rem",fontWeight:600,color:C.textSub,letterSpacing:"0.04em",marginBottom:8,textTransform:"uppercase"}}>Shadow HO</div>
          {activeShadowHOs.length===0
            ? <div style={{fontSize:"0.75rem",color:C.textMuted}}>No active Shadow HOs — update the banner first.</div>
            : <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {activeShadowHOs.map(ho=>{
                  const isSel = sh===ho.name;
                  const count = countShadow(ho.name);
                  return (
                    <div key={ho.name} onClick={()=>setSh(isSel?null:ho.name)}
                      style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",borderRadius:10,cursor:"pointer",
                        background:isSel?"rgba(0,0,0,0.05)":C.surfaceEl,
                        border:`1px dashed ${isSel?C.textSub:C.border}`}}>
                      <div style={{width:18,height:18,borderRadius:5,border:`2px dashed ${isSel?C.textSub:C.borderMid}`,background:isSel?"rgba(0,0,0,0.08)":"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {isSel&&<Icon name="check" size={9} color={C.textSub}/>}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:"0.85rem",color:C.text,fontWeight:isSel?600:400}}>{ho.name}</div>
                        <div style={{fontSize:"0.62rem",color:C.textMuted}}>{ho.post}</div>
                      </div>
                      <span style={{fontSize:"0.65rem",fontWeight:600,color:count>0?C.textSub:C.textMuted,background:count>0?"rgba(0,0,0,0.06)":"transparent",borderRadius:5,padding:count>0?"2px 6px":"0"}}>
                        {count>0?`${count} shadow`:"—"}
                      </span>
                    </div>
                  );
                })}
              </div>
          }
        </div>

        <div style={{display:"flex",gap:10,marginTop:4}}>
          <button onClick={onClose} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
          <button onClick={()=>onConfirm(p1,p2,sh)} style={{flex:1,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Confirm</button>
        </div>
      </div>
    </div>
  );
}

