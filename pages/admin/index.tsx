import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Users, BookOpen, CreditCard, LayoutDashboard } from 'lucide-react';

export const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Users',
      description: 'Manage system users',
      icon: Users,
      path: '/admin/users',
      color: 'bg-blue-500',
    },
    {
      title: 'Courses',
      description: 'Manage all courses',
      icon: BookOpen,
      path: '/admin/courses',
      color: 'bg-green-500',
    },
    {
      title: 'Payments',
      description: 'View payment history',
      icon: CreditCard,
      path: '/admin/payments',
      color: 'bg-purple-500',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <LayoutDashboard className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => {
            const Icon = card.icon;
            return (
              <div
                key={card.title}
                onClick={() => navigate(card.path)}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-lg transition-shadow duration-200"
              >
                <div className={`w-12 h-12 ${card.color} rounded-lg flex items-center justify-center mb-4`}>
                  <Icon className="w-6 h-6 text-white" />
                </div>
                <h2 className="text-xl font-semibold text-gray-900 mb-2">{card.title}</h2>
                <p className="text-gray-600">{card.description}</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
