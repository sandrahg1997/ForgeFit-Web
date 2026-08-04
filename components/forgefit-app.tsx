"use client";
import { useEffect, useMemo, useState } from "react";
import { supabase, hasSupabaseEnv } from "@/lib/supabase";
import type { Exercise, Measurement, Routine, Workout, WorkoutSet, MuscleGroup, LoadType } from "@/lib/types";
import { groupColor, oneRM, repsTemplate, streak, workoutGroup, workoutVolume } from "@/lib/helpers";
import { Activity, CalendarDays, ChartNoAxesCombined, Dumbbell, LogOut, Plus, Search, Settings, Trash2, UserRound, Check, Download } from "lucide-react";
import * as XLSX from "xlsx";
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

type Tab = "inicio" | "entrenos" | "calendario" | "ejercicios" | "progreso" | "medidas" | "ajustes";
const muscles: MuscleGroup[] = ["Pecho", "Espalda", "Pierna", "Hombro", "Bíceps", "Tríceps", "Core", "Glúteo", "Otro"];
const loads: LoadType[] = ["Barra · peso total", "Mancuernas · cada una", "Máquina/polea · peso seleccionado", "Dominada asistida · kg de asistencia", "Dominada asistida · tipo de goma", "Sin peso · solo repeticiones"];
const uid = () => crypto.randomUUID(); const today = () => new Date().toISOString().slice(0, 10);
const selectAll = (e: React.FocusEvent<HTMLInputElement>) => requestAnimationFrame(() => e.currentTarget.select());
const selectAllOnClick = (e: React.MouseEvent<HTMLInputElement>) => { e.preventDefault(); e.currentTarget.select(); };
function Spinner({ size = 16 }: { size?: number }) { return <span className="spinner" style={{ width: size, height: size }} />; }

function demoData() {
    const ex = (name: string, muscle_group: MuscleGroup, load_type: LoadType, notes = "", uses_bands = false): Exercise => ({ id: uid(), name, muscle_group, load_type, notes, uses_bands });
    const es = [ex("Press libre", "Pecho", loads[0]), ex("Press inclinado con mancuernas", "Pecho", loads[1]), ex("Poleas de pecho", "Pecho", loads[2]), ex("Tríceps con barra", "Tríceps", loads[2]), ex("Jalón al pecho", "Espalda", loads[2]), ex("Dominada asistida", "Espalda", loads[4], "", true), ex("Pullover", "Espalda", loads[2]), ex("Sentadilla", "Pierna", loads[0]), ex("Zancada", "Pierna", loads[1]), ex("Glúteo", "Glúteo", loads[2]), ex("Sentadilla Smith", "Pierna", loads[0])];
    const routine = (name: string, muscle_group: MuscleGroup, names: string[]): Routine => ({ id: uid(), name, muscle_group, routine_exercises: names.map((n, i) => ({ id: uid(), order_index: i, default_weight: i ? 0 : 5, default_band_name: n.includes("Dominada") ? "Dos gomas" : "", default_band_count: n.includes("Dominada") ? 2 : 0, exercise: es.find(e => e.name === n)! })) });
    return { exercises: es, routines: [routine("Pecho", "Pecho", ["Press libre", "Press inclinado con mancuernas", "Poleas de pecho", "Tríceps con barra"]), routine("Espalda", "Espalda", ["Jalón al pecho", "Dominada asistida", "Pullover"]), routine("Pierna", "Pierna", ["Sentadilla", "Zancada", "Glúteo", "Sentadilla Smith"])], workouts: [] as Workout[], measurements: [] as Measurement[] };
}

export default function ForgeFitApp() {
    const [session, setSession] = useState<any>(null), [loading, setLoading] = useState(true), [email, setEmail] = useState(""), [password, setPassword] = useState(""), [authMsg, setAuthMsg] = useState(""), [authBusy, setAuthBusy] = useState<"login" | "signup" | null>(null);
    useEffect(() => { if (!supabase) { setLoading(false); return } supabase.auth.getSession().then(({ data }) => { setSession(data.session); setLoading(false) }); const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s)); return () => data.subscription.unsubscribe() }, []);
    async function auth(mode: "login" | "signup") { if (!supabase) return; setAuthMsg(""); setAuthBusy(mode); const result = mode === "login" ? await supabase.auth.signInWithPassword({ email, password }) : await supabase.auth.signUp({ email, password }); setAuthBusy(null); const message = result.error?.message || ""; if (message && /secret API key|service role|service_role/i.test(message)) { setAuthMsg("Estás usando una clave secreta de Supabase. En la app web debes usar la clave pública/anónima (publishable) en NEXT_PUBLIC_SUPABASE_ANON_KEY, no la service_role."); return; } setAuthMsg(message || (mode === "signup" ? "Cuenta creada. Revisa tu correo si la confirmación está activa." : "")) }
    if (loading) return <div className="auth"><div className="card row" style={{ justifyContent: "center" }}><Spinner size={20} /> Cargando ForgeFit…</div></div>;
    if (hasSupabaseEnv && !session) return <div className="auth"><div className="card stack"><div className="brand"><div className="logo">🏋️</div><div><h1>ForgeFit</h1><span className="muted">Tu progreso, sin ruido.</span></div></div><div><label className="label">Correo</label><input className="field" value={email} onChange={e => setEmail(e.target.value)} type="email" /></div><div><label className="label">Contraseña</label><input className="field" value={password} onChange={e => setPassword(e.target.value)} type="password" /></div>{authMsg && <div className="muted">{authMsg}</div>}<button className="button" disabled={!!authBusy} onClick={() => auth("login")}>{authBusy === "login" ? <Spinner size={16} /> : "Entrar"}</button><button className="button secondary" disabled={!!authBusy} onClick={() => auth("signup")}>{authBusy === "signup" ? <Spinner size={16} /> : "Crear cuenta"}</button></div></div>;
    return <Main session={session} />;
}

