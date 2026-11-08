import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createUsageClock} from '../public/trial-client.js';
import * as client from '../public/trial-client.js';

test('switching functions attributes elapsed time to the previous function and preserves its language',()=>{
 assert.equal(typeof client.createContextClock,'function');
 const a={area:'village',language:'vi'},b={area:'build',language:'en'},clock=client.createContextClock(0,a);
 assert.deepEqual(clock.sample(0,{visible:true,focused:true,interaction:true},a),[]);
 assert.deepEqual(clock.sample(5000,{visible:true,focused:true},b),[{start:0,end:5000,area:'village',language:'vi'}]);
 assert.deepEqual(clock.sample(10000,{visible:false,focused:false},b),[{start:5000,end:10000,area:'build',language:'en'}]);
 assert.deepEqual(clock.sample(20000,{visible:true,focused:true},a),[]);
});
test('usage time counts interaction windows, pauses when hidden or unfocused, and stops at idle cutoff',()=>{
 const clock=createUsageClock(0);
 assert.deepEqual(clock.sample(1000,{visible:true,focused:true}),[]);
 assert.deepEqual(clock.sample(2000,{visible:true,focused:true,interaction:true}),[]);
 assert.deepEqual(clock.sample(17000,{visible:true,focused:true}),[{start:2000,end:17000}]);
 assert.deepEqual(clock.sample(20000,{visible:false,focused:false}),[{start:17000,end:20000}]);
 assert.deepEqual(clock.sample(40000,{visible:true,focused:true}),[]);
 assert.deepEqual(clock.sample(55000,{visible:true,focused:true}),[{start:40000,end:55000}]);
 assert.deepEqual(clock.sample(70000,{visible:true,focused:true}),[{start:55000,end:62000}]);
 assert.deepEqual(clock.sample(85000,{visible:true,focused:true}),[]);
});
test('sleep gaps and backwards clocks do not create fictitious time',()=>{
 const clock=createUsageClock(0);clock.sample(0,{visible:true,focused:true,interaction:true});
 assert.deepEqual(clock.sample(120000,{visible:true,focused:true}),[]);
 assert.deepEqual(clock.sample(110000,{visible:true,focused:true}),[]);
});
