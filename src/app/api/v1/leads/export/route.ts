import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { exportLeadsCsv } from "@/modules/leads/service";

export async function GET(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const url = new URL(request.url);
    const csv = await exportLeadsCsv(
      user.id,
      Object.fromEntries(url.searchParams),
    );
    return new Response(csv, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="prospect-ninja-leads.csv"`,
      },
    });
  } catch (error) {
    return fromUnknownError(error);
  }
}
