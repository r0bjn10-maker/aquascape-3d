import type { Animal } from '../types';
type Pose=Pick<Animal,'x'|'y'|'z'|'vx'|'vy'|'vz'>;
const poses=new Map<string,Pose>();
export function recordPose(f:Animal){poses.set(f.id,{x:f.x,y:f.y,z:f.z,vx:f.vx,vy:f.vy,vz:f.vz});if(poses.size>240){const first=poses.keys().next().value;if(first)poses.delete(first);}}
export function withVisualPose(f:Animal):Animal{return {...f,...poses.get(f.id)};}
