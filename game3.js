// ================= UTIL / STORAGE =================
const cv=document.getElementById("cv"),cx=cv.getContext("2d");
const $=id=>document.getElementById(id);
const rnd=(a,b)=>a+Math.random()*(b-a),ri=(a,b)=>Math.floor(rnd(a,b+1));
const pick=a=>a[Math.floor(Math.random()*a.length)];
const shuffle=a=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const esc=s=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let save={highScore:0,bestStreak:0,maxWorld:1,gamesPlayed:0,masteryStats:{},sound:true};
function loadSave(){try{const r=JSON.parse(localStorage.getItem(KEY)||"null");if(r&&typeof r==="object"){save=Object.assign(save,r);if(!save.masteryStats||typeof save.masteryStats!=="object")save.masteryStats={}}}catch(e){}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(save))}catch(e){}}
loadSave();

// ================= AUDIO =================
let AC=null;
function tone(f,d,type,vol,f2){
  if(!save.sound)return;
  try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();if(AC.state==="suspended")AC.resume();
    const o=AC.createOscillator(),g=AC.createGain();o.type=type||"square";o.frequency.setValueAtTime(f,AC.currentTime);
    if(f2)o.frequency.exponentialRampToValueAtTime(f2,AC.currentTime+d);
    g.gain.setValueAtTime(vol||.05,AC.currentTime);g.gain.exponentialRampToValueAtTime(.0001,AC.currentTime+d);
    o.connect(g);g.connect(AC.destination);o.start();o.stop(AC.currentTime+d+.02)}catch(e){}
}
const SFX={
  jump:()=>tone(300,.15,"square",.04,620),ok:()=>{tone(660,.1,"triangle",.07);setTimeout(()=>tone(990,.18,"triangle",.07),90)},
  ko:()=>tone(200,.3,"sawtooth",.06,90),coin:()=>tone(1200,.08,"square",.04,1700),shot:()=>tone(900,.25,"sawtooth",.06,150),
  hit:()=>tone(150,.2,"square",.07,60),win:()=>{[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.25,"triangle",.07),i*120))},
  ready:()=>{tone(500,.1,"square",.05,900);setTimeout(()=>tone(900,.2,"square",.05),110)}
};
function setSoundBtn(){$("snd").textContent=save.sound?"🔊 SONIDO ON":"🔇 SONIDO OFF"}

// ================= INPUT =================
const keys={};let typing=false;
const GAMEKEYS=["ArrowLeft","ArrowRight","ArrowUp","ArrowDown"," ","Space"];
const pressed={};   // pulsaciones nuevas (un solo uso)
window.addEventListener("keydown",e=>{
  if(typing){return}                                  // al escribir, las letras no mueven al personaje
  if(GAMEKEYS.includes(e.key)||e.code==="Space")e.preventDefault();
  if(e.repeat)return;
  const k=e.code==="Space"?"Space":e.key.toLowerCase()=== "e"?"Action":e.key;
  if(!keys[k])pressed[k]=true;
  keys[k]=true;
  if(k==="Enter")onEnter();
  if(k==="Escape")onEscape();
  if((k==="p"||k==="P"))onPause();
});
window.addEventListener("keyup",e=>{const k=e.code==="Space"?"Space":e.key.toLowerCase()==="e"?"Action":e.key;keys[k]=false});
window.addEventListener("blur",()=>{clearInput();if(state==="playing"||state==="boss")onPause(true)});
function consume(k){const v=pressed[k];pressed[k]=false;return !!v}
function clearInput(){for(const k in keys)keys[k]=false;for(const k in pressed)pressed[k]=false}

