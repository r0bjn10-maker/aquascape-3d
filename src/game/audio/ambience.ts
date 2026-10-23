// Locally synthesized water/room ambience. No downloaded audio or autoplay.
let context:AudioContext|undefined,gain:GainNode|undefined;
export function setAmbience(enabled:boolean){
  if(!context&&enabled){
    context=new AudioContext();gain=context.createGain();gain.gain.value=0;
    const buffer=context.createBuffer(1,context.sampleRate*4,context.sampleRate),data=buffer.getChannelData(0);let last=0;
    for(let i=0;i<data.length;i++){last=(last+(Math.random()*2-1)*.025)/1.025;data[i]=last*3;}
    const noise=context.createBufferSource();noise.buffer=buffer;noise.loop=true;
    const filter=context.createBiquadFilter();filter.type='lowpass';filter.frequency.value=650;
    noise.connect(filter);filter.connect(gain);gain.connect(context.destination);noise.start();
  }
  if(context&&gain){void context.resume();gain.gain.setTargetAtTime(enabled?.14:0,context.currentTime,.5);}
}
