import iqlabs from "iqlabs-sdk";

const result = iqlabs.utils.toSeedBytes("iqchan");
console.log("type:", typeof result);
console.log("constructor:", result.constructor.name);
console.log("length:", result.length);
console.log("is Buffer:", Buffer.isBuffer(result));
console.log("is Uint8Array:", result instanceof Uint8Array);
console.log("hex:", Buffer.from(result).toString("hex"));

// What about passing string directly to writeRow?
// writeRow signature: (connection, signer, dbRootId, tableSeed, ...)
// It expects dbRootId to be something that toSeedBytes can handle
// The error is at Blob.encode which means it got past toSeedBytes
// but the Borsh encoder wants a Buffer, not a Uint8Array

const asBuffer = Buffer.from(result);
console.log("\nBuffer.from(result):");
console.log("is Buffer:", Buffer.isBuffer(asBuffer));
console.log("length:", asBuffer.length);
