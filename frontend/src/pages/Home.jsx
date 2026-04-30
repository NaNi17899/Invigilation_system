import React from 'react'
import { Link } from 'react-router-dom'

export function Home() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center space-y-14 px-4">
      <header className="text-center space-y-4">
        <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold">Invigilator Allocation System</h1>
        <p className="text-gray-600 text-xl md:text-2xl lg:text-3xl">Smart Campus Automation & Scheduling</p>
      </header>
      <section className="w-full max-w-7xl">
        <div className="mx-auto grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-4 items-stretch">
          <div className="px-28 py-10 min-h-[220px] rounded-none border bg-white w-full flex flex-col items-start gap-5">
            <h2 className="text-4xl font-semibold">Admin</h2>
            <p className="text-2xl md:text-3xl text-gray-700 leading-relaxed max-w-[60ch]">Upload timetables, classrooms, and faculty. Configure constraints and generate schedules.</p>
            <Link to="/auth/admin/login" className="inline-block px-12 py-5 rounded-md bg-blue-600 text-white hover:bg-blue-700 text-2xl">Admin</Link>
          </div>
          <div className="px-28 py-10 min-h-[220px] rounded-none border bg-white w-full flex flex-col items-start gap-5">
            <h2 className="text-4xl font-semibold">Faculty</h2>
            <p className="text-2xl md:text-3xl text-gray-700 leading-relaxed max-w-[60ch]">View assigned duties, request changes, and download duty letters.</p>
            <Link to="/auth/faculty/login" className="inline-block px-12 py-5 rounded-md border border-blue-600 text-blue-600 hover:bg-blue-50 text-2xl">Faculty</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
