import { NextResponse } from "next/server";

import { getSessionUser } from "@/lib/auth";
import { listSharedQueue } from "@/lib/facility-service";

export async function GET(request: Request) {
  const user = await getSessionUser(request);
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const data = await listSharedQueue(user);
  return NextResponse.json({ data });
}