function Main({ session }: { session: any }) {
    const initial = useMemo(() => demoData(), []); const [tab, setTab] = useState<Tab>("inicio"), [exercises, setExercises] = useState<Exercise[]>(initial.exercises), [routines, setRoutines] = useState<Routine[]>(initial.routines), [workouts, setWorkouts] = useState<Workout[]>(initial.workouts), [measurements, setMeasurements] = useState<Measurement[]>(initial.measurements), [busy, setBusy] = useState(false), [toast, setToast] = useState("");
    const [openWorkout, setOpenWorkout] = useState<string | null>(null), [modal, setModal] = useState<"workout" | "exercise" | "measurement" | null>(null);
    const [editExercise, setEditExercise] = useState<Exercise | null>(null);
    useEffect(() => { if (session) loadAll() }, [session]);
    async function loadAll() { if (!supabase) return; setBusy(true); await ensureSeed(); const [e, r, w, m] = await Promise.all([supabase.from("exercises").select("*").order("name"), supabase.from("routines").select("*,routine_exercises(*,exercise:exercises(*))").order("created_at"), supabase.from("workouts").select("*,workout_exercises(*,workout_sets(*))").order("date", { ascending: false }), supabase.from("body_measurements").select("*").order("date", { ascending: true })]); if (e.data) setExercises(e.data as Exercise[]); if (r.data) setRoutines(r.data as any); if (w.data) setWorkouts((w.data as any).map((x: Workout) => ({ ...x, workout_exercises: x.workout_exercises.sort((a, b) => a.order_index - b.order_index).map(y => ({ ...y, workout_sets: y.workout_sets.sort((a, b) => a.order_index - b.order_index) })) }))); if (m.data) setMeasurements(m.data as Measurement[]); setBusy(false) }
    async function ensureSeed() { if (!supabase || !session) return; const { count } = await supabase.from("exercises").select("*", { count: "exact", head: true }); if (!count) await supabase.rpc("seed_forgefit_for_user") }
    function flash(x: string) { setToast(x); setTimeout(() => setToast(""), 2400) }
    async function persistSet(workoutId: string, exId: string, setId: string, patch: Partial<WorkoutSet>) {
        let isRecord = false, recordMsg = "🏆 ¡Nuevo récord personal!";
        setWorkouts(prev => prev.map(w => {
            if (w.id !== workoutId) return w;
            return {
                ...w, workout_exercises: w.workout_exercises.map(e => {
                    if (e.id !== exId) return e;
                    return {
                        ...e, workout_sets: e.workout_sets.map(s => {
                            if (s.id !== setId) return s;
                            const next = { ...s, ...patch };
                            if (patch.is_completed) {
                                if (e.uses_bands) {
                                    const priorCounts = prev.flatMap(wo => wo.workout_exercises.filter(x => x.name === e.name).flatMap(x => x.workout_sets.filter(z => z.is_completed && z.id !== setId).map(z => z.band_count)));
                                    const oldMin = priorCounts.length ? Math.min(...priorCounts) : Infinity;
                                    isRecord = next.band_count < oldMin;
                                    recordMsg = "🏆 ¡Nuevo récord! Cada vez necesitas menos ayuda 💪";
                                } else if (next.weight > 0) {
                                    const oldMax = Math.max(0, ...prev.flatMap(wo => wo.workout_exercises.filter(x => x.name === e.name).flatMap(x => x.workout_sets.filter(z => z.is_completed && z.id !== setId).map(z => z.weight))));
                                    isRecord = next.weight > oldMax;
                                    recordMsg = "🏆 ¡Nuevo récord personal!";
                                }
                            }
                            return next;
                        })
                    };
                })
            };
        }));
        if (supabase && session) await supabase.from("workout_sets").update(patch).eq("id", setId);
        if (isRecord) flash(recordMsg);
    }
    async function removeSet(workoutId: string, exerciseId: string, setId: string) {
        if (!confirm("¿Eliminar esta serie?")) return;
        setBusy(true);
        setWorkouts(prev => prev.map(w => w.id !== workoutId ? w : {
            ...w,
            workout_exercises: w.workout_exercises.map(e => e.id !== exerciseId ? e : {
                ...e,
                workout_sets: e.workout_sets.filter(s => s.id !== setId),
            }),
        }));
        try {
            if (supabase && session) {
                const { error } = await supabase.from("workout_sets").delete().eq("id", setId);
                if (error) {
                    flash(`No se pudo eliminar la serie: ${error.message}`);
                    await loadAll();
                    return;
                }
            }
            flash("Serie eliminada");
        } finally { setBusy(false) }
    }
    async function addWorkout(r: Routine, selectedDate: string) { setBusy(true); const id = uid(); const workoutDate = new Date(`${selectedDate}T12:00:00`).toISOString(); const workout: Workout = { id, date: workoutDate, title: r.name, notes: "", is_completed: false, workout_exercises: r.routine_exercises.sort((a, b) => a.order_index - b.order_index).map((re, i) => ({ id: uid(), name: re.exercise.name, muscle_group: re.exercise.muscle_group, load_type: re.exercise.load_type, order_index: i, note: re.exercise.notes || "", uses_bands: re.exercise.uses_bands, workout_sets: repsTemplate.map((reps, j) => ({ id: uid(), order_index: j, repetitions: reps, weight: re.exercise.uses_bands ? 0 : (re.default_weight || 0), band_name: re.default_band_name || "", band_count: re.exercise.uses_bands ? (re.default_band_count || 0) : 0, is_completed: false })) })) }; setWorkouts(p => [workout, ...p].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())); setOpenWorkout(id); setTab("entrenos"); setModal(null); try { if (supabase && session) { await supabase.from("workouts").insert({ id, title: workout.title, date: workout.date, notes: "", is_completed: false, user_id: session.user.id }); for (const e of workout.workout_exercises) { await supabase.from("workout_exercises").insert({ id: e.id, workout_id: id, user_id: session.user.id, name: e.name, muscle_group: e.muscle_group, load_type: e.load_type, order_index: e.order_index, note: e.note, uses_bands: e.uses_bands }); await supabase.from("workout_sets").insert(e.workout_sets.map(s => ({ ...s, workout_exercise_id: e.id, user_id: session.user.id }))) } } } finally { setBusy(false) } }
    async function completeWorkout(id: string) { setBusy(true); setWorkouts(p => p.map(w => w.id === id ? { ...w, is_completed: true } : w)); try { if (supabase && session) await supabase.from("workouts").update({ is_completed: true }).eq("id", id); flash("Entrenamiento completado ✨") } finally { setBusy(false) } }
    async function deleteWorkout(id: string) { if (!confirm("¿Eliminar este entrenamiento?")) return; setBusy(true); setWorkouts(p => p.filter(w => w.id !== id)); setOpenWorkout(null); try { if (supabase && session) await supabase.from("workouts").delete().eq("id", id) } finally { setBusy(false) } }
    async function addExerciseToWorkout(workoutId: string, exercise: Exercise) {
        const workout = workouts.find(w => w.id === workoutId);
        if (!workout) return;

        setBusy(true);
        try {

        const workoutExercise = {
            id: uid(),
            name: exercise.name,
            muscle_group: exercise.muscle_group,
            load_type: exercise.load_type,
            order_index: workout.workout_exercises.length,
            note: exercise.notes || "",
            uses_bands: exercise.uses_bands,
            workout_sets: repsTemplate.map((repetitions, order_index) => ({
                id: uid(),
                order_index,
                repetitions,
                weight: 0,
                band_name: "",
                band_count: 0,
                is_completed: false,
            })),
        };

        setWorkouts(previous => previous.map(currentWorkout => currentWorkout.id === workoutId ? {
            ...currentWorkout,
            workout_exercises: [...currentWorkout.workout_exercises, workoutExercise],
        } : currentWorkout));

        if (supabase && session) {
            const { error: exerciseError } = await supabase.from("workout_exercises").insert({
                id: workoutExercise.id,
                workout_id: workoutId,
                user_id: session.user.id,
                name: workoutExercise.name,
                muscle_group: workoutExercise.muscle_group,
                load_type: workoutExercise.load_type,
                order_index: workoutExercise.order_index,
                note: workoutExercise.note,
                uses_bands: workoutExercise.uses_bands,
            });

            if (exerciseError) {
                flash(`No se pudo añadir el ejercicio: ${exerciseError.message}`);
                await loadAll();
                return;
            }

            const { error: setsError } = await supabase.from("workout_sets").insert(
                workoutExercise.workout_sets.map(set => ({
                    ...set,
                    workout_exercise_id: workoutExercise.id,
                    user_id: session.user.id,
                }))
            );

            if (setsError) {
                flash(`No se pudieron crear las series: ${setsError.message}`);
                await loadAll();
                return;
            }
        }

        flash("Ejercicio añadido a la sesión");
        } finally { setBusy(false) }
    }

    async function removeExerciseFromWorkout(workoutId: string, workoutExerciseId: string) {
        if (!confirm("¿Eliminar este ejercicio de la sesión? También se eliminarán sus series.")) return;

        setBusy(true);
        try {

        setWorkouts(previous => previous.map(workout => workout.id === workoutId ? {
            ...workout,
            workout_exercises: workout.workout_exercises.filter(exercise => exercise.id !== workoutExerciseId),
        } : workout));

        if (supabase && session) {
            const { error: setsError } = await supabase.from("workout_sets").delete().eq("workout_exercise_id", workoutExerciseId);
            if (setsError) {
                flash(`No se pudieron eliminar las series: ${setsError.message}`);
                await loadAll();
                return;
            }

            const { error: exerciseError } = await supabase.from("workout_exercises").delete().eq("id", workoutExerciseId);
            if (exerciseError) {
                flash(`No se pudo eliminar el ejercicio: ${exerciseError.message}`);
                await loadAll();
                return;
            }
        }

        flash("Ejercicio eliminado de la sesión");
        } finally { setBusy(false) }
    }

    async function updateWorkoutExercise(
        workoutId: string,
        workoutExerciseId: string,
        patch: { name?: string; muscle_group?: MuscleGroup; load_type?: LoadType; note?: string }
    ) {
        setBusy(true);
        try {

        setWorkouts(previous => previous.map(workout => workout.id === workoutId ? {
            ...workout,
            workout_exercises: workout.workout_exercises.map(exercise => exercise.id === workoutExerciseId ? {
                ...exercise,
                ...patch,
            } : exercise),
        } : workout));

        if (supabase && session) {
            const { error } = await supabase.from("workout_exercises").update(patch).eq("id", workoutExerciseId);
            if (error) {
                flash(`No se pudo actualizar el ejercicio: ${error.message}`);
                await loadAll();
                return;
            }
        }

        flash("Ejercicio actualizado");
        } finally { setBusy(false) }
    }
    async function addExercise(data: Omit<Exercise, "id">) { const x = { ...data, id: uid() }; setBusy(true); setExercises(p => [...p, x].sort((a, b) => a.name.localeCompare(b.name))); try { if (supabase && session) await supabase.from("exercises").insert({ ...x, user_id: session.user.id }); setModal(null) } finally { setBusy(false) } }
    async function updateExercise(id: string, patch: Omit<Exercise, "id">) {
        setBusy(true);
        setExercises(prev => prev.map(x => x.id === id ? { ...x, ...patch } : x).sort((a, b) => a.name.localeCompare(b.name)));
        try {
            if (supabase && session) {
                const { error } = await supabase.from("exercises").update(patch).eq("id", id);
                if (error) {
                    flash(`No se pudo actualizar el ejercicio: ${error.message}`);
                    await loadAll();
                    return;
                }
            }
            setEditExercise(null);
            flash("Ejercicio actualizado");
        } finally { setBusy(false) }
    }
    async function addMeasurement(data: Omit<Measurement, "id">) { const x = { ...data, id: uid() }; setBusy(true); setMeasurements(p => [...p, x].sort((a, b) => a.date.localeCompare(b.date))); try { if (supabase && session) await supabase.from("body_measurements").insert({ ...x, user_id: session.user.id }); setModal(null) } finally { setBusy(false) } }
    const nav: [Tab, string, any][] = [["inicio", "Inicio", Activity], ["entrenos", "Entrenos", Dumbbell], ["calendario", "Calendario", CalendarDays], ["ejercicios", "Ejercicios", Search], ["progreso", "Progreso", ChartNoAxesCombined], ["medidas", "Medidas", UserRound], ["ajustes", "Ajustes", Settings]];
    return <div className="shell">{toast && <div className="toast">{toast}</div>}<header className="topbar"><div className="brand"><div className="logo">🏋️</div><div><h1>ForgeFit</h1><span className="muted">{session?.user?.email || "Modo demostración local"}</span></div></div>{busy && <span className="muted row" style={{ gap: 8 }}><Spinner size={14} /> Sincronizando…</span>}</header><nav className="nav">{nav.map(([id, label, Icon]) => <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}><Icon size={16} /> <span className="hideMobile">{label}</span></button>)}</nav><main style={{ marginTop: 18 }}>{tab === "inicio" && <Dashboard workouts={workouts} routines={routines} measurements={measurements} onNew={() => setModal("workout")} onOpen={id => { setOpenWorkout(id); setTab("entrenos") }} />}{tab === "entrenos" && <Workouts workouts={workouts} exercises={exercises} active={openWorkout} setActive={setOpenWorkout} onNew={() => setModal("workout")} onSet={persistSet} onRemoveSet={removeSet} onComplete={completeWorkout} onDelete={deleteWorkout} onAddExercise={addExerciseToWorkout} onRemoveExercise={removeExerciseFromWorkout} onUpdateExercise={updateWorkoutExercise} busy={busy} />} {tab === "calendario" && <Calendar workouts={workouts} />} {tab === "ejercicios" && <Exercises exercises={exercises} workouts={workouts} onNew={() => setModal("exercise")} onEdit={setEditExercise} />} {tab === "progreso" && <Progress workouts={workouts} />} {tab === "medidas" && <Measurements data={measurements} onNew={() => setModal("measurement")} />} {tab === "ajustes" && <SettingsView workouts={workouts} exercises={exercises} routines={routines} measurements={measurements} session={session} />}</main>{modal === "workout" && <RoutineModal routines={routines} close={() => setModal(null)} choose={addWorkout} busy={busy} />} {modal === "exercise" && <ExerciseModal close={() => setModal(null)} save={addExercise} busy={busy} />} {modal === "measurement" && <MeasurementModal close={() => setModal(null)} save={addMeasurement} busy={busy} />}{editExercise && <ExerciseModal close={() => setEditExercise(null)} save={data => updateExercise(editExercise.id, data)} busy={busy} initial={editExercise} />}</div>
}

