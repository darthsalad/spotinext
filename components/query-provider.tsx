"use client"

import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

export default function QueryWrapper({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
	);
}
