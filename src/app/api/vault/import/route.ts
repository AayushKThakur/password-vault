import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "secret";

async function authenticate(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.split(" ")[1];
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export async function POST(req: NextRequest) {
  const user = await authenticate(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await req.json();
  if (!Array.isArray(entries))
    return NextResponse.json({ error: "Invalid data format" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db();

  const entriesWithUser = entries.map((entry: any) => ({
    ...entry,
    userId: (user as any).userId,
    _id: undefined,
  }));

  await db.collection("vault").insertMany(entriesWithUser);

  return NextResponse.json({ success: true });
}
