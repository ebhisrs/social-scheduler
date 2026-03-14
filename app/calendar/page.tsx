'use client'
import { useState, useEffect } from 'react'
import toast from 'react-hot-toast'
import { Plus, Trash2, Zap, CheckCircle, Pencil, X, Mail, ToggleLeft, ToggleRight, Clock, ChevronDown, ChevronUp } from 'lucide-react'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']
const DAY_FULL: Record<string,string> = { monday:'Monday',tuesday:'Tuesday',wednesday:'Wednesday',thursday:'Thursday',friday:'Friday',saturday:'Saturday',sunday:'Sunday' }
const DAY_SHORT: Record<string,string> = { monday:'Mon',tuesday:'Tue',wednesday:'Wed',thursday:'Thu',friday:'Fri',saturday:'Sat',sunday:'Sun' }
const PLATFORM_COLORS: Record<string,string> = { twitter:'#1da1f2',instagram:'#e1306c',facebook:'#1877f2',linkedin:'#0a66c2' }
const PLATFORM_ICONS: Record<string,string> = { twitter:'𝕏',instagram:'📸',facebook:'📘',linkedin:'💼' }

const emptyForm = () => ({ name:'',keyword:'',dayTimes:{} as Record<string,string[]>,accountIds:[] as string[],language:'French',tone:'professional',postsPerSlot:1,notifyEmail:'',companyName:'',companyPhone:'',companyAddress:'',companyWebsite:'' })

