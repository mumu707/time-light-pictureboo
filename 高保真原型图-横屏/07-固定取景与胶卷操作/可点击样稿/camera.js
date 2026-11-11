"use strict";
const el=id=>document.getElementById(id);
const stage=document.querySelector(".stage"), sheet=el("sheet"), area=el("imageArea"), img=el("preview");
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
const s={drawer:"",cat:"胶片",roll:"06",fav:new Set(),mode:"普通",format:"JPG",ratio:"16:9",lens:50,flash:0,
 flip:false,grid:false,timer:false,cabin:0,manual:false,n:108,latest:"assets/half.png",saved:null,collected:false,placed:false,
 rParam:"halo",pParam:"ev",half:null,busy:false,album:[],albumIndex:0};
let toastTimer;
function scale(){stage.style.setProperty("--scale",Math.min(innerWidth/960,innerHeight/540))}
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
function render(){
 const a=scene(), source=window.samples[a.source];
 if(img.getAttribute("src")!==source)img.src=source;
 img.style.setProperty("--filter",a.filter);
 img.style.setProperty("--zoom",a.zoom);
 img.style.setProperty("--flip",s.flip?-1:1);
 const [w,h]=s.ratio.split(":").map(Number);
 area.style.setProperty("--iw",Math.min(672,378*w/h)+"px");
 area.style.setProperty("--ih",Math.min(378,672*h/w)+"px");
 area.style.setProperty("--halo",recipe[1].v/100*.55);
 area.style.setProperty("--grain",recipe[0].v*.18);
 area.dataset.corner=recipe[3].v;area.dataset.leak=recipe[4].v;area.dataset.stamp=recipe[5].v;area.dataset.date=new Date().toLocaleDateString("zh-CN",{timeZone:"Asia/Hong_Kong"});
 el("grid").hidden=!s.grid;
 el("subject").hidden=s.mode!=="贴纸"||!["photo","preview-bw"].includes(a.source);
 el("loupe").hidden=s.mode!=="混拍";
 el("modeButton").textContent=s.mode;el("formatButton").textContent=s.format;el("ratioButton").textContent=s.ratio;
 el("flashButton").textContent="闪光 "+["关闭","自动","开启"][s.flash];
 el("flashButton").setAttribute("aria-pressed",s.flash!==0);
 el("stockLabel").textContent=s.roll==="00"?"胶卷":"胶卷 · "+s.roll;
 const shutter=stage.querySelector(".shutter");
 shutter.setAttribute("aria-label",s.mode==="贴纸"?"拍下贴纸":s.mode==="混拍"?"拍下混拍":"拍照");
 shutter.disabled=s.busy;
 if(el("albumThumb").getAttribute("src")!==s.latest)el("albumThumb").src=s.latest;
 document.querySelectorAll("[data-lens]").forEach(b=>{const on=Number(b.dataset.lens)===s.lens;b.classList.toggle("active",on);b.setAttribute("aria-pressed",on)});
 const mark=el("modeMark");
 mark.hidden=s.mode==="普通"&&s.ratio!=="65:24"&&s.cabin===0;
 mark.textContent=s.mode==="混拍"?"圆形混拍":s.mode==="贴纸"?"贴纸取景":s.ratio==="65:24"?"65:24 · 成片范围":
  s.cabin===2?(s.half?"2 / 2 · 第二格":"1 / 2 · 第一格"):cabins[s.cabin][0];
}
function btn(text,act,v="",on=false){
 return '<button class="pill'+(on?" active":"")+'" data-act="'+act+'" data-value="'+v+'" aria-pressed="'+on+'">'+text+'</button>';
}
const rows=a=>'<div class="rows">'+a.join("")+'</div>';
const head=(title,extra="")=>'<div class="sheet-head"><strong>'+title+'</strong><span class="fill"></span>'+extra+btn("收起","close")+'</div>';
const value=p=>p.list?p.list[p.v]:p.v/(p.div||1)+p.u;
function slider(p){
 return '<label class="range"><span>'+p.name+'</span><input type="range" aria-label="'+p.name+'" data-range="'+p.id+
 '" min="'+(p.min||0)+'" max="'+p.max+'" step="'+(p.step||1)+'" value="'+p.v+'"><output>'+value(p)+'</output></label>';
}
function drawer(){
 sheet.hidden=!s.drawer;
 if(!s.drawer){sheet.replaceChildren();return}
 let h="";
 const current=s.drawer;
 if(current==="film"){
   const scroll=sheet.querySelector(".rolls")?.scrollLeft||0;
   const list=rolls.filter(r=>s.cat==="胶片"||s.cat==="收藏"&&s.fav.has(r[0])||r[3]===s.cat);
   h=head("胶卷",btn(s.fav.has(s.roll)?"已收藏":"收藏当前卷","favorite","",s.fav.has(s.roll))+btn("配方","open","recipe"));
   h+='<div class="tabs">'+["原色","收藏","胶片","清新","电影","城市"].map(c=>btn(c,"category",c,s.cat===c)).join("")+'</div>';
   h+=list.length?'<div class="rolls" aria-label="左右滑动选择胶卷">'+list.map(([id,name,color])=>
    '<button class="roll'+(s.roll===id?" active":"")+'" data-act="roll" data-value="'+id+'" aria-pressed="'+(s.roll===id)+'">'+
    '<span class="can"><img src="assets/roll.png" alt=""><b style="--band:'+color+'">'+id+'</b></span><small>'+name+'</small></button>').join("")+'</div>':
    '<p class="info">'+(s.cat==="原色"?"已回到原色色调。":"收藏胶卷后会出现在这里。")+'</p>';
   sheet.innerHTML=h;
   const rail=sheet.querySelector(".rolls");
   if(rail){rail.scrollLeft=scroll;rail.addEventListener("wheel",e=>{if(Math.abs(e.deltaY)>Math.abs(e.deltaX)){rail.scrollLeft+=e.deltaY;e.preventDefault()}},{passive:false})}
   return;
 }
 if(current==="recipe")h=head("胶卷配方",btn("回胶卷","open","film"))+rows(recipe.map(p=>btn(p.name,"rParam",p.id,p.id===s.rParam)))+slider(recipe.find(p=>p.id===s.rParam));
 if(current==="pro"){
   const choices=pro.filter(p=>s.manual?p.id!=="ev":!["iso","speed"].includes(p.id));
   h=head("专业参数",btn("自动","exposure","auto",!s.manual)+btn("手动","exposure","manual",s.manual))+
    rows(choices.map(p=>btn(p.name,"pParam",p.id,p.id===s.pParam)))+slider(choices.find(p=>p.id===s.pParam)||choices[0])+
    '<p class="info">'+(s.manual?"手动曝光 · ISO "+value(pro[2])+" · 快门 "+value(pro[3]):"自动读数 · ISO 200 · 1/125")+'</p>';
 }
 if(current==="mode")h=head("拍摄模式",btn("机舱","open","cabin"))+rows(["普通","混拍","贴纸"].map(t=>btn(t,"mode",t,s.mode===t)));
 if(current==="format")h=head("保存格式")+rows(["JPG","PNG"].map(t=>btn(t,"format",t,s.format===t)));
 if(current==="ratio")h=head("画幅")+rows(["16:9","4:3","3:4","1:1","65:24"].map(t=>btn(t,"ratio",t,s.ratio===t)));
 if(current==="settings")h=head("拍摄设置")+rows([btn("网格 "+(s.grid?"开":"关"),"grid","",s.grid),btn("定时 "+(s.timer?"3 秒":"关"),"timer","",s.timer),
 btn("专业参数","open","pro"),btn("胶卷配方","open","recipe"),btn("机舱","open","cabin")]);
 if(current==="cabin")h=head("选择机舱")+'<div class="sample-list">'+cabins.map(([name,src],i)=>
 '<button class="sample'+(s.cabin===i?" active":"")+'" data-act="cabin" data-value="'+i+'"><img src="assets/'+src+'.png" alt="">'+name+'</button>').join("")+'</div>';
  if(current==="album"){
   const selected=s.album[s.albumIndex];
   const thumbnails=s.album.map((entry,i)=>'<button class="album-photo'+(i===s.albumIndex?' active':'')+
    '" data-act="albumPhoto" data-value="'+i+'" aria-label="照片 '+entry.n+'"><img src="'+entry.url+'" alt=""></button>').join("");
   h=head("专属相册")+'<div class="result"><img src="'+(selected?.url||s.latest)+'" alt="选中照片"><span>累计快门 '+String(s.n).padStart(4,"0")+
    '</span><div class="album-rail">'+thumbnails+'</div><div class="rows">'+(selected?btn("下载 "+selected.format,"download"):"")+'</div></div>';
 }
 if(current==="sticker")h=head("贴纸预览")+'<div class="result"><img src="'+s.latest+'" alt="原片"><span>→</span><img src="assets/sprite.png" alt="台灯贴纸"><span>复古台灯</span>'+
 '<div class="rows">'+btn(s.collected?"已收录":"收入贴纸夹","collect","",s.collected)+btn("回取景","close")+'</div></div>';
 if(current==="book")h=head("绘本")+'<div class="result"><img src="assets/'+(s.placed?"placement":"blank")+'.png" alt="纸剧场"><span>'+
 (s.placed?"台灯已摆放":s.collected?"贴纸夹 · 复古台灯":"贴纸夹为空")+'</span><div class="rows">'+(s.collected&&!s.placed?btn("摆放台灯","place"):"")+'</div></div>';
 sheet.innerHTML=h;
}
function open(name){
 s.drawer=name;
 stage.querySelector(".dock").inert=Boolean(name);
 stage.querySelector(".lens").inert=Boolean(name);
 drawer();
}
function toast(t,ms=2050){
 clearTimeout(toastTimer);el("toast").textContent=t;el("toast").hidden=false;
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
 p.v=Number(e.target.value);e.target.parentElement.querySelector("output").textContent=value(p);render();
});
addEventListener("keydown",e=>{if(e.key==="Escape"&&s.drawer)open("")});
render();

