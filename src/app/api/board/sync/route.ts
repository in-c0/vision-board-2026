import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

const prisma = new PrismaClient();

// HELPER: Calculate size in MB
const getSizeInMB = (obj: any) => Buffer.byteLength(JSON.stringify(obj)) / (1024 * 1024);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Check if we are asking for a SPECIFIC board or the LIST
  const { searchParams } = new URL(req.url);
  const boardId = searchParams.get("id");

  if (boardId) {
    // Return specific board content
    const board = await prisma.board.findUnique({
      where: { id: boardId, userId: session.user.id }, // Security: Ensure ownership
      include: { history: { orderBy: { createdAt: 'desc' }, take: 10 } }
    });
    return NextResponse.json(board || { error: "Not found" });
  } else {
    // Return LIST of boards (metadata only, no heavy content)
    const boards = await prisma.board.findMany({
      where: { userId: session.user.id },
      select: { id: true, title: true, updatedAt: true },
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json({ boards });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, boardId, title, cards } = body;

  // 1. CREATE NEW BOARD
  if (action === "create") {
    const count = await prisma.board.count({ where: { userId: session.user.id } });
    
    if (count >= 10) {
      return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 403 });
    }

    const newBoard = await prisma.board.create({
      data: {
        userId: session.user.id,
        title: title || "New Vision Board",
        content: cards || [], // Can initialize with guest data
      }
    });
    return NextResponse.json(newBoard);
  }

  // 2. UPDATE EXISTING BOARD
  if (action === "update" && boardId) {
    // Size Check (100MB limit)
    if (getSizeInMB(cards) > 100) {
      return NextResponse.json({ error: "SIZE_LIMIT_EXCEEDED" }, { status: 413 });
    }

    const board = await prisma.board.update({
      where: { id: boardId, userId: session.user.id }, // Security Check
      data: { content: cards },
    });

    // Save History Snapshot
    await prisma.boardHistory.create({
      data: { boardId, content: cards }
    });

    // Cleanup Old History (Keep last 10)
    const historyCount = await prisma.boardHistory.count({ where: { boardId } });
    if (historyCount > 10) {
      const old = await prisma.boardHistory.findMany({
        where: { boardId }, orderBy: { createdAt: 'asc' }, take: historyCount - 10, select: { id: true }
      });
      await prisma.boardHistory.deleteMany({ where: { id: { in: old.map(r => r.id) } } });
    }

    // Return fresh history list
    const history = await prisma.boardHistory.findMany({
       where: { boardId }, orderBy: { createdAt: 'desc' }, take: 10,
       select: { id: true, createdAt: true, content: true }
    });

    return NextResponse.json({ updatedAt: board.updatedAt, history });
  }
  
  // 3. RENAME
  if (action === "rename" && boardId) {
      const board = await prisma.board.update({
          where: { id: boardId, userId: session.user.id },
          data: { title: title }
      });
      return NextResponse.json(board);
  }

  // 4. DELETE
  if (action === "delete" && boardId) {
      await prisma.board.delete({
          where: { id: boardId, userId: session.user.id }
      });
      return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}