"use strict";
const el=id=>document.getElementById(id);
const stage=document.querySelector(".stage"), sheet=el("sheet"), area=el("imageArea"), img=el("preview");
const view=el("view"), sheetContent=el("sheetContent"), filmLauncher=el("filmLauncher");
const rolls=[
["01","北欧黑白","#deded8","胶片","grayscale(1)"],["02","森山粗颗粒","#b4aca1","胶片","grayscale(1) contrast(1.26)"],
["03","晨光日系","#b8d0a8","清新","brightness(1.1) saturate(.85)"],["04","清透人像","#f0bfb0","清新","brightness(1.1) contrast(.92)"],
["05","经典负片","#c2d2bd","城市","saturate(.75) contrast(1.12)"],["06","暖阳复古","#e8b960","胶片",""],
["07","食色生香","#e6a276","胶片","saturate(1.18)"],["08","雨夜静谧","#a3badf","电影","hue-rotate(-11deg) contrast(1.1)"],
["09","流光青橙","#9cbcaf","城市","saturate(1.2) hue-rotate(-8deg)"],["10","童话宝丽来","#e7aebf","胶片","contrast(.85) saturate(1.17)"],
["11","风光反转片","#b1c88f","清新","saturate(1.4) contrast(1.1)"],["12","奇幻红外卷","#d4a4c4","电影","hue-rotate(-35deg) saturate(1.2)"]
];
const cabins=[["胶片取景","photo"],["即时出片","photo"],["双格合拍","half"],["数码直闪","ccd"]];
const recipe=[
 {id:"grain",name:"颗粒",max:2,v:0,list:["关闭","细粒","粗粒"]},{id:"halo",name:"光晕",max:100,v:0,u:"%"},
 {id:"color",name:"色彩",min:-30,max:30,v:0,u:"%"},{id:"corner",name:"暗角",max:2,v:0,list:["关闭","自然","浓重"]},
 {id:"leak",name:"漏光",max:1,v:0,list:["关闭","开启"]},{id:"stamp",name:"日期戳",max:1,v:0,list:["关闭","开启"]}
];
const pro=[
 {id:"ev",name:"曝光补偿",min:-20,max:20,v:0,u:" EV",div:10},{id:"wb",name:"色温",min:2500,max:9000,v:4800,step:100,u:" K"},
 {id:"iso",name:"ISO",max:5,v:1,list:[100,200,400,800,1600,3200]},
 {id:"speed",name:"快门",max:5,v:2,list:["1/500","1/250","1/125","1/60","1/30","1/15"]}
];
const s={drawer:"",cat:"胶片",roll:"06",fav:new Set(),mode:"普通",format:"JPG",ratio:"3:4",lens:50,flash:0,
 flip:false,grid:false,timer:false,cabin:0,manual:false,n:108,latest:"assets/half.png",saved:null,collected:false,placed:false,
 rParam:"halo",pParam:"ev",half:null,busy:false,album:[],albumIndex:0};
let toastTimer;
function scale(){stage.style.setProperty("--scale",Math.min(innerWidth/390,innerHeight/844))}
addEventListener("resize",scale);scale();
function scene(){
 let source=s.mode==="混拍"?"mix":s.flip||s.cabin===3?"ccd":"photo";
 const mono=source==="photo"&&s.roll==="01";
 if(mono)source="preview-bw";
 const ev=s.manual?(pro[2].v-1)*.085+(pro[3].v-2)*.06:pro[0].v*.025;
 const filter=[mono?"":rolls.find(r=>r[0]===s.roll)?.[4],"brightness("+Math.max(.45,1+ev)+")",
 "saturate("+(1+recipe[2].v/100)+")",pro[1].v<4000?"hue-rotate(-9deg)":pro[1].v>6000?"sepia(.18)":""
 ].filter(Boolean).join(" ");
 return {source,filter,zoom:{28:1,50:1.04,85:1.39}[s.lens]};
}
const modeIcons={"普通":"camera","混拍":"mix","贴纸":"sticker"};
const parameterIcons={grain:"grain",halo:"halo",color:"colors",corner:"corner",leak:"leak",stamp:"date",
 ev:"ev",wb:"temp",iso:"iso",speed:"timer"};
