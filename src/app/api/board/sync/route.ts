// vision-board-2026\src\app\api\board\sync\route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

const prisma = new PrismaClient();

export async function POST(req: Request) {
  const session = await getServerSession(authOptions); 
  
  if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cards } = await req.json();

  // 1. Update or Create the Main Board (The "Live" version)
  const board = await prisma.board.upsert({
    where: { userId: session.user.id },
    update: { content: cards },
    create: { userId: session.user.id, content: cards },
  });

  // 2. Create a History Snapshot
  await prisma.boardHistory.create({
    data: {
        boardId: board.id,
        content: cards,
    }
  });

  // 3. Cleanup: Keep only the last 20 snapshots (Cloud Limit)
  // This prevents your database from growing infinitely
  const historyCount = await prisma.boardHistory.count({ where: { boardId: board.id } });
  
  if (historyCount > 20) {
      const oldRecords = await prisma.boardHistory.findMany({
          where: { boardId: board.id },
          orderBy: { createdAt: 'asc' }, // Find oldest
          take: historyCount - 20,
          select: { id: true }
      });
      
      if (oldRecords.length > 0) {
          await prisma.boardHistory.deleteMany({
              where: { id: { in: oldRecords.map(r => r.id) } }
          });
      }
  }

  // 4. Return the updated info + the new history list
  const latestHistory = await prisma.boardHistory.findMany({
      where: { boardId: board.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: { id: true, createdAt: true, content: true }
  });

  return NextResponse.json({ 
      updatedAt: board.updatedAt,
      history: latestHistory
  });
}

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Fetch Board AND History together
  const board = await prisma.board.findUnique({
    where: { userId: session.user.id },
    include: {
        history: {
            orderBy: { createdAt: 'desc' },
            take: 20
        }
    }
  });

  return NextResponse.json({ 
    cards: board?.content || [], 
    updatedAt: board?.updatedAt,
    history: board?.history || [] 
  });
}