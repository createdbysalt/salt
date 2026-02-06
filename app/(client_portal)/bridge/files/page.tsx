import { getTenantContext } from "@/app/_lib/tenancy";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/app/_components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/_components/ui/tabs";
import { FolderOpen } from "lucide-react";
import { createClient } from "@/app/_lib/supabase/server";
import { FileUpload } from "./file-upload";
import { FileList } from "./file-list";
import { getProjectFiles } from "./actions";

export const dynamic = "force-dynamic";

export default async function BridgeFilesPage() {
  const { context } = await getTenantContext();

  if (!context.userId) {
    redirect("/");
  }

  if (!context.client) {
    redirect("/select");
  }

  const supabase = await createClient();

  // Get projects for this client
  const { data: projects } = await supabase
    .from("projects")
    .select("id, name")
    .eq("client_id", context.client.id)
    .order("name");

  // Get all files across all projects
  const allFilesPromises = (projects || []).map(async (project) => {
    const result = await getProjectFiles(project.id);
    return {
      projectId: project.id,
      projectName: project.name,
      files: result.success ? result.data || [] : [],
    };
  });

  const projectFiles = await Promise.all(allFilesPromises);
  const allFiles = projectFiles.flatMap((p) => p.files);

  // Group files by category
  const filesByCategory = {
    brand_asset: allFiles.filter((f) => f.category === "brand_asset"),
    deliverable: allFiles.filter((f) => f.category === "deliverable"),
    contract: allFiles.filter((f) => f.category === "contract"),
    screenshot: allFiles.filter((f) => f.category === "screenshot"),
    other: allFiles.filter((f) => f.category === "other"),
  };

  const hasFiles = allFiles.length > 0;
  const primaryProject = projects?.[0];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Knowledge Base</h1>
          <p className="text-muted-foreground mt-2">
            Your business assets, organized and accessible
          </p>
        </div>
        {primaryProject && <FileUpload projectId={primaryProject.id} />}
      </div>

      {/* Files Section */}
      {!hasFiles ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <FolderOpen className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No files yet</p>
              <p className="text-sm">
                Upload documents, images, and other files to share with your team.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Digital Assets</CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="all" className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="all">All ({allFiles.length})</TabsTrigger>
                <TabsTrigger value="brand_asset">Brand Assets ({filesByCategory.brand_asset.length})</TabsTrigger>
                <TabsTrigger value="deliverable">Deliverables ({filesByCategory.deliverable.length})</TabsTrigger>
                <TabsTrigger value="contract">Contracts ({filesByCategory.contract.length})</TabsTrigger>
                <TabsTrigger value="screenshot">Screenshots ({filesByCategory.screenshot.length})</TabsTrigger>
                <TabsTrigger value="other">Other ({filesByCategory.other.length})</TabsTrigger>
              </TabsList>
              
              <TabsContent value="all" className="mt-0">
                <FileList files={allFiles} canDelete={false} />
              </TabsContent>
              
              <TabsContent value="brand_asset" className="mt-0">
                {filesByCategory.brand_asset.length > 0 ? (
                  <FileList files={filesByCategory.brand_asset} canDelete={false} />
                ) : (
                  <p className="text-center text-muted-foreground py-8">No brand assets yet</p>
                )}
              </TabsContent>
              
              <TabsContent value="deliverable" className="mt-0">
                {filesByCategory.deliverable.length > 0 ? (
                  <FileList files={filesByCategory.deliverable} canDelete={false} />
                ) : (
                  <p className="text-center text-muted-foreground py-8">No deliverables yet</p>
                )}
              </TabsContent>
              
              <TabsContent value="contract" className="mt-0">
                {filesByCategory.contract.length > 0 ? (
                  <FileList files={filesByCategory.contract} canDelete={false} />
                ) : (
                  <p className="text-center text-muted-foreground py-8">No contracts yet</p>
                )}
              </TabsContent>
              
              <TabsContent value="screenshot" className="mt-0">
                {filesByCategory.screenshot.length > 0 ? (
                  <FileList files={filesByCategory.screenshot} canDelete={false} />
                ) : (
                  <p className="text-center text-muted-foreground py-8">No screenshots yet</p>
                )}
              </TabsContent>
              
              <TabsContent value="other" className="mt-0">
                {filesByCategory.other.length > 0 ? (
                  <FileList files={filesByCategory.other} canDelete={false} />
                ) : (
                  <p className="text-center text-muted-foreground py-8">No other files yet</p>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

