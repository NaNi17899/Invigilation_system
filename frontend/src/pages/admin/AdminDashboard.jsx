import React, { useEffect, useState } from 'react'
import jsPDF from 'jspdf'
import dayjs from 'dayjs'
import { AdminUpload } from '../../components/AdminUpload'
import { api } from '../../lib/api'

export function AdminDashboard() {
  const [date, setDate] = useState(dayjs().format('YYYY-MM-DD'))
  const [constraints, setConstraints] = useState({ maxHoursPerDay: 2, noSameDayRepeat: true })
  const [rows, setRows] = useState([])
  const [msg, setMsg] = useState('')
  const [availableDates, setAvailableDates] = useState([])
  const [loading, setLoading] = useState(false)
  const [reassign, setReassign] = useState({}) // legacy (not used)
  const [quick, setQuick] = useState({ slot: 'FN', room: '', q: '', results: [], chosenId: '' })
  const [neededOverride, setNeededOverride] = useState(1)


  async function loadConstraints() {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL}/settings/constraints`).then(r=>r.json())
      setConstraints(res)
    } catch {}
  }

  // When slot/room changes, auto-fill current faculty into the chooser
  useEffect(() => {
    const room = (quick.room || '').trim().toUpperCase()
    const slot = quick.slot
    if (!room) return
    const target = rows.find(r => r.slot === slot && String(r.classroomCode).toUpperCase() === room)
    if (!target) {
      setQuick(v => ({ ...v, chosenId: '', results: v.results }))
      return
    }
    const f = target.invigilatorId
    if (f && f._id) {
      // Ensure option list includes current assignee so it can appear selected immediately
      setQuick(v => {
        const exists = (v.results || []).some(x => x._id === f._id)
        const results = exists ? v.results : [{ _id: f._id, name: f.name, email: f.email, department: f.department, designation: f.designation }, ...(v.results || [])]
        return { ...v, chosenId: f._id, q: f.email || f.name || v.q, results }
      })
    } else {
      setQuick(v => ({ ...v, chosenId: '' }))
    }
  }, [quick.room, quick.slot, rows])

  function downloadPdf() {
    const doc = new jsPDF({ orientation: 'landscape' })
    doc.setFontSize(14)
    doc.text(`Invigilator Schedule - ${date}`, 14, 14)
    doc.setFontSize(10)
    const headers = ['Date','Slot','Room','Invigilator','Email','Department','Designation','Status']
    const widths = [24, 16, 26, 50, 60, 35, 35, 20] // total ~266 fits landscape A4
    let y = 22

    function drawHeader() {
      let x = 14
      doc.setFont(undefined, 'bold')
      headers.forEach((h, i)=>{ doc.text(String(h), x, y); x += widths[i] })
      doc.setFont(undefined, 'normal')
      y += 6
    }

    function ensurePage() {
      if (y > 190) { // margin for footer
        doc.addPage('l')
        y = 14
        drawHeader()
      }
    }

    drawHeader()
    rows.forEach(r => {
      ensurePage()
      let x = 14
      const cells = [
        r.date,
        r.slot,
        r.classroomCode,
        r.invigilatorId?.name || 'TBD',
        r.invigilatorId?.email || '',
        r.invigilatorId?.department || '',
        r.invigilatorId?.designation || '',
        r.status || '',
      ]
      cells.forEach((val, i) => {
        const text = String(val)
        doc.text(text.length > 28 ? text.slice(0,27)+'…' : text, x, y)
        x += widths[i]
      })
      y += 6
    })

    const fname = `schedule_${date}.pdf`
    doc.save(fname)
  }

  // Quick reassign helpers
  function roomsForSlot(slot) {
    return Array.from(new Set(rows.filter(r => r.slot === slot).map(r => r.classroomCode))).sort()
  }

  async function onQuickSearch() {
    if (!quick.q) return
    try {
      const list = await api.facultySearch(quick.q)
      setQuick(v => ({ ...v, results: list }))
    } catch {}
  }

  async function onQuickReassign() {
    setMsg('')
    const room = (quick.room || '').trim().toUpperCase()
    const slot = quick.slot
    const target = rows.find(r => r.slot === slot && String(r.classroomCode).toUpperCase() === room)
    if (!target) {
      setMsg('No allocation found for selected date/slot/room')
      return
    }
    if (!quick.chosenId) {
      setMsg('Choose a faculty to reassign')
      return
    }
    setMsg('Reassigning...')
    try {
      await api.reassign(target._id, quick.chosenId)
      await loadDay()
      setMsg(`Reassigned ${room} (${slot}) successfully`)
      setQuick(v => ({ ...v, chosenId: '' }))
    } catch (e) {
      setMsg(e.message)
    }
  }

  async function saveConstraints() {
    setMsg('Saving constraints...')
    await fetch(`${import.meta.env.VITE_API_URL}/settings/constraints`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(constraints) })
    setMsg('Constraints saved')
  }

  async function generate() {
    setLoading(true); setMsg('Generating...')
    try {
      const res = await api.generateSchedule(date, neededOverride)
      setRows(res.data || [])
      if (res.count === 0) {
        setMsg(`Generated 0 allocations for ${date}. (Check if exams exist for this date)`)
      } else {
        setMsg(`Generated ${res.count} allocations for ${date}`)
      }
    } catch (e) { setMsg(e.message) }
    setLoading(false)
  }


  async function loadDay() {
    setLoading(true)
    try {
      const res = await api.scheduleForDay(date)
      setRows(res.data || [])
    } finally { setLoading(false) }
  }

  async function notify() {
    setMsg('Sending emails...')
    try {
      const res = await api.notifyDay(date)
      setMsg(`Emails sent: ${res.sent}. ${res.previews?.length ? 'Ethereal previews logged in console' : ''}`)
      if (res.previews?.length) console.log('Email previews:', res.previews)
    } catch (e) { setMsg(e.message) }
  }

  async function loadAvailableDates() {
    try {
      const exams = await fetch(`${import.meta.env.VITE_API_URL}/upload/exams/dates`).then(r => r.json())
      setAvailableDates(exams.dates || [])
    } catch {}
  }

  useEffect(() => { loadConstraints(); loadDay(); loadAvailableDates() }, [])


  async function onSearch(allocationId) {
    const q = reassign[allocationId]?.q || ''
    if (!q) return
    try {
      const list = await api.facultySearch(q)
      setReassign(v => ({ ...v, [allocationId]: { ...(v[allocationId]||{}), results: list } }))
    } catch {}
  }

  async function onReassign(allocationId) {
    const chosenId = reassign[allocationId]?.chosenId
    if (!chosenId) return
    setMsg('Reassigning...')
    try {
      await api.reassign(allocationId, chosenId)
      await loadDay()
      setMsg('Reassigned successfully')
      setReassign(v => ({ ...v, [allocationId]: {} }))
    } catch (e) { setMsg(e.message) }
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto px-4">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>

      <section className="border rounded-lg p-4 bg-white">
        <h2 className="font-medium mb-2">Data Uploads</h2>
        <AdminUpload />
      </section>

      <div className="grid md:grid-cols-2 gap-4">
        <section className="border rounded-lg p-4 bg-white">
          <h2 className="font-medium mb-2">Constraints</h2>
          <div className="space-y-3">
            <label className="block text-sm">Max Hours per Day
              <input className="mt-1 w-full border rounded px-3 py-2" type="number" min="0" value={constraints.maxHoursPerDay||0} onChange={e=>setConstraints(v=>({...v, maxHoursPerDay:Number(e.target.value)}))} />
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" checked={!!constraints.noSameDayRepeat} onChange={e=>setConstraints(v=>({...v, noSameDayRepeat:e.target.checked}))} /> No same-day repeat
            </label>
            <button onClick={saveConstraints} className="px-3 py-1.5 rounded bg-blue-600 text-white">Save</button>
          </div>
        </section>
        <section className="border rounded-lg p-4 bg-white">
          <h2 className="font-medium mb-2">Scheduling</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-end gap-3">
              <label className="text-sm">Date
                <input className="mt-1 block border rounded px-3 py-2" type="date" value={date} onChange={e=>setDate(e.target.value)} />
              </label>
              <label className="text-sm">Members per room
                <input className="mt-1 block border rounded px-3 py-2 w-20" type="number" min="1" value={neededOverride} onChange={e=>setNeededOverride(Number(e.target.value))} />
              </label>
              <button onClick={generate} disabled={loading} className="px-3 py-2 rounded bg-green-600 text-white disabled:opacity-50">Generate</button>
              <button onClick={notify} className="px-3 py-2 rounded bg-indigo-600 text-white">Notify Faculty</button>
            </div>
            {availableDates.length > 0 && (
              <div className="text-xs text-gray-500">
                Found exams on: {availableDates.slice(0, 5).join(', ')}{availableDates.length > 5 ? '...' : ''}
              </div>
            )}
          </div>
          {msg && <div className="text-sm text-blue-600 font-medium mt-2">{msg}</div>}
        </section>

      </div>

      <section className="py-4">
        <div className="flex justify-center">
          <button onClick={downloadPdf} className="px-4 py-2 rounded border">Download PDF for {date}</button>
        </div>
      </section>

      <section className="border rounded-lg p-4 bg-white">
        <h2 className="font-medium mb-2">Quick Reassign (selected date)</h2>
        <div className="grid md:grid-cols-4 gap-3 items-end">
          <label className="text-sm">Slot
            <select className="mt-1 w-full border rounded px-3 py-2" value={quick.slot} onChange={e=>setQuick(v=>({ ...v, slot: e.target.value }))}>
              <option value="FN">FN</option>
              <option value="AN">AN</option>
              <option value="EV">EV</option>
            </select>
          </label>
          <label className="text-sm">Room
            <input list="rooms-list" className="mt-1 w-full border rounded px-3 py-2" placeholder="e.g., A-101" value={quick.room} onChange={e=>setQuick(v=>({ ...v, room: e.target.value }))} />
            <datalist id="rooms-list">
              {roomsForSlot(quick.slot).map(code => <option key={code} value={code} />)}
            </datalist>
          </label>
          <label className="text-sm md:col-span-2">Search Faculty
            <div className="mt-1 flex gap-2">
              <input className="flex-1 border rounded px-3 py-2" placeholder="Name / email / department" value={quick.q} onChange={e=>setQuick(v=>({ ...v, q: e.target.value }))} />
              <button className="px-3 py-2 rounded border" onClick={onQuickSearch}>Search</button>
            </div>
          </label>
          <label className="text-sm md:col-span-3">Choose Faculty
            <select className="mt-1 w-full border rounded px-3 py-2" value={quick.chosenId} onChange={e=>setQuick(v=>({ ...v, chosenId: e.target.value }))}>
              <option value="">Select...</option>
              {quick.results.map(f => (
                <option key={f._id} value={f._id}>{f.name} • {f.email} • {f.department} • {f.designation}</option>
              ))}
            </select>
          </label>
          <div>
            <button className="px-3 py-2 rounded bg-blue-600 text-white" onClick={onQuickReassign}>Reassign</button>
          </div>
        </div>
      </section>
    </div>
  )
}
