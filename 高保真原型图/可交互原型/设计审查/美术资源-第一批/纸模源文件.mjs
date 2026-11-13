
import * as T from "three";

const paper = color => new T.MeshStandardMaterial({ color, roughness: .95 });
const part = (parent, name, geometry, color, x, y, z) => {
  const mesh = new T.Mesh(geometry, paper(color));
  mesh.name = name;
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
};
const box = (p,n,w,h,d,x,y,z,c) => part(p,n,new T.BoxGeometry(w,h,d),c,x,y,z);
const tube = (p,n,r,h,x,y,z,c,sides=9) => part(p,n,new T.CylinderGeometry(r,r,h,sides),c,x,y,z);
const poly = (p,n,points,d,x,y,z,c) => {
  const shape = new T.Shape(points.map(([px,py]) => new T.Vector2(px,py)));
  return part(p,n,new T.ExtrudeGeometry(shape,{depth:d,bevelEnabled:false,curveSegments:1}),c,x,y,z);
};
function node(parent,name,x=0,y=0,z=0) {
  const group = new T.Group();
  group.name = name;
  group.position.set(x,y,z);
  parent?.add(group);
  return group;
}
const ivory="#f2d9a9", wood="#87614c", coral="#b96b55", sage="#829574", amber="#e7ad61", night="#4e607b";
function strut(parent,name,start,end,width,color) {
  const a=new T.Vector3(...start), b=new T.Vector3(...end);
  const mid=a.clone().lerp(b,.5);
  const beam=box(parent,name,width,a.distanceTo(b),width,mid.x,mid.y,mid.z,color);
  beam.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),b.sub(a).normalize());
  return beam;
}
function tray(p,width,depth,color) {
  box(p,"paper_base",width,.095,depth,0,.048,0,wood);
  box(p,"paper_top",width*.94,.028,depth*.92,0,.104,0,color);
}

