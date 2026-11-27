export function originSnapshot(state, uid) {
 const user=state.users.find(u=>u.id===uid),group=state.communities?.find(g=>g.id===user?.communityId);
 return {communityId:group?.id||null,communityName:group?.name||user?.communityName||null,communityType:group?.type||user?.profile?.originType||null,location:user?.loc||null};
}
export function freezeOrigins(state) {
 for(const row of [...state.acts,...state.trx,...(state.articles||[])])if(!row.origin)row.origin=originSnapshot(state,row.uid);
}