function Dashboard({ workouts, routines, measurements, onNew, onOpen }: { workouts: Workout[]; routines: Routine[]; measurements: Measurement[]; onNew: () => void; onOpen: (id: string) => void }) { const completed = workouts.filter(w => w.is_completed), latest = workouts[0], vol = completed.reduce((a, w) => a + workoutVolume(w), 0); return <div className="stack"><section className="card hero"><div className="row between"><div><div className="muted">Hoy</div><div className="big">¿Qué vamos a forjar?</div><p>Empieza una rutina y ForgeFit preparará 4 series de 12, 10, 8 y 6.</p></div><button className="button" onClick={onNew}><Plus size={17} /> Nueva sesión</button></div></section><div className="grid grid3"><Stat title="Racha semanal" value={`${streak(workouts)} semanas`} icon="🔥" /><Stat title="Entrenamientos" value={String(completed.length)} icon="✅" /><Stat title="Volumen acumulado" value={`${Math.round(vol).toLocaleString("es-ES")} kg`} icon="📈" /></div><div className="grid grid2"><section className="card"><h2>Rutinas</h2><div className="stack">{routines.map(r => <div className="row between" key={r.id}><div className="row"><span className="dot" style={{ background: groupColor[r.muscle_group] }} /><div><b>{r.name}</b><div className="muted">{r.routine_exercises.length} ejercicios</div></div></div><button className="button small" onClick={onNew}>Empezar</button></div>)}</div></section><section className="card"><h2>Última actividad</h2>{latest ? <div className="workout" onClick={() => onOpen(latest.id)}><h3>{latest.title}</h3><div className="muted">{new Date(latest.date).toLocaleDateString("es-ES")} · {latest.workout_exercises.length} ejercicios</div><p>{Math.round(workoutVolume(latest)).toLocaleString("es-ES")} kg de volumen</p></div> : <p className="muted">Tu primer entrenamiento está esperando.</p>}{measurements.length > 0 && <p className="muted">Última cintura: {measurements.at(-1)?.waist || "—"} cm</p>}</section></div></div> }
function Stat({ title, value, icon }: { title: string; value: string; icon: string }) { return <div className="card"><div className="row between"><div><div className="muted">{title}</div><div className="big">{value}</div></div><span style={{ fontSize: 30 }}>{icon}</span></div></div> }

