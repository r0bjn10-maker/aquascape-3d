import type { World,BioSnapshot,Activity,ProgressReport } from '../types';
export function biologicalSnapshot(w:World):BioSnapshot{
  const plants=w.objects.filter(o=>o.bio),animals=w.animals,mean=(values:number[])=>values.length?values.reduce((a,b)=>a+b,0)/values.length:0;
  return {plantBiomass:plants.reduce((n,p)=>n+p.biomass,0),carpetCoverage:Math.min(100,plants.filter(p=>p.asset==='monte').reduce((n,p)=>n+Math.PI*(p.bio!.spread**2)*p.bio!.density,0)/18*100),meanPlantHeight:mean(plants.map(p=>p.bio!.height*10)),plantHealth:mean(plants.map(p=>p.health)),animalLength:mean(animals.map(f=>f.life.lengthCm)),animalAgeDays:mean(animals.map(f=>f.life.ageSeconds/86400)),animalHealth:mean(animals.map(f=>f.health)),livingAnimals:animals.filter(f=>f.life.alive).length,algae:w.water.algae,clarity:w.water.clarity,waste:w.water.waste};
}
export function progressReport(before:World,after:World,elapsedSeconds:number,activity:Activity,steps:number):ProgressReport{
  const tips:string[]=[];
  if(after.water.waste>45)tips.push('Thay một phần nước và kiểm tra lọc.');
  if(after.equipment.feeder&&after.automation.feeder.stock<5)tips.push('Bổ sung kho thức ăn cho máy tự động.');
  if(after.animals.some(f=>f.life.alive&&f.hunger>60))tips.push('Cho ăn vừa đủ; theo dõi lượng thức ăn còn lại.');
  if(after.water.algae>35)tips.push('Giảm giờ chiếu sáng nếu rêu đang tăng.');
  if(after.water.oxygen<45)tips.push('Bật sủi khí và kiểm tra CO₂.');
  if(after.objects.some(p=>p.bio?.alive&&p.health<55))tips.push('Kiểm tra dinh dưỡng, nhiệt độ và nhu cầu của cây.');
  return {elapsedSeconds,before:biologicalSnapshot(before),after:biologicalSnapshot(after),activity,steps,recommendations:tips.slice(0,3)};
}
