import {test,expect,mock} from 'bun:test';
import {JSDOM} from 'jsdom';
import {act} from 'react';
let lists=0,images=0,address:string|null='qa-wallet';
const items=[{signature:'2'.repeat(88),kind:'audio'},{signature:'3'.repeat(88),kind:'video'},{signature:'4'.repeat(88),kind:'image'}];
mock.module('../src/lib/chains/context',()=>({useChainWallet:()=>({address})}));
mock.module('../src/lib/chains',()=>({getChain:async()=>({listInventory:async()=>{lists++;return items;}})}));
mock.module('../src/components/inscription-image',()=>({default:()=>{images++;return <img alt="fixture image"/>;}}));
const{default:Inventory}=await import('../src/components/inventory-modal');
const{createRoot}=await import('react-dom/client');
async function mount(){const dom=new JSDOM('<div id="root"></div>',{url:'http://localhost'});Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});let picked='',closed=0;const root=createRoot(document.getElementById('root')!);await act(async()=>root.render(<Inventory onPick={sig=>{picked=sig;}} onClose={()=>{closed++;}}/>));return{picked:()=>picked,closed:()=>closed,close:async()=>{await act(async()=>root.unmount());dom.window.close();}};}
for(const kind of ['audio','video'])test(`${kind} tile selects its existing signature with one inventory read and no media hydration`,async()=>{
 lists=0;images=0;address='qa-wallet';const v=await mount();try{
 expect(lists).toBe(1);expect(images).toBe(1);
 const button=document.querySelector(`button[aria-label^="Select ${kind}"]`) as HTMLButtonElement;
 expect(button).not.toBeNull();expect(document.querySelectorAll('audio,video')).toHaveLength(0);
 await act(async()=>button.click());expect(v.picked()).toBe(items.find(item=>item.kind===kind)!.signature);expect(v.closed()).toBe(1);expect(lists).toBe(1);
 }finally{await v.close();}
});
test('disconnected inventory does not fetch and explains how to proceed',async()=>{lists=0;address=null;const v=await mount();try{expect(lists).toBe(0);expect(document.body.textContent).toContain('Connect your wallet');}finally{await v.close();}});
