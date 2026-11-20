import { NextResponse } from "next/server";
import { fromUnknownError, jsonError } from "@/lib/http";
import { getApiUser } from "@/lib/session";
import { importLeadsFromCsv } from "@/modules/leads/service";

export async function POST(request: Request) {
  const user = await getApiUser();
  if (!user) {
    return jsonError("Unauthorized.", 401);
  }
  try {
    const contentType = request.headers.get("content-type") ?? "";
    let csvText = "";
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) {
        return jsonError("Upload a CSV file under the file field.", 400);
      }
      csvText = await file.text();
    } else {
      const body = (await request.json()) as { csv?: string };
      csvText = body.csv ?? "";
    }
    if (!csvText.trim()) {
      return jsonError("CSV content is empty.", 400);
    }
    const result = await importLeadsFromCsv(user.id, csvText);
    return NextResponse.json({ result });
  } catch (error) {
    return fromUnknownError(error);
  }
}
