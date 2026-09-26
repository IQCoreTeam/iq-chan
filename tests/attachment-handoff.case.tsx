import {test,expect,mock} from 'bun:test';
import {JSDOM} from 'jsdom';
import {act,useState} from 'react';
mock.module('../src/components/attachment',()=>({default:()=> <span>Media preview</span>}));
const {default:AttachmentField}=await import('../src/components/attachment-field');

async function mount(blocked=false, host='blockchan.sol.site'){
 const dom=new JSDOM('<div id="root"></div>',{url:'https://'+host});
 Object.assign(globalThis,{window:dom.window,document:dom.window.document,IS_REACT_ACT_ENVIRONMENT:true});
 const other=new JSDOM('',{url:'https://iqlabs.dev'});
 let opened='';let changes=0;let current='';const sent:any[]=[];
 dom.window.open=((url:string)=>{opened=url;return blocked?null:other.window;}) as any;
 dom.window.focus=()=>{};other.window.postMessage=((...args:any[])=>sent.push(args)) as any;
 function Form(){const [value,setValue]=useState('');return <AttachmentField value={value} onChange={v=>{changes++;current=v;setValue(v);}} disabled={false} onPendingChange={()=>{}}/>;}
 const {createRoot}=await import('react-dom/client');const root=createRoot(document.getElementById('root')!);
 await act(async()=>root.render(<Form/>));
 const click=async(text:string)=>act(async()=>{[...document.querySelectorAll('button')].find(b=>b.textContent===text)!.click();});
 const emit=async(data:any={},origin='https://iqlabs.dev',source:any=other.window)=>act(async()=>{
  dom.window.dispatchEvent(new dom.window.MessageEvent('message',{origin,source,data:{type:'iq:attachment-complete',network:'solana',signature:'2'.repeat(88),requestId:new URL(opened).searchParams.get('attachmentRequest'),...data}}));
 });
 return {click,emit,sent,value:()=>current,changes:()=>changes,opened:()=>opened,close:async()=>{await act(async()=>root.unmount());dom.window.close();other.window.close();}};
}

test('only the matching uploader window/origin/request can attach a valid Solana result',async()=>{
 const v=await mount();try{
  expect(document.querySelector('input[type=url]')).toBeNull();
  await v.click('Inscribe attachment');
  expect(new URL(v.opened()).searchParams.get('attachmentOrigin')).toBe('https://blockchan.sol.site');
  await v.emit({},'https://iqlabs.dev.evil.invalid');
  await v.emit({},'https://iqlabs.dev',window);
  await v.emit({requestId:'old-request'});await v.emit({signature:'bad'});await v.emit({network:'robinhood'});
  expect(v.changes()).toBe(0);
  await v.emit();expect(v.changes()).toBe(1);
  expect(v.value()).toBe('2'.repeat(88));
  expect(v.sent[0][0].type).toBe('iq:attachment-accepted');
  expect(v.sent[0][1]).toBe('https://iqlabs.dev');
  await v.emit();expect(v.changes()).toBe(1);
  await v.click('Replace inscription');await v.click('Cancel attachment');
  expect(v.value()).toBe('2'.repeat(88));
  await v.click('[Remove]');expect(v.value()).toBe('');
 }finally{await v.close();}
});
test('blocked popup preserves the draft and gives a retry message',async()=>{
 const v=await mount(true);try{await v.click('Inscribe attachment');expect(document.body.textContent).toContain('Allow the IQ Labs popup');expect(v.changes()).toBe(0);}finally{await v.close();}
});
test('cancelled request ignores late results without closing the upload window',async()=>{
 const v=await mount();try{await v.click('Inscribe attachment');await v.click('Cancel attachment');await v.emit();expect(v.changes()).toBe(0);expect(document.body.textContent).toContain('upload window is still open');}finally{await v.close();}
});
test('a replacement request rejects an earlier upload result',async()=>{
 const v=await mount();try{await v.click('Inscribe attachment');const old=new URL(v.opened()).searchParams.get('attachmentRequest');await v.click('Cancel attachment');await v.click('Inscribe attachment');await v.emit({requestId:old});expect(v.changes()).toBe(0);await v.emit();expect(v.changes()).toBe(1);}finally{await v.close();}
});

test('HoodChan opens Hood In and accepts only its matching EVM result',async()=>{
 const v=await mount(false,'hoodchan.xyz');try{
  await v.click('Inscribe attachment');
  expect(new URL(v.opened()).searchParams.get('menu')).toBe('hoodin');
  await v.emit();expect(v.changes()).toBe(0);
  await v.emit({network:'robinhood',signature:'0x'+'a'.repeat(64)});
  expect(v.value()).toBe('0x'+'a'.repeat(64));
 }finally{await v.close();}
});
