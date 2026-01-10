"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PageGreetingHeader } from "@/components/patterns/page-greeting-header";
import { useDashboardUser } from "@/src/features/shell/contexts/DashboardUserContext";
import { 
  HelpCircle,
  MessageSquare,
  Book,
  Video,
  Mail,
  Send,
  ExternalLink,
  CheckCircle2,
  Clock
} from "lucide-react";

export default function SupportPage() {
  const user = useDashboardUser();
  
  const tickets = [
    {
      id: "#T-1234",
      subject: "Question about project billing",
      status: "open",
      priority: "medium",
      updated: "2 hours ago"
    },
    {
      id: "#T-1230",
      subject: "Feature request: Export to PDF",
      status: "in-progress",
      priority: "low",
      updated: "1 day ago"
    },
    {
      id: "#T-1225",
      subject: "Issue with client notifications",
      status: "resolved",
      priority: "high",
      updated: "3 days ago"
    }
  ];

  const resources = [
    {
      title: "Getting Started Guide",
      description: "Learn the basics of Salt Core",
      icon: Book,
      link: "#"
    },
    {
      title: "Video Tutorials",
      description: "Watch step-by-step video guides",
      icon: Video,
      link: "#"
    },
    {
      title: "API Documentation",
      description: "Developer resources and API docs",
      icon: Book,
      link: "#"
    },
    {
      title: "Community Forum",
      description: "Connect with other users",
      icon: MessageSquare,
      link: "#"
    }
  ];

  const faqs = [
    {
      question: "How do I add a new client?",
      answer: "Navigate to the Clients page and click the 'Add Client' button in the top right."
    },
    {
      question: "Can I export project data?",
      answer: "Yes, you can export project data from the Projects page using the export button."
    },
    {
      question: "How do I invite team members?",
      answer: "Go to Settings > Studio > Team Members and click 'Invite Team Member'."
    },
    {
      question: "What payment methods do you accept?",
      answer: "We accept all major credit cards, PayPal, and bank transfers for annual plans."
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageGreetingHeader page="support" viewer={user} />

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="cursor-pointer transition-colors hover:bg-muted/40">
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                <MessageSquare className="h-6 w-6 text-primary" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">Contact Support</h3>
                <p className="text-sm text-muted-foreground">
                  Get help from our support team
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer transition-colors hover:bg-muted/40">
          <CardContent>
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-success/10">
                <Book className="h-6 w-6 text-success" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold">Documentation</h3>
                <p className="text-sm text-muted-foreground">
                  Browse our comprehensive guides
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Form */}
      <Card>
        <CardHeader>
          <CardTitle>Submit a Support Ticket</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" placeholder="Brief description of your issue" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="priority">Priority</Label>
            <select 
              id="priority" 
              className="flex h-9 w-full rounded-md border border-input bg-input/30 px-3 py-1 text-sm transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 outline-none"
            >
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea 
              id="message" 
              placeholder="Describe your issue in detail..." 
              rows={6}
            />
          </div>

          <Button disabled title="Coming soon">
            <Send className="h-4 w-4 mr-2" />
            Submit Ticket
          </Button>
        </CardContent>
      </Card>

      {/* Your Tickets */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Your Recent Tickets</h2>
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Card key={ticket.id} className="transition-colors hover:bg-muted/40">
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-muted shrink-0">
                      {ticket.status === 'resolved' ? (
                        <CheckCircle2 className="h-5 w-5 text-success" />
                      ) : (
                        <Clock className="h-5 w-5 text-warning" />
                      )}
                    </div>
                    <div className="space-y-2 flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-medium">{ticket.subject}</p>
                          <p className="text-sm text-muted-foreground">{ticket.id}</p>
                        </div>
                        <div className="flex gap-2">
                          <Badge 
                            variant={
                              ticket.status === 'resolved' ? 'secondary' :
                              ticket.status === 'in-progress' ? 'secondary' : 'outline'
                            }
                          >
                            {ticket.status}
                          </Badge>
                          <Badge variant="outline">
                            {ticket.priority}
                          </Badge>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Updated {ticket.updated}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">View</Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Resources */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Help Resources</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {resources.map((resource, i) => (
            <Card key={i} className="cursor-pointer transition-colors hover:bg-muted/40">
              <CardContent>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10 shrink-0">
                      <resource.icon className="h-5 w-5 text-info" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-medium">{resource.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        {resource.description}
                      </p>
                    </div>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* FAQs */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Frequently Asked Questions</h2>
        <div className="space-y-3">
          {faqs.map((faq, i) => (
            <Card key={i}>
              <CardContent>
                <div className="space-y-2">
                  <h3 className="font-medium flex items-start gap-2">
                    <HelpCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    {faq.question}
                  </h3>
                  <p className="text-sm text-muted-foreground ml-7">
                    {faq.answer}
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Contact Info */}
      <Card>
        <CardHeader>
          <CardTitle>Other Ways to Reach Us</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-3">
            <Mail className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Email Support</p>
              <p className="text-sm text-muted-foreground">support@saltcore.com</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <MessageSquare className="h-5 w-5 text-muted-foreground" />
            <div>
              <p className="font-medium">Live Chat</p>
              <p className="text-sm text-muted-foreground">Available Mon-Fri, 9am-5pm PST</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

