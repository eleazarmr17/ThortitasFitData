import { authenticated, errorResponse, snapshot } from "../../../lib/server-data";
import { type JsonRecord } from "../../../lib/server-validation";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await authenticated(); const all = await snapshot(user);
    const result: JsonRecord = { exportedAt: new Date().toISOString(), user: all.user };
    for (const key of ["routines", "sessions", "steps", "weights", "goals", "challenges", "posts"]) result[key] = all[key].filter((row: JsonRecord) => row.userId === user.userId);
    result.favorites = all.favorites;
    return new Response(JSON.stringify(result, null, 2), { headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": 'attachment; filename="thortitas-fit-data-export.json"', "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
