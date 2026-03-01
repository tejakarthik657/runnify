export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      <h1 className="text-6xl font-bold mb-4">Territory Run</h1>
      <p className="text-xl mb-8">Conquer the world, one step at a time</p>
      <div className="space-x-4">
        <a href="/login" className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold">
          Get Started
        </a>
      </div>
    </div>
  )
}