function Workouts({ workouts, exercises, active, setActive, onNew, onSet, onRemoveSet, onComplete, onDelete, onAddExercise, onRemoveExercise, onUpdateExercise, busy }: {
    workouts: Workout[];
    exercises: Exercise[];
    active: string | null;
    setActive: (x: string | null) => void;
    onNew: () => void;
    onSet: any;
    onRemoveSet: (workoutId: string, exerciseId: string, setId: string) => void;
    onComplete: (id: string) => void;
    onDelete: (id: string) => void;
    onAddExercise: (workoutId: string, exercise: Exercise) => void;
    onRemoveExercise: (workoutId: string, workoutExerciseId: string) => void;
    onUpdateExercise: (workoutId: string, workoutExerciseId: string, patch: { name?: string; muscle_group?: MuscleGroup; load_type?: LoadType; note?: string }) => void;
    busy: boolean;
}) {
    const w = workouts.find(x => x.id === active);

    if (w) {
        return <WorkoutDetail
            w={w}
            exercises={exercises}
            back={() => setActive(null)}
            onSet={onSet}
            onRemoveSet={(exerciseId, setId) => onRemoveSet(w.id, exerciseId, setId)}
            complete={() => onComplete(w.id)}
            remove={() => onDelete(w.id)}
            onAddExercise={exercise => onAddExercise(w.id, exercise)}
            onRemoveExercise={exerciseId => onRemoveExercise(w.id, exerciseId)}
            onUpdateExercise={(exerciseId, patch) => onUpdateExercise(w.id, exerciseId, patch)}
            busy={busy}
        />;
    }

    return <div className="stack"><div className="row between"><div><h2>Entrenamientos</h2><div className="muted">Tu historial completo</div></div><button className="button" onClick={onNew}><Plus size={17} /> Nueva sesión</button></div>{workouts.length === 0 ? <div className="card muted">Todavía no hay sesiones.</div> : <div className="grid grid2">{workouts.map(w => <button key={w.id} className="card workout" style={{ textAlign: "left", color: "inherit" }} onClick={() => setActive(w.id)}><div className="row between"><div className="exerciseHeader" style={{ borderColor: groupColor[workoutGroup(w)] }}><h3>{w.title}</h3><div className="muted">{new Date(w.date).toLocaleString("es-ES", { dateStyle: "medium", timeStyle: "short" })}</div></div><span className="badge">{w.is_completed ? "Completado" : "En curso"}</span></div><p>{w.workout_exercises.length} ejercicios · {Math.round(workoutVolume(w)).toLocaleString("es-ES")} kg</p></button>)}</div>}</div>;
}

