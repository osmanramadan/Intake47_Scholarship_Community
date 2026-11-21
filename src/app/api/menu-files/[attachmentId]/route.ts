import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  }

  const { attachmentId } = await params;
  const attachment = await prisma.menuAttachment.findUnique({
    where: { id: attachmentId },
    select: { url: true, fileName: true, fileType: true, resourceType: true },
  });
  if (!attachment || attachment.fileType !== "application/pdf") {
    return NextResponse.json({ error: "PDF not found." }, { status: 404 });
  }

  try {
    const response = await fetch(attachment.url);
    if (!response.ok) {
      return NextResponse.json({ error: "Could not load the PDF." }, { status: 502 });
    }
    const pdf = await response.arrayBuffer();
    return new NextResponse(pdf, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${attachment.fileName.replaceAll('"', "")}"`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Menu PDF streaming failed", error);
    return NextResponse.json({ error: "Could not load the PDF." }, { status: 502 });
  }
}
