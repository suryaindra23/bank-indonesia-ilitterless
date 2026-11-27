import test from 'node:test';
import assert from 'node:assert/strict';
import {communityStandings} from '../shared/community.js';
const resident=(id,loc,ls=[])=>({id,loc,ls,spent:0});
test('community totals include every earned point and ignore spending, pending and rejected actions',()=>{
 const state={users:[resident('one','Tlogomas',['l1']),resident('two','Tlogomas',['l2']),resident('three','Dinoyo')],acts:[
  ...[1,2,3].map((id,i)=>({id,uid:'one',tile:'tumbler',date:'2026-11-'+(23+i),week:3,status:'verified'})),
  {uid:'two',tile:'tas',status:'pending'},{uid:'two',tile:'tas',status:'rejected'},
  {uid:'three',tile:'tas',status:'verified'}
 ],trx:[{uid:'two',kg:1}]};
 const result=communityStandings(state),own=result.find(group=>group.l==='Tlogomas');
 assert.equal(own.points,89);assert.equal(own.members,2);assert.equal(own.verified,3);assert.equal(own.rank,1);
 state.users[0].spent=50;assert.equal(communityStandings(state).find(group=>group.l==='Tlogomas').points,89);
 assert.equal(result.find(group=>group.l==='Dinoyo').points,2);assert.equal(result.find(group=>group.l==='Mojolangu').rank,null);
});
test('ties share a rank and empty communities have no claimed ranking',()=>{
 const state={users:[resident('a','Tlogomas',['l1']),resident('b','Dinoyo',['l1']),resident('c','Mojolangu')],acts:[],trx:[]};
 const result=communityStandings(state);assert.deepEqual(result.map(group=>group.rank),[1,1,null]);
 assert.ok(communityStandings({users:[],acts:[],trx:[]}).every(group=>group.rank===null&&group.points===0&&group.members===0));
});