function WorkoutDetail({
    w,
    exercises,
    back,
    onSet,
    onRemoveSet,
    complete,
    remove,
    onAddExercise,
    onRemoveExercise,
    onUpdateExercise,
    busy,
}: {
    w: Workout;
    exercises: Exercise[];
    back: () => void;
    onSet: any;
    onRemoveSet: (exerciseId: string, setId: string) => void;
    complete: () => void;
    remove: () => void;
    onAddExercise: (exercise: Exercise) => void;
    onRemoveExercise: (exerciseId: string) => void;
    onUpdateExercise: (exerciseId: string, patch: { name?: string; muscle_group?: MuscleGroup; load_type?: LoadType; note?: string }) => void;
    busy: boolean;
}) {
    const [showExerciseSelector, setShowExerciseSelector] = useState(false);
    const [editingExerciseId, setEditingExerciseId] = useState<string | null>(null);
    const editingExercise = w.workout_exercises.find(exercise => exercise.id === editingExerciseId) || null;
    const done = w.workout_exercises.flatMap(e => e.workout_sets).filter(s => s.is_completed).length;
    const total = w.workout_exercises.flatMap(e => e.workout_sets).length;

    return (
        <div className="stack">
            <div className="row between">
                <button className="button secondary" onClick={back}>← Volver</button>
                <div className="row">
                    {!w.is_completed && <button className="button secondary small" disabled={busy} onClick={() => setShowExerciseSelector(true)}><Plus size={15} />Añadir ejercicio</button>}
                    <button className="button danger small" disabled={busy} onClick={remove}><Trash2 size={15} /></button>
                    {!w.is_completed && <button className="button" disabled={busy} onClick={complete}>{busy ? <Spinner size={16} /> : "Finalizar entrenamiento"}</button>}
                </div>
            </div>

            <div className="card hero">
                <h2>{w.title}</h2>
                <div>{done}/{total} series · {Math.round(workoutVolume(w)).toLocaleString("es-ES")} kg</div>
                <div className="progressBar" style={{ marginTop: 12 }}><span style={{ width: `${total ? (done / total) * 100 : 0}%` }} /></div>
            </div>

            {w.workout_exercises.length === 0 && <div className="card muted">Esta sesión todavía no tiene ejercicios.</div>}

            {w.workout_exercises.map(ex => (
                <div className="card" key={ex.id}>
                    <div className="row between exerciseHeader" style={{ borderColor: groupColor[ex.muscle_group] }}>
                        <div><h3>{ex.name}</h3><div className="muted">{ex.muscle_group} · {ex.load_type}</div></div>
                        <div className="row">
                            {ex.workout_sets.length > 0 && ex.workout_sets.every(s => s.is_completed) && <span className="badge">✓ Hecho</span>}
                            {!w.is_completed && <button className="button secondary small" disabled={busy} onClick={() => setEditingExerciseId(ex.id)}>Editar</button>}
                            {!w.is_completed && <button className="button danger small" aria-label="Eliminar ejercicio" disabled={busy} onClick={() => onRemoveExercise(ex.id)}><Trash2 size={15} /></button>}
                        </div>
                    </div>

                    <textarea className="field" style={{ margin: "12px 0" }} value={ex.note} readOnly placeholder="Notas del ejercicio" />

                    <div className="stack">
                        {ex.workout_sets.map((s, i) => (
                            <div key={s.id} className={`setrow ${s.is_completed ? "done" : ""}`}>
                                <b>{i + 1}</b>
                                {ex.uses_bands ? <div><label className="label">Gomas</label><div className="row" style={{ gap: 6 }}><button type="button" aria-label="Menos gomas" className="button secondary small" disabled={w.is_completed || s.band_count <= 0} onClick={() => onSet(w.id, ex.id, s.id, { band_count: Math.max(0, s.band_count - 1) })}>−</button><b style={{ minWidth: 14, textAlign: "center" }}>{s.band_count}</b><button type="button" aria-label="Más gomas" className="button secondary small" disabled={w.is_completed || s.band_count >= 3} onClick={() => onSet(w.id, ex.id, s.id, { band_count: Math.min(3, s.band_count + 1) })}>+</button></div></div> : <div><label className="label">Peso</label><input className="field" type="number" step="0.5" value={s.weight} disabled={w.is_completed} onFocus={selectAll} onMouseUp={selectAllOnClick} onChange={e => onSet(w.id, ex.id, s.id, { weight: Number(e.target.value) })} /></div>}
                                <div><label className="label">Reps</label><input className="field" type="number" value={s.repetitions} disabled={w.is_completed} onFocus={selectAll} onMouseUp={selectAllOnClick} onChange={e => onSet(w.id, ex.id, s.id, { repetitions: Number(e.target.value) })} /></div>
                                <button aria-label="Completar serie" disabled={w.is_completed} className={`button ${s.is_completed ? "secondary" : ""}`} onClick={() => onSet(w.id, ex.id, s.id, { is_completed: !s.is_completed })}>{s.is_completed ? <Check size={19} /> : "○"}</button>
                                {!w.is_completed && <button aria-label="Eliminar serie" className="button danger" disabled={busy} onClick={() => onRemoveSet(ex.id, s.id)}><Trash2 size={15} /></button>}
                            </div>
                        ))}
                    </div>
                </div>
            ))}

            {showExerciseSelector && <WorkoutExerciseModal exercises={exercises} workout={w} close={() => setShowExerciseSelector(false)} choose={exercise => { onAddExercise(exercise); setShowExerciseSelector(false); }} />}
            {editingExercise && <EditWorkoutExerciseModal exercise={editingExercise} close={() => setEditingExerciseId(null)} save={patch => { onUpdateExercise(editingExercise.id, patch); setEditingExerciseId(null); }} />}
        </div>
    );
}

