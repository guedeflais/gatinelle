import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { OnboardingCarousel } from "@/components/OnboardingCarousel";

export default async function BienvenuePage() {
  const session = await auth();
  if (session?.user) redirect("/payer");

  return <OnboardingCarousel />;
}
