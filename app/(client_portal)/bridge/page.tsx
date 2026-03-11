/**
 * Bridge Home Page
 *
 * This is a placeholder page for the client portal overview.
 * The actual implementation will include:
 * - Welcome greeting
 * - Project status cards
 * - Recent activity
 * - Quick actions
 */
export default function BridgeHomePage() {
  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1>Welcome back</h1>
        <p className="mt-2">Here's what's happening with your project.</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Project Progress" value="65%" />
        <StatCard label="Current Phase" value="Design" />
        <StatCard label="Pending Requests" value="2" />
        <StatCard label="New Messages" value="3" />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Activity */}
          <section className="bridge-card">
            <h2 className="mb-4">Recent Activity</h2>
            <div className="space-y-3">
              <ActivityItem
                title="New file uploaded"
                description="Homepage mockup v2.pdf"
                time="2 hours ago"
              />
              <ActivityItem
                title="Milestone completed"
                description="Wireframes approved"
                time="Yesterday"
              />
              <ActivityItem
                title="Message from Sarah"
                description="Looking great! Just a few tweaks..."
                time="2 days ago"
              />
            </div>
          </section>

          {/* Current Milestone */}
          <section className="bridge-card">
            <h2 className="mb-4">Current Milestone</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="font-medium">Phase 2: Design</span>
                <span className="text-[var(--bridge-text-muted)]">
                  4 of 6 tasks complete
                </span>
              </div>
              <div className="h-2 bg-[var(--bridge-bg-surface)] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[var(--bridge-accent)] rounded-full"
                  style={{ width: "66%" }}
                />
              </div>
            </div>
          </section>
        </div>

        {/* Sidebar column */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <section className="bridge-card">
            <h3 className="mb-4">Quick Actions</h3>
            <div className="space-y-2">
              <button className="bridge-btn bridge-btn-secondary w-full justify-start">
                <MessageSquareIcon />
                Send a message
              </button>
              <button className="bridge-btn bridge-btn-secondary w-full justify-start">
                <PlusIcon />
                Submit a request
              </button>
              <button className="bridge-btn bridge-btn-secondary w-full justify-start">
                <FileIcon />
                View files
              </button>
            </div>
          </section>

          {/* Upcoming */}
          <section className="bridge-card">
            <h3 className="mb-4">Coming Up</h3>
            <div className="space-y-3">
              <UpcomingItem
                title="Design Review"
                date="Tomorrow, 2:00 PM"
              />
              <UpcomingItem
                title="Homepage Delivery"
                date="March 15"
              />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="bridge-card">
      <div className="text-[var(--bridge-text-muted)] text-sm">{label}</div>
      <div className="text-2xl font-semibold mt-1">{value}</div>
    </div>
  );
}

function ActivityItem({
  title,
  description,
  time,
}: {
  title: string;
  description: string;
  time: string;
}) {
  return (
    <div className="flex items-start gap-3 py-2 border-b border-[var(--bridge-border-subtle)] last:border-0">
      <div className="w-2 h-2 mt-2 rounded-full bg-[var(--bridge-accent)]" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-sm text-[var(--bridge-text-muted)] truncate">
          {description}
        </div>
      </div>
      <div className="text-xs text-[var(--bridge-text-subtle)] whitespace-nowrap">
        {time}
      </div>
    </div>
  );
}

function UpcomingItem({ title, date }: { title: string; date: string }) {
  return (
    <div className="flex items-center gap-3 py-2">
      <div className="w-8 h-8 rounded-lg bg-[var(--bridge-bg-surface)] flex items-center justify-center">
        <CalendarIcon />
      </div>
      <div>
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-[var(--bridge-text-muted)]">{date}</div>
      </div>
    </div>
  );
}

/* Icons */
function MessageSquareIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg
      className="w-4 h-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <path d="M14.5 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V7.5L14.5 2z" />
      <path d="M14 2v6h6" />
    </svg>
  );
}

function CalendarIcon() {
  return (
    <svg
      className="w-4 h-4 text-[var(--bridge-text-muted)]"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <rect x="3" y="4" width="18" height="18" rx="2" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </svg>
  );
}
