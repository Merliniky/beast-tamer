// 由 /workspace/beast-design/evolution.json 的 T1/T2 层简化而来（Demo 版配方）
const SLOT_NAMES={head:"头",limbL:"左肢",limbR:"右肢",trait:"特性"};
const LINES={
 wolf:{name:"狼系",desc:"迅捷扑咬",style:"dash",t1:{name:"灰狼崽",spr:"wolf_t1",el:"无"},
  base:{head:"狼首",limb:"狼前腿",trait:"狼尾"},
  t2:[
   {id:"raptor",name:"迅爪狼",spr:"wolf_raptor",el:"风",req:[{slot:"limb",kind:"迅猛龙爪",count:2}]},
   {id:"frost",name:"霜狼",spr:"wolf_frost",el:"冰",req:[{slot:"head",kind:"霜牙头"},{slot:"limb",kind:"冰爪"}]},
   {id:"flame",name:"炎狼",spr:"wolf_flame",el:"火",req:[{slot:"head",kind:"火鬃头"},{slot:"limb",kind:"炽爪"}]},
   {id:"shadow",name:"影狼",spr:"wolf_shadow",el:"暗",req:[{slot:"head",kind:"影牙头"},{slot:"limb",kind:"暗爪"}]},
   {id:"thunder",name:"雷狼",spr:"wolf_thunder",el:"雷",req:[{slot:"head",kind:"雷角头"},{slot:"limb",kind:"电爪"}]}],
  t4:[{id:"velociraptor",name:"迅猛龙",spr:"velociraptor",el:"风",from:"raptor",req:[{slot:"trait",kind:"长尾"},{slot:"head",minLv:4}]},
      {id:"ninetail",name:"九尾狐",spr:"ninetail",el:"火",from:"flame",req:[{slot:"trait",kind:"焰尾"},{slot:"head",minLv:4}]}],
  extraMut:{trait:["长尾","焰尾"]}},
 bear:{name:"熊系",desc:"重击范围击退",style:"swipe",t1:{name:"棕熊崽",spr:"bear_t1",el:"无"},
  base:{head:"熊首",limb:"熊掌",trait:"熊背"},
  t2:[
   {id:"armor",name:"铁甲熊",spr:"bear_armor",el:"土",req:[{slot:"trait",kind:"岩甲"},{slot:"limb",minLv:3,count:2}]},
   {id:"horn",name:"角熊",spr:"bear_horn",el:"土",req:[{slot:"trait",kind:"犀角"},{slot:"head",minLv:3}]},
   {id:"ice",name:"冰熊",spr:"bear_ice",el:"冰",req:[{slot:"head",kind:"冰牙头"},{slot:"trait",kind:"霜毛皮"}]},
   {id:"flame",name:"焰熊",spr:"bear_flame",el:"火",req:[{slot:"trait",kind:"熔岩甲"},{slot:"limb",kind:"炽爪"}]},
   {id:"rage",name:"狂熊",spr:"bear_rage",el:"暗",req:[{slot:"head",kind:"血牙头"},{slot:"trait",kind:"怒鬃"}]}]},
 eagle:{name:"鹰系",desc:"飞行俯冲射羽",style:"fly",t1:{name:"雏鹰",spr:"eagle_t1",el:"无"},
  base:{head:"鹰喙",limb:"鹰翼",trait:"鹰爪"},
  t2:[
   {id:"wind",name:"风鹰",spr:"eagle_wind",el:"风",req:[{slot:"limb",kind:"风羽",count:2}]},
   {id:"thunder",name:"雷鹰",spr:"eagle_thunder",el:"雷",req:[{slot:"limb",kind:"雷羽",count:2}]},
   {id:"fire",name:"火鹰",spr:"eagle_fire",el:"火",req:[{slot:"limb",kind:"炎羽",count:2}]},
   {id:"night",name:"夜鹰",spr:"eagle_night",el:"暗",req:[{slot:"limb",kind:"夜羽",count:2}]},
   {id:"water",name:"水鹰",spr:"eagle_water",el:"水",req:[{slot:"limb",kind:"水羽",count:2}]}]}
};
const EL_COLOR={"无":"#fff","风":"#9f9","冰":"#8df","火":"#f84","暗":"#b6f","雷":"#ff6","土":"#cb8","水":"#6cf"};
const ENEMIES={
 slime:{hp:10,spd:29,dmg:5,r:9,xp:1},bat:{hp:7,spd:59,dmg:4,r:9,xp:1,fly:1},mushroom:{hp:18,spd:27,dmg:6,r:9,xp:2},
 goblin:{hp:28,spd:48,dmg:8,r:11,xp:2},skeleton:{hp:38,spd:41,dmg:9,r:11,xp:3},beetle:{hp:70,spd:32,dmg:11,r:13,xp:4,armor:.3},
 wisp:{hp:24,spd:55,dmg:7,r:9,xp:3,fly:1},golem:{hp:900,spd:36,dmg:20,r:26,xp:30,elite:1}
};
