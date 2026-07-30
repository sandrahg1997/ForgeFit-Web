import { Workout, WorkoutExercise } from "./types";
export const repsTemplate=[12,10,8,6];
export const groupColor:Record<string,string>={Pecho:"#3b82f6",Espalda:"#8b5cf6",Pierna:"#22c55e",Hombro:"#f97316",Bíceps:"#ec4899",Tríceps:"#ec4899",Core:"#eab308",Glúteo:"#14b8a6",Otro:"#06b6d4",Mixto:"#06b6d4"};
export function volume(ex:WorkoutExercise){return ex.workout_sets.reduce((a,s)=>a+(s.is_completed?s.weight*s.repetitions:0),0)}
export function oneRM(weight:number,reps:number){return reps>0?weight*(1+reps/30):0}
export function workoutVolume(w:Workout){return w.workout_exercises.reduce((a,e)=>a+volume(e),0)}
export function workoutGroup(w:Workout){ const title=Object.keys(groupColor).find(g=>w.title.toLowerCase().includes(g.toLowerCase())); if(title&&title!=="Otro")return title; const count:Record<string,number>={}; w.workout_exercises.forEach(e=>count[e.muscle_group]=(count[e.muscle_group]||0)+1); const sorted=Object.entries(count).sort((a,b)=>b[1]-a[1]); return sorted.length&&(!sorted[1]||sorted[0][1]>sorted[1][1])?sorted[0][0]:"Mixto"; }
export function streak(workouts:Workout[]){ const weeks=new Set(workouts.filter(w=>w.is_completed).map(w=>{const d=new Date(w.date); const day=(d.getDay()+6)%7; d.setDate(d.getDate()-day); return d.toISOString().slice(0,10)})); let current=0,d=new Date(); d.setDate(d.getDate()-((d.getDay()+6)%7)); while(weeks.has(d.toISOString().slice(0,10))){current++;d.setDate(d.getDate()-7)} return current; }
