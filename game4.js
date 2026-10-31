// ================= ESTADO GLOBAL DEL JUEGO =================
let state="menu";       // menu | playing | question | paused | worldComplete | boss | gameOver | victory
let G=null,P=null,R=null,B=null,prevState="playing";
const parts=[];
let T=0;

function newRun(){
  lastApp=null;lastObj=null;lastMag=-1;
  G={score:0,lives:3,energy:100,streak:0,bestStreak:0,correct:0,wrong:0,seen:new Set(),last:null,world:0,roomIdx:0,
     worldStartScore:0,inv:0,shield:0,overload:0,storm:0,invert:0,flash:0};
  save.gamesPlayed++;persist();
}
function newPlayer(){return {x:70,b:GROUND,vx:0,vy:0,on:true,onPlat:null,face:1,crouch:false,coy:0,buf:0,drop:0,jumps:0,anim:0,hurtT:0,atkT:0,cel:0,wasOn:true}}
function pStateName(){
  if(P.cel>0)return"celebrar";if(P.hurtT>0)return"daño";if(P.atkT>0)return"ataque";if(!P.on)return"salto";
  if(Math.abs(P.vx)>200)return"correr";if(Math.abs(P.vx)>25)return"andar";return"quieto";
}
function ph(){return P.crouch?PHC:PH}

// ================= FONDO (cacheado por mundo) =================
const bgCache={};
function bgFor(w){
  if(bgCache[w])return bgCache[w];
  const c=document.createElement("canvas");c.width=W;c.height=H;const x=c.getContext("2d"),Wd=WORLDS[w];
  const g=x.createLinearGradient(0,0,0,H);g.addColorStop(0,"#04061a");g.addColorStop(1,Wd.col2);x.fillStyle=g;x.fillRect(0,0,W,H);
  x.strokeStyle="rgba(120,170,255,.07)";x.lineWidth=1;
  for(let i=0;i<W;i+=48){x.beginPath();x.moveTo(i,0);x.lineTo(i,H);x.stroke()}
  for(let j=0;j<H;j+=48){x.beginPath();x.moveTo(0,j);x.lineTo(W,j);x.stroke()}
  let seed=w*77+5;const rn=()=>{seed=(seed*9301+49297)%233280;return seed/233280};
  x.strokeStyle=Wd.col;x.fillStyle=Wd.col;x.globalAlpha=.22;x.lineWidth=2;
  for(let k=0;k<16;k++){
    let px=Math.floor(rn()*20)*48,py=Math.floor(rn()*9)*48+48;x.beginPath();x.moveTo(px,py);
    for(let s=0;s<4;s++){if(rn()<.5)px+=(rn()<.5?-1:1)*48*ri(1,3);else py+=(rn()<.5?-1:1)*48*ri(1,2);px=clamp(px,0,W);py=clamp(py,48,GROUND-20);x.lineTo(px,py)}
    x.stroke();x.beginPath();x.arc(px,py,5,0,7);x.fill();
  }
  x.globalAlpha=1;
  x.font="bold 30px 'Trebuchet MS',Verdana,sans-serif";x.textAlign="center";x.fillStyle="rgba(255,255,255,.10)";
  x.fillText(Wd.sign,W/2,140);
  x.font="bold 16px 'Trebuchet MS',Verdana,sans-serif";x.fillStyle="rgba(255,255,255,.12)";x.fillText("LABORATORIO DE ENERGÍA — CEIP MIGUEL SERVET",W/2,164);
  if(w===0){x.font="bold 13px 'Trebuchet MS',Verdana,sans-serif";x.fillStyle="rgba(39,225,255,.16)";x.fillText("SERVET ENERGY LAB · BALERMA",830,500)}
  const fg=x.createLinearGradient(0,GROUND,0,H);fg.addColorStop(0,"#1a2152");fg.addColorStop(1,"#080b24");x.fillStyle=fg;x.fillRect(0,GROUND,W,H-GROUND);
  x.fillStyle=Wd.col;x.fillRect(0,GROUND,W,3);
  x.globalAlpha=.25;for(let i=0;i<W;i+=60){x.fillRect(i,GROUND+16,34,3)}x.globalAlpha=1;
  bgCache[w]=c;return c;
}

