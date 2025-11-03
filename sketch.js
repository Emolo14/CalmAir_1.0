/* ========== Globale tilstande ========== */
let mic, aktiv = false, mute = false;
let volRaw = 0, volFilt = 0, dB = 30;
let co2 = 600, co2Start = 0;
let alarmTone = null;

/* --- LOGIN --- */
let loggedIn = false;
let classInput, passInput, loginBtn;

/* Logo */
let logoImg;  // CalmAir.png

/* Grænser */
const DB_MIN = 30, DB_MAX = 100, DB_RED = 90;
const CO2_YELLOW = 800, CO2_RED = 1200;

/* ========== Preload (logo) ========== */
function preload(){
  // Sørg for at CalmAir.png ligger i samme mappe som index.html
  logoImg = loadImage('CalmAir.png', ()=>{}, ()=>{ logoImg = null; });
}

/* ========== Setup ========== */
function setup() {
  const cnv = createCanvas(windowWidth, windowHeight);
  cnv.style('z-index','0');
  cnv.style('position','fixed');
  cnv.style('top','0'); cnv.style('left','0');

  angleMode(DEGREES);
  textFont("League Spartan");
  textStyle(BOLD);
  textAlign(CENTER, CENTER);

  mic = new p5.AudioIn();
  co2Start = millis();

  createLoginUI();
  positionLoginUI();
  updateLoginVisibility();
  updateCanvasPointer();
}

function windowResized(){
  resizeCanvas(windowWidth, windowHeight);
  positionLoginUI();
  updateLoginVisibility();
}

/* Kun blokér scroll/gestures når vi er inde i appen */
function touchMoved(){ if (loggedIn) return false; }

/* ========== LOGIN UI ========== */
function createLoginUI(){
  // Klasse
  classInput = createInput('');
  classInput.attribute('placeholder','Klasse (fx 8A)');
  classInput.attribute('inputmode','text');
  classInput.attribute('enterkeyhint','go');
  classInput.attribute('autocapitalize','characters');
  classInput.attribute('autocomplete','off');
  baseInputStyle(classInput);

  // Kodeord
  passInput = createInput('', 'password');
  passInput.attribute('placeholder','Kodeord');
  passInput.attribute('inputmode','text');
  passInput.attribute('enterkeyhint','go');
  passInput.attribute('autocomplete','off');
  passInput.attribute('autocapitalize','off');
  baseInputStyle(passInput);

  // Log ind-knap (mindre end før)
  loginBtn = createButton('Log ind');
  loginBtn.style('font-family','"League Spartan",system-ui');
  loginBtn.style('font-weight','700');
  loginBtn.style('font-size','18px');     // ↓ mindre
  loginBtn.style('padding','10px 16px');  // ↓ mindre
  loginBtn.style('border','0');
  loginBtn.style('border-radius','12px');
  loginBtn.style('background','#000');
  loginBtn.style('color','#fff');
  loginBtn.style('box-shadow','0 8px 18px rgba(0,0,0,.25)');
  loginBtn.style('position','fixed');
  loginBtn.style('z-index','10001');
  loginBtn.mousePressed(handleLogin);

  // Enter logger ind
  classInput.elt.addEventListener('keydown', e=>{ if (e.key==='Enter'){ e.preventDefault(); handleLogin(); } });
  passInput.elt.addEventListener('keydown',  e=>{ if (e.key==='Enter'){ e.preventDefault(); handleLogin(); } });
}

function baseInputStyle(inp){
  inp.style('font-family','"League Spartan",system-ui');
  inp.style('font-weight','700');
  inp.style('font-size','22px');
  inp.style('padding','12px 14px');
  inp.style('border','0');
  inp.style('border-radius','12px');
  inp.style('outline','none');
  inp.style('box-shadow','0 8px 18px rgba(0,0,0,.15)');
  inp.style('background','#fff');
  inp.style('position','fixed');
  inp.style('z-index','10001');
  inp.style('-webkit-user-select','auto');
  inp.style('user-select','auto');
}

function positionLoginUI(){
  if (!classInput || !passInput || !loginBtn) return;

  // Venstre kolonne layout
  const leftW   = windowWidth/2;
  const padL    = Math.min(32, leftW*0.06); // venstre margin
  const maxW    = Math.min(leftW - padL*2, 380);
  const startY  = windowHeight*0.22;        // top til overskriftens bund
  const gap     = 14;
  const inputH  = 46;

  classInput.style('width', `${maxW}px`);
  passInput.style('width',  `${maxW}px`);

  classInput.position(padL, startY + 60);
  passInput.position(padL, startY + 60 + inputH + gap);
  loginBtn.position(padL,  startY + 60 + (inputH + gap)*2 + 12);
}

