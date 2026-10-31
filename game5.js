// ================= FIN DE MUNDO / PARTIDA =================
function worldComplete(){
  state="worldComplete";hideFb();$("qbar").classList.add("hide");
  const Wd=WORLDS[G.world];
  save.maxWorld=Math.max(save.maxWorld,Math.min(5,G.world+2));persist();SFX.win();
  $("worldDone").textContent=Wd.done;
  $("worldStats").textContent="⭐ "+G.score+" puntos · ❤️ "+G.lives+" vidas · 🔥 mejor racha "+G.bestStreak;
  $("sc-world").classList.remove("hide");
  clearTimeout(worldComplete.t);worldComplete.t=setTimeout(()=>{if(state==="worldComplete")nextWorld()},3500);
}
function nextWorld(){
  if(state!=="worldComplete")return;
  clearTimeout(worldComplete.t);$("sc-world").classList.add("hide");
  startWorld(G.world+1);
}
function gameOver(){
  state="gameOver";mcActive=null;closeAsk();$("mcbox").classList.add("hide");$("qbar").classList.add("hide");hideFb();
  $("overStats").textContent="⭐ "+G.score+" puntos · 🔥 racha máx. "+G.bestStreak+" · 🌍 "+WORLDS[G.world].name;
  const bad=ALL_IDS.filter(id=>G.seen.has(id)&&ST(id).tmp>1.5).slice(0,6);
  const r=$("overRep");
  if(bad.length){r.classList.remove("hide");r.innerHTML="<b>Repasa antes de reintentar:</b>"+bad.map(id=>"<div>⚠️ "+esc(CON[id].label)+" — "+esc(CON[id].fact)+"</div>").join("")}else r.classList.add("hide");
  $("sc-over").classList.remove("hide");
}
function retryWorld(){
  if(state!=="gameOver")return;
  G.score=G.worldStartScore;G.lives=3;G.energy=100;G.streak=0;G.overload=0;G.shield=0;
  $("sc-over").classList.add("hide");startWorld(G.world);
}