// ================= SALAS =================
function startWorld(w){
  G.world=w;G.roomIdx=0;G.worldStartScore=G.score;G.energy=100;G.lives=Math.max(G.lives,3);G.seen=new Set();G.last=null;G.inv=0;G.storm=0;G.invert=0;
  G.rooms=shuffle(WORLDS[w].rooms).map(room=>({...room}));
  hideFb();$("sc-world").classList.add("hide");$("sc-over").classList.add("hide");
  if(WORLDS[w].boss)startBoss();else startRoom(0);
}
function startRoom(i){
  const Wd=WORLDS[G.world],spec=G.rooms[i];
  G.roomIdx=i;state="playing";B=null;P=newPlayer();hideFb();closeAsk();$("mcbox").classList.add("hide");
  R={idx:i,spec,item:buildItem(spec),phase:"run",t:0,doneT:0,platforms:[],gates:[],door:null,sparks:[],drones:[],zones:[],picks:[],magA:null,shake:0,actT:0,doorOpen:0};
  const it=R.item,sp=Wd.speed;
  if(spec.m==="plat"){
    const slots=[[20,385],[260,335],[500,335],[740,385]];
    shuffle(it.opts).forEach((o,k)=>R.platforms.push({x:slots[k][0],y:slots[k][1],w:190,h:16,opt:o,dead:false,good:false}));
    qbar(it.prompt,"SALTA A LA RESPUESTA CORRECTA");
  }else if(spec.m==="fork"){
    R.gates=[{x:0,w:120,opt:it.opts[0]},{x:W-120,w:120,opt:it.opts[1]}];
    P.x=480;
    qbar(it.prompt,"VE A LA PUERTA CORRECTA");
  }else{
    R.door={x:850,w:70,h:120,label:spec.m==="machine"?"MÁQUINA AVERIADA":"ACCESO BLOQUEADO"};
    qbar(spec.m==="machine"?"Repara la máquina: llega hasta ella, escribe el concepto y pulsa E":"Puerta bloqueada: llega hasta ella y resuelve el reto","");
  }
  const nS=[1,1,2,2][G.world]||1,nD=[0,1,1,1][G.world]||0,nZ=[0,0,1,1][G.world]||0;
  for(let k=0;k<nS;k++)R.sparks.push({x:rnd(250,750),vx:(Math.random()<.5?-1:1)*rnd(55,90)*sp,r:12});
  for(let k=0;k<nD;k++)R.drones.push({x:rnd(200,700),vx:(Math.random()<.5?-1:1)*rnd(70,100)*sp,w:46,h:24,y:GROUND-56});
  for(let k=0;k<nZ;k++)R.zones.push({x:rnd(230,600),w:110,ph:rnd(0,3)});
  if(spec.m==="fork"||spec.m==="plat"){R.sparks.forEach(s=>{s.x=clamp(s.x,200,760)})}
  for(let k=0;k<3;k++)R.picks.push({t:"c",x:rnd(150,810),y:GROUND-rnd(26,60),got:false});
  if(Math.random()<.18&&G.world>0)R.picks.push({t:"s",x:rnd(300,700),y:GROUND-40,got:false});
  if(i>0&&Math.random()<.25){
    const ev=pick(G.world>=2?["storm","invert","bonus","perfect"]:["storm","bonus","perfect"]);
    if(ev==="storm"){G.storm=6;toast("⚡ TORMENTA ELÉCTRICA","#ffd93d")}
    else if(ev==="invert"){G.invert=4;toast("🧲 INVERSIÓN MAGNÉTICA","#ff6bd5")}
    else if(ev==="bonus"){toast("💡 BONUS DE ENERGÍA","#2bff88");for(let k=0;k<6;k++)R.picks.push({t:"c",x:150+k*120,y:GROUND-rnd(30,90),got:false})}
    else if(G.streak>=3){G.shield=Math.max(G.shield,1);G.score+=250;toast("🔥 RACHA PERFECTA +250","#ff7a3d")}
  }
}
function qbar(txt,small){const q=$("qbar");q.innerHTML=(small?"<small>"+esc(small)+"</small>":"")+esc(txt).replace("______","<span style='color:#ffd93d'>______</span>");q.classList.remove("hide")}

// ================= EFECTOS =================
function burst(x,y,n,col){for(let k=0;k<n&&parts.length<260;k++){const a=rnd(0,6.28),s=rnd(40,220);parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s-60,l:rnd(.3,.8),c:col||"#27e1ff"})}}
function hurt(n,why){
  if(G.inv>0||state!=="playing"&&state!=="boss")return;
  if(G.shield>0){G.shield--;G.inv=1;toast("🛡 ESCUDO","#27e1ff");burst(P.x,P.b-20,14,"#27e1ff");return}
  G.energy=Math.max(0,G.energy-n);G.inv=1;P.hurtT=.4;SFX.hit();burst(P.x,P.b-20,12,"#ff4d6d");
  float("-"+n+" ⚡",P.x,P.b-60,"#ff4d6d");if(R)R.shake=.25;if(B)B.shake=.25;
  if(G.energy<=0)loseLife(why||"Sin energía");
}
function loseLife(why){G.lives--;G.energy=100;G.streak=0;if(G.lives<=0){gameOver();return}toast("💔 -1 VIDA","#ff4d6d");G.inv=2;if(P)P=newPlayer()}

