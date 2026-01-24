import { SalesDeals } from './components/SalesDeals'

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold text-gray-800">Sales Dashboard</h1>
        <p className="text-gray-600 mt-2">Manage your sales deals efficiently</p>
      </div>
      <SalesDeals />
    </div>
  )
}

export default App