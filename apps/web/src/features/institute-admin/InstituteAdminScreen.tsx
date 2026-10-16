'use client';
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import Link from 'next/link';
import { Building2, Users, BookOpen, ClipboardCheck, Layers, ShieldCheck, Upload, BarChart3, ArrowRight, Plus, Trash2, Search } from 'lucide-react';
import { PREFIX, menu } from './InstituteAdminWorkspace';
import styles from './institute.module.css';

type Role = 'LEARNER' | 'COORDINATOR' | 'MANAGER';
type Member = { id: string; name: string; email: string; role: Role; status: 'ACTIVE' | 'INACTIVE' };
type Permission = 'create' | 'upload' | 'edit' | 'delete' | 'review' | 'publish';
type State = {
  profile: { name: string; type: string; email: string; phone: string; code: string };
  members: Member[];
  permissions: Record<'COORDINATOR' | 'MANAGER', Record<Permission, boolean>>;
  environment: 'EMPTY' | 'PRELOADED';
  technologies: string[];
  assignments: { id: string; title: string; target: string; type: string; status: string }[];
};
const permissions: Permission[] = ['create','upload','edit','delete','review','publish'];
const technologyOptions = ['Python', 'Java', 'JavaScript', 'C', 'C++', 'Full Stack', 'Cybersecurity', 'Data Analytics', 'Databases', 'AI / ML'];
const defaults: State = {
  profile: { name: 'Demo Institution', type: 'UNIVERSITY', email: '', phone: '', code: 'DEMO-001' },
  members: [],
  permissions: {
    COORDINATOR: { create: true, upload: true, edit: true, delete: false, review: true, publish: false },
    MANAGER: { create: false, upload: false, edit: false, delete: false, review: true, publish: false },
  },
  environment: 'EMPTY', technologies: [], assignments: [],
};
const STORE = 'elab-institute-admin-ui-preview-v1';
const cloneDefaults = (): State => JSON.parse(JSON.stringify(defaults)) as State;
function usePreviewState() {
  const [state, setState] = useState<State>(cloneDefaults);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORE);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<State>;
        if (parsed.profile && Array.isArray(parsed.members) && parsed.permissions && Array.isArray(parsed.technologies) && Array.isArray(parsed.assignments)) setState({ ...cloneDefaults(), ...parsed } as State);
      }
    } catch { /* malformed preview data: keep defaults */ }
    setReady(true);
  }, []);
  useEffect(() => { if (ready) { try { window.localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* storage unavailable */ } } }, [state, ready]);
  return [state, setState, ready] as const;
}
const Input = ({ label, value, onChange, type = 'text', required = false }: { label: string; value: string; onChange: (v:string)=>void; type?: string; required?: boolean }) => <label className={styles.field}><span>{label}</span><input type={type} value={value} required={required} onChange={e => onChange(e.target.value)} /></label>;
const Title = ({ title, description }: { title: string; description: string }) => <header className={styles.heading}><div><span className={styles.eyebrow}>B2B E-Lab · Institute Admin</span><h1>{title}</h1><p>{description}</p></div><span className={styles.tag}>Frontend preview · Local data</span></header>;
const Panel = ({ title, children }: { title: string; children: ReactNode }) => <section className={styles.panel}><h2>{title}</h2>{children}</section>;

