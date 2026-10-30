import { authenticated, boundedBody, checkWriteOrigin, errorResponse, mutate, snapshot } from "../../../lib/server-data";
import { ApiError } from "../../../lib/server-validation";
export const dynamic = "force-dynamic";
export async function GET() {
  try { return Response.json(await snapshot(await authenticated()), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    checkWriteOrigin(request);
    const user = await authenticated();
    if (!request.headers.get("content-type")?.includes("application/json")) throw new ApiError("Send a JSON request.", 415);
    const raw = new TextDecoder().decode(await boundedBody(request, 300000));
    let payload: unknown; try { payload = JSON.parse(raw); } catch { throw new ApiError("The request is not valid JSON."); }
    return Response.json(await mutate(user, payload), { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
