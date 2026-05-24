import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { OnboardingForm } from "@/features/onboarding/components/onboarding-form";

export default function OnboardingPage() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Welcome to Standfast</CardTitle>
        <CardDescription>
          Let&apos;s get your account set up. This will only take a minute.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <OnboardingForm />
      </CardContent>
    </Card>
  );
}