export default function CalendarPage() {
  const [automations,setAutomations] = useState<any[]>([])
  const [accounts,setAccounts] = useState<any[]>([])
  const [showing,setShowing] = useState(false)
  const [editingId,setEditingId] = useState<string|null>(null)
  const [form,setForm] = useState(emptyForm())
  const [saving,setSaving] = useState(false)
  const [expandedId,setExpandedId] = useState<string|null>(null)
  const [expandedPostId,setExpandedPostId] = useState<string|null>(null)

  const load = () => {
    fetch('/api/automation').then(r=>r.json()).then(setAutomations).catch(()=>{})
    fetch('/api/accounts').then(r=>r.json()).then(setAccounts).catch(()=>{})
  }
  useEffect(()=>{ load() },[])

  const setF = (k:string,v:any) => setForm(f=>({...f,[k]:v}))
  const toggleDay = (day:string) => { const n={...form.dayTimes}; if(n[day]) delete n[day]; else n[day]=['09:00']; setF('dayTimes',n) }
  const addTime = (day:string) => setF('dayTimes',{...form.dayTimes,[day]:[...(form.dayTimes[day]||[]),'12:00']})
  const updateTime = (day:string,i:number,val:string) => { const t=[...(form.dayTimes[day]||[])]; t[i]=val; setF('dayTimes',{...form.dayTimes,[day]:t}) }
  const removeTime = (day:string,i:number) => { const t=(form.dayTimes[day]||[]).filter((_:string,idx:number)=>idx!==i); if(!t.length){const n={...form.dayTimes};delete n[day];setF('dayTimes',n)}else setF('dayTimes',{...form.dayTimes,[day]:t}) }
  const toggleAccount = (id:string) => setF('accountIds',form.accountIds.includes(id)?form.accountIds.filter((a:string)=>a!==id):[...form.accountIds,id])

  const openNew = () => { setEditingId(null); setForm({...emptyForm(),accountIds:accounts.map((a:any)=>a.id)}); setShowing(true) }
  const openEdit = (auto:any) => {
    const config=JSON.parse(auto.platforms)
    setEditingId(auto.id)
    setForm({ name:auto.name,keyword:auto.keyword||'',dayTimes:JSON.parse(auto.dayTimes||'{}'),accountIds:config.accountIds||[],language:config.language||'French',tone:config.tone||'professional',postsPerSlot:auto.postsPerSlot||1,notifyEmail:auto.notifyEmail||'',companyName:auto.companyName||'',companyPhone:auto.companyPhone||'',companyAddress:auto.companyAddress||'',companyWebsite:auto.companyWebsite||'' })
    setShowing(true); window.scrollTo({top:0,behavior:'smooth'})
  }
  const closeForm = () => { setShowing(false); setEditingId(null); setForm(emptyForm()) }

  const save = async () => {
    if(!form.name) return toast.error('Add a name')
    if(!form.keyword) return toast.error('Add a keyword')
    if(!Object.keys(form.dayTimes).length) return toast.error('Select at least one day')
    if(!form.accountIds.length) return toast.error('Select at least one account')
    setSaving(true)
    try {
      const res = await fetch('/api/automation',{ method:editingId?'PATCH':'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(editingId?{id:editingId,...form}:form) })
      if(!res.ok) throw new Error()
      toast.success(editingId?'Saved! ✅':'Automation created! ✅')
      closeForm(); load()
    } catch { toast.error('Failed to save') }
    finally { setSaving(false) }
  }

  const deleteAuto = async (id:string) => {
    if(!confirm('Delete this automation?')) return
    await fetch(`/api/automation?id=${id}`,{method:'DELETE'})
    toast.success('Deleted'); load()
  }

  const toggleActive = async (auto:any) => {
    await fetch('/api/automation',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:auto.id,active:!auto.active})})
    load()
  }

  const totalPerWeek = (dt:Record<string,string[]>,pps:number) => Object.values(dt).reduce((s,t)=>s+t.length,0)*pps
  const scheduleSummary = (dt:Record<string,string[]>) => DAYS.filter(d=>dt[d]?.length).map(d=>`${DAY_SHORT[d]}: ${dt[d].join(', ')}`).join(' · ')

  return (
    <div className="animate-in">
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
        <div>
          <h1 style={{fontSize:28,fontWeight:700,marginBottom:4}}>📅 Auto-Post Calendar</h1>
          <p style={{color:'var(--muted)'}}>Pick days + times — AI writes and posts automatically every week</p>
        </div>
        <button className="btn-primary" onClick={openNew} style={{display:'flex',alignItems:'center',gap:6}}><Plus size={15}/> New Automation</button>
      </div>

      {showing && (
        <div className="glass animate-in" style={{padding:28,borderRadius:12,marginBottom:24}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:22}}>
            <h2 style={{fontSize:17,fontWeight:600}}>{editingId?'✏️ Edit Automation':'➕ New Automation'}</h2>
            <button onClick={closeForm} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)'}}><X size={18}/></button>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:14,marginBottom:20}}>
            <div><label style={{display:'block',marginBottom:6,fontSize:13,color:'var(--muted)'}}>Automation name</label><input value={form.name} onChange={e=>setF('name',e.target.value)} placeholder="e.g. Artisan weekly posts"/></div>
            <div><label style={{display:'block',marginBottom:6,fontSize:13,color:'var(--muted)'}}>Keyword / Topic 🔑</label><input value={form.keyword} onChange={e=>setF('keyword',e.target.value)} placeholder="e.g. vitrier à Chassieu"/></div>
            <div><label style={{display:'block',marginBottom:6,fontSize:13,color:'var(--muted)'}}>Language</label><select value={form.language} onChange={e=>setF('language',e.target.value)}><option value="French">🇫🇷 French</option><option value="English">🇬🇧 English</option><option value="Spanish">🇪🇸 Spanish</option></select></div>
            <div><label style={{display:'block',marginBottom:6,fontSize:13,color:'var(--muted)'}}>Tone</label><select value={form.tone} onChange={e=>setF('tone',e.target.value)}><option value="professional">Professional</option><option value="casual">Casual</option><option value="storytelling">Storytelling</option><option value="persuasive">Persuasive</option></select></div>
          </div>

          <div style={{marginBottom:20}}>
            <label style={{display:'block',marginBottom:10,fontSize:13,color:'var(--muted)',fontWeight:500}}>Articles per time slot?</label>
            <div style={{display:'flex',gap:8,alignItems:'center'}}>
              {[1,2,3].map(n=><button key={n} onClick={()=>setF('postsPerSlot',n)} style={{width:56,height:56,borderRadius:12,border:'none',cursor:'pointer',fontSize:20,fontWeight:700,background:form.postsPerSlot===n?'var(--accent)':'var(--surface2)',color:form.postsPerSlot===n?'white':'var(--muted)'}}>{n}</button>)}
              <span style={{fontSize:13,color:'var(--muted)',marginLeft:4}}>article{form.postsPerSlot>1?'s':''}/slot</span>
            </div>
          </div>

          <div style={{marginBottom:20}}>
            <label style={{display:'block',marginBottom:12,fontSize:13,color:'var(--muted)',fontWeight:500}}>📆 Days & posting times</label>
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {DAYS.map(day=>{
                const active=!!form.dayTimes[day]; const times:string[]=form.dayTimes[day]||[]
                return (
                  <div key={day} style={{borderRadius:10,border:`1px solid ${active?'rgba(99,102,241,0.4)':'rgba(255,255,255,0.06)'}`,background:active?'rgba(99,102,241,0.06)':'rgba(255,255,255,0.02)',padding:'10px 14px',display:'flex',alignItems:'center',gap:12,flexWrap:'wrap'}}>
                    <button onClick={()=>toggleDay(day)} style={{minWidth:110,padding:'7px 14px',borderRadius:8,border:'none',cursor:'pointer',background:active?'var(--accent)':'var(--surface2)',color:active?'white':'var(--muted)',fontWeight:active?600:400,fontSize:13}}>{active?'✓ ':''}{DAY_FULL[day]}</button>
                    {active&&<>{times.map((t,i)=><div key={i} style={{display:'flex',alignItems:'center',gap:4}}><Clock size={12} color="var(--muted)"/><input type="time" value={t} onChange={e=>updateTime(day,i,e.target.value)} style={{width:120,padding:'5px 8px',fontSize:13}}/>{times.length>1&&<button onClick={()=>removeTime(day,i)} style={{background:'none',border:'none',cursor:'pointer',color:'#ef4444',fontSize:18,lineHeight:1}}>×</button>}</div>)}<button onClick={()=>addTime(day)} style={{padding:'5px 12px',borderRadius:6,border:'1px dashed rgba(99,102,241,0.4)',background:'none',color:'var(--accent)',cursor:'pointer',fontSize:12}}>+ add time</button></>}
                  </div>
                )
              })}
            </div>
            {Object.keys(form.dayTimes).length>0&&<div style={{marginTop:10,padding:'10px 14px',borderRadius:8,background:'rgba(16,185,129,0.08)',border:'1px solid rgba(16,185,129,0.2)'}}><p style={{fontSize:13,color:'#10b981',margin:0}}>✓ <strong>{totalPerWeek(form.dayTimes,form.postsPerSlot)} articles/week</strong> — {scheduleSummary(form.dayTimes)}</p></div>}
          </div>

          <div style={{marginBottom:20}}>
            <label style={{display:'block',marginBottom:10,fontSize:13,color:'var(--muted)',fontWeight:500}}>Post to:</label>
            {!accounts.length?<p style={{fontSize:13,color:'var(--muted)'}}>No accounts. <a href="/connect" style={{color:'var(--accent)'}}>Connect one →</a></p>:<div style={{display:'flex',flexWrap:'wrap',gap:8}}>{accounts.map((acc:any)=>{const sel=form.accountIds.includes(acc.id);const color=PLATFORM_COLORS[acc.platform]||'#6366f1';return(<button key={acc.id} onClick={()=>toggleAccount(acc.id)} style={{padding:'9px 16px',borderRadius:10,fontSize:13,border:'none',cursor:'pointer',background:sel?color+'22':'var(--surface2)',color:sel?color:'var(--muted)',outline:sel?`2px solid ${color}`:'none',fontWeight:sel?600:400}}>{PLATFORM_ICONS[acc.platform]} {acc.username} {sel?'✓':''}</button>)})}</div>}
          </div>

          <div style={{marginBottom:20}}>
            <label style={{display:'block',marginBottom:10,fontSize:13,color:'var(--muted)',fontWeight:500}}>🏢 Company info <span style={{fontWeight:400}}>(added to every post)</span></label>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div><label style={{display:'block',marginBottom:4,fontSize:12,color:'var(--muted)'}}>Company name</label><input value={form.companyName} onChange={e=>setF('companyName',e.target.value)} placeholder="Ex: Vitrage Pro Lyon"/></div>
              <div><label style={{display:'block',marginBottom:4,fontSize:12,color:'var(--muted)'}}>Phone</label><input value={form.companyPhone} onChange={e=>setF('companyPhone',e.target.value)} placeholder="Ex: 04 72 00 00 00"/></div>
              <div><label style={{display:'block',marginBottom:4,fontSize:12,color:'var(--muted)'}}>Address</label><input value={form.companyAddress} onChange={e=>setF('companyAddress',e.target.value)} placeholder="Ex: 12 rue du Bois, Chassieu"/></div>
              <div><label style={{display:'block',marginBottom:4,fontSize:12,color:'var(--muted)'}}>Website</label><input value={form.companyWebsite} onChange={e=>setF('companyWebsite',e.target.value)} placeholder="Ex: www.vitragepro.fr"/></div>
            </div>
          </div>

          <div style={{marginBottom:24}}>
            <label style={{display:'block',marginBottom:6,fontSize:13,color:'var(--muted)',fontWeight:500}}><Mail size={13} style={{display:'inline',marginRight:4}}/>Email if post fails <span style={{fontWeight:400}}>(optional)</span></label>
            <input type="email" value={form.notifyEmail} onChange={e=>setF('notifyEmail',e.target.value)} placeholder="your@email.com" style={{maxWidth:300}}/>
          </div>

          <div style={{display:'flex',gap:8}}>
            <button className="btn-primary" onClick={save} disabled={saving} style={{display:'flex',alignItems:'center',gap:6}}><CheckCircle size={14}/>{saving?'Saving...':editingId?'Save Changes':'Create Automation'}</button>
            <button className="btn-ghost" onClick={closeForm}>Cancel</button>
          </div>
        </div>
      )}

      {!automations.length?(
        <div className="glass" style={{padding:64,borderRadius:12,textAlign:'center',color:'var(--muted)'}}>
          <Zap size={32} style={{margin:'0 auto 12px',opacity:0.3}}/>
          <p style={{fontSize:16,fontWeight:500}}>No automations yet</p>
          <button className="btn-primary" onClick={openNew} style={{marginTop:16,display:'inline-flex',alignItems:'center',gap:6}}><Plus size={14}/> Create my first automation</button>
        </div>
      ):(
        <div style={{display:'flex',flexDirection:'column',gap:14}}>
          {automations.map((auto:any)=>{
            const config=JSON.parse(auto.platforms)
            const dayTimes:Record<string,string[]>=JSON.parse(auto.dayTimes||'{}')
            const activeDays=DAYS.filter(d=>dayTimes[d]?.length)
            const connectedAccounts=accounts.filter((a:any)=>config.accountIds?.includes(a.id))
            const isExpanded=expandedId===auto.id
            const posts:any[]=auto.autoPosts||[]
            return (
              <div key={auto.id} className="glass" style={{borderRadius:12,overflow:'hidden',opacity:auto.active?1:0.6,border:`1px solid ${auto.active?'rgba(99,102,241,0.2)':'rgba(255,255,255,0.06)'}`,borderLeft:`3px solid ${auto.active?'#6366f1':'#444'}`}}>
                <div style={{padding:20,display:'flex',alignItems:'flex-start',gap:14}}>
                  <div style={{width:40,height:40,borderRadius:10,background:auto.active?'linear-gradient(135deg,#6366f1,#8b5cf6)':'#333',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><Zap size={18} color="white"/></div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:5,flexWrap:'wrap'}}>
                      <span style={{fontWeight:700,fontSize:16}}>{auto.name}</span>
                      {!auto.active&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:'#333',color:'#888'}}>Paused</span>}
                      <span style={{fontSize:12,padding:'2px 10px',borderRadius:10,background:'rgba(99,102,241,0.15)',color:'var(--accent)'}}>{totalPerWeek(dayTimes,auto.postsPerSlot||1)} posts/week</span>
                    </div>
                    <div style={{fontSize:13,color:'var(--muted)',marginBottom:10}}>🔑 <span style={{color:'white',fontWeight:500}}>"{auto.keyword}"</span> · {config.language} · {config.tone}{auto.companyName&&<span> · 🏢 {auto.companyName}</span>}</div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6,marginBottom:10}}>
                      {activeDays.map(day=><div key={day} style={{padding:'4px 10px',borderRadius:8,background:'rgba(99,102,241,0.12)',border:'1px solid rgba(99,102,241,0.2)',fontSize:12}}><span style={{color:'#a5b4fc',fontWeight:600}}>{DAY_SHORT[day]}</span><span style={{color:'var(--muted)',marginLeft:5}}>{dayTimes[day].join(' & ')}</span></div>)}
                    </div>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {connectedAccounts.map((a:any)=><span key={a.id} style={{padding:'3px 10px',borderRadius:20,background:(PLATFORM_COLORS[a.platform]||'#6366f1')+'22',color:PLATFORM_COLORS[a.platform]||'#6366f1',fontSize:12}}>{PLATFORM_ICONS[a.platform]} {a.username}</span>)}
                      {auto.lastRunAt&&<span style={{padding:'3px 10px',borderRadius:20,background:'rgba(16,185,129,0.1)',color:'#10b981',fontSize:12}}>Last: {new Date(auto.lastRunAt).toLocaleString()}</span>}
                    </div>
                  </div>
                  <div style={{display:'flex',gap:2,alignItems:'center',flexShrink:0}}>
                    <button onClick={()=>toggleActive(auto)} style={{background:'none',border:'none',cursor:'pointer',color:auto.active?'#10b981':'#666',padding:6}}>{auto.active?<ToggleRight size={22}/>:<ToggleLeft size={22}/>}</button>
                    <button onClick={()=>openEdit(auto)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:6}}><Pencil size={15}/></button>
                    <button onClick={()=>deleteAuto(auto.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--muted)',padding:6}}><Trash2 size={15}/></button>
                  </div>
                </div>

                <button onClick={()=>setExpandedId(isExpanded?null:auto.id)} style={{width:'100%',padding:'11px 20px',background:'rgba(255,255,255,0.03)',border:'none',borderTop:'1px solid rgba(255,255,255,0.06)',cursor:'pointer',display:'flex',alignItems:'center',gap:8,color:'var(--muted)',fontSize:13}}>
                  <span style={{fontSize:15}}>📄</span>
                  <span style={{fontWeight:500}}>{posts.length>0?`Articles sent (${posts.length})`:'No articles sent yet'}</span>
                  {posts.length>0&&(isExpanded?<ChevronUp size={14} style={{marginLeft:'auto'}}/>:<ChevronDown size={14} style={{marginLeft:'auto'}}/>)}
                </button>

                {isExpanded&&posts.length>0&&(
                  <div style={{padding:'4px 16px 16px'}}>
                    <div style={{display:'flex',flexDirection:'column',gap:10,marginTop:10}}>
                      {posts.map((post:any)=>{
                        const postAccounts:string[]=JSON.parse(post.accounts||'[]')
                        const isPostExpanded=expandedPostId===post.id
                        const sentDate=new Date(post.sentAt)
                        return (
                          <div key={post.id} style={{borderRadius:10,border:`1px solid ${post.success?'rgba(16,185,129,0.2)':'rgba(239,68,68,0.2)'}`,background:post.success?'rgba(16,185,129,0.04)':'rgba(239,68,68,0.04)',overflow:'hidden'}}>
                            <div style={{padding:'12px 14px',display:'flex',alignItems:'flex-start',gap:10}}>
                              <span style={{fontSize:18,flexShrink:0}}>{post.success?'✅':'❌'}</span>
                              <div style={{flex:1,minWidth:0}}>
                                <div style={{display:'flex',flexWrap:'wrap',alignItems:'center',gap:8,marginBottom:6}}>
                                  <span style={{fontSize:13,fontWeight:600,color:'white'}}>{sentDate.toLocaleDateString('fr-FR',{weekday:'long',day:'numeric',month:'long',year:'numeric'})}</span>
                                  <span style={{fontSize:12,color:'#a5b4fc',background:'rgba(99,102,241,0.15)',padding:'2px 8px',borderRadius:6}}>🕐 {sentDate.toLocaleTimeString('fr-FR',{hour:'2-digit',minute:'2-digit'})}</span>
                                  {postAccounts.map((name:string,i:number)=>{const acc=accounts.find((a:any)=>a.username===name);const color=acc?(PLATFORM_COLORS[acc.platform]||'#6366f1'):'#6366f1';const icon=acc?(PLATFORM_ICONS[acc.platform]||'📱'):'📱';return(<span key={i} style={{fontSize:12,color,background:color+'18',padding:'2px 8px',borderRadius:6}}>{icon} {name}</span>)})}
                                </div>
                                {post.article&&<div><p style={{fontSize:13,color:'var(--text)',margin:0,lineHeight:1.6,whiteSpace:'pre-wrap',...(isPostExpanded?{}:{display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden'})}}>{post.article.content}</p><button onClick={()=>setExpandedPostId(isPostExpanded?null:post.id)} style={{background:'none',border:'none',cursor:'pointer',color:'var(--accent)',fontSize:12,padding:'4px 0',marginTop:4}}>{isPostExpanded?'▲ Show less':'▼ Read full article'}</button></div>}
                                {post.error&&<p style={{fontSize:12,color:'#ef4444',margin:'4px 0 0',padding:'6px 10px',background:'rgba(239,68,68,0.08)',borderRadius:6}}>⚠️ {post.error}</p>}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
