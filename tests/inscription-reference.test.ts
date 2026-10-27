import {test,expect} from "bun:test";
import {parseInscriptionRef} from "../src/lib/inscription";
test("Solana IDs require 64 decoded bytes",()=>{
 for(const id of ["2".repeat(80),"1".repeat(80),"1".repeat(63),"1".repeat(65),"0".repeat(88)]) expect(parseInscriptionRef(id)).toBeNull();
 for(const id of ["2".repeat(88),"1".repeat(64),"1".repeat(63)+"2"]) expect(parseInscriptionRef(id)).toBe(id);
});
test("upstream pasted share/gateway references remain supported",()=>{
 const id="2".repeat(88);expect(parseInscriptionRef("https://iqlabs.dev/?menu=codein&post="+id)).toBe(id);
 expect(parseInscriptionRef("https://gateway.iqlabs.dev/img/"+id+".png")).toBe(id);
 expect(parseInscriptionRef("https://example.com/image.png")).toBeNull();
 const hash="0x"+"A".repeat(64);expect(parseInscriptionRef(hash)).toBe(hash.toLowerCase());
});

test('attachment chain comes from the reference, independently of its board', async () => {
 const {inscriptionNetwork}=await import('../src/lib/inscription');
 const {NETWORKS}=await import('../src/lib/chains/networks');
 const hash='0xf8fcb463421d4142859066bf7a9c3ba3e432c81b0ed86cd5e0e4b0aa27cb5d6b';
 expect(inscriptionNetwork('https://iqlabs.dev/?menu=hoodin&post='+hash,NETWORKS.solana)).toBe(NETWORKS.robinhood);
 expect(inscriptionNetwork(hash,NETWORKS.solana)).toBe(NETWORKS.robinhood);
 expect(inscriptionNetwork('2'.repeat(88),NETWORKS.robinhood)).toBe(NETWORKS.solana);
 expect(inscriptionNetwork(hash,NETWORKS.robinhood)).toBe(NETWORKS.robinhood);
});

test('attachment network never comes from an arbitrary hostname or unregistered network',async()=>{
 const {inscriptionNetwork}=await import('../src/lib/inscription');
 const {NETWORKS}=await import('../src/lib/chains/networks');
 const hash='0x'+'b'.repeat(64);
 expect(inscriptionNetwork('https://untrusted.example/?post='+hash+'&network=privateRpc',NETWORKS.robinhood)).toBe(NETWORKS.robinhood);
 expect(inscriptionNetwork('https://untrusted.example/?post='+hash,NETWORKS.solana)).toBe(NETWORKS.robinhood);
});
