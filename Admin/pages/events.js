import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { 
  Plus as PlusIcon, 
  Search as SearchIcon, 
  Filter as FilterIcon, 
  Calendar as CalendarIcon, 
  Users as UsersIcon,
  MapPin as MapPinIcon,
  Clock as ClockIcon,
  Pencil as EditIcon,
  Trash as TrashIcon,
  Eye as EyeIcon,
  Star as StarIcon,
  X as XIcon,
  CheckSquare as CheckSquareIcon,
  Square as SquareIcon,
  MoreVertical as MoreVerticalIcon,
  Play as PlayIcon,
  Pause as PauseIcon,
  AlertTriangle as AlertTriangleIcon,
  Copy as CopyIcon,
  Download as DownloadIcon
} from 'lucide-react';
import EventModal from '../components/EventModal';

// Events are loaded from Firebase

export default function Events() {
  const { user, loading, isAdmin } = useAuth();
  const router = useRouter();
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [showModal, setShowModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [selectedEvents, setSelectedEvents] = useState(new Set());
  const [bulkAction, setBulkAction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!loading && user) {
      const q = query(collection(db, 'events'), orderBy('createdAt', 'desc'));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const liveEvents = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setEvents(liveEvents);
      });
      return () => unsubscribe();
    }
  }, [user, loading]);

  if (loading || !user) {
    return null;
  }
  // Temporarily disabled admin check for development
  // if (!isAdmin) return null;

  const filteredEvents = events.filter(event => {
    const matchesSearch = event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         event.organizer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || event.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || event.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const sortedEvents = [...filteredEvents].sort((a, b) => {
    switch (sortBy) {
      case 'date':
        return new Date(a.date) - new Date(b.date);
      case 'title':
        return a.title.localeCompare(b.title);
      case 'participants':
        return b.participants - a.participants;
      case 'created':
        return new Date(b.createdAt) - new Date(a.createdAt);
      default:
        return 0;
    }
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

  const getCategoryIcon = (category) => {
    const icons = {
      arts: '🎨',
      environment: '🌱',
      sports: '🏀',
      health: '🏥',
      education: '📚',
      community: '🏘️',
      volunteer: '🤝'
    };
    return icons[category] || '📅';
  };

  const handleCreateEvent = () => {
    setSelectedEvent(null);
    setShowModal(true);
  };

  const handleEditEvent = (event) => {
    setSelectedEvent(event);
    setShowModal(true);
  };

  const handleDeleteEvent = async (eventId) => {
    if (confirm('Are you sure you want to delete this event?')) {
      try {
        await deleteDoc(doc(db, 'events', eventId));
      } catch (e) {
        alert('Failed to delete event: ' + (e?.message || 'Unknown error'));
      }
    }
  };

  const handleSaveEvent = async (eventData) => {
    try {
      if (selectedEvent) {
        await updateDoc(doc(db, 'events', selectedEvent.id), {
          ...eventData,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, 'events'), {
          ...eventData,
          participants: 0,
          image: getCategoryIcon(eventData.category),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      setShowModal(false);
    } catch (e) {
      alert('Failed to save event: ' + (e?.message || 'Unknown error'));
    }
  };

  // Bulk operations
  const toggleEventSelection = (eventId) => {
    const newSelected = new Set(selectedEvents);
    if (newSelected.has(eventId)) {
      newSelected.delete(eventId);
    } else {
      newSelected.add(eventId);
    }
    setSelectedEvents(newSelected);
  };

  const selectAllEvents = () => {
    if (selectedEvents.size === filteredEvents.length) {
      setSelectedEvents(new Set());
    } else {
      setSelectedEvents(new Set(filteredEvents.map(event => event.id)));
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedEvents.size === 0) return;

    setIsProcessing(true);
    
    try {
      const batch = writeBatch(db);
      const selectedEventIds = Array.from(selectedEvents);

      switch (bulkAction) {
        case 'cancel':
          setShowCancelModal(true);
          setIsProcessing(false);
          return;

        case 'activate':
          selectedEventIds.forEach(eventId => {
            const eventRef = doc(db, 'events', eventId);
            batch.update(eventRef, {
              status: 'upcoming',
              updatedAt: serverTimestamp(),
              updatedBy: user.uid
            });
          });
          break;

        case 'complete':
          selectedEventIds.forEach(eventId => {
            const eventRef = doc(db, 'events', eventId);
            batch.update(eventRef, {
              status: 'completed',
              completedAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              updatedBy: user.uid
            });
          });
          break;

        case 'delete':
          if (confirm(`Are you sure you want to delete ${selectedEvents.size} event(s)? This action cannot be undone.`)) {
            selectedEventIds.forEach(eventId => {
              const eventRef = doc(db, 'events', eventId);
              batch.delete(eventRef);
            });
          } else {
            setIsProcessing(false);
            return;
          }
          break;

        default:
          setIsProcessing(false);
          return;
      }

      await batch.commit();
      setSelectedEvents(new Set());
      setBulkAction('');
      
      // Log admin action
      await addDoc(collection(db, 'adminActions'), {
        type: 'bulk_event_update',
        action: bulkAction,
        eventIds: selectedEventIds,
        adminId: user.uid,
        timestamp: serverTimestamp(),
        count: selectedEvents.size
      });

    } catch (error) {
      console.error('Error performing bulk action:', error);
      alert('Failed to perform bulk action: ' + error.message);
    }
    
    setIsProcessing(false);
  };

  const handleCancelEvents = async () => {
    if (!cancelReason.trim()) {
      alert('Please provide a reason for cancellation');
      return;
    }

    setIsProcessing(true);
    
    try {
      const batch = writeBatch(db);
      const selectedEventIds = Array.from(selectedEvents);
      
      selectedEventIds.forEach(eventId => {
        const eventRef = doc(db, 'events', eventId);
        batch.update(eventRef, {
          status: 'cancelled',
          cancelledAt: serverTimestamp(),
          cancellationReason: cancelReason,
          updatedAt: serverTimestamp(),
          updatedBy: user.uid
        });
      });

      await batch.commit();

      // Send notifications to participants about cancellation
      await addDoc(collection(db, 'notifications'), {
        title: 'Event Cancellation Notice',
        message: `Event(s) have been cancelled. Reason: ${cancelReason}`,
        type: 'event_cancellation',
        targetUsers: 'participants', // Will be expanded by cloud function
        eventIds: selectedEventIds,
        priority: 'high',
        status: 'sent',
        createdAt: serverTimestamp(),
        createdBy: user.uid
      });

      // Log admin action
      await addDoc(collection(db, 'adminActions'), {
        type: 'bulk_event_cancellation',
        eventIds: selectedEventIds,
        reason: cancelReason,
        adminId: user.uid,
        timestamp: serverTimestamp(),
        count: selectedEvents.size
      });

      setSelectedEvents(new Set());
      setBulkAction('');
      setShowCancelModal(false);
      setCancelReason('');
      alert(`Successfully cancelled ${selectedEventIds.length} event(s) and notified participants.`);

    } catch (error) {
      console.error('Error cancelling events:', error);
      alert('Failed to cancel events: ' + error.message);
    }
    
    setIsProcessing(false);
  };

  const handleQuickStatusUpdate = async (eventId, newStatus) => {
    try {
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid
      };

      if (newStatus === 'cancelled') {
        const reason = prompt('Please provide a reason for cancellation:');
        if (!reason) return;
        updateData.cancellationReason = reason;
        updateData.cancelledAt = serverTimestamp();
      } else if (newStatus === 'completed') {
        updateData.completedAt = serverTimestamp();
      }

      await updateDoc(doc(db, 'events', eventId), updateData);

      // If cancelling, send notification
      if (newStatus === 'cancelled') {
        await addDoc(collection(db, 'notifications'), {
          title: 'Event Cancellation Notice',
          message: `Event has been cancelled. Reason: ${updateData.cancellationReason}`,
          type: 'event_cancellation',
          targetUsers: 'participants',
          eventIds: [eventId],
          priority: 'high',
          status: 'sent',
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });
      }

    } catch (error) {
      console.error('Error updating event status:', error);
      alert('Failed to update event status: ' + error.message);
    }
  };

  const exportEvents = () => {
    const csvContent = "data:text/csv;charset=utf-8," +
      "ID,Title,Category,Status,Date,Location,Participants,Max Participants,Organizer,Created\n" +
      filteredEvents.map(event => 
        `"${event.id}","${event.title}","${event.category}","${event.status}","${event.date}","${event.location}","${event.participants || 0}","${event.maxParticipants || 0}","${event.organizer}","${new Date(event.createdAt?.toDate()).toLocaleDateString()}"`
      ).join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `events_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const duplicateEvent = async (event) => {
    try {
      const duplicatedEvent = {
        ...event,
        title: `${event.title} (Copy)`,
        participants: 0,
        status: 'upcoming',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        duplicatedFrom: event.id,
        createdBy: user.uid
      };
      
      // Remove fields that shouldn't be duplicated
      delete duplicatedEvent.id;
      delete duplicatedEvent.cancelledAt;
      delete duplicatedEvent.cancellationReason;
      delete duplicatedEvent.completedAt;

      await addDoc(collection(db, 'events'), duplicatedEvent);
      alert('Event duplicated successfully!');
    } catch (error) {
      console.error('Error duplicating event:', error);
      alert('Failed to duplicate event: ' + error.message);
    }
  };

  const categories = ['all', 'arts', 'environment', 'sports', 'health', 'education', 'community', 'volunteer'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Events Management</h1>
          <p className="text-gray-600">Create, manage, and monitor community events with bulk operations</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={exportEvents}
            className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            <DownloadIcon className="h-4 w-4 mr-2" />
            Export CSV
          </button>
          <button
            onClick={handleCreateEvent}
            className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Event
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search events..."
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Status</option>
            <option value="upcoming">Upcoming</option>
            <option value="ongoing">Ongoing</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category.charAt(0).toUpperCase() + category.slice(1)}
              </option>
            ))}
          </select>
          
          <select
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
            <option value="participants">Sort by Participants</option>
            <option value="created">Sort by Created</option>
          </select>
          
          <div className="text-sm text-gray-500 flex items-center">
            Total: {events.length} events
          </div>
        </div>
      </div>

      {/* Bulk Operations Panel */}
      {selectedEvents.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <span className="text-sm font-medium text-blue-900">
                {selectedEvents.size} event{selectedEvents.size > 1 ? 's' : ''} selected
              </span>
              <select
                value={bulkAction}
                onChange={(e) => setBulkAction(e.target.value)}
                className="px-3 py-1 border border-blue-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Choose action...</option>
                <option value="activate">Activate Events</option>
                <option value="cancel">Cancel Events</option>
                <option value="complete">Mark Complete</option>
                <option value="delete">Delete Events</option>
              </select>
              <button
                onClick={handleBulkAction}
                disabled={!bulkAction || isProcessing}
                className="px-4 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 text-sm"
              >
                {isProcessing ? 'Processing...' : 'Apply'}
              </button>
            </div>
            <button
              onClick={() => setSelectedEvents(new Set())}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* Bulk Selection Header */}
      {filteredEvents.length > 0 && (
        <div className="bg-white p-4 rounded-lg shadow mb-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={selectedEvents.size === filteredEvents.length}
                onChange={selectAllEvents}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Select All ({filteredEvents.length} events)
              </span>
            </label>
            <div className="text-sm text-gray-500">
              {selectedEvents.size} of {filteredEvents.length} selected
            </div>
          </div>
        </div>
      )}

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedEvents.map((event) => (
          <div key={event.id} className={`bg-white rounded-lg shadow hover:shadow-md transition-shadow ${selectedEvents.has(event.id) ? 'ring-2 ring-blue-500' : ''}`}>
            <div className="p-6">
              {/* Selection and Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={selectedEvents.has(event.id)}
                    onChange={() => toggleEventSelection(event.id)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mt-1"
                  />
                  <div className="text-2xl">{event.image}</div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {event.title}
                    </h3>
                    <span className={getStatusBadge(event.status)}>
                      {event.status}
                    </span>
                  </div>
                </div>
                
                {/* Quick Status Actions */}
                <div className="flex space-x-1">
                  {event.status === 'upcoming' && (
                    <>
                      <button
                        onClick={() => handleQuickStatusUpdate(event.id, 'ongoing')}
                        className="p-1 text-green-600 hover:bg-green-50 rounded"
                        title="Start Event"
                      >
                        <PlayIcon className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleQuickStatusUpdate(event.id, 'cancelled')}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Cancel Event"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </>
                  )}
                  {event.status === 'ongoing' && (
                    <>
                      <button
                        onClick={() => handleQuickStatusUpdate(event.id, 'completed')}
                        className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        title="Complete Event"
                      >
                        <CheckSquareIcon className="h-3 w-3" />
                      </button>
                      <button
                        onClick={() => handleQuickStatusUpdate(event.id, 'cancelled')}
                        className="p-1 text-red-600 hover:bg-red-50 rounded"
                        title="Cancel Event"
                      >
                        <XIcon className="h-3 w-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Description */}
              <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                {event.description}
              </p>

              {/* Event Details */}
              <div className="space-y-2 mb-4">
                <div className="flex items-center text-sm text-gray-600">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  {new Date(event.date).toLocaleDateString('en-US', { 
                    weekday: 'short', 
                    year: 'numeric', 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <ClockIcon className="h-4 w-4 mr-2" />
                  {event.time}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <MapPinIcon className="h-4 w-4 mr-2" />
                  {event.location}
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <UsersIcon className="h-4 w-4 mr-2" />
                  {event.participants}/{event.maxParticipants} participants
                </div>
                <div className="flex items-center text-sm text-gray-600">
                  <StarIcon className="h-4 w-4 mr-2" />
                  {event.points} points reward
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mb-4">
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Capacity</span>
                  <span>{Math.round((event.participants / event.maxParticipants) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${(event.participants / event.maxParticipants) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Organizer */}
              <p className="text-xs text-gray-500 mb-4">
                Organized by {event.organizer}
              </p>

              {/* Cancellation Notice */}
              {event.status === 'cancelled' && event.cancellationReason && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start">
                    <AlertTriangleIcon className="h-4 w-4 text-red-600 mt-0.5 mr-2" />
                    <div>
                      <p className="text-sm font-medium text-red-800">Cancelled</p>
                      <p className="text-sm text-red-700">{event.cancellationReason}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-400">
                  {(() => { const t = event?.createdAt; const d = t?.toMillis ? new Date(t.toMillis()) : (t ? new Date(t) : null); return d ? `Created ${d.toLocaleDateString()}` : null; })()}
                </div>
                <div className="flex space-x-1">
                  <button
                    onClick={() => handleEditEvent(event)}
                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                    title="Edit event"
                  >
                    <EditIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => duplicateEvent(event)}
                    className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded"
                    title="Duplicate event"
                  >
                    <CopyIcon className="h-4 w-4" />
                  </button>
                  <button
                    className="p-2 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded"
                    title="View details"
                  >
                    <EyeIcon className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(event.id)}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded"
                    title="Delete event"
                  >
                    <TrashIcon className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Event Modal */}
      {showModal && (
        <EventModal
          event={selectedEvent}
          onSave={handleSaveEvent}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Cancellation Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center mb-4">
                <AlertTriangleIcon className="h-6 w-6 text-red-600 mr-3" />
                <h2 className="text-lg font-bold text-gray-900">Cancel Events</h2>
              </div>
              
              <p className="text-gray-600 mb-4">
                You are about to cancel {selectedEvents.size} event{selectedEvents.size > 1 ? 's' : ''}. 
                This will notify all participants. Please provide a reason for cancellation:
              </p>
              
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Reason for cancellation (required)"
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
                rows={3}
                maxLength={500}
              />
              
              <div className="text-sm text-gray-500 mt-1">
                {cancelReason.length}/500 characters
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowCancelModal(false);
                    setCancelReason('');
                    setIsProcessing(false);
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCancelEvents}
                  disabled={!cancelReason.trim() || isProcessing}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {isProcessing ? 'Cancelling...' : 'Cancel Events'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
