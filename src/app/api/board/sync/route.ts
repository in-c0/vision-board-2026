import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route"; 

const prisma = new PrismaClient();

const getSizeInMB = (obj: any) => Buffer.byteLength(JSON.stringify(obj)) / (1024 * 1024);

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const boardId = searchParams.get("id");
  // FIX: Allow fetching specific user's boards (for Friend View)
  const targetUserId = searchParams.get("userId") || session.user.id;

  if (boardId) {
    const board = await prisma.board.findFirst({
      where: { id: boardId, userId: targetUserId }, // Match board to the target user
      include: { history: { orderBy: { createdAt: 'desc' }, take: 10 } }
    });
    return NextResponse.json(board || { error: "Not found" });
  } else {
    const boards = await prisma.board.findMany({
      where: { userId: targetUserId }, // FIX: Filter by target user, not always session user
      select: { id: true, title: true, updatedAt: true, background: true, randomRotation: true }, // Added background/rotation
      orderBy: { updatedAt: 'desc' }
    });
    return NextResponse.json({ boards });
  }
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { action, boardId, title, background, randomRotation, cards } = body;

  if (action === "create") {
    const count = await prisma.board.count({ where: { userId: session.user.id } });
    if (count >= 10) return NextResponse.json({ error: "LIMIT_REACHED" }, { status: 403 });

    const newBoard = await prisma.board.create({
      data: {
        userId: session.user.id,
        title: title || "New Vision Board",
        background: background || "dots",
        randomRotation: randomRotation !== undefined ? randomRotation : true,
        content: cards || [],
      }
    });
    return NextResponse.json(newBoard);
  }

  if (action === "update" && boardId) {
    if (getSizeInMB(cards) > 100) return NextResponse.json({ error: "SIZE_LIMIT_EXCEEDED" }, { status: 413 });

    const board = await prisma.board.update({
      where: { id: boardId, userId: session.user.id },
      data: { 
          content: cards !== undefined ? cards : undefined,
          background: background !== undefined ? background : undefined,
          randomRotation: randomRotation !== undefined ? randomRotation : undefined
      },
    });

    // History Snapshot (Only if content changed)
    if (cards) {
        await prisma.boardHistory.create({ data: { boardId, content: cards } });
        const historyCount = await prisma.boardHistory.count({ where: { boardId } });
        if (historyCount > 10) {
            const old = await prisma.boardHistory.findMany({
                where: { boardId }, orderBy: { createdAt: 'asc' }, take: historyCount - 10, select: { id: true }
            });
            await prisma.boardHistory.deleteMany({ where: { id: { in: old.map(r => r.id) } } });
        }
    }

    const history = await prisma.boardHistory.findMany({
       where: { boardId }, orderBy: { createdAt: 'desc' }, take: 10,
       select: { id: true, createdAt: true, content: true }
    });

    return NextResponse.json({ updatedAt: board.updatedAt, history });
  }
  
  if (action === "rename" && boardId) {
      const board = await prisma.board.update({
          where: { id: boardId, userId: session.user.id },
          data: { title: title }
      });
      return NextResponse.json(board);
  }

  if (action === "delete" && boardId) {
      await prisma.board.delete({ where: { id: boardId, userId: session.user.id } });
      return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}