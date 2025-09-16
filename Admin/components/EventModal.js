import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { X as XMarkIcon } from 'lucide-react';
import supabase from '../lib/supabase';

const categories = [
  'arts', 'environment', 'sports', 'health', 'education', 
  'community', 'volunteer', 'social', 'cleanup', 'fundraiser'
];

export default function EventModal({ event, onSave, onClose }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    time: '',
    location: '',
    category: 'community',
    maxParticipants: '',
    points: '',
    organizer: '',
    status: 'upcoming',
    imageUrl: ''
  });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (event) {
      setFormData({
        title: event.title || '',
        description: event.description || '',
        date: event.date || '',
        time: event.time || '',
        location: event.location || '',
        category: event.category || 'community',
        maxParticipants: event.maxParticipants?.toString() || '',
        points: event.points?.toString() || '',
        organizer: event.organizer || '',
        status: event.status || 'upcoming',
        imageUrl: event.imageUrl || ''
      });
    }
  }, [event]);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.title.trim()) {
      alert('Please enter an event title');
      return;
    }
    if (!formData.description.trim()) {
      alert('Please enter an event description');
      return;
    }
    if (!formData.date) {
      alert('Please select an event date');
      return;
    }
    if (!formData.time.trim()) {
      alert('Please enter event time');
      return;
    }
    if (!formData.location.trim()) {
      alert('Please enter event location');
      return;
    }
    if (!formData.maxParticipants || parseInt(formData.maxParticipants) < 1) {
      alert('Please enter a valid number of participants');
      return;
    }
    if (!formData.points || parseInt(formData.points) < 1) {
      alert('Please enter points reward');
      return;
    }
    if (!formData.organizer.trim()) {
      alert('Please enter organizer name');
      return;
    }

    const eventData = {
      ...formData,
      maxParticipants: parseInt(formData.maxParticipants),
      points: parseInt(formData.points)
    };

    onSave(eventData);
  };

  const handleLocalUpload = async (e) => {
    try {
      const file = e.target.files?.[0];
      if (!file || !supabase) return;
      setUploading(true);
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `events/${Date.now()}.${ext}`;
      const { error } = await supabase.storage.from('event post').upload(path, file, {
        cacheControl: '3600',
        upsert: true,
        contentType: file.type || 'image/jpeg',
      });
      if (error) throw error;
      const { data: publicUrl } = supabase.storage.from('event post').getPublicUrl(path);
      setFormData(prev => ({ ...prev, imageUrl: publicUrl?.publicUrl || '' }));
    } catch (err) {
      alert('Upload failed: ' + (err?.message || 'Unknown error'));
    } finally {
      setUploading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="div" className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-medium leading-6 text-gray-900">
                    {event ? 'Edit Event' : 'Create New Event'}
                  </h3>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </Dialog.Title>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Cover Image URL or Upload */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cover Image URL
                    </label>
                    <input
                      type="url"
                      name="imageUrl"
                      value={formData.imageUrl}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="https://..."
                    />
                    <div className="mt-2">
                      <label className="inline-flex items-center px-3 py-2 bg-gray-100 rounded-md border border-gray-300 cursor-pointer hover:bg-gray-200">
                        <input type="file" accept="image/*" className="hidden" onChange={handleLocalUpload} />
                        <span className="text-sm text-gray-700">{uploading ? 'Uploading...' : 'Upload from computer'}</span>
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">Upload goes to Supabase bucket “event post” and fills the URL automatically.</p>
                  </div>
                  {/* Event Title */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Title *
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter event title"
                      required
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description *
                    </label>
                    <textarea
                      name="description"
                      value={formData.description}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter event description"
                      required
                    />
                  </div>

                  {/* Date and Time */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Date *
                      </label>
                      <input
                        type="date"
                        name="date"
                        value={formData.date}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Time *
                      </label>
                      <input
                        type="text"
                        name="time"
                        value={formData.time}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="e.g., 9:00 AM - 12:00 PM"
                        required
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location *
                    </label>
                    <input
                      type="text"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter event location"
                      required
                    />
                  </div>

                  {/* Category and Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category *
                      </label>
                      <select
                        name="category"
                        value={formData.category}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      >
                        {categories.map(category => (
                          <option key={category} value={category}>
                            {category.charAt(0).toUpperCase() + category.slice(1)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Status
                      </label>
                      <select
                        name="status"
                        value={formData.status}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="upcoming">Upcoming</option>
                        <option value="ongoing">Ongoing</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </div>
                  </div>

                  {/* Max Participants and Points */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Max Participants *
                      </label>
                      <input
                        type="number"
                        name="maxParticipants"
                        value={formData.maxParticipants}
                        onChange={handleChange}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter max participants"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Points Reward *
                      </label>
                      <input
                        type="number"
                        name="points"
                        value={formData.points}
                        onChange={handleChange}
                        min="1"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                        placeholder="Enter points reward"
                        required
                      />
                    </div>
                  </div>

                  {/* Organizer */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Organizer *
                    </label>
                    <input
                      type="text"
                      name="organizer"
                      value={formData.organizer}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="Enter organizer name"
                      required
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-4 pt-4">
                    <button
                      type="button"
                      onClick={onClose}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-primary-600 border border-transparent rounded-md hover:bg-primary-700"
                    >
                      {event ? 'Update Event' : 'Create Event'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}