function updateLoginVisibility(){
  const isPortrait = windowHeight > windowWidth;
  if (!loggedIn){
    if (isPortrait){ classInput.hide(); passInput.hide(); loginBtn.hide(); }
    else            { classInput.show(); passInput.show(); loginBtn.show(); }
  }
}

function updateCanvasPointer(){
  const cnv = document.querySelector('canvas');
  if (!cnv) return;
  cnv.style.pointerEvents = loggedIn ? 'auto' : 'none';
}

async function handleLogin(){
  if (windowHeight > windowWidth){
    try{
      if (!fullscreen()) fullscreen(true);
      if (screen.orientation && screen.orientation.lock){
        await screen.orientation.lock('landscape').catch(()=>{});
      }
    }catch(_){}
    setTimeout(()=>{ updateLoginVisibility(); positionLoginUI(); },300);
    return;
  }
  const c = (classInput?.value()||'').trim();
  const p = (passInput?.value()||'').trim();
  if (c && p){
    try{
      if (!fullscreen()) fullscreen(true);
      if (screen.orientation && screen.orientation.lock){
        await screen.orientation.lock('landscape').catch(()=>{});
      }
    }catch(_){}
    loggedIn = true;
    classInput.hide(); passInput.hide(); loginBtn.hide();
    updateCanvasPointer();
  }else{
    loginBtn.html('Udfyld begge felter');
    setTimeout(()=>loginBtn.html('Log ind'),1200);
  }
}

/* ========== Tegne-helpers ========== */
function drawCleanText(txt, x, y, size, col = 255){
  push();
  textFont("League Spartan"); textStyle(BOLD); textAlign(CENTER, CENTER);
  noStroke(); drawingContext.shadowBlur = 0;
  fill(col); textSize(size); text(txt, x, y);
  pop();
}
function cssCol(c, aOverride=null){
  const r=red(c), g=green(c), b=blue(c), a=(aOverride===null?alpha(c)/255:aOverride);
  return `rgba(${r},${g},${b},${a})`;
}
function drawPremiumEmoji(fx, fy, D, co2){
  drawingContext.shadowBlur = 0; drawingContext.globalAlpha = 1;
  let baseC; if (co2<CO2_YELLOW) baseC=color(52,199,89); else if (co2<CO2_RED) baseC=color(255,214,10); else baseC=color(255,69,58);
  noStroke(); fill(baseC); circle(fx,fy,D);
  const grad = drawingContext.createRadialGradient(fx-D*0.25,fy-D*0.25,D*0.05,fx,fy,D*0.70);
  grad.addColorStop(0,'rgba(255,255,255,0.85)'); grad.addColorStop(0.2,'rgba(255,255,255,0.45)'); grad.addColorStop(0.5,cssCol(baseC,1)); grad.addColorStop(1,cssCol(lerpColor(baseC,color(0),0.15),1));
  drawingContext.fillStyle = grad;
  stroke(0); strokeWeight(D*0.05); circle(fx,fy,D);
  noStroke(); fill(0); const eyeR=D*0.10, ex=D*0.24, ey=D*0.16; circle(fx-ex,fy-ey,eyeR); circle(fx+ex,fy-ey,eyeR);
  stroke(0); strokeWeight(D*0.06); noFill();
  if (co2<CO2_YELLOW) arc(fx,fy+D*0.05,D*0.50,D*0.28,20,160);
  else if (co2<CO2_RED) line(fx-D*0.20,fy+D*0.12,fx+D*0.20,fy+D*0.12);
  else arc(fx,fy+D*0.20,D*0.50,D*0.28,200,340);
}
function drawBand(cx,cy,R,fromDB,toDB,col){
  let a1=map(fromDB,DB_MIN,DB_MAX,180,360);
  let a2=map(toDB,DB_MIN,DB_MAX,180,360);
  stroke(col); strokeWeight(R*0.14); noFill();
  arc(cx,cy,R*2,R*2,a1,a2);
}
function getDbColor(db){
  if (db<55) return color(0,140,0);
  if (db<70) return color(0,180,0);
  if (db<80) return color(255,220,0);
  if (db<90) return color(255,150,0);
  return color(255,0,0);
}
function drawGauge3D(cx,cy,R,dBvalue){
  push();
  noFill(); stroke(30,30,30); strokeWeight(R*0.20); arc(cx,cy,R*2.08,R*2.08,180,360);
  let grad = drawingContext.createRadialGradient(cx,cy-R*0.3,R*0.1,cx,cy,R*1.1);
  grad.addColorStop(0,'rgba(255,255,255,0.95)'); grad.addColorStop(0.4,'rgba(230,230,230,0.95)'); grad.addColorStop(1,'rgba(190,190,190,0.95)');
  drawingContext.fillStyle = grad; noStroke(); arc(cx,cy,R*2,R*2,180,360,PIE);
  drawingContext.shadowBlur=18; drawingContext.shadowColor='rgba(0,0,0,0.35)';
  noFill(); stroke(0,0,0,40); strokeWeight(R*0.10); arc(cx,cy,R*1.86,R*1.86,180,360);
  drawingContext.shadowBlur=0;
  drawBand(cx,cy,R,30,55,color(0,140,0));
  drawBand(cx,cy,R,55,70,color(0,180,0));
  drawBand(cx,cy,R,70,80,color(255,220,0));
  drawBand(cx,cy,R,80,90,color(255,150,0));
  drawBand(cx,cy,R,90,100,color(255,0,0));
  stroke(0,80); strokeWeight(R*0.02);
  for (let db=DB_MIN; db<=DB_MAX; db+=5){
    let a=map(db,DB_MIN,DB_MAX,180,360), r1=R*0.82, r2=(db%10===0)?R*0.92:R*0.88;
    line(cx+r1*cos(a),cy+r1*sin(a),cx+r2*cos(a),cy+r2*sin(a));
  }
  noFill(); stroke(255,120); strokeWeight(R*0.06); arc(cx,cy-R*0.05,R*1.80,R*1.80,190,260);
  let ang=map(dBvalue,DB_MIN,DB_MAX,180,360);
  stroke(0,60); strokeWeight(R*0.08); line(cx+3,cy+3,cx+3+R*0.80*cos(ang),cy+3+R*0.80*sin(ang));
  stroke(20); strokeWeight(R*0.05); line(cx,cy,cx+R*0.80*cos(ang),cy+R*0.80*sin(ang));
  noStroke(); let hubGrad=drawingContext.createRadialGradient(cx-R*0.04,cy-R*0.04,R*0.01,cx,cy,R*0.12);
  hubGrad.addColorStop(0,'white'); hubGrad.addColorStop(1,'#666'); drawingContext.fillStyle=hubGrad; circle(cx,cy,R*0.18);
  pop();
}

