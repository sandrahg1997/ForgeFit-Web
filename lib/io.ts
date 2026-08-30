import * as XLSX from "xlsx";
import type { Exercise, Measurement, Routine, Workout, MuscleGroup, LoadType } from "./types";

const MUSCLES: MuscleGroup[] = ["Pecho", "Espalda", "Pierna", "Hombro", "Bíceps", "Tríceps", "Core", "Glúteo", "Otro"];
const LOADS: LoadType[] = ["Barra · peso total", "Mancuernas · cada una", "Máquina/polea · peso seleccionado", "Dominada asistida · kg de asistencia", "Dominada asistida · tipo de goma", "Sin peso · solo repeticiones"];

const norm = (v: any) => String(v ?? "").trim();
const toNum = (v: any) => { const n = Number(norm(v).replace(",", ".")); return Number.isFinite(n) ? n : 0; };
const toBool = (v: any) => ["sí", "si", "true", "1", "x", "yes"].includes(norm(v).toLowerCase());
const matchMuscle = (v: any): MuscleGroup => MUSCLES.find(m => m.toLowerCase() === norm(v).toLowerCase()) ?? "Otro";
const matchLoad = (v: any): LoadType => LOADS.find(l => l.toLowerCase() === norm(v).toLowerCase()) ?? LOADS[0];
const dayKey = (v: any) => { const d = new Date(v); return Number.isNaN(d.getTime()) ? norm(v).slice(0, 10) : d.toISOString().slice(0, 10); };
const isoDate = (v: any) => { const s = norm(v); if (s.length <= 10) { const d = new Date(`${s}T12:00:00`); return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(); } const d = new Date(s); return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString(); };

/** Genera el libro Excel con todas las hojas (Sesiones, Ejercicios, Medidas, Rutinas). */
export function buildWorkbook({ workouts, exercises, routines, measurements }: { workouts: Workout[]; exercises: Exercise[]; routines: Routine[]; measurements: Measurement[] }) {
    const wb = XLSX.utils.book_new();

    const sesiones = workouts.flatMap(w => w.workout_exercises.flatMap(e => e.workout_sets.map(s => ({
        Fecha: w.date,
        Rutina: w.title,
        Ejercicio: e.name,
        Grupo: e.muscle_group,
        Carga: e.load_type,
        Serie: s.order_index + 1,
        Peso: s.weight,
        Goma: e.uses_bands ? s.band_name : "",
        Gomas: e.uses_bands ? s.band_count : "",
        Repeticiones: s.repetitions,
        Completada: s.is_completed ? "Sí" : "No",
        Notas: e.note,
    }))));

    const ejercicios = exercises.map(e => ({
        Nombre: e.name, Grupo: e.muscle_group, Carga: e.load_type, Gomas: e.uses_bands ? "Sí" : "No", Notas: e.notes ?? "",
    }));

    const medidas = measurements.map(m => ({
        Fecha: m.date, Cintura: m.waist, Pecho: m.chest, "Brazo relajado": m.relaxed_arm, "Brazo flexionado": m.flexed_arm, Muslo: m.thigh, Cadera: m.hips, Notas: m.notes ?? "",
    }));

    const rutinas = routines.flatMap(r => r.routine_exercises.slice().sort((a, b) => a.order_index - b.order_index).map(re => ({
        Rutina: r.name,
        Grupo: r.muscle_group,
        Ejercicio: re.exercise.name,
        Orden: re.order_index + 1,
        "Peso por defecto": re.default_weight,
        "Goma por defecto": re.default_band_name,
        "Nº gomas por defecto": re.default_band_count,
    })));

    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sesiones), "Sesiones");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ejercicios), "Ejercicios");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(medidas), "Medidas");
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rutinas), "Rutinas");
    return wb;
}

export type ParsedRoutine = { name: string; muscle_group: MuscleGroup; exercises: { name: string; order_index: number; default_weight: number; default_band_name: string; default_band_count: number }[] };
export type ParsedWorkout = Omit<Workout, "id" | "workout_exercises"> & {
    workout_exercises: (Omit<Workout["workout_exercises"][number], "id" | "workout_sets"> & {
        workout_sets: Omit<Workout["workout_exercises"][number]["workout_sets"][number], "id">[];
    })[];
};
export type ParsedImport = {
    exercises: Omit<Exercise, "id">[];
    measurements: Omit<Measurement, "id">[];
    workouts: ParsedWorkout[];
    routines: ParsedRoutine[];
};

