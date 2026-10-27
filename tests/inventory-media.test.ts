import {test,expect} from 'bun:test';
import {inventoryMediaKind} from '../src/lib/inventory-media';
test('inventory recognizes image/audio/video and file data URLs without fetching payloads',()=>{
 for(const kind of ['image','audio','video'] as const){
  expect(inventoryMediaKind({kind})).toBe(kind);
  expect(inventoryMediaKind({kind:'file',body:`data:${kind}/test;name=example;base64,AA==`})).toBe(kind);
 }
 expect(inventoryMediaKind({kind:'text',body:'hello'})).toBeNull();
 expect(inventoryMediaKind({kind:'file',body:'https://remote.invalid/movie.mp4'})).toBeNull();
});
