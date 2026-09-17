"""Pair isolated actual-geometry renders with original facility infographic references."""
import json,os
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont,ImageOps
root=Path(__file__).resolve().parents[1]
output=root/'evidence/facility-review'
refs=Path(os.environ['CAMPUS_REFERENCE_ARTWORK'])
manifest=json.loads((output/'geometry-manifest.json').read_text())
font_path='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
font=ImageFont.truetype(font_path,15);small=ImageFont.truetype(font_path,12)
for start in range(0,len(manifest),12):
 batch=manifest[start:start+12];rows=(len(batch)+2)//3
 sheet=Image.new('RGB',(1800,70+rows*350),(19,26,34));draw=ImageDraw.Draw(sheet)
 draw.text((20,14),'ACTUAL RUNTIME GEOMETRY  |  ORIGINAL FACILITY INFOGRAPHICS',(242,238,229),font=font)
 draw.text((20,40),'Cycles silhouette review only. Not browser-equivalent lighting, device evidence or an exact-match acceptance score.',(168,183,195),font=small)
 for index,f in enumerate(batch):
  x=(index%3)*600;y=70+(index//3)*350
  draw.text((x+10,y+5),f['key']+'  '+f['name'][:48],(240,224,178),font=font)
  render=Image.open(output/(f['key']+'.jpg')).convert('RGB');sheet.paste(render,(x,y+33))
  reference=Image.open(refs/(f['key']+'_Facility_Infographic.png')).convert('RGB')
  reference=ImageOps.contain(reference,(194,300));sheet.paste(reference,(x+402+(194-reference.width)//2,y+33))
  draw.text((x+12,y+333),'RUNTIME GEOMETRY',(167,185,198),font=small)
  draw.text((x+405,y+333),'SOURCE REFERENCE',(167,185,198),font=small)
 sheet.save(output/f"comparison-{batch[0]['id']:02d}-{batch[-1]['id']:02d}.jpg",quality=94)
print('CONTACT_SHEETS_COMPLETE',len(manifest))
