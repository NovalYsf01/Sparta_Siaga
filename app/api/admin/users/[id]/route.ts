import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbAdminUpdateUser, dbGetUserById } from "@/lib/user-db";
import bcrypt from "bcryptjs";

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser || sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Hanya ADMIN yang dapat mengubah data user." }, { status: 403 });
    }

    const { id } = await params;
    const body = await request.json();

    const existingUser = await dbGetUserById(id);
    if (!existingUser) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    // Prevent duplicate NIK
    if (body.nik && typeof body.nik === "string" && body.nik.trim() !== existingUser.nik) {
      const existingUserWithNik = await import("@/lib/user-db").then(m => m.dbGetUserByNik(body.nik.trim()));
      if (existingUserWithNik && existingUserWithNik.id !== id) {
        return NextResponse.json({ error: "NIK sudah terdaftar oleh pengguna lain." }, { status: 400 });
      }
    }

    // Prevent deactivating oneself
    if (id === sessionUser.id && body.status === "INACTIVE") {
      return NextResponse.json({ error: "Action Denied: Tidak dapat menonaktifkan diri sendiri." }, { status: 400 });
    }

    // Enforce role normalization
    if (existingUser.systemRole === "ADMIN") {
      if (body.systemRole === "USER") {
        return NextResponse.json({ error: "Action Denied: Tidak dapat mencabut hak akses ADMIN dari UI." }, { status: 400 });
      }
      body.systemRole = "ADMIN";
      body.businessRole = null;
      body.scope = null;
      body.branch = null;
    } else {
      if (body.systemRole === "ADMIN") {
        return NextResponse.json({ error: "Action Denied: Tidak dapat meng-upgrade USER menjadi ADMIN dari UI." }, { status: 400 });
      }
      body.systemRole = "USER";
      
      if (body.businessRole !== undefined) {
        if (["ho_admin", "gm_ho", "sm_ho"].includes(body.businessRole)) {
          body.scope = "HO";
          body.branch = null;
        } else if (["bm", "tim_toko", "sparta_maintenance"].includes(body.businessRole)) {
          body.scope = "BRANCH";
          const branchToCheck = body.branch !== undefined ? body.branch : existingUser.branch;
          if (!branchToCheck) {
            return NextResponse.json({ error: "Cabang/Toko wajib diisi untuk role berscope BRANCH" }, { status: 400 });
          }
        } else {
          return NextResponse.json({ error: "Business Role tidak valid" }, { status: 400 });
        }
      }
    }

    // Handle password reset if provided
    if (body.password !== undefined && body.password !== null && body.password !== "") {
      if (typeof body.password !== "string" || body.password.length < 8) {
        return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
      }

      if (body.confirmPassword !== undefined && body.password !== body.confirmPassword) {
        return NextResponse.json({ error: "Konfirmasi password tidak sesuai." }, { status: 400 });
      }

      body.passwordHash = await bcrypt.hash(body.password, 10);
    }
    delete body.password;
    delete body.confirmPassword;

    const updatedUser = await dbAdminUpdateUser(id, body);
    if (!updatedUser) {
      return NextResponse.json({ error: "User tidak ditemukan" }, { status: 404 });
    }

    // Never expose passwordHash in response
    const { passwordHash: _, ...safeUser } = updatedUser;
    return NextResponse.json({ data: safeUser });
  } catch (error) {
    console.error("[PATCH /api/admin/users/:id]", error);
    return NextResponse.json({ error: "Gagal memperbarui data user" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser || sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json({ error: "Forbidden: Hanya ADMIN yang dapat menghapus user." }, { status: 403 });
    }

    const { id } = await params;

    if (id === sessionUser.id) {
      return NextResponse.json({ error: "Action Denied: Tidak dapat menghapus akun sendiri." }, { status: 400 });
    }

    const existingUser = await import("@/lib/user-db").then(m => m.dbGetUserById(id));
    if (existingUser && existingUser.systemRole === "ADMIN") {
       return NextResponse.json({ error: "Action Denied: System ADMIN tidak dapat dihapus melalui UI." }, { status: 400 });
    }

    const success = await import("@/lib/user-db").then(m => m.dbDeleteUser(id));
    if (!success) {
      return NextResponse.json({ error: "User tidak ditemukan atau berasal dari SSO sehingga tidak dapat di hard-delete." }, { status: 400 });
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error("[DELETE /api/admin/users/:id]", error);
    return NextResponse.json({ error: "Gagal menghapus user" }, { status: 500 });
  }
}
