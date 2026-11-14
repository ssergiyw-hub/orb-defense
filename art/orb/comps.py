import sys, numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage as nd
def comps(path, thr=38, minarea=1500):
    im=np.array(Image.open(path).convert('RGB')).astype(int)
    c=np.median(np.concatenate([im[:8].reshape(-1,3),im[-8:].reshape(-1,3),im[:,:8].reshape(-1,3),im[:,-8:].reshape(-1,3)]),0)
    d=np.sqrt(((im-c)**2).sum(2))
    m=d>thr
    m=nd.binary_closing(m,iterations=3)
    m=nd.binary_fill_holes(m)
    lab,n=nd.label(m)
    out=[]
    for i,s in enumerate(nd.find_objects(lab)):
        area=(lab[s]==i+1).sum()
        if area<minarea: continue
        out.append((s[1].start,s[0].start,s[1].stop,s[0].stop,area))
    out.sort(key=lambda b:(b[1]//60,b[0]))
    return c,out
if __name__=='__main__':
    for p in sys.argv[1:]:
        c,o=comps(p)
        img=Image.open(p).convert('RGB'); d=ImageDraw.Draw(img)
        for k,b in enumerate(o):
            d.rectangle(b[:4],outline=(255,0,0),width=2); d.text((b[0]+2,b[1]+2),str(k),fill=(255,255,0))
        name=p.split('/')[-1][:8]
        img.save('ann_'+name+'.png')
        print(name,c,len(o)); 
        for k,b in enumerate(o): print(' ',k,b)
