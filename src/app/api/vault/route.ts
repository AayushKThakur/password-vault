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

export async function GET(req: NextRequest) {
  const user = await authenticate(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const client = await clientPromise;
  const db = client.db();
  const vaultEntries = await db
    .collection("vault")
    .find({ userId: (user as any).userId })
    .toArray();

  return NextResponse.json(vaultEntries);
}

export async function POST(req: NextRequest) {
  const user = await authenticate(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const { title, username, password, url, notes } = data;

  const client = await clientPromise;
  const db = client.db();

  const newEntry = {
    userId: (user as any).userId,
    title,
    username,
    password,
    url,
    notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const result = await db.collection("vault").insertOne(newEntry);
  // newEntry._id = result.insertedId;
  (newEntry as any)._id = result.insertedId;

  return NextResponse.json(newEntry);
}

export async function PATCH(req: NextRequest) {
  const user = await authenticate(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = await req.json();
  const { _id, title, username, password, url, notes } = data;

  if (!_id) return NextResponse.json({ error: "Missing _id" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db();

  const updated = await db.collection("vault").findOneAndUpdate(
    {
      _id: new (await import("mongodb")).ObjectId(_id),
      userId: (user as any).userId,
    },
    {
      $set: { title, username, password, url, notes, updatedAt: new Date() },
    },
    { returnDocument: "after" }
  );

  // if (!updated.value) {
  //   return NextResponse.json(
  //     { error: "Not found or unauthorized" },
  //     { status: 404 }
  //   );
  // }
  if (!updated || !updated.value) {
    return NextResponse.json(
      { error: "Not found or unauthorized" },
      { status: 404 }
    );
  }

  return NextResponse.json(updated.value);
}

export async function DELETE(req: NextRequest) {
  const user = await authenticate(req);
  if (!user)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

  const client = await clientPromise;
  const db = client.db();

  const result = await db.collection("vault").deleteOne({
    _id: new (await import("mongodb")).ObjectId(id),
    userId: (user as any).userId,
  });

  if (result.deletedCount === 0) {
    return NextResponse.json(
      { error: "Not found or unauthorized" },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}
