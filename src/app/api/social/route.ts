import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { PrismaClient } from "@prisma/client";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

const prisma = new PrismaClient();
const ADMIN_EMAIL = "wldud5192@gmail.com"; // Ava's Email

export async function GET(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const userId = session.user.id;

  // 1. Get Real Friends (Accepted Requests)
  const friendships = await prisma.friendship.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      status: "ACCEPTED"
    },
    include: {
      sender: { select: { id: true, name: true, image: true, role: true } },
      receiver: { select: { id: true, name: true, image: true, role: true } }
    }
  });

  // Transform into a clean list of "Friend" objects
  let friends = friendships.map(f => f.senderId === userId ? f.receiver : f.sender);

  // 2. FORCE ADD "AVA" (The Dev)
  // We check if Ava exists in DB first
  const ava = await prisma.user.findUnique({ 
    where: { email: ADMIN_EMAIL },
    select: { id: true, name: true, image: true, role: true }
  });

  if (ava && ava.id !== userId) {
    // Only add if not already in the list (to avoid duplicates if we actually friend her)
    if (!friends.find(f => f.id === ava.id)) {
        friends.unshift(ava); // Add to top of list
    }
  }

  return NextResponse.json({ friends });
}

// Handle Friend Requests
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { action, targetEmail } = await req.json();

  if (action === "invite") {
      const target = await prisma.user.findUnique({ where: { email: targetEmail } });
      if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

      await prisma.friendship.create({
          data: { senderId: session.user.id, receiverId: target.id, status: "ACCEPTED" } // Auto-accept for MVP
      });
      return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}