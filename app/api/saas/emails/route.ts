import { NextRequest, NextResponse } from 'next/server'
import { requireSuperAdmin } from '@/lib/org'
import { prisma } from '@/lib/prisma'
import { Resend } from 'resend'
import { DEFAULT_SIGNATURE, SignatureConfig } from '../config/route'

const resend = new Resend(process.env.RESEND_API_KEY)

function generateSignatureHtml(sig: SignatureConfig) {
  let logoUrl = sig.logoUrl
  if (logoUrl && logoUrl.startsWith('/')) {
    logoUrl = `https://agendio.cl${logoUrl}`
  }

  return `
<br/><br/>
<table cellpadding="0" cellspacing="0" border="0" style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #555;">
  <tr>
    ${logoUrl ? `<td style="padding-right: 16px; vertical-align: middle;">
      <img src="${logoUrl}" alt="Logo" width="48" height="48" style="border-radius: 8px; display: block;" />
    </td>` : ''}
    <td style="vertical-align: middle; border-left: 2px solid #e5e7eb; padding-left: 16px;">
      <p style="margin: 0; font-weight: 700; color: #111; font-size: 14px;">${sig.name}</p>
      <p style="margin: 2px 0 0 0; color: #666; font-size: 12px;">${sig.role}</p>
      ${sig.web ? `<p style="margin: 6px 0 0 0;">
        <a href="${sig.web}" style="color: #16a34a; text-decoration: none; font-size: 12px;">🌐 ${sig.web}</a>
      </p>` : ''}
      ${sig.email ? `<p style="margin: 2px 0 0 0;">
        <a href="mailto:${sig.email}" style="color: #16a34a; text-decoration: none; font-size: 12px;">✉ ${sig.email}</a>
      </p>` : ''}
    </td>
  </tr>
</table>
`
}

// POST /api/saas/emails — Send an email
export async function POST(req: NextRequest) {
  try {
    await requireSuperAdmin()
    const body = await req.json()
    const { to, recipientAlias, region, subject, message } = body

    if (!to || !subject || !message) {
      return NextResponse.json({ error: 'Faltan campos requeridos: destinatario, asunto o mensaje.' }, { status: 400 })
    }

    const finalRegion = region?.trim() || 'Algarrobo'

    // Fetch dynamic signature from SaasConfig
    let sig: SignatureConfig = DEFAULT_SIGNATURE
    try {
      if ((prisma as any).saasConfig) {
        const configRow = await (prisma as any).saasConfig.findUnique({
          where: { key: 'email_signature' },
        })
        if (configRow?.value) {
          sig = { ...DEFAULT_SIGNATURE, ...JSON.parse(configRow.value) }
        }
      }
    } catch (e) {
      console.error('Error fetching signature config:', e)
    }

    const signatureHtml = generateSignatureHtml(sig)

    // Build the HTML body: message (preserving line breaks) + dynamic signature
    const messageHtml = message
      .split('\n')
      .map((line: string) => `<p style="margin: 0 0 8px 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 14px; color: #1a1a1a; line-height: 1.7;">${line || '&nbsp;'}</p>`)
      .join('')

    const fullHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /></head>
<body style="background: #ffffff; margin: 0; padding: 0;">
  <div style="padding: 28px 32px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
    ${messageHtml}
    ${signatureHtml}
  </div>
</body>
</html>`

    let resendId: string | undefined
    let status = 'sent'

    try {
      const result = await resend.emails.send({
        from: 'Contacto Agendio <contacto@agendio.cl>',
        to,
        subject,
        html: fullHtml,
      })
      resendId = (result?.data as any)?.id ?? undefined
    } catch {
      status = 'failed'
    }

    // Persist to DB
    const record = await prisma.saasEmail.create({
      data: {
        to,
        recipientAlias: recipientAlias?.trim() || null,
        region: finalRegion,
        subject,
        bodyHtml: fullHtml,
        status,
        resendId: resendId ?? null,
      }
    })

    // Upsert lead tracking record
    try {
      if ((prisma as any).saasLead) {
        await (prisma as any).saasLead.upsert({
          where: { email: to.toLowerCase().trim() },
          update: {
            ...(recipientAlias && { alias: recipientAlias.trim() }),
            region: finalRegion,
          },
          create: {
            email: to.toLowerCase().trim(),
            alias: recipientAlias?.trim() || null,
            region: finalRegion,
            serviceStatus: 'pending',
          },
        })
      }
    } catch (e) {
      console.error('Error upserting SaasLead:', e)
    }

    if (status === 'failed') {
      return NextResponse.json({ error: 'El correo no pudo enviarse mediante Resend.' }, { status: 502 })
    }

    return NextResponse.json(record)
  } catch (error: any) {
    console.error('SaasEmail POST error:', error)
    return NextResponse.json({ error: 'Error interno al enviar correo.' }, { status: 500 })
  }
}

// GET /api/saas/emails — List sent emails
export async function GET() {
  try {
    await requireSuperAdmin()
    const emails = await prisma.saasEmail.findMany({
      orderBy: { sentAt: 'desc' },
      take: 200,
    })
    return NextResponse.json(emails)
  } catch (error: any) {
    console.error('SaasEmail GET error:', error)
    return NextResponse.json({ error: 'Error al obtener correos.' }, { status: 500 })
  }
}
