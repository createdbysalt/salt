interface ProjectsLayoutProps {
  children: React.ReactNode;
}

/**
 * Projects Layout - Container for projects routes
 * Each child route (list, detail) provides its own header
 */
export default function ProjectsLayout({ children }: ProjectsLayoutProps) {
  return (
    <div className="flex h-full flex-col">
      {children}
    </div>
  );
}
