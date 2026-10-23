import {test,expect} from "bun:test";
import config from "../next.config.mjs";
test("browser policy permits the blob URLs used by inscription audio/video without enabling active objects",async()=>{
 const routes=await config.headers!();
 const csp=routes[0].headers.find(header=>header.key==="Content-Security-Policy")!.value;
 expect(csp.split(";").find(part=>part.trim().startsWith("media-src "))).toContain("blob:");
 expect(csp).toContain("object-src 'none'");
});
