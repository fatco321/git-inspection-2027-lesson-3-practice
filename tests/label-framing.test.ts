import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {assessLabelFrame} from '../src/scenes/workshop/labelFraming.ts';
const right={x:1,y:0,z:0},up={x:0,y:1,z:0};
const frame=(x:number,z:number,fov:number,w=1280,h=720)=>assessLabelFrame({x,y:0,z},right,up,.42,.145,fov,w,h);
test('a real machine plate fits a close portrait shot despite old oversized bounds',()=>{
  assert.deepEqual(frame(0,2,.5,400,800),{detail:true,cropped:false});
});
test('readable zoomed plate beyond the former 2.6m limit is accepted',()=>{
  assert.deepEqual(frame(0,3.2,.28),{detail:true,cropped:false});
});
test('a close plate is readable without requiring narrow field of view',()=>{
  assert.deepEqual(frame(0,1,.95),{detail:true,cropped:false});
});
test('legible off-centre plate does not require exact crosshair alignment',()=>{
  assert.deepEqual(frame(.45,2,.55),{detail:true,cropped:false});
});
test('general view remains a general view',()=>{
  assert.deepEqual(frame(0,3,.95),{detail:false,cropped:false});
});
test('cropped plate and tiny distant lettering are not valid close-ups',()=>{
  assert.deepEqual(frame(.4,1,.3),{detail:true,cropped:true});
  assert.equal(frame(0,5,1.2).detail,false);
});
test('edge-on and behind-camera plates cannot be readable',()=>{
  assert.equal(assessLabelFrame({x:0,y:0,z:2},{x:0,y:0,z:1},up,.42,.145,.5,1280,720).detail,false);
  assert.equal(frame(0,-1,.5).detail,false);
});
