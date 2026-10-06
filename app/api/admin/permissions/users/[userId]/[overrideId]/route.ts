import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { revokeUserOverride } from "@/lib/permission-service";

type RouteContext = { params: Promise<{ userId: string; overrideId: string }> };

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    if (!sessionUser || sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Hanya System Administrator yang dapat mencabut override permission." },
        { status: 403 }
      );
    }

    const { userId, overrideId } = await params;

    await revokeUserOverride(userId, overrideId, {
      id: sessionUser.id,
      name: sessionUser.name,
    });

    return NextResponse.json({
      message: "Permission override berhasil dicabut.",
      data: { userId, overrideId },
    });
  } catch (err: any) {
    console.error("[DELETE /api/admin/permissions/users/:userId/:overrideId]", err);
    return NextResponse.json(
      { error: err.message || "Gagal mencabut permission override." },
      { status: 500 }
    );
  }
}