// ================= LEARNING SYSTEM =================
function ST(cid){return save.masteryStats[cid]||(save.masteryStats[cid]={c:0,w:0,lvl:1,tmp:1,hist:""})}
function record(cid,ok,hinted){
  const s=ST(cid);
  if(ok){s.c++;s.tmp=Math.max(1,+(s.tmp*0.6).toFixed(2));if(!hinted)s.lvl=Math.min(5,s.lvl+1)}
  else{s.w++;s.tmp=Math.min(9,s.tmp+2);s.lvl=Math.max(1,s.lvl-1)}
  s.hist=(s.hist+(ok?"1":"0")).slice(-5);
  persist();
}
function mastered(cid){const s=ST(cid);return s.c>=3&&(s.hist.match(/0/g)||[]).length<=1}
function weightOf(cid){return ST(cid).tmp}
function choose(list,avoid){
  let l=list.slice();
  const unseen=l.filter(c=>!G.seen.has(c));
  if(unseen.length)l=unseen;
  if(l.length>1&&avoid)l=l.filter(c=>c!==avoid);
  const tot=l.reduce((a,c)=>a+weightOf(c),0);let r=Math.random()*tot;
  for(const c of l){r-=weightOf(c);if(r<=0)return c}
  return l[l.length-1];
}

// ================= QUESTIONS =================
function norm(s){return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g,"").replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()}
function accepts(ans,raw){
  const n=norm(raw);if(!n)return false;
  const arts=["","el ","la ","los ","las ","un ","una ","energia "];
  return ans.some(f=>{const nf=norm(f);return arts.some(a=>n===a+nf)});
}
function maskWord(label,frac){
  const s=label.toUpperCase(),idx=[];
  for(let i=1;i<s.length;i++)if(s[i]!==" ")idx.push(i);
  const hide=new Set(shuffle(idx).slice(0,Math.round(idx.length*frac)));
  return s.split("").map((ch,i)=>ch===" "?"  ":(hide.has(i)?"_":ch)).join(" ");
}
function firstLetter(label){const w=label.toUpperCase();return "Empieza por «"+w[0]+"» y tiene "+w.replace(/ /g,"").length+" letras."}
function lvlOf(cid){return ST(cid).lvl}
const U=id=>CON[id].label.toUpperCase();
function distract(cid,n){
  const c=CON[cid],cf=c.forms.map(norm);
  const ok=id=>id!==cid&&!CON[id].forms.some(f=>cf.includes(norm(f)));
  const same=shuffle(ALL_IDS.filter(id=>ok(id)&&CON[id].w===c.w&&!CON[id].cat)),other=shuffle(ALL_IDS.filter(id=>ok(id)&&CON[id].w!==c.w&&!CON[id].cat));
  return same.concat(other).slice(0,n);
}
function appFor(cat){const l=APP.filter(a=>a.e.includes(cat));return pick(l)}
function artCap(n){return n.charAt(0).toUpperCase()+n.slice(1)}
let lastApp=null,lastObj=null,lastMag=-1;

