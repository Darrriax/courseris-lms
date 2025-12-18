import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Star, ArrowLeft } from 'lucide-react';
import { Button } from '../components/Button';
import { learningApi, courseApi } from '../api/axios';

type ReviewPayload = {
  rating: number;
  comment: string;
};

export const CourseReviewPage: React.FC = () => {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [courseTitle, setCourseTitle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');

  useEffect(() => {
    const fetchCourse = async () => {
      if (!courseId) return;
      try {
        const resp = await courseApi.get(`/courses/${courseId}/full`);
        setCourseTitle(resp.data?.title || '');
      } catch {
        // ignore, optional
      }
    };
    fetchCourse();
  }, [courseId]);

  const handleSubmit = async () => {
    if (!courseId || !rating || !comment.trim()) return;
    const payload: ReviewPayload = {
      rating,
      comment: comment.trim(),
    };
    try {
      setSubmitting(true);
      await learningApi.post(`/courses/${courseId}/reviews`, payload);
      alert('Thank you for your review!');
      navigate(`/courses/${courseId}`);
    } catch (err) {
      console.error('Failed to submit review', err);
      alert('Unable to submit review right now. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const canSubmit = rating > 0 && comment.trim().length > 0 && !submitting;

  return (
    <div className="space-y-8 max-w-2xl mx-auto animate-fade-in">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            Rate this course
          </h1>
          {courseTitle && (
            <p className="text-sm text-slate-500 mt-1">{courseTitle}</p>
          )}
        </div>
      </div>

      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Overall rating
          </h2>
          <p className="text-sm text-slate-500 mb-3">
            How would you rate this course from 1 to 5 stars?
          </p>
          <div className="flex items-center gap-2">
            {Array.from({ length: 5 }).map((_, i) => {
              const value = i + 1;
              const filled = value <= (hoverRating || rating);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  onMouseEnter={() => setHoverRating(value)}
                  onMouseLeave={() => setHoverRating(0)}
                  className="focus:outline-none"
                >
                  <Star
                    className={`w-8 h-8 ${
                      filled
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-slate-300'
                    }`}
                  />
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">
            Your feedback
          </h2>
          <p className="text-sm text-slate-500 mb-3">
            Share what you liked, what could be improved, or how this course helped you.
          </p>
          <textarea
            className="w-full min-h-[140px] border border-slate-200 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
            placeholder="Write your review..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
        </div>

        <div className="flex justify-end gap-3">
          <Button
            variant="outline"
            onClick={() => navigate(`/courses/${courseId}`)}
          >
            Skip for now
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {submitting ? 'Submitting...' : 'Submit review'}
          </Button>
        </div>
      </section>
    </div>
  );
};


