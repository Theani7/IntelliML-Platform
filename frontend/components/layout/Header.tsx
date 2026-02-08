export default function Header() {
  return (
    <header className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg">
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center">
              <span className="text-2xl">🎤</span>
            </div>
            <div>
              <h1 className="text-2xl font-bold">IntelliML Platform</h1>
              <p className="text-sm text-purple-100">Voice-Activated AutoML</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <span className="text-sm bg-purple-700 px-3 py-1 rounded-full">
              v1.0.0
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}