import { Vector3 } from 'three';
export const placementCursor={point:new Vector3(0,.16,0),active:false};
export function updatePlacementCursor(point:{x:number;y:number;z:number}){placementCursor.point.set(point.x,point.y,point.z);placementCursor.active=true;}
