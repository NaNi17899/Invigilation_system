import express from 'express'
import { generateScheduleForDate, getScheduleForDate, reassignAllocation } from '../services/scheduler.js'
import { Allocation } from '../models/Allocation.js'
import { Faculty } from '../models/Faculty.js'
import { sendMail } from '../lib/mailer.js'

const router = express.Router()

router.post('/generate', async (req, res) => {
  try {
    const date = req.query.date || req.body.date
    const neededOverride = req.query.neededOverride || req.body.neededOverride
    if (!date) return res.status(400).json({ error: 'date is required (YYYY-MM-DD)' })
    const rows = await generateScheduleForDate(date, neededOverride)
    res.json({ date, count: rows.length, data: rows })
  } catch (e) {
    res.status(500).json({ error: 'Generate failed', details: e.message })
  }
})

router.get('/day', async (req, res) => {
  try {
    const { date } = req.query
    if (!date) return res.status(400).json({ error: 'date is required' })
    const rows = await getScheduleForDate(date)
    res.json({ date, data: rows })
  } catch (e) {
    res.status(500).json({ error: 'Fetch failed', details: e.message })
  }
})

router.patch('/reassign/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { toFacultyId } = req.body
    if (!toFacultyId) return res.status(400).json({ error: 'toFacultyId required' })
    const updated = await reassignAllocation(id, toFacultyId)
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: 'Reassign failed', details: e.message })
  }
})

router.get('/export/day.csv', async (req, res) => {
  try {
    const { date } = req.query
    if (!date) return res.status(400).json({ error: 'date is required' })
    const rows = await Allocation.find({ date }).populate('invigilatorId', 'name email department designation').lean()
    const header = ['date','slot','classroomCode','invigilatorName','email','department','designation']
    const csv = [header.join(',')].concat(rows.map(r => [
      r.date,
      r.slot,
      r.classroomCode,
      r.invigilatorId?.name || '',
      r.invigilatorId?.email || '',
      r.invigilatorId?.department || '',
      r.invigilatorId?.designation || ''
    ].map(v => `"${String(v).replaceAll('"','\"')}"`).join(','))).join('\n')
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="schedule_${date}.csv"`)
    res.send(csv)
  } catch (e) {
    res.status(500).json({ error: 'Export failed', details: e.message })
  }
})

router.post('/notify/day', async (req, res) => {
  try {
    const date = req.query.date || req.body.date
    console.log('--- Notify Request Received ---', { date })
    console.log('Notification request received for date:', date)
    if (!date) return res.status(400).json({ error: 'date is required' })
    const rows = await Allocation.find({ date }).populate('invigilatorId', 'name email').lean()
    let sent = 0, previews = []
    for (const r of rows) {
      if (!r.invigilatorId?.email) continue
      const subject = `Invigilation Duty on ${r.date} (${r.slot})`
      const html = `<p>Dear ${r.invigilatorId.name},</p>
        <p>You are assigned invigilation in room <b>${r.classroomCode}</b> on <b>${r.date}</b> (${r.slot}).</p>
        <p>Regards,<br/>Exam Cell</p>`
      const out = await sendMail({ to: r.invigilatorId.email, subject, html, text: subject })
      sent += 1
      if (out.previewUrl) previews.push(out.previewUrl)
    }
    res.json({ sent, previews })
  } catch (e) {
    console.error('Notify route error details:', e)
    res.status(500).json({ error: 'Notify failed', details: e.message })
  }
})


export default router
