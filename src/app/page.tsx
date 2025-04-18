import Link from 'next/link'

export default function Home() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900">Welcome to Mentor-Mentee System</h1>
      <p className="text-gray-600">
        A comprehensive platform for managing mentor-mentee relationships and service requests.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Mentors</h2>
          <p className="text-gray-600">Connect with experienced mentors in your field.</p>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Students</h2>
          <p className="text-gray-600">Find students looking for guidance and support.</p>
        </div>
        <div className="card">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Services</h2>
          <p className="text-gray-600">Access various support services and resources.</p>
        </div>
      </div>
    </div>
  )
} 