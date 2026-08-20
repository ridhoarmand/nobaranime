import { useState } from 'react';import { Schedule, ScheduleAnime } from '../../types/anime';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

interface SchedulePageProps {
  schedule: Schedule;
}

export function AnimeSchedule({ schedule }: SchedulePageProps) {
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Random'];

  const today = new Date().getDay();
  const initialDayIndex = today === 0 ? 6 : today - 1;
  const initialDay = days[initialDayIndex];

  const [activeDay, setActiveDay] = useState(initialDay);
  const activeSchedule = schedule[activeDay] || [];

  return (
    <div className="max-w-[1920px] mx-auto">
      <h1 className="text-3xl font-bold text-white mb-8 flex items-center gap-3">
        <Calendar className="w-8 h-8 text-red-600" />
        Weekly Schedule
      </h1>

      <div className="flex overflow-x-auto pb-4 gap-2 scrollbar-hide mb-8 border-b border-gray-800">
        {days.map((day) => (
          <button
            key={day}
            onClick={() => setActiveDay(day)}
            className={`px-6 py-3 text-sm font-bold uppercase tracking-wider whitespace-nowrap transition-all border-b-2 ${
              activeDay === day ? 'text-red-600 border-red-600 bg-white/5' : 'text-gray-400 border-transparent hover:text-white hover:bg-white/5'
            }`}
          >
            {day}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeSchedule.length > 0 ? (
          activeSchedule.map((anime: ScheduleAnime) => (
            <Link
              key={anime.id}
              to={`/anime/${anime.endpoint}`}
              className="flex items-center gap-4 bg-zinc-900/50 p-4 rounded-xl border border-white/5 hover:border-red-600 hover:bg-zinc-900 transition-all group"
            >
              <div className="relative w-16 h-20 shrink-0">
                <img src={anime.thumb} alt={anime.title} className="w-full h-full object-cover rounded-md shadow-lg group-hover:scale-105 transition-transform" />
              </div>
              <div>
                <h3 className="font-bold text-white group-hover:text-red-500 transition-colors line-clamp-2">{anime.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{anime.total_episodes} Episodes</p>
              </div>
            </Link>
          ))
        ) : (
          <div className="col-span-full py-20 text-center text-gray-500">No anime scheduled for {activeDay}.</div>
        )}
      </div>
    </div>
  );
}
