import dayjs from 'dayjs'
import { Exam } from '../models/Exam.js'
import { Faculty } from '../models/Faculty.js'
import { Allocation } from '../models/Allocation.js'
import { Settings } from '../models/Settings.js'

function isAvailableOnDateAndSlot(fac, date, slot) {
  if (!fac.availability || fac.availability.length === 0) return true // assume available if not provided
  const d = dayjs(date)
  const dow = d.day()
  for (const a of fac.availability) {
    if (a.date && a.date === date && a.slots?.includes(slot)) return true
    if (typeof a.dayOfWeek === 'number' && a.dayOfWeek === dow && a.slots?.includes(slot)) return true
  }
  return false
}

function weightForFaculty(fac, constraints) {
  const deptW = Number(constraints?.departmentWeighting?.get?.(fac.department) ?? constraints?.departmentWeighting?.[fac.department] ?? 1)
  const desigW = Number(constraints?.designationWeighting?.get?.(fac.designation) ?? constraints?.designationWeighting?.[fac.designation] ?? 1)
  const loadPenalty = 1 / (1 + fac.currentLoad)
  return deptW * desigW * loadPenalty
}

async function loadConstraints() {
  const doc = await Settings.findOne({ key: 'global' })
  return doc?.constraints || { maxHoursPerDay: 2, noSameDayRepeat: true }
}

export async function generateScheduleForDate(date, neededOverride = null) {
  const constraints = await loadConstraints()
  const exams = await Exam.find({ date })
  const faculties = await Faculty.find({}).lean()

  // Pre-load all allocations for the date to avoid DB calls in loops
  const existingAllocations = await Allocation.find({ date }).lean()

  const dailyLoadMap = new Map() // key: facultyId -> number for date
  const allocationsToInsert = []

  for (const exam of exams) {
    const slot = exam.slot
    for (const room of exam.rooms) {
      let needed = Math.max(1, Number(room.neededInvigilators || 1))
      if (neededOverride && Number(neededOverride) > 0) {
        needed = Number(neededOverride)
      }
      
      for (let i = 0; i < needed; i++) {
        // Build candidate pool from memory
        const candidates = faculties.filter(f => {
          const id = String(f._id)
          // Current day load from DB + staged additions
          const dayCount = ((f.dailyLoad && f.dailyLoad[date]) || 0) + (dailyLoadMap.get(id) || 0)
          
          if (constraints.maxHoursPerDay && dayCount >= constraints.maxHoursPerDay) return false
          if (!isAvailableOnDateAndSlot(f, date, slot)) return false
          
          // Check if already assigned to this date+slot in DB or in current staged allocations
          const isTakenSameSlot = existingAllocations.some(a => a.invigilatorId && String(a.invigilatorId) === id && a.slot === slot) ||
                                 allocationsToInsert.some(a => a.invigilatorId && String(a.invigilatorId) === id && a.slot === slot)
          if (isTakenSameSlot) return false

          // No same day repeat constraint
          if (constraints.noSameDayRepeat) {
            const isTakenSameDay = existingAllocations.some(a => a.invigilatorId && String(a.invigilatorId) === id) ||
                                  allocationsToInsert.some(a => a.invigilatorId && String(a.invigilatorId) === id)
            if (isTakenSameDay) return false
          }

          return true
        })

        if (candidates.length === 0) {
          allocationsToInsert.push({
            examId: exam._id,
            date,
            slot,
            classroomCode: room.classroomCode,
            invigilatorId: null,
            status: 'pending',
          })
          continue
        }

        // Rank by weight
        candidates.sort((a, b) => weightForFaculty(b, constraints) - weightForFaculty(a, constraints))
        const chosen = candidates[0]

        allocationsToInsert.push({
          examId: exam._id,
          date,
          slot,
          classroomCode: room.classroomCode,
          invigilatorId: chosen._id,
          status: 'assigned',
        })

        // Update local load counters
        const key = String(chosen._id)
        dailyLoadMap.set(key, (dailyLoadMap.get(key) || 0) + 1)
      }
    }
  }

  // Commit allocations and faculty load updates
  if (allocationsToInsert.length) {
    await Allocation.insertMany(allocationsToInsert)
  }
  
  for (const [id, dayCount] of dailyLoadMap.entries()) {
    await Faculty.updateOne(
      { _id: id },
      {
        $inc: { 
          currentLoad: dayCount, 
          [`dailyLoad.${date}`]: dayCount 
        }
      }
    )
  }


  const created = await Allocation.find({ date }).populate('invigilatorId', 'name email department designation').lean()
  return created
}


export async function getScheduleForDate(date) {
  const rows = await Allocation.find({ date }).populate('invigilatorId', 'name email department designation').lean()
  return rows
}

export async function reassignAllocation(allocationId, toFacultyId) {
  const alloc = await Allocation.findById(allocationId)
  if (!alloc) throw new Error('Allocation not found')
  const fac = await Faculty.findById(toFacultyId)
  if (!fac) throw new Error('Faculty not found')
  // simple swap without deep checks for brevity; could enforce constraints here as well
  alloc.invigilatorId = fac._id
  alloc.status = 'assigned'
  await alloc.save()
  return alloc
}
