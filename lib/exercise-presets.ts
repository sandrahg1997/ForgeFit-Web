import type { LoadType, MuscleGroup } from "./types";

const BARRA: LoadType = "Barra · peso total";
const MANC: LoadType = "Mancuernas · cada una";
const MAQ: LoadType = "Máquina/polea · peso seleccionado";
const ASIST: LoadType = "Dominada asistida · tipo de goma";
const PESO0: LoadType = "Sin peso · solo repeticiones";

type Preset = { name: string; muscle_group: MuscleGroup; load_type: LoadType; uses_bands?: boolean };
const p = (muscle_group: MuscleGroup, load_type: LoadType, names: string[]): Preset[] => names.map(name => ({ name, muscle_group, load_type }));

export const EXERCISE_PRESETS: Preset[] = [
    ...p("Pecho", BARRA, ["Press banca plano", "Press banca inclinado", "Press banca declinado"]),
    ...p("Pecho", MANC, ["Press mancuernas plano", "Aperturas con mancuernas", "Press inclinado con mancuernas"]),
    ...p("Pecho", MAQ, ["Press en máquina", "Peck deck", "Cruce de poleas", "Poleas de pecho"]),
    ...p("Pecho", PESO0, ["Flexiones", "Fondos en paralelas"]),
    ...p("Espalda", BARRA, ["Peso muerto", "Remo con barra", "Remo Pendlay"]),
    ...p("Espalda", MANC, ["Remo con mancuerna", "Pullover con mancuerna"]),
    ...p("Espalda", MAQ, ["Jalón al pecho", "Jalón agarre estrecho", "Remo en polea baja", "Remo en máquina", "Pullover en polea"]),
    { name: "Dominada asistida", muscle_group: "Espalda", load_type: ASIST, uses_bands: true },
    ...p("Espalda", PESO0, ["Dominadas", "Hiperextensiones"]),
    ...p("Pierna", BARRA, ["Sentadilla", "Sentadilla frontal", "Peso muerto rumano", "Sentadilla Smith"]),
    ...p("Pierna", MANC, ["Zancada", "Sentadilla búlgara", "Sentadilla goblet", "Peso muerto rumano con mancuernas"]),
    ...p("Pierna", MAQ, ["Prensa", "Extensión de cuádriceps", "Curl femoral tumbado", "Curl femoral sentado", "Gemelo en máquina", "Aductores", "Abductores"]),
    ...p("Glúteo", BARRA, ["Hip thrust", "Puente de glúteo con barra"]),
    ...p("Glúteo", MAQ, ["Glúteo en polea", "Patada de glúteo en máquina", "Glúteo en máquina"]),
    ...p("Glúteo", PESO0, ["Puente de glúteo", "Patada de glúteo"]),
    ...p("Hombro", BARRA, ["Press militar"]),
    ...p("Hombro", MANC, ["Press de hombro con mancuernas", "Elevaciones laterales", "Elevaciones frontales", "Pájaros"]),
    ...p("Hombro", MAQ, ["Press de hombro en máquina", "Elevaciones laterales en polea", "Face pull"]),
    ...p("Bíceps", BARRA, ["Curl con barra", "Curl con barra Z"]),
    ...p("Bíceps", MANC, ["Curl con mancuernas", "Curl martillo", "Curl concentrado", "Curl inclinado"]),
    ...p("Bíceps", MAQ, ["Curl en polea", "Curl predicador en máquina"]),
    ...p("Tríceps", BARRA, ["Press francés", "Press banca agarre cerrado"]),
    ...p("Tríceps", MANC, ["Extensión de tríceps sobre la cabeza", "Patada de tríceps"]),
    ...p("Tríceps", MAQ, ["Tríceps con barra", "Tríceps con cuerda", "Extensión de tríceps en polea"]),
    ...p("Tríceps", PESO0, ["Fondos en banco"]),
    ...p("Core", MAQ, ["Crunch en polea", "Rotación en polea"]),
    ...p("Core", PESO0, ["Plancha", "Crunch abdominal", "Elevación de piernas", "Rueda abdominal", "Plancha lateral", "Bicicleta abdominal"]),
];