const cabinIcons=["camera","print","doubles","flash"];
const drawerLabels={film:"胶卷抽屉",recipe:"胶卷配方",pro:"专业参数",mode:"拍摄模式",format:"保存格式",
 ratio:"画幅",settings:"拍摄设置",cabin:"选择机舱",album:"专属相册",sticker:"贴纸预览",book:"绘本"};

function icon(name){
 return '<span class="icon" aria-hidden="true" style="--icon:'+window.cameraIconIndex[name]+'"></span>';
}
function decorate(control,name,label){
 control.innerHTML=icon(name);
 control.setAttribute("aria-label",label);
 control.title=label;
}
document.querySelectorAll("[data-static-icon]").forEach(element=>{
 element.classList.add("icon");
 element.style.setProperty("--icon",window.cameraIconIndex[element.dataset.staticIcon]);
});
function render(){
 const a=scene(), source=window.samples[a.source];
 if(img.getAttribute("src")!==source)img.src=source;
 img.style.setProperty("--filter",a.filter);
 img.style.setProperty("--zoom",a.zoom);
 img.style.setProperty("--flip",s.flip?-1:1);
 const [w,h]=s.ratio.split(":").map(Number);
 area.style.setProperty("--iw",Math.min(view.clientWidth,view.clientHeight*w/h)+"px");
 area.style.setProperty("--ih",Math.min(view.clientHeight,view.clientWidth*h/w)+"px");
 area.style.setProperty("--halo",recipe[1].v/100*.55);
 area.style.setProperty("--grain",recipe[0].v*.18);
 area.dataset.corner=recipe[3].v;area.dataset.leak=recipe[4].v;area.dataset.stamp=recipe[5].v;area.dataset.date=new Date().toLocaleDateString("zh-CN",{timeZone:"Asia/Hong_Kong"});
 el("grid").hidden=!s.grid;
 el("subject").hidden=s.mode!=="贴纸"||!["photo","preview-bw"].includes(a.source);
 el("loupe").hidden=s.mode!=="混拍";
 decorate(el("modeButton"),modeIcons[s.mode],"拍摄模式 · "+s.mode);
 decorate(el("formatButton"),"file","保存格式 · "+s.format);
 el("ratioValue").textContent=s.ratio;
 el("ratioButton").title="画幅 · "+s.ratio;
 decorate(el("flashButton"),["flashOff","flashAuto","flash"][s.flash],"闪光 · "+["关闭","自动","开启"][s.flash]);
 el("flashButton").setAttribute("aria-pressed",s.flash!==0);
 el("stockLabel").textContent=s.roll==="00"?"":s.roll;
 filmLauncher.title=s.roll==="00"?"胶卷":rolls.find(roll=>roll[0]===s.roll)?.[1]||"胶卷";
 el("count").textContent=String(s.n).padStart(4,"0");
 const shutter=stage.querySelector(".shutter");
 shutter.setAttribute("aria-label",s.mode==="贴纸"?"拍下贴纸":s.mode==="混拍"?"拍下混拍":"拍照");
 shutter.disabled=s.busy;
 if(el("albumThumb").getAttribute("src")!==s.latest)el("albumThumb").src=s.latest;
 document.querySelectorAll("[data-lens]").forEach(b=>{const on=Number(b.dataset.lens)===s.lens;b.classList.toggle("active",on);b.setAttribute("aria-pressed",on)});
 const mark=el("modeMark");
 mark.hidden=s.mode==="普通"&&s.cabin===0;
 const symbol=s.mode==="普通"?cabinIcons[s.cabin]:modeIcons[s.mode];
 const fraction=s.cabin===2?(s.half?"2/2":"1/2"):"";
 mark.innerHTML=icon(symbol)+(fraction?'<span>'+fraction+'</span>':"");
}
function btn(text,act,v="",on=false,symbol="",readout=""){
 const content=symbol?icon(symbol)+(readout?'<span>'+readout+'</span>':""):text;
 return '<button class="pill'+(on?" active":"")+(symbol?" glyph-button":"")+'" data-act="'+act+'" data-value="'+v+
 '" aria-pressed="'+on+'" aria-label="'+text+'" title="'+text+'">'+content+'</button>';
}
const rows=items=>'<div class="rows">'+items.join("")+'</div>';
function head(symbol,extra="",caption=""){
 return '<div class="sheet-head">'+icon(symbol)+(caption?'<strong>'+caption+'</strong>':"")+'<span class="fill"></span>'+extra+'</div>';
}
const value=p=>p.list?p.list[p.v]:p.v/(p.div||1)+p.u;
const readout=p=>typeof value(p)==="number"||!p.list?value(p):p.v;

