import React, { useState } from 'react';
import { 
  Star as StarIcon,
  X as XIcon,
  Award as AwardIcon,
  User as UserIcon,
  MessageCircle as MessageCircleIcon,
  CheckCircle as CheckCircleIcon,
  Calendar as CalendarIcon
} from 'lucide-react';

const FeedbackModal = ({ 
  isOpen, 
  onClose, 
  onSubmit, 
  user, 
  events, 
  isProcessing 
}) => {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});

  const validateForm = () => {
    const newErrors = {};
    
    if (rating === 0) {
      newErrors.rating = 'Please provide a rating';
    }
    
    if (comment.trim().length < 10) {
      newErrors.comment = 'Please provide at least 10 characters of feedback';
    }
    
    if (comment.trim().length > 500) {
      newErrors.comment = 'Feedback must be 500 characters or less';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    onSubmit({
      rating,
      comment: comment.trim()
    });
  };

  const handleRatingClick = (value) => {
    setRating(value);
    if (errors.rating) {
      setErrors(prev => ({ ...prev, rating: null }));
    }
  };

  const handleCommentChange = (e) => {
    const value = e.target.value;
    setComment(value);
    
    if (errors.comment && value.trim().length >= 10) {
      setErrors(prev => ({ ...prev, comment: null }));
    }
  };

  const getRatingText = (rating) => {
    const texts = {
      1: 'Poor',
      2: 'Fair', 
      3: 'Good',
      4: 'Very Good',
      5: 'Excellent'
    };
    return texts[rating] || '';
  };

  const getTotalPoints = () => {
    return events.reduce((total, event) => total + (event.points || 0), 0);
  };

  if (!isOpen || !user || !events.length) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-lg w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b bg-green-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircleIcon className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Points Awarded Successfully! 🎉</h2>
              <p className="text-sm text-gray-600">
                Please help us improve by providing feedback
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
            disabled={isProcessing}
          >
            <XIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Success Summary */}
        <div className="p-6 bg-green-50 border-b">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-3">
              <UserIcon className="h-5 w-5 text-gray-600" />
              <span className="font-medium text-gray-900">
                {user.displayName || user.email}
              </span>
            </div>
            <div className="flex items-center space-x-2 bg-green-100 px-3 py-1 rounded-full">
              <AwardIcon className="h-4 w-4 text-green-600" />
              <span className="text-sm font-bold text-green-700">
                +{getTotalPoints()} points
              </span>
            </div>
          </div>

          {/* Events Summary */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-gray-700">
              Points awarded for {events.length} event{events.length > 1 ? 's' : ''}:
            </h4>
            {events.map(event => (
              <div key={event.id} className="flex items-center justify-between bg-white p-3 rounded-md">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{event.title}</p>
                  <div className="flex items-center text-xs text-gray-500 mt-1">
                    <CalendarIcon className="h-3 w-3 mr-1" />
                    {new Date(event.date).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                  <AwardIcon className="h-3 w-3 mr-1" />
                  {event.points} pts
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Feedback Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <MessageCircleIcon className="h-5 w-5 mr-2" />
              How was your experience?
            </h3>

            {/* Rating */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Overall Rating *
              </label>
              
              <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => handleRatingClick(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(0)}
                    className={`p-1 rounded transition-colors ${
                      (hoverRating >= star || rating >= star)
                        ? 'text-yellow-400'
                        : 'text-gray-300 hover:text-yellow-200'
                    }`}
                  >
                    <StarIcon 
                      className="h-8 w-8" 
                      fill={(hoverRating >= star || rating >= star) ? 'currentColor' : 'none'} 
                    />
                  </button>
                ))}
              </div>
              
              {(rating > 0 || hoverRating > 0) && (
                <p className="text-sm text-gray-600">
                  {getRatingText(hoverRating || rating)}
                </p>
              )}
              
              {errors.rating && (
                <p className="text-sm text-red-600">{errors.rating}</p>
              )}
            </div>

            {/* Comment */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">
                Additional Comments *
              </label>
              
              <textarea
                value={comment}
                onChange={handleCommentChange}
                placeholder="Tell us about your experience with these events. What did you like? What could be improved?"
                className={`w-full p-4 border rounded-lg focus:outline-none focus:ring-2 focus:border-transparent resize-none ${
                  errors.comment
                    ? 'border-red-300 focus:ring-red-500'
                    : 'border-gray-300 focus:ring-blue-500'
                }`}
                rows={4}
                maxLength={500}
                disabled={isProcessing}
              />
              
              <div className="flex justify-between items-center">
                <div className="text-xs text-gray-500">
                  {comment.length}/500 characters
                </div>
                {errors.comment && (
                  <p className="text-sm text-red-600">{errors.comment}</p>
                )}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isProcessing}
            >
              Skip Feedback
            </button>
            <button
              type="submit"
              disabled={isProcessing || rating === 0 || comment.trim().length < 10}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
            >
              {isProcessing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <MessageCircleIcon className="h-4 w-4 mr-2" />
                  Submit Feedback
                </>
              )}
            </button>
          </div>
        </form>

        {/* Additional Info */}
        <div className="px-6 pb-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="text-sm font-medium text-blue-900 mb-2">Thank You!</h4>
            <p className="text-sm text-blue-800">
              Your feedback helps us improve future events and creates a better experience 
              for the entire community. The points have been added to your account and you'll 
              receive a notification shortly.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FeedbackModal;