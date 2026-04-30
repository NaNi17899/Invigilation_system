import express from 'express'
import dayjs from 'dayjs'
import multer from 'multer'
import { parseCsv } from '../lib/csv.js'
import { Faculty } from '../models/Faculty.js'
import { Classroom } from '../models/Classroom.js'
import { Exam } from '../models/Exam.js'

const router = express.Router()
const upload = multer({ storage: multer.memoryStorage() })

router.post('/faculty', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const rows = parseCsv(req.file.buffer)
    const normalizeKey = (row, ...keys) => {
      const lowerKeys = keys.map(k => k.toLowerCase().replace(/[\s_-]/g, ''))
      const foundKey = Object.keys(row).find(rk => lowerKeys.includes(rk.toLowerCase().replace(/[\s_-]/g, '')))
      return foundKey ? row[foundKey] : undefined
    }

    // Load all current faculty to check for matches manually (avoids complex bulkWrite filter conflicts)
    const existing = await Faculty.find({}).lean()
    const ops = []

    for (const r of rows) {
      const email = normalizeKey(r, 'email')
      const facultyId = normalizeKey(r, 'facultyId', 'id', 'employeeId')
      if (!email && !facultyId) continue

      // Try to find an existing doc by either identifier
      const match = existing.find(f => 
        (email && f.email === email) || 
        (facultyId && f.facultyId === facultyId)
      )

      const finalEmail = email || match?.email || `${facultyId}@system.local`
      const updateData = {
        facultyId: facultyId || match?.facultyId,
        name: normalizeKey(r, 'name') || match?.name,
        email: finalEmail,
        department: normalizeKey(r, 'department', 'dept') || match?.department || 'General',
        designation: normalizeKey(r, 'designation', 'desig') || match?.designation || 'Assistant Professor',
        maxHoursPerDay: Number(normalizeKey(r, 'maxHoursPerDay', 'maxHours') || match?.maxHoursPerDay || 2),
        weeklyCap: Number(normalizeKey(r, 'weeklyCap', 'cap') || match?.weeklyCap || 10),
      }

      if (match) {
        ops.push({
          updateOne: {
            filter: { _id: match._id },
            update: { $set: updateData }
          }
        })
      } else {
        ops.push({
          insertOne: {
            document: { ...updateData, role: 'faculty' }
          }
        })
      }
    }

    if (ops.length) {
      try {
        await Faculty.bulkWrite(ops)
      } catch (bulkErr) {
        console.error('BulkWrite Error:', bulkErr)
        throw bulkErr
      }
    }

    res.json({ imported: ops.length })
  } catch (e) {
    console.error('Faculty upload exception:', e)
    res.status(500).json({ error: 'Faculty upload failed', details: e.message })
  }
})


router.post('/classrooms', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const rows = parseCsv(req.file.buffer)
    const normalizeKey = (row, ...keys) => {
      const lowerKeys = keys.map(k => k.toLowerCase().replace(/[\s_-]/g, ''))
      const foundKey = Object.keys(row).find(rk => lowerKeys.includes(rk.toLowerCase().replace(/[\s_-]/g, '')))
      return foundKey ? row[foundKey] : undefined
    }

    const ops = rows.map(r => {
      const code = normalizeKey(r, 'code', 'roomCode')
      if (!code) return null
      return {
        updateOne: {
          filter: { code },
          update: { $set: {
            code,
            building: normalizeKey(r, 'building'),
            roomNumber: normalizeKey(r, 'roomNumber', 'roomNo'),
            capacity: Number(normalizeKey(r, 'capacity') || 30)
          } },
          upsert: true
        }
      }
    }).filter(Boolean)
    if (ops.length) await Classroom.bulkWrite(ops)

    res.json({ imported: ops.length })
  } catch (e) {
    res.status(500).json({ error: 'Classrooms upload failed', details: e.message })
  }
})

router.post('/exams', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' })
    const rows = parseCsv(req.file.buffer)
    const normalizeKey = (row, ...keys) => {
      const lowerKeys = keys.map(k => k.toLowerCase().replace(/[\s_-]/g, ''))
      const foundKey = Object.keys(row).find(rk => lowerKeys.includes(rk.toLowerCase().replace(/[\s_-]/g, '')))
      return foundKey ? row[foundKey] : undefined
    }

    const map = new Map()
    for (const r of rows) {
      const courseCode = normalizeKey(r, 'courseCode', 'courseId', 'code')
      const rawDate = normalizeKey(r, 'date', 'examDate')
      const slot = normalizeKey(r, 'slot', 'timeSlot', 'period')
      if (!courseCode || !rawDate || !slot) continue

      const date = dayjs(rawDate).format('YYYY-MM-DD')
      if (date === 'Invalid Date') {
        console.warn(`Invalid date encountered: ${rawDate}`)
        continue
      }

      const key = `${courseCode}|${date}|${slot}`
      if (!map.has(key)) map.set(key, {
        courseCode,
        courseName: normalizeKey(r, 'courseName', 'subjectName', 'name'),
        date,
        slot,
        rooms: []
      })
      map.get(key).rooms.push({ 
        classroomCode: normalizeKey(r, 'classroomCode', 'room', 'roomCode'), 
        neededInvigilators: Number(normalizeKey(r, 'neededInvigilators', 'invigilators', 'count') || 1) 
      })
    }
    const upserts = []
    for (const value of map.values()) {
      upserts.push({
        updateOne: {
          filter: { courseCode: value.courseCode, date: value.date, slot: value.slot },
          update: { $set: value },
          upsert: true
        }
      })
    }
    if (upserts.length) await Exam.bulkWrite(upserts)

    res.json({ imported: rows.length, grouped: upserts.length })
  } catch (e) {
    res.status(500).json({ error: 'Exams upload failed', details: e.message })
  }
})

router.get('/exams/dates', async (req, res) => {
  try {
    const dates = await Exam.distinct('date')
    res.json({ dates: dates.sort() })
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch dates', details: e.message })
  }
})

export default router