function slider(p){
 return '<label class="range">'+icon(parameterIcons[p.id])+'<input type="range" aria-label="'+p.name+
 '" aria-valuetext="'+value(p)+'" data-range="'+p.id+'" min="'+(p.min||0)+'" max="'+p.max+
 '" step="'+(p.step||1)+'" value="'+p.v+'"><output>'+readout(p)+'</output></label>';
}

function drawer(){
 if(!s.drawer)return;
 sheet.setAttribute("aria-label",drawerLabels[s.drawer]||"相机抽屉");
 let html="";
 const current=s.drawer;
 if(current==="film"){
   const previousRail=sheet.querySelector(".rolls");
   const scroll=previousRail?.dataset.category===s.cat?previousRail.scrollLeft:null;
   const list=rolls.filter(roll=>s.cat==="胶片"||s.cat==="收藏"&&s.fav.has(roll[0])||roll[3]===s.cat);
   const currentName=rolls.find(roll=>roll[0]===s.roll)?.[1]||"原色";
   const favorite=s.fav.has(s.roll);
   html=head("film",btn(favorite?"已收藏":"收藏当前卷","favorite","",favorite,favorite?"savedStar":"star")+
     btn("配方","open","recipe",false,"sliders"),currentName);
   html+='<div class="tabs">'+["原色","收藏","胶片","清新","电影","城市"].map(category=>
     btn(category,"category",category,s.cat===category)).join("")+'</div>';
   html+=list.length?'<div class="rolls" data-category="'+s.cat+'" aria-label="左右滑动选择胶卷">'+list.map(([id,name,color])=>
    '<button class="roll'+(s.roll===id?" active":"")+'" data-act="roll" data-value="'+id+'" aria-pressed="'+(s.roll===id)+'">'+
    '<span class="can"><img src="assets/roll.png" alt=""><b style="--band:'+color+'">'+id+'</b></span><small>'+name+'</small></button>').join("")+'</div>':
    '<div class="empty-state" role="img" aria-label="'+(s.cat==="原色"?"已回到原色":"尚无收藏")+ '">' +icon(s.cat==="原色"?"empty":"star")+'</div>';
   sheetContent.innerHTML=html;
   const rail=sheet.querySelector(".rolls");
   if(rail){
     const selected=rail.querySelector(".roll.active");
     rail.scrollLeft=scroll ?? (selected?selected.offsetLeft-(rail.clientWidth-selected.offsetWidth)/2:0);
     rail.addEventListener("wheel",event=>{
       if(Math.abs(event.deltaY)<=Math.abs(event.deltaX))return;
       rail.scrollLeft+=event.deltaY;
       event.preventDefault();
     },{passive:false});
   }
   return;
 }
 if(current==="recipe"){
   html=head("sliders",btn("回胶卷","open","film",false,"back"))+
     rows(recipe.map(p=>btn(p.name,"rParam",p.id,p.id===s.rParam,parameterIcons[p.id])))+
     slider(recipe.find(p=>p.id===s.rParam));
 }
 if(current==="pro"){
   const choices=pro.filter(p=>s.manual?p.id!=="ev":!["iso","speed"].includes(p.id));
   html=head("iso",btn("自动","exposure","auto",!s.manual,"iso")+btn("手动","exposure","manual",s.manual,"sliders"))+
     rows(choices.map(p=>btn(p.name,"pParam",p.id,p.id===s.pParam,parameterIcons[p.id])))+
     slider(choices.find(p=>p.id===s.pParam)||choices[0])+
     '<div class="readings"><span aria-label="感光度">'+icon("iso")+'<b>'+(s.manual?value(pro[2]):"200")+'</b></span>'+
     '<span aria-label="快门速度">'+icon("timer")+'<b>'+(s.manual?value(pro[3]):"1/125")+'</b></span></div>';
 }
 if(current==="mode"){
   html=head("camera",btn("机舱","open","cabin",false,"cabin"))+
     rows(["普通","混拍","贴纸"].map(mode=>btn(mode,"mode",mode,s.mode===mode,modeIcons[mode])));
 }
 if(current==="format")html=head("file")+rows(["JPG","PNG"].map(format=>btn(format,"format",format,s.format===format,"file",format)));
 if(current==="ratio")html=head("aspect")+rows(["16:9","4:3","3:4","1:1","65:24"].map(ratio=>btn(ratio,"ratio",ratio,s.ratio===ratio)));
 if(current==="settings"){
   html=head("sliders")+rows([btn("网格 "+(s.grid?"开":"关"),"grid","",s.grid,"grid"),
     btn("定时 "+(s.timer?"3 秒":"关"),"timer","",s.timer,"timer",s.timer?"3″":""),
     btn("专业参数","open","pro",false,"iso"),btn("胶卷配方","open","recipe",false,"film"),
     btn("机舱","open","cabin",false,"cabin")]);
 }
 if(current==="cabin"){
   html=head("cabin")+'<div class="sample-list">'+cabins.map(([name,src],index)=>
     '<button class="sample'+(s.cabin===index?" active":"")+'" data-act="cabin" data-value="'+index+
     '" aria-label="'+name+'" title="'+name+'"><img src="assets/'+src+'.png" alt="">'+icon(cabinIcons[index])+'</button>').join("")+'</div>';
 }
 if(current==="album"){
   const selected=s.album[s.albumIndex];
   const thumbnails=s.album.map((entry,index)=>'<button class="album-photo'+(index===s.albumIndex?" active":"")+
     '" data-act="albumPhoto" data-value="'+index+'" aria-label="照片 '+entry.n+'"><img src="'+entry.url+'" alt=""></button>').join("");
   html=head("picture",selected?btn("下载 "+selected.format,"download","",false,"download"):"")+
     '<div class="result"><img src="'+(selected?.url||s.latest)+'" alt="选中照片"><div class="album-rail">'+thumbnails+'</div></div>';
 }
 if(current==="sticker"){
   html=head("sticker",btn(s.collected?"已收录":"收入贴纸夹","collect","",s.collected,s.collected?"check":"plus"))+
     '<div class="result"><img src="'+s.latest+'" alt="原片">'+icon("arrow")+'<img src="assets/sprite.png" alt="台灯贴纸"></div>';
 }
 if(current==="book"){
   html=head("book",s.collected&&!s.placed?btn("摆放台灯","place","",false,"plus"):"")+
     '<div class="result"><img src="assets/'+(s.placed?"placement":"blank")+'.png" alt="纸剧场">'+
     (s.collected?'<img src="assets/sprite.png" alt="台灯贴纸">'+(s.placed?icon("check"):""):"")+'</div>';
 }
 sheetContent.innerHTML=html;
}
let drawerMotion;
const reducedMotion=matchMedia("(prefers-reduced-motion: reduce)");
const hiddenOffset=()=>sheet.offsetHeight+36;
const slideAt=offset=>{sheet.style.transform="translateY("+offset+"px)"};

