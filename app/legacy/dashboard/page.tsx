import { createClient } from "@/libs/supabase/server";
import { Card, CardHeader, CardTitle, CardContent, Button, Badge } from "@/components/ui";
import { StatCard } from "@/components/ui/stat-card";
import { LineChart, BarChart } from "@/components/charts";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Sample analytics data
  const lineData = [
    { month: "Jan", revenue: 4000, users: 2400 },
    { month: "Feb", revenue: 3000, users: 1398 },
    { month: "Mar", revenue: 2000, users: 9800 },
    { month: "Apr", revenue: 2780, users: 3908 },
    { month: "May", revenue: 1890, users: 4800 },
    { month: "Jun", revenue: 2390, users: 3800 },
  ];

  const barData = [
    { name: "Mon", value: 12 },
    { name: "Tue", value: 19 },
    { name: "Wed", value: 3 },
    { name: "Thu", value: 5 },
    { name: "Fri", value: 2 },
    { name: "Sat", value: 8 },
    { name: "Sun", value: 15 },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {user.email?.split("@")[0]}</h1>
        <p className="text-muted-foreground mt-2">
          Here's what's happening with your projects today.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Revenue"
          value="$45,231.89"
          description="+20.1% from last month"
        />
        <StatCard
          title="Active Users"
          value="+2350"
          description="+180.1% from last month"
        />
        <StatCard
          title="Sales"
          value="+12,234"
          description="+19% from last month"
        />
        <StatCard
          title="Active Now"
          value="+573"
          description="+201 since last hour"
        />
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <LineChart
              data={lineData}
              lines={[
                { dataKey: "revenue", name: "Revenue", stroke: "rgb(var(--chart-1))" },
                { dataKey: "users", name: "Users", stroke: "rgb(var(--chart-2))" },
              ]}
              xAxisKey="month"
              height={300}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Weekly Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={barData}
              bars={[
                { dataKey: "value", name: "Activity", fill: "rgb(var(--chart-3))" },
              ]}
              xAxisKey="name"
              height={300}
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">New user registration</p>
                <p className="text-sm text-muted-foreground">2 minutes ago</p>
              </div>
              <Badge>New</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Payment received</p>
                <p className="text-sm text-muted-foreground">1 hour ago</p>
              </div>
              <Badge variant="secondary">Payment</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Project completed</p>
                <p className="text-sm text-muted-foreground">3 hours ago</p>
              </div>
              <Badge variant="outline">Complete</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
