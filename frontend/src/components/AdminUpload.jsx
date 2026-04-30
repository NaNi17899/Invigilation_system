import React, { useState, useRef } from 'react'
import { api } from '../lib/api'

export function AdminUpload() {
  const [facultyFile, setFacultyFile] = useState(null)
  const [classFile, setClassFile] = useState(null)
  const [examFile, setExamFile] = useState(null)
  const [msg, setMsg] = useState('')

  const facultyRef = useRef(null)
  const classRef = useRef(null)
  const examRef = useRef(null)

  async function up(endpoint, file, setFileObj, inputRef) {
    setMsg('Uploading...')
    try {
      const res = await api.uploadCsv(endpoint, file)
      setMsg(`Successfully imported ${res.imported ?? res.grouped ?? ''} records.`)
      
      // Clear selections so user can upload again cleanly
      setFileObj(null)
      if (inputRef.current) inputRef.current.value = ''
    } catch (e) { 
      setMsg(`Error: ${e.message}`) 
    }
  }

  const renderUploader = (title, fileObj, setFileObj, refObj, endpoint) => (
    <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 border rounded bg-gray-50">
      <div className="flex-1">
        <label className="block text-sm font-semibold mb-1 text-gray-700">{title}</label>
        <div className="flex items-center gap-2">
          {/* We make the file input look a bit more clickable */}
          <input 
            ref={refObj} 
            type="file" 
            accept=".csv,text/csv" 
            onChange={e=>setFileObj(e.target.files?.[0]||null)} 
            className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
          />
        </div>
      </div>
      <div>
        <button 
          type="button" 
          disabled={!fileObj} 
          onClick={()=>up(endpoint, fileObj, setFileObj, refObj)} 
          className="w-full sm:w-auto px-6 py-2 rounded bg-blue-600 font-medium text-white shadow-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 transition"
        >
          {fileObj ? 'Start Import' : 'Select a file first'}
        </button>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {renderUploader('1. Upload Faculty CSV', facultyFile, setFacultyFile, facultyRef, '/upload/faculty')}
      {renderUploader('2. Upload Classrooms CSV', classFile, setClassFile, classRef, '/upload/classrooms')}
      {renderUploader('3. Upload Exams CSV', examFile, setExamFile, examRef, '/upload/exams')}
      
      {msg && <div className="text-sm font-medium text-gray-800 p-3 bg-blue-50 rounded border border-blue-200 mt-2">{msg}</div>}
    </div>
  )
}
