import { NextResponse } from "next/server";
import { dbGetUserByNik } from "@/lib/user-db";
import bcrypt from "bcryptjs";
import { signSession } from "@/lib/jwt";
import { cookies } from "next/headers";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { identifier, password } = body;

    if (!identifier || !password) {
      return NextResponse.json(
        { error: "NIK/Username dan Password wajib diisi" },
        { status: 400 }
      );
    }

    const user = await dbGetUserByNik(identifier);

    if (!user) {
      return NextResponse.json(
        { error: "Kredensial tidak valid" },
        { status: 401 }
      );
    }

    if (user.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Akun tidak aktif, hubungi administrator" },
        { status: 403 }
      );
    }

    if (!user.passwordHash) {
      return NextResponse.json(
        { error: "Akun ini harus login menggunakan SSO Corporate" },
        { status: 401 }
      );
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Kredensial tidak valid" },
        { status: 401 }
      );
    }

    const token = await signSession({
      id: user.id,
      nik: user.nik,
      systemRole: user.systemRole
    });

    const cookieStore = await cookies();
    cookieStore.set("siaga_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24, // 24 hours
      path: "/"
    });

    return NextResponse.json({ success: true, redirect: "/" });
  } catch (error) {
    console.error("[POST /api/auth/login]", error);
    return NextResponse.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
