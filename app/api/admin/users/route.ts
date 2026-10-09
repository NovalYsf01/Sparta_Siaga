import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { dbGetAllUsers, dbCreateUser, dbGetUserByNik } from "@/lib/user-db";
import { isValidHumanBusinessRole, deriveScopeFromBusinessRole } from "@/lib/role-catalog";
import bcrypt from "bcryptjs";

export async function GET() {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser || sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Hanya System Administrator yang dapat mengakses manajemen user." },
        { status: 403 }
      );
    }

    const users = await dbGetAllUsers();
    // Never expose passwordHash in API response
    const safeUsers = users.map(({ passwordHash, ...u }) => u);
    return NextResponse.json({ data: safeUsers });
  } catch (error) {
    console.error("[GET /api/admin/users]", error);
    return NextResponse.json({ error: "Gagal memuat daftar user" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const sessionUser = await getSessionUser();
    
    if (!sessionUser || sessionUser.systemRole !== "ADMIN") {
      return NextResponse.json(
        { error: "Forbidden: Hanya System Administrator yang dapat menambah user." },
        { status: 403 }
      );
    }

    const body = await request.json();

    // 1. Validasi Nama
    if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
      return NextResponse.json({ error: "Nama user wajib diisi." }, { status: 400 });
    }

    // 2. Proteksi System Role: User creation melalui UI / normal API HANYA boleh bertipe USER
    if (body.systemRole === "ADMIN") {
      return NextResponse.json(
        { error: "System ADMIN hanya dapat dikonfigurasi melalui ENV / script seed terproteksi." },
        { status: 400 }
      );
    }
    const systemRole = "USER";

    // 3. Validasi NIK: Wajib untuk akun lokal, harus unik & ditrim
    if (!body.nik || typeof body.nik !== "string" || !body.nik.trim()) {
      return NextResponse.json({ error: "NIK wajib diisi." }, { status: 400 });
    }
    const trimmedNik = body.nik.trim();
    const existingUserWithNik = await dbGetUserByNik(trimmedNik);
    if (existingUserWithNik) {
      return NextResponse.json({ error: "NIK sudah terdaftar pada pengguna lain." }, { status: 400 });
    }

    // 4. Validasi Business Role dari Katalog Kanonikal
    const businessRole = typeof body.businessRole === "string" ? body.businessRole.trim().toLowerCase() : "";
    if (!isValidHumanBusinessRole(businessRole)) {
      return NextResponse.json(
        { error: `Business Role '${body.businessRole}' tidak valid atau bukan peran persona pengguna yang dapat dipilih.` },
        { status: 400 }
      );
    }

    // 5. Otoritatif Server-Derived Scope & Branch
    const derivedScope = deriveScopeFromBusinessRole(businessRole);
    if (!derivedScope) {
      return NextResponse.json({ error: "Gagal menurunkan cakupan (scope) untuk role tersebut." }, { status: 400 });
    }

    // Jika client mengirim scope yang bertentangan dengan katalog kanonikal, tolak
    if (body.scope && body.scope !== derivedScope) {
      return NextResponse.json(
        { error: `Scope '${body.scope}' tidak sesuai dengan Business Role '${businessRole}'. Scope yang benar adalah '${derivedScope}'.` },
        { status: 400 }
      );
    }

    let finalBranch: string | null = null;
    if (derivedScope === "HO") {
      // Role HO tidak boleh memiliki branch
      finalBranch = null;
    } else {
      // Role BRANCH wajib memiliki branch yang valid
      if (!body.branch || typeof body.branch !== "string" || !body.branch.trim()) {
        return NextResponse.json(
          { error: "Cabang wajib dipilih untuk role dengan cakupan BRANCH." },
          { status: 400 }
        );
      }
      finalBranch = body.branch.trim();
    }

    // 6. Validasi Password untuk akun LOCAL
    const source = body.source === "SSO" ? "SSO" : "LOCAL";
    let passwordHash: string | null = null;
    if (source === "LOCAL") {
      if (!body.password || typeof body.password !== "string" || !body.password.trim()) {
        return NextResponse.json({ error: "Password wajib diisi untuk pengguna lokal." }, { status: 400 });
      }

      if (body.password.length < 8) {
        return NextResponse.json({ error: "Password minimal 8 karakter." }, { status: 400 });
      }

      if (body.confirmPassword !== undefined && body.password !== body.confirmPassword) {
        return NextResponse.json({ error: "Konfirmasi password tidak sesuai." }, { status: 400 });
      }

      passwordHash = await bcrypt.hash(body.password, 10);
    }

    const id = `usr_local_${Date.now()}`;
    const newUser = await dbCreateUser({
      id,
      name: body.name.trim(),
      nik: trimmedNik,
      email: body.email && typeof body.email === "string" ? body.email.trim() : null,
      systemRole,
      businessRole,
      scope: derivedScope,
      branch: finalBranch,
      status: body.status === "INACTIVE" ? "INACTIVE" : "ACTIVE",
      source,
      passwordHash,
    });

    // Never expose passwordHash in response
    const { passwordHash: _, ...safeUser } = newUser;
    return NextResponse.json({ data: safeUser }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/users]", error);
    return NextResponse.json({ error: "Gagal membuat user" }, { status: 500 });
  }
}
