import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
// IMPORT THE OPTIONS, NOT THE HANDLER
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

const prisma = new PrismaClient();

export async function POST(req: Request) {
  // Pass authOptions here
  const session = await getServerSession(authOptions); 
  
  if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cards } = await req.json();

  const board = await prisma.board.upsert({
    where: { userId: session.user.id },
    update: { content: cards },
    create: { userId: session.user.id, content: cards },
  });

  return NextResponse.json({ updatedAt: board.updatedAt });
}

export async function GET(req: Request) {
  // Pass authOptions here
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const board = await prisma.board.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ 
    cards: board?.content || [], 
    updatedAt: board?.updatedAt 
  });
}