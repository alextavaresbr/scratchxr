/**
 * ScratchXR — Safe motion vocabulary, enforced on the server.
 * Subsistema: EDU. Depende de: none. Usado por: server and tests.
 */
export const safeMotions={
  wave:'A person standing upright waves one open hand in a friendly greeting.',
  clap:'A person standing upright gently claps both hands in celebration.',
  dance:'A person performs a cheerful simple dance, with small steps and relaxed arms.',
  walk:'A person walks forward calmly with relaxed arms.',
  run:'A person jogs gently in place.',
  jump:'A person makes one small joyful jump and lands with both feet.',
  turn:'A person slowly turns around once while standing upright.',
  stretch:'A person gently stretches both arms upward, then lowers them.',
  bow:'A person makes a small respectful bow, then stands upright.',
  balance:'A person briefly balances on one foot with arms out to the sides.',
} as const;
export type SafeMotion=keyof typeof safeMotions;
export function normalizeRequest(value:string){
  return value.normalize('NFKD').replace(/[\u0300-\u036f\u200B-\u200D\uFEFF]/g,'')
    .toLowerCase().replace(/[@4]/g,'a').replace(/[03]/g,c=>c==='0'?'o':'e').replace(/[1!]/g,'i')
    .replace(/[_./\\-]/g,' ').replace(/\s+/g,' ').trim();
}
const unsafe=/\b(matar|mate|morte|assassin\w*|soco|socar|bater|agredir|chutar|violenc\w*|arma|tiro|atirar|sangue|suicid\w*|naz\w*|hitler|racis\w*|odio|sex\w*|porn\w*|nude\w*|pelad\w*|estupr\w*|genita\w*|kill\w*|punch\w*|attack\w*|shoot\w*|gun|blood|hate|naked|rape|suicide|terror\w*)\b/i;
/** Conservative lexical signal. The output generator still receives ONLY a fixed safe prompt. */
export function needsRedirect(request:string){
  const value=normalizeRequest(request);
  return unsafe.test(value)||unsafe.test(value.replace(/\b(?:[a-z] ){2,}[a-z]\b/g,letters=>letters.replace(/ /g,'')));
}
export function similarSafeMotion(request:string):SafeMotion{
  const s=normalizeRequest(request);
  if(/soco|punch|bater|hit|arma|shoot|atir/.test(s))return 'clap';
  if(/chut|kick/.test(s))return 'balance';
  if(/danc|danc|sex/.test(s))return 'dance';
  if(/sal|naz|odio|hate/.test(s))return 'wave';
  return 'wave';
}
/** No prompt emitted by an LLM or a user can cross this boundary. */
export function resolveMotion(request:string,classification?:{motion?:unknown;safe?:unknown}){
  const flagged=needsRedirect(request);
  const accepted=!flagged&&classification?.safe===true&&typeof classification.motion==='string'&&
    Object.prototype.hasOwnProperty.call(safeMotions,classification.motion);
  const motion:SafeMotion=accepted?classification!.motion as SafeMotion:similarSafeMotion(request);
  return {motion,prompt:safeMotions[motion],redirected:!accepted};
}
export function validateMotionData(data:{frames:number;fps:number;roots:number[];rotations:number[]}){
  if(!Number.isInteger(data.frames)||data.frames<1||data.frames>150||data.fps!==30)throw new Error('Invalid motion timing');
  if(data.roots.length!==data.frames*3||data.rotations.length!==data.frames*120)throw new Error('Invalid motion dimensions');
  if(data.roots.some(x=>!Number.isFinite(x)||Math.abs(x)>15)||data.rotations.some(x=>!Number.isFinite(x)))throw new Error('Invalid motion values');
  for(let i=0;i<data.rotations.length;i+=4){
    const norm=Math.hypot(...data.rotations.slice(i,i+4));if(norm<.5||norm>1.5)throw new Error('Invalid quaternion');
  }
}
