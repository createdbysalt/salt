import { redirect } from "next/navigation";
import { createClient } from "@/libs/supabase/server";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload, Download } from "lucide-react";

export default async function ProjectFilesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/signin");
  }

  // Fetch all files for this project
  const { data: files } = await supabase
    .from("project_files")
    .select("*")
    .eq("project_id", id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Project Files</h2>
          <p className="text-sm text-muted-foreground mt-1">
            All files and documents for this project
          </p>
        </div>
        <Button>
          <Upload className="h-4 w-4 mr-2" />
          Upload Files
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Files</CardTitle>
        </CardHeader>
        <CardContent>
          {!files || files.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-lg font-medium mb-2">No files uploaded yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Upload documents, images, and other files to share with your team
              </p>
              <Button>
                <Upload className="h-4 w-4 mr-2" />
                Upload Your First File
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="flex items-center justify-between p-4 rounded-md border bg-card hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <FileText className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">{file.file_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {new Date(file.created_at).toLocaleDateString()} •{" "}
                        {file.size_bytes ? `${(file.size_bytes / 1024).toFixed(1)} KB` : "Unknown size"}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
