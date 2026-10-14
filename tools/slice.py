import numpy as np, json
from PIL import Image
from scipy import ndimage as nd
S="/workspace/beast-design/sheets/"; O="/workspace/beast-tamer/assets/"
SHEETS={
 "wolf_t1_t2.jpg":[("wolf_t1",24),("wolf_raptor",29),("wolf_frost",29),("wolf_flame",29),("wolf_shadow",29),("wolf_thunder",29)],
 "bear_eagle_t1_t2.jpg":[("bear_t1",24),("bear_armor",29),("bear_horn",29),("bear_ice",29),("bear_flame",29),("bear_rage",29),
   ("eagle_t1",24),("eagle_wind",29),("eagle_thunder",29),("eagle_fire",29),("eagle_night",29),("eagle_water",29)],
 "hero_enemies.jpg":[("hero_0",26),("hero_1",26),("hero_2",26),("hero_3",26),("slime",15),("bat",18),("mushroom",15),("goblin",20),
   ("skeleton",20),("beetle",22),("wisp",17),("golem",40)],
 "wolf_t4_parts.jpg":[("velociraptor",34),("ninetail",34),("head_gray",24),("head_frost",24),("head_flame",24),("leg_l",18),("leg_r",18),
   ("raptor_claw_l",18),("raptor_claw_r",18),("ice_claw_l",18),("ice_claw_r",18),("tail_raptor",30),("tail_croc",30),("tail_wolf",24),("tail_long",40)],
}
man={}
DROP_SMALL={"bear_eagle_t1_t2.jpg"}
MERGE={"wolf_t1_t2.jpg":1,"bear_eagle_t1_t2.jpg":2}
for f,names in SHEETS.items():
  a=np.asarray(Image.open(S+f).convert("RGB")).astype(int)
  bg=np.median(np.concatenate([a[0],a[-1],a[:,0],a[:,-1]]),axis=0)
  d=np.abs(a-bg).sum(2); m=d>36
  m=nd.binary_opening(m,iterations=1)
  k=MERGE.get(f,6)
  big=nd.binary_closing(m,iterations=k)
  big=nd.binary_dilation(big,iterations=k)  # 合并特效
  lab,n=nd.label(big); objs=nd.find_objects(lab)
  comps=[(s,i+1) for i,s in enumerate(objs) if (s[0].stop-s[0].start)*(s[1].stop-s[1].start)>1500]
  if f in DROP_SMALL:
    ar=[(c[0][0].stop-c[0][0].start)*(c[0][1].stop-c[0][1].start) for c in comps]; med=sorted(ar)[len(ar)//2]
    comps=[c for c,x in zip(comps,ar) if x>0.25*med]
  # 按行聚类后按x排序
  comps.sort(key=lambda c:(c[0][0].start+c[0][0].stop)/2)
  rows=[];
  for c in comps:
    cy=(c[0][0].start+c[0][0].stop)/2
    if rows and abs(cy-rows[-1][0])<70: rows[-1][1].append(c)
    else: rows.append([cy,[c]])
  ordered=[c for r in rows for c in sorted(r[1],key=lambda c:c[0][1].start)]
  print(f,len(ordered),"expected",len(names)); assert len(ordered)==len(names),f
  for (sl,idx),(nm,tgt) in zip(ordered,names):
    crop=a[sl]; mm=(m[sl]&(lab[sl]==idx))
    mm=nd.binary_fill_holes(nd.binary_closing(mm,iterations=2))
    # 软边清理：边缘1像素腐蚀去掉灰色光晕
    mm=nd.binary_erosion(mm,iterations=1)
    ys,xs=np.where(mm); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
    rgba=np.dstack([crop,mm*255])[y0:y1,x0:x1].astype(np.uint8)
    im=Image.fromarray(rgba,"RGBA"); w,h=im.size; s=tgt/max(w,h)
    W,H=max(1,round(w*s)),max(1,round(h*s))
    # 先用 BOX 求平均颜色再量化，避免最近邻跳像素造成脏点
    rgb=im.convert("RGB").resize((W,H),Image.BOX); al=im.getchannel("A").resize((W,H),Image.BOX).point(lambda v:255 if v>110 else 0)
    q=rgb.quantize(24,method=Image.MEDIANCUT).convert("RGBA"); q.putalpha(al)
    q.save(O+nm+".png"); man[nm]={"file":nm+".png","w":W,"h":H,"sheet":f}
g=Image.open(S+"ground.jpg").convert("RGB").crop((384,104,896,616)).resize((64,64),Image.BOX).quantize(16).convert("RGB")
g.save(O+"ground.png"); man["ground"]={"file":"ground.png","w":64,"h":64}
json.dump(man,open(O+"manifest.json","w"),indent=1)
# 预览拼图
names=list(man); cols=8; cell=80
pv=Image.new("RGBA",(cols*cell,((len(names)+cols-1)//cols)*cell),(60,60,70,255))
for i,k in enumerate(names):
  im=Image.open(O+man[k]["file"]).convert("RGBA"); pv.alpha_composite(im,((i%cols)*cell+(cell-im.width)//2,(i//cols)*cell+(cell-im.height)//2))
pv.resize((pv.width*2,pv.height*2),Image.NEAREST).save("/workspace/beast-tamer/tools/preview.png")
