import React, { useEffect, useState } from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { authApi, learningApi } from '../api/axios';

type AnalyticsResponse = {
  total_users: number;
  gender: { male: number; female: number };
  activity: { active: number; inactive: number };
  roles?: { student: number; teacher: number };
  countries?: { country: string; count: number }[];
};

type TopCourse = {
  course_id: string;
  title: string;
  students_count: number;
};

const GENDER_COLORS = ['#3b82f6', '#ec4899']; // blue, pink
const ACTIVITY_COLORS = ['#10b981', '#cbd5e1']; // green, gray
const ROLE_COLORS = ['#4f46e5', '#f97316']; // indigo, orange

const pieLabel = ({ name, percent }: any) =>
  `${name} ${(percent * 100).toFixed(0)}%`;

export const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [topCourses, setTopCourses] = useState<TopCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);

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

    const fetchTopCourses = async () => {
      setCoursesLoading(true);
      try {
        const resp = await learningApi.get<TopCourse[]>('/analytics/top-courses');
        setTopCourses(resp.data || []);
      } catch (err: any) {
        // soft-fail; keep topCourses empty
        // eslint-disable-next-line no-console
        console.error('Failed to load top courses analytics', err);
      } finally {
        setCoursesLoading(false);
      }
    };

    fetchAnalytics();
    fetchTopCourses();
  }, []);

  const genderData = [
    { name: 'Male', value: data?.gender.male || 0 },
    { name: 'Female', value: data?.gender.female || 0 },
  ];

  const activityData = [
    { name: 'Active', value: data?.activity.active || 0 },
    { name: 'Inactive', value: data?.activity.inactive || 0 },
  ];

  const roleData = [
    { name: 'Students', value: data?.roles?.student || 0 },
    { name: 'Teachers', value: data?.roles?.teacher || 0 },
  ];

  const countryData = (data?.countries || []).filter((c) => c.count > 0);
  const maxCountryCount =
    countryData.length > 0 ? Math.max(...countryData.map((c) => c.count)) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Analytics</h1>
        <p className="text-slate-500 mt-1">
          Platform-wide insights: user activity, demographics, courses, and geography.
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
        <>
          {/* Top row: activity & gender */}
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
                        <Cell
                          key={`activity-${entry.name}`}
                          fill={ACTIVITY_COLORS[idx % ACTIVITY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Gender Distribution
              </h3>
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
                        <Cell
                          key={`gender-${entry.name}`}
                          fill={GENDER_COLORS[idx % GENDER_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Second row: student/teacher ratio & top courses */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <h3 className="text-lg font-semibold text-slate-900 mb-3">
                Student / Teacher Ratio
              </h3>
              <div className="h-72">
                <ResponsiveContainer>
                  <PieChart>
                    <Pie
                      data={roleData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={pieLabel}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {roleData.map((entry, idx) => (
                        <Cell
                          key={`role-${entry.name}`}
                          fill={ROLE_COLORS[idx % ROLE_COLORS.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-slate-900">
                  Top 10 Most Popular Courses
                </h3>
                {coursesLoading && (
                  <span className="text-xs text-slate-400">Loading...</span>
                )}
              </div>
              <p className="text-xs text-slate-500 mb-3">
                Based on number of enrolled students.
              </p>
              <div className="h-72">
                {topCourses.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-xs text-slate-400">
                    No enrollment data yet.
                  </div>
                ) : (
                  <ResponsiveContainer>
                    <BarChart
                      data={topCourses}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis
                        type="category"
                        dataKey="title"
                        width={160}
                        tickLine={false}
                        tick={{ fontSize: 10 }}
                      />
                      <Tooltip />
                      <Bar dataKey="students_count" fill="#4f46e5" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Third row: geographic distribution */}
          <div className="mt-6 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Users by Country
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Darker countries indicate more users in that country.
            </p>
            {countryData.length === 0 ? (
              <div className="text-xs text-slate-400">
                No country data available yet.
              </div>
            ) : (
              <div className="w-full" style={{ height: 500 }}>
                <WorldChoroplethMap data={countryData} max={maxCountryCount} />
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
type ChoroplethDatum = { country: string; count: number };

const geoUrl =
  'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

const WorldChoroplethMap: React.FC<{
  data: ChoroplethDatum[];
  max: number;
}> = ({ data, max }) => {
  const [hoverLabel, setHoverLabel] = useState<string | null>(null);

  const lookup = React.useMemo(() => {
    const map: Record<string, number> = {};
    data.forEach((d) => {
      if (!d.country) return;
      map[d.country.toLowerCase()] = d.count;
    });
    return map;
  }, [data]);

  const getFill = (name: string) => {
    const value = lookup[name.toLowerCase()] || 0;
    if (!max || max <= 0 || value <= 0) {
      return '#e5e7eb'; // slate-200
    }
    const t = Math.min(1, value / max);
    // interpolate between #bfdbfe and #1d4ed8
    const from = [191, 219, 254];
    const to = [29, 78, 216];
    const r = Math.round(from[0] + (to[0] - from[0]) * t);
    const g = Math.round(from[1] + (to[1] - from[1]) * t);
    const b = Math.round(from[2] + (to[2] - from[2]) * t);
    return `rgb(${r}, ${g}, ${b})`;
  };

  return (
    <div className="relative w-full h-full">
      <ComposableMap
        projectionConfig={{ scale: 180, center: [0, 20] }}
        width={900}
        height={450}
        style={{ width: '100%', height: '100%' }}
      >
        <Geographies geography={geoUrl}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const name =
                (geo.properties as any)?.name ||
                (geo.properties as any)?.NAME ||
                '';
              const value = lookup[name.toLowerCase()] || 0;
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={getFill(name)}
                  stroke="#f1f5f9"
                  strokeWidth={0.5}
                  onMouseEnter={() => {
                    if (!name) return;
                    setHoverLabel(
                      `${name}: ${value.toLocaleString()} user${
                        value === 1 ? '' : 's'
                      }`
                    );
                  }}
                  onMouseLeave={() => setHoverLabel(null)}
                  style={{
                    default: { outline: 'none' },
                    hover: { outline: 'none', cursor: 'pointer' },
                    pressed: { outline: 'none' },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
      {hoverLabel && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-slate-900/80 text-[11px] text-slate-50 shadow">
          {hoverLabel}
        </div>
      )}
    </div>
  );
};