function currentDrawerOffset(){
 const transform=getComputedStyle(sheet).transform;
 return transform==="none"?0:new DOMMatrixReadOnly(transform).m42;
}

function settleDrawer(target,from){
 drawerMotion?.cancel();
 slideAt(target);
 if(reducedMotion.matches || Math.abs(target-from)<.5){
   if(!s.drawer) sheet.hidden=true;
   return;
 }
 const motion=sheet.animate(
   [{transform:"translateY("+from+"px)"},{transform:"translateY("+target+"px)"}],
   {duration:target===0?245:190,easing:"cubic-bezier(.24,.72,.28,1)"}
 );
 drawerMotion=motion;
 motion.onfinish=()=>{
   if(drawerMotion!==motion)return;
   drawerMotion=null;
   if(!s.drawer) sheet.hidden=true;
 };
}

function open(name,dragOffset){
 const wasHidden=sheet.hidden;
 const offset=dragOffset ?? (wasHidden?null:currentDrawerOffset());
 s.drawer=name;
 stage.querySelector(".dock").inert=Boolean(name);
 filmLauncher.setAttribute("aria-expanded",String(name==="film"));
 if(name){
   sheet.hidden=false;
   drawer();
   settleDrawer(0,offset ?? hiddenOffset());
 }else if(!wasHidden){
   settleDrawer(hiddenOffset(),offset);
 }
}

