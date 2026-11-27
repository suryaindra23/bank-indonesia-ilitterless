import { points } from './catalog.js';
import {locationNames} from './locations.js';

export const communityOf=user=>user.communityName||(user.profile?.originType==='komunitas'&&user.profile.completedAt?user.profile.originName:user.loc);
export function communityStandings(state) {
 if(state.communities){const rows=state.communities.filter(row=>!row.deletedAt).map(row=>{const members=state.users.filter(user=>!user.deletedAt&&user.communityId===row.id),ids=new Set(members.map(user=>user.id)),verified=state.acts.filter(action=>ids.has(action.uid)&&action.status==='verified').length;return {id:row.id,type:row.type,l:row.name,members:members.length,points:members.reduce((sum,user)=>sum+points(state,user.id),0),verified,v:verified/Math.max(1,members.length)};}).sort((a,b)=>b.points-a.points||a.l.localeCompare(b.l,'id'));return rows.map(row=>({...row,rank:row.points?rows.findIndex(other=>other.points===row.points)+1:null}));}
  const LOCS=locationNames(state);
  const names=[...LOCS];for(const user of state.users){const name=communityOf(user);if(!names.some(n=>n.toLocaleLowerCase('id-ID')===name.toLocaleLowerCase('id-ID')))names.push(name);}
  const groups = names.map(l => {
    const members = state.users.filter(user => communityOf(user).toLocaleLowerCase('id-ID') === l.toLocaleLowerCase('id-ID'));
    const ids = new Set(members.map(user => user.id));
    const verified = state.acts.filter(action => ids.has(action.uid) && action.status === 'verified').length;
    return {
      l,
      members: members.length,
      points: members.reduce((total, user) => total + points(state, user.id), 0),
      verified,
      v: verified / Math.max(1, members.length),
    };
  }).sort((a, b) => b.points - a.points || LOCS.indexOf(a.l) - LOCS.indexOf(b.l));

  return groups.map(group => ({
    ...group,
    rank: group.points > 0 ? groups.findIndex(other => other.points === group.points) + 1 : null,
  }));
}
