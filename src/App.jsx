import { useState, useEffect, useRef } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const gMonthKey = d => { const dt=new Date(d); return `${dt.getFullYear()}-${dt.getMonth()}`; };
const gMonthLabel = k => { const [y,m]=k.split("-"); return `${MONTHS[+m]} ${y}`; };
const complete = o => o.reportsReady && o.paid && o.emailed;

const TYPES = [
  { key:"peptide",   label:"Peptide",   short:"PEP", color:"#94a3b8", glow:"rgba(148,163,184,0.15)", badge:"rgba(148,163,184,0.12)", border:"rgba(148,163,184,0.2)" },
  { key:"endotoxin", label:"Endotoxin", short:"END", color:"#60a5fa", glow:"rgba(96,165,250,0.15)",  badge:"rgba(59,130,246,0.12)",  border:"rgba(96,165,250,0.25)" },
  { key:"sterility", label:"Sterility", short:"STE", color:"#a78bfa", glow:"rgba(167,139,250,0.15)", badge:"rgba(139,92,246,0.12)",  border:"rgba(167,139,250,0.25)" },
];

const STATUS = {
  complete:     { label:"Complete",     color:"#34d399", bg:"rgba(52,211,153,0.1)",  border:"rgba(52,211,153,0.2)",  dot:"#34d399" },
  reports_done: { label:"Reports Done", color:"#fbbf24", bg:"rgba(251,191,36,0.1)",  border:"rgba(251,191,36,0.2)",  dot:"#fbbf24" },
  pending:      { label:"Pending",      color:"#f87171", bg:"rgba(248,113,113,0.1)", border:"rgba(248,113,113,0.2)", dot:"#f87171" },
};

function getStatus(o) {
  if (complete(o)) return STATUS.complete;
  if (o.reportsReady) return STATUS.reports_done;
  return STATUS.pending;
}

function InlineEdit({ value, onChange, type="text", placeholder="—", mono=false }) {
  const [on, setOn] = useState(false);
  const [draft, setDraft] = useState(String(value ?? ""));
  const ref = useRef(null);
  useEffect(() => { if (on && ref.current) ref.current.select(); }, [on]);

  function commit() {
    setOn(false);
    const v = type==="number" ? (parseInt(draft)||0) : draft;
    if (String(v) !== String(value)) onChange(v);
  }

  const ff = mono ? "'IBM Plex Mono', monospace" : "inherit";

  if (on) return (
    <input ref={ref} autoFocus type={type} value={draft}
      onChange={e => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if(e.key==="Enter") commit(); if(e.key==="Escape"){setDraft(String(value));setOn(false);} }}
      style={{
        border:"none", borderBottom:"1.5px solid #3b82f6", outline:"none",
        background:"transparent", fontFamily:ff, fontSize:"inherit",
        color:"inherit", padding:"0 2px",
        width: type==="number" ? 46 : "100%",
        minWidth: type==="number" ? 46 : 60,
      }}
    />
  );

  const empty = value==null || value==="" || (type==="number" && (value===0||value==="0"));
  return (
    <span onClick={() => { setDraft(String(value??"")); setOn(true); }}
      title="Click to edit"
      style={{ cursor:"text", fontFamily:ff, color: (empty && placeholder==="—") ? "#3f4a5c" : "inherit" }}>
      {empty && placeholder==="—" ? "—" : String(value)}
    </span>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <button onClick={() => onChange(!value)} title={label}
      style={{
        display:"inline-flex", alignItems:"center", justifyContent:"center",
        width:30, height:30, borderRadius:7,
        border: value ? "1px solid rgba(52,211,153,0.4)" : "1px solid rgba(255,255,255,0.08)",
        background: value ? "rgba(52,211,153,0.12)" : "rgba(255,255,255,0.03)",
        color: value ? "#34d399" : "#3f4a5c",
        cursor:"pointer", fontSize:13, fontWeight:700,
        transition:"all 0.18s", flexShrink:0,
        boxShadow: value ? "0 0 10px rgba(52,211,153,0.15)" : "none",
      }}>
      {value ? "✓" : "✕"}
    </button>
  );
}

function Dot({ color, size=7 }) {
  return <span style={{ display:"inline-block", width:size, height:size, borderRadius:"50%", background:color, flexShrink:0, boxShadow:`0 0 6px ${color}88` }} />;
}