function bindPaperDrag(handle,opening){
 let gesture;
 let suppressClick=false;
 handle.addEventListener("pointerdown",event=>{
   if(event.button!==0 || gesture)return;
   gesture={id:event.pointerId,start:event.clientY,scale:stage.getBoundingClientRect().height/844,moved:false,offset:0};
   handle.setPointerCapture(event.pointerId);
 });
 handle.addEventListener("pointermove",event=>{
   if(gesture?.id!==event.pointerId)return;
   const delta=(event.clientY-gesture.start)/gesture.scale;
   const travel=opening?-delta:delta;
   if(!gesture.moved && travel<6)return;
   if(!gesture.moved){
     gesture.moved=true;
     drawerMotion?.cancel();
     if(opening){
       s.drawer="film";
       sheet.hidden=false;
       drawer();
     }
   }
   const range=hiddenOffset();
   gesture.offset=Math.max(0,Math.min(range,opening?range-travel:travel));
   slideAt(gesture.offset);
 });
 const finish=(event,cancelled)=>{
   if(gesture?.id!==event.pointerId)return;
   const released=gesture;
   gesture=null;
   if(!released.moved)return;
   suppressClick=true;
   setTimeout(()=>{suppressClick=false},0);
   const travel=(event.clientY-released.start)/released.scale;
   const crossed=!cancelled && (opening?-travel:travel)>=43;
   const next=opening?(crossed?"film":""):(crossed?"":s.drawer);
   open(next,released.offset);
 };
 handle.addEventListener("pointerup",event=>finish(event,false));
 handle.addEventListener("pointercancel",event=>finish(event,true));
 handle.addEventListener("click",event=>{
   if(!suppressClick)return;
   event.preventDefault();
   event.stopImmediatePropagation();
 },true);
}

