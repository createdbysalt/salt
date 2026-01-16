"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTagManagement } from "@/app/_features/shared/hooks/useTagManagement";
import { getTagColorClass } from "@/app/_features/shared/types/tags";
import { 
  Plus, 
  X, 
  Tag as TagIcon,
  AlertCircle,
  Zap,
  TrendingUp,
  AlertTriangle,
  Clock,
  Ban
} from "lucide-react";

// Icon mapping
const iconMap: Record<string, any> = {
  'AlertCircle': AlertCircle,
  'Zap': Zap,
  'TrendingUp': TrendingUp,
  'AlertTriangle': AlertTriangle,
  'Clock': Clock,
  'Ban': Ban,
  'Tag': TagIcon,
};

function TagSection({ 
  title, 
  description, 
  type 
}: { 
  title: string; 
  description: string; 
  type: 'client' | 'project' 
}) {
  const { tags, createTag, deleteTag } = useTagManagement(type);
  const [newTagLabel, setNewTagLabel] = useState('');
  const [error, setError] = useState('');

  const handleCreateTag = () => {
    setError('');
    const result = createTag(newTagLabel);
    
    if (result) {
      setNewTagLabel('');
    } else {
      if (!newTagLabel.trim()) {
        setError('Tag name cannot be empty');
      } else {
        setError('Tag already exists');
      }
    }
  };

  const handleDeleteTag = (tagId: string) => {
    deleteTag(tagId);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleCreateTag();
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Tag List */}
          <div className="space-y-2">
            {tags.map((tag) => {
              const Icon = iconMap[tag.icon] || TagIcon;
              return (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Badge 
                      variant="secondary"
                      className={`${getTagColorClass(tag.color)} text-[10px]`}
                    >
                      <Icon className="h-3 w-3 mr-1" />
                      {tag.label}
                    </Badge>
                    {tag.isBuiltIn && (
                      <span className="text-xs text-muted-foreground">Built-in</span>
                    )}
                  </div>
                  
                  {tag.isBuiltIn ? (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      disabled
                      className="opacity-50 cursor-not-allowed"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleDeleteTag(tag.id)}
                      className="hover:bg-destructive/10 hover:text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Add New Tag */}
          <div className="space-y-2">
            <div className="flex gap-2">
              <Input
                placeholder="New tag name..."
                value={newTagLabel}
                onChange={(e) => {
                  setNewTagLabel(e.target.value);
                  setError('');
                }}
                onKeyPress={handleKeyPress}
              />
              <Button onClick={handleCreateTag}>
                <Plus className="h-4 w-4 mr-2" />
                Add Tag
              </Button>
            </div>
            {error && (
              <p className="text-xs text-destructive">{error}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function TagManagementPanel() {
  return (
    <div className="space-y-6 mt-6">
      <TagSection
        title="Client Tags"
        description="Manage tags for organizing clients"
        type="client"
      />
      
      <TagSection
        title="Project Tags"
        description="Manage tags for organizing projects"
        type="project"
      />
    </div>
  );
}

