import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { createEmailTransport } from "@/lib/email";
import { prisma } from "@/lib/prisma";

const announcementSchema = z.object({
  title: z.string().trim().min(2).max(150).refine((value) => !/[\r\n]/.test(value), "The title cannot contain line breaks."),
  details: z.string().trim().min(1).max(5000),
});

const EMAIL_BATCH_SIZE = 50;

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (session?.user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Admin access is required." }, { status: 403 });
  }

  let requestBody: unknown;
  try {
    requestBody = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid announcement data." }, { status: 400 });
  }

  const parsed = announcementSchema.safeParse(requestBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid announcement data." }, { status: 400 });
  }
  if (!process.env.SMTP_HOST) {
    return NextResponse.json({ error: "Email delivery is not configured. Configure SMTP before sending announcements." }, { status: 503 });
  }

  const recipients = await prisma.user.findMany({
    select: { email: true },
    orderBy: { createdAt: "asc" },
  });
  if (recipients.length === 0) {
    return NextResponse.json({ error: "There are no registered email addresses to send to." }, { status: 400 });
  }

  const transporter = createEmailTransport();
  const from = process.env.EMAIL_FROM ?? "Scholarship Community <noreply@example.com>";
  const htmlTitle = escapeHtml(parsed.data.title);
  const htmlDetails = escapeHtml(parsed.data.details).replace(/\r?\n/g, "<br>");
  let sentCount = 0;
  let batchNumber = 0;

  try {
    for (let start = 0; start < recipients.length; start += EMAIL_BATCH_SIZE) {
      const batch = recipients.slice(start, start + EMAIL_BATCH_SIZE).map((recipient) => recipient.email);
      batchNumber += 1;
      const result = await transporter.sendMail({
        from,
        to: "undisclosed-recipients:;",
        bcc: batch,
        subject: parsed.data.title,
        text: `${parsed.data.title}\n\n${parsed.data.details}`,
        html: `<main style="font-family:Arial,sans-serif;line-height:1.6"><h1>${htmlTitle}</h1><p>${htmlDetails}</p><hr><p>Scholarship Community</p></main>`,
      });
      sentCount += result.accepted.length;
      if (result.rejected.length > 0 || result.accepted.length !== batch.length) {
        console.error("Admin announcement email batch was partially accepted", {
          batchNumber,
          acceptedCount: result.accepted.length,
          rejectedCount: result.rejected.length,
        });
        return NextResponse.json({
          error: `Email sending stopped after the mail server accepted ${sentCount} of ${recipients.length} addresses. Check delivery before retrying to avoid duplicate emails.`,
          sentCount,
          totalCount: recipients.length,
        }, { status: 502 });
      }
    }
  } catch {
    console.error("Admin announcement email batch failed", { batchNumber, sentCount, totalCount: recipients.length });
    return NextResponse.json({
      error: `Email sending stopped after the mail server accepted ${sentCount} of ${recipients.length} addresses. Check delivery before retrying to avoid duplicate emails.`,
      sentCount,
      totalCount: recipients.length,
    }, { status: 502 });
  } finally {
    transporter.close();
  }

  return NextResponse.json({
    sentCount,
    message: `Announcement accepted by the mail server for ${sentCount} registered accounts.`,
  });
}
