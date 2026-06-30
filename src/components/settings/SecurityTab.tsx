import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

const initialData = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const initialSettings = {
  twoFactorAuth: false,
  loginAlerts: true,
  sessionTimeout: true,
};

export function SecurityTab() {
  const [passwordData, setPasswordData] = useState(initialData);
  const [settings, setSettings] = useState(initialSettings);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const passwordChanged =
      passwordData.currentPassword !== "" ||
      passwordData.newPassword !== "" ||
      passwordData.confirmPassword !== "";
    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(initialSettings);
    setHasChanges(passwordChanged || settingsChanged);
  }, [passwordData, settings]);

  const handlePasswordChange = (field: string, value: string) => {
    setPasswordData((prev) => ({ ...prev, [field]: value }));
  };

  const handleToggle = (key: keyof typeof settings) => {
    setSettings((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    console.log("Saving security settings:", { passwordData, settings });
    setPasswordData(initialData);
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Security Settings</CardTitle>
        <CardDescription>Manage your password and security preferences</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">Change Password</h3>

          <div className="space-y-2">
            <Label htmlFor="currentPassword">Current Password</Label>
            <Input
              id="currentPassword"
              type="password"
              value={passwordData.currentPassword}
              onChange={(e) => handlePasswordChange("currentPassword", e.target.value)}
              placeholder="Enter current password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => handlePasswordChange("newPassword", e.target.value)}
              placeholder="Enter new password"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => handlePasswordChange("confirmPassword", e.target.value)}
              placeholder="Confirm new password"
            />
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-900">Security Preferences</h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="twoFactorAuth" className="text-sm font-medium">
                  Two-Factor Authentication
                </Label>
                <p className="text-sm text-gray-500">
                  Add an extra layer of security to your account
                </p>
              </div>
              <Switch
                id="twoFactorAuth"
                checked={settings.twoFactorAuth}
                onCheckedChange={() => handleToggle("twoFactorAuth")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="loginAlerts" className="text-sm font-medium">
                  Login Alerts
                </Label>
                <p className="text-sm text-gray-500">Get notified of new login activity</p>
              </div>
              <Switch
                id="loginAlerts"
                checked={settings.loginAlerts}
                onCheckedChange={() => handleToggle("loginAlerts")}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="sessionTimeout" className="text-sm font-medium">
                  Automatic Session Timeout
                </Label>
                <p className="text-sm text-gray-500">
                  Log out automatically after period of inactivity
                </p>
              </div>
              <Switch
                id="sessionTimeout"
                checked={settings.sessionTimeout}
                onCheckedChange={() => handleToggle("sessionTimeout")}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4 border-t pt-6">
          <h3 className="text-sm font-semibold text-gray-900">Active Sessions</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Current Session</p>
                <p className="text-sm text-gray-500">Windows • Chrome • Boston, MA</p>
              </div>
              <span className="text-xs font-medium text-green-600">Active now</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p className="font-medium">Mobile Device</p>
                <p className="text-sm text-gray-500">iOS • Safari • 2 days ago</p>
              </div>
              <Button variant="outline" size="sm">
                Revoke
              </Button>
            </div>
          </div>
        </div>

        <div className="sticky bottom-4 flex justify-end border-t bg-white pt-4">
          <Button
            onClick={handleSave}
            disabled={!hasChanges}
            className="bg-[#4F46E5] hover:bg-[#4338CA] disabled:opacity-50"
          >
            Save changes
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
