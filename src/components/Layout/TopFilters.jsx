export default function TopFilters() {
  return (
    <div className="sticky top-0 z-20 bg-slate-900 p-3 flex gap-2 overflow-x-auto border-b border-slate-700">
      <select className="bg-slate-800 p-2 rounded-lg">
        <option>20bb</option>
        <option>50bb</option>
        <option>100bb</option>
      </select>

      <select className="bg-slate-800 p-2 rounded-lg">
        <option>UTG</option>
        <option>CO</option>
        <option>BTN</option>
        <option>BB</option>
      </select>

      <select className="bg-slate-800 p-2 rounded-lg">
        <option>OPEN</option>
        <option>VS OPEN</option>
        <option>3BET</option>
      </select>
    </div>
  )
}