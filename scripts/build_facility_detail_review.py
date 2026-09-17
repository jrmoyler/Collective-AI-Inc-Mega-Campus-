"""Match before/after actual-geometry views; no fidelity score is inferred."""
import json,os
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
root=Path(__file__).resolve().parents[1]
output=root/'evidence/facility-detail-review'
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',20)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
before=json.loads((output/'cameras-before.json').read_text())
after=json.loads((output/'cameras-after.json').read_text())
selected=os.environ.get('CAMPUS_FACILITY_IDS')
keys=[key for key in before if not selected or int(key[3:]) in [int(i) for i in selected.split(',')]]
for key in keys:
 assert key in after
 assert before[key]==after[key],key+' camera mismatch'
 canvas=Image.new('RGB',(1800,724),(19,26,34));draw=ImageDraw.Draw(canvas)
 draw.text((18,10),key+'  /  MATCHED OCCUPIED-FACADE DETAIL REVIEW',(242,233,210),font=font)
 draw.text((18,40),'BEFORE',(181,195,204),font=small);draw.text((918,40),'AFTER',(181,195,204),font=small)
 for x,suffix in [(0,'before'),(900,'after')]:canvas.paste(Image.open(output/(key+'-'+suffix+'.jpg')).convert('RGB'),(x,64))
 canvas.save(output/(key+'-comparison.jpg'),quality=94)
print('MATCHED_DETAIL_PAIRS_COMPLETE',len(keys))