export function InstituteAdminScreen({ section }: { section: string }) {
  const [state, setState, ready] = usePreviewState();
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [memberForm, setMemberForm] = useState({ name: '', email: '', role: 'LEARNER' as Role });
  const [targetForm, setTargetForm] = useState({ title: '', target: '', type: 'Batch' });
  const [csvRows, setCsvRows] = useState<Omit<Member, 'id' | 'status'>[]>([]);
  const [csvErrors, setCsvErrors] = useState<string[]>([]);
  const setProfile = (key: keyof State['profile'], value: string) => setState(s => ({ ...s, profile: { ...s.profile, [key]: value } }));
  const alert = (message: string) => { setNotice(message); };
  if (!ready) return <p>Loading frontend preview…</p>;
  if (!menu.some(item => item.slug === section)) return <Title title="Page not found" description="Select a module from the navigation." />;

  const addMember = (e: FormEvent) => {
    e.preventDefault();
    const email = memberForm.email.trim().toLowerCase();
    if (!memberForm.name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return alert('Enter a valid name and email.');
    if (state.members.some(m => m.email.toLowerCase() === email)) return alert('This email is already in the preview list.');
    setState(s => ({ ...s, members: [...s.members, { ...memberForm, name: memberForm.name.trim(), email, id: crypto.randomUUID(), status: 'ACTIVE' }] }));
    setMemberForm({ name: '', email: '', role: 'LEARNER' }); alert('Member added to browser preview only.');
  };
  const importCsv = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; setCsvRows([]); setCsvErrors([]); if (!file) return;
    if (file.size > 1024 * 1024) return setCsvErrors(['File exceeds 1 MB preview limit.']);
    const text = (await file.text()).replace(/^\uFEFF/, '');
    // Lightweight CSV preview: quoted commas/newlines are not supported; backend importer will handle RFC 4180.
    const lines = text.trim().split(/\r?\n/);
    if (lines.shift()?.trim().toLowerCase() !== 'name,email,role') return setCsvErrors(['Expected CSV header: name,email,role']);
    const rows: Omit<Member,'id'|'status'>[] = []; const errors: string[] = []; const seen = new Set(state.members.map(m => m.email.toLowerCase()));
    lines.forEach((line, i) => {
      if (!line.trim()) return;
      const parts = line.split(',').map(s => s.trim());
      const [name,email,role] = parts;
      if (parts.length !== 3 || !name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email || '') || !['LEARNER','COORDINATOR','MANAGER'].includes(role || '')) { errors.push(`Row ${i+2}: invalid name, email or role`); return; }
      if (seen.has(email.toLowerCase())) { errors.push(`Row ${i+2}: duplicate email`); return; }
      seen.add(email.toLowerCase()); rows.push({ name, email: email.toLowerCase(), role: role as Role });
    });
    setCsvRows(rows); setCsvErrors(errors);
  };
  const importRows = () => { if (csvErrors.length || !csvRows.length) return; setState(s => ({ ...s, members: [...s.members, ...csvRows.map(m => ({ ...m, id: crypto.randomUUID(), status: 'ACTIVE' as const }))] })); setCsvRows([]); alert('CSV members added to browser preview only.'); };

  return <div className={styles.page}>
    {notice && <div className={styles.notice} role="status">{notice}<button type="button" onClick={() => setNotice('')}>Dismiss</button></div>}
    {section === 'dashboard' && <>
      <Title title="Institute Admin Dashboard" description="Manage institution users, permissions, environments and learning content." />
      <div className={styles.banner}><Building2/><div><h2>{state.profile.name}</h2><p>{state.profile.type} · {state.profile.code} · Demo environment</p></div></div>
      <div className={styles.stats}>{[
        ['Total Learners', String(state.members.filter(m=>m.role==='LEARNER').length), Users],
        ['Configured Technologies', String(state.technologies.length), Layers],
        ['Published Assignments', String(state.assignments.filter(a=>a.status==='PUBLISHED').length), BookOpen],
        ['Pending Reviews', '—', ClipboardCheck],
      ].map(([label,value,Icon]) => { const I = Icon as typeof Users; return <div className={styles.stat} key={label as string}><I size={22}/><span>{label as string}</span><strong>{value as string}</strong></div>; })}</div>
      <div className={styles.cards}>{menu.filter(m=>!['dashboard','registration'].includes(m.slug)).map(m=><Link className={styles.card} key={m.slug} href={`${PREFIX}/${m.slug}`}><m.Icon size={25}/><strong>{m.label}</strong><span>Open frontend module <ArrowRight size={15}/></span></Link>)}</div>
    </>}
    {section === 'profile' && <><Title title="Institution Profile" description="Edit the organization details in this browser preview."/><Panel title="Organization Details"><form className={styles.form} onSubmit={e=>{e.preventDefault();alert('Profile stored locally in this browser only.');}}><Input label="Institution name" required value={state.profile.name} onChange={v=>setProfile('name',v)}/><label className={styles.field}><span>Organization type</span><select value={state.profile.type} onChange={e=>setProfile('type',e.target.value)}>{['UNIVERSITY','COLLEGE','CORPORATE','SKILL_ACADEMY','BOOTCAMP','NGO','GOVERNMENT'].map(v=><option key={v}>{v}</option>)}</select></label><Input label="Institution code" required value={state.profile.code} onChange={v=>setProfile('code',v)}/><Input label="Contact email" type="email" value={state.profile.email} onChange={v=>setProfile('email',v)}/><Input label="Contact phone" value={state.profile.phone} onChange={v=>setProfile('phone',v)}/><button className={styles.primary}>Save preview profile</button></form></Panel></>}
    {section === 'users' && <><Title title="User Management" description="Create, search and activate institutional members in local preview state."/><Panel title="Add Member"><form className={styles.form} onSubmit={addMember}><Input label="Full name" required value={memberForm.name} onChange={v=>setMemberForm(s=>({...s,name:v}))}/><Input label="Email" type="email" required value={memberForm.email} onChange={v=>setMemberForm(s=>({...s,email:v}))}/><label className={styles.field}><span>Role</span><select value={memberForm.role} onChange={e=>setMemberForm(s=>({...s,role:e.target.value as Role}))}>{['LEARNER','COORDINATOR','MANAGER'].map(v=><option key={v}>{v}</option>)}</select></label><button className={styles.primary}><Plus size={16}/> Add member</button></form></Panel><Panel title={`Members (${state.members.length})`}><label className={styles.search}><Search size={17}/><input placeholder="Search name or email" value={search} onChange={e=>setSearch(e.target.value)}/></label><div className={styles.tableScroll}><table><thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody>{state.members.filter(m=>`${m.name} ${m.email}`.toLowerCase().includes(search.toLowerCase())).map(m=><tr key={m.id}><td>{m.name}</td><td>{m.email}</td><td>{m.role}</td><td>{m.status}</td><td><button type="button" onClick={()=>setState(s=>({...s,members:s.members.map(x=>x.id===m.id?{...x,status:x.status==='ACTIVE'?'INACTIVE':'ACTIVE'}:x)}))}>{m.status==='ACTIVE'?'Deactivate':'Activate'}</button> <button type="button" aria-label={`Remove ${m.name}`} onClick={()=>setState(s=>({...s,members:s.members.filter(x=>x.id!==m.id)}))}><Trash2 size={15}/></button></td></tr>)}</tbody></table>{state.members.length===0&&<p>No members added yet.</p>}</div></Panel></>}
    {section === 'permissions' && <><Title title="Coordinator Permissions" description="Configure example Coordinator and Manager actions. These toggles do not grant real access."/><Panel title="Permission Checklist"><div className={styles.tableScroll}><table><thead><tr><th>Role</th>{permissions.map(p=><th key={p}>{p}</th>)}</tr></thead><tbody>{(['COORDINATOR','MANAGER'] as const).map(role=><tr key={role}><th>{role}</th>{permissions.map(p=><td key={p}><input aria-label={`${role} ${p}`} type="checkbox" checked={state.permissions[role][p]} onChange={e=>setState(s=>({...s,permissions:{...s.permissions,[role]:{...s.permissions[role],[p]:e.target.checked}}}))}/></td>)}</tr>)}</tbody></table></div><p className={styles.help}>Changes are stored only in this browser. API permission guards will be implemented during backend integration.</p></Panel></>}
    {section === 'environment' && <><Title title="Environment Setup" description="Configure Empty or Preloaded environment and supported technologies."/><Panel title="Environment Type"><div className={styles.choice}>{(['EMPTY','PRELOADED'] as const).map(mode=><label key={mode}><input type="radio" checked={state.environment===mode} onChange={()=>setState(s=>({...s,environment:mode}))}/>{mode==='EMPTY'?'Empty Environment':'Preloaded Environment'}</label>)}</div><p className={styles.help}>{state.environment==='EMPTY'?'No preloaded problems; select runtime technologies required.':'Selected preloaded content and runtime availability will be provisioned later by backend.'}</p></Panel><Panel title="Technology Selection"><div className={styles.checkGrid}>{technologyOptions.map(t=><label key={t}><input type="checkbox" checked={state.technologies.includes(t)} onChange={e=>setState(s=>({...s,technologies:e.target.checked?[...s.technologies,t]:s.technologies.filter(x=>x!==t)}))}/>{t}</label>)}</div><p className={styles.help}>Selected: {state.technologies.join(', ')||'None'}</p></Panel></>}
    {section === 'bulk-upload' && <><Title title="Bulk User Upload" description="Preview a basic CSV import without calling an API."/><Panel title="Upload CSV"><p>Required columns: <code>name,email,role</code>. Roles: LEARNER, COORDINATOR, MANAGER.</p><a className={styles.inlineLink} href="data:text/csv;charset=utf-8,name%2Cemail%2Crole%0AExample%20Learner%2Clearner%40example.com%2CLEARNER%0A" download="elab-users-template.csv">Download CSV template</a><label className={styles.field}><span>Choose CSV (max 1 MB)</span><input type="file" accept=".csv,text/csv" onChange={importCsv}/></label>{csvErrors.map(e=><p className={styles.error} key={e}>{e}</p>)}<p>{csvRows.length} valid rows ready for preview import</p><button className={styles.primary} type="button" disabled={!csvRows.length||!!csvErrors.length} onClick={importRows}>Import to preview</button><p className={styles.help}>Simple CSV only: quoted commas and multiline values are not supported in this frontend preview.</p></Panel></>}
    {section === 'publishing' && <><Title title="Publishing" description="Define a target batch, academic year or semester for a practice assignment."/><Panel title="Create Publishing Plan"><form className={styles.form} onSubmit={e=>{e.preventDefault();if(!targetForm.title.trim()||!targetForm.target.trim())return;setState(s=>({...s,assignments:[...s.assignments,{...targetForm,id:crypto.randomUUID(),status:'DRAFT'}]}));setTargetForm({title:'',target:'',type:'Batch'});alert('Draft created in browser preview only.');}}><Input label="Assignment title" required value={targetForm.title} onChange={v=>setTargetForm(s=>({...s,title:v}))}/><label className={styles.field}><span>Target type</span><select value={targetForm.type} onChange={e=>setTargetForm(s=>({...s,type:e.target.value}))}>{['Batch','Academic Year','Semester'].map(v=><option key={v}>{v}</option>)}</select></label><Input label="Target name" required value={targetForm.target} onChange={v=>setTargetForm(s=>({...s,target:v}))}/><button className={styles.primary}>Create draft</button></form></Panel><Panel title="Publishing Plans"><div className={styles.tableScroll}><table><thead><tr><th>Assignment</th><th>Target</th><th>Status</th><th>Action</th></tr></thead><tbody>{state.assignments.map(a=><tr key={a.id}><td>{a.title}</td><td>{a.type}: {a.target}</td><td>{a.status}</td><td><button type="button" disabled={a.status==='PUBLISHED'} onClick={()=>setState(s=>({...s,assignments:s.assignments.map(x=>x.id===a.id?{...x,status:'PUBLISHED'}:x)}))}>Publish (preview)</button></td></tr>)}</tbody></table>{!state.assignments.length&&<p>No assignments created yet.</p>}</div></Panel></>}
    {section === 'analytics' && <><Title title="Analytics" description="Institution-specific analytics will connect to the backend later."/><div className={styles.stats}><div className={styles.stat}><BarChart3/><span>Members</span><strong>{state.members.length}</strong></div><div className={styles.stat}><BookOpen/><span>Published plans</span><strong>{state.assignments.filter(a=>a.status==='PUBLISHED').length}</strong></div><div className={styles.stat}><ClipboardCheck/><span>Submissions</span><strong>—</strong></div></div><Panel title="Learner Progress"><p>No submission data connected. Analytics will be institution-scoped after backend integration.</p></Panel></>}
    {section === 'content' && <><Title title="Content Tools" description="Open the existing Content Manager tools while the Institute Admin role is being developed."/><div className={styles.cards}>{[['Upload Content','/upload-content'],['Test Case Preparation','/test-case-preparation'],['Content Library','/content-library'],['Content Organization','/taxonomy'],['Content Batches','/batches'],['Review Queue','/review'],['Content Reports','/content-reports']].map(([name,href])=><Link className={styles.card} href={href} key={href}><Upload size={24}/><strong>{name}</strong><span>Open existing screen <ArrowRight size={15}/></span></Link>)}</div></>}
    {section === 'learners' && <><Title title="Learner Assignment" description="Publish to a target batch, academic year or semester."/><Panel title="Learner Targeting"><p>Use the Publishing screen to create assignment plans. Actual learner eligibility and access are not yet connected.</p><Link className={styles.inlineLink} href={`${PREFIX}/publishing`}>Go to Publishing →</Link></Panel></>}
    {section === 'review' && <><Title title="Review Workflow" description="Coordinator submission and Institute Admin approval will be integrated with backend permissions."/><Panel title="Review Queue"><p>For now, use the existing Content Manager Review Queue.</p><Link className={styles.inlineLink} href="/review">Open existing Review Queue →</Link></Panel></>}
    {section === 'registration' && <><Title title="Registration Preview" description="Institution registration and account provisioning will be implemented in the platform administration backend."/><Panel title="Current Institution"><p>{state.profile.name} ({state.profile.code})</p><Link className={styles.inlineLink} href={`${PREFIX}/profile`}>Edit institution profile →</Link></Panel></>}
  </div>;
}
