"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { createMeeting } from "@/app/actions/meetings/create-meeting";

interface CreateMeetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; name: string; client_id: string }>;
}

export function CreateMeetingDialog({
  open,
  onOpenChange,
  clients,
  projects,
}: CreateMeetingDialogProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sendInvite, setSendInvite] = useState(true);
  const [addToCalendar, setAddToCalendar] = useState(true);

  const [clientId, setClientId] = useState<string>("");
  const [projectId, setProjectId] = useState<string>("");
  const [meetingType, setMeetingType] = useState<string>("");
  const [location, setLocation] = useState<string>("");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [agenda, setAgenda] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!clientId) {
      toast.error("Please select a client.");
      return;
    }
    if (!meetingType) {
      toast.error("Please select a meeting type.");
      return;
    }
    if (!date || !startTime || !endTime) {
      toast.error("Please select a date, start time, and end time.");
      return;
    }
    if (!location) {
      toast.error("Please select a meeting location.");
      return;
    }

    const startDateTime = new Date(`${date}T${startTime}`).toISOString();
    const endDateTime = new Date(`${date}T${endTime}`).toISOString();

    if (new Date(endDateTime) <= new Date(startDateTime)) {
      toast.error("End time must be after start time");
      return;
    }

    setLoading(true);

    try {
      const result = await createMeeting({
        title,
        client_id: clientId,
        project_id: projectId || undefined,
        meeting_type: meetingType as any,
        start_time: startDateTime,
        end_time: endDateTime,
        location_type: location as any,
        meeting_url: meetingUrl || undefined,
        description: agenda || undefined,
        visibility: "shared_with_client",
        attendees: [],
      });

      if (result.error) {
        toast.error(result.error);
        return;
      }

      toast.success("Meeting created successfully");
      onOpenChange(false);
      
      setClientId("");
      setProjectId("");
      setMeetingType("");
      setLocation("");
      setTitle("");
      setDate("");
      setStartTime("");
      setEndTime("");
      setAgenda("");
      setMeetingUrl("");
      
      router.refresh();
    } catch (error) {
      console.error("Error creating meeting:", error);
      toast.error("Failed to create meeting");
    } finally {
      setLoading(false);
    }
  };

  const availableProjects = clientId
    ? projects.filter((p) => p.client_id === clientId)
    : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Schedule New Meeting</DialogTitle>
          <DialogDescription>
            Create a new meeting with a client. Calendar invite will be sent automatically.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="space-y-2">
            <Label htmlFor="title">Meeting Title *</Label>
            <Input
              id="title"
              placeholder="Discovery Call"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>Client *</Label>
            <Select value={clientId || undefined} onValueChange={setClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Project (optional)</Label>
            <Select 
              value={projectId || undefined} 
              onValueChange={setProjectId}
              disabled={!clientId}
            >
              <SelectTrigger>
                <SelectValue placeholder={clientId ? "Select project (optional)..." : "Select a client first..."} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">None</SelectItem>
                {availableProjects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Meeting Type *</Label>
            <Select value={meetingType || undefined} onValueChange={setMeetingType}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="discovery">Discovery</SelectItem>
                <SelectItem value="check-in">Check-in</SelectItem>
                <SelectItem value="review">Review</SelectItem>
                <SelectItem value="kickoff">Kickoff</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="startTime">Start Time *</Label>
              <Input
                id="startTime"
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endTime">End Time *</Label>
              <Input
                id="endTime"
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Location *</Label>
            <Select value={location || undefined} onValueChange={setLocation}>
              <SelectTrigger>
                <SelectValue placeholder="Select location..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="google-meet">Google Meet</SelectItem>
                <SelectItem value="zoom">Zoom</SelectItem>
                <SelectItem value="phone">Phone Call</SelectItem>
                <SelectItem value="in-person">In Person</SelectItem>
                <SelectItem value="custom">Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {(location === "google-meet" || location === "zoom" || location === "custom") && (
            <div className="space-y-2">
              <Label htmlFor="meetingUrl">Meeting URL</Label>
              <Input
                id="meetingUrl"
                type="url"
                placeholder="https://meet.google.com/abc-defg-hij"
                value={meetingUrl}
                onChange={(e) => setMeetingUrl(e.target.value)}
              />
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="agenda">Agenda / Description</Label>
            <Textarea
              id="agenda"
              placeholder="1. Introduction&#10;2. Requirements review&#10;3. Q&A"
              rows={4}
              value={agenda}
              onChange={(e) => setAgenda(e.target.value)}
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="sendInvite"
              checked={sendInvite}
              onCheckedChange={(checked) => setSendInvite(checked as boolean)}
            />
            <label htmlFor="sendInvite" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Send calendar invite to client
            </label>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="addToCalendar"
              checked={addToCalendar}
              onCheckedChange={(checked) => setAddToCalendar(checked as boolean)}
            />
            <label htmlFor="addToCalendar" className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Add to my calendar
            </label>
          </div>

          <div className="flex gap-3 justify-end pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Creating..." : "Schedule Meeting"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
