"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  createPointObjectCloudSyncSession,
  type PointObjectCloudSyncStatus
} from "@/src/lib/prototype/point-object-cloud-client";
import {
  importPointObjectCloudArtifact,
  type PointObjectProjectIdentity,
  type SavedPointObjectArtifact,
  type SavedPointObjectProject
} from "@/src/lib/prototype/point-object-projects";

function authenticatedCloudIdentity(value: PointObjectProjectIdentity | null): value is `user:${string}` {
  return typeof value === "string" && value.startsWith("user:") && value.length > "user:".length;
}

export function usePointObjectCloudSync(input: {
  identityKey: PointObjectProjectIdentity | null;
  isSessionResolved: boolean;
  isDemoUser: boolean;
}) {
  const [status, setStatus] = useState<PointObjectCloudSyncStatus>("idle");
  const sessionRef = useRef<ReturnType<typeof createPointObjectCloudSyncSession> | null>(null);

  useEffect(() => {
    sessionRef.current?.close();
    sessionRef.current = null;
    if (!input.isSessionResolved || input.isDemoUser || !authenticatedCloudIdentity(input.identityKey)) {
      setStatus("idle");
      return;
    }
    const session = createPointObjectCloudSyncSession({
      identityKey: input.identityKey,
      importArtifact: importPointObjectCloudArtifact,
      onStatus: setStatus
    });
    sessionRef.current = session;
    void session.start();
    return () => {
      session.close();
      if (sessionRef.current === session) sessionRef.current = null;
    };
  }, [input.identityKey, input.isDemoUser, input.isSessionResolved]);

  const persist = useCallback(async (project: SavedPointObjectProject, artifact: SavedPointObjectArtifact) => {
    const session = sessionRef.current;
    if (!session || session.identityKey !== input.identityKey) return;
    return session.persist({ projectId: project.projectId, name: project.name, createdAt: project.createdAt }, artifact);
  }, [input.identityKey]);

  return { status, persist };
}
