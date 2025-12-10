import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Pencil, Save, Edit2, X, Mail, Phone } from 'lucide-react';
import { IMaskInput } from 'react-imask';
import { useAuth } from '../context/AuthContext';
import { authService, UserResponse, UserUpdateData } from '../api/auth';
import { Button } from '../components/Button';
import { COUNTRIES } from '../constants/countries';

export const Profile: React.FC = () => {
  const { user: contextUser } = useAuth();
  const [user, setUser] = useState<UserResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    age: '',
    phone_number: '',
    country: '',
    bio: '',
  });

  const [originalFormData, setOriginalFormData] = useState(formData);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  // Extract data fetching logic into a reusable function
  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      const userData = await authService.getCurrentUser();
      setUser(userData);
      const data = {
        first_name: userData.first_name || '',
        last_name: userData.last_name || '',
        middle_name: userData.middle_name || '',
        age: userData.age?.toString() || '',
        phone_number: userData.phone_number || '',
        country: userData.country || '',
        bio: userData.bio || '',
      };
      setFormData(data);
      setOriginalFormData(data);
      return userData;
    } catch (err: any) {
      setError('Failed to load user data');
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch user data on mount - CRITICAL for persistence
  useEffect(() => {
    fetchUserProfile();
  }, [fetchUserProfile]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditClick = () => {
    setIsEditing(true);
  };

  const handleCancelClick = () => {
    setFormData(originalFormData);
    setIsEditing(false);
    setError(null);
  };

  const handleAvatarClick = () => {
    if (isEditing) {
      avatarInputRef.current?.click();
    }
  };

  const handleBannerClick = () => {
    if (isEditing) {
      bannerInputRef.current?.click();
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const result = await authService.uploadAvatar(file);
      // Immediately update the local user state with the new avatar URL from the backend response
      setUser(prev => {
        if (!prev) return null;
        return { ...prev, avatar_url: result.avatar_url, avatar: result.avatar_url };
      });
    } catch (err: any) {
      setError('Failed to upload avatar');
    }
  };

  const handleBannerChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setError(null);
      const result = await authService.uploadBanner(file);
      // Immediately update the local user state with the new banner URL from the backend response
      setUser(prev => {
        if (!prev) return null;
        return { ...prev, banner_url: result.banner_url };
      });
    } catch (err: any) {
      setError('Failed to upload banner');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);

    // Validate phone number if provided
    if (formData.phone_number && formData.phone_number.includes('_')) {
      setError('Please complete the phone number');
      setSaving(false);
      return;
    }

    try {
      const updateData: UserUpdateData = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        middle_name: formData.middle_name || undefined,
        age: formData.age ? parseInt(formData.age) : undefined,
        phone_number: formData.phone_number && !formData.phone_number.includes('_') ? formData.phone_number : undefined,
        country: formData.country || undefined,
        bio: formData.bio || undefined,
      };

      const updatedUser = await authService.updateProfile(updateData);
      // Immediately update the local user state with the complete updated user data from the backend
      setUser(updatedUser);
      setOriginalFormData(formData);
      setSuccess(true);
      setIsEditing(false);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">User not found</div>
      </div>
    );
  }

  const avatarUrl = user.avatar_url || user.avatar || `https://picsum.photos/seed/${user.email}/200/200`;
  const bannerUrl = user.banner_url;
  const fullName = user.middle_name 
    ? `${user.first_name} ${user.middle_name} ${user.last_name}`
    : `${user.first_name} ${user.last_name}`;
  
  // Enhanced headline - e.g., "Student" or "Teacher"
  const headline = user.role === 'teacher' ? 'Teacher' : 'Student';
  
  // Demographics array for the light gray row
  const demographics = [];
  if (user.age) demographics.push(`${user.age} years old`);
  if (user.country) demographics.push(user.country);
  if (user.role) demographics.push(user.role.charAt(0).toUpperCase() + user.role.slice(1));

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header Container - Relative positioning, NO overflow-hidden */}
      <div className="relative mb-24">
        {/* Banner Section */}
        <div className="relative h-52 w-full rounded-lg overflow-hidden bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600">
          {bannerUrl ? (
            <img 
              src={bannerUrl} 
              alt="Banner" 
              className="w-full h-full object-cover"
            />
          ) : null}
          
          {/* Edit Banner Button - Only show in edit mode */}
          {isEditing && (
            <button
              onClick={handleBannerClick}
              className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white rounded-full shadow-lg transition-all group z-10"
              title="Edit banner"
            >
              <Pencil className="w-5 h-5 text-slate-700 group-hover:text-indigo-600" />
            </button>
          )}
          <input
            ref={bannerInputRef}
            type="file"
            accept="image/*"
            onChange={handleBannerChange}
            className="hidden"
          />
        </div>

        {/* Avatar Section - Absolute positioning with high z-index */}
        <div className="absolute left-8 -bottom-16 z-20">
          <div className="relative">
            <img
              src={avatarUrl}
              alt="Avatar"
              className="w-40 h-40 rounded-full border-4 border-white object-cover shadow-xl"
            />
            {/* Edit Avatar Button - Only show in edit mode */}
            {isEditing && (
              <button
                onClick={handleAvatarClick}
                className="absolute bottom-0 right-0 p-3 bg-indigo-600 hover:bg-indigo-700 rounded-full shadow-lg transition-all group z-30"
                title="Edit avatar"
              >
                <Camera className="w-5 h-5 text-white" />
              </button>
            )}
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-8">
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-600">Profile updated successfully!</p>
          </div>
        )}

        {!isEditing ? (
          /* VIEW MODE */
          <>
            {/* Identity & Contact Block */}
            <div className="space-y-4">
              {/* Name */}
              <h1 className="text-3xl font-bold text-slate-900">{fullName}</h1>
              
              {/* Headline */}
              <p className="text-lg text-slate-600">{headline}</p>
              
              {/* Demographics & Location Row - Light Gray */}
              {demographics.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  {demographics.map((item, index) => (
                    <React.Fragment key={index}>
                      <span>{item}</span>
                      {index < demographics.length - 1 && (
                        <span className="text-slate-300">•</span>
                      )}
                    </React.Fragment>
                  ))}
                </div>
              )}
              
              {/* Contact Info - Prominent with Icons */}
              <div className="flex flex-wrap gap-4 pt-2">
                {user.email && (
                  <a
                    href={`mailto:${user.email}`}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <Mail className="w-4 h-4" />
                    <span className="text-sm font-medium">{user.email}</span>
                  </a>
                )}
                {user.phone_number && (
                  <a
                    href={`tel:${user.phone_number}`}
                    className="flex items-center gap-2 text-indigo-600 hover:text-indigo-700 transition-colors"
                  >
                    <Phone className="w-4 h-4" />
                    <span className="text-sm font-medium">{user.phone_number}</span>
                  </a>
                )}
              </div>

              {/* Edit Button */}
              <div className="pt-4">
                <Button onClick={handleEditClick} size="lg">
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </div>
            </div>
          </>
        ) : (
          /* EDIT MODE */
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-slate-900">Edit Profile</h2>
              <button
                type="button"
                onClick={handleCancelClick}
                className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
                title="Cancel"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Personal Info Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Personal Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-slate-700 mb-1">
                    First Name *
                  </label>
                  <input
                    id="first_name"
                    name="first_name"
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="middle_name" className="block text-sm font-medium text-slate-700 mb-1">
                    Middle Name
                  </label>
                  <input
                    id="middle_name"
                    name="middle_name"
                    type="text"
                    value={formData.middle_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-slate-700 mb-1">
                    Last Name *
                  </label>
                  <input
                    id="last_name"
                    name="last_name"
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div>
                  <label htmlFor="age" className="block text-sm font-medium text-slate-700 mb-1">
                    Age
                  </label>
                  <input
                    id="age"
                    name="age"
                    type="number"
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Contact Info Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-slate-700 mb-1">
                    Phone Number
                  </label>
                  <IMaskInput
                    mask="+380 (00) 000-00-00"
                    lazy={false}
                    value={formData.phone_number || ''}
                    onAccept={(value: string) => {
                      setFormData(prev => ({ ...prev, phone_number: value }));
                    }}
                    unmask={false}
                    id="phone_number"
                    name="phone_number"
                    type="tel"
                    placeholder="+380 (__) ___-__-__"
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                  />
                  {formData.phone_number && formData.phone_number.includes('_') && (
                    <p className="mt-1 text-xs text-slate-500">Please complete the phone number</p>
                  )}
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-slate-700 mb-1">
                    Country
                  </label>
                  <select
                    id="country"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all bg-white"
                  >
                    <option value="">Select a country</option>
                    {COUNTRIES.map((country) => (
                      <option key={country} value={country}>
                        {country}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* About Me Section */}
            <div>
              <h3 className="text-lg font-semibold text-slate-900 mb-4">About Me</h3>
              <div>
                <label htmlFor="bio" className="block text-sm font-medium text-slate-700 mb-1">
                  Bio / Description
                </label>
                <textarea
                  id="bio"
                  name="bio"
                  rows={6}
                  value={formData.bio}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="secondary"
                onClick={handleCancelClick}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                size="lg"
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </form>
        )}
      </div>

      {/* About Section - Separate Card (Only in View Mode) */}
      {!isEditing && user.bio && (
        <div className="mt-6 bg-white rounded-lg shadow-sm border border-slate-200 p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-4">About Me</h2>
          <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">{user.bio}</p>
        </div>
      )}
    </div>
  );
};