function Calendar({ workouts }: { workouts: Workout[] }) { const [cursor, setCursor] = useState(new Date()); const y = cursor.getFullYear(), m = cursor.getMonth(), first = new Date(y, m, 1), offset = (first.getDay() + 6) % 7, days = new Date(y, m + 1, 0).getDate(); return <div className="card"><div className="row between"><button className="button secondary" onClick={() => setCursor(new Date(y, m - 1, 1))}>←</button><h2>{cursor.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}</h2><button className="button secondary" onClick={() => setCursor(new Date(y, m + 1, 1))}>→</button></div><div className="calendar">{["L", "M", "X", "J", "V", "S", "D"].map(x => <b className="muted" key={x}>{x}</b>)}{Array.from({ length: offset }).map((_, i) => <div key={`e${i}`} />)}{Array.from({ length: days }, (_, i) => i + 1).map(d => { const ws = workouts.filter(w => { const x = new Date(w.date); return x.getFullYear() === y && x.getMonth() === m && x.getDate() === d }); return <div className="day" key={d}><b>{d}</b>{ws.map(w => <div key={w.id} title={w.title} style={{ marginTop: 5 }}><span className="dot" style={{ background: groupColor[workoutGroup(w)] }} />{w.title}</div>)}</div> })}</div></div> }

function Exercises({ exercises, workouts, onNew, onEdit }: { exercises: Exercise[]; workouts: Workout[]; onNew: () => void; onEdit: (exercise: Exercise) => void }) { const [q, setQ] = useState(""); const filtered = exercises.filter(e => (e.name + e.muscle_group).toLowerCase().includes(q.toLowerCase())); return <div className="stack"><div className="row between"><h2>Biblioteca de ejercicios</h2><button className="button" onClick={onNew}><Plus size={16} /> Añadir</button></div><div className="row"><Search size={18} /><input className="field" placeholder="Buscar ejercicio…" value={q} onChange={e => setQ(e.target.value)} /></div><div className="grid grid2">{filtered.map(e => { const sets = workouts.flatMap(w => w.workout_exercises.filter(x => x.name === e.name).flatMap(x => x.workout_sets.filter(s => s.is_completed))); const max = Math.max(0, ...sets.map(s => s.weight)); const minBands = e.uses_bands && sets.length ? Math.min(...sets.map(s => s.band_count)) : null; const orm = Math.max(0, ...sets.map(s => oneRM(s.weight, s.repetitions))); return <div className="card" key={e.id}><div className="row between"><div className="exerciseHeader" style={{ borderColor: groupColor[e.muscle_group] }}><h3>{e.name}</h3><span className="muted">{e.muscle_group}</span></div><div className="row"><span className="badge">{e.uses_bands ? (minBands !== null ? `${minBands} goma${minBands === 1 ? "" : "s"} (mejor)` : "Sin marca") : (max ? `${max} kg` : "Sin marca")}</span><button className="button secondary small" onClick={() => onEdit(e)}>Editar</button></div></div>{e.notes && <p>{e.notes}</p>}<div className="muted">{e.uses_bands ? "Progreso: menos gomas = más fuerza" : `1RM estimado: ${orm ? `${orm.toFixed(1)} kg` : "—"}`}</div></div> })}</div></div> }

function Progress({ workouts }: { workouts: Workout[] }) {
    const names = [...new Set(workouts.flatMap(w => w.workout_exercises.map(e => e.name)))];
    const [name, setName] = useState(names[0] || "");
    const usesBands = workouts.some(w => w.workout_exercises.some(e => e.name === name && e.uses_bands));
    const data = workouts.slice().reverse().flatMap(w => w.workout_exercises.filter(e => e.name === name).map(e => {
        const completed = e.workout_sets.filter(s => s.is_completed);
        return { date: new Date(w.date).toLocaleDateString("es-ES"), peso: Math.max(0, ...completed.map(s => s.weight)), gomas: completed.length ? Math.min(...completed.map(s => s.band_count)) : null, volumen: completed.reduce((a, s) => a + s.weight * s.repetitions, 0) };
    }));
    const max = Math.max(0, ...data.map(x => x.peso));
    const bandValues = data.map(x => x.gomas).filter((x): x is number => x !== null);
    const minBands = bandValues.length ? Math.min(...bandValues) : null;
    return <div className="stack">
        <div className="row between"><div><h2>Progreso</h2><div className="muted">Récords, volumen y evolución</div></div><select className="field" style={{ maxWidth: 300 }} value={name} onChange={e => setName(e.target.value)}>{names.map(n => <option key={n}>{n}</option>)}</select></div>
        <div className="grid grid3">{usesBands ? <Stat title="Menos gomas usadas" value={minBands !== null ? `${minBands}` : "—"} icon="🏆" /> : <Stat title="Récord de peso" value={`${max} kg`} icon="🏆" />}<Stat title="Sesiones registradas" value={String(data.length)} icon="📚" /><Stat title="Racha actual" value={`${streak(workouts)} semanas`} icon="🔥" /></div>
        <div className="card"><h3>{usesBands ? "Gomas usadas por sesión (menos es mejor)" : "Peso máximo por sesión"}</h3><div style={{ width: "100%", height: 320 }}><ResponsiveContainer><LineChart data={data}><CartesianGrid strokeDasharray="3 3" stroke="#28344c" /><XAxis dataKey="date" stroke="#94a3b8" /><YAxis stroke="#94a3b8" allowDecimals={!usesBands} domain={usesBands ? [0, 3] : undefined} /><Tooltip contentStyle={{ background: "#111a2d", border: "1px solid #28344c" }} /><Line type="monotone" dataKey={usesBands ? "gomas" : "peso"} stroke="#8b5cf6" strokeWidth={3} /></LineChart></ResponsiveContainer></div></div>
    </div>;
}

