"use client";

import { AlertCircle, Home } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  const router = useRouter();

  useEffect(() => {
    // Optional: Add analytics tracking for unauthorized access attempts
    console.log("Unauthorized access attempt recorded");
  }, []);

  const handleGoHome = () => {
    router.push("/");
  };

  const handleLogin = () => {
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-6">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-foreground">
            Access Denied
          </h1>
          <p className="mt-2 text-muted-foreground">
            You don't have permission to access this page.
          </p>
        </div>

        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Unauthorized Access</AlertTitle>
          <AlertDescription>
            This page requires administrator privileges. Please contact your
            system administrator if you believe this is an error.
          </AlertDescription>
        </Alert>

        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="flex-1" onClick={handleGoHome}>
            <Home className="mr-2 h-4 w-4" />
            Go Home
          </Button>
          <Button className="flex-1" variant="outline" onClick={handleLogin}>
            Login
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          <p>Need help? Contact support for assistance.</p>
        </div>
      </div>
    </div>
  );
}
