import React from 'react';
import { useState, useEffect } from 'react';
import { CalendarIcon, UsersIcon, MapPinIcon, ClockIcon } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';

export default function EventsOverview() {
  const [filter, setFilter] = useState('all');
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const eventsQuery = query(
      collection(db, 'events'), 
      orderBy('createdAt', 'desc'), 
      limit(10)
    );
    
    const unsubscribe = onSnapshot(eventsQuery, (snapshot) => {
      const eventsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEvents(eventsList);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    return event.status === filter;
  });

  const getStatusBadge = (status) => {
    const styles = {
      upcoming: 'bg-blue-100 text-blue-800',
      ongoing: 'bg-green-100 text-green-800',
      completed: 'bg-gray-100 text-gray-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    
    return `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status]}`;
  };

  return (
    <div className="bg-white shadow rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Recent Events</h3>
          <div className="flex space-x-2">
            {['all', 'upcoming', 'completed'].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-3 py-1 text-sm font-medium rounded-md ${
                  filter === status
                    ? 'bg-primary-100 text-primary-700'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading events...</p>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="p-8 text-center">
            <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No events found</p>
          </div>
        ) : (
          filteredEvents.map((event) => (
          <div key={event.id} className="p-6 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3">
                  <h4 className="text-sm font-medium text-gray-900">{event.title}</h4>
                  <span className={getStatusBadge(event.status)}>
                    {event.status}
                  </span>
                </div>
                
                <div className="mt-2 flex items-center space-x-4 text-sm text-gray-500">
                  <div className="flex items-center">
                    <CalendarIcon className="h-4 w-4 mr-1" />
                    {event.date}
                  </div>
                  <div className="flex items-center">
                    <MapPinIcon className="h-4 w-4 mr-1" />
                    {event.location}
                  </div>
                  <div className="flex items-center">
                    <UsersIcon className="h-4 w-4 mr-1" />
                    {event.participants}/{event.maxParticipants}
                  </div>
                </div>
                
                <p className="mt-1 text-xs text-gray-400">
                  Organized by {event.organizer}
                </p>
              </div>
              
              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-900">
                    {Math.round((event.participants / event.maxParticipants) * 100)}%
                  </div>
                  <div className="text-xs text-gray-500">Filled</div>
                </div>
                <div className="w-16 bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full" 
                    style={{ width: `${(event.participants / event.maxParticipants) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
          ))
        )}
      </div>
    </div>
  );
}
