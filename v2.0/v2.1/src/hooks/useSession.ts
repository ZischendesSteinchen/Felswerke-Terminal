'use client';

import { useState, useEffect } from 'react';

export type Role = 'admin' | 'user';

export function useSession() {
  const [role, setRole] = useState<Role | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.role) setRole(data.role);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { role, loading };
}
