import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initialData = {
  firstName: "John",
  lastName: "Doe",
  email: "john.doe@student.edu",
  phone: "+1 (555) 123-4567",
  bio: "Computer Science student passionate about web development",
  university: "Tech University",
  major: "Computer Science",
  graduationYear: "2025",
};

export function ProfileTab() {
  const [formData, setFormData] = useState(initialData);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    const changed = JSON.stringify(formData) !== JSON.stringify(initialData);
    setHasChanges(changed);
  }, [formData]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = () => {
    console.log("Saving profile data:", formData);
    setHasChanges(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal details and profile information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="firstName">First Name</Label>
            <Input
              id="firstName"
              value={formData.firstName}
              onChange={(e) => handleChange("firstName", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last Name</Label>
            <Input
              id="lastName"
              value={formData.lastName}
              onChange={(e) => handleChange("lastName", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleChange("email", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number</Label>
          <Input
            id="phone"
            value={formData.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">Bio</Label>
          <Textarea
            id="bio"
            value={formData.bio}
            onChange={(e) => handleChange("bio", e.target.value)}
            rows={3}
          />
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="university">University</Label>
            <Input
              id="university"
              value={formData.university}
              onChange={(e) => handleChange("university", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="major">Major</Label>
            <Input
              id="major"
              value={formData.major}
              onChange={(e) => handleChange("major", e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="graduationYear">Expected Graduation Year</Label>
          <Input
            id="graduationYear"
            value={formData.graduationYear}
            onChange={(e) => handleChange("graduationYear", e.target.value)}
          />
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