bindPaperDrag(filmLauncher,true);
bindPaperDrag(el("paperPull"),false);
function toast(t,ms=2050){
 clearTimeout(toastTimer);
 const indicator=t.startsWith("3 秒")?"timer":t.startsWith("第一格")?"doubles":t.startsWith("已存入")?"check":"grain";
 const toastNode=el("toast");
 toastNode.innerHTML=icon(indicator)+'<span class="sr-only">'+t+"</span>";
 toastNode.hidden=false;
 toastTimer=setTimeout(()=>{el("toast").hidden=true},ms);
}
function frame(){
 const c=document.createElement("canvas"),[w,h]=s.ratio.split(":").map(Number),a=scene();
 c.width=960;c.height=Math.round(960*h/w);
 const ctx=c.getContext("2d"),f=Math.max(c.width/img.naturalWidth,c.height/img.naturalHeight)*a.zoom;
 const ww=img.naturalWidth*f,hh=img.naturalHeight*f;
 ctx.filter=a.filter;if(s.flip){ctx.translate(c.width,0);ctx.scale(-1,1)}
 ctx.drawImage(img,(c.width-ww)/2,(c.height-hh)/2,ww,hh);
 ctx.setTransform(1,0,0,1,0,0);ctx.filter="none";
 if(recipe[3].v){
   const g=ctx.createRadialGradient(c.width/2,c.height/2,c.height*.28,c.width/2,c.height/2,Math.hypot(c.width,c.height)/2);
   g.addColorStop(0,"#0000");g.addColorStop(1,recipe[3].v===2?"#000c":"#0007");ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);
 }
 if(recipe[1].v || recipe[4].v){
   const g=ctx.createLinearGradient(0,0,c.width*.33,0);
   g.addColorStop(0,"rgba(255,142,79,"+(recipe[4].v?.34:recipe[1].v/100*.2)+")");
   g.addColorStop(1,"rgba(255,142,79,0)");ctx.fillStyle=g;ctx.fillRect(0,0,c.width,c.height);
 }
 if(recipe[0].v){
   const grain=ctx.getImageData(0,0,c.width,c.height);
   for(let i=0;i<grain.data.length;i+=4){
     const delta=((i*53%127)/127-.5)*recipe[0].v*24;
     grain.data[i]+=delta;grain.data[i+1]+=delta;grain.data[i+2]+=delta;
   }
   ctx.putImageData(grain,0,0);
 }
 if(recipe[5].v){ctx.font="24px monospace";ctx.fillStyle="#df915f";ctx.textAlign="right";ctx.fillText(area.dataset.date,c.width-21,c.height-19)}
 return c;
}
function captured(){
 s.busy=false;
 if(!img.complete||!img.naturalWidth){render();toast("正在载入取景");return}
 const fx=el("flashFrame");fx.classList.remove("blink");void fx.offsetWidth;
 if(s.flash!==0||s.cabin===3)fx.classList.add("blink");
 let c=frame();
 if(s.cabin===2&&!s.half){s.half=c;toast("第一格已拍 · 再拍一张合版");render();return}
 if(s.cabin===2&&s.half){
   const pair=document.createElement("canvas");pair.width=c.width*2;pair.height=c.height;
   const ctx=pair.getContext("2d");ctx.drawImage(s.half,0,0,c.width,c.height);ctx.drawImage(c,c.width,0);
   c=pair;s.half=null;
 }else if(s.cabin===1){
   const print=document.createElement("canvas");print.width=c.width+36;print.height=c.height+76;
   const ctx=print.getContext("2d");ctx.fillStyle="#f8f0dc";ctx.fillRect(0,0,print.width,print.height);ctx.drawImage(c,18,18);c=print;
 }
 s.n++;s.latest=c.toDataURL(s.format==="PNG"?"image/png":"image/jpeg",.9);
 s.saved={format:s.format,url:s.latest,n:s.n};
 s.album.unshift(s.saved);s.albumIndex=0;
 render();toast("已存入相册 · "+String(s.n).padStart(4,"0"));
 if(s.mode==="贴纸"&&!el("subject").hidden)open("sticker");
}
function action(k,v){
 if(k==="close"){open("");return}
 if(k==="open"){open(v);return}
 if(k==="capture"){
   if(s.busy)return;
   if(s.timer){s.busy=true;render();toast("3 秒后拍摄",3100);setTimeout(captured,3000)}
   else captured();
   return;
 }
 if(k==="download"){
   const selected=s.album[s.albumIndex];
   if(selected){const a=document.createElement("a");a.href=selected.url;a.download="照片-"+selected.n+"."+selected.format.toLowerCase();a.click()}
   return;
 }
 if(k==="category"){s.cat=v;if(v==="原色")s.roll="00";const rail=sheet.querySelector(".rolls");if(rail)rail.scrollLeft=0}
 if(k==="roll")s.roll=v;
 if(k==="favorite"&&s.roll!=="00"){if(s.fav.has(s.roll))s.fav.delete(s.roll);else s.fav.add(s.roll)}
 if(k==="rParam"||k==="pParam")s[k]=v;
 if(k==="exposure"){s.manual=v==="manual";s.pParam=s.manual?"iso":"ev"}
 if(k==="mode"||k==="format"||k==="ratio"){s[k]=v;el("focus").hidden=true;open("")}
 if(k==="flash")s.flash=(s.flash+1)%3;
 if(k==="flip"){s.flip=!s.flip;el("focus").hidden=true}
 if(k==="grid"||k==="timer")s[k]=!s[k];
 if(k==="cabin"){s.cabin=Number(v);s.half=null;open("")}
 if(k==="albumPhoto")s.albumIndex=Number(v);
 if(k==="collect")s.collected=true;
 if(k==="place")s.placed=true;
 render();if(s.drawer)drawer();
}
stage.addEventListener("click",e=>{
 const hit=e.target.closest("button");
 if(hit?.dataset.sheet){open(s.drawer===hit.dataset.sheet?"":hit.dataset.sheet);return}
 if(hit?.dataset.lens){s.lens=Number(hit.dataset.lens);render();return}
 if(hit?.dataset.act||hit?.dataset.action){action(hit.dataset.act||hit.dataset.action,hit.dataset.value);return}
 if(e.target.closest("#view")&&s.drawer){open("");return}
 if(e.target.closest("#imageArea")){
   const r=area.getBoundingClientRect(),f=el("focus");
   f.style.left=(e.clientX-r.left)/r.width*100+"%";f.style.top=(e.clientY-r.top)/r.height*100+"%";f.hidden=false;
 }
});
sheet.addEventListener("input",e=>{
 const p=[...recipe,...pro].find(x=>x.id===e.target.dataset.range);
 if(!p)return;
 p.v=Number(e.target.value);
 e.target.parentElement.querySelector("output").textContent=readout(p);
 e.target.setAttribute("aria-valuetext",value(p));
 render();
});
addEventListener("keydown",e=>{if(e.key==="Escape"&&s.drawer)open("")});
render();





