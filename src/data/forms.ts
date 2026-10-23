import type { PlantForm,FishForm } from '../game/types';

const plant=(habit:PlantForm['habit'],leaf:PlantForm['leaf'],width:number,bend:number,tip:string,leaves:number,rate:number,spread:number,group:PlantForm['group']):PlantForm=>({habit,leaf,width,bend,tip,leaves,rate,spread,group});
export const PLANT_FORMS:Record<string,PlantForm>={
  monte:plant('carpet','round',.36,.08,'#bfd884',56,.24,.6,'foreground'),
  hairgrass:plant('grass','needle',.018,.15,'#bad080',62,.22,.48,'foreground'),
  glosso:plant('carpet','oval',.23,.13,'#b5d66c',42,.25,.54,'foreground'),
  hc:plant('carpet','round',.46,.05,'#c2e278',72,.19,.52,'foreground'),
  anubias:plant('rhizome','round',.38,.12,'#789652',22,.065,.4,'midground'),
  buce:plant('rhizome','crypt',.22,.24,'#779e8b',20,.055,.32,'midground'),
  crypt:plant('rosette','crypt',.24,.27,'#b89964',28,.105,.46,'midground'),
  fern:plant('rhizome','fern',.17,.18,'#92b55e',28,.10,.4,'midground'),
  stauro:plant('stem','oval',.31,.13,'#b5d376',40,.17,.4,'midground'),
  rotala:plant('stem','lance',.14,.13,'#deab84',64,.29,.4,'background'),
  'rotala-hra':plant('stem','lance',.095,.16,'#ec966c',64,.27,.4,'background'),
  vallis:plant('grass','strap',.038,.30,'#b0c778',32,.23,.48,'background'),
  ludwigia:plant('stem','oval',.29,.17,'#d7a38c',48,.22,.43,'background'),
  moss:plant('moss','java-moss',.36,.18,'#7eaa4f',66,.18,.5,'moss'),
  christmas:plant('moss','christmas-moss',.46,.12,'#8eaf62',54,.14,.44,'moss'),
};
const fish=(body:[number,number],snout:number,tail:FishForm['tail'],color:string,accent:string,mark:FishForm['mark'],dorsal:number,ventral:number,speed:number,zone:FishForm['zone'],school:boolean,adultCm:number,maturityDays:number,hungerPerDay:number):FishForm=>({body,snout,tail,color,accent,mark,dorsal,ventral,speed,zone,school,adultCm,maturityDays,hungerPerDay});
export const FISH_FORMS:Record<string,FishForm>={
  neon:fish([.12,.068],.78,'fork','#a5bbb5','#20cddd','neon',.10,.06,.38,'middle',true,3.5,60,23),
  cardinal:fish([.11,.057],.82,'fork','#9dbeb5','#14d5df','cardinal',.085,.055,.36,'middle',true,4.5,65,24),
  ember:fish([.155,.074],.63,'round','#df9a4e','#edba63','ember',.13,.085,.27,'middle',true,2.2,45,21),
  rummy:fish([.105,.059],.94,'fork','#b4c1b3','#cb4d3e','rummy',.095,.055,.43,'middle',true,4.5,65,24),
  harlequin:fish([.19,.076],.62,'fork','#c29b81','#342f33','harlequin',.15,.08,.34,'middle',true,4.5,70,23),
  chili:fish([.074,.039],.88,'fork','#b94235','#252d30','chili',.07,.04,.24,'upper',true,2,45,19),
  guppy:fish([.135,.073],.6,'fan','#a9a6a0','#de9b52','guppy',.21,.10,.26,'upper',false,5,75,26),
  betta:fish([.185,.087],.54,'veil','#477d98','#b74758','betta',.27,.22,.16,'upper',false,6,90,24),
  cory:fish([.18,.105],.42,'paddle','#b4a988','#453d36','cory',.17,.055,.19,'bottom',true,6,100,23),
  oto:fish([.095,.077],.48,'fork','#b6b29a','#4a4a37','oto',.095,.045,.17,'bottom',false,4,90,19),
  shrimp:fish([.09,.055],.7,'paddle','#b84d3c','#e19977','shrimp',0,0,.07,'bottom',false,2.5,75,15),
};
