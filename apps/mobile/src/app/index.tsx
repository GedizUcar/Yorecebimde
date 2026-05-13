import { useEffect } from 'react';
import { Redirect } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { hasSession } from '@/lib/api';

export default function Index() {
  const { data, isLoading } = useQuery({
    queryKey: ['session'],
    queryFn: () => hasSession(),
  });

  useEffect(() => {
    // Splash görünmüyor — _layout queryClient bekler
  }, []);

  if (isLoading) return null;
  return data ? <Redirect href="/(tabs)" /> : <Redirect href="/login" />;
}
