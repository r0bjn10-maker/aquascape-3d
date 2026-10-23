import type { Automation } from '../game/types';
export function defaultAutomation():Automation{return {
  light:{automatic:true,startMinute:60,durationMinutes:480},co2:{automatic:true,startMinute:0,durationMinutes:540,rate:50},
  filterEfficiency:.85,heaterTarget:24,heaterEfficiency:.8,creativeProtection:true,
  feeder:{times:[60,660],amount:1,stock:240,capacity:300,lastFeedUtc:0},
};}