// ================= FÍSICA / JUGADOR =================
function updatePlayer(dt,free){
  const inv=G.invert>0?-1:1;
  let dir=((keys.ArrowRight?1:0)-(keys.ArrowLeft?1:0))*inv;
  const sp=SPEED*(G.overload>0?1.12:1)*(P.crouch?.45:1);
  P.vx+=(dir*sp-P.vx)*Math.min(1,dt*14);if(dir)P.face=dir;
  P.crouch=!!(keys.ArrowDown&&P.on&&!P.onPlat);
  if(P.onPlat&&consume("ArrowDown")){P.drop=.25}
  P.coy=P.on?.1:P.coy-dt;
  if(P.on)P.jumps=0;
  if(consume("Space"))P.buf=.13;else P.buf-=dt;
  if(P.buf>0&&!P.crouch&&(P.coy>0||P.jumps<MAX_JUMPS)){
    P.jumps=P.coy>0?1:Math.max(1,P.jumps)+1;
    P.vy=-JUMP;P.on=false;P.onPlat=null;P.coy=0;P.buf=0;
    SFX.jump();burst(P.x,P.b,5,P.jumps===2?"#27e1ff":"#9fb4e8");
  }
  P.drop-=dt;P.hurtT-=dt;P.atkT-=dt;P.cel-=dt;
  P.vy=Math.min(1100,P.vy+GRAV*dt);
  const prevB=P.b;P.b+=P.vy*dt;P.x=clamp(P.x+P.vx*dt,PW/2+4,W-PW/2-4);
  const was=P.on;P.on=false;P.onPlat=null;
  if(P.b>=GROUND){P.b=GROUND;P.vy=0;P.on=true}
  else if(P.vy>=0&&P.drop<=0){
    const plats=R?R.platforms:(B?B.platforms:[]);
    for(const pl of plats){if(pl.dead)continue;if(P.x+PW/2>pl.x&&P.x-PW/2<pl.x+pl.w&&prevB<=pl.y+2&&P.b>=pl.y){P.b=pl.y;P.vy=0;P.on=true;P.onPlat=pl;if(!was&&R)selectPlat(pl);break}}
  }
  if(P.on)P.jumps=0;
  P.anim+=dt*(Math.abs(P.vx)>200?14:9);
  if(G.inv>0)G.inv-=dt;
  if(G.overload>0){G.overload-=dt;if(Math.random()<.5)parts.push({x:P.x+rnd(-12,12),y:P.b-rnd(0,40),vx:rnd(-30,30),vy:rnd(-80,-20),l:.4,c:"#ffd93d"})}
  if(G.storm>0)G.storm-=dt;if(G.invert>0)G.invert-=dt;
}
function hitbox(){const h=ph();return {x1:P.x-PW/2+3,x2:P.x+PW/2-3,y1:P.b-h+2,y2:P.b}}
function overlap(a,b){return a.x1<b.x2&&a.x2>b.x1&&a.y1<b.y2&&a.y2>b.y1}