function buildPlat(room,cid){
  const c=CON[cid],lv=lvlOf(cid);
  if(c.w===2){
    let a=appFor(cid);if(lastApp&&a===lastApp)a=appFor(cid);lastApp=a;
    const two=a.e.length>1;
    const school=a.n==="un ventilador"&&Math.random()<.6;
    const p=school?"En un aula del CEIP Miguel Servet funciona un ventilador. ¿Qué transformación energética se produce principalmente?"
       :(two?`${artCap(a.n)} transforma la electricidad en dos energías. Salta a UNA de ellas.`:`${artCap(a.n)} transforma principalmente la electricidad en…`);
    return {cid,kind:"plat",prompt:p,icon:a.ic,opts:["LUMÍNICA","MECÁNICA","TÉRMICA","SONORA"].map(t=>({t,ok:a.e.includes(CAT_TO_ID[t]),cid:CAT_TO_ID[t]})),
      fact:two?"La televisión transforma la electricidad en energía lumínica y sonora.":c.fact,hint:c.hint,level:lv};
  }
  const d=distract(cid,3).map(id=>({t:U(id),ok:false,cid:id}));
  return {cid,kind:"plat",prompt:lv<=1?c.def:c.apply,opts:shuffle([{t:U(cid),ok:true,cid}].concat(d)),fact:c.fact,hint:c.hint,level:lv};
}
function buildFork(room,cid){
  const c=CON[cid];
  if(room.mag){
    const choices=MAGS.map((m,i)=>i).filter(i=>MAGS[i][2]===cid);
    const fresh=choices.filter(i=>i!==lastMag);
    const k=pick(fresh.length?fresh:choices);lastMag=k;
    const m=MAGS[k],res=m[2];
    return {cid:res,kind:"fork",prompt:`¿Qué ocurre si enfrentas estos dos imanes?  ${m[0]} frente a ${m[1]}`,mag:[m[0],m[1]],
      opts:shuffle([{t:"ATRACCIÓN",ok:res==="atraccion",cid:"atraccion"},{t:"REPULSIÓN",ok:res==="repulsion",cid:"repulsion"}]),
      fact:CON[res].fact+" (Es la fuerza magnética.)",hint:CON[res].hint,level:lvlOf(res)};
  }
  const l=OBJ.filter(o=>o.c===cid);let o=pick(l);if(l.length>1&&o===lastObj)o=pick(l.filter(x=>x!==lastObj));lastObj=o;
  return {cid,kind:"fork",prompt:"¿Conductor o aislante?",obj:o,
    opts:shuffle([{t:"CONDUCTOR",ok:cid==="conductor",cid:"conductor"},{t:"AISLANTE",ok:cid==="aislante",cid:"aislante"}]),
    fact:c.fact,hint:c.hint,level:lvlOf(cid)};
}
const SPECIAL={
  campo:"¿Cómo se llama la zona donde el imán ejerce su influencia?",
  magnetita:"Esta piedra negra atrae los clips y nadie la ha fabricado. ¿Cómo se llama este mineral?",
  coil:"¿Cómo se llama este elemento?",
  induction:"El imán se mueve cerca de la bobina y la bombilla se enciende. ¿Qué se ha generado?",
  electro:"Clavo + hilo enrollado + pila: el clavo atrae el clip. ¿Qué hemos creado?",
  emag:"Fenómeno que relaciona electricidad y magnetismo. ¿Cómo se llama?"
};
function buildWrite(room,cid){
  const c=CON[cid],lv=lvlOf(cid);let prompt,ans=c.forms.slice(),frac=0;
  if(room.scene){prompt=SPECIAL[room.scene];frac=lv<=2?.25:(lv===3?.5:0);if(cid==="corriente")ans=c.forms.slice()}
  else if(c.w===2){
    let a=appFor(cid);const sch=a.n==="un ventilador"&&Math.random()<.6;
    ans=c.cloze.ans;
    if(sch){prompt="En un aula del CEIP Miguel Servet funciona un ventilador. ¿Qué transformación energética se produce principalmente?";frac=lv<=2?.25:0}
    else if(lv<=3){prompt=`${artCap(a.n)} transforma principalmente la electricidad en energía ______.`;frac=lv<=1?.25:(lv===2?0:.5)}
    else{prompt=`¿En qué energía transforma principalmente la electricidad ${a.n}?`}
    if(a.e.length>1){
      prompt=`${artCap(a.n)} transforma la electricidad en dos formas de energía. Escribe UNA de ellas.`;
      ans=a.e.flatMap(id=>CON[id].forms);frac=0;
    }
    room.icon=a.ic;
  }else{
    ans=c.cloze.ans;
    if(lv<=1){prompt=c.cloze.t;frac=.25}
    else if(lv===2){prompt=c.cloze.t}
    else if(lv===3){prompt=c.def;frac=.5}
    else if(lv===4){prompt=c.def}
    else{prompt=c.apply}
  }
  return {cid,kind:"type",prompt,ans:ans.concat(c.forms),label:c.label,hint:c.hint,pat:frac>0?maskWord(c.label,frac):"",fact:room.icon==="📺"?"La televisión transforma la electricidad en energía lumínica y sonora.":c.fact,level:lv};
}
function buildItem(room){
  const cid=room.cid||choose(room.pool,G.last);
  G.last=cid;
  let it;
  if(room.m==="plat")it=buildPlat(room,cid);
  else if(room.m==="fork")it=buildFork(room,cid);
  else it=buildWrite(room,cid);
  G.seen.add(cid);if(it.cid!==cid)G.seen.add(it.cid);
  it.t0=performance.now();it.errs=0;it.hints=0;it.hinted=false;
  return it;
}

