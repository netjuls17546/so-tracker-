import { useState, useEffect, useRef } from "react";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const gMonthKey = d => { const dt=new Date(d); return `${dt.getFullYear()}-${dt.getMonth()}`; };
const gMonthLabel = k => { const [y,m]=k.split("-"); return `${MONTHS[+m]} ${y}`; };
const complete = o => o.reportsReady && o.paid && o.emailed;
const SO_PREFIX = `${new Date().getFullYear()}-`;
const isFinnrick = o => [o.name||"", o.company||""].some(s => s.toLowerCase().includes("finnrick"));

const TYPES = [
  { key:"peptide",   short:"PEP", color:"#94a3b8", glow:"rgba(148,163,184,0.15)", badge:"rgba(148,163,184,0.12)", border:"rgba(148,163,184,0.2)" },
  { key:"endotoxin", short:"END", color:"#60a5fa", glow:"rgba(96,165,250,0.15)",  badge:"rgba(59,130,246,0.12)",  border:"rgba(96,165,250,0.25)" },
  { key:"sterility", short:"STE", color:"#a78bfa", glow:"rgba(167,139,250,0.15)", badge:"rgba(139,92,246,0.12)",  border:"rgba(167,139,250,0.25)" },
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

// ── SVG Bar Chart ───────────────────────────────────────────────
function BarChart({ data, height=160 }) {
  if (!data.length) return null;
  const allTotals = data.map(d =>
    (d.finnrick.peptide+d.finnrick.endotoxin+d.finnrick.sterility) +
    (d.other.peptide+d.other.endotoxin+d.other.sterility)
  );
  const maxVal = Math.max(...allTotals, 1);

  return (
    <div style={{ width:"100%", overflowX:"auto" }}>
      <div style={{ minWidth: Math.max(data.length * 64, 300), paddingLeft:36 }}>
        <div style={{ position:"relative", height }}>
          {/* Grid lines */}
          {[0,25,50,75,100].map(pct => (
            <div key={pct} style={{ position:"absolute", bottom:`${pct}%`, left:0, right:0, borderTop:"1px solid rgba(255,255,255,0.04)", display:"flex", alignItems:"center" }}>
              <span style={{ position:"absolute", left:-34, fontSize:9, color:"#2a3a52", fontFamily:"'IBM Plex Mono',monospace", transform:"translateY(50%)" }}>
                {Math.round(maxVal * pct / 100)}
              </span>
            </div>
          ))}
          {/* Bars */}
          <div style={{ position:"absolute", inset:0, display:"flex", alignItems:"flex-end", gap:8, padding:"0 4px" }}>
            {data.map((d,i) => {
              const finn = d.finnrick.peptide+d.finnrick.endotoxin+d.finnrick.sterility;
              const other = d.other.peptide+d.other.endotoxin+d.other.sterility;
              const total = finn + other;
              const totalPct = (total / maxVal) * 100;
              return (
                <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-end", height:"100%" }}>
                  <div style={{ width:"100%", height:`${totalPct}%`, display:"flex", flexDirection:"column", justifyContent:"flex-end", borderRadius:"4px 4px 0 0", overflow:"hidden", minHeight:total>0?2:0 }}>
                    {other > 0 && <div style={{ flex:other, background:"rgba(96,165,250,0.45)" }}/>}
                    {finn  > 0 && <div style={{ flex:finn,  background:"linear-gradient(180deg,#6366f1,#8b5cf6)", boxShadow:"0 0 8px rgba(99,102,241,0.4)" }}/>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* X labels */}
        <div style={{ display:"flex", gap:8, padding:"5px 4px 0" }}>
          {data.map((d,i) => (
            <div key={i} style={{ flex:1, textAlign:"center", fontSize:9.5, color:"#3f4e63", fontFamily:"'IBM Plex Mono',monospace" }}>{d.label}</div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SortArrow({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <span style={{ opacity:0.2, fontSize:9, marginLeft:3 }}>⇅</span>;
  return <span style={{ fontSize:9, marginLeft:3, color:"#60a5fa" }}>{sortDir==="asc"?"↑":"↓"}</span>;
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
  const ff = mono ? "'IBM Plex Mono',monospace" : "inherit";
  if (on) return (
    <input ref={ref} autoFocus type={type} value={draft}
      onChange={e => setDraft(e.target.value)} onBlur={commit}
      onKeyDown={e => { if(e.key==="Enter") commit(); if(e.key==="Escape"){setDraft(String(value));setOn(false);} }}
      style={{ border:"none", borderBottom:"1.5px solid #3b82f6", outline:"none", background:"transparent", fontFamily:ff, fontSize:"inherit", color:"inherit", padding:"0 2px", width:type==="number"?46:"100%", minWidth:type==="number"?46:60 }}
    />
  );
  const empty = value==null||value===""|| (type==="number"&&(value===0||value==="0"));
  return (
    <span onClick={() => { setDraft(String(value??"")); setOn(true); }} title="Click to edit"
      style={{ cursor:"text", fontFamily:ff, color:(empty&&placeholder==="—")?"#3f4a5c":"inherit" }}>
      {empty&&placeholder==="—" ? "—" : String(value)}
    </span>
  );
}

function Toggle({ value, onChange, label }) {
  return (
    <button onClick={() => onChange(!value)} title={label}
      style={{ display:"inline-flex", alignItems:"center", justifyContent:"center", width:30, height:30, borderRadius:7, border:value?"1px solid rgba(52,211,153,0.4)":"1px solid rgba(255,255,255,0.08)", background:value?"rgba(52,211,153,0.12)":"rgba(255,255,255,0.03)", color:value?"#34d399":"#3f4a5c", cursor:"pointer", fontSize:13, fontWeight:700, transition:"all 0.18s", flexShrink:0, boxShadow:value?"0 0 10px rgba(52,211,153,0.15)":"none" }}>
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
      {segments.map((s,i) => <div key={i} style={{ height:"100%", background:s.color, width:`${s.pct}%`, transition:"width 0.6s ease" }}/>)}
    </div>
  );
}

const STORAGE_KEY = "so-tracker-orders-v7";
function loadOrders() { try { const r=localStorage.getItem(STORAGE_KEY); return r?JSON.parse(r):[]; } catch(e){return[];} }
function saveOrders(o) { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(o)); } catch(e){} }

export default function App() {
  const [orders, setOrders] = useState(() => loadOrders());
  const [tab, setTab]       = useState("orders");
  const [modal, setModal]   = useState(false);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sortCol, setSortCol] = useState("createdAt");
  const [sortDir, setSortDir] = useState("desc");
  const blank = { so:SO_PREFIX, name:"", company:"", peptide:"", endotoxin:"", sterility:"" };
  const [form, setForm] = useState(blank);

  useEffect(() => { saveOrders(orders); }, [orders]);

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

  function handleSort(col) {
    if (sortCol===col) setSortDir(d=>d==="asc"?"desc":"asc");
    else { setSortCol(col); setSortDir("asc"); }
  }
  function sortList(list) {
    return [...list].sort((a,b) => {
      let av=a[sortCol]??"", bv=b[sortCol]??"";
      if (["peptide","endotoxin","sterility"].includes(sortCol)) { av=parseInt(av)||0; bv=parseInt(bv)||0; return sortDir==="asc"?av-bv:bv-av; }
      av=String(av).toLowerCase(); bv=String(bv).toLowerCase();
      return sortDir==="asc"?av.localeCompare(bv):bv.localeCompare(av);
    });
  }

  const nowKey = `${new Date().getFullYear()}-${new Date().getMonth()}`;
  const activeOrders    = orders.filter(o=>!complete(o));
  const completedOrders = orders.filter(o=>complete(o));

  const filteredActive = sortList(activeOrders.filter(o => {
    const q=search.toLowerCase();
    const ms=q===""||[o.so,o.name,o.company||""].some(s=>s.toLowerCase().includes(q));
    const mf=filter==="all"?true:filter==="reports"?o.reportsReady:!o.reportsReady;
    return ms&&mf;
  }));
  const filteredCompleted = sortList(completedOrders.filter(o => {
    const q=search.toLowerCase();
    return q===""||[o.so,o.name,o.company||""].some(s=>s.toLowerCase().includes(q));
  }));

  function monthlySummary() {
    const m={};
    orders.forEach(o=>{
      const k=gMonthKey(o.createdAt);
      if(!m[k]) m[k]={ finnrick:{peptide:0,endotoxin:0,sterility:0}, other:{peptide:0,endotoxin:0,sterility:0}, count:0, complete:0 };
      const grp = isFinnrick(o) ? "finnrick" : "other";
      TYPES.forEach(t=>{ m[k][grp][t.key]+=o[t.key]||0; });
      m[k].count++; if(complete(o)) m[k].complete++;
    });
    return Object.entries(m).sort((a,b)=>a[0].localeCompare(b[0]));
  }
  const monthData = monthlySummary();
  const monthDataDesc = [...monthData].reverse();
  const thisMo = monthData.find(([k])=>k===nowKey)?.[1]||{finnrick:{peptide:0,endotoxin:0,sterility:0},other:{peptide:0,endotoxin:0,sterility:0}};
  const thisTotal = TYPES.reduce((s,t)=>s+(thisMo.finnrick[t.key]||0)+(thisMo.other[t.key]||0),0);

  const counts = { active:activeOrders.length, pending:activeOrders.filter(o=>!o.reportsReady).length, reports:activeOrders.filter(o=>o.reportsReady).length, complete:completedOrders.length };

  const chartData = monthData.slice(-6).map(([k,d])=>({ label:gMonthLabel(k).split(" ")[0], finnrick:d.finnrick, other:d.other }));

  const COLS = [
    {key:"so",c:false,w:130,s:true,l:"SO #"},
    {key:"name",c:false,w:160,s:true,l:"Client"},
    {key:"company",c:false,w:150,s:true,l:"Company"},
    {key:"peptide",c:true,w:65,s:true,l:"PEP"},
    {key:"endotoxin",c:true,w:65,s:true,l:"END"},
    {key:"sterility",c:true,w:65,s:true,l:"STE"},
    {key:"reportsReady",c:true,w:76,s:false,l:"Reports"},
    {key:"paid",c:true,w:58,s:false,l:"Paid"},
    {key:"emailed",c:true,w:72,s:false,l:"Emailed"},
    {key:"status",c:true,w:136,s:false,l:"Status"},
    {key:"del",c:true,w:34,s:false,l:""},
  ];

  function renderTable(rows, emptyMsg) {
    if (!rows.length) return (
      <div style={{textAlign:"center",padding:"70px 20px",color:"#1e2d40"}}>
        <div style={{fontSize:32,marginBottom:10,opacity:0.35}}>◌</div>
        <div style={{fontSize:13.5,fontWeight:500,color:"#2a3a52"}}>{emptyMsg}</div>
      </div>
    );
    return (
      <div style={{background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:12,overflow:"hidden"}}>
        <table style={{width:"100%",borderCollapse:"collapse",minWidth:980}}>
          <thead>
            <tr style={{borderBottom:"1px solid rgba(255,255,255,0.06)"}}>
              {COLS.map((col,i)=>(
                <th key={i} onClick={col.s?()=>handleSort(col.key):undefined}
                  style={{ textAlign:col.c?"center":"left", width:col.w, padding:"10px 12px", fontSize:10.5, fontWeight:600, color:sortCol===col.key?"#60a5fa":"#2a3a52", textTransform:"uppercase", letterSpacing:"0.9px", whiteSpace:"nowrap", fontFamily:"'IBM Plex Mono',monospace", cursor:col.s?"pointer":"default", userSelect:"none", transition:"color 0.15s" }}>
                  {col.l}{col.s&&<SortArrow col={col.key} sortCol={sortCol} sortDir={sortDir}/>}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((order,idx)=>{
              const st=getStatus(order);
              return (
                <tr key={order.id} className="row-tr" style={{borderBottom:idx===rows.length-1?"none":"1px solid rgba(255,255,255,0.04)"}}>
                  <td style={{padding:"11px 12px"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8}}>
                      <Dot color={st.dot} size={6}/>
                      <span style={{fontFamily:"'IBM Plex Mono',monospace",fontSize:13,fontWeight:500,color:"#7eb3f7"}}>
                        <InlineEdit value={order.so} onChange={v=>upd(order.id,"so",v)} mono/>
                      </span>
                    </div>
                  </td>
                  <td style={{padding:"11px 12px",fontSize:14,fontWeight:500,color:"#d4dff0"}}>
                    <InlineEdit value={order.name} onChange={v=>upd(order.id,"name",v)}/>
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
                  {[{f:"reportsReady",l:"Reports"},{f:"paid",l:"Paid"},{f:"emailed",l:"Emailed"}].map(({f,l})=>(
                    <td key={f} style={{padding:"11px 8px",textAlign:"center"}}>
                      <div style={{display:"flex",justifyContent:"center"}}>
                        <Toggle value={order[f]} onChange={v=>upd(order.id,f,v)} label={l}/>
                      </div>
                    </td>
                  ))}
                  <td style={{padding:"11px 8px",textAlign:"center"}}>
                    <span style={{ display:"inline-block", background:st.bg, color:st.color, border:`1px solid ${st.border}`, borderRadius:20, padding:"4px 12px", fontSize:11.5, fontWeight:600, whiteSpace:"nowrap" }}>{st.label}</span>
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
    );
  }

  return (
    <div style={{ minHeight:"100vh", width:"100%", background:"#0b0f1a", fontFamily:"'IBM Plex Sans',system-ui,sans-serif", color:"#c9d4e8" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        html,body,#root{width:100%;min-height:100vh;}
        ::-webkit-scrollbar{width:5px;height:5px} ::-webkit-scrollbar-track{background:transparent} ::-webkit-scrollbar-thumb{background:#1e2d40;border-radius:99px}
        input::placeholder{color:#2a3548;} input[type=number]::-webkit-inner-spin-button{opacity:0}
        .row-tr td{transition:background 0.15s;}
        .row-tr:hover td{background:rgba(59,130,246,0.04)!important;}
        .del-btn{opacity:0;transition:opacity 0.15s;}
        .row-tr:hover .del-btn{opacity:1;}
        .tab-btn{background:none;border:none;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;font-size:13.5px;font-weight:500;padding:6px 16px;border-radius:6px;transition:all 0.15s;color:#4a5a72;display:flex;align-items:center;gap:7px;}
        .tab-btn.active{background:rgba(59,130,246,0.15);color:#60a5fa;}
        .tab-btn.done.active{background:rgba(52,211,153,0.12);color:#34d399;}
        .tab-btn.monthly.active{background:rgba(167,139,250,0.12);color:#a78bfa;}
        .tab-btn:not(.active):hover{color:#7a8fa8;background:rgba(255,255,255,0.03);}
        .filter-pill{background:transparent;border:1px solid transparent;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;font-size:12.5px;font-weight:500;padding:4px 11px;border-radius:6px;transition:all 0.15s;color:#4a5a72;white-space:nowrap;}
        .filter-pill.active{border-color:rgba(255,255,255,0.1);background:rgba(255,255,255,0.05);color:#c9d4e8;}
        .filter-pill:not(.active):hover{color:#7a8fa8;}
        .add-btn{background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;border:none;border-radius:7px;padding:7px 18px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;font-size:13.5px;font-weight:600;box-shadow:0 2px 12px rgba(37,99,235,0.3);transition:all 0.15s;}
        .add-btn:hover{box-shadow:0 4px 18px rgba(37,99,235,0.45);transform:translateY(-1px);}
        .modal-overlay{position:fixed;inset:0;background:rgba(5,8,16,0.78);display:flex;align-items:center;justify-content:center;z-index:200;backdrop-filter:blur(8px);}
        .modal{background:#111827;border:1px solid rgba(255,255,255,0.08);border-radius:14px;padding:28px;width:90%;max-width:450px;box-shadow:0 30px 80px rgba(0,0,0,0.6);}
        .f-input{display:block;width:100%;margin-top:6px;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:7px;padding:9px 12px;font-family:'IBM Plex Sans',sans-serif;font-size:14px;color:#c9d4e8;outline:none;transition:border-color 0.15s;}
        .f-input:focus{border-color:rgba(59,130,246,0.5);background:rgba(59,130,246,0.04);}
        .btn-cancel{flex:1;background:rgba(255,255,255,0.05);color:#6b7f99;border:1px solid rgba(255,255,255,0.07);border-radius:7px;padding:9px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;font-size:13.5px;font-weight:500;}
        .btn-submit{flex:2;background:linear-gradient(135deg,#1d4ed8,#2563eb);color:#fff;border:none;border-radius:7px;padding:9px;cursor:pointer;font-family:'IBM Plex Sans',sans-serif;font-size:13.5px;font-weight:600;}
      `}</style>

      {/* HEADER */}
      <div style={{ background:"rgba(255,255,255,0.015)", borderBottom:"1px solid rgba(255,255,255,0.07)", padding:"14px 28px", display:"flex", alignItems:"center", justifyContent:"space-between", flexWrap:"wrap", gap:12 }}>
        <div style={{ display:"flex", alignItems:"center", gap:14 }}>
          <div style={{ width:36, height:36, borderRadius:9, background:"linear-gradient(135deg,rgba(37,99,235,0.3),rgba(124,58,237,0.3))", border:"1px solid rgba(96,165,250,0.2)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16, boxShadow:"0 0 16px rgba(37,99,235,0.15)" }}>🧪</div>
          <div>
            <div style={{ fontSize:15, fontWeight:600, color:"#e2eaf8", letterSpacing:"-0.3px" }}>Sample Order Tracker</div>
            <div style={{ fontSize:11.5, color:"#3f4e63", marginTop:2, fontFamily:"'IBM Plex Mono',monospace" }}>
              {MONTHS[new Date().getMonth()].toUpperCase()}&nbsp;{new Date().getFullYear()}
              &ensp;·&ensp;Total&nbsp;{thisTotal}
              &ensp;·&ensp;{TYPES.map((t,i)=><span key={t.key} style={{color:t.color}}>{i>0&&<span style={{color:"#2a3548"}}>&ensp;</span>}{t.short}&nbsp;{(thisMo.finnrick[t.key]||0)+(thisMo.other[t.key]||0)}</span>)}
            </div>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <div style={{ display:"flex", gap:2, background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:8, padding:"3px" }}>
            <button className={`tab-btn${tab==="orders"?" active":""}`} onClick={()=>setTab("orders")}>
              Orders <span style={{ background:"rgba(255,255,255,0.08)", borderRadius:10, padding:"1px 7px", fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>{counts.active}</span>
            </button>
            <button className={`tab-btn done${tab==="completed"?" active":""}`} onClick={()=>setTab("completed")}>
              Completed <span style={{ background:tab==="completed"?"rgba(52,211,153,0.15)":"rgba(255,255,255,0.08)", color:tab==="completed"?"#34d399":"inherit", borderRadius:10, padding:"1px 7px", fontSize:11, fontFamily:"'IBM Plex Mono',monospace" }}>{counts.complete}</span>
            </button>
            <button className={`tab-btn monthly${tab==="monthly"?" active":""}`} onClick={()=>setTab("monthly")}>Monthly</button>
          </div>
          <button className="add-btn" onClick={()=>setModal(true)}>+ New Order</button>
        </div>
      </div>

      {/* MODAL */}
      {modal && (
        <div className="modal-overlay" onClick={e=>e.target===e.currentTarget&&(setModal(false),setForm(blank))}>
          <div className="modal">
            <div style={{ fontSize:15, fontWeight:600, color:"#e2eaf8", marginBottom:22 }}>New Sales Order</div>
            {[{l:"SO Number",k:"so",ph:`${SO_PREFIX}001`,req:true},{l:"Client Name",k:"name",ph:"Full name",req:true},{l:"Company",k:"company",ph:"Company name"}].map(f=>(
              <div key={f.k} style={{marginBottom:14}}>
                <label style={{fontSize:10.5,fontWeight:600,color:"#3f4e63",textTransform:"uppercase",letterSpacing:"0.8px"}}>{f.l}{f.req&&<span style={{color:"#f87171",marginLeft:3}}>*</span>}</label>
                <input className="f-input" type="text" placeholder={f.ph} value={form[f.k]} onChange={e=>setForm(p=>({...p,[f.k]:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&add()} />
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

      <div style={{ padding:"20px 28px", width:"100%" }}>

        {/* ORDERS */}
        {tab==="orders" && (
          <>
            <div style={{display:"flex",gap:10,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{position:"relative",flex:1,minWidth:160,maxWidth:280}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#2a3548",fontSize:14,pointerEvents:"none"}}>⌕</span>
                <input placeholder="Search orders…" value={search} onChange={e=>setSearch(e.target.value)}
                  style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:7,padding:"7px 10px 7px 30px",fontFamily:"inherit",fontSize:13.5,color:"#c9d4e8",outline:"none"}} />
              </div>
              <div style={{display:"flex",gap:2,background:"rgba(255,255,255,0.02)",border:"1px solid rgba(255,255,255,0.06)",borderRadius:7,padding:"3px"}}>
                {[{k:"all",l:`All  ${counts.active}`},{k:"pending",l:`Pending  ${counts.pending}`},{k:"reports",l:`Reports Done  ${counts.reports}`}].map(f=>(
                  <button key={f.k} className={`filter-pill${filter===f.k?" active":""}`} onClick={()=>setFilter(f.k)}>{f.l}</button>
                ))}
              </div>
              <span style={{fontSize:11,color:"#2a3a52",marginLeft:"auto",fontFamily:"'IBM Plex Mono',monospace"}}>click column headers to sort</span>
            </div>
            {renderTable(filteredActive, "No active orders — click + New Order")}
          </>
        )}

        {/* COMPLETED */}
        {tab==="completed" && (
          <>
            <div style={{display:"flex",gap:10,marginBottom:18,alignItems:"center",flexWrap:"wrap"}}>
              <div style={{position:"relative",flex:1,minWidth:160,maxWidth:280}}>
                <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",color:"#2a3548",fontSize:14,pointerEvents:"none"}}>⌕</span>
                <input placeholder="Search completed…" value={search} onChange={e=>setSearch(e.target.value)}
                  style={{width:"100%",background:"rgba(255,255,255,0.03)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:7,padding:"7px 10px 7px 30px",fontFamily:"inherit",fontSize:13.5,color:"#c9d4e8",outline:"none"}} />
              </div>
              <span style={{fontSize:11,color:"#2a3a52",marginLeft:"auto",fontFamily:"'IBM Plex Mono',monospace"}}>click column headers to sort</span>
            </div>
            {renderTable(filteredCompleted, "No completed orders yet")}
          </>
        )}

        {/* MONTHLY */}
        {tab==="monthly" && (
          <>
            {/* Bar chart */}
            {chartData.length > 0 && (
              <div style={{ background:"rgba(255,255,255,0.02)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:12, padding:"20px 22px", marginBottom:20 }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16, flexWrap:"wrap", gap:8 }}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600, color:"#d4dff0" }}>Sample Volume — Last 6 Months</div>
                    <div style={{ fontSize:11, color:"#3f4e63", marginTop:2 }}>Stacked: Finnrick (bottom) vs. Other clients (top)</div>
                  </div>
                  <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:"linear-gradient(135deg,#6366f1,#8b5cf6)" }}/>
                      <span style={{ fontSize:11, color:"#a78bfa" }}>Finnrick</span>
                    </div>
                    <div style={{ display:"flex", alignItems:"center", gap:5 }}>
                      <div style={{ width:10, height:10, borderRadius:2, background:"rgba(96,165,250,0.45)" }}/>
                      <span style={{ fontSize:11, color:"#60a5fa" }}>Other</span>
                    </div>
                  </div>
                </div>
                <BarChart data={chartData} height={160}/>
              </div>
            )}

            {/* Monthly cards */}
            <div style={{ fontSize:11, fontWeight:600, color:"#3f4e63", marginBottom:14, letterSpacing:"0.8px", textTransform:"uppercase", fontFamily:"'IBM Plex Mono',monospace" }}>All Months</div>
            {monthDataDesc.length===0 ? (
              <div style={{textAlign:"center",padding:"60px 20px",color:"#1e2d40"}}>
                <div style={{fontSize:32,marginBottom:10,opacity:0.35}}>◌</div>
                <div style={{fontSize:13.5,fontWeight:500,color:"#2a3a52"}}>No data yet</div>
              </div>
            ) : (
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
                {monthDataDesc.map(([key,data])=>{
                  const isCur=key===nowKey;
                  const finnTotal = TYPES.reduce((s,t)=>s+(data.finnrick[t.key]||0),0);
                  const otherTotal = TYPES.reduce((s,t)=>s+(data.other[t.key]||0),0);
                  const total = finnTotal + otherTotal;
                  const pct=v=>total>0?Math.round((v/total)*100):0;
                  const compPct=data.count>0?Math.round((data.complete/data.count)*100):0;
                  return (
                    <div key={key} style={{ background:isCur?"rgba(59,130,246,0.04)":"rgba(255,255,255,0.02)", border:`1px solid ${isCur?"rgba(59,130,246,0.3)":"rgba(255,255,255,0.07)"}`, borderRadius:12, padding:"20px 22px" }}>
                      {/* Header */}
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
                        <span style={{ fontSize:15, fontWeight:600, color:"#d4dff0" }}>{getMonthLabel(key)}</span>
                        <div style={{ display:"flex", gap:6, alignItems:"center" }}>
                          {isCur&&<span style={{ background:"rgba(59,130,246,0.15)", color:"#60a5fa", border:"1px solid rgba(96,165,250,0.25)", borderRadius:20, padding:"2px 9px", fontSize:9.5, fontWeight:700, letterSpacing:"0.8px" }}>NOW</span>}
                          <span style={{ fontSize:11, color:"#2a3a52", fontFamily:"'IBM Plex Mono',monospace" }}>{data.count} orders</span>
                        </div>
                      </div>

                      {/* ── Finnrick vs Other counters ── */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:14 }}>
                        {/* Finnrick */}
                        <div style={{ background:"rgba(99,102,241,0.08)", border:"1px solid rgba(99,102,241,0.2)", borderRadius:10, padding:"12px 12px 10px" }}>
                          <div style={{ fontSize:10, fontWeight:700, color:"#a78bfa", letterSpacing:"0.8px", marginBottom:8, fontFamily:"'IBM Plex Mono',monospace" }}>FINNRICK</div>
                          <div style={{ fontSize:24, fontWeight:600, color:"#a78bfa", fontFamily:"'IBM Plex Mono',monospace", lineHeight:1, marginBottom:8 }}>{finnTotal}</div>
                          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                            {TYPES.map(t=>(
                              <div key={t.key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                <span style={{ fontSize:9.5, color:"#4a3a72", fontFamily:"'IBM Plex Mono',monospace" }}>{t.short}</span>
                                <span style={{ fontSize:11, color:"#7c6aad", fontFamily:"'IBM Plex Mono',monospace", fontWeight:600 }}>{data.finnrick[t.key]||0}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        {/* Other */}
                        <div style={{ background:"rgba(96,165,250,0.06)", border:"1px solid rgba(96,165,250,0.15)", borderRadius:10, padding:"12px 12px 10px" }}>
                          <div style={{ fontSize:10, fontWeight:700, color:"#60a5fa", letterSpacing:"0.8px", marginBottom:8, fontFamily:"'IBM Plex Mono',monospace" }}>OTHER</div>
                          <div style={{ fontSize:24, fontWeight:600, color:"#60a5fa", fontFamily:"'IBM Plex Mono',monospace", lineHeight:1, marginBottom:8 }}>{otherTotal}</div>
                          <div style={{ display:"flex", flexDirection:"column", gap:3 }}>
                            {TYPES.map(t=>(
                              <div key={t.key} style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                                <span style={{ fontSize:9.5, color:"#2a4a6a", fontFamily:"'IBM Plex Mono',monospace" }}>{t.short}</span>
                                <span style={{ fontSize:11, color:"#3b82f6", fontFamily:"'IBM Plex Mono',monospace", fontWeight:600 }}>{data.other[t.key]||0}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Total + Done */}
                      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:7, marginBottom:12 }}>
                        <div style={{ background:"rgba(255,255,255,0.03)", border:"1px solid rgba(255,255,255,0.06)", borderRadius:8, padding:"9px", textAlign:"center" }}>
                          <div style={{ fontSize:19, fontWeight:600, color:"#c9d4e8", fontFamily:"'IBM Plex Mono',monospace" }}>{total}</div>
                          <div style={{ fontSize:9, color:"#2a3a52", fontWeight:700, letterSpacing:"1px", marginTop:2 }}>TOTAL SAMPLES</div>
                        </div>
                        <div style={{ background:"rgba(52,211,153,0.07)", border:"1px solid rgba(52,211,153,0.15)", borderRadius:8, padding:"9px", textAlign:"center" }}>
                          <div style={{ fontSize:19, fontWeight:600, color:"#34d399", fontFamily:"'IBM Plex Mono',monospace" }}>{data.complete}/{data.count}</div>
                          <div style={{ fontSize:9, color:"#34d399", opacity:0.6, fontWeight:700, letterSpacing:"1px", marginTop:2 }}>ORDERS DONE</div>
                        </div>
                      </div>

                      {/* Sample mix bar */}
                      {total>0&&(
                        <div style={{marginBottom:10}}>
                          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                            {TYPES.map(t=>{
                              const v=(data.finnrick[t.key]||0)+(data.other[t.key]||0);
                              return <span key={t.key} style={{fontSize:10,color:t.color,fontFamily:"'IBM Plex Mono',monospace"}}>{t.short}&nbsp;{pct(v)}%</span>;
                            })}
                          </div>
                          <StatBar segments={TYPES.map(t=>({color:t.color,pct:pct((data.finnrick[t.key]||0)+(data.other[t.key]||0))}))}/>
                        </div>
                      )}

                      {/* Completion bar */}
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
