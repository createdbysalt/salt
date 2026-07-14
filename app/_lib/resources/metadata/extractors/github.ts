/**
 * GitHub Metadata Extractor
 *
 * Extracts metadata from GitHub URLs using the public API.
 * Works without authentication for public repos.
 */

export interface GitHubRepoMetadata {
  owner: string;
  repo: string;
  fullName: string;
  description?: string;
  defaultBranch: string;
  stargazersCount: number;
  forksCount: number;
  openIssuesCount: number;
  language?: string;
  topics: string[];
  isPrivate: boolean;
  updatedAt: string;
}

export interface GitHubPRMetadata {
  owner: string;
  repo: string;
  prNumber: number;
  title: string;
  state: "open" | "closed" | "merged";
  author: string;
  createdAt: string;
  updatedAt: string;
  additions: number;
  deletions: number;
  changedFiles: number;
}

export interface GitHubIssueMetadata {
  owner: string;
  repo: string;
  issueNumber: number;
  title: string;
  state: "open" | "closed";
  author: string;
  createdAt: string;
  updatedAt: string;
  labels: string[];
  commentsCount: number;
}

const GITHUB_API_BASE = "https://api.github.com";

async function fetchGitHub<T>(path: string): Promise<T | null> {
  try {
    const response = await fetch(`${GITHUB_API_BASE}${path}`, {
      headers: {
        Accept: "application/vnd.github.v3+json",
        "User-Agent": "Salt-Software/1.0",
      },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.warn(`GitHub API error: ${response.status} for ${path}`);
      return null;
    }

    return response.json() as Promise<T>;
  } catch (error) {
    console.warn("GitHub API fetch error:", error);
    return null;
  }
}

export async function extractGitHubRepoMetadata(
  owner: string,
  repo: string
): Promise<GitHubRepoMetadata | null> {
  const data = await fetchGitHub<{
    full_name: string;
    description: string | null;
    default_branch: string;
    stargazers_count: number;
    forks_count: number;
    open_issues_count: number;
    language: string | null;
    topics: string[];
    private: boolean;
    updated_at: string;
  }>(`/repos/${owner}/${repo}`);

  if (!data) return null;

  return {
    owner,
    repo,
    fullName: data.full_name,
    description: data.description ?? undefined,
    defaultBranch: data.default_branch,
    stargazersCount: data.stargazers_count,
    forksCount: data.forks_count,
    openIssuesCount: data.open_issues_count,
    language: data.language ?? undefined,
    topics: data.topics,
    isPrivate: data.private,
    updatedAt: data.updated_at,
  };
}

export async function extractGitHubPRMetadata(
  owner: string,
  repo: string,
  prNumber: number
): Promise<GitHubPRMetadata | null> {
  const data = await fetchGitHub<{
    number: number;
    title: string;
    state: "open" | "closed";
    merged: boolean;
    user: { login: string };
    created_at: string;
    updated_at: string;
    additions: number;
    deletions: number;
    changed_files: number;
  }>(`/repos/${owner}/${repo}/pulls/${prNumber}`);

  if (!data) return null;

  return {
    owner,
    repo,
    prNumber: data.number,
    title: data.title,
    state: data.merged ? "merged" : data.state,
    author: data.user.login,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    additions: data.additions,
    deletions: data.deletions,
    changedFiles: data.changed_files,
  };
}

export async function extractGitHubIssueMetadata(
  owner: string,
  repo: string,
  issueNumber: number
): Promise<GitHubIssueMetadata | null> {
  const data = await fetchGitHub<{
    number: number;
    title: string;
    state: "open" | "closed";
    user: { login: string };
    created_at: string;
    updated_at: string;
    labels: Array<{ name: string }>;
    comments: number;
  }>(`/repos/${owner}/${repo}/issues/${issueNumber}`);

  if (!data) return null;

  return {
    owner,
    repo,
    issueNumber: data.number,
    title: data.title,
    state: data.state,
    author: data.user.login,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
    labels: data.labels.map((l) => l.name),
    commentsCount: data.comments,
  };
}
