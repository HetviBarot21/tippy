'use client';

interface TipTypeSelectionProps {
  onSelect: (type: 'waiter' | 'restaurant') => void;
}

export default function TipTypeSelection({ onSelect }: TipTypeSelectionProps) {
  return (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-xl font-semibold text-white mb-2">How would you like to tip?</h2>
        <p className="text-zinc-400">Choose your preferred tipping option</p>
      </div>

      <div className="space-y-4">
        {/* Tip Waiter Button */}
        <button
          onClick={() => onSelect('waiter')}
          className="w-full bg-white hover:bg-zinc-100 text-zinc-900 font-semibold py-6 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg"
        >
          <div className="flex items-center justify-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-lg">Tip Waiter</span>
          </div>
          <p className="text-sm text-zinc-600 mt-2">Tip goes directly to your server</p>
        </button>

        {/* Tip Restaurant Button */}
        <button
          onClick={() => onSelect('restaurant')}
          className="w-full bg-zinc-700 hover:bg-zinc-600 text-white font-semibold py-6 px-6 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-lg border border-zinc-600"
        >
          <div className="flex items-center justify-center space-x-3">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            <span className="text-lg">Tip Restaurant</span>
          </div>
          <p className="text-sm text-zinc-400 mt-2">Tip is shared among all staff</p>
        </button>
      </div>

      <div className="text-center mt-8">
        <p className="text-xs text-zinc-500">
          All tips are processed securely through mobile payments
        </p>
      </div>
    </div>
  );
}