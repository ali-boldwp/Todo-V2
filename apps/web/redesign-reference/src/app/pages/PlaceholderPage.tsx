import React from 'react';
import { useParams } from 'react-router';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description?: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <div className="min-h-full flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-100 to-purple-100 mb-6">
          <Construction className="w-10 h-10 text-indigo-600" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">{title}</h1>
        <p className="text-slate-600">
          {description || 'This feature is coming soon. Stay tuned for updates!'}
        </p>
        <div className="mt-6 px-6 py-3 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
          <p className="text-sm text-indigo-700 font-medium">
            💡 This is a premium light-themed demo showcasing your app's structure
          </p>
        </div>
      </div>
    </div>
  );
}
