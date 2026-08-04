export type MuscleGroup = "Pecho"|"Espalda"|"Pierna"|"Hombro"|"Bíceps"|"Tríceps"|"Core"|"Glúteo"|"Otro";
export type LoadType = "Barra · peso total"|"Mancuernas · cada una"|"Máquina/polea · peso seleccionado"|"Dominada asistida · kg de asistencia"|"Dominada asistida · tipo de goma"|"Sin peso · solo repeticiones";
export interface Exercise {id:string;name:string;muscle_group:MuscleGroup;load_type:LoadType;notes:string;uses_bands:boolean;created_at?:string}
export interface RoutineExercise {id:string;order_index:number;default_weight:number;default_band_name:string;default_band_count:number;exercise:Exercise}
export interface Routine {id:string;name:string;muscle_group:MuscleGroup;routine_exercises:RoutineExercise[]}
export interface WorkoutSet {id:string;order_index:number;repetitions:number;weight:number;band_name:string;band_count:number;is_completed:boolean}
export interface WorkoutExercise {id:string;name:string;muscle_group:MuscleGroup;load_type:LoadType;order_index:number;note:string;uses_bands:boolean;workout_sets:WorkoutSet[]}
export interface Workout {id:string;date:string;title:string;notes:string;is_completed:boolean;workout_exercises:WorkoutExercise[]}
export interface Measurement {id:string;date:string;waist:number;chest:number;relaxed_arm:number;flexed_arm:number;thigh:number;hips:number;notes:string}
