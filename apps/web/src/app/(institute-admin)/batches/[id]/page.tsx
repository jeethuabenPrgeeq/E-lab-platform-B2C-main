import BatchEditor from "@/features/institute-admin/batches/BatchEditor";
export default async function Page({params}:{params:Promise<{id:string}>}) { const {id}=await params; return <BatchEditor batchId={id}/>; }
