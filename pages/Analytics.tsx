import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Legend, Tooltip, ResponsiveContainer } from 'recharts';
import { authApi } from '../api/axios';

type AnalyticsResponse = {
  total_users: number;
  gender: { male: number; female: number };
  activity: { active: number; inactive: number };
};

const GENDER_COLORS = ['#3b82f6', '#ec4899']; // blue, pink
const ACTIVITY_COLORS = ['#10b981', '#cbd5e1']; // green, gray

const pieLabel = ({ name, percent }: any) =>
  `${name} ${(percent * 100).toFixed(0)}%`;

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      setLoading(true);
      setError(null);
      try {
        const resp = await authApi.get<AnalyticsResponse>('/analytics/users');
        setData(resp.data);
      } catch (err: any) {
        setError(err?.response?.data?.detail || 'Failed to load analytics');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  const genderData = [
    { name: 'Male', value: data?.gender.male || 0 },
    { name: 'Female', value: data?.gender.female || 0 },
  ];

  const activityData = [
    { name: 'Active', value: data?.activity.active || 0 },
    { name: 'Inactive', value: data?.activity.inactive || 0 },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-1">
          User activity and gender distribution insights.
        </p>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {loading && (
        <div className="p-4 border border-slate-200 bg-white text-slate-600 rounded-lg">
          Loading analytics...
        </div>
      )}

      {!loading && data && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Active Users</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={activityData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={pieLabel}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {activityData.map((entry, idx) => (
                      <Cell key={`activity-${entry.name}`} fill={ACTIVITY_COLORS[idx % ACTIVITY_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-3">Gender Distribution</h3>
            <div className="h-72">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={genderData}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={pieLabel}
                    outerRadius={80}
                    dataKey="value"
                  >
                    {genderData.map((entry, idx) => (
                      <Cell key={`gender-${entry.name}`} fill={GENDER_COLORS[idx % GENDER_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

