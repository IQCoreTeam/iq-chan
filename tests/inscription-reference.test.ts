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
