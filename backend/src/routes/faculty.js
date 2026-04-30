import express from 'express'
import { Allocation } from '../models/Allocation.js'
import { Request as Req } from '../models/Request.js'
import { requireAuth } from '../middleware/auth.js'
import { Faculty } from '../models/Faculty.js'

const router = express.Router()

// Get my allocations
router.get('/me/allocations', requireAuth, async (req, res) => {
  const userId = req.user?.id
  const rows = await Allocation.find({ invigilatorId: userId }).lean()
  res.json(rows)
})

// Submit change/replacement request
router.post('/requests', requireAuth, async (req, res) => {
  const userId = req.user?.id
  const { allocationId, type = 'change', reason = '' } = req.body
  if (!allocationId) return res.status(400).json({ error: 'allocationId required' })
  const doc = await Req.create({ facultyId: userId, allocationId, type, reason })
  res.json(doc)
})

// List my requests
router.get('/requests', requireAuth, async (req, res) => {
  const userId = req.user?.id
  const rows = await Req.find({ facultyId: userId }).lean()
  res.json(rows)
})

export default router

// Admin search faculties (basic)
router.get('/search', async (req, res) => {
  const q = String(req.query.q || '').trim()
  if (!q) return res.json([])
  const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')
  const list = await Faculty.find({
    $or: [
      { name: regex },
      { email: regex },
      { department: regex },
      { designation: regex },
    ]
  }).limit(20).select('name email department designation').lean()
  res.json(list)
})
