import express from 'express'
import { Faculty } from '../models/Faculty.js'
import { hashPassword, comparePassword } from '../lib/hash.js'
import { signJwt } from '../lib/jwt.js'

const router = express.Router()

router.post('/register', async (req, res) => {
  try {
    const { name, email, password, department = 'ADMIN', designation = 'ADMIN', role = 'admin' } = req.body
    if (!name || !email || !password) return res.status(400).json({ error: 'Missing fields' })
    const exists = await Faculty.findOne({ email })
    if (exists) return res.status(409).json({ error: 'User already exists' })
    const passwordHash = await hashPassword(password)
    const doc = await Faculty.create({ name, email, passwordHash, department, designation, role })
    const token = signJwt({ id: doc._id, role: doc.role, email: doc.email, name: doc.name })
    res.json({ token, user: { id: doc._id, name: doc.name, email: doc.email, role: doc.role } })
  } catch (e) {
    res.status(500).json({ error: 'Register failed', details: e.message })
  }
})

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await Faculty.findOne({ email })
    if (!user || !user.passwordHash) return res.status(401).json({ error: 'Invalid credentials' })
    const ok = await comparePassword(password, user.passwordHash)
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' })
    const token = signJwt({ id: user._id, role: user.role, email: user.email, name: user.name })
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } })
  } catch (e) {
    res.status(500).json({ error: 'Login failed', details: e.message })
  }
})

export default router
