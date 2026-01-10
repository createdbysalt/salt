"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageGreetingHeader } from "@/components/patterns/page-greeting-header";
import { useDashboardUser } from "@/src/features/shell/contexts/DashboardUserContext";
import { 
  MessageSquare,
  AlertTriangle,
  DollarSign,
  Sparkles,
  CheckCircle2,
  Send
} from "lucide-react";

export default function InboxPage() {
  const user = useDashboardUser();
  
  // Chat conversations
  const conversations = [
    {
      id: 1,
      client: "John Smith",
      company: "Acme Corp",
      lastMessage: "Can you add contact form to the site?",
      time: "2h ago",
      unread: 2,
      avatar: "JS",
    },
    {
      id: 2,
      client: "Sarah Johnson",
      company: "TechStart Inc",
      lastMessage: "Thanks for the quick turnaround!",
      time: "5h ago",
      unread: 0,
      avatar: "SJ",
    },
    {
      id: 3,
      client: "Mike Chen",
      company: "DesignCo",
      lastMessage: "When can we schedule the next review?",
      time: "Yesterday",
      unread: 1,
      avatar: "MC",
    },
    {
      id: 4,
      client: "Emily Davis",
      company: "Healthcare Co",
      lastMessage: "The new homepage looks great!",
      time: "2 days ago",
      unread: 0,
      avatar: "ED",
    },
  ];

  // System notifications
  const notifications = [
    {
      id: 1,
      type: "alert",
      icon: AlertTriangle,
      color: "text-warning",
      bg: "bg-warning/10",
      title: "Site Alert",
      message: "Law Firm site experiencing downtime",
      time: "5m ago",
      unread: true,
    },
    {
      id: 2,
      type: "payment",
      icon: DollarSign,
      color: "text-success",
      bg: "bg-success/10",
      title: "Payment Received",
      message: "$2,400 from Healthcare Co",
      time: "Yesterday",
      unread: true,
    },
    {
      id: 3,
      type: "system",
      icon: Sparkles,
      color: "text-primary",
      bg: "bg-primary/10",
      title: "AI Audit Complete",
      message: "Healthcare industry analysis is ready to view",
      time: "1 day ago",
      unread: false,
    },
    {
      id: 4,
      type: "system",
      icon: CheckCircle2,
      color: "text-success",
      bg: "bg-success/10",
      title: "Deployment Success",
      message: "Acme Corp site deployed successfully",
      time: "6h ago",
      unread: false,
    },
    {
      id: 5,
      type: "alert",
      icon: AlertTriangle,
      color: "text-info",
      bg: "bg-info/10",
      title: "SSL Renewal",
      message: "TechStart Inc SSL certificate expires in 30 days",
      time: "2 days ago",
      unread: false,
    },
  ];

  const unreadMessages = conversations.reduce((sum, conv) => sum + conv.unread, 0);
  const unreadNotifications = notifications.filter(n => n.unread).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageGreetingHeader page="inbox" viewer={user} />

      {/* Tabs */}
      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">
            Chat
            {unreadMessages > 0 && (
              <Badge variant="secondary" className="ml-2">{unreadMessages}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="notifications">
            Notifications
            {unreadNotifications > 0 && (
              <Badge variant="secondary" className="ml-2">{unreadNotifications}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Chat Tab */}
        <TabsContent value="chat" className="space-y-3 mt-6">
          {conversations.map((conversation) => (
            <Card key={conversation.id} className="cursor-pointer transition-colors hover:bg-muted/40">
              <CardContent>
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary font-medium shrink-0">
                    {conversation.avatar}
                  </div>
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{conversation.client}</p>
                          {conversation.unread > 0 && (
                            <Badge variant="secondary" className="text-[10px]">{conversation.unread} new</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground">{conversation.company}</p>
                      </div>
                      <span className="text-xs text-muted-foreground whitespace-nowrap">{conversation.time}</span>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-1">{conversation.lastMessage}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          {/* Filters */}
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm">All</Button>
            <Button variant="ghost" size="sm">Alerts</Button>
            <Button variant="ghost" size="sm">Payments</Button>
            <Button variant="ghost" size="sm">System</Button>
          </div>

          {/* Notification List */}
          <div className="space-y-3">
            {notifications.map((notification) => {
              const Icon = notification.icon;
              return (
                <Card
                  key={notification.id}
                  className={`transition-colors hover:bg-muted/40 ${notification.unread ? "" : "opacity-70"}`}
                >
                  <CardContent>
                    <div className="flex items-start gap-4">
                      <div className={`flex h-10 w-10 items-center justify-center rounded-lg shrink-0 ${notification.bg}`}>
                        <Icon className={`h-5 w-5 ${notification.color}`} />
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{notification.title}</p>
                            {notification.unread && (
                              <div className="h-2 w-2 rounded-full bg-primary" />
                            )}
                          </div>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">{notification.time}</span>
                        </div>
                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

