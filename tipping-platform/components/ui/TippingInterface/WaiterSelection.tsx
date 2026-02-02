'use client';

import { useState } from 'react';
import { Tables } from '@/types_db';

type Waiter = Pick<Tables<'waiters'>, 'id' | 'name' | 'profile_photo_url'>;

interface WaiterSelectionProps {
  waiters: Waiter[];
  onSelect: (waiter: Waiter) => void;
  restaurantName: string;
}

export default function WaiterSelection({ waiters, onSelect, restaurantName }: WaiterSelectionProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const filteredWaiters = waiters.filter(waiter =>
    waiter.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleWaiterSelect = async (waiter: Waiter) => {
    setIsLoading(true);
    try {
      // Validate waiter is still active before proceeding
      onSelect(waiter);
    } catch (error) {
      console.error('Error selecting waiter:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (waiters.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-zinc-400 mb-4">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-white mb-2">No Waiters Available</h3>
        <p className="text-zinc-400 mb-6">
          There are currently no active waiters at {restaurantName}.
        </p>
        <p className="text-sm text-zinc-500">
          You can still tip the restaurant directly by going back and selecting "Tip Restaurant".
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-white mb-2">Select Your Waiter</h2>
        <p className="text-zinc-400">Choose who served you today</p>
      </div>

      {/* Search Bar - only show if more than 10 waiters */}
      {waiters.length > 10 && (
        <div className="relative">
          <input
            type="text"
            placeholder="Search waiters..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-800 text-white placeholder-zinc-400 border border-zinc-600 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent"
          />
          <svg className="absolute right-3 top-3 w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      )}

      {/* Waiters List */}
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {filteredWaiters.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-zinc-400">No waiters found matching "{searchTerm}"</p>
          </div>
        ) : (
          filteredWaiters.map((waiter) => (
            <button
              key={waiter.id}
              onClick={() => handleWaiterSelect(waiter)}
              disabled={isLoading}
              className={`w-full text-white p-4 rounded-lg transition-all duration-200 border ${
                isLoading 
                  ? 'bg-zinc-800 border-zinc-700 cursor-not-allowed opacity-50'
                  : 'bg-zinc-800 hover:bg-zinc-700 border-zinc-700 hover:border-zinc-600 transform hover:scale-105'
              }`}
            >
              <div className="flex items-center space-x-4">
                {/* Profile Photo or Avatar */}
                <div className="flex-shrink-0">
                  {waiter.profile_photo_url ? (
                    <img
                      src={waiter.profile_photo_url}
                      alt={waiter.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-12 h-12 bg-zinc-600 rounded-full flex items-center justify-center">
                      <svg className="w-6 h-6 text-zinc-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Waiter Name */}
                <div className="flex-1 text-left">
                  <h3 className="font-semibold text-lg">{waiter.name}</h3>
                </div>

                {/* Arrow Icon */}
                <div className="flex-shrink-0">
                  <svg className="w-5 h-5 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {filteredWaiters.length > 0 && (
        <div className="text-center mt-6">
          <p className="text-xs text-zinc-500">
            Select the waiter who served you to send them a direct tip
          </p>
        </div>
      )}
    </div>
  );
}