'use client';

import ProtectedRoute from '@/components/ProtectedRoute';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import ChatWindow from '@/components/ChatWindow';
import PageShell from '@/components/PageShell';

export default function CoachPage() {
  return (
    <ProtectedRoute>
      <div className="flex min-h-screen bg-gradient-to-b from-emerald-50 via-white to-white">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <TopBar
            title="AI Coach"
            subtitle="Get personalized guidance for your wellness journey"
          />

          <PageShell className="flex-1 p-8">
            <div className="h-[calc(100vh-180px)]">
              <ChatWindow />
            </div>
          </PageShell>
        </div>
      </div>
    </ProtectedRoute>
  );
}