// ================= ACTUALIZAR SALA =================
function update(dt){
  T+=dt;
  for(let i=floats.length-1;i>=0;i--){floats[i].t+=dt;if(floats[i].t>1.1)floats.splice(i,1)}
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.l-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=300*dt;if(p.l<=0)parts.splice(i,1)}
  if(state==="boss"){updateBoss(dt);return}
  if(state!=="playing"||!R)return;
  R.t+=dt;if(R.shake>0)R.shake-=dt;
  updatePlayer(dt,true);
  const hb=hitbox();
  for(const s of R.sparks){s.x+=s.vx*dt;if(s.x<30||s.x>W-30)s.vx*=-1;s.x=clamp(s.x,30,W-30);if(overlap(hb,{x1:s.x-s.r+3,x2:s.x+s.r-3,y1:GROUND-s.r*2+3,y2:GROUND}))hurt(10,"Chispa")}
  for(const d of R.drones){d.x+=d.vx*dt;if(d.x<40||d.x>W-90)d.vx*=-1;if(overlap(hb,{x1:d.x,x2:d.x+d.w,y1:d.y,y2:d.y+d.h}))hurt(10,"Dron")}
  for(const z of R.zones){const ph2=((R.t+z.ph)%3.2);z.on=ph2>2.0;z.warn=ph2>1.4&&ph2<=2.0;if(z.on&&overlap(hb,{x1:z.x,x2:z.x+z.w,y1:GROUND-12,y2:GROUND}))hurt(10,"Zona electrificada")}
  if(G.storm>0&&Math.random()<dt*1.2){R.flash=.15;if(Math.random()<.4){R.sparks.length<5&&R.sparks.push({x:rnd(100,860),vx:(Math.random()<.5?-1:1)*rnd(80,130),r:10,tmp:G.storm})}}
  R.sparks=R.sparks.filter(s=>!s.tmp||G.storm>0);
  for(const p of R.picks){if(p.got)continue;if(overlap(hb,{x1:p.x-14,x2:p.x+14,y1:p.y-14,y2:p.y+14})){p.got=true;SFX.coin();burst(p.x,p.y,8,p.t==="s"?"#27e1ff":"#ffd93d");if(p.t==="s"){G.shield=Math.min(1,G.shield+1);toast("🛡 ESCUDO LISTO","#27e1ff")}else{G.energy=Math.min(100,G.energy+5);G.score+=20;float("+5%",p.x,p.y-20,"#2bff88")}}}
  if(state!=="playing")return;
  const m=R.spec.m;
  if(R.phase==="run"){
    if(m==="fork"){if(P.x<110)pickGate(0);else if(P.x>W-110)pickGate(1)}
    if((m==="write"||m==="machine")&&P.x+PW/2>=R.door.x+8)touchDoor();
  }else if(R.phase==="wrong"){
    R.doneT-=dt;if(R.doneT<=0){const prev=R.item;R.item=buildItem(Object.assign({},R.spec,{cid:prev.cid}));R.item.errs=prev.errs;R.item.hinted=true;R.magA=null;R.gates[0].opt=R.item.opts[0];R.gates[1].opt=R.item.opts[1];qbar(R.item.prompt,"VE A LA PUERTA CORRECTA");hideFb();R.phase="run"}
  }else if(R.phase==="activate"){
    if(consume("Action")){R.phase="activating";R.actT=1.3;SFX.shot();burst(R.door.x+35,GROUND-60,30,WORLDS[G.world].col)}
  }else if(R.phase==="activating"){
    R.actT-=dt;if(R.actT<=0){R.phase="done";R.doneT=1.2}
  }else if(R.phase==="opening"){
    R.doorOpen=Math.min(1,R.doorOpen+dt*1.4);if(R.doorOpen>=1){R.phase="done";R.doneT=.9}
  }else if(R.phase==="done"){
    R.doneT-=dt;if(R.doneT<=0)nextRoom();
  }
  if(R.magA){R.magA.t=Math.min(1,R.magA.t+dt/1.1)}
}
function nextRoom(){const Wd=WORLDS[G.world];if(G.roomIdx+1<Wd.rooms.length)startRoom(G.roomIdx+1);else worldComplete();}
function selectPlat(pl){
  if(R.phase!=="run"||pl.dead)return;
  const it=R.item;
  if(pl.opt.ok){answer(it,true);pl.good=true;R.phase="done";R.doneT=2.4;burst(pl.x+95,pl.y,24,"#2bff88");showFb("✔ "+it.fact,"ok",2300);}
  else{it.errs++;answer(it,false);pl.dead=true;burst(pl.x+95,pl.y,14,"#ff4d6d");const right=it.opts.find(o=>o.ok);showFb(it.errs===1?"PIENSA: "+it.hint:"Pista: "+firstLetter(right.t.replace(/ENERGÍA /,"")),"ko",3000);}
}
function pickGate(i){
  const it=R.item,o=R.gates[i].opt;R.gates[i].chosen=true;if(it.mag)R.magA={t:0,type:o.cid};
  if(o.ok){answer(it,true);R.phase="done";R.doneT=2.4;burst(i?W-60:60,GROUND-60,24,"#2bff88");showFb("✔ "+it.fact,"ok",2300);}
  else{it.errs++;answer(it,false);if(state!=="playing")return;R.phase="wrong";R.doneT=2.6;P.x=480;P.vx=0;showFb("✖ "+(it.errs===1?"PIENSA: "+it.hint:it.fact),"ko",2500);const g=R.gates[i];g.shake=.6;}
}
function touchDoor(){
  const it=R.item;R.phase="ask";state="question";P.vx=0;clearInput();
  openAsk(it,(ok)=>{state="playing";if(!R)return;$("qbar").classList.remove("hide");if(ok)showFb("✔ "+it.label.toUpperCase()+" · "+it.fact,"ok",3000);else showFb("📖 "+it.fact,"ko",3500);if(R.spec.m==="machine"){R.phase="activate";pressed.Action=false;qbar("¡Bien! Ahora pulsa E para activar la máquina","E");}else{R.phase="opening";R.doorOpen=0}});
}
