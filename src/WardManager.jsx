import { useState, useEffect, useCallback } from "react";

const LEADER_PIN = "CG1LEAD";
const STORAGE_KEY = "ward-manager-v3";
const SUPABASE_URL = "https://kpwfldmucvfbgasnkcag.supabase.co";
const SUPABASE_KEY = "sb_publishable_--WwMN5Z4CSgeHcrBN3VRw_ssGCevfr";

// ── Minimal Supabase client (no SDK needed) ────────────────────────────────────
const sb = {
  async get(id) {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/ward_data?id=eq.${id}&select=value`, {
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` }
    });
    const rows = await res.json();
    return rows?.[0]?.value ?? null;
  },
  async upsert(id, value) {
    await fetch(`${SUPABASE_URL}/rest/v1/ward_data`, {
      method: "POST",
      headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" },
      body: JSON.stringify({ id, value, updated_at: new Date().toISOString() })
    });
  },
  subscribe(onUpdate) {
    const ws = new WebSocket(`${SUPABASE_URL.replace("https","wss")}/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`);
    ws.onopen = () => {
      ws.send(JSON.stringify({ topic:"realtime:public:ward_data", event:"phx_join", payload:{}, ref:"1" }));
    };
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data);
      if (msg.event === "INSERT" || msg.event === "UPDATE") {
        const rec = msg.payload?.record;
        if (rec?.id === STORAGE_KEY) onUpdate(JSON.parse(rec.value));
      }
    };
    ws.onerror = () => {};
    return () => ws.close();
  }
};
const LOGO_B64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAFgAAABKCAYAAAA/i5OkAAABCGlDQ1BJQ0MgUHJvZmlsZQAAeJxjYGA8wQAELAYMDLl5JUVB7k4KEZFRCuwPGBiBEAwSk4sLGHADoKpv1yBqL+viUYcLcKakFicD6Q9ArFIEtBxopAiQLZIOYWuA2EkQtg2IXV5SUAJkB4DYRSFBzkB2CpCtkY7ETkJiJxcUgdT3ANk2uTmlyQh3M/Ck5oUGA2kOIJZhKGYIYnBncAL5H6IkfxEDg8VXBgbmCQixpJkMDNtbGRgkbiHEVBYwMPC3MDBsO48QQ4RJQWJRIliIBYiZ0tIYGD4tZ2DgjWRgEL7AwMAVDQsIHG5TALvNnSEfCNMZchhSgSKeDHkMyQx6QJYRgwGDIYMZAKbWPz9HbOBQAAABgklEQVR4nO3aXW+DMAyFYTP1//9lejdFUSj5cBLbeZ+bVWhd6cmpoQwRAAAAAAAAAAjjfthW2n6cv8Hn39lPZEYDLiHsxNX5vJYQe18jhJ4Gtzb06EbPGBFIjH5803ZeP7YdS6vBxwf5ZCTgu/D46Hlb0tO81hBLo0Nb+j5GXkf9k9jaYKsN1dov9ff3afz91qYcP5s1D3J5mMeHK8J5cG77DC65Co+9tnf7DE49hbgjXLMLGmFEaIarvlBWV772o9qy/zP+5iuLDd4SxCzWAg4VrsjYQU5byC8uVhocMlwRGwGHDVdk/4ionbluL+LvDriHq7AtjIgRVi+f/vMesIjxkCMELGI45CgBixgNefdBruYgZTK4Wh4aXPpviRseAnaNgCdbHfBxN2avDDi/E+iIoHePiNqg3S7GqtO0t4DcBvhmd4M1mTyVWxFw2HbWiNJgk+0VWRPw7G9iZsMVWdtg7SBmLJz6Yq2+2GP2RulZrO1oKXRr+wgAAAAAAAAAHn0BpuAyXZaUVW4AAAAASUVORK5CYII=";

const hexToRgb = (hex) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? `${parseInt(r[1],16)}, ${parseInt(r[2],16)}, ${parseInt(r[3],16)}` : "0,122,255";
};

const initialData = () => ({ setup: null, beds: {}, version: 2 });

// ── Design tokens ──────────────────────────────────────────────────────────────
const C = {
  bg:        "#f5f5f7",
  surface:   "#ffffff",
  surfaceEl: "#f0f0f5",
  border:    "#c8c8d0",
  borderMid: "#b0b0bc",
  text:      "#0a0a0f",
  textSub:   "#3a3a44",
  textMuted: "#7a7a88",
  green:     "#1a9e3f",
  red:       "#d92b20",
  shadow:    "0 1px 4px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06)",
  shadowMd:  "0 4px 18px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
};

// ── SVG Icons ──────────────────────────────────────────────────────────────────
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
  };
  return icons[name] || null;
};