export const models = {
  mail_kiosk: {
    name:"邮亭", size:[2.24,1.5], anchors:{ fold_pivot:[0,0,-.59], mail_slot:[0,.99,.61], visit:[0,0,1.12] },
    build(p) {
      tray(p,2.17,1.47,ivory);
      box(p,"left_wall",.11,1.48,1.02,-.89,.86,0,coral);
      box(p,"right_wall",.11,1.48,1.02,.89,.86,0,coral);
      box(p,"back_wall",1.79,1.53,.10,0,.89,-.49,"#a25b4d");
      box(p,"face",1.59,.92,.13,0,.76,.49,coral);
      box(p,"mail_slot_inset",.56,.09,.045,0,.99,.575,"#58433b");
      box(p,"envelope_plaque",.45,.27,.07,0,.56,.575,ivory);
      for(const direction of [-1,1]) {
        box(p,"envelope_fold",.24,.027,.014,direction*.091,.565,.616,wood).rotation.z=direction*.53;
      }
      for(const direction of [-1,1]) {
        box(p,"folded_roof",1.12,.083,1.41,direction*.47,1.67,0,coral).rotation.z=-direction*.27;
        box(p,"front_paper_edge",1.08,.032,.027,direction*.47,1.656,.715,ivory).rotation.z=-direction*.27;
      }
      box(p,"roof_ridge",.09,.075,1.43,0,1.82,0,ivory);
    }
  },
  windsock: {
    name:"纸风向袋", size:[.75,.68], anchors:{ fold_pivot:[0,0,-.19], wind_pivot:[0,1.63,0] },
    build(p) {
      tray(p,.71,.64,sage);
      tube(p,"pole",.043,1.49,0,.85,0,wood);
      const sock=node(p,"wind_pivot",0,1.63,0);
      const segments=[[.04,.27],[.28,.23],[.51,.17],[.69,.12]];
      for(let i=0;i<segments.length;i++) {
        const [x,r]=segments[i];
        const ring=part(sock,"pleated_ribbon_"+i,new T.CylinderGeometry(r,r*.88,.27,7,1,true),i%2 ? ivory : coral,x,0,0);
        ring.material.side=T.DoubleSide;
        ring.rotation.z=-Math.PI/2;
      }
      const rim=part(sock,"mouth_rim",new T.TorusGeometry(.266,.021,4,7),ivory,-.084,0,0);
      rim.rotation.y=Math.PI/2;
      tube(p,"cap",.09,.07,0,1.64,0,amber);
    }
  },
  parcel_bench: {
    name:"包裹长椅", size:[2.24,1.06], anchors:{fold_pivot:[0,0,-.39],visit:[0,0,.91]},
    build(p) {
      for(const x of [-.83,.83]) box(p,"folded_leg",.16,.43,.71,x,.215,0,wood);
      box(p,"seat",2.2,.10,.92,0,.47,0,sage);
      box(p,"backrest",2.17,.28,.115,0,.72,-.39,sage);
      for(const [x,w,h] of [[-.64,.52,.36],[.23,.63,.27],[.82,.31,.46]]) {
        box(p,"parcel",w,h,.40,x,.52+h/2,.04,ivory);
        box(p,"parcel_tape",w*.21,h+.01,.412,x,.52+h/2,.04,coral);
      }
    }
  },
  apricot_tree: {
    name:"折叶杏树", size:[1.13,1.04], anchors:{fold_pivot:[0,0,0],fruit_pick:[.66,1.71,.48],visit:[0,0,.92]},
    build(p) {
      tray(p,1.08,1.02,sage);
      strut(p,"trunk",[0,.10,0],[.11,1.75,0],.15,wood);
      strut(p,"branch_left",[.05,.96,0],[-.67,1.68,.07],.095,wood);
      strut(p,"branch_right",[.10,1.17,0],[.70,1.86,-.11],.10,wood);
      const leaves=[[0,1.92,0,1.20],[-.63,1.75,.16,.69],[.65,1.88,-.03,.79],[.12,2.48,-.16,.70]];
      for(const [x,y,z,w] of leaves) {
        poly(p,"leaf_facet",[[-w,0],[-w*.72,w*.46],[0,w*.61],[w*.64,w*.43],[w,0],[w*.56,-w*.30],[-w*.43,-w*.32]],.055,x,y,z,sage);
        poly(p,"light_facet",[[-w,0],[0,w*.55],[w,0],[0,-w*.14]],.036,x,y,z+.06,"#a4ac77").rotation.y=.22;
      }
      for(const [x,y,z] of [[-.79,1.85,.37],[-.4,1.62,.43],[.01,2.21,.31],[.42,1.78,.43],[.72,1.76,.28],[.27,2.47,.12]]) {
        part(p,"apricot",new T.DodecahedronGeometry(.145,0),amber,x,y,z);
      }
    }
  },
  fruit_crate: {
    name:"杏果筐", size:[1.47,1.05], anchors:{visit:[0,0,.89],fruit_pick:[0,.49,.31]},
    build(p) {
      tray(p,1.44,1.03,wood);
      for(const z of [-.46,.46]) for(const y of [.22,.43]) box(p,"crate_slat",1.38,.15,.065,0,y,z,ivory);
      for(const x of [-.66,.66]) box(p,"crate_end",.08,.47,.98,x,.31,0,wood);
      for(const [x,y,z] of [[-.48,.43,-.12],[-.14,.47,.23],[.18,.52,-.20],[.45,.48,.18],[-.35,.54,-.22]]) {
        part(p,"fruit",new T.DodecahedronGeometry(.18,0),amber,x,y,z);
        poly(p,"fruit_leaf",[[0,0],[.06,.105],[.23,.075],[.11,0]],.019,x,y+.16,z,sage);
      }
    }
  },
  orchard_ladder: {
    name:"果园纸梯", size:[1.1,1.32], anchors:{fold_pivot:[0,0,-.55],visit:[0,0,.91]},
    build(p) {
      for(const x of [-.48,.48]) {
        strut(p,"front_rail",[x,0,.57],[x,1.84,-.1],.108,wood);
        strut(p,"back_rail",[x,0,-.58],[x,1.84,-.1],.09,sage);
      }
      for(let i=0;i<5;i++) {
        const y=.24+i*.32;
        box(p,"rung",1.03,.075,.22,0,y,.57-y*.36,ivory);
      }
      box(p,"top_step",1.06,.11,.34,0,1.84,-.1,ivory);
    }
  },
  paper_telescope: {
    name:"纸筒望远镜", size:[1.63,1.6], anchors:{fold_pivot:[0,0,0],scope_pitch:[0,1.33,0],visit:[0,0,.99]},
    build(p) {
      for(let i=0;i<3;i++) {
        const a=i*2*Math.PI/3;
        strut(p,"tripod_leg",[Math.sin(a)*.69,.035,Math.cos(a)*.69],[0,1.34,0],.105,wood);
      }
      const pivot=node(p,"scope_pitch",0,1.33,0);
      pivot.rotation.x=-.27;
      tube(pivot,"scope_tube",.24,1.36,0,0,0,night).rotation.x=Math.PI/2;
      for(const z of [-.61,.60]) tube(pivot,"paper_rim",.274,.12,0,0,z,amber).rotation.x=Math.PI/2;
      tube(pivot,"lens",.213,.025,0,0,.668,"#88adab",12).rotation.x=Math.PI/2;
      tube(pivot,"eyepiece",.125,.26,0,0,-.73,wood).rotation.x=Math.PI/2;
    }
  },
  star_chart: {
    name:"星图画架", size:[1.45,1.12], anchors:{fold_pivot:[0,0,-.38],chart:[0,1.04,.24],visit:[0,0,.95]},
    build(p) {
      for(const x of [-.61,.61]) strut(p,"easel_leg",[x,0,.37],[x*.57,1.55,-.08],.088,wood);
      strut(p,"rear_support",[0,0,-.51],[0,1.48,-.09],.11,wood);
      box(p,"chart_back",1.32,.98,.075,0,1.04,.135,ivory);
      box(p,"sky_print",1.18,.84,.025,0,1.04,.19,night);
      const stars=[[-.46,1.03],[-.25,1.24],[.04,1.18],[.22,.89],[.46,1.22]];
      for(const [x,y] of stars) poly(p,"star",[[0,.065],[.047,0],[0,-.065],[-.047,0]],.022,x,y,.215,amber);
      for(let i=1;i<stars.length;i++) strut(p,"constellation",[...stars[i-1],.222],[...stars[i],.222],.014,ivory);
      box(p,"map_ledge",1.44,.088,.22,0,.54,.17,wood);
    }
  },
  night_lantern: {
    name:"夜灯", size:[.96,.92], anchors:{fold_pivot:[0,0,0],light:[0,.84,0],visit:[0,0,.77]},
    build(p) {
      tray(p,.93,.91,night);
      tube(p,"stand",.117,.42,0,.31,0,wood);
      tube(p,"lantern_bottom",.33,.083,0,.55,0,wood);
      part(p,"paper_diffuser",new T.CylinderGeometry(.265,.29,.44,6),amber,0,.80,0);
      for(let i=0;i<6;i++) {
        const a=i*Math.PI/3;
        box(p,"lantern_rib",.033,.48,.035,Math.sin(a)*.275,.80,Math.cos(a)*.275,ivory);
      }
      part(p,"folded_top",new T.ConeGeometry(.36,.27,6),night,0,1.14,0);
      const handle=part(p,"handle",new T.TorusGeometry(.11,.022,5,10,Math.PI),ivory,0,1.24,0);
      handle.rotation.y=Math.PI/8;
    }
  }
};

