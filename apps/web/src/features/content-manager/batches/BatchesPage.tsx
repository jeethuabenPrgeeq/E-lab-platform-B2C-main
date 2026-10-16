"use client";
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {Layers,Plus,Trash2,RefreshCw} from 'lucide-react';
import {readBatches,removeBatch,type Batch} from './store';
import styles from './Batches.module.css';
export default function BatchesPage(){
 const [batches,setBatches]=useState<Batch[]>([]); const [search,setSearch]=useState('');
 function refresh(){setBatches(readBatches());}
 useEffect(()=>{refresh();},[]);
 function discard(id:string){if(window.confirm('Delete this browser-only draft?')){removeBatch(id);refresh();}}
 const filtered=batches.filter(b=>b.name.toLowerCase().includes(search.toLowerCase()));
 return <main className={styles.page}><header className={styles.header}><div><p className={styles.eyebrow}>CONTENT MANAGEMENT</p><h1>Content Batches</h1><p className={styles.subtitle}>Prepare problem batches using your real Content Library records.</p></div><Link className={styles.primary} href="/batches/new"><Plus size={17}/> Create Batch</Link></header>
 <div className={styles.notice}>Frontend phase: drafts are saved only in this browser, not in PostgreSQL or the E-Lab API. They are not submitted or published.</div>
 <div className={styles.stats}><div><strong>{batches.length}</strong><span>Browser drafts</span></div><div><strong>{batches.reduce((n,b)=>n+b.problemIds.length,0)}</strong><span>Selected problem references</span></div><div><strong>0</strong><span>Submitted batches</span></div></div>
 <section className={styles.card}><div className={styles.cardHead}><h2>Batch drafts</h2><button type="button" className={styles.secondary} onClick={refresh}><RefreshCw size={15}/> Refresh</button></div><input className={styles.input} aria-label="Search batches" placeholder="Search batch name" value={search} onChange={e=>setSearch(e.target.value)}/>
 {filtered.length===0?<div className={styles.empty}><Layers size={30}/><h3>{batches.length?'No matching batches':'No batches created yet'}</h3><p>Start a browser-only draft, then select problems from your Content Library.</p><Link href="/batches/new" className={styles.primary}>Create first batch</Link></div>:<div className={styles.rows}>{filtered.map(b=><div key={b.id} className={styles.batchRow}><div><Link href={`/batches/${encodeURIComponent(b.id)}`} className={styles.batchName}>{b.name}</Link><p>{b.type} · {b.problemIds.length} problems · Draft (browser only)</p></div><button type="button" className={styles.secondary} onClick={()=>discard(b.id)} aria-label={`Delete ${b.name}`}><Trash2 size={16}/></button></div>)}</div>}</section></main>;
}
