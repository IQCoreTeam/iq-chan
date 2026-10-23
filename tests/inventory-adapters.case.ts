import {test,expect,mock} from 'bun:test';
const sigs=['image','audio','video','text','file'];
let assets=0,slices=0,pages=0;
mock.module('../src/lib/gateway',()=>({fetchUserAssets:async()=>{assets++;return sigs;},fetchTableSlice:async()=>{slices++;return sigs.map((signature,i)=>({__txSignature:signature,kind:i===4?'file':signature,body:i===4?'data:audio/wav;base64,AA==':''}));},fetchDbRoot:()=>{},fetchThread:()=>{},fetchAllTableRows:()=>{},fetchTableMeta:()=>{},gwFetch:async()=>{pages++;return Response.json({rows:[{__txHash:'audio',kind:'audio',who:'0xAbC'},{__txHash:'video',kind:'file',body:'data:video/webm;base64,AA==',who:'0xabc'},{__txHash:'other',kind:'audio',who:'0xdef'},{__txHash:'text',kind:'text',who:'0xabc'}]});}}));
const{NETWORKS}=await import('../src/lib/chains/networks');
const{createSolanaReadAdapter}=await import('../src/lib/chains/solana/read');
const{createEvmReadAdapter}=await import('../src/lib/chains/evm/read');
test('Solana keeps newest asset order and adds audio/video using the same two existing reads',async()=>{
 const items=await createSolanaReadAdapter(NETWORKS.solana).listInventory('wallet');
 expect(items).toEqual([{signature:'image',kind:'image'},{signature:'audio',kind:'audio'},{signature:'video',kind:'video'},{signature:'file',kind:'audio'}]);expect(assets).toBe(1);expect(slices).toBe(1);
});
test('EVM uses its existing feed page, matches owner case-insensitively and recognizes video file rows',async()=>{
 const items=await createEvmReadAdapter(NETWORKS.robinhood).listInventory('0xABC');
 expect(items).toEqual([{signature:'audio',kind:'audio'},{signature:'video',kind:'video'}]);expect(pages).toBe(1);
});
