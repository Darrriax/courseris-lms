import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Award, Download, ArrowLeft } from 'lucide-react';
import { learningApi } from '../api/axios';
import { Certificate } from '../types';
import { Button } from '../components/Button';

export const CertificatesPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCertificates = async () => {
      try {
        setLoading(true);
        setError(null);
        const resp = await learningApi.get('/certificates/me');
        const items = resp.data as Certificate[];
        setCertificates(items);
      } catch (err: any) {
        console.error('Failed to load certificates', err);
        setError('Unable to load certificates. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchCertificates();
  }, []);

  // If a specific courseId is passed in the query string, try to scroll
  // to its certificate card when certificates finish loading.
  useEffect(() => {
    if (loading) return;
    const params = new URLSearchParams(location.search);
    const targetCourseId = params.get('courseId');
    if (!targetCourseId) return;
    const el = document.getElementById(`certificate-card-${targetCourseId}`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [loading, location.search, certificates]);

  const handleDownloadCertificate = async (cert: Certificate) => {
    try {
      const resp = await learningApi.get(`/certificates/${cert.id}/pdf`, {
        responseType: 'blob',
      });
      const blob = new Blob([resp.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${cert.course_id}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download certificate', error);
      alert('Failed to download certificate. Please try again.');
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 rounded-full border border-slate-200 text-slate-500 hover:text-slate-700 hover:border-slate-300 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
              Certificates
            </h1>
            <p className="text-slate-500 mt-1 text-sm">
              View and download certificates you have earned from completed courses.
            </p>
          </div>
        </div>
      </div>

      {loading && certificates.length === 0 && (
        <div className="bg-white rounded-xl border border-slate-200 p-6 text-slate-500">
          Loading certificates...
        </div>
      )}

      {error && !loading && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-6 text-red-600 text-sm">
          {error}
        </div>
      )}

      {!loading && !error && certificates.length === 0 && (
        <div className="bg-white rounded-xl border border-dashed border-slate-200 p-6 text-slate-500 text-sm">
          You have not earned any certificates yet. Complete courses with a passing score
          to receive certificates.
        </div>
      )}

      {!loading && !error && certificates.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {certificates.map((cert) => (
            <div
              key={cert.id}
              id={`certificate-card-${cert.course_id}`}
              className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col gap-2"
            >
              <div className="flex items-center gap-2 mb-1">
                <div className="p-2 rounded-full bg-yellow-50 text-yellow-700">
                  <Award className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold text-slate-900 line-clamp-1">
                    {cert.course_title}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Issued{' '}
                    {new Date(cert.issued_at).toLocaleDateString(undefined, {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-600 mt-1">
                <span>Score: {cert.score_pct}%</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-semibold">
                  Certificate
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 flex items-center gap-2"
                onClick={() => handleDownloadCertificate(cert)}
              >
                <Download className="w-4 h-4" />
                Download PDF
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


