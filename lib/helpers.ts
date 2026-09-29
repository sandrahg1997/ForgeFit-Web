import { LoadType, MuscleGroup, Routine, Workout, WorkoutExercise, WorkoutSet } from "./types";
export const repsTemplate=[12,10,8,6];
export const groupColor:Record<string,string>={Pecho:"#3b82f6",Espalda:"#8b5cf6",Pierna:"#22c55e",Hombro:"#f97316",Bíceps:"#ec4899",Tríceps:"#ec4899",Core:"#eab308",Glúteo:"#14b8a6",Otro:"#06b6d4",Mixto:"#06b6d4"};
export function volume(ex:WorkoutExercise){return ex.workout_sets.reduce((a,s)=>a+(s.is_completed?s.weight*s.repetitions:0),0)}
export function oneRM(weight:number,reps:number){return reps>0?weight*(1+reps/30):0}
export function workoutVolume(w:Workout){return w.workout_exercises.reduce((a,e)=>a+volume(e),0)}
export function workoutGroup(w:Workout){ const title=Object.keys(groupColor).find(g=>w.title.toLowerCase().includes(g.toLowerCase())); if(title&&title!=="Otro")return title; const count:Record<string,number>={}; w.workout_exercises.forEach(e=>count[e.muscle_group]=(count[e.muscle_group]||0)+1); const sorted=Object.entries(count).sort((a,b)=>b[1]-a[1]); return sorted.length&&(!sorted[1]||sorted[0][1]>sorted[1][1])?sorted[0][0]:"Mixto"; }
export function lastExerciseUsage(workouts:Workout[],name:string){ for(const w of workouts){ const match=w.workout_exercises.find(e=>e.name===name); if(match)return match; } return null; }
export function streak(workouts:Workout[]){ const weeks=new Set(workouts.filter(w=>w.is_completed).map(w=>{const d=new Date(w.date); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); return d.toISOString().slice(0,10)})); let current=0,d=new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)); while(weeks.has(d.toISOString().slice(0,10))){current++;d.setDate(d.getDate()-7)} return current; }
const key=(s:string)=>s.trim().toLowerCase();
const endOfDay=(day?:string)=>day?new Date(`${day}T23:59:59`).getTime():Infinity;
/** Última sesión de una rutina (anterior o igual a la fecha elegida, sin sesiones vacías):
 *  1) enlazada por routine_id, 2) mismo título y sin enlace a otra rutina, 3) mismo grupo muscular
 *  descartando sesiones de otras rutinas. */
export function lastWorkoutForRoutine(workouts:Workout[],routine:{id:string;name:string;muscle_group:MuscleGroup},routines:{id:string;name:string}[]=[],beforeDate?:string){
  const limit=endOfDay(beforeDate);
  const candidates=workouts.filter(w=>w.workout_exercises.length>0&&new Date(w.date).getTime()<=limit);
  const byId=candidates.find(w=>w.routine_id===routine.id);
  if(byId)return byId;
  const byName=candidates.find(w=>!w.routine_id&&key(w.title)===key(routine.name));
  if(byName)return byName;
  const otherNames=new Set(routines.filter(r=>r.id!==routine.id).map(r=>key(r.name)));
  return candidates.find(w=>!w.routine_id&&!otherNames.has(key(w.title))&&workoutGroup(w)===routine.muscle_group)||null;
}
/** Último uso de un ejercicio en otra sesión, anterior o igual a la fecha indicada. */
export function previousExerciseUsage(workouts:Workout[],name:string,excludeWorkoutId?:string,beforeDate?:string){
  const limit=beforeDate?new Date(beforeDate).getTime():Infinity;
  for(const w of workouts){ if(w.id===excludeWorkoutId||new Date(w.date).getTime()>limit)continue; const match=w.workout_exercises.find(e=>key(e.name)===key(name)&&e.workout_sets.length>0); if(match)return match; }
  return null;
}
type NewSet=Omit<WorkoutSet,"id">;
const copySets=(sets:WorkoutSet[]):NewSet[]=>sets.slice().sort((a,b)=>a.order_index-b.order_index).map((s,order_index)=>({order_index,repetitions:s.repetitions,weight:s.weight,band_name:s.band_name,band_count:s.band_count,is_completed:false}));
/** Construye los ejercicios de una sesión nueva: orden y ejercicios de la rutina, series/pesos del último uso
 *  de cada ejercicio (preferiblemente en la última sesión de la rutina) y, al final, los ejercicios que se
 *  añadieron a mano en esa última sesión. */
