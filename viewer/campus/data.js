import {buildFloorLayout} from './floor-topology.js';
import program from '../../data/campus-program.json' with {type:'json'};
// Exterior positions trace the artwork, not the separate rectangular CAD test fit.
// x/z metres centered on the 3300 x 2904 ft schematic site. North = negative Z.
const placement = [
[0,-315,52,48,108,'prism',1], [108,-310,68,54,27,'office',1], [220,-306,49,44,24,'vault',1],
[-324,-250,100,55,28,'academy',2],[-293,-115,104,48,24,'office',2],[-407,-108,53,53,25,'round',2],
[126,-135,60,92,23,'factory',3],[284,-110,85,112,31,'sawtooth',3],[390,-200,97,90,21,'ring',3],
[400,-63,77,56,22,'warehouse',3],[-265,33,70,64,65,'garden',4],[-111,39,77,70,32,'dome',4],
[59,76,72,63,27,'dome',4],[194,82,64,57,24,'round',4],[348,100,109,73,14,'stadium',4],
[-377,176,75,60,22,'civic',5],[-214,328,138,64,12,'greenhouses',4],[-160,200,146,69,30,'transit',5],
[310,-303,54,45,37,'civic',1],[437,212,38,38,91.44,'spire',6],[418,344,73,54,31,'utility',6],
[-388,327,80,55,24,'office',5],[182,207,76,56,23,'round',4],[-13,346,105,63,23,'office',6],
[195,365,92,61,24,'bio',6],[447,-126,51,89,24,'factory',3],[203,-143,59,86,24,'factory',3],
[112,310,56,55,26,'water',4],[73,157,83,49,26,'gardenlow',4],[-105,-318,64,47,32,'vault',1],
[397,-294,65,55,24,'round',1],[-314,242,57,49,27,'academy',5],[-223,-214,92,54,26,'academy',2],
[330,319,76,69,30,'utility',6],[301,216,104,60,17,'village',4]];
export const FACILITIES=program.map((f,i)=>{const [x,z,w,d,h,form,district]=placement[i];return {...f,key:`CF-${String(f.id).padStart(2,'0')}`,x,z,w,d,h,form,district,assumedArea:[24,25].includes(f.id)};});
export const DISTRICTS=['All districts','Brain & governance','Knowledge & media','Manufacturing & logistics','Living systems','Public & community','Energy & mesh'];
export const SITE={width:1005.84,depth:885.1392,acres:220};
export const SPIRES=[[-432,-300],[-134,-363],[274,-375],[-161,-174],[-173,-20],[33,-47],[291,21],[-449,140],[438,127],[-11,230]];
export const LAKES=[[-75,-229,103,36],[-70,-126,99,40],[-353,61,67,32],[-66,153,59,33],[12,220,78,30],[62,300,58,27],[-118,412,147,15]];
export function floorLayout(f,level){
 if(!Number.isInteger(level)||level<0||level>=f.levels)throw new RangeError('Unknown floor');
 return buildFloorLayout(f,level);
}
