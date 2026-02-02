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
  const targetUserId = searchParams.get("userId") || session.user.id;

  if (boardId) {
    const board = await prisma.board.findFirst({
      where: { id: boardId, userId: targetUserId },
      include: { history: { orderBy: { createdAt: 'desc' }, take: 10 } }
    });
    return NextResponse.json(board || { error: "Not found" });
  } else {
    const boards = await prisma.board.findMany({
      where: { userId: targetUserId },
      select: { id: true, title: true, updatedAt: true, background: true, randomRotation: true },
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
        // Prisma usually handles updatedAt automatically, but setting it explicitly is safer
        updatedAt: new Date(), 
      }
    });
    return NextResponse.json(newBoard);
  }

  if (action === "update" && boardId) {
    if (getSizeInMB(cards) > 100) return NextResponse.json({ error: "SIZE_LIMIT_EXCEEDED" }, { status: 413 });

    // SAFETY GUARD: Prevent overwriting a board with empty data if it looks like an error
    // If cards is an empty array, we proceed only if the user explicitly deleted everything (handled by UI), 
    // but this prevents "undefined" or "null" wipes.
    if (!Array.isArray(cards)) return NextResponse.json({ error: "INVALID_CONTENT" }, { status: 400 });

    const now = new Date(); // Capture exact time of update

    const board = await prisma.board.update({
      where: { id: boardId, userId: session.user.id },
      data: { 
          content: cards,
          background: background !== undefined ? background : undefined,
          randomRotation: randomRotation !== undefined ? randomRotation : undefined,
          updatedAt: now // <--- FIX 1: Explicitly set the date
      },
    });

    // History Snapshot
    // FIX 2: Only create history if there is actual content to save
    // This prevents filling the history buffer with "empty" states
    if (cards && cards.length > 0) {
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

    // FIX 3: Return the 'now' variable to ensure frontend gets a valid date object
    return NextResponse.json({ updatedAt: now, history });
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