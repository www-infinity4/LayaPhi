// Phi provider discovery adapters.
//
// These functions translate Phi-owned capability manifests into ToolScanner
// candidate metadata. Translation is discovery only: it does not approve,
// install, fetch credentials for, or execute a provider.

const INTERNAL_LICENSE='MIT';

function assertObject(value,label){
 if(!value||typeof value!=='object'||Array.isArray(value))throw new TypeError(`${label} must be an object`);
}

export function candidatesFromApiPhi(catalog,{lastPushed='1970-01-01T00:00:00Z'}={}){
 assertObject(catalog,'APIPhi catalog');
 if(catalog.schema!=='phi.capability-catalog')throw new TypeError('unsupported APIPhi catalog schema');
 return (catalog.candidates||[]).map(item=>({
  repository:'www-infinity4/APIPhi',
  purpose:`${item.category||'external'} capability candidate: ${item.id}`,
  category:item.category||'external-api',
  license:INTERNAL_LICENSE,
  lastPushed,
  archived:false,
  framework:'adapter',
  dependencies:0,
  bundleKb:0,
  installScripts:false,
  nativeBinaries:false,
  networkAtRuntime:true,
  knownAdvisories:0,
  capabilities:(item.capabilities||[]).map(String)
 }));
}

export function candidateFromQuantAI(contract,{lastPushed='1970-01-01T00:00:00Z'}={}){
 assertObject(contract,'Quant-AI contract');
 if(contract.schema!=='phi.capability-provider')throw new TypeError('unsupported Quant-AI capability schema');
 const capabilities=(contract.capabilities||[]).map(item=>String(item.id)).filter(Boolean);
 if(!capabilities.length)throw new TypeError('Quant-AI contract has no discoverable capabilities');
 return {
  repository:'www-infinity4/Quant-AI',
  purpose:'Authenticated owner-scoped Quant intelligence backed by the authoritative QuantaPhi ledger',
  category:'quant-intelligence',
  license:INTERNAL_LICENSE,
  lastPushed,
  archived:false,
  framework:'cloudflare-worker',
  dependencies:0,
  bundleKb:0,
  installScripts:false,
  nativeBinaries:false,
  networkAtRuntime:true,
  knownAdvisories:0,
  capabilities
 };
}
