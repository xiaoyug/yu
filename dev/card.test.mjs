import test from 'node:test';
import assert from 'node:assert/strict';
import {renderCard, wrap} from '../card.js';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
function context() {
  return {
    canvas: {}, font: '', lines: [],
    measureText(text) { return {width: Array.from(text).length * (parseFloat(this.font.match(/(\d+)px/)[1]) * 0.6)}; },
    fillText(text,x,y) { this.lines.push({text,x,y}); },
    fillRect(){}, drawImage(){}, save(){}, restore(){}, beginPath(){}, rect(){}, clip(){},
  };
}
test('photo-free card includes both bilingual prompts and the entered content', () => {
  const ctx=context();
  renderCard(ctx,{event:'MuFriends',dateStr:'2026.11.06',introOffer:'城市漫游 / City walks',introInto:'Community building'});
  assert.equal(ctx.canvas.width,1080);
  assert(ctx.lines.some(x=>x.text.includes('Talk to me about')));
  assert(ctx.lines.some(x=>x.text.includes('I’d love to talk about')));
  assert(ctx.lines.some(x=>x.text==='Community building'));
  assert(ctx.lines.every(x=>x.y<ctx.canvas.height));
});
test('long English words and mixed-language topics wrap within card width', () => {
  const ctx=context();ctx.font='42px sans-serif';
  const lines=wrap(ctx,'https://'+ 'a'.repeat(250)+' 中文 👋',952);
  assert(lines.every(x=>ctx.measureText(x).width<=952));
  const state={introOffer:'中英双语话题 community '.repeat(30),introInto:'b'.repeat(300),qrImg:{}};
  renderCard(ctx,state);
  assert(ctx.lines.every(x=>x.y+42<ctx.canvas.height));
});
test('photo adds space; empty topics leave no empty labeled blocks',()=>{
 const empty=context(),photo=context();renderCard(empty,{});renderCard(photo,{img:{width:1200,height:800}});
 assert(photo.canvas.height>empty.canvas.height);
 assert(!empty.lines.some(x=>x.text.includes('Talk to me about')));
});
test('cache activation deletes only older yu caches',async()=>{
 const events={},deleted=[];
 const sandbox={self:{addEventListener:(n,f)=>events[n]=f,clients:{claim:async()=>{}}},caches:{keys:async()=>['yu-v3','yu-v4-mufriends-20261106','other-app'],delete:async k=>deleted.push(k)}};
 vm.runInNewContext(readFileSync(new URL('../sw.js',import.meta.url),'utf8'),sandbox);
 let complete;events.activate({waitUntil:p=>complete=p});await complete;
 assert.deepEqual(deleted,['yu-v3']);
});
test('edits immediately disable sharing; stale image callbacks cannot re-enable it',()=>{
 const elements=new Map();
 function el(id){if(!elements.has(id))elements.set(id,{value:'',listeners:{},addEventListener(n,f){this.listeners[n]=f;},click(){},hidden:true});return elements.get(id);}
 const blobs=[],timers=[];let serial=0;
 const c={getContext:()=>({}),toBlob:f=>blobs.push(f)};
 const storage=new Map([['yu.intro.v1',JSON.stringify({introWho:'Existing user',introInto:'Old interest'})]]);
 const sandbox={document:{getElementById:el,createElement:()=>c},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)},renderCard(){},CARD:{MIME:'image/jpeg',QUALITY:.92},File:class{},URL:{createObjectURL:()=>`blob:${++serial}`,revokeObjectURL(){}},navigator:{},setTimeout:f=>(timers.push(f),timers.length),clearTimeout(){},Date,JSON,Object,Promise};
 let src=readFileSync(new URL('../app.js',import.meta.url),'utf8').replace(/^import.*\n/gm,'');
 vm.runInNewContext(src,sandbox);
 assert.equal(el('introWho').value,'Existing user');assert.equal(el('introInto').value,'Old interest');
 blobs.shift()({});assert.equal(el('save').disabled,false);
 el('introOffer').value='New topic';el('introOffer').listeners.input();assert.equal(el('save').disabled,true);
 timers.shift()();const stale=blobs.shift();
 el('introOffer').value='Latest topic';el('introOffer').listeners.input();stale({});assert.equal(el('save').disabled,true);
 timers.shift()();blobs.shift()({});assert.equal(el('save').disabled,false);
 assert.equal(JSON.parse(storage.get('yu.intro.v1')).introOffer,'Latest topic');
});
