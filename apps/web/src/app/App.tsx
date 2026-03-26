import { RouterProvider } from "react-router";
import { router } from "./routes.tsx";
import { AuthProvider } from "../context/AuthContext";
import { SocketProvider } from "../context/SocketContext";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
        <AuthProvider>
            <SocketProvider>
                <RouterProvider router={router} />
            </SocketProvider>
        </AuthProvider>
    </QueryClientProvider>
  );
}