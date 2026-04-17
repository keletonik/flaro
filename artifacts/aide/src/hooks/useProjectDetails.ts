import { useCallback, useEffect, useState } from "react";
import { apiFetch } from "@/lib/api";

export interface ProjectMilestone {
  id: string;
  projectId: string;
  name: string;
  description: string | null;
  dueDate: string | null;
  completedAt: string | null;
  position: number;
  colour: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectMember {
  id: string;
  projectId: string;
  name: string;
  role: "Lead" | "Contributor" | "Reviewer" | "Stakeholder" | null;
  avatarColor: string | null;
  active: boolean;
  createdAt: string;
}

export interface ProjectActivity {
  id: string;
  projectId: string;
  taskId: string | null;
  milestoneId: string | null;
  action: string;
  actor: string | null;
  summary: string;
  meta: unknown;
  createdAt: string;
}

export function useProjectDetails(projectId: string | null) {
  const [milestones, setMilestones] = useState<ProjectMilestone[]>([]);
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [activity, setActivity] = useState<ProjectActivity[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!projectId) {
      setMilestones([]);
      setMembers([]);
      setActivity([]);
      return;
    }
    setLoading(true);
    try {
      const [m, mem, act] = await Promise.all([
        apiFetch<ProjectMilestone[]>(`/projects/${projectId}/milestones`).catch(() => []),
        apiFetch<ProjectMember[]>(`/projects/${projectId}/members`).catch(() => []),
        apiFetch<ProjectActivity[]>(`/projects/${projectId}/activity?limit=50`).catch(() => []),
      ]);
      setMilestones(m);
      setMembers(mem);
      setActivity(act);
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addMilestone = useCallback(async (input: { name: string; dueDate?: string | null; description?: string | null; colour?: string | null }) => {
    if (!projectId) return;
    await apiFetch(`/projects/${projectId}/milestones`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    await refresh();
  }, [projectId, refresh]);

  const toggleMilestone = useCallback(async (milestoneId: string, completed: boolean) => {
    if (!projectId) return;
    await apiFetch(`/projects/${projectId}/milestones/${milestoneId}`, {
      method: "PATCH",
      body: JSON.stringify({ completed }),
    });
    await refresh();
  }, [projectId, refresh]);

  const deleteMilestone = useCallback(async (milestoneId: string) => {
    if (!projectId) return;
    await apiFetch(`/projects/${projectId}/milestones/${milestoneId}`, { method: "DELETE" });
    await refresh();
  }, [projectId, refresh]);

  const addMember = useCallback(async (input: { name: string; role?: string; avatarColor?: string }) => {
    if (!projectId) return;
    await apiFetch(`/projects/${projectId}/members`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    await refresh();
  }, [projectId, refresh]);

  const removeMember = useCallback(async (memberId: string) => {
    if (!projectId) return;
    await apiFetch(`/projects/${projectId}/members/${memberId}`, { method: "DELETE" });
    await refresh();
  }, [projectId, refresh]);

  return {
    milestones,
    members,
    activity,
    loading,
    refresh,
    addMilestone,
    toggleMilestone,
    deleteMilestone,
    addMember,
    removeMember,
  };
}
