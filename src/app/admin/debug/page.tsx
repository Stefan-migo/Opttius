"use client";

import { Database, RefreshCw, Shield, User } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthContext } from "@/contexts/AuthContext";
import { createClient } from "@/utils/supabase/client";

export default function AdminDebugPage() {
  const { user, profile, loading, error } = useAuthContext();
  const [adminStatus, setAdminStatus] = useState<unknown>(null);
  const [dbConnection, setDbConnection] = useState<unknown>(null);
  const [debugInfo, setDebugInfo] = useState<unknown[]>([]);

  const addDebugLog = (message: string, data?: unknown) => {
    const timestamp = new Date().toLocaleTimeString();
    setDebugInfo((prev) => [...prev.slice(-20), { timestamp, message, data }]);
  };

  const checkAdminStatus = async () => {
    try {
      addDebugLog("🔍 Checking admin status...");
      const supabase = createClient();

      if (!user) {
        addDebugLog("❌ No user found");
        setAdminStatus({ isAdmin: false, error: "No user" });
        return;
      }

      addDebugLog("👤 User found", { email: user.email, id: user.id });

      const { data, error } = await supabase.rpc("is_admin", {
        user_id: user.id,
      });

      if (error) {
        addDebugLog("❌ Admin check error", error);
        setAdminStatus({ isAdmin: false, error: error.message });
      } else {
        addDebugLog("✅ Admin check result", { isAdmin: !!data });
        setAdminStatus({ isAdmin: !!data, error: null });
      }
    } catch (err) {
      addDebugLog("❌ Admin check exception", err);
      setAdminStatus({ isAdmin: false, error: "Exception occurred" });
    }
  };

  const checkDatabaseConnection = async () => {
    try {
      addDebugLog("🔍 Checking database connection...");
      const supabase = createClient();

      const { data, error } = await supabase
        .from("admin_users")
        .select("id, email, role")
        .limit(1);

      if (error) {
        addDebugLog("❌ Database error", error);
        setDbConnection({ connected: false, error: error.message });
      } else {
        addDebugLog("✅ Database connected", { adminCount: data?.length || 0 });
        setDbConnection({ connected: true, adminUsers: data });
      }
    } catch (err) {
      addDebugLog("❌ Database exception", err);
      setDbConnection({ connected: false, error: "Exception occurred" });
    }
  };

  useEffect(() => {
    addDebugLog("🚀 Debug page loaded");
    if (user) {
      addDebugLog("👤 User detected on load", { email: user.email });
      checkAdminStatus();
    }
    checkDatabaseConnection();
  }, [user]);

  const refreshAll = () => {
    addDebugLog("🔄 Manual refresh triggered");
    checkAdminStatus();
    checkDatabaseConnection();
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-azul-profundo">
            Admin Debug Console
          </h1>
          <p className="text-tierra-media">
            Diagnostic tools for admin authentication issues
          </p>
        </div>

        <Button onClick={refreshAll}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh All
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Auth Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Authentication Status
            </CardTitle>
            <User className="h-4 w-4 text-azul-profundo" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm">Loading:</span>
                <Badge variant={loading ? "destructive" : "secondary"}>
                  {loading ? "Yes" : "No"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">User:</span>
                <Badge variant={user ? "default" : "destructive"}>
                  {user ? "Logged In" : "Not Logged In"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Profile:</span>
                <Badge variant={profile ? "default" : "secondary"}>
                  {profile ? "Loaded" : "Not Loaded"}
                </Badge>
              </div>
              {user && (
                <div className="text-xs text-tierra-media mt-2">
                  Email: {user.email}
                </div>
              )}
              {error && (
                <div className="text-xs text-red-500 mt-2">
                  Error: {error.message}
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Admin Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Admin Status</CardTitle>
            <Shield className="h-4 w-4 text-dorado" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {adminStatus ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Is Admin:</span>
                    <Badge
                      variant={adminStatus.isAdmin ? "default" : "destructive"}
                    >
                      {adminStatus.isAdmin ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {adminStatus.error && (
                    <div className="text-xs text-red-500 mt-2">
                      Error: {adminStatus.error}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-tierra-media">
                  No admin check performed yet
                </div>
              )}
              <Button
                className="w-full mt-2"
                disabled={!user}
                size="sm"
                variant="outline"
                onClick={checkAdminStatus}
              >
                Check Admin Status
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Database Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Database Status
            </CardTitle>
            <Database className="h-4 w-4 text-verde-suave" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {dbConnection ? (
                <>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Connected:</span>
                    <Badge
                      variant={
                        dbConnection.connected ? "default" : "destructive"
                      }
                    >
                      {dbConnection.connected ? "Yes" : "No"}
                    </Badge>
                  </div>
                  {dbConnection.adminUsers && (
                    <div className="text-xs text-tierra-media mt-2">
                      Admin users found: {dbConnection.adminUsers.length}
                    </div>
                  )}
                  {dbConnection.error && (
                    <div className="text-xs text-red-500 mt-2">
                      Error: {dbConnection.error}
                    </div>
                  )}
                </>
              ) : (
                <div className="text-sm text-tierra-media">
                  Checking database connection...
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Debug Log */}
      <Card>
        <CardHeader>
          <CardTitle>Debug Log</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {debugInfo.length === 0 ? (
              <div className="text-tierra-media text-sm">
                No debug logs yet...
              </div>
            ) : (
              debugInfo.map((log, index) => (
                <div className="flex items-start gap-3 text-sm" key={index}>
                  <span className="text-xs text-tierra-media font-mono">
                    {log.timestamp}
                  </span>
                  <span className="flex-1">{log.message}</span>
                  {log.data && (
                    <pre className="text-xs bg-gray-100 p-1 rounded max-w-xs overflow-hidden">
                      {JSON.stringify(log.data, null, 2)}
                    </pre>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/login")}
            >
              Go to Login
            </Button>
            <Button
              variant="outline"
              onClick={() => (window.location.href = "/admin")}
            >
              Try Admin Dashboard
            </Button>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Reload Page
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = "/login";
              }}
            >
              Clear Storage & Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