function StatBar({ segments }) {
  return (
    <div style={{ height:3, borderRadius:99, overflow:"hidden", display:"flex", background:"rgba(255,255,255,0.04)" }}>
      {segments.map((s,i) => (
        <div key={i} style={{ height:"100%", background:s.color, width:`${s.pct}%`, transition:"width 0.6s ease" }}/>
      ))}
    </div>
  );
}

// ── localStorage helpers ──────────────────────────────────────
const STORAGE_KEY = "so-tracker-orders-v5";

function loadOrders() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch(e) {
    return [];
  }
}

function saveOrders(orders) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(orders));
  } catch(e) {}
}
// ─────────────────────────────────────────────────────────────

export default function App() {
  const [orders, setOrders]   = useState(() => loadOrders());
  const [tab, setTab]         = useState("orders");
  const [modal, setModal]     = useState(false);
  const [search, setSearch]   = useState("");
  const [filter, setFilter]   = useState("all");
  const blank = { so:"", name:"", company:"", peptide:"", endotoxin:"", sterility:"" };
  const [form, setForm]       = useState(blank);

  // Save to localStorage every time orders change
  useEffect(() => {
    saveOrders(orders);
  }, [orders]);

  function add() {
    if (!form.so || !form.name) return;
    setOrders(p => [{
      id:Date.now().toString(), so:form.so, name:form.name, company:form.company,
      peptide:parseInt(form.peptide)||0, endotoxin:parseInt(form.endotoxin)||0, sterility:parseInt(form.sterility)||0,
      reportsReady:false, paid:false, emailed:false, createdAt:new Date().toISOString(),
    }, ...p]);
    setForm(blank); setModal(false);
  }

  function upd(id, f, v) { setOrders(p => p.map(o => o.id===id ? {...o,[f]:v} : o)); }
  function del(id) { if(confirm("Delete this order?")) setOrders(p=>p.filter(o=>o.id!==id)); }

  const nowKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
  const filtered = orders.filter(o => {
    const q = search.toLowerCase();
    const ms = q==="" || [o.so,o.name,o.company||""].some(s=>s.toLowerCase().includes(q));
    const mf = filter==="all" ? true
      : filter==="complete" ? complete(o)
      : filter==="reports"  ? (o.reportsReady&&!complete(o))
      : !o.reportsReady;
    return ms && mf;
  });

  function monthlySummary() {
    const m={};
    orders.forEach(o=>{
      const k=gMonthKey(o.createdAt);
      if(!m[k]) m[k]={peptide:0,endotoxin:0,sterility:0,count:0,complete:0};
      TYPES.forEach(t=>{ m[k][t.key]+=o[t.key]||0; });
      m[k].count++; if(complete(o)) m[k].complete++;
    });
    return Object.entries(m).sort((a,b)=>b[0].localeCompare(a[0]));
  }
  const monthData = monthlySummary();
  const thisMo = monthData.find(([k])=>k===nowKey)?.[1] || {peptide:0,endotoxin:0,sterility:0};
  const counts = {
    all: orders.length,
    pending: orders.filter(o=>!o.reportsReady).length,
    reports: orders.filter(o=>o.reportsReady&&!complete(o)).length,
    complete: orders.filter(complete).length,
  };

  return (
    <div style={{ minHeight:"100vh", width:"100%", background:"#0b0f1a", fontFamily:"'IBM Plex Sans', system-ui, sans-serif", color:"#c9d4e8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        *, *::before, *::after { box-sizing:border-box; margin:0; padding:0; }
        html, body, #root { width:100%; min-height:100vh; }
        ::-webkit-scrollbar{width:5px;height:5px}
        ::-webkit-scrollbar-track{background:transparent}
        ::-webkit-scrollbar-thumb{background:#1e2d40;border-radius:99px}
        input::placeholder{color:#2a3548;}
        input[type=number]::-webkit-inner-spin-button{opacity:0}
        .row-tr td { transition: background 0.15s; }
        .row-tr:hover td { background: rgba(59,130,246,0.04) !important; }
        .del-btn { opacity:0; transition:opacity 0.15s; }
        .row-tr:hover .del-btn { opacity:1; }
        .tab-btn { background:none; border:none; cursor:pointer; font-family:'IBM Plex Sans',sans-serif; font-size:13.5px; font-weight:500; padding:6px 16px; border-radius:6px; transition:all 0.15s; color:#4a5a72; }
        .tab-btn.active { background:rgba(59,130,246,0.15); color:#60a5fa; }
        .tab-btn:not(.active):hover { color:#7a8fa8; background:rgba(255,255,255,0.03); }
        .filter-pill { background:transparent; border:1px solid transparent; cursor:pointer; font-family:'IBM Plex Sans',sans-serif; font-size:12.5px; font-weight:500; padding:4px 11px; border-radius:6px; transition:all 0.15s; color:#4a5a72; white-space:nowrap; }
        .filter-pill.active { border-color:rgba(255,255,255,0.1); background:rgba(255,255,255,0.05); color:#c9d4e8; }
        .filter-pill:not(.active):hover { color:#7a8fa8; }
        .add-btn { background:linear-gradient(135deg,#1d4ed8,#2563eb); color:#fff; border:none; border-radius:7px; padding:7px 18px; cursor:pointer; font-family:'IBM Plex Sans',sans-serif; font-size:13.5px; font-weight:600; box-shadow:0 2px 12px rgba(37,99,235,0.3); transition:all 0.15s; }
        .add-btn:hover { box-shadow:0 4px 18px rgba(37,99,235,0.45); transform:translateY(-1px); }
        .modal-overlay { position:fixed; inset:0; background:rgba(5,8,16,0.75); display:flex; align-items:center; justify-content:center; z-index:200; backdrop-filter:blur(8px); }
        .modal { background:#111827; border:1px solid rgba(255,255,255,0.08); border-radius:14px; padding:28px; width:90%; max-width:450px; box-shadow:0 30px 80px rgba(0,0,0,0.6); }
        .f-input { display:block; width:100%; margin-top:6px; background:rgba(255,255,255,0.04); border:1px solid rgba(255,255,255,0.08); border-radius:7px; padding:9px 12px; font-family:'IBM Plex Sans',sans-serif; font-size:14px; color:#c9d4e8; outline:none; transition:border-color 0.15s; }
        .f-input:focus { border-color:rgba(59,130,246,0.5); background:rgba(59,130,246,0.04); }
        .btn-cancel { flex:1; background:rgba(255,255,255,0.05); color:#6b7f99; border:1px solid rgba(255,255,255,0.07); border-radius:7px; padding:9px; cursor:pointer; font-family:'IBM Plex Sans',sans-serif; font-size:13.5px; font-weight:500; transition:all 0.15s; }
        .btn-cancel:hover { background:rgba(255,255,255,0.08); }
        .btn-submit { flex:2; background:linear-gradient(135deg,#1d4ed8,#2563eb); color:#fff; border:none; border-radius:7px; padding:9px; cursor:pointer; font-family:'IBM Plex Sans',sans-serif; font-size:13.5px; font-weight:600; box-shadow:0 2px 10px rgba(37,99,235,0.3); transition:all 0.15s; }
        .btn-submit:hover { box-shadow:0 4px 16px rgba(37,99,235,0.5); }
        .m-card { background:rgba(255,255,255,0.02); border:1px solid rgba(255,255,255,0.07); border-radius:12px; padding:20px 22px; transition:all 0.2s; }
        .m-card:hover { background:rgba(255,255,255,0.03); border-color:rgba(255,255,255,0.12); }
        .m-card.current { border-color:rgba(59,130,246,0.3); background:rgba(59,130,246,0.04); }
      `}</style>

      {/* HEADER */}
      <div style={{ background:"rgba(255,255,255,0.015)", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:"linear-gradient(135deg,rgba(37,99,235,0.3),rgba(124,58,237,0.3))", border:"1px solid rgba(96,165,250,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, boxShadow:"0 0 16px rgba(37,99,235,0.15)" }}>🧪</div>
          <div>
            <div style={{ fontSize:15, fontWeight:600, color:"#e2eaf8", letterSpacing:"-0.3px" }}>Sample Order Tracker</div>
            <div style={{ fontSize:11.5, color:"#3f4e63", marginTop:2, fontFamily:"'IBM Plex Mono',monospace", letterSpacing:"0.3px" }}>
              {MONTHS[new Date().getMonth()].toUpperCase()}&nbsp;{new Date().getFullYear()}
              &ensp;·&ensp;
              {TYPES.map((t,i)=>(
                <span key={t.key} style={{color:t.color}}>
                  {i>0&&<span style={{color:"#2a3548"}}>&ensp;·&ensp;</span>}
                  {t.short}&nbsp;{thisMo[t.key]}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ display:"flex", gap:2, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8, padding:"3px" }}>
            <button className={`tab-btn${tab==="orders"?" active":""}`} onClick={()=>setTab("orders")}>Orders</button>
            <button className={`tab-btn${tab==="monthly"?" active":""}`} onClick={()=>setTab("monthly")}>Monthly</button>
          </div>
          <button className="add-btn" onClick={()=>setModal(true)}>+ New Order</button>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&(setModal(false),setForm(blank))}>
          <div className="modal">
            <div style={{ fontSize:15, fontWeight:600, color:"#e2eaf8", marginBottom:22 }}>New Sales Order</div>
            {[{l:"SO Number",k:"so",ph:"SO-2025-001",req:true},{l:"Client Name",k:"name",ph:"Full name",req:true},{l:"Company",k:"company",ph:"Company name"}].map(f=>(
              <div key={f.k} style={{marginBottom:14}}>
                <label style={{fontSize:10.5,fontWeight:600,color:"#3f4e63",textTransform:"uppercase",letterSpacing:"0.8px"}}>
                  {f.l}{f.req&&<span style={{color:"#f87171",marginLeft:3}}>*</span>}
                </label>
                <input className="f-input" type="text" placeholder={f.ph} value={form[f.k]}
                  onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))}
                  onKeyDown={e=>e.key==="Enter"&&add()} />
              </div>
            ))}
            <label style={{fontSize:10.5,fontWeight:600,color:"#3f4e63",textTransform:"uppercase",letterSpacing:"0.8px"}}>Sample Counts</label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginTop:6,marginBottom:4}}>
              {TYPES.map(t=>(
                <div key={t.key} style={{background:t.badge,border:`1px solid ${t.border}`,borderRadius:8,padding:"10px 10px 8px"}}>
                  <div style={{fontSize:10,fontWeight:700,color:t.color,letterSpacing:"1px",marginBottom:6,fontFamily:"'IBM Plex Mono',monospace"}}>{t.short}</div>
                  <input className="f-input" type="number" placeholder="0" value={form[t.key]}
                    style={{background:"transparent",border:"none",borderBottom:`1px solid ${t.border}`,borderRadius:0,padding:"2px 0",color:t.color,fontFamily:"'IBM Plex Mono',monospace",fontSize:15,fontWeight:500,marginTop:0,width:"100%"}}
                    onChange={e=>setForm(p=>({...p,[t.key]:e.target.value}))} />
                </div>
              ))}
            </div>
            <div style={{display:"flex",gap:8,marginTop:22}}>
              <button className="btn-cancel" onClick={()=>{setModal(false);setForm(blank);}}>Cancel</button>
              <button className="btn-submit" onClick={add}>Add Order</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding:"20px 28px", maxWidth:"100%", margin:"0 auto" }}>

        {/* ORDERS TAB */}
        {tab==="orders" && (
          <>
            <div style={{display:"flex",gap:10,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{position:"relative",flex:1,minWidth:160,maxWidth:280}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#2a3548",fontSize:14,pointerEvents:"none"}}>⌕</span>
                <input placeholder="Search orders…" value={search} onChange={e=>setSearch(e.target.value)}
                  style={{ width:"100%", background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:7, padding:"7px 10px 7px 30px", fontFamily:"inherit", fontSize:13.5, color:"#c9d4e8", outline:"none" }} />
              </div>
              <div style={{display:"flex",gap:2,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:7,padding:"3px"}}>
                {[
                  {k:"all",     l:`All  ${counts.all}`},
                  {k:"pending", l:`Pending  ${counts.pending}`},
                  {k:"reports", l:`Reports Done  ${counts.reports}`},
                  {k:"complete",l:`Complete  ${counts.complete}`},
                ].map(f=>(
                  <button key={f.k} className={`filter-pill${filter===f.k?" active":""}`} onClick={()=>setFilter(f.k)}>{f.l}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:14,marginLeft:"auto",alignItems:"center"}}>
                {Object.values(STATUS).map(s=>(
                  <div key={s.label} style={{display:"flex",alignItems:"center",gap:6}}>
                    <Dot color={s.dot} size={6}/>
                    <span style={{fontSize:11.5,color:"#3f4e63",fontWeight:500}}>{s.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {filtered.length===0 ? (
              <div style={{textAlign:"center",padding:"90px 20px",color:"#1e2d40"}}>
                <div style={{fontSize:36,marginBottom:12,opacity:0.4}}>◌</div>
                <div style={{fontSize:14,fontWeight:500,color:"#2a3a52"}}>No orders found</div>
                <div style={{fontSize:13,marginTop:5,color:"#1e2d40"}}>Click&nbsp;<span style={{color:"#3b82f6",cursor:"pointer",fontWeight:600}} onClick={()=>setModal(true)}>+ New Order</span>&nbsp;to begin</div>
              </div>
            ) : (
              <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,overflow:"hidden"}}>
                <table style={{width:"100%",borderCollapse:"collapse",minWidth:1000}}>
                  <thead>
                    <tr style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
                      {[
                        {h:"SO #",c:false,w:120},{h:"Client",c:false,w:170},{h:"Company",c:false,w:160},
                        {h:"PEP",c:true,w:72},{h:"END",c:true,w:72},{h:"STE",c:true,w:72},
                        {h:"Reports",c:true,w:78},{h:"Paid",c:true,w:62},{h:"Emailed",c:true,w:75},
                        {h:"Status",c:true,w:140},{h:"",c:true,w:38},
                      ].map((col,i)=>(
                        <th key={i} style={{ textAlign:col.c?"center":"left", width:col.w, padding:"10px 12px", fontSize:10.5, fontWeight:600, color:"#2a3a52", textTransform:"uppercase", letterSpacing:"0.9px", whiteSpace:"nowrap", fontFamily:"'IBM Plex Mono',monospace" }}>{col.h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((order,idx)=>{
                      const st=getStatus(order);
                      return (
                        <tr key={order.id} className="row-tr" style={{borderBottom:idx===filtered.length-1?"none":"1px solid rgba(255,255,255,0.04)"}}>
                          <td style={{padding:"11px 12px"}}>
                            <div style={{display:"flex",alignItems:"center",gap:8}}>
                              <Dot color={st.dot} size={6}/>
                              <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:500,color:"#7eb3f7"}}>
                                <InlineEdit value={order.so} onChange={v=>upd(order.id,"so",v)} placeholder="SO#" mono/>
                              </span>
                            </div>
                          </td>
                          <td style={{padding:"11px 12px",fontSize:14,fontWeight:500,color:"#d4dff0"}}>
                            <InlineEdit value={order.name} onChange={v=>upd(order.id,"name",v)} placeholder="Name"/>
                          </td>
                          <td style={{padding:"11px 12px",fontSize:13.5,color:"#4a5a72"}}>
                            <InlineEdit value={order.company||""} onChange={v=>upd(order.id,"company",v)} placeholder="—"/>
                          </td>
                          {TYPES.map(t=>{
                            const val=order[t.key]||0;
                            return (
                              <td key={t.key} style={{padding:"11px 8px",textAlign:"center"}}>
                                <span style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", background:val>0?t.badge:"transparent", border:val>0?`1px solid ${t.border}`:"1px solid transparent", color:val>0?t.color:"#2a3548", borderRadius:6, padding:"3px 9px", minWidth:40, fontFamily:"'IBM Plex Mono',monospace", fontSize:13, fontWeight:500, transition:"all 0.2s", boxShadow:val>0?`0 0 8px ${t.glow}`:"none" }}>
                                  <InlineEdit value={String(val)} onChange={v=>upd(order.id,t.key,parseInt(v)||0)} type="number" mono/>
                                </span>
                              </td>
                            );
                          })}
                          {[{f:"reportsReady",l:"Reports Ready"},{f:"paid",l:"Paid"},{f:"emailed",l:"Emailed"}].map(({f,l})=>(
                            <td key={f} style={{padding:"11px 8px",textAlign:"center"}}>
                              <div style={{display:"flex",justifyContent:"center"}}>
                                <Toggle value={order[f]} onChange={v=>upd(order.id,f,v)} label={l}/>
                              </div>
                            </td>
                          ))}
                          <td style={{padding:"11px 8px",textAlign:"center"}}>
                            <span style={{ display:"inline-block", background:st.bg, color:st.color, border:`1px solid ${st.border}`, borderRadius:20, padding:"4px 12px", fontSize:11.5, fontWeight:600, letterSpacing:"0.3px", whiteSpace:"nowrap" }}>{st.label}</span>
                          </td>
                          <td style={{padding:"11px 8px",textAlign:"center"}}>
                            <button className="del-btn" onClick={()=>del(order.id)}
                              style={{background:"none",border:"none",cursor:"pointer",color:"#2a3548",fontSize:13,padding:"3px 6px",borderRadius:5,transition:"color 0.15s"}}
                              onMouseOver={e=>e.currentTarget.style.color="#f87171"}
                              onMouseOut={e=>e.currentTarget.style.color="#2a3548"}>✕</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* MONTHLY TAB */}
        {tab==="monthly" && (
          <>
            <div style={{fontSize:14,fontWeight:600,color:"#7a8fa8",marginBottom:18,letterSpacing:"0.3px",textTransform:"uppercase",fontFamily:"'IBM Plex Mono',monospace"}}>Monthly Breakdown</div>
            {monthData.length===0 ? (
              <div style={{textAlign:"center",padding:"90px 20px",color:"#1e2d40"}}>
                <div style={{fontSize:36,marginBottom:12,opacity:0.4}}>◌</div>
                <div style={{fontSize:14,fontWeight:500,color:"#2a3a52"}}>No data yet</div>
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(290px,1fr))",gap:14}}>
                {monthData.map(([key,data])=>{
                  const isCur=key===nowKey;
                  const total=TYPES.reduce((s,t)=>s+(data[t.key]||0),0);
                  const pct=v=>total>0?Math.round((v/total)*100):0;
                  const compPct=data.count>0?Math.round((data.complete/data.count)*100):0;
                  return (
                    <div key={key} className={`m-card${isCur?" current":""}`}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:18}}>
                        <span style={{fontSize:15,fontWeight:600,color:"#d4dff0",letterSpacing:"-0.3px"}}>{getMonthLabel(key)}</span>
                        <div style={{display:"flex",gap:7,alignItems:"center"}}>
                          {isCur&&<span style={{background:"rgba(59,130,246,0.15)",color:"#60a5fa",border:"1px solid rgba(96,165,250,0.25)",borderRadius:20,padding:"2px 9px",fontSize:9.5,fontWeight:700,letterSpacing:"0.8px"}}>NOW</span>}
                          <span style={{fontSize:11,color:"#2a3a52",fontFamily:"'IBM Plex Mono',monospace"}}>{data.count} orders</span>
                        </div>
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:14}}>
                        {TYPES.map(t=>(
                          <div key={t.key} style={{background:t.badge,border:`1px solid ${t.border}`,borderRadius:9,padding:"13px 8px",textAlign:"center",boxShadow:`0 0 12px ${t.glow}`}}>
                            <div style={{fontSize:24,fontWeight:600,color:t.color,fontFamily:"'IBM Plex Mono',monospace",lineHeight:1}}>{data[t.key]}</div>
                            <div style={{fontSize:9,color:t.color,opacity:0.6,marginTop:5,fontWeight:700,letterSpacing:"1.2px"}}>{t.short}</div>
                          </div>
                        ))}
                      </div>
                      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:14}}>
                        <div style={{background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:8,padding:"10px",textAlign:"center"}}>
                          <div style={{fontSize:20,fontWeight:600,color:"#c9d4e8",fontFamily:"'IBM Plex Mono',monospace"}}>{total}</div>
                          <div style={{fontSize:9,color:"#2a3a52",fontWeight:700,letterSpacing:"1px",marginTop:3}}>TOTAL</div>
                        </div>
                        <div style={{background:"rgba(52,211,153,0.07)",border:"1px solid rgba(52,211,153,0.15)",borderRadius:8,padding:"10px",textAlign:"center"}}>
                          <div style={{fontSize:20,fontWeight:600,color:"#34d399",fontFamily:"'IBM Plex Mono',monospace"}}>{data.complete}/{data.count}</div>
                          <div style={{fontSize:9,color:"#34d399",opacity:0.6,fontWeight:700,letterSpacing:"1px",marginTop:3}}>DONE</div>
                        </div>
                      </div>
                      {total>0&&(
                        <div style={{marginBottom:12}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                            {TYPES.map(t=><span key={t.key} style={{fontSize:10.5,color:t.color,fontFamily:"'IBM Plex Mono',monospace"}}>{t.short} {pct(data[t.key])}%</span>)}
                          </div>
                          <StatBar segments={TYPES.map(t=>({color:t.dot,pct:pct(data[t.key])}))}/>
                        </div>
                      )}
                      {data.count>0&&(
                        <div>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            <span style={{fontSize:11,color:"#2a3a52",fontWeight:500}}>Completion</span>
                            <span style={{fontSize:11,color:"#34d399",fontFamily:"'IBM Plex Mono',monospace",fontWeight:500}}>{compPct}%</span>
                          </div>
                          <div style={{height:3,borderRadius:99,overflow:"hidden",background:"rgba(255,255,255,0.04)"}}>
                            <div style={{height:"100%",borderRadius:99,background:"#34d399",width:`${compPct}%`,transition:"width 0.6s ease",boxShadow:"0 0 6px rgba(52,211,153,0.4)"}}/>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
