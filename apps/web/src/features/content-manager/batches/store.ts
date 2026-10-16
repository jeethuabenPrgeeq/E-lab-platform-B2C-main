export type Batch = { id:string; name:string; description:string; type:string; technology:string; easy:number; medium:number; hard:number; problemIds:string[]; createdAt:string; updatedAt:string; status:'draft' };
const KEY='elab-cm-batches-browser-drafts-v1';
export function readBatches():Batch[] { if(typeof window==='undefined') return []; try { const raw=JSON.parse(window.localStorage.getItem(KEY)||'[]'); return Array.isArray(raw)?raw.filter((b):b is Batch=>typeof b?.id==='string' && typeof b?.name==='string' && Array.isArray(b?.problemIds)):[]; }catch{return [];} }
export function writeBatch(batch:Batch) { const all=readBatches().filter(b=>b.id!==batch.id); window.localStorage.setItem(KEY,JSON.stringify([batch,...all])); }
export function removeBatch(id:string) {window.localStorage.setItem(KEY,JSON.stringify(readBatches().filter(b=>b.id!==id)));}