function Measurements({ data, onNew }: { data: Measurement[]; onNew: () => void }) { return <div className="stack"><div className="row between"><div><h2>Medidas corporales</h2><div className="muted">Recomendación: cada 2–4 semanas, en condiciones similares.</div></div><button className="button" onClick={onNew}><Plus size={16} /> Registrar</button></div>{data.length > 0 && <div className="card"><h3>Evolución de cintura</h3><div style={{ height: 280 }}><ResponsiveContainer><LineChart data={data.map(x => ({ fecha: new Date(x.date).toLocaleDateString("es-ES"), cintura: x.waist, pecho: x.chest }))}><CartesianGrid strokeDasharray="3 3" stroke="#28344c" /><XAxis dataKey="fecha" stroke="#94a3b8" /><YAxis stroke="#94a3b8" /><Tooltip contentStyle={{ background: "#111a2d", border: "1px solid #28344c" }} /><Line dataKey="cintura" stroke="#8b5cf6" strokeWidth={3} /><Line dataKey="pecho" stroke="#3b82f6" strokeWidth={3} /></LineChart></ResponsiveContainer></div></div>}<div className="card" style={{ overflowX: "auto" }}><table><thead><tr><th>Fecha</th><th>Cintura</th><th>Pecho</th><th>Brazo rel.</th><th>Brazo flex.</th><th>Muslo</th><th>Cadera</th></tr></thead><tbody>{data.slice().reverse().map(x => <tr key={x.id}><td>{new Date(x.date).toLocaleDateString("es-ES")}</td><td>{x.waist}</td><td>{x.chest}</td><td>{x.relaxed_arm}</td><td>{x.flexed_arm}</td><td>{x.thigh}</td><td>{x.hips}</td></tr>)}</tbody></table></div></div> }

function SettingsView({ workouts, exercises, routines, measurements, session }: { workouts: Workout[]; exercises: Exercise[]; routines: Routine[]; measurements: Measurement[]; session: any }) {
    const [exporting, setExporting] = useState(false);
    const [signingOut, setSigningOut] = useState(false);
    function exportExcel() {
        setExporting(true);
        setTimeout(() => {
            try {
                const wb = XLSX.utils.book_new(); const rows = workouts.flatMap(w => w.workout_exercises.flatMap(e => e.workout_sets.map(s => ({ Fecha: w.date, Rutina: w.title, Ejercicio: e.name, Grupo: e.muscle_group, Serie: s.order_index + 1, Peso: s.weight, Gomas: e.uses_bands ? s.band_count : "", Repeticiones: s.repetitions, Completada: s.is_completed ? "Sí" : "No", Notas: e.note })))); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Sesiones"); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(exercises), "Ejercicios"); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(measurements), "Medidas"); XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(routines.map(r => ({ Rutina: r.name, Grupo: r.muscle_group, Ejercicios: r.routine_exercises.map(x => x.exercise.name).join(", ") }))), "Rutinas"); XLSX.writeFile(wb, `ForgeFit-${today()}.xlsx`)
            } finally { setExporting(false) }
        }, 0);
    }
    async function signOut() { setSigningOut(true); await supabase?.auth.signOut(); setSigningOut(false) }
    return <div className="grid grid2"><div className="card stack"><h2>Exportación</h2><p className="muted">Genera un Excel con sesiones, series, ejercicios, rutinas y medidas.</p><button className="button" disabled={exporting} onClick={exportExcel}>{exporting ? <Spinner size={16} /> : <><Download size={17} /> Exportar todos los datos</>}</button></div><div className="card stack"><h2>Cuenta</h2><div className="muted">{session?.user?.email || "Modo demostración: los cambios no persisten al recargar."}</div>{session && <button className="button secondary" disabled={signingOut} onClick={signOut}>{signingOut ? <Spinner size={16} /> : <><LogOut size={17} /> Cerrar sesión</>}</button>}</div><div className="card"><h2>Instalar como app</h2><p className="muted">En Safari o Chrome usa “Añadir a pantalla de inicio”. ForgeFit incluye manifiesto PWA.</p></div><div className="card"><h2>Privacidad</h2><p className="muted">Con Supabase, cada usuario solo puede acceder a sus propios registros mediante políticas RLS.</p></div></div>
}

