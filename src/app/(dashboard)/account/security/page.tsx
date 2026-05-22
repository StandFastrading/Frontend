import { Card, CardContent } from "@/components/ui/card";
import { ChangePasswordForm } from "@/features/account/components/change-password-form";

export default function SecurityPage() {
  return (
    <Card>
      <CardContent className="pt-6">
        <ChangePasswordForm />
      </CardContent>
    </Card>
  );
}