// ================= JEFE FINAL: SOBRECARGA =================
function startBoss(){
  state="boss";R=null;P=newPlayer();G.world=4;hideFb();closeAsk();$("mcbox").classList.add("hide");
  B={hp:100,x:700,y:200,t:0,charge:0,ready:false,platforms:[{x:110,y:385,w:150,h:16},{x:405,y:335,w:150,h:16},{x:700,y:385,w:150,h:16}],
     term:null,termT:1.2,atk:[],balls:[],shots:[],atkT:3.2,dead:false,dieT:0,shake:0,flash:0,intro:2.2};
  qbar("Resuelve retos para cargar el cañón. E dispara. ¡Esquiva sus ataques!","SOBRECARGA");
  setTimeout(()=>{if(state==="boss")$("qbar").classList.add("hide")},3800);
  toast("👾 SOBRECARGA","#ff4d6d");
}
function chooseBoss(){
  let l=ALL_IDS.filter(c=>c!==G.last);
  const w=l.map(c=>{const s=ST(c);return s.tmp+(s.c+s.w===0?3:0)+(mastered(c)?0:1)});
  const tot=w.reduce((a,b)=>a+b,0);let r=Math.random()*tot;
  for(let i=0;i<l.length;i++){r-=w[i];if(r<=0)return l[i]}
  return l[l.length-1];
}
function mcItem(cid,prompt,opts,fact,hint,label){return {cid,kind:"mc",prompt,opts,fact,hint,label,errs:0,hints:0,hinted:false,t0:performance.now(),level:lvlOf(cid)}}
function bossItem(){
  const cid=chooseBoss();G.last=cid;const c=CON[cid],lv=lvlOf(cid);
  let it;
  if(lv>=3&&!(CON[cid].cat&&false)){it=buildWrite({},cid);it.t0=performance.now();it.errs=0;it.hints=0;it.hinted=false;return it}
  if(c.w===2){
    const a=appFor(cid);return mcItem(cid,`${artCap(a.n)} transforma principalmente la electricidad en…`,
      shuffle(["LUMÍNICA","MECÁNICA","TÉRMICA","SONORA"].map(t=>({t,ok:a.e.includes(CAT_TO_ID[t]),cid:CAT_TO_ID[t]}))),c.fact,c.hint,c.label)}
  if(cid==="conductor"||cid==="aislante"){
    const o=pick(OBJ.filter(x=>x.c===cid));return mcItem(cid,`${o.n}: ¿conductor o aislante?`,shuffle([{t:"CONDUCTOR",ok:cid==="conductor"},{t:"AISLANTE",ok:cid==="aislante"}]),c.fact,c.hint,c.label)}
  if(cid==="atraccion"||cid==="repulsion"){
    const m=pick(MAGS.filter(x=>x[2]===cid));return mcItem(cid,`${m[0]} frente a ${m[1]}: ¿qué ocurre?`,shuffle([{t:"ATRACCIÓN",ok:cid==="atraccion"},{t:"REPULSIÓN",ok:cid==="repulsion"}]),c.fact,c.hint,c.label)}
  const rel=REL.filter(r=>r.a===cid);
  if(lv>=2&&rel.length){const r=pick(rel);return mcItem(cid,r.t+" ¿?",shuffle([{t:U(cid),ok:true}].concat(distract(cid,3).map(id=>({t:U(id),ok:false})))),c.fact,c.hint,c.label)}
  return mcItem(cid,lv<=1?c.def:c.apply,shuffle([{t:U(cid),ok:true}].concat(distract(cid,3).map(id=>({t:U(id),ok:false})))),c.fact,c.hint,c.label);
}
let mcActive=null;
function openMC(item,cb){
  mcActive={item,cb,done:false};clearInput();
  $("mcq").textContent=item.prompt;const box=$("mcopts");box.innerHTML="";
  item.opts.forEach((o,i)=>{const b=document.createElement("button");b.className="opt";b.textContent=(i+1)+" · "+o.t;b.onclick=()=>pickMC(i);box.appendChild(b)});
  $("mcbox").classList.remove("hide");$("qbar").classList.add("hide");
}
function pickMC(i){
  if(state!=="question"||!mcActive||mcActive.done)return;
  const m=mcActive,it=m.item,o=it.opts[i];if(!o)return;m.done=true;
  const bs=[...$("mcopts").children];
  bs.forEach((b,k)=>{b.disabled=true;if(it.opts[k].ok)b.classList.add("right")});
  if(o.ok){answer(it,true);showFb("✔ "+it.fact,"ok",2000)}
  else{bs[i].classList.add("wrong");it.errs=1;answer(it,false);showFb("PIENSA: "+it.fact,"ko",2600)}
  setTimeout(()=>{if(mcActive!==m)return;$("mcbox").classList.add("hide");mcActive=null;m.cb(o.ok,it)},o.ok?900:2300);
}
function openBossQ(){
  state="question";P.vx=0;const it=bossItem();
  const done=(ok)=>{
    state="boss";B.term=null;B.termT=2.2;
    if(ok){B.charge=Math.min(100,B.charge+50);if(B.charge>=100&&!B.ready){B.ready=true;toast("⚡ DISPARO LISTO","#ffd93d");SFX.ready()}}
  };
  if(it.kind==="mc")openMC(it,done);else openAsk(it,(ok)=>done(ok));
}
function updateBoss(dt){
  if(!B)return;
  B.t+=dt;if(B.shake>0)B.shake-=dt;if(B.flash>0)B.flash-=dt;
  if(B.dead){B.dieT-=dt;if(Math.random()<.6)burst(B.x+rnd(-80,80),B.y+rnd(-60,60),6,pick(["#ffd93d","#ff4d6d","#27e1ff"]));if(B.dieT<=0){victory()}return}
  updatePlayer(dt,true);
  B.x=480+Math.sin(B.t*.55)*260;B.y=200+Math.sin(B.t*1.3)*16;
  if(B.intro>0){B.intro-=dt;return}
  const hb=hitbox();
  if(!B.ready){
    if(!B.term){B.termT-=dt;if(B.termT<=0)B.term={x:rnd(120,840)}}
    else if(overlap(hb,{x1:B.term.x-22,x2:B.term.x+22,y1:GROUND-60,y2:GROUND})){openBossQ();return}
  }
  if(B.ready&&consume("Action")){
    B.charge=0;B.ready=false;P.atkT=.3;SFX.shot();
    const dx=B.x-P.x,dy=(B.y+20)-(P.b-30),d=Math.hypot(dx,dy)||1;
    B.shots.push({x:P.x+12*P.face,y:P.b-30,vx:dx/d*760,vy:dy/d*760});B.termT=1.8;
  }
  for(let i=B.shots.length-1;i>=0;i--){const s=B.shots[i];s.x+=s.vx*dt;s.y+=s.vy*dt;
    parts.push({x:s.x,y:s.y,vx:rnd(-30,30),vy:rnd(-30,30),l:.25,c:"#ffd93d"});
    if(Math.hypot(s.x-B.x,s.y-(B.y+10))<90){B.shots.splice(i,1);B.hp-=25;B.flash=.3;B.shake=.35;burst(s.x,s.y,28,"#ffd93d");SFX.hit();G.score+=300;float("💥 +300",B.x,B.y+80,"#ffd93d");
      if(B.hp<=0){B.hp=0;B.dead=true;B.dieT=2.4;SFX.win();toast("¡SOBRECARGA DERROTADA!","#2bff88");G.score+=1000}}
    else if(s.x<-50||s.x>W+50||s.y<-50||s.y>H+50)B.shots.splice(i,1)}
  if(state!=="boss")return;
  B.atkT-=dt;
  if(B.atkT<=0){
    const k=ri(0,2);
    if(k===0)B.atk.push({type:"beam",low:Math.random()<.5,t:0,warn:1.4,dur:.55});
    else if(k===1)B.atk.push({type:"zone",x:clamp(P.x+rnd(-90,90),90,W-90),w:170,t:0,warn:1.3,dur:1.5});
    else{const tx=P.x,a=Math.atan2(GROUND-18-(B.y+60),tx-B.x);B.balls.push({x:B.x,y:B.y+60,vx:Math.cos(a)*230,vy:Math.sin(a)*230})}
    B.atkT=B.hp>50?3.8:2.8;
  }
  for(let i=B.atk.length-1;i>=0;i--){const a=B.atk[i];a.t+=dt;const on=a.t>a.warn&&a.t<a.warn+a.dur;
    if(on){
      if(a.type==="beam"){const y1=a.low?GROUND-22:GROUND-66,y2=a.low?GROUND-2:GROUND-42;if(overlap(hb,{x1:0,x2:W,y1,y2}))hurt(10,"Descarga")}
      else if(overlap(hb,{x1:a.x-a.w/2,x2:a.x+a.w/2,y1:GROUND-14,y2:GROUND}))hurt(10,"Zona")}
    if(a.t>a.warn+a.dur)B.atk.splice(i,1)}
  for(let i=B.balls.length-1;i>=0;i--){const b=B.balls[i];b.x+=b.vx*dt;b.y+=b.vy*dt;
    if(overlap(hb,{x1:b.x-13,x2:b.x+13,y1:b.y-13,y2:b.y+13})){hurt(10,"Bola");B.balls.splice(i,1);burst(b.x,b.y,10,"#a56bff");continue}
    if(b.y>GROUND||b.x<0||b.x>W){burst(b.x,Math.min(b.y,GROUND),8,"#a56bff");B.balls.splice(i,1)}}
  if(Math.random()<dt*.25&&!B.pick)B.pick={x:rnd(100,860),y:GROUND-34,t:Math.random()<.5?"c":"s"};
  if(B.pick&&overlap(hb,{x1:B.pick.x-14,x2:B.pick.x+14,y1:B.pick.y-14,y2:B.pick.y+14})){
    if(B.pick.t==="s"){G.shield=1;toast("🛡 ESCUDO LISTO","#27e1ff")}else{G.energy=Math.min(100,G.energy+10);float("+10%",B.pick.x,B.pick.y-20,"#2bff88")}
    SFX.coin();burst(B.pick.x,B.pick.y,8,"#ffd93d");B.pick=null}
}
function victory(){
  state="victory";B=null;closeAsk();hideFb();$("qbar").classList.add("hide");
  if(G.score>save.highScore)save.highScore=G.score;if(G.bestStreak>save.bestStreak)save.bestStreak=G.bestStreak;save.maxWorld=5;persist();
  const tot=G.correct+G.wrong,acc=tot?Math.round(G.correct/tot*100):0;
  const dom=ALL_IDS.filter(mastered),tr=ALL_IDS.filter(id=>!mastered(id)&&ST(id).w>0);
  $("winStats").textContent=`⭐ ${G.score} puntos · 🏆 récord ${save.highScore} · 🎯 precisión ${acc}% · 🔥 mejor racha ${G.bestStreak} · ✔ ${G.correct} · ✖ ${G.wrong}`;
  $("winRep").innerHTML="<b>CONCEPTOS DOMINADOS</b>"+(dom.length?dom.map(id=>"<div>✅ "+esc(CON[id].label)+"</div>").join(""):"<div>Aún ninguno: ¡vuelve a jugar!</div>")+
    "<br><b>NECESITAN ENTRENAMIENTO</b>"+(tr.length?tr.map(id=>"<div>⚠️ "+esc(CON[id].label)+" — "+esc(CON[id].fact)+"</div>").join(""):"<div>🌟 ¡Ninguno!</div>");
  const falta=ALL_IDS.length-dom.length;
  $("winAgain").textContent="¿PUEDES SUPERAR TU RÉCORD? "+(falta>0?"Te faltan "+falta+" conceptos por dominar.":"¡Dominas todos los conceptos!");
  $("sc-win").classList.remove("hide");SFX.win();
}
