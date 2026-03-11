"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

export interface ProjectInfo {
  id: string;
  name: string;
  status: string;
  progress?: number; // 0-100 percentage
}

interface ProjectContextValue {
  /**
   * Currently selected project, or null for "All Projects" view
   */
  selectedProject: ProjectInfo | null;

  /**
   * All projects available to the client
   */
  projects: ProjectInfo[];

  /**
   * Select a specific project
   */
  selectProject: (project: ProjectInfo) => void;

  /**
   * Clear selection to show "All Projects" view
   */
  clearSelection: () => void;

  /**
   * Whether a specific project is selected (vs "All Projects")
   */
  hasProjectSelected: boolean;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

interface ProjectContextProviderProps {
  children: ReactNode;
  projects: ProjectInfo[];
  initialProjectId?: string | null;
}

/**
 * Provider for project selection state in the Bridge portal
 * Allows clients to switch between "All Projects" and specific project views
 */
export function ProjectContextProvider({
  children,
  projects,
  initialProjectId,
}: ProjectContextProviderProps) {
  const [selectedProject, setSelectedProject] = useState<ProjectInfo | null>(
    () => {
      if (initialProjectId) {
        return projects.find((p) => p.id === initialProjectId) || null;
      }
      return null;
    }
  );

  const selectProject = useCallback((project: ProjectInfo) => {
    setSelectedProject(project);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedProject(null);
  }, []);

  return (
    <ProjectContext.Provider
      value={{
        selectedProject,
        projects,
        selectProject,
        clearSelection,
        hasProjectSelected: selectedProject !== null,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

/**
 * Hook to access project context
 * Must be used within ProjectContextProvider
 */
export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === null) {
    throw new Error(
      "useProjectContext must be used within ProjectContextProvider"
    );
  }
  return context;
}
