# 4方向行走：统一缩放 + 以“兜帽中心x / 脚底y”为锚点，固定画布，避免帧间抖动
import numpy as np, json
from PIL import Image
from scipy import ndimage as nd
a=np.asarray(Image.open("/workspace/beast-design/sheets/hero_walk_4dir.jpg").convert("RGB")).astype(int)
bg=np.median(np.concatenate([a[0],a[-1],a[:,0],a[:,-1]]),axis=0)
m=np.abs(a-bg).sum(2)>40; m=nd.binary_opening(m,iterations=1)
lab,n=nd.label(nd.binary_closing(m,iterations=4))
objs=[(s,i+1) for i,s in enumerate(nd.find_objects(lab)) if (s[0].stop-s[0].start)>60]
objs.sort(key=lambda o:(o[0][0].start+o[0][0].stop)/2)
rows=[objs[i*4:(i+1)*4] for i in range(4)]; assert len(objs)==16,len(objs)
rows=[sorted(r,key=lambda o:o[0][1].start) for r in rows]
H=max(o[0][0].stop-o[0][0].start for o in objs); TH=26; s=TH/H
CW,CH,AX,AY=32,30,16,29
man=json.load(open("assets/manifest.json"))
for rname,row in zip("dlru",rows):
  for f,(sl,idx) in enumerate(row):
    mm=(lab==idx)&m; ys,xs=np.where(mm); y1=ys.max()
    top=ys<ys.min()+(y1-ys.min())*0.3; hx=xs[top].mean()   # 兜帽中心
    sw,shh=CW/s,CH/s; x0=hx-AX/s; y0=y1+1-AY/s
    box=(int(round(x0)),int(round(y0)),int(round(x0+sw)),int(round(y0+shh)))
    rgb=Image.fromarray(a.astype(np.uint8)).crop(box); al=Image.fromarray((mm*255).astype(np.uint8)).crop(box)
    al=al.resize((CW,CH),Image.BOX).point(lambda v:255 if v>110 else 0)
    q=rgb.resize((CW,CH),Image.BOX).quantize(20,method=Image.MEDIANCUT).convert("RGBA");q.putalpha(al)
    k=f"hero_{rname}{f}";q.save(f"assets/{k}.png");man[k]={"file":k+".png","w":CW,"h":CH}
json.dump(man,open("assets/manifest.json","w"),indent=1)
strip=Image.new("RGBA",(CW*4*6,CH*4*6),(40,38,35,255))
for r,rn in enumerate("dlru"):
  for f in range(4):
    im=Image.open(f"assets/hero_{rn}{f}.png").resize((CW*6,CH*6),Image.NEAREST);strip.alpha_composite(im,(f*CW*6,r*CH*6))
from PIL import ImageDraw;d=ImageDraw.Draw(strip)
for r in range(4): d.line([(0,(r*CH+AY)*6),(strip.width,(r*CH+AY)*6)],fill=(255,0,0,120))
for f in range(4): d.line([((f*CW+AX)*6,0),((f*CW+AX)*6,strip.height)],fill=(0,200,255,120))
strip.save("screenshots/v4_hero_walk_strip.png")
