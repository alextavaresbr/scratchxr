/**
 * ScratchXR — Speech turn boundaries for hands-free conversation.
 * Subsistema: EDU. Depende de: voiceCapture. Usado por: Vitest.
 */
import {describe,it,expect} from 'vitest';
import {SpeechBoundary} from '../voiceCapture';
describe('Voice turn boundaries',()=>{
  it('never sends silence or a short click',()=>{
    const gate=new SpeechBoundary();let sends=0;
    for(let t=50;t<=42000;t+=50)if(gate.sample(t===500?.04:0,t)==='send')sends++;
    expect(sends).toBe(0);
  });
  it('waits through a short pause, then sends one complete turn',()=>{
    const gate=new SpeechBoundary();
    for(let t=50;t<=2000;t+=50)expect(gate.sample(t<=500||t>=900&&t<=1300?.05:0,t)).toBe('wait');
    let sends=0;
    for(let t=2050;t<=4000;t+=50)if(gate.sample(0,t)==='send')sends++;
    expect(sends).toBe(1);
  });
  it('bounds long utterances and discards speech observed before suppression',()=>{
    const gate=new SpeechBoundary();let sends=0;
    for(let t=50;t<=20100;t+=50)if(gate.sample(.05,t)==='send')sends++;
    expect(sends).toBe(1);gate.reset();
    for(let t=20200;t<=24000;t+=50)expect(gate.sample(0,t)).not.toBe('send');
  });
  it('uses elapsed time when 3D rendering delays microphone sampling',()=>{
    const gate=new SpeechBoundary();
    for(const t of [100,300,500,700])expect(gate.sample(.05,t)).toBe('wait');
    expect(gate.sample(0,1400)).toBe('wait');
    expect(gate.sample(0,1700)).toBe('send');
  });
});