export function buildWorkoutExercises(routine:Routine,source:Workout|null,workouts:Workout[],beforeDate?:string){
  const limit=endOfDay(beforeDate);
  const history=workouts.filter(w=>new Date(w.date).getTime()<=limit);
  const sourceByName=new Map((source?.workout_exercises||[]).map(e=>[key(e.name),e] as const));
  const fromRoutine=routine.routine_exercises.slice().sort((a,b)=>a.order_index-b.order_index).map(re=>{
    const ex=re.exercise;
    const prev=sourceByName.get(key(ex.name))||previousExerciseUsage(history,ex.name);
    const workout_sets:NewSet[]=prev&&prev.workout_sets.length?copySets(prev.workout_sets):repsTemplate.map((repetitions,order_index)=>({order_index,repetitions,weight:ex.uses_bands?0:(re.default_weight||0),band_name:re.default_band_name||"",band_count:ex.uses_bands?(re.default_band_count||0):0,is_completed:false}));
    return {name:ex.name,muscle_group:ex.muscle_group,load_type:ex.load_type,note:prev?.note||ex.notes||"",uses_bands:ex.uses_bands,workout_sets};
  });
  const inRoutine=new Set(fromRoutine.map(e=>key(e.name)));
  const extras=(source?.workout_exercises||[]).slice().sort((a,b)=>a.order_index-b.order_index).filter(e=>!inRoutine.has(key(e.name))).map(e=>({name:e.name,muscle_group:e.muscle_group,load_type:e.load_type,note:e.note,uses_bands:e.uses_bands,workout_sets:copySets(e.workout_sets)}));
  return [...fromRoutine,...extras].map((e,order_index)=>({...e,order_index}));
}
/** Sugerencia de progresión si en el último uso se completaron todas las series. */
export type Progression={kind:"weight";delta:number;label:string}|{kind:"bands";delta:number;label:string};
export function suggestProgression(prev:WorkoutExercise|null,current:WorkoutExercise):Progression|null{
  if(!prev||!prev.workout_sets.length||!prev.workout_sets.every(s=>s.is_completed))return null;
  if(current.uses_bands){
    const prevMin=Math.min(...prev.workout_sets.map(s=>s.band_count));
    const curMin=Math.min(...current.workout_sets.map(s=>s.band_count));
    return prevMin>0&&curMin>=prevMin?{kind:"bands",delta:-1,label:`Probar con ${prevMin-1} goma${prevMin-1===1?"":"s"}`}:null;
  }
  const step=weightStep(current.load_type);
  if(!step)return null;
  const prevMax=Math.max(...prev.workout_sets.map(s=>s.weight));
  const curMax=Math.max(...current.workout_sets.map(s=>s.weight));
  if(step<0?curMax<prevMax:curMax>prevMax)return null;
  if(step<0&&prevMax<=0)return null;
  return {kind:"weight",delta:step,label:step<0?`Probar con ${Math.abs(step)} kg menos de asistencia`:`Subir ${step} kg`};
}
function weightStep(load:LoadType){
  if(load.startsWith("Sin peso")||load.includes("tipo de goma"))return 0;
  if(load.includes("kg de asistencia"))return -2.5;
  if(load.startsWith("Mancuernas"))return 1;
  return 2.5;
}