// ================= PUNTUACIÓN / RESULTADO DE UNA RESPUESTA =================
function mult(){let m=G.streak>=5?3:(G.streak>=2?2:1);if(G.overload>0)m*=2;return m}
function answer(item,ok){
  const el=(performance.now()-item.t0)/1000;
  if(ok){
    record(item.cid,true,item.hinted||item.errs>0);
    G.correct++;G.streak++;if(G.streak>G.bestStreak)G.bestStreak=G.streak;
    let base=100;if(!item.hinted&&item.errs===0)base+=50;if(el<8)base+=50;else if(el<15)base+=25;
    const pts=base*mult();G.score+=pts;
    if(G.score>save.highScore){save.highScore=G.score}
    if(G.bestStreak>save.bestStreak)save.bestStreak=G.bestStreak;
    persist();SFX.ok();
    float("⚡ +"+pts,P?P.x:480,P?P.b-60:300,"#ffd93d");
    if(G.streak===2)toast("🔥 RACHA x2","#ffb03d");
    if(G.streak===5)toast("🔥🔥 RACHA x3","#ff7a3d");
    if(G.streak===10){G.overload=10;toast("⚡ MODO SOBRECARGA","#27e1ff");SFX.win()}
  }else if(item.errs===1){
    record(item.cid,false,true);G.wrong++;G.streak=0;SFX.ko();
    G.energy=Math.max(0,G.energy-10);float("-10 ⚡",P?P.x:480,P?P.b-60:300,"#ff4d6d");
    if(G.energy<=0)loseLife("Sin energía");
  }
}
function showFb(html,cls,ms){const f=$("fb");f.className=cls||"";f.innerHTML=html;f.classList.remove("hide");clearTimeout(showFb.t);if(ms)showFb.t=setTimeout(()=>f.classList.add("hide"),ms);}
function hideFb(){clearTimeout(showFb.t);$("fb").classList.add("hide")}
const toastQ=[];
function toast(txt,col){const t=$("toast");t.textContent=txt;t.style.color=col||"#fff";t.classList.add("on");clearTimeout(toast.t);toast.t=setTimeout(()=>t.classList.remove("on"),1400)}
const floats=[];
function float(txt,x,y,col){if(typeof x!=="number")return;floats.push({txt,x,y,col,t:0})}

// ================= ENTRADA DE TEXTO =================
let askCb=null,askItem=null,askRevealed=false;
function openAsk(item,cb){askItem=item;askCb=cb;askRevealed=false;item.t0=performance.now();typing=true;clearInput();$("ansprompt").innerHTML=esc(item.prompt);$("anspat").textContent=item.pat||"";$("anshint").textContent="";const inp=$("ansin");inp.value="";inp.style.borderColor="";$("ansbox").classList.remove("hide");$("qbar").classList.add("hide");setTimeout(()=>inp.focus(),30);}
function closeAsk(){typing=false;$("ansbox").classList.add("hide");$("ansin").blur();clearInput();askItem=null;window.focus()}
function submitAsk(){if(!askItem||state!=="question")return;const it=askItem,inp=$("ansin"),val=inp.value;if(!norm(val))return;const ok=accepts(it.ans,val);if(askRevealed){if(ok){finishAsk(it,false)}else{inp.value="";$("anshint").textContent="Escribe: "+it.label.toUpperCase()}return;}if(ok){it.hinted=it.hints>0;finishAsk(it,true)}else{it.errs++;answer(it,false);if(state!=="question")return;const n=it.errs;inp.style.borderColor="#ff4d6d";setTimeout(()=>inp.style.borderColor="",500);if(n===1){it.hints=1;$("anshint").textContent="💭 Pista: "+it.hint}else if(n===2){it.hints=2;$("anshint").textContent="💭 "+firstLetter(it.label)}else if(n===3){it.hints=3;$("anspat").textContent=maskWord(it.label,.5);$("anshint").textContent="💭 Mira la palabra: faltan letras"}else{askRevealed=true;it.hints=4;$("anspat").textContent=it.label.toUpperCase();$("anshint").textContent="Esta es la respuesta. ESCRÍBELA para continuar.";}inp.value="";inp.focus();}}
function finishAsk(it,ok){const cb=askCb;closeAsk();if(ok){answer(it,true);}cb&&cb(ok,it);}
function checkMC(item,opt){return !!opt.ok}
