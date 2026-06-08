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
    (async () => { await loadAll(); setScreen("home"); })();

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
  const setup  = ward.setup || {};
  const beds   = ward.beds  || {};
  const theme  = setup.themeColor || "#007aff";
  const rgb    = hexToRgb(theme);
  const bedKeys = Object.keys(beds);
  const newCount    = bedKeys.filter(k=>beds[k]?.isNew).length;
  const histCount   = bedKeys.filter(k=>beds[k]?.historyTaken).length;
  const assigned    = bedKeys.filter(k=>beds[k]?.assigned?.length>0||beds[k]?.shadows?.length>0).length;
  const floorCount  = bedKeys.filter(k=>beds[k]?.isFloor).length;
  const patientCount= bedKeys.filter(k=>{const b=beds[k]; return b&&(b.diagnosis||b.consultant||b.notes||b.assigned?.length>0||b.shadows?.length>0||b.isNew||b.historyTaken||b.opStatus);}).length;

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
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <div style={{background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.18)`,borderRadius:8,padding:"4px 10px"}}>
            <span style={{fontSize:"0.7rem",fontWeight:600,color:theme}}>{patientCount} patients</span>
          </div>
          <div style={{background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:8,padding:"4px 10px"}}>
            <span style={{fontSize:"0.7rem",fontWeight:500,color:C.textSub}}>{setup.bedCount||0} beds</span>
          </div>
        </div>
      </div>
      {/* Stats row */}
      <div style={{display:"flex",gap:8,borderTop:`1px solid ${C.border}`,paddingTop:10}}>
        {[
          { icon:"newdot",  color:C.red,   label:"New",     val:newCount },
          { icon:"history", color:C.green, label:"Hx taken",val:`${histCount}/${assigned}` },
          { icon:"floor",   color:theme,   label:"Floor",   val:floorCount },
        ].map(s=>(
          <div key={s.label} style={{display:"flex",alignItems:"center",gap:5,flex:1}}>
            <Icon name={s.icon} size={12} color={s.color}/>
            <span style={{fontSize:"0.72rem",fontWeight:600,color:s.color}}>{s.val}</span>
            <span style={{fontSize:"0.65rem",color:C.textMuted}}>{s.label}</span>
          </div>
        ))}
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
  const [form, setForm] = useState({ groupId:"cg1", wardName:"", appointmentType:"", bedCount:"", themeColor:"#007aff", students:[{name:"",group:""}], consultants:[{name:"",color:"#6366f1"}] });

  const create = async () => {
    if (!form.wardName||!form.appointmentType||!form.bedCount) { showToast("Fill all fields","error"); return; }
    const count = parseInt(form.bedCount);
    if (isNaN(count)||count<1||count>80) { showToast("Beds 1–80","error"); return; }
    if (wards.find(w=>w.id===form.groupId)) { showToast("Group already has a ward","error"); return; }
    const beds = {};
    for (let i=1;i<=count;i++) beds[i]={ assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, opStatus:"" };
    const students    = form.students.filter(s=>s.name?.trim()).map(s=>({name:s.name.trim(),group:s.group?.trim()||""}));
    const consultants = form.consultants.filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"}));
    await onSave(form.groupId, { setup:{ wardName:form.wardName, appointmentType:form.appointmentType, bedCount:count, themeColor:form.themeColor, students, consultants }, beds });
    showToast("Ward created!");
    onCreated();
  };

  const addStudent    = () => setForm(f=>({...f,students:[...f.students,{name:"",group:""}]}));
  const updStudent    = (i,k,v) => setForm(f=>{ const a=[...f.students]; a[i]={...a[i],[k]:v}; return {...f,students:a}; });
  const remStudent    = (i) => setForm(f=>({...f,students:f.students.filter((_,idx)=>idx!==i)}));
  const addConsultant = () => setForm(f=>({...f,consultants:[...f.consultants,{name:"",color:"#6366f1"}]}));
  const updConsultant = (i,k,v) => setForm(f=>{ const a=[...f.consultants]; a[i]={...a[i],[k]:v}; return {...f,consultants:a}; });
  const remConsultant = (i) => setForm(f=>({...f,consultants:f.consultants.filter((_,idx)=>idx!==i)}));
  const groupOptions  = Object.keys(GROUP_PINS).filter(id=>!wards.find(w=>w.id===id));

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
        <div style={{marginBottom:18}}>
          <label style={labelStyle}>Ward Name</label>
          <input value={form.wardName} onChange={e=>setForm(f=>({...f,wardName:e.target.value}))} placeholder="e.g. Medicine Male" style={{...iS,width:"100%",marginTop:6,boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:18}}>
          <label style={labelStyle}>Rotation / Appointment</label>
          <input value={form.appointmentType} onChange={e=>setForm(f=>({...f,appointmentType:e.target.value}))} placeholder="e.g. Medicine – Week 1" style={{...iS,width:"100%",marginTop:6,boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:18}}>
          <label style={labelStyle}>Number of Beds</label>
          <input type="number" value={form.bedCount} onChange={e=>setForm(f=>({...f,bedCount:e.target.value}))} placeholder="e.g. 20" style={{...iS,width:"100%",marginTop:6,boxSizing:"border-box"}}/>
        </div>
        <div style={{marginBottom:22}}>
          <label style={labelStyle}>Accent Colour</label>
          <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",boxShadow:C.shadow}}>
            <input type="color" value={form.themeColor} onChange={e=>setForm(f=>({...f,themeColor:e.target.value}))} style={{width:40,height:40,border:"none",borderRadius:8,cursor:"pointer",padding:0,background:"none"}}/>
            <div style={{flex:1,height:8,borderRadius:4,background:`linear-gradient(90deg,${C.surfaceEl},${form.themeColor})`}}/>
            <span style={{fontSize:"0.75rem",color:C.textMuted,fontFamily:"monospace"}}>{form.themeColor}</span>
          </div>
        </div>

        {/* Students */}
        <div style={{marginBottom:22}}>
          <label style={labelStyle}>Students</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 56px",gap:4,marginTop:8,marginBottom:4,paddingLeft:2}}>
            <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em"}}>NAME</span>
            <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em",textAlign:"center"}}>GRP NO.</span>
          </div>
          {form.students.map((s,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginTop:6}}>
              <input value={s.name} onChange={e=>updStudent(i,"name",e.target.value)} placeholder={`Student ${i+1}`} style={{...iS,flex:1,padding:"9px 12px"}}/>
              <input value={s.group} onChange={e=>updStudent(i,"group",e.target.value)} placeholder="1" style={{...iS,width:48,padding:"9px 8px",textAlign:"center",flexShrink:0}}/>
              {form.students.length>1 && <button onClick={()=>remStudent(i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
            </div>
          ))}
          <button onClick={addStudent} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Student</button>
        </div>

        {/* Consultants */}
        <div style={{marginBottom:32}}>
          <label style={labelStyle}>Consultants</label>
          {form.consultants.map((c,i)=>(
            <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
              <input type="color" value={c.color||"#6366f1"} onChange={e=>updConsultant(i,"color",e.target.value)} style={{width:38,height:38,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",padding:2,background:"none",flexShrink:0}}/>
              <input value={c.name} onChange={e=>updConsultant(i,"name",e.target.value)} placeholder="Name or title" style={{...iS,flex:1}}/>
              {form.consultants.length>1 && <button onClick={()=>remConsultant(i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
            </div>
          ))}
          <button onClick={addConsultant} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Consultant</button>
        </div>

        <button onClick={create} style={{...accentBtn(form.themeColor,hexToRgb(form.themeColor)),width:"100%",padding:"15px",fontSize:"0.95rem"}}>
          Create Ward
        </button>
      </div>
      <BrandingBar theme={form.themeColor}/>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// WARD VIEW  (full ward, scoped to one group)
// ══════════════════════════════════════════════════════════════════════════════
function WardView({ wardId, ward: initialWard, onBack, onSave, showToast, localTs, seniorMode=false }) {
  const [ward,       setWard]       = useState(initialWard || { setup:null, beds:{} });
  const [isLeader,   setIsLeader]   = useState(false);
  const [pinInput,   setPinInput]   = useState("");
  const [pinError,   setPinError]   = useState(false);
  const [showPin,    setShowPin]    = useState(false);
  const [view,       setView]       = useState("home"); // home | bed
  const [activeTab,  setActiveTab]  = useState("ward");
  const [selectedBed,setSelectedBed]= useState(null);
  const [bedEdit,    setBedEdit]    = useState({ consultant:"", diagnosis:"", notes:"", historyTaken:false, opStatus:"" });
  const [assignModal,setAssignModal]= useState(null);
  const [editMode,   setEditMode]   = useState(false);
  const [showReset,  setShowReset]  = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [setupForm,  setSetupForm]  = useState({ wardName:"", appointmentType:"", bedCount:"", themeColor:"#007aff", students:[{name:"",group:""}], consultants:[{name:"",color:"#6366f1"}] });
  const pollActive = useRef(true);

  const setup  = ward.setup || {};
  const beds   = ward.beds  || {};
  const theme  = setup.themeColor || "#007aff";
  const rgb    = hexToRgb(theme);

  // Poll this specific ward every 5s
  useEffect(() => {
    pollActive.current = true;
    const poll = async () => {
      if (!pollActive.current) return;
      try {
        const row = await db.get(`ward:${wardId}`);
        if (row) {
          const remoteTs = row.updated_at;
          const myTs = localTs.current[wardId];
          if (!myTs || new Date(remoteTs) > new Date(myTs)) {
            const parsed = JSON.parse(row.value);
            localTs.current[wardId] = remoteTs;
            setWard(parsed);
          }
        }
      } catch {}
      if (pollActive.current) setTimeout(poll, 5000);
    };
    setTimeout(poll, 5000);
    return () => { pollActive.current = false; };
  }, [wardId]);

  const save = useCallback(async (newWard) => {
    setWard(newWard);
    await onSave(wardId, newWard);
  }, [wardId, onSave]);

  // ── Setup (first time) ────────────────────────────────────────────────────
  const handleSetupSubmit = async () => {
    if (!setupForm.wardName||!setupForm.appointmentType||!setupForm.bedCount) { showToast("Fill all fields","error"); return; }
    const count = parseInt(setupForm.bedCount);
    if (isNaN(count)||count<1||count>80) { showToast("Beds 1–80","error"); return; }
    const students    = setupForm.students.filter(s=>s.name.trim()).map(s=>({name:s.name.trim(),group:s.group.trim()}));
    const consultants = setupForm.consultants.filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"}));
    const bedObj = {};
    for (let i=1;i<=count;i++) bedObj[i]={ assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false, opStatus:"" };
    await save({ setup:{ wardName:setupForm.wardName, appointmentType:setupForm.appointmentType, bedCount:count, themeColor:setupForm.themeColor, students, consultants }, beds:bedObj });
    showToast("Ward configured!");
  };

  const handleSaveEdit = async () => {
    const students    = setupForm.students.filter(s=>s.name.trim()).map(s=>({name:s.name.trim(),group:s.group.trim()}));
    const consultants = setupForm.consultants.filter(c=>c.name?.trim()).map(c=>({name:c.name.trim(),color:c.color||"#6366f1"}));
    await save({ ...ward, setup:{ ...setup, wardName:setupForm.wardName, appointmentType:setupForm.appointmentType, themeColor:setupForm.themeColor, students, consultants } });
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
        <SetupForm form={setupForm} setForm={setSetupForm} onSubmit={handleSaveEdit} submitLabel="Save Changes" theme={theme} hideBedsField/>
        <div style={{marginTop:12,borderTop:`1px solid ${C.border}`,paddingTop:12}}>
          <button onClick={()=>setShowReset(true)} style={{width:"100%",background:"none",border:`1px solid rgba(${hexToRgb(C.red)},0.3)`,color:C.red,borderRadius:12,padding:"12px",cursor:"pointer",fontSize:"0.85rem",fontFamily:SF}}>
            Reset Ward (New Rotation)
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
            {isLeader && !seniorMode && <button onClick={()=>{ setEditMode(true); setSetupForm({ wardName:setup.wardName||"", appointmentType:setup.appointmentType||"", bedCount:setup.bedCount||"", themeColor:setup.themeColor||"#007aff", students:setup.students?.length?setup.students:[{name:"",group:""}], consultants:setup.consultants?.length?setup.consultants.map(c=>typeof c==="string"?{name:c,color:"#6366f1"}:c):[{name:"",color:"#6366f1"}] }); }} style={{display:"flex",alignItems:"center",justifyContent:"center",background:C.surface,border:`1px solid ${C.border}`,color:C.textMuted,borderRadius:50,width:32,height:32,cursor:"pointer",boxShadow:C.shadow}}>
              <Icon name="settings" size={14} color={C.textMuted}/>
            </button>}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{borderBottom:`1px solid ${C.border}`,background:"rgba(245,245,247,0.88)",position:"sticky",top:"57px",zIndex:49,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",padding:"0 16px"}}>
          {[{id:"ward",label:"Ward"},...(!seniorMode?[{id:"students",label:"Students"}]:[])].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)} style={{padding:"11px 16px",fontSize:"0.8rem",fontWeight:500,fontFamily:SF,background:"none",border:"none",cursor:"pointer",color:activeTab===t.id?theme:C.textMuted,borderBottom:activeTab===t.id?`2px solid ${theme}`:"2px solid transparent",marginBottom:"-1px",transition:"color 0.15s",letterSpacing:"-0.01em"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"20px 16px 100px"}}>
        {activeTab==="ward" && <>
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

          {/* Bed grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10}}>
            {bedKeys.map(bedNum=>{
              const bed = beds[bedNum];
              const hasAssigned=bed.assigned?.length>0, hasShadow=bed.shadows?.length>0;
              const filled=hasAssigned||bed.diagnosis||bed.consultant;
              const cObj=(setup.consultants||[]).find(c=>(typeof c==="object"?c.name:c)===bed.consultant);
              const cRgb=cObj?.color?hexToRgb(cObj.color):null;
              return (
                <div key={bedNum}
                  onClick={seniorMode ? undefined : ()=>{ setSelectedBed(bedNum); setBedEdit({consultant:bed.consultant||"",diagnosis:bed.diagnosis||"",notes:bed.notes||"",historyTaken:!!bed.historyTaken,opStatus:bed.opStatus||""}); setView("bed"); }}
                  style={{ background:cRgb?`rgba(${cRgb},0.07)`:C.surface, border:bed.historyTaken?`1px solid rgba(${hexToRgb(C.green)},0.2)`:cRgb?`1px solid rgba(${cRgb},0.22)`:`1px solid rgba(0,0,0,${filled?0.1:0.08})`, boxShadow:cRgb?`0 6px 20px rgba(${cRgb},0.1),0 1px 4px rgba(0,0,0,0.05)`:bed.historyTaken?`0 4px 16px rgba(${hexToRgb(C.green)},0.1),0 1px 3px rgba(0,0,0,0.06)`:filled?"0 6px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.05)":"0 2px 10px rgba(0,0,0,0.06),0 1px 3px rgba(0,0,0,0.04)", borderRadius:14,padding:"12px 11px",cursor:seniorMode?"default":"pointer",position:"relative",transition:"transform 0.12s, box-shadow 0.12s",userSelect:"none" }}
                  onMouseEnter={seniorMode?undefined:e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 28px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)";}}
                  onMouseLeave={seniorMode?undefined:e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=cRgb?`0 6px 20px rgba(${cRgb},0.1),0 1px 4px rgba(0,0,0,0.05)`:filled?"0 6px 20px rgba(0,0,0,0.08),0 1px 4px rgba(0,0,0,0.05)":"0 2px 10px rgba(0,0,0,0.06),0 1px 3px rgba(0,0,0,0.04)";}}
                >
                  <div style={{position:"absolute",top:9,right:9,display:"flex",gap:4,alignItems:"center"}}>
                    {bed.historyTaken && <Icon name="history" size={11} color={C.green}/>}
                    {bed.isNew && <span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={10} color={C.red}/></span>}
                  </div>
                  <div style={{fontSize:"0.58rem",color:C.textMuted,marginBottom:3,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600}}>{bed.isFloor?"Floor":"Bed"}</div>
                  <div style={{fontSize:"1.25rem",fontWeight:700,color:theme,lineHeight:1,letterSpacing:"-0.03em"}}>{bedNum}</div>
                  {bed.diagnosis && <div style={{fontSize:"0.65rem",color:C.text,marginTop:5,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{bed.diagnosis}</div>}
                  {bed.consultant && <div style={{fontSize:"0.62rem",color:C.textSub,marginTop:2,fontWeight:500}}>{bed.consultant}</div>}
                  {bed.notes && <div style={{fontSize:"0.6rem",color:C.textSub,marginTop:4,lineHeight:1.35,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{bed.notes}</div>}
                  {bed.opStatus && <div style={{display:"inline-block",marginTop:6,fontSize:"0.55rem",fontWeight:700,letterSpacing:"0.05em",textTransform:"uppercase",padding:"2px 7px",borderRadius:5,background:DEFAULT_OP_COLORS[bed.opStatus]?.bg,color:DEFAULT_OP_COLORS[bed.opStatus]?.color,border:`1px solid ${DEFAULT_OP_COLORS[bed.opStatus]?.border}`}}>{bed.opStatus}</div>}
                  {!seniorMode && (hasAssigned||hasShadow)&&<div style={{marginTop:7,display:"flex",flexWrap:"wrap",gap:3}}>
                    {(bed.assigned||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;const g=typeof s==="object"?s.group:"";return<span key={i} style={{fontSize:"0.58rem",background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.18)`,borderRadius:5,padding:"2px 5px",color:theme,display:"inline-flex",alignItems:"baseline",gap:2,fontWeight:500}}>{n.split(" ")[0]}{g&&<span style={{fontSize:"0.45rem",lineHeight:1,position:"relative",top:"-1px",color:`rgba(${rgb},0.6)`}}>{g}</span>}</span>;})}
                    {(bed.shadows||[]).map((s,i)=>{const n=typeof s==="object"?s.name:s;const g=typeof s==="object"?s.group:"";return<span key={i} style={{fontSize:"0.58rem",background:"rgba(0,0,0,0.03)",border:"1px dashed rgba(0,0,0,0.12)",borderRadius:5,padding:"2px 5px",color:C.textMuted,display:"inline-flex",alignItems:"baseline",gap:2}}>{n.split(" ")[0]}{g&&<span style={{fontSize:"0.45rem",lineHeight:1,position:"relative",top:"-1px"}}>{g}</span>}</span>;})}
                  </div>}
                </div>
              );
            })}
          </div>
        </>}
        {activeTab==="students" && <StudentsTab beds={beds} bedKeys={bedKeys} students={setup.students||[]} theme={theme} rgb={rgb}/>}
      </div>

      {/* Bed sheet */}
      {!seniorMode && view==="bed" && selectedBed && selBed && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:100,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>{if(e.target===e.currentTarget){setView("home");setSelectedBed(null);setShowClearConfirm(false);}}}>
          <div style={{width:"100%",maxHeight:"88vh",overflowY:"auto",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",boxShadow:"0 -4px 40px rgba(0,0,0,0.12)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 22px"}}/>
            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:18}}>
              <div>
                <div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:500}}>{selBed.isFloor?"Floor Patient":"Bed"}</div>
                <h2 style={{margin:"3px 0 0",fontSize:"2rem",fontWeight:700,color:theme,letterSpacing:"-0.04em"}}>{selectedBed}</h2>
              </div>
              <button onClick={()=>{setView("home");setSelectedBed(null);setShowClearConfirm(false);}} style={{background:C.surfaceEl,border:"none",color:C.textSub,borderRadius:50,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginTop:4}}>
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

            {!showClearConfirm
              ? <button onClick={()=>setShowClearConfirm(true)} style={{marginTop:10,width:"100%",background:"none",border:`1px solid ${C.border}`,color:C.textMuted,borderRadius:13,padding:"12px",fontSize:"0.85rem",cursor:"pointer",fontFamily:SF}}>Clear Bed Data</button>
              : <div style={{marginTop:10,background:`rgba(${hexToRgb(C.red)},0.05)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,borderRadius:13,padding:"14px"}}>
                  <p style={{margin:"0 0 12px",fontSize:"0.82rem",color:C.textSub,textAlign:"center"}}>Clear all patient data for this bed?</p>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setShowClearConfirm(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"10px",cursor:"pointer",fontSize:"0.85rem",fontFamily:SF}}>Cancel</button>
                    <button onClick={()=>clearBed(selectedBed)} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"10px",cursor:"pointer",fontWeight:600,fontSize:"0.85rem",fontFamily:SF}}>Clear</button>
                  </div>
                </div>
            }
          </div>
        </div>
      )}

      {/* Assign modal */}
      {assignModal && <AssignModal bedNum={assignModal} students={setup.students||[]} currentAssigned={beds[assignModal]?.assigned||[]} currentShadows={beds[assignModal]?.shadows||[]} theme={theme} rgb={rgb} onConfirm={(a,s)=>assignStudents(assignModal,a,s)} onClose={()=>setAssignModal(null)}/>}

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

      <BrandingBar theme={theme}/>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}`}</style>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS
// ══════════════════════════════════════════════════════════════════════════════

function SetupForm({ form, setForm, onSubmit, submitLabel, theme, hideBedsField }) {
  const addField      = (f)     => setForm(p => ({ ...p, [f]: f==="students" ? [...p[f],{name:"",group:""}] : [...p[f],{name:"",color:"#6366f1"}] }));
  const removeField   = (f,i)   => setForm(p => ({ ...p, [f]:p[f].filter((_,idx)=>idx!==i) }));
  const updateStudent    = (i,k,v) => setForm(p => { const a=[...p.students]; a[i]={...a[i],[k]:v}; return {...p,students:a}; });
  const updateConsultant = (i,k,v) => setForm(p => { const a=[...p.consultants]; a[i]={...a[i],[k]:v}; return {...p,consultants:a}; });

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
      <div style={{marginBottom:24}}>
        <label style={labelStyle}>Accent Colour</label>
        <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",boxShadow:C.shadow}}>
          <input type="color" value={form.themeColor} onChange={e=>setForm(f=>({...f,themeColor:e.target.value}))} style={{width:40,height:40,border:"none",borderRadius:8,cursor:"pointer",padding:0,background:"none"}}/>
          <div style={{flex:1,height:8,borderRadius:4,background:`linear-gradient(90deg,${C.surfaceEl},${form.themeColor})`}}/>
          <span style={{fontSize:"0.75rem",color:C.textMuted,fontFamily:"monospace"}}>{form.themeColor}</span>
        </div>
      </div>
      {/* Students */}
      <div style={{marginBottom:22}}>
        <label style={labelStyle}>Students</label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 56px",gap:4,marginTop:8,marginBottom:4,paddingLeft:2}}>
          <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em"}}>NAME</span>
          <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em",textAlign:"center"}}>GRP NO.</span>
        </div>
        {form.students.map((s,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:6}}>
            <input value={s.name} onChange={e=>updateStudent(i,"name",e.target.value)} placeholder={`Student ${i+1}`} style={{...iS,flex:1,padding:"10px 12px"}}/>
            <input value={s.group} onChange={e=>updateStudent(i,"group",e.target.value)} placeholder="1" style={{...iS,width:48,padding:"10px 8px",textAlign:"center",flexShrink:0}}/>
            {form.students.length>1 && <button onClick={()=>removeField("students",i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={()=>addField("students")} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Student</button>
      </div>
      {/* Consultants */}
      <div style={{marginBottom:28}}>
        <label style={labelStyle}>Consultants</label>
        {form.consultants.map((c,i)=>(
          <div key={i} style={{display:"flex",gap:6,marginTop:8,alignItems:"center"}}>
            <input type="color" value={c.color||"#6366f1"} onChange={e=>updateConsultant(i,"color",e.target.value)} style={{width:38,height:38,border:`1px solid ${C.border}`,borderRadius:8,cursor:"pointer",padding:2,background:"none",flexShrink:0}}/>
            <input value={c.name} onChange={e=>updateConsultant(i,"name",e.target.value)} placeholder="Name or title" style={{...iS,flex:1}}/>
            {form.consultants.length>1 && <button onClick={()=>removeField("consultants",i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
          </div>
        ))}
        <button onClick={()=>addField("consultants")} style={aMB}><Icon name="plus" size={12} color={C.textSub}/> Add Consultant</button>
      </div>
      <button onClick={onSubmit} style={{...accentBtn(form.themeColor,hexToRgb(form.themeColor)),width:"100%",padding:"15px",fontSize:"0.95rem"}}>{submitLabel}</button>
    </div>
  );
}

function StudentsTab({ beds, bedKeys, students, theme, rgb }) {
  const [selected, setSelected] = useState(null);
  const sorted = [...students].sort((a,b)=>{const ag=parseInt(a.group)||999,bg=parseInt(b.group)||999;return ag!==bg?ag-bg:a.name.localeCompare(b.name);});
  const studentBeds = {};
  sorted.forEach(s=>{ studentBeds[s.name]={primary:[],shadow:[]}; });
  bedKeys.forEach(bedNum=>{
    const bed=beds[bedNum];
    (bed.assigned||[]).forEach(s=>{const n=typeof s==="object"?s.name:s;if(studentBeds[n])studentBeds[n].primary.push({bedNum,bed});});
    (bed.shadows||[]).forEach(s=>{const n=typeof s==="object"?s.name:s;if(studentBeds[n])studentBeds[n].shadow.push({bedNum,bed});});
  });

  if (students.length===0) return <div style={{textAlign:"center",padding:"60px 20px",color:C.textMuted,fontSize:"0.85rem"}}>No students added in setup.</div>;

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {sorted.map(s=>{
        const sb=studentBeds[s.name]; const total=sb.primary.length+sb.shadow.length; const isOpen=selected===s.name;
        return (
          <div key={s.name}>
            <div onClick={()=>setSelected(isOpen?null:s.name)} style={{display:"flex",alignItems:"center",gap:10,padding:"13px 14px",background:C.surface,border:`1px solid ${isOpen?`rgba(${rgb},0.25)`:"rgba(0,0,0,0.08)"}`,borderRadius:isOpen?"14px 14px 0 0":14,cursor:"pointer",userSelect:"none",transition:"all 0.15s",boxShadow:isOpen?"none":"0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)"}}>
              {s.group&&<span style={{fontSize:"0.58rem",color:C.textMuted,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:5,padding:"2px 6px",fontFamily:"monospace",flexShrink:0,fontWeight:500}}>{s.group}</span>}
              <span style={{flex:1,fontSize:"0.9rem",color:C.text,fontWeight:isOpen?600:400}}>{s.name}</span>
              <div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"flex-end",maxWidth:180}}>
                {sb.primary.map(({bedNum,bed})=><span key={bedNum} style={{fontSize:"0.68rem",fontWeight:600,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.25)`,color:theme,borderRadius:6,padding:"2px 7px",position:"relative",letterSpacing:"-0.01em"}}>{bedNum}{bed.isNew&&<span style={{position:"absolute",top:-3,right:-3,animation:"blink 1.2s ease-in-out infinite",display:"inline-flex"}}><Icon name="newdot" size={7} color={C.red}/></span>}</span>)}
                {sb.shadow.map(({bedNum})=><span key={"s"+bedNum} style={{fontSize:"0.68rem",fontWeight:500,background:C.surfaceEl,border:`1px dashed ${C.borderMid}`,color:C.textMuted,borderRadius:6,padding:"2px 7px",letterSpacing:"-0.01em"}}>{bedNum}</span>)}
                {total===0&&<span style={{fontSize:"0.68rem",color:C.textMuted}}>—</span>}
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)",flexShrink:0,marginLeft:4}}><path d="M2 4l4 4 4-4" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            {isOpen && (
              <div style={{background:C.surfaceEl,border:`1px solid rgba(${rgb},0.2)`,borderTop:"none",borderRadius:"0 0 14px 14px",padding:"12px 14px 14px"}}>
                {total===0
                  ? <div style={{color:C.textMuted,fontSize:"0.8rem",textAlign:"center",padding:"12px 0"}}>No beds assigned yet</div>
                  : <>
                      {sb.primary.length>0&&<><div style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8,fontWeight:500}}>Primary</div>{sb.primary.map(({bedNum,bed})=><BedPill key={bedNum} bedNum={bedNum} bed={bed} type="primary" rgb={rgb} theme={theme}/>)}</>}
                      {sb.shadow.length>0&&<><div style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8,marginTop:sb.primary.length>0?12:0,fontWeight:500}}>Shadow</div>{sb.shadow.map(({bedNum,bed})=><BedPill key={bedNum} bedNum={bedNum} bed={bed} type="shadow" rgb={rgb} theme={theme}/>)}</>}
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

function AssignModal({ bedNum, students, currentAssigned, currentShadows, theme, rgb, onConfirm, onClose }) {
  const [assigned, setAssigned] = useState(currentAssigned);
  const [shadows,  setShadows]  = useState(currentShadows);
  const sorted = [...students].sort((a,b)=>{const ag=parseInt(a.group)||999,bg=parseInt(b.group)||999;return ag!==bg?ag-bg:a.name.localeCompare(b.name);});
  const getName = s => typeof s==="object"?s.name:s;
  const isAssigned = s => assigned.some(x=>getName(x)===getName(s));
  const isShadow   = s => shadows.some(x=>getName(x)===getName(s));
  const toggleAssigned = s => { if(isAssigned(s)){setAssigned([]);return;} setShadows(sh=>sh.filter(x=>getName(x)!==getName(s))); setAssigned([s]); };
  const toggleShadow   = s => { if(isShadow(s)){setShadows([]);return;}   setAssigned(a=>a.filter(x=>getName(x)!==getName(s)));  setShadows([s]);  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:"100%",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",maxHeight:"75vh",overflowY:"auto",boxShadow:"0 -4px 40px rgba(0,0,0,0.1)"}}>
        <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 20px"}}/>
        <h3 style={{margin:"0 0 6px",color:C.text,fontSize:"1.05rem",fontWeight:600}}>Assign Students — Bed {bedNum}</h3>
        <div style={{display:"flex",gap:16,marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:"0.72rem",color:C.textSub}}><div style={{width:12,height:12,borderRadius:3,background:`rgba(${rgb},0.2)`,border:`1px solid rgba(${rgb},0.4)`}}/>Primary</div>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:"0.72rem",color:C.textSub}}><div style={{width:12,height:12,borderRadius:3,border:`1px dashed ${C.borderMid}`}}/>Shadow</div>
        </div>
        {sorted.length===0
          ? <p style={{color:C.textMuted,fontSize:"0.82rem"}}>No students in setup.</p>
          : <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {sorted.map(s=>{
                const ip=isAssigned(s),is=isShadow(s);
                return (
                  <div key={getName(s)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:ip?`rgba(${rgb},0.07)`:is?C.surfaceEl:C.surface,border:`1px solid ${ip?`rgba(${rgb},0.3)`:is?C.borderMid:C.border}`,borderRadius:12}}>
                    {s.group&&<span style={{fontSize:"0.58rem",color:C.textMuted,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:4,padding:"2px 5px",fontFamily:"monospace",flexShrink:0}}>{s.group}</span>}
                    <span style={{flex:1,color:C.text,fontSize:"0.88rem",fontWeight:ip?500:400}}>{s.name}</span>
                    <button onClick={()=>toggleAssigned(s)} style={{display:"flex",alignItems:"center",gap:5,background:ip?theme:C.surfaceEl,border:`1px solid ${ip?theme:C.border}`,color:ip?"#fff":C.textSub,borderRadius:8,padding:"5px 10px",fontSize:"0.72rem",cursor:"pointer",fontFamily:SF,fontWeight:ip?600:400}}>
                      <Icon name="user" size={11} color={ip?"#fff":C.textSub}/>Primary
                    </button>
                    <button onClick={()=>toggleShadow(s)} style={{display:"flex",alignItems:"center",gap:5,background:is?C.surfaceEl:C.surface,border:`1px dashed ${is?C.borderMid:C.border}`,color:is?C.textSub:C.textMuted,borderRadius:8,padding:"5px 10px",fontSize:"0.72rem",cursor:"pointer",fontFamily:SF}}>
                      <Icon name="shadow" size={11} color={is?C.textSub:C.textMuted}/>Shadow
                    </button>
                  </div>
                );
              })}
            </div>
        }
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
