import { Faculty } from '../models/Faculty.js'
import { hashPassword } from './hash.js'

export async function bootstrapAdmin() {
  const email = process.env.ADMIN_EMAIL
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME || 'Admin'
  if (!email || !password) return
  const exists = await Faculty.findOne({ email })
  if (exists) return
  const passwordHash = await hashPassword(password)
  await Faculty.create({ name, email, passwordHash, department: 'ADMIN', designation: 'ADMIN', role: 'admin' })
  console.log(`Bootstrapped admin: ${email}`)
}
