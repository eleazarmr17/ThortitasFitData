import { EXERCISES } from "../app/library";
const LIBRARY_IDS = new Set(EXERCISES.map(exercise => exercise.id));

export class ApiError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}
export type JsonRecord = Record<string, any>;
export function object(value: unknown, label = "Record"): JsonRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ApiError(`${label} is required.`);
  return value as JsonRecord;
}
export function text(value: unknown, label: string, max = 4000, required = false): string {
  if (value == null && !required) return "";
  if (typeof value !== "string" || value.length > max || (required && !value.trim())) throw new ApiError(`${label} must be ${required ? "nonempty text" : "text"} (${max} characters maximum).`);
  return value.trim();
}
export function numeric(value: unknown, label: string, min = 0, max = 1000000, integer = false): number {
  if ((typeof value !== "number" && typeof value !== "string") || value === "" || (typeof value === "string" && !value.trim())) throw new ApiError(`${label} is required.`);
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || result > max || (integer && !Number.isInteger(result))) throw new ApiError(`${label} must be ${integer ? "an integer" : "a number"} between ${min} and ${max}.`);
  return result;
}
export function date(value: unknown, label = "Date"): string {
  const result = text(value, label, 10, true);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(result) || !Number.isFinite(Date.parse(result)) || new Date(result).toISOString().slice(0, 10) !== result) throw new ApiError(`${label} must be a valid calendar date.`);
  if (result < "1900-01-01" || result > "2200-12-31") throw new ApiError(`${label} is outside the supported range.`);
  return result;
}
export function photo(value: unknown): string {
  const result = text(value, "Photo", 700);
  if (result && !/^\/api\/media\?key=[A-Za-z0-9%._~-]+$/.test(result)) throw new ApiError("Choose a photo uploaded to this app.");
  return result;
}
function optionalNumber(output: JsonRecord, input: JsonRecord, key: string, min: number, max: number, integer = false) {
  if (input[key] !== undefined && input[key] !== "" && input[key] !== null) output[key] = numeric(input[key], key, min, max, integer);
}
function rest(value: unknown): string {
  const result = text(value == null ? "" : String(value), "Rest time", 12);
  if (result && !/^\d{1,3}(:[0-5]\d)?$/.test(result)) throw new ApiError("Rest should be minutes:seconds or a number of seconds.");
  return result;
}
function exerciseId(value: unknown): string {
  const id = text(value, "Exercise", 100, true);
  if (!LIBRARY_IDS.has(id)) throw new ApiError("Choose an exercise from the library.");
  return id;
}
export function validateProfile(input: unknown): JsonRecord {
  const p = object(input, "Profile");
  const result: JsonRecord = {};
  for (const key of ["displayName", "goals"] as const) if (p[key] !== undefined) result[key] = text(p[key], key, key === "goals" ? 3000 : 100);
  optionalNumber(result, p, "height", 50, 300); optionalNumber(result, p, "currentWeight", 15, 600);
  optionalNumber(result, p, "weeklyTarget", 1, 30, true); optionalNumber(result, p, "stepTarget", 1, 200000, true);
  if (p.avatar !== undefined) result.avatar = photo(p.avatar);
  if (p.preferredCategories !== undefined) {
    if (!Array.isArray(p.preferredCategories) || p.preferredCategories.length > 30) throw new ApiError("Select up to 30 categories.");
    result.preferredCategories = p.preferredCategories.map((c: unknown) => text(c, "Category", 80, true));
  }
  for (const key of ["shareWorkouts", "notificationsEnabled"]) if (p[key] !== undefined) result[key] = p[key] === true;
  return result;
}
export function validateRecord(entity: string, input: unknown): JsonRecord {
  const p = object(input);
  if (entity === "step") return { date: date(p.date), steps: numeric(p.steps, "Steps", 0, 200000, true) };
  if (entity === "weight") return { date: date(p.date), weight: numeric(p.weight, "Body weight", 15, 600), notes: text(p.notes, "Notes"), photo: photo(p.photo) };
  if (entity === "routine" || entity === "session") {
    const result: JsonRecord = { name: text(p.name, "Name", 120, true), category: text(p.category, "Category", 100), notes: text(p.notes, "Notes") };
    if (!Array.isArray(p.exercises) || p.exercises.length > 80) throw new ApiError("Choose up to 80 exercises.");
    result.exercises = p.exercises.map((item: unknown) => {
      const ex = object(item, "Exercise");
      const output: JsonRecord = { exerciseId: exerciseId(ex.exerciseId), notes: text(ex.notes, "Exercise notes", 2000) };
      if (entity === "routine") {
        output.sets = numeric(ex.sets, "Working sets", 1, 30, true);
        if (ex.targetReps !== undefined && ex.targetReps !== "") output.targetReps = text(String(ex.targetReps), "Target repetitions", 40);
        return output;
      }
      if (!Array.isArray(ex.sets) || ex.sets.length > 50) throw new ApiError("Each exercise supports up to 50 sets.");
      output.sets = ex.sets.filter((s: unknown) => object(s, "Set").completed === true).map((s: JsonRecord) => {
        const set: JsonRecord = { weight: numeric(s.weight, "Weight", 0, 1500), reps: numeric(s.reps, "Repetitions", 1, 1000, true), completed: true, rest: rest(s.rest) };
        optionalNumber(set, s, "rir", 0, 20); return set;
      });
      return output;
    });
    if (entity === "session") {
      result.type = text(p.type || "strength", "Activity type", 60, true); result.routineId = text(p.routineId, "Routine", 100);
      const sessionDate = typeof p.date === "string" && p.date.includes("T") && Number.isFinite(Date.parse(p.date)) ? p.date.slice(0, 10) : p.date;
      result.date = date(sessionDate); result.duration = numeric(p.duration, "Duration in minutes", 0, 1440); result.photo = photo(p.photo);
      if (p.startedAt !== undefined) { const start = text(p.startedAt, "Start time", 40); if (!Number.isFinite(Date.parse(start))) throw new ApiError("Start time is invalid."); result.startedAt = start; }
      for (const [key, max] of [["distance", 3000], ["heartRate", 300], ["calories", 30000]] as const) optionalNumber(result, p, key, 0, max);
      result.pace = text(p.pace, "Pace", 30);
      if (result.type.toLowerCase() === "strength" && !result.exercises.some((ex: JsonRecord) => ex.sets.length)) throw new ApiError("Complete at least one working set before saving.");
    }
    return result;
  }
  if (entity === "goal" || entity === "challenge") {
    const result: JsonRecord = {
      title: text(p.title, "Title", 150, true), description: text(p.description, "Description", 3000), category: text(p.category, "Category", 100),
      target: numeric(p.target ?? p.targetValue, "Target", 0.001, 100000000), unit: text(p.unit, "Unit", 60),
      startDate: date(p.startDate, "Start date"), deadline: date(p.deadline, "Deadline"),
      current: numeric(p.current ?? p.progress ?? 0, "Current progress", 0, 100000000), shared: p.shared === true,
      status: text(p.status || "active", "Status", 40), autoMetric: text(p.autoMetric || "manual", "Metric", 80),
    };
    if (result.deadline < result.startDate) throw new ApiError("The deadline must be on or after the start date.");
    if (entity === "challenge") { result.type = text(p.type || "weekly-workouts", "Challenge type", 80); result.mode = text(p.mode || "competitive", "Challenge mode", 40); }
    if (entity === "goal") {
      if (p.direction !== undefined && p.direction !== "increase" && p.direction !== "decrease") throw new ApiError("Choose whether the target increases or decreases.");
      result.direction = p.direction || "increase";
      optionalNumber(result, p, "startValue", 0, 100000000);
      if (result.direction === "decrease" && (!(result.startValue > result.target))) throw new ApiError("A decreasing goal needs a starting value above its target.");
    }
    if (p.exerciseId) result.exerciseId = exerciseId(p.exerciseId);
    return result;
  }
  if (entity === "post") {
    const result: JsonRecord = { type: p.type === "meal" ? "meal" : "activity", text: text(p.text ?? p.caption, "Caption", 8000), photo: photo(p.photo), title: text(p.title, "Title", 160), sessionId: text(p.sessionId ?? p.workoutId, "Workout", 100) };
    if (!result.text && !result.photo && !result.title && !result.sessionId) throw new ApiError("Add a caption, photo or workout to your post.");
    if (result.type === "meal") {
      result.date = date(p.date || new Date().toISOString().slice(0, 10), "Meal date");
      result.description = text(p.description, "Description", 8000);
      result.ingredients = Array.isArray(p.ingredients) ? p.ingredients.slice(0, 80).map((item: unknown) => text(item, "Ingredient", 200)).join("\n") : text(p.ingredients, "Ingredients", 12000);
      result.instructions = text(p.instructions, "Preparation", 12000); result.kind = text(p.kind || "Meal prep", "Meal category", 80);
      for (const key of ["calories", "protein", "carbs", "fat"]) optionalNumber(result, p, key, 0, key === "calories" ? 30000 : 3000);
      optionalNumber(result, p, "servings", 0.1, 1000);
    }
    return result;
  }
  throw new ApiError("Unknown record type.");
}
