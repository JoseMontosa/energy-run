// ================= UI / ESTADOS =================
function hideAllPanels(){["sc-menu","sc-cred","sc-pause","sc-world","sc-over","sc-win"].forEach(id=>$(id).classList.add("hide"))}
function refreshMenu(){
  $("menuStats").innerHTML=`<span>🏆 Récord <b>${save.highScore}</b></span><span>🔥 Mejor racha <b>${save.bestStreak}</b></span><span>🌍 Mundo máx. <b>${save.maxWorld}</b></span><span>🎮 Partidas <b>${save.gamesPlayed}</b></span>`;
  const box=$("worldBtns");box.innerHTML="";
  for(let i=1;i<=5;i++){const b=document.createElement("button");b.textContent=i;b.disabled=i>save.maxWorld;b.title="Mundo "+i;b.onclick=()=>startGame(i);box.appendChild(b)}
}
function showMenu(){
  mcActive=null;
  state="menu";R=null;B=null;closeAsk();$("mcbox").classList.add("hide");$("qbar").classList.add("hide");hideFb();hideAllPanels();
  $("sc-menu").classList.remove("hide");refreshMenu();clearInput();G=null;P=null;
}
function startGame(w){
  if(state!=="menu")return;
  newRun();hideAllPanels();clearInput();tone(440,.1,"triangle",.05);
  startWorld((w||1)-1);
}
function onEnter(){
  if(state==="menu"&&!$("sc-menu").classList.contains("hide"))startGame(1);
  else if(state==="paused")resumeGame();
  else if(state==="worldComplete")nextWorld();
  else if(state==="gameOver")retryWorld();
  else if(state==="victory")showMenu();
}
function onEscape(){if(state==="paused")showMenu()}
function onPause(force){
  if(state==="playing"||state==="boss"){prevState=state;state="paused";$("sc-pause").classList.remove("hide")}
  else if(state==="paused"&&!force)resumeGame();
}
function resumeGame(){if(state!=="paused")return;state=prevState;$("sc-pause").classList.add("hide");clearInput()}

$("btnStart").onclick=()=>startGame(1);
$("btnCred").onclick=()=>{$("sc-cred").classList.remove("hide")};
$("btnCredBack").onclick=()=>{$("sc-cred").classList.add("hide")};
$("btnWipe").onclick=()=>{if(confirm("¿Borrar récord, rachas y progreso de conceptos?")){save={highScore:0,bestStreak:0,maxWorld:1,gamesPlayed:0,masteryStats:{},sound:save.sound};persist();refreshMenu()}};
$("btnResume").onclick=resumeGame;
$("btnToMenu").onclick=showMenu;
$("btnNextWorld").onclick=nextWorld;
$("btnRetry").onclick=retryWorld;
$("btnOverMenu").onclick=showMenu;
$("btnAgain").onclick=()=>{showMenu();startGame(1)};
$("btnWinMenu").onclick=showMenu;
$("ansok").onclick=submitAsk;
$("ansin").addEventListener("keydown",e=>{e.stopPropagation();if(e.key==="Enter"){e.preventDefault();submitAsk()}});
$("snd").onclick=()=>{save.sound=!save.sound;persist();setSoundBtn();tone(600,.1,"triangle",.05);$("snd").blur()};
window.addEventListener("keydown",e=>{if(mcActive&&!mcActive.done&&/^[1-4]$/.test(e.key))pickMC(+e.key-1)});

// ================= BUCLE =================
let lastT=performance.now();
function frame(now){
  const dt=Math.min(.05,Math.max(0,(now-lastT)/1000));lastT=now;
  try{update(dt);draw();syncTouchUI()}catch(err){console.error(err)}
  requestAnimationFrame(frame);
}
setupTouch();setSoundBtn();showMenu();
requestAnimationFrame(frame);