export default function WardManager() {
  const [data, setData]                 = useState(initialData);
  const [view, setView]                 = useState("loading");
  const [isLeader, setIsLeader]         = useState(false);
  const [pinInput, setPinInput]         = useState("");
  const [pinError, setPinError]         = useState(false);
  const [selectedBed, setSelectedBed]   = useState(null);
  const [showPinModal, setShowPinModal] = useState(false);
  const [showSetupReset, setShowSetupReset] = useState(false);
  const [toast, setToast]               = useState(null);
  const [assignModal, setAssignModal]   = useState(null);
  const [activeTab, setActiveTab]       = useState("ward");
  const [bedEdit, setBedEdit]           = useState({ consultant:"", diagnosis:"", notes:"", historyTaken:false });

  const [setupForm, setSetupForm] = useState({
    wardName:"", appointmentType:"", bedCount:"", themeColor:"#007aff",
    students:[{name:"",group:""}], consultants:[""]
  });

  useEffect(() => {
    (async () => {
      try {
        const val = await sb.get(STORAGE_KEY);
        if (val) {
          const parsed = JSON.parse(val);
          setData(parsed);
          setView(parsed.setup ? "home" : "setup");
        } else setView("setup");
      } catch { setView("setup"); }
    })();

    // Realtime — update state when another client saves
    const unsub = sb.subscribe((parsed) => {
      setData(parsed);
      if (parsed.setup && view === "loading") setView("home");
    });
    return unsub;
  }, []);

  const save = useCallback(async (d) => {
    try { await sb.upsert(STORAGE_KEY, JSON.stringify(d)); } catch {}
  }, []);

  const showToast = (msg, type="success") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 2500);
  };

  const theme = data.setup?.themeColor || "#007aff";
  const rgb   = hexToRgb(theme);

  // ── SETUP ──────────────────────────────────────────────────────────────────
  const handleSetupSubmit = async () => {
    if (!setupForm.wardName || !setupForm.appointmentType || !setupForm.bedCount) {
      showToast("Fill all required fields","error"); return;
    }
    const count = parseInt(setupForm.bedCount);
    if (isNaN(count)||count<1||count>80) { showToast("Bed count 1–80","error"); return; }
    const students    = setupForm.students.filter(s=>s.name.trim()).map(s=>({name:s.name.trim(),group:s.group.trim()}));
    const consultants = setupForm.consultants.filter(c=>c.trim());
    const beds = {};
    for (let i=1;i<=count;i++) {
      beds[i] = { assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false, isFloor:false };
    }
    const newData = { ...data, setup:{ wardName:setupForm.wardName, appointmentType:setupForm.appointmentType, bedCount:count, themeColor:setupForm.themeColor, students, consultants }, beds };
    setData(newData); await save(newData); setView("home");
    showToast("Ward configured!");
  };

  const addField      = (f)     => setSetupForm(p => ({ ...p, [f]: f==="students" ? [...p[f],{name:"",group:""}] : [...p[f],""] }));
  const updateField   = (f,i,v) => setSetupForm(p => { const a=[...p[f]]; a[i]=v; return {...p,[f]:a}; });
  const removeField   = (f,i)   => setSetupForm(p => ({ ...p, [f]:p[f].filter((_,idx)=>idx!==i) }));
  const updateStudent = (i,k,v) => setSetupForm(p => { const a=[...p.students]; a[i]={...a[i],[k]:v}; return {...p,students:a}; });

  // ── PIN ────────────────────────────────────────────────────────────────────
  const tryPin = () => {
    if (pinInput===LEADER_PIN) { setIsLeader(true); setShowPinModal(false); setPinInput(""); setPinError(false); showToast("Leader access granted"); }
    else { setPinError(true); setTimeout(()=>setPinError(false),1500); }
  };

  // ── BED OPS ────────────────────────────────────────────────────────────────
  const toggleFlag = async (bedNum, flag) => {
    const newData = { ...data, beds:{ ...data.beds, [bedNum]:{ ...data.beds[bedNum], [flag]:!data.beds[bedNum][flag] } } };
    setData(newData); await save(newData);
  };

  const assignStudents = async (bedNum, assigned, shadows) => {
    const newData = { ...data, beds:{ ...data.beds, [bedNum]:{ ...data.beds[bedNum], assigned, shadows } } };
    setData(newData); await save(newData); setAssignModal(null);
    setView("home"); setSelectedBed(null);
    showToast("Students assigned");
  };

  const saveBedEdit = async (bedNum) => {
    const newData = { ...data, beds:{ ...data.beds, [bedNum]:{ ...data.beds[bedNum], ...bedEdit } } };
    setData(newData); await save(newData);
  };

  const toggleHistory = async (bedNum) => {
    const bed = data.beds[bedNum];
    const newHistoryTaken = !bed.historyTaken;
    const updates = { historyTaken:newHistoryTaken };
    if (newHistoryTaken) updates.isNew = false;
    const newData = { ...data, beds:{ ...data.beds, [bedNum]:{ ...bed, ...updates } } };
    setData(newData); await save(newData);
    setBedEdit(b => ({...b, historyTaken:newHistoryTaken}));
  };

  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const clearBed = async (bedNum) => {
    const bed = data.beds[bedNum];
    const cleared = { ...bed, assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:false };
    const newData = { ...data, beds:{ ...data.beds, [bedNum]: cleared } };
    setData(newData); await save(newData);
    setBedEdit({ consultant:"", diagnosis:"", notes:"", historyTaken:false });
    setShowClearConfirm(false);
    showToast("Bed cleared");
  };

  const addFloorPatient = async () => {
    const beds = { ...data.beds };
    const floorKeys = Object.keys(beds).filter(k=>beds[k].isFloor);
    const key = `F${floorKeys.length+1}`;
    beds[key] = { assigned:[], shadows:[], consultant:"", diagnosis:"", notes:"", historyTaken:false, isNew:true, isFloor:true };
    const newData = { ...data, beds };
    setData(newData); await save(newData); showToast("Floor patient added");
  };

  const removeFloorPatient = async (bedNum) => {
    const beds = { ...data.beds };
    delete beds[bedNum];
    const newData = { ...data, beds };
    setData(newData); await save(newData);
    setView("home"); setSelectedBed(null);
    showToast("Floor patient removed");
  };

  const resetSetup = async () => {
    const fresh = initialData();
    setData(fresh); await save(fresh);
    setSetupForm({ wardName:"", appointmentType:"", bedCount:"", themeColor:"#007aff", students:[{name:"",group:""}], consultants:[""] });
    setView("setup"); setShowSetupReset(false); setIsLeader(false);
  };

  // ── DERIVED ────────────────────────────────────────────────────────────────
  const beds    = data.beds  || {};
  const setup   = data.setup || {};
  const bedKeys = Object.keys(beds).sort((a,b) => {
    const af=isNaN(a),bf=isNaN(b);
    if(af&&!bf) return 1; if(!af&&bf) return -1;
    if(!af&&!bf) return Number(a)-Number(b);
    return a.localeCompare(b);
  });

  const stats = {
    newPt:        bedKeys.filter(k=>beds[k]?.isNew).length,
    historyTaken: bedKeys.filter(k=>beds[k]?.historyTaken).length,
    floor:        bedKeys.filter(k=>beds[k]?.isFloor).length,
  };

  if (view==="loading") return (
    <div style={{display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:C.bg,color:C.textSub,fontFamily:"-apple-system,BlinkMacSystemFont,'SF Pro Text','Helvetica Neue',sans-serif",fontSize:"0.9rem"}}>
      Loading…
    </div>
  );

  // ── SETUP VIEW ─────────────────────────────────────────────────────────────
  if (view==="setup") return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:SF,padding:"0 0 60px"}}>
      <div style={{maxWidth:520,margin:"0 auto",padding:"52px 20px 20px"}}>
        <div style={{textAlign:"center",marginBottom:40}}>
          <div style={{width:52,height:52,borderRadius:14,background:`rgba(${hexToRgb(setupForm.themeColor)},0.1)`,border:`1px solid rgba(${hexToRgb(setupForm.themeColor)},0.2)`,display:"flex",alignItems:"center",justifyContent:"center",margin:"0 auto 16px"}}>
            <Icon name="settings" size={22} color={setupForm.themeColor}/>
          </div>
          <h1 style={{fontSize:"1.75rem",fontWeight:700,letterSpacing:"-0.04em",margin:0,color:C.text}}>Ward Setup</h1>
          <p style={{color:C.textSub,fontSize:"0.88rem",marginTop:6,fontWeight:400}}>Configure your ward for this rotation</p>
        </div>

        <SetupField label="Ward Name" value={setupForm.wardName} onChange={v=>setSetupForm(f=>({...f,wardName:v}))} placeholder="e.g. Obs & Gynae Ward B" theme={setupForm.themeColor}/>
        <SetupField label="Rotation / Appointment Type" value={setupForm.appointmentType} onChange={v=>setSetupForm(f=>({...f,appointmentType:v}))} placeholder="e.g. Obstetrics – Week 3" theme={setupForm.themeColor}/>
        <SetupField label="Number of Beds" value={setupForm.bedCount} onChange={v=>setSetupForm(f=>({...f,bedCount:v}))} placeholder="e.g. 20" type="number" theme={setupForm.themeColor}/>

        <div style={{marginBottom:24}}>
          <label style={labelStyle}>Accent Colour</label>
          <div style={{display:"flex",alignItems:"center",gap:12,marginTop:8,background:C.surface,border:`1px solid ${C.border}`,borderRadius:12,padding:"10px 14px",boxShadow:C.shadow}}>
            <input type="color" value={setupForm.themeColor} onChange={e=>setSetupForm(f=>({...f,themeColor:e.target.value}))}
              style={{width:40,height:40,border:"none",borderRadius:8,cursor:"pointer",padding:0,background:"none"}}/>
            <div style={{flex:1,height:8,borderRadius:4,background:`linear-gradient(90deg,${C.surfaceEl},${setupForm.themeColor})`}}/>
            <span style={{fontSize:"0.75rem",color:C.textMuted,fontFamily:"monospace"}}>{setupForm.themeColor}</span>
          </div>
        </div>

        {/* Students */}
        <div style={{marginBottom:24}}>
          <label style={labelStyle}>Students</label>
          <div style={{display:"grid",gridTemplateColumns:"1fr 56px",gap:4,marginTop:8,marginBottom:4,paddingLeft:2}}>
            <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em"}}>NAME</span>
            <span style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.05em",textAlign:"center"}}>GRP</span>
          </div>
          {setupForm.students.map((s,i) => (
            <div key={i} style={{display:"flex",gap:6,marginTop:6}}>
              <input value={s.name} onChange={e=>updateStudent(i,"name",e.target.value)} placeholder={`Student ${i+1}`} style={{...iS,flex:1,padding:"10px 12px"}}/>
              <input value={s.group} onChange={e=>updateStudent(i,"group",e.target.value)} placeholder="1" style={{...iS,width:48,padding:"10px 8px",textAlign:"center",flexShrink:0}}/>
              {setupForm.students.length>1 && <button onClick={()=>removeField("students",i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
            </div>
          ))}
          <button onClick={()=>addField("students")} style={aMB}>
            <Icon name="plus" size={12} color={C.textSub}/> Add Student
          </button>
        </div>

        {/* Consultants */}
        <div style={{marginBottom:32}}>
          <label style={labelStyle}>Consultants</label>
          {setupForm.consultants.map((c,i) => (
            <div key={i} style={{display:"flex",gap:6,marginTop:8}}>
              <input value={c} onChange={e=>updateField("consultants",i,e.target.value)} placeholder="Name or title" style={{...iS,flex:1}}/>
              {setupForm.consultants.length>1 && <button onClick={()=>removeField("consultants",i)} style={rB}><Icon name="close" size={12} color={C.textMuted}/></button>}
            </div>
          ))}
          <button onClick={()=>addField("consultants")} style={aMB}>
            <Icon name="plus" size={12} color={C.textSub}/> Add Consultant
          </button>
        </div>

        <button onClick={handleSetupSubmit} style={{background:setupForm.themeColor,border:"none",color:"#fff",borderRadius:12,cursor:"pointer",fontWeight:600,fontFamily:SF,fontSize:"0.95rem",width:"100%",padding:"15px",letterSpacing:"-0.01em",boxShadow:`0 4px 14px rgba(${hexToRgb(setupForm.themeColor)},0.35)`}}>
          Create Ward
        </button>
      </div>
    </div>
  );

  // ── HOME VIEW ──────────────────────────────────────────────────────────────
  const selBed = selectedBed ? beds[selectedBed] : null;

  return (
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:SF,"--accent":theme,"--accent-rgb":rgb}}>

      {/* Header */}
      <div style={{background:"rgba(245,245,247,0.88)",borderBottom:`1px solid ${C.border}`,padding:"12px 18px",position:"sticky",top:0,zIndex:50,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
          <div style={{display:"flex",flexDirection:"column",gap:1}}>
            <div style={{display:"flex",alignItems:"center",gap:5}}>
              <h1 style={{margin:0,fontSize:"0.72rem",fontWeight:600,color:C.text,letterSpacing:"0.01em"}}>{setup.wardName}</h1>
            </div>
            <div style={{fontSize:"1.56rem",color:C.textSub,marginTop:4,fontWeight:400}}>{setup.appointmentType}</div>
          </div>
          <div style={{display:"flex",gap:8,alignItems:"center"}}>
            {isLeader
              ? <span style={{background:theme,color:"#fff",fontSize:"0.62rem",fontWeight:600,padding:"4px 10px",borderRadius:20,letterSpacing:"0.04em"}}>LEADER</span>
              : <button onClick={()=>setShowPinModal(true)} style={{display:"flex",alignItems:"center",gap:5,background:C.surface,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:20,padding:"5px 12px",fontSize:"0.72rem",cursor:"pointer",fontFamily:SF,boxShadow:C.shadow}}>
                  <Icon name="key" size={12} color={C.textSub}/> Login
                </button>
            }
            {isLeader && <button onClick={()=>setShowSetupReset(true)} style={{display:"flex",alignItems:"center",justifyContent:"center",background:C.surface,border:`1px solid ${C.border}`,color:C.textMuted,borderRadius:50,width:32,height:32,cursor:"pointer",boxShadow:C.shadow}}>
              <Icon name="settings" size={14} color={C.textMuted}/>
            </button>}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{borderBottom:`1px solid ${C.border}`,background:"rgba(245,245,247,0.88)",position:"sticky",top:"53px",zIndex:49,backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)"}}>
        <div style={{maxWidth:700,margin:"0 auto",display:"flex",padding:"0 16px"}}>
          {[{id:"ward",label:"Ward"},{id:"students",label:"Students"}].map(t=>(
            <button key={t.id} onClick={()=>setActiveTab(t.id)}
              style={{padding:"11px 16px",fontSize:"0.8rem",fontWeight:500,fontFamily:SF,background:"none",border:"none",cursor:"pointer",
                color: activeTab===t.id ? theme : C.textMuted,
                borderBottom: activeTab===t.id ? `2px solid ${theme}` : "2px solid transparent",
                marginBottom:"-1px", transition:"color 0.15s", letterSpacing:"-0.01em"}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{maxWidth:700,margin:"0 auto",padding:"20px 16px 100px"}}>

        {activeTab==="ward" && <>

          {/* Stats bar */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:24}}>
            {[
              { key:"newPt",        label:"New",     icon:"newdot",  color:C.red   },
              { key:"historyTaken", label:"History", icon:"history", color:C.green },
              { key:"floor",        label:"Floor",   icon:"floor",   color:theme   },
            ].map(s => (
              <div key={s.key} style={{background:C.surface,border:"1px solid rgba(0,0,0,0.08)",borderRadius:14,padding:"12px 10px",textAlign:"center",boxShadow:"0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)"}}>
                <div style={{display:"flex",justifyContent:"center",marginBottom:5}}><Icon name={s.icon} size={14} color={s.color}/></div>
                <div style={{fontSize:"1.4rem",fontWeight:700,color:s.color,letterSpacing:"-0.04em"}}>{stats[s.key]}</div>
                <div style={{fontSize:"0.6rem",color:C.textSub,marginTop:2,letterSpacing:"0.04em",textTransform:"uppercase",fontWeight:600}}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Leader action */}
          {isLeader && (
            <button onClick={addFloorPatient} style={{display:"flex",alignItems:"center",justifyContent:"center",gap:8,width:"100%",padding:"11px",fontSize:"0.84rem",marginBottom:20,background:C.surface,border:`1px solid ${C.border}`,color:theme,borderRadius:12,cursor:"pointer",fontFamily:SF,fontWeight:500,boxShadow:C.shadow}}>
              <Icon name="floor" size={14} color={theme}/> Add Floor Patient
            </button>
          )}

          {/* Bed grid */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(148px,1fr))",gap:10}}>
            {bedKeys.map(bedNum => {
              const bed = beds[bedNum];
              const hasAssigned = bed.assigned?.length>0;
              const hasShadow   = bed.shadows?.length>0;
              const filled = hasAssigned || bed.diagnosis || bed.consultant;
              return (
                <div key={bedNum}
                  onClick={()=>{ setSelectedBed(bedNum); setBedEdit({consultant:bed.consultant||"",diagnosis:bed.diagnosis||"",notes:bed.notes||"",historyTaken:!!bed.historyTaken}); setView("bed"); }}
                  style={{
                    background: bed.historyTaken ? `rgba(${hexToRgb(C.green)},0.06)` : C.surface,
                    border: bed.historyTaken ? `1px solid rgba(${hexToRgb(C.green)},0.2)` : `1px solid rgba(0,0,0,${filled ? 0.1 : 0.08})`,
                    boxShadow: bed.historyTaken ? `0 4px 16px rgba(${hexToRgb(C.green)},0.1), 0 1px 3px rgba(0,0,0,0.06)` : filled ? "0 6px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)" : "0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)",
                    borderRadius:14, padding:"12px 11px", cursor:"pointer", position:"relative",
                    transition:"transform 0.12s, box-shadow 0.12s", userSelect:"none",
                  }}
                  onMouseEnter={e=>{e.currentTarget.style.transform="translateY(-3px)";e.currentTarget.style.boxShadow="0 12px 28px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)";}}
                  onMouseLeave={e=>{e.currentTarget.style.transform="translateY(0)";e.currentTarget.style.boxShadow=filled?"0 6px 20px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.05)":"0 2px 10px rgba(0,0,0,0.06), 0 1px 3px rgba(0,0,0,0.04)";}}
                >
                  {/* Indicators */}
                  <div style={{position:"absolute",top:9,right:9,display:"flex",gap:4,alignItems:"center"}}>
                    {bed.historyTaken && <Icon name="history" size={11} color={C.green}/>}
                    {bed.isNew && <span style={{display:"inline-flex",animation:"blink 1.2s ease-in-out infinite"}}><Icon name="newdot" size={10} color={C.red}/></span>}
                  </div>

                  <div style={{fontSize:"0.58rem",color:C.textMuted,marginBottom:3,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:600}}>{bed.isFloor?"Floor":"Bed"}</div>
                  <div style={{fontSize:"1.25rem",fontWeight:700,color:theme,lineHeight:1,letterSpacing:"-0.03em"}}>{bedNum}</div>

                  {bed.diagnosis && <div style={{fontSize:"0.65rem",color:C.text,marginTop:5,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",fontWeight:500}}>{bed.diagnosis}</div>}
                  {bed.consultant && <div style={{fontSize:"0.62rem",color:C.textSub,marginTop:2,fontWeight:500}}>{bed.consultant}</div>}
                  {bed.notes && <div style={{fontSize:"0.6rem",color:C.textSub,marginTop:4,lineHeight:1.35,display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{bed.notes}</div>}

                  {/* Student chips */}
                  {(hasAssigned||hasShadow) && (
                    <div style={{marginTop:7,display:"flex",flexWrap:"wrap",gap:3}}>
                      {(bed.assigned||[]).map((s,i)=>{ const n=typeof s==="object"?s.name:s; const g=typeof s==="object"?s.group:""; return(
                        <span key={i} style={{fontSize:"0.58rem",background:`rgba(${rgb},0.08)`,border:`1px solid rgba(${rgb},0.18)`,borderRadius:5,padding:"2px 5px",color:theme,display:"inline-flex",alignItems:"baseline",gap:2,fontWeight:500}}>
                          {n.split(" ")[0]}{g && <span style={{fontSize:"0.45rem",lineHeight:1,position:"relative",top:"-1px",color:`rgba(${rgb},0.6)`}}>{g}</span>}
                        </span>
                      );})}
                      {(bed.shadows||[]).map((s,i)=>{ const n=typeof s==="object"?s.name:s; const g=typeof s==="object"?s.group:""; return(
                        <span key={i} style={{fontSize:"0.58rem",background:"rgba(0,0,0,0.03)",border:"1px dashed rgba(0,0,0,0.12)",borderRadius:5,padding:"2px 5px",color:C.textMuted,display:"inline-flex",alignItems:"baseline",gap:2}}>
                          {n.split(" ")[0]}{g && <span style={{fontSize:"0.45rem",lineHeight:1,position:"relative",top:"-1px"}}>{g}</span>}
                        </span>
                      );})}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>}

        {activeTab==="students" && <StudentsTab beds={beds} bedKeys={bedKeys} students={setup.students||[]} theme={theme} rgb={rgb}/>}
      </div>

      {/* ── BED DETAIL SHEET ── */}
      {view==="bed" && selectedBed && selBed && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.25)",zIndex:100,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>{if(e.target===e.currentTarget){setView("home");setSelectedBed(null);setShowClearConfirm(false);}}}>
          <div style={{width:"100%",maxHeight:"88vh",overflowY:"auto",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",boxShadow:"0 -4px 40px rgba(0,0,0,0.12)"}}>
            <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 22px"}}/>

            <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",marginBottom:20}}>
              <div>
                <div style={{fontSize:"0.62rem",color:C.textMuted,letterSpacing:"0.07em",textTransform:"uppercase",fontWeight:500}}>{selBed.isFloor?"Floor Patient":"Bed"}</div>
                <h2 style={{margin:"3px 0 0",fontSize:"2rem",fontWeight:700,color:theme,letterSpacing:"-0.04em"}}>{selectedBed}</h2>
              </div>
              <button onClick={()=>{setView("home");setSelectedBed(null);setShowClearConfirm(false);}} style={{background:C.surfaceEl,border:"none",color:C.textSub,borderRadius:50,width:32,height:32,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",marginTop:4}}>
                <Icon name="close" size={13} color={C.textSub}/>
              </button>
            </div>

            {/* Leader controls */}
            {isLeader && (
              <div style={{display:"flex",gap:8,marginBottom:18}}>
                <button onClick={()=>setAssignModal(selectedBed)}
                  style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",gap:6,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"10px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF,fontWeight:600}}>
                  <Icon name="user" size={12} color="#fff"/> Assign
                </button>
                {selBed.isFloor && (
                  <button onClick={()=>removeFloorPatient(selectedBed)}
                    style={{display:"flex",alignItems:"center",justifyContent:"center",background:`rgba(${hexToRgb(C.red)},0.07)`,border:`1px solid ${C.red}`,color:C.red,borderRadius:10,padding:"10px 12px",fontSize:"0.78rem",cursor:"pointer",fontFamily:SF}}>
                    <Icon name="close" size={13} color={C.red}/>
                  </button>
                )}
              </div>
            )}

            {/* New patient toggle — visible to all */}
            <div onClick={()=>toggleFlag(selectedBed,"isNew")}
              style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:selBed.isNew?`rgba(${hexToRgb(C.red)},0.06)`:C.surfaceEl,border:`1px solid ${selBed.isNew?`rgba(${hexToRgb(C.red)},0.3)`:C.border}`,borderRadius:13,cursor:"pointer",marginBottom:10,userSelect:"none"}}>
              <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${selBed.isNew?C.red:C.borderMid}`,background:selBed.isNew?C.red:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                {selBed.isNew && <Icon name="check" size={12} color="#fff"/>}
              </div>
              <div>
                <div style={{fontSize:"0.88rem",color:selBed.isNew?C.red:C.text,fontWeight:500}}>New Patient</div>
                <div style={{fontSize:"0.7rem",color:C.textMuted,marginTop:1}}>Tap to toggle</div>
              </div>
              <div style={{marginLeft:"auto"}}><Icon name="newdot" size={14} color={selBed.isNew?C.red:C.textMuted}/></div>
            </div>

            {/* History checkbox */}
            <div onClick={()=>toggleHistory(selectedBed)}
              style={{display:"flex",alignItems:"center",gap:12,padding:"13px 14px",background:bedEdit.historyTaken?`rgba(${hexToRgb(C.green)},0.07)`:C.surfaceEl,border:`1px solid ${bedEdit.historyTaken?`rgba(${hexToRgb(C.green)},0.3)`:C.border}`,borderRadius:13,cursor:"pointer",marginBottom:20,userSelect:"none"}}>
              <div style={{width:22,height:22,borderRadius:7,border:`2px solid ${bedEdit.historyTaken?C.green:C.borderMid}`,background:bedEdit.historyTaken?C.green:"none",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                {bedEdit.historyTaken && <Icon name="check" size={12} color="#fff"/>}
              </div>
              <div>
                <div style={{fontSize:"0.88rem",color:bedEdit.historyTaken?C.green:C.text,fontWeight:500}}>History Taken</div>
                <div style={{fontSize:"0.7rem",color:C.textMuted,marginTop:1}}>Tap to toggle</div>
              </div>
              <div style={{marginLeft:"auto"}}><Icon name="history" size={14} color={bedEdit.historyTaken?C.green:C.textMuted}/></div>
            </div>

            {/* Assigned students */}
            {(selBed.assigned?.length>0||selBed.shadows?.length>0) && (
              <div style={{marginBottom:18}}>
                <div style={{fontSize:"0.62rem",color:C.textMuted,marginBottom:8,letterSpacing:"0.05em",textTransform:"uppercase",fontWeight:500}}>Assigned</div>
                <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                  {(selBed.assigned||[]).map((s,i)=>{ const n=typeof s==="object"?s.name:s; const g=typeof s==="object"?s.group:""; return(
                    <span key={i} style={{display:"flex",alignItems:"center",gap:5,background:`rgba(${rgb},0.09)`,border:`1px solid rgba(${rgb},0.2)`,color:theme,borderRadius:8,padding:"5px 10px",fontSize:"0.78rem",fontWeight:500}}>
                      <Icon name="user" size={11} color={theme}/>{n}{g&&<span style={{fontSize:"0.6rem",color:`rgba(${rgb},0.5)`,marginLeft:2}}>·{g}</span>}
                    </span>
                  );})}
                  {(selBed.shadows||[]).map((s,i)=>{ const n=typeof s==="object"?s.name:s; const g=typeof s==="object"?s.group:""; return(
                    <span key={i} style={{display:"flex",alignItems:"center",gap:5,background:C.surfaceEl,border:`1px dashed ${C.borderMid}`,color:C.textSub,borderRadius:8,padding:"5px 10px",fontSize:"0.78rem"}}>
                      <Icon name="shadow" size={11} color={C.textMuted}/>{n}{g&&<span style={{fontSize:"0.6rem",color:C.textMuted,marginLeft:2}}>·{g}</span>} <span style={{fontSize:"0.65rem",color:C.textMuted}}>(shadow)</span>
                    </span>
                  );})}
                </div>
              </div>
            )}

            {/* Consultant */}
            <div style={{marginBottom:16}}>
              <label style={labelStyle}>Consultant</label>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginTop:8}}>
                {(setup.consultants||[]).length>0
                  ? (setup.consultants||[]).map(c=>(
                      <button key={c} onClick={()=>setBedEdit(b=>({...b,consultant:b.consultant===c?"":c}))}
                        style={{background:bedEdit.consultant===c?theme:C.surfaceEl,border:`1px solid ${bedEdit.consultant===c?theme:C.border}`,color:bedEdit.consultant===c?"#fff":C.textSub,borderRadius:8,padding:"7px 13px",fontSize:"0.8rem",cursor:"pointer",fontFamily:SF,fontWeight:bedEdit.consultant===c?600:400,transition:"all 0.12s"}}>
                        {c}
                      </button>
                    ))
                  : <input value={bedEdit.consultant} onChange={e=>setBedEdit(b=>({...b,consultant:e.target.value}))} placeholder="Consultant name" style={{...iS,width:"100%",boxSizing:"border-box"}}/>
                }
              </div>
            </div>

            {/* Diagnosis */}
            <div style={{marginBottom:16}}>
              <label style={labelStyle}>Diagnosis</label>
              <input value={bedEdit.diagnosis} onChange={e=>setBedEdit(b=>({...b,diagnosis:e.target.value}))} placeholder="Working diagnosis…"
                style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box"}}/>
            </div>

            {/* Notes */}
            <div style={{marginBottom:24}}>
              <label style={labelStyle}>Notes</label>
              <textarea value={bedEdit.notes} onChange={e=>setBedEdit(b=>({...b,notes:e.target.value}))} placeholder="Clinical notes, procedure, history…"
                rows={3} style={{...iS,marginTop:6,width:"100%",boxSizing:"border-box",resize:"vertical",fontFamily:SF}}/>
            </div>

            <button onClick={async()=>{await saveBedEdit(selectedBed);setView("home");setSelectedBed(null);}}
              style={{background:theme,border:"none",color:"#fff",borderRadius:13,cursor:"pointer",fontWeight:600,fontFamily:SF,fontSize:"0.95rem",width:"100%",padding:"14px",letterSpacing:"-0.01em",boxShadow:`0 4px 14px rgba(${rgb},0.3)`}}>
              Save
            </button>

            {/* Clear bed */}
            {!showClearConfirm
              ? <button onClick={()=>setShowClearConfirm(true)}
                  style={{marginTop:10,width:"100%",background:"none",border:`1px solid ${C.border}`,color:C.textMuted,borderRadius:13,padding:"12px",fontSize:"0.85rem",cursor:"pointer",fontFamily:SF}}>
                  Clear Bed Data
                </button>
              : <div style={{marginTop:10,background:`rgba(${hexToRgb(C.red)},0.05)`,border:`1px solid rgba(${hexToRgb(C.red)},0.25)`,borderRadius:13,padding:"14px"}}>
                  <p style={{margin:"0 0 12px",fontSize:"0.82rem",color:C.textSub,textAlign:"center"}}>Clear all patient data for this bed?</p>
                  <div style={{display:"flex",gap:8}}>
                    <button onClick={()=>setShowClearConfirm(false)}
                      style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"10px",cursor:"pointer",fontSize:"0.85rem",fontFamily:SF}}>
                      Cancel
                    </button>
                    <button onClick={()=>clearBed(selectedBed)}
                      style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"10px",cursor:"pointer",fontWeight:600,fontSize:"0.85rem",fontFamily:SF}}>
                      Clear
                    </button>
                  </div>
                </div>
            }
          </div>
        </div>
      )}

      {/* ── ASSIGN MODAL ── */}
      {assignModal && (
        <AssignModal bedNum={assignModal} students={setup.students||[]} currentAssigned={beds[assignModal]?.assigned||[]} currentShadows={beds[assignModal]?.shadows||[]} theme={theme} rgb={rgb} onConfirm={(a,s)=>assignStudents(assignModal,a,s)} onClose={()=>setAssignModal(null)}/>
      )}

      {/* ── PIN MODAL ── */}
      {showPinModal && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,boxShadow:C.shadowMd}}>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:6}}>
              <Icon name="key" size={16} color={theme}/>
              <h3 style={{margin:0,color:C.text,fontSize:"1.1rem",fontWeight:600}}>Leader Access</h3>
            </div>
            <p style={{margin:"0 0 18px",color:C.textSub,fontSize:"0.84rem"}}>Enter the leader PIN to unlock assignment controls.</p>
            <input type="password" value={pinInput} onChange={e=>setPinInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&tryPin()} placeholder="Enter PIN"
              style={{...iS,width:"100%",boxSizing:"border-box",fontSize:"1.1rem",letterSpacing:"0.2em",textAlign:"center",borderColor:pinError?C.red:undefined,animation:pinError?"shake 0.3s":"none"}}/>
            {pinError && <div style={{color:C.red,fontSize:"0.78rem",textAlign:"center",marginTop:6}}>Incorrect PIN</div>}
            <div style={{display:"flex",gap:10,marginTop:16}}>
              <button onClick={()=>{setShowPinModal(false);setPinInput("");}} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontSize:"0.88rem",fontFamily:SF}}>Cancel</button>
              <button onClick={tryPin} style={{flex:1,background:theme,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontSize:"0.88rem",fontFamily:SF}}>Unlock</button>
            </div>
          </div>
        </div>
      )}

      {/* ── RESET CONFIRM ── */}
      {showSetupReset && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(6px)"}}>
          <div style={{background:C.surface,border:`1px solid ${C.border}`,borderRadius:20,padding:"28px 24px",width:"100%",maxWidth:320,boxShadow:C.shadowMd}}>
            <h3 style={{margin:"0 0 8px",color:C.text,fontWeight:600}}>Start New Rotation?</h3>
            <p style={{margin:"0 0 18px",color:C.textSub,fontSize:"0.84rem"}}>This clears all patient data and restarts setup. Cannot be undone.</p>
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>setShowSetupReset(false)} style={{flex:1,background:C.surfaceEl,border:`1px solid ${C.border}`,color:C.textSub,borderRadius:10,padding:"11px",cursor:"pointer",fontFamily:SF}}>Cancel</button>
              <button onClick={resetSetup} style={{flex:1,background:C.red,border:"none",color:"#fff",borderRadius:10,padding:"11px",cursor:"pointer",fontWeight:600,fontFamily:SF}}>Reset Ward</button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div style={{position:"fixed",bottom:28,left:"50%",transform:"translateX(-50%)",background:toast.type==="error"?C.red:C.text,color:"#fff",borderRadius:12,padding:"9px 18px",fontSize:"0.82rem",zIndex:300,whiteSpace:"nowrap",boxShadow:"0 4px 20px rgba(0,0,0,0.15)",fontFamily:SF}}>
          {toast.msg}
        </div>
      )}

      {/* Branding bar */}
      <div style={{position:"fixed",bottom:0,left:0,right:0,zIndex:40,display:"flex",alignItems:"center",justifyContent:"space-between",padding:"6px 16px 8px",background:"rgba(245,245,247,0.85)",backdropFilter:"blur(12px)",WebkitBackdropFilter:"blur(12px)",borderTop:`1px solid rgba(0,0,0,0.06)`}}>
        <div style={{display:"flex",alignItems:"baseline",gap:0,opacity:0.25}}>
          <span style={{fontSize:"0.72rem",fontWeight:700,color:C.text,letterSpacing:"-0.04em",fontFamily:SF}}>Clinical</span>
          <span style={{fontSize:"0.72rem",fontWeight:300,color:theme,letterSpacing:"-0.02em",fontFamily:SF}}>Dashboard</span>
        </div>
        <img src={LOGO_B64} alt="logo" style={{height:16,opacity:0.18,filter:"grayscale(100%)",userSelect:"none",pointerEvents:"none"}}/>
      </div>

      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}25%{transform:translateX(-6px)}75%{transform:translateX(6px)}} @keyframes blink{0%,100%{opacity:1}50%{opacity:0.15}}`}</style>
    </div>
  );
}

// ── STUDENTS TAB ───────────────────────────────────────────────────────────────
function StudentsTab({ beds, bedKeys, students, theme, rgb }) {
  const [selected, setSelected] = useState(null);

  const sorted = [...students].sort((a,b) => {
    const ag=parseInt(a.group)||999, bg=parseInt(b.group)||999;
    return ag!==bg ? ag-bg : a.name.localeCompare(b.name);
  });

  const studentBeds = {};
  sorted.forEach(s => { studentBeds[s.name] = { primary:[], shadow:[] }; });
  bedKeys.forEach(bedNum => {
    const bed = beds[bedNum];
    (bed.assigned||[]).forEach(s => { const n=typeof s==="object"?s.name:s; if(studentBeds[n]) studentBeds[n].primary.push({bedNum,bed}); });
    (bed.shadows||[]).forEach(s  => { const n=typeof s==="object"?s.name:s; if(studentBeds[n]) studentBeds[n].shadow.push({bedNum,bed}); });
  });

  const BedPill = ({ bedNum, bed, type }) => (
    <div style={{background:type==="primary"?`rgba(${rgb},0.06)`:C.surfaceEl,border:`1px ${type==="primary"?"solid":"dashed"} ${type==="primary"?`rgba(${rgb},0.25)`:C.borderMid}`,borderRadius:12,padding:"12px 14px",marginBottom:8}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <span style={{fontSize:"0.58rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",fontWeight:500}}>{bed.isFloor?"Floor":"Bed"}</span>
          <span style={{fontSize:"1.1rem",fontWeight:700,color:theme,letterSpacing:"-0.03em"}}>{bedNum}</span>
          {type==="shadow" && <span style={{fontSize:"0.6rem",color:C.textMuted,border:`1px dashed ${C.borderMid}`,borderRadius:4,padding:"1px 5px"}}>shadow</span>}
        </div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          {bed.historyTaken && <Icon name="history" size={12} color={C.green}/>}
          {bed.isNew && <span style={{animation:"blink 1.2s ease-in-out infinite",display:"inline-flex"}}><Icon name="newdot" size={10} color={C.red}/></span>}
        </div>
      </div>
      {bed.diagnosis && <div style={{fontSize:"0.76rem",color:C.text,fontStyle:"italic",marginBottom:2}}>{bed.diagnosis}</div>}
      {bed.consultant && <div style={{fontSize:"0.72rem",color:C.textSub}}>{bed.consultant}</div>}
      {bed.notes && <div style={{fontSize:"0.7rem",color:C.textMuted,marginTop:6,lineHeight:1.4,borderTop:`1px solid ${C.border}`,paddingTop:6}}>{bed.notes}</div>}
    </div>
  );

  if (students.length===0) return (
    <div style={{textAlign:"center",padding:"60px 20px",color:C.textMuted,fontSize:"0.85rem"}}>No students added in setup.</div>
  );

  return (
    <div style={{display:"flex",flexDirection:"column",gap:8}}>
      {sorted.map(s => {
        const sb = studentBeds[s.name];
        const total = sb.primary.length + sb.shadow.length;
        const isOpen = selected===s.name;
        return (
          <div key={s.name}>
            <div onClick={()=>setSelected(isOpen?null:s.name)}
              style={{display:"flex",alignItems:"center",gap:10,padding:"13px 14px",background:C.surface,border:`1px solid ${isOpen?`rgba(${rgb},0.25)`:"rgba(0,0,0,0.08)"}`,borderRadius:isOpen?"14px 14px 0 0":14,cursor:"pointer",userSelect:"none",transition:"all 0.15s",boxShadow:isOpen?"none":"0 4px 14px rgba(0,0,0,0.07), 0 1px 3px rgba(0,0,0,0.05)"}}>
              {s.group && <span style={{fontSize:"0.58rem",color:C.textMuted,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:5,padding:"2px 6px",fontFamily:"monospace",flexShrink:0,fontWeight:500}}>{s.group}</span>}
              <span style={{flex:1,fontSize:"0.9rem",color:C.text,fontWeight:isOpen?600:400}}>{s.name}</span>
              {/* Bed chips */}
              <div style={{display:"flex",flexWrap:"wrap",gap:4,justifyContent:"flex-end",maxWidth:180}}>
                {sb.primary.map(({bedNum,bed})=>(
                  <span key={bedNum} style={{fontSize:"0.68rem",fontWeight:600,background:`rgba(${rgb},0.1)`,border:`1px solid rgba(${rgb},0.25)`,color:theme,borderRadius:6,padding:"2px 7px",position:"relative",letterSpacing:"-0.01em"}}>
                    {bedNum}
                    {bed.isNew && <span style={{position:"absolute",top:-3,right:-3,animation:"blink 1.2s ease-in-out infinite",display:"inline-flex"}}><Icon name="newdot" size={7} color={C.red}/></span>}
                  </span>
                ))}
                {sb.shadow.map(({bedNum})=>(
                  <span key={"s"+bedNum} style={{fontSize:"0.68rem",fontWeight:500,background:C.surfaceEl,border:`1px dashed ${C.borderMid}`,color:C.textMuted,borderRadius:6,padding:"2px 7px",letterSpacing:"-0.01em"}}>
                    {bedNum}
                  </span>
                ))}
                {total===0 && <span style={{fontSize:"0.68rem",color:C.textMuted}}>—</span>}
              </div>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{transition:"transform 0.2s",transform:isOpen?"rotate(180deg)":"rotate(0deg)",flexShrink:0,marginLeft:4}}>
                <path d="M2 4l4 4 4-4" stroke={C.textMuted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            {isOpen && (
              <div style={{background:C.surfaceEl,border:`1px solid rgba(${rgb},0.2)`,borderTop:"none",borderRadius:"0 0 14px 14px",padding:"12px 14px 14px"}}>
                {total===0
                  ? <div style={{color:C.textMuted,fontSize:"0.8rem",textAlign:"center",padding:"12px 0"}}>No beds assigned yet</div>
                  : <>
                      {sb.primary.length>0 && <>
                        <div style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8,fontWeight:500}}>Primary</div>
                        {sb.primary.map(({bedNum,bed})=><BedPill key={bedNum} bedNum={bedNum} bed={bed} type="primary"/>)}
                      </>}
                      {sb.shadow.length>0 && <>
                        <div style={{fontSize:"0.6rem",color:C.textMuted,letterSpacing:"0.06em",textTransform:"uppercase",marginBottom:8,marginTop:sb.primary.length>0?12:0,fontWeight:500}}>Shadow</div>
                        {sb.shadow.map(({bedNum,bed})=><BedPill key={bedNum} bedNum={bedNum} bed={bed} type="shadow"/>)}
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

// ── ASSIGN MODAL ───────────────────────────────────────────────────────────────
function AssignModal({ bedNum, students, currentAssigned, currentShadows, theme, rgb, onConfirm, onClose }) {
  const [assigned, setAssigned] = useState(currentAssigned);
  const [shadows, setShadows]   = useState(currentShadows);

  const sorted = [...students].sort((a,b) => {
    const ag=parseInt(a.group)||999,bg=parseInt(b.group)||999;
    return ag!==bg?ag-bg:a.name.localeCompare(b.name);
  });

  const getName = s => typeof s==="object"?s.name:s;
  const isAssigned = s => assigned.some(x=>getName(x)===getName(s));
  const isShadow   = s => shadows.some(x=>getName(x)===getName(s));

  const toggleAssigned = s => {
    const k=getName(s);
    if(isAssigned(s)){setAssigned(a=>a.filter(x=>getName(x)!==k));return;}
    setShadows(sh=>sh.filter(x=>getName(x)!==k)); setAssigned(a=>[...a,s]);
  };
  const toggleShadow = s => {
    const k=getName(s);
    if(isShadow(s)){setShadows(sh=>sh.filter(x=>getName(x)!==k));return;}
    setAssigned(a=>a.filter(x=>getName(x)!==k)); setShadows(sh=>[...sh,s]);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.2)",zIndex:200,display:"flex",alignItems:"flex-end",backdropFilter:"blur(4px)"}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{width:"100%",background:C.surface,borderRadius:"22px 22px 0 0",padding:"10px 20px 44px",maxHeight:"75vh",overflowY:"auto",boxShadow:"0 -4px 40px rgba(0,0,0,0.1)"}}>
        <div style={{width:36,height:4,borderRadius:2,background:C.border,margin:"10px auto 20px"}}/>
        <h3 style={{margin:"0 0 6px",color:C.text,fontSize:"1.05rem",fontWeight:600}}>Assign Students — Bed {bedNum}</h3>
        <div style={{display:"flex",gap:16,marginBottom:14}}>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:"0.72rem",color:C.textSub}}>
            <div style={{width:12,height:12,borderRadius:3,background:`rgba(${rgb},0.2)`,border:`1px solid rgba(${rgb},0.4)`}}/>Primary
          </div>
          <div style={{display:"flex",alignItems:"center",gap:6,fontSize:"0.72rem",color:C.textSub}}>
            <div style={{width:12,height:12,borderRadius:3,border:`1px dashed ${C.borderMid}`}}/>Shadow
          </div>
        </div>
        {sorted.length===0
          ? <p style={{color:C.textMuted,fontSize:"0.82rem"}}>No students in setup.</p>
          : <div style={{display:"flex",flexDirection:"column",gap:7}}>
              {sorted.map(s => {
                const ip=isAssigned(s), is=isShadow(s);
                return (
                  <div key={getName(s)} style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",background:ip?`rgba(${rgb},0.07)`:is?C.surfaceEl:C.surface,border:`1px solid ${ip?`rgba(${rgb},0.3)`:is?C.borderMid:C.border}`,borderRadius:12}}>
                    {s.group && <span style={{fontSize:"0.58rem",color:C.textMuted,background:C.surfaceEl,border:`1px solid ${C.border}`,borderRadius:4,padding:"2px 5px",fontFamily:"monospace",flexShrink:0}}>{s.group}</span>}
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

// ── Style helpers ──────────────────────────────────────────────────────────────
const SF = "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', sans-serif";
const labelStyle = { fontSize:"0.68rem", color:C.textSub, letterSpacing:"0.04em", textTransform:"uppercase", display:"block", fontWeight:600, fontFamily:SF };
const iS = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, color:C.text, padding:"11px 14px", fontSize:"0.88rem", outline:"none", fontFamily:SF, boxShadow:C.shadow };
const rB = { background:C.surfaceEl, border:`1px solid ${C.border}`, color:C.textMuted, borderRadius:8, padding:"0 12px", cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", height:42 };
const aMB = { marginTop:10, background:"none", border:`1px dashed ${C.border}`, color:C.textSub, borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:"0.78rem", width:"100%", display:"flex", alignItems:"center", justifyContent:"center", gap:6, fontFamily:SF };

function SetupField({ label, value, onChange, placeholder, type="text", theme }) {
  return (
    <div style={{marginBottom:18}}>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
        style={{...iS, width:"100%", boxSizing:"border-box", marginTop:6}}/>
    </div>
  );
}
