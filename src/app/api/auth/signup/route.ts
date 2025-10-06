import { NextRequest, NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const SALT_ROUNDS = 10;
const JWT_SECRET = process.env.JWT_SECRET || "secret";

export async function POST(req: NextRequest) {
  const { email, password } = await req.json();

  if (!email || !password)
    return NextResponse.json(
      { error: "Email and password required" },
      { status: 400 }
    );

  const client = await clientPromise;
  const db = client.db();

  const existing = await db.collection("users").findOne({ email });
  if (existing)
    return NextResponse.json(
      { error: "Email already exists" },
      { status: 409 }
    );

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);
  const result = await db
    .collection("users")
    .insertOne({ email, password: hashed, createdAt: new Date() });

  const token = jwt.sign({ userId: result.insertedId, email }, JWT_SECRET, {
    expiresIn: "7d",
  });

  return NextResponse.json({ token });
}