/* ========== Alarm-bjælke + mute-knap ========== */
let lastMuteBtn = null;
function drawAlarmStripeAndMuteButton(topH){
  const wLeft = width/2, stripeH = min(height,width)*0.08;
  const blink = (floor(millis()/250)%2===0);
  noStroke(); fill(blink?color(255,0,0):color(255,230,0)); rect(0,0,wLeft,stripeH);
  drawCleanText("HØJT LYDNIVEAU!", wLeft/2, stripeH/2+1, stripeH*0.55, 0);
  const pad=16, btnW=wLeft*0.30, btnH=(topH)*0.08, bx=pad, by=topH-btnH-pad;
  fill("#222"); rect(bx,by,btnW,btnH,12);
  drawCleanText("Sluk for lyd", bx+btnW/2, by+btnH/2-2, btnH*0.45, 255);
  lastMuteBtn = {x:bx,y:by,w:btnW,h:btnH};
}

/* ========== Draw ========== */
function draw(){
  background("#F6D466");

  // LOGIN skærm
  if (!loggedIn){
    if (height > width){
      drawCleanText("Drej til landscape for at logge ind", width/2, height*0.50, min(width,height)*0.05, 0);
      return;
    }

    // Sort midterstreg
    stroke(0); strokeCap(ROUND); strokeWeight(20);
    line(width/2, 0, width/2, height);
    noStroke();

    // Venstre: overskrift venstre-justeret
    push();
    textAlign(LEFT, TOP);
    fill(0);
    const padL = Math.min(32, (width/2)*0.06);
    textSize(min(width,height)*0.070);
    text("Log ind for at fortsætte", padL, height*0.08);
    pop();

  // Højre: hvidt kort + CalmAir-logo (ingen CalmAir-tekst)
const rightCX = width * 0.75;
const cardW   = Math.min(width / 2 * 0.70, 460);   // lidt større kort
const cardH   = cardW * 0.70;
const cardX   = rightCX - cardW / 2;
const cardY   = height * 0.30;

// Hvid baggrund (kort) til logo
push();
noStroke();
fill(255);
rect(cardX, cardY, cardW, cardH, 28);  // rundere hjørner
pop();

// Selve logoet inde i kortet (med margin)
if (logoImg) {
  const margin = Math.min(cardW, cardH) * 0.12;     // indre luft
  const imgW   = cardW - margin * 2;
  const imgH   = cardH - margin * 2;
  image(logoImg, cardX + margin, cardY + margin, imgW, imgH);
}

// (ingen CalmAir-tekst under logoet)


    return;
  }

  // Kræv landscape i appen
  if (height > width){
    drawCleanText("Vend telefonen til landscape", width/2, height/2, min(width,height)*0.06, 0);
    return;
  }

  // ====== (ALT DET ANDRE ER UÆNDRET) ======

  // Lyd
  if (aktiv) volRaw = mic.getLevel();
  volFilt = lerp(volFilt, volRaw, 0.10);
  let dB_target = map(constrain(volFilt, 0, 0.15), 0, 0.15, DB_MIN, DB_MAX);
  dB = constrain(lerp(dB, dB_target, 0.20), DB_MIN, DB_MAX);

  // CO2 cyklus 600→1200→800
  const T_UP=180, T_DOWN=120, T_TOTAL=T_UP+T_DOWN;
  let t=(millis()-co2Start)/1000, phase=t%T_TOTAL;
  function easeInOut(u){ return u*u*(3-2*u); }
  co2 = (phase<T_UP) ? lerp(600,1200,easeInOut(phase/T_UP)) : lerp(1200,800,easeInOut((phase-T_UP)/T_DOWN));
  co2 += (noise(t*0.05)-0.5)*4; co2 = constrain(co2,400,1400);

  const topH = height*0.7, bundH = height-topH;

  // Centerlinjer
  stroke(0); strokeCap(ROUND); strokeWeight(20);
  line(width/2, 0, width/2, height);
  strokeWeight(12); line(0, topH, width, topH);
  noStroke();

  // VENSTRE: speedometer
  let cx=width*0.25, cy=topH*0.60, R=min(width/2, topH)*0.48;
  drawGauge3D(cx,cy,R,dB);
  let pulse=1+sin(millis()/220)*0.05, dbColor=getDbColor(dB);
  drawCleanText("dB", cx, cy+R*0.24, R*0.20*pulse, dbColor);
  drawCleanText(int(dB)+" dB", cx, cy+R*0.52, R*0.28*pulse, dbColor);

  // HØJRE: emoji
  let fx=width*0.75, fy=topH*0.49, D=min(width/2, topH)*0.86;
  drawPremiumEmoji(fx,fy,D,co2);

  // NEDERST: knapper/felter
  const pad=8;
  push(); drawingContext.shadowBlur=18; drawingContext.shadowColor='rgba(0,0,0,0.35)';
  fill(aktiv?color(255,0,0):color(0,180,0)); rect(pad,topH+pad,width/2-pad*2,bundH-pad*2,18);
  pop();

  let rightColor = co2<CO2_YELLOW?color(0,180,0): (co2<CO2_RED?color(255,220,0):color(255,0,0));
  push(); drawingContext.shadowBlur=18; drawingContext.shadowColor='rgba(0,0,0,0.35)';
  fill(rightColor); rect(width/2+pad,topH+pad,width/2-pad*2,bundH-pad*2,18);
  pop();

  drawCleanText(aktiv?"Stop":"Start", width*0.25, topH+bundH/2, bundH*0.6, 255);
  drawCleanText(int(co2)+" ppm",    width*0.75, topH+bundH/2, bundH*0.6, 255);

  // dB alarm
  const alarmOn = aktiv && dB > DB_RED;
  if (alarmOn){
    if (!mute && !alarmTone){ alarmTone = new p5.Oscillator('sawtooth'); alarmTone.start(); }
    if (!mute && alarmTone){
      let f=(floor(millis()/220)%2===0)?880:660;
      alarmTone.freq(f); alarmTone.amp(0.35,0.05);
    }
    if (mute && alarmTone){ alarmTone.amp(0,0.15); alarmTone.stop(); alarmTone=null; }
    drawAlarmStripeAndMuteButton(topH);
  } else if (alarmTone){
    alarmTone.amp(0,0.1); alarmTone.stop(); alarmTone=null; lastMuteBtn=null;
  }
}

/* ========== Input ========== */
function mousePressed(){
  if (loggedIn) getAudioContext().resume();
  if (!loggedIn) return; // lad DOM-felter tage taps

  // Mute-knap
  if (lastMuteBtn){
    const {x,y,w,h}=lastMuteBtn;
    if (mouseX>=x && mouseX<=x+w && mouseY>=y && mouseY<=y+h){
      mute=!mute;
      if (mute && alarmTone){ alarmTone.amp(0,0.1); alarmTone.stop(); alarmTone=null; }
      return;
    }
  }
  // Start/Stop
  const topH = height*0.7;
  if (mouseX>=0 && mouseX<=width/2 && mouseY>=topH && mouseY<=height){
    if (aktiv){ mic.stop(); aktiv=false; mute=false; if (alarmTone){ alarmTone.amp(0,0.1); alarmTone.stop(); alarmTone=null; } }
    else { mic.start(); aktiv=true; }
  }
}

function touchStarted(){ if (loggedIn){ mousePressed(); return false; } }
