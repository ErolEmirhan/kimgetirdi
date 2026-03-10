import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

const RESEND_API_KEY = process.env.RESEND_API_KEY ?? "re_B41kh3pS_DB8y3SoL9fNdwLmeMMbaJLQu";
const resend = new Resend(RESEND_API_KEY);

type Body = {
  to: string[];
  subject: string;
  html: string;
};

export async function POST(req: NextRequest) {
  try {
    const json = (await req.json()) as Body;
    const to = Array.isArray(json.to) ? json.to.map((e) => e.trim()).filter(Boolean) : [];
    const subject = json.subject?.trim();
    const html = json.html?.trim();

    if (!to.length || !subject || !html) {
      return NextResponse.json({ error: "Alıcı listesi, konu ve HTML zorunludur." }, { status: 400 });
    }

    const { error } = await resend.emails.send({
      from: "KimGetirdi <noreply@kimgetirdi.info>",
      to,
      subject,
      html,
    });

    if (error) {
      console.error("Bulk email error from Resend:", error);
      return NextResponse.json({ error: "E-postalar gönderilemedi." }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count: to.length });
  } catch (error) {
    console.error("Bulk email error", error);
    return NextResponse.json({ error: "E-postalar gönderilemedi." }, { status: 500 });
  }
}