/** Lee un libro Excel (formato de la exportación) y lo reconstruye a las entidades de la app. */
export function parseWorkbook(buf: ArrayBuffer): ParsedImport {
    const wb = XLSX.read(buf, { type: "array" });
    const rows = (name: string): any[] => {
        const ws = wb.Sheets[name];
        return ws ? XLSX.utils.sheet_to_json(ws, { defval: "" }) : [];
    };
    const pick = (row: any, ...keys: string[]) => {
        for (const k of keys) if (k in row && norm(row[k]) !== "") return row[k];
        return "";
    };

    const exercises = rows("Ejercicios").map(r => ({
        name: norm(pick(r, "Nombre", "name", "Ejercicio")),
        muscle_group: matchMuscle(pick(r, "Grupo", "muscle_group")),
        load_type: matchLoad(pick(r, "Carga", "load_type")),
        notes: norm(pick(r, "Notas", "notes")),
        uses_bands: toBool(pick(r, "Gomas", "uses_bands")),
    })).filter(e => e.name);

    const measurements = rows("Medidas").map(r => ({
        date: dayKey(pick(r, "Fecha", "date")),
        waist: toNum(pick(r, "Cintura", "waist")),
        chest: toNum(pick(r, "Pecho", "chest")),
        relaxed_arm: toNum(pick(r, "Brazo relajado", "relaxed_arm")),
        flexed_arm: toNum(pick(r, "Brazo flexionado", "flexed_arm")),
        thigh: toNum(pick(r, "Muslo", "thigh")),
        hips: toNum(pick(r, "Cadera", "hips")),
        notes: norm(pick(r, "Notas", "notes")),
    })).filter(m => m.date);

    const wMap = new Map<string, { date: any; title: string; order: any[]; byName: Map<string, any> }>();
    for (const r of rows("Sesiones")) {
        const fecha = pick(r, "Fecha", "date");
        const title = norm(pick(r, "Rutina", "title")) || "Entreno";
        const key = `${dayKey(fecha)}||${title.toLowerCase()}`;
        let w = wMap.get(key);
        if (!w) { w = { date: fecha, title, order: [], byName: new Map() }; wMap.set(key, w); }
        const exName = norm(pick(r, "Ejercicio", "name"));
        if (!exName) continue;
        let ex = w.byName.get(exName.toLowerCase());
        if (!ex) {
            const carga = norm(pick(r, "Carga", "load_type"));
            ex = {
                name: exName,
                muscle_group: matchMuscle(pick(r, "Grupo", "muscle_group")),
                load_type: matchLoad(carga),
                note: norm(pick(r, "Notas", "note")),
                uses_bands: norm(pick(r, "Gomas", "band_count")) !== "" || carga.toLowerCase().includes("goma"),
                sets: [] as any[],
            };
            w.byName.set(exName.toLowerCase(), ex);
            w.order.push(ex);
        }
        const serie = toNum(pick(r, "Serie", "order_index"));
        ex.sets.push({
            order_index: serie > 0 ? serie - 1 : ex.sets.length,
            repetitions: Math.round(toNum(pick(r, "Repeticiones", "repetitions"))),
            weight: toNum(pick(r, "Peso", "weight")),
            band_name: norm(pick(r, "Goma", "band_name")),
            band_count: toNum(pick(r, "Gomas", "band_count")),
            is_completed: toBool(pick(r, "Completada", "is_completed")),
        });
    }
    const workouts: ParsedWorkout[] = [...wMap.values()].map(w => {
        const workout_exercises = w.order.map((ex, i) => ({
            name: ex.name,
            muscle_group: ex.muscle_group,
            load_type: ex.load_type,
            order_index: i,
            note: ex.note,
            uses_bands: ex.uses_bands,
            workout_sets: ex.sets.slice().sort((a: any, b: any) => a.order_index - b.order_index).map((s: any, j: number) => ({ ...s, order_index: j })),
        }));
        const allSets = workout_exercises.flatMap(e => e.workout_sets);
        return {
            date: isoDate(w.date),
            title: w.title,
            notes: "",
            is_completed: allSets.length > 0 && allSets.every(s => s.is_completed),
            workout_exercises,
        };
    });

    const rMap = new Map<string, ParsedRoutine>();
    for (const r of rows("Rutinas")) {
        const name = norm(pick(r, "Rutina", "name"));
        if (!name) continue;
        let rt = rMap.get(name.toLowerCase());
        if (!rt) { rt = { name, muscle_group: matchMuscle(pick(r, "Grupo", "muscle_group")), exercises: [] }; rMap.set(name.toLowerCase(), rt); }
        const one = norm(pick(r, "Ejercicio", "exercise"));
        const list = norm(pick(r, "Ejercicios"));
        if (one) {
            const orden = toNum(pick(r, "Orden"));
            rt.exercises.push({
                name: one,
                order_index: orden > 0 ? orden - 1 : rt.exercises.length,
                default_weight: toNum(pick(r, "Peso por defecto", "default_weight")),
                default_band_name: norm(pick(r, "Goma por defecto", "default_band_name")),
                default_band_count: toNum(pick(r, "Nº gomas por defecto", "default_band_count")),
            });
        } else if (list) {
            for (const n of list.split(",").map(s => s.trim()).filter(Boolean)) {
                rt.exercises.push({ name: n, order_index: rt.exercises.length, default_weight: 0, default_band_name: "", default_band_count: 0 });
            }
        }
    }

    return { exercises, measurements, workouts, routines: [...rMap.values()] };
}