function RoutineModal({ routines, close, choose, busy }: { routines: Routine[]; close: () => void; choose: (r: Routine, date: string) => void; busy: boolean }) { const [date, setDate] = useState(today()); return <Modal close={close}><h2>Empezar entrenamiento</h2><div className="stack"><div><label className="label">Fecha del entrenamiento</label><input className="field" type="date" max={today()} value={date} onChange={e => setDate(e.target.value)} /></div>{routines.map(r => <button className="card workout" style={{ color: "inherit", textAlign: "left" }} key={r.id} onClick={() => choose(r, date)} disabled={!date || busy}><div className="exerciseHeader" style={{ borderColor: groupColor[r.muscle_group] }}><h3>{r.name}</h3><span className="muted">{r.routine_exercises.length} ejercicios · 4 series por ejercicio</span></div></button>)}</div></Modal> }
function ExerciseModal({ close, save, busy, initial }: { close: () => void; save: (x: Omit<Exercise, "id">) => void; busy: boolean; initial?: Exercise }) { const [name, setName] = useState(initial?.name || ""), [muscle_group, setGroup] = useState<MuscleGroup>(initial?.muscle_group || "Pecho"), [load_type, setLoad] = useState<LoadType>(initial?.load_type || loads[0]), [notes, setNotes] = useState(initial?.notes || ""), [uses_bands, setUsesBands] = useState(initial?.uses_bands || false); return <Modal close={close}><h2>{initial ? "Editar ejercicio" : "Nuevo ejercicio"}</h2><div className="stack"><input className="field" placeholder="Nombre" value={name} onChange={e => setName(e.target.value)} /><select className="field" value={muscle_group} onChange={e => setGroup(e.target.value as MuscleGroup)}>{muscles.map(x => <option key={x}>{x}</option>)}</select><select className="field" value={load_type} onChange={e => setLoad(e.target.value as LoadType)}>{loads.map(x => <option key={x}>{x}</option>)}</select><label className="row"><input type="checkbox" checked={uses_bands} onChange={e => setUsesBands(e.target.checked)} /> Se hace con gomas de asistencia (en vez de peso, se registra el nº de gomas)</label><textarea className="field" placeholder="Notas técnicas" value={notes} onChange={e => setNotes(e.target.value)} /><button className="button" disabled={!name.trim() || busy} onClick={() => save({ name, muscle_group, load_type, notes, uses_bands })}>{busy ? <Spinner size={16} /> : (initial ? "Guardar cambios" : "Guardar ejercicio")}</button></div></Modal> }
function MeasurementModal({ close, save, busy }: { close: () => void; save: (x: any) => void; busy: boolean }) { const [v, setV] = useState<any>({ date: today(), waist: 0, chest: 0, relaxed_arm: 0, flexed_arm: 0, thigh: 0, hips: 0, notes: "" }); const fields: [[string, string]] | any = [["waist", "Cintura"], ["chest", "Pecho"], ["relaxed_arm", "Brazo relajado"], ["flexed_arm", "Brazo flexionado"], ["thigh", "Muslo"], ["hips", "Cadera"]]; return <Modal close={close}><h2>Nuevas medidas</h2><div className="stack"><input type="date" className="field" value={v.date} onChange={e => setV({ ...v, date: e.target.value })} /><div className="grid grid2">{fields.map(([key, label]: [string, string]) => <div key={key}><label className="label">{label} (cm)</label><input className="field" type="number" step="0.1" value={v[key]} onFocus={selectAll} onMouseUp={selectAllOnClick} onChange={e => setV({ ...v, [key]: Number(e.target.value) })} /></div>)}</div><textarea className="field" placeholder="Notas" value={v.notes} onChange={e => setV({ ...v, notes: e.target.value })} /><button className="button" disabled={busy} onClick={() => save(v)}>{busy ? <Spinner size={16} /> : "Guardar medidas"}</button></div></Modal> }
function WorkoutExerciseModal({ exercises, workout, close, choose }: { exercises: Exercise[]; workout: Workout; close: () => void; choose: (exercise: Exercise) => void }) {
    const [query, setQuery] = useState("");
    const existingNames = new Set(workout.workout_exercises.map(exercise => exercise.name.toLowerCase()));
    const availableExercises = exercises.filter(exercise => {
        const haystack = `${exercise.name} ${exercise.muscle_group}`.toLowerCase();
        return haystack.includes(query.toLowerCase()) && !existingNames.has(exercise.name.toLowerCase());
    });

    return <Modal close={close}><h2>Añadir ejercicio a la sesión</h2><div className="stack"><div className="row"><Search size={18} /><input autoFocus className="field" placeholder="Buscar ejercicio…" value={query} onChange={event => setQuery(event.target.value)} /></div>{availableExercises.length === 0 ? <div className="muted">No hay ejercicios disponibles con ese filtro.</div> : availableExercises.map(exercise => <button key={exercise.id} className="card workout" style={{ color: "inherit", textAlign: "left" }} onClick={() => choose(exercise)}><div className="exerciseHeader" style={{ borderColor: groupColor[exercise.muscle_group] }}><h3>{exercise.name}</h3><div className="muted">{exercise.muscle_group} · {exercise.load_type}</div></div></button>)}</div></Modal>;
}

function EditWorkoutExerciseModal({ exercise, close, save }: {
    exercise: Workout["workout_exercises"][number];
    close: () => void;
    save: (patch: { name: string; muscle_group: MuscleGroup; load_type: LoadType; note: string }) => void;
}) {
    const [name, setName] = useState(exercise.name);
    const [muscleGroup, setMuscleGroup] = useState<MuscleGroup>(exercise.muscle_group);
    const [loadType, setLoadType] = useState<LoadType>(exercise.load_type);
    const [note, setNote] = useState(exercise.note || "");

    return <Modal close={close}><h2>Editar ejercicio</h2><div className="stack"><div><label className="label">Nombre</label><input autoFocus className="field" value={name} onChange={event => setName(event.target.value)} /></div><div><label className="label">Grupo muscular</label><select className="field" value={muscleGroup} onChange={event => setMuscleGroup(event.target.value as MuscleGroup)}>{muscles.map(muscle => <option key={muscle}>{muscle}</option>)}</select></div><div><label className="label">Tipo de carga</label><select className="field" value={loadType} onChange={event => setLoadType(event.target.value as LoadType)}>{loads.map(load => <option key={load}>{load}</option>)}</select></div><div><label className="label">Notas</label><textarea className="field" value={note} onChange={event => setNote(event.target.value)} /></div><button className="button" disabled={!name.trim()} onClick={() => save({ name: name.trim(), muscle_group: muscleGroup, load_type: loadType, note })}>Guardar cambios</button></div></Modal>;
}


function Modal({ close, children }: { close: () => void; children: React.ReactNode }) { return <div className="modalBackdrop" onMouseDown={close}><div className="card modal" onMouseDown={e => e.stopPropagation()}><div className="row between"><span /><button className="button secondary small" onClick={close}>Cerrar</button></div>{children}</div></div> }