export const scenes = {
  terrace:{name:"邮风露台",paper:"#e1c5a0",trim:"#bb7960", placements:[["mail_kiosk",-2.35,-1.72,-.08],["windsock",2.05,-1.81,.37],["parcel_bench",1.35,1.12,-.12]]},
  orchard:{name:"琥珀果园",paper:"#dce0ad",trim:"#a4a76d",placements:[["apricot_tree",-2.50,-1.37,.18],["orchard_ladder",2.45,-1.29,-.29],["fruit_crate",1.58,1.18,-.11]]},
  observatory:{name:"夜灯观星台",paper:"#b2bac2",trim:"#7786a2",placements:[["paper_telescope",-2.2,-1.28,.40],["star_chart",2.52,-1.28,-.24],["night_lantern",1.62,1.31,.09]]}
};

export function makeModel(id) {
  const root=node(null,id);
  const spec=models[id];
  const body=node(root,"paper_body");
  spec.build(body);
  for(const [name,at] of Object.entries(spec.anchors)) {
    if (body.getObjectByName(name)) continue;
    node(root,name,...at);
  }
  return root;
}

export function makeScene(id) {
  const spec=scenes[id];
  const root=node(null,id);
  for(const sign of [-1,1]) {
    const x=sign*2.23;
    box(root,"page_block",4.43,.18,6.30,x,-.09,0,wood);
    box(root,"page_border",4.38,.063,6.23,x,-.034,0,spec.trim);
    box(root,"page_face",4.15,.025,6.01,x,-.013,0,spec.paper);
  }
  box(root,"binding",.095,.13,6.32,0,-.074,0,"#8d6250");
  for(let i=0;i<12;i++) {
    const x=-3.8+i*.69;
    tube(root,"path_mark",.075,.012,x,.008,.46+Math.sin(i*.52)*.39,spec.trim,7);
  }
  for(const [asset,x,z,angle] of spec.placements) {
    const model=makeModel(asset);
    model.position.set(x,0,z);
    model.rotation.y=angle;
    root.add(model);
  }
  return root;
}

