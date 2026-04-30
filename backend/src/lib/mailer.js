import nodemailer from 'nodemailer'

let cachedTransport

export async function getTransport() {
  const host = process.env.SMTP_HOST
  const port = Number(process.env.SMTP_PORT || 587)
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS

  console.log('--- Mailer Config ---', { host, port, user, hasPass: !!pass })
  
  if (!host || !user || !pass) {
    console.log('Mailer falling back to Ethereal')
    const testAcc = await nodemailer.createTestAccount()
    return nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      auth: { user: testAcc.user, pass: testAcc.pass },
    })
  }

  if (host.includes('gmail.com')) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass }
    })
  }

  return nodemailer.createTransport({ 
    host, 
    port, 
    secure: port === 465,
    auth: { user, pass } 
  })
}


export async function sendMail({ to, subject, html, text }) {
  try {
    const from = process.env.FROM_EMAIL || 'Invigilator System <no-reply@example.com>'
    const transporter = await getTransport()
    const info = await transporter.sendMail({ from, to, subject, html, text })
    const previewUrl = nodemailer.getTestMessageUrl(info)
    return { messageId: info.messageId, previewUrl }
  } catch (err) {
    console.error('Nodemailer sendMail error:', err)
    throw err
  }
}

