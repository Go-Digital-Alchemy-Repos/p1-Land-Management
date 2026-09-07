import { useState } from "react";
import { PageLayout } from "@/components/layout/page-layout";
import { LoginDialog } from "@/components/auth/login-dialog";
import { Button } from "@/components/ui/button";
import { Clock, ClipboardCheck, Users, BarChart3, Star, ArrowRight } from "lucide-react";
import { useDirectorySettings } from "@/hooks/use-directory-settings";

const membershipBenefits = [
  {
    icon: ClipboardCheck,
    title: "Directory Listing",
    description:
      "Get a profile in our searchable directory, visible to people looking for the kind of listing, expertise, or support you provide.",
  },
  {
    icon: Users,
    title: "Qualified Connections",
    description:
      "Receive inquiries from people actively searching for trusted profiles that match their needs.",
  },
  {
    icon: BarChart3,
    title: "Profile Analytics",
    description:
      "Track how many people view your profile, where they're located, and which specializations attract the most interest.",
  },
  {
    icon: Star,
    title: "Community Access",
    description:
      "Join a network of approved listing owners for shared resources, community events, and platform updates.",
  },
];

const applicationSteps = [
  {
    step: 1,
    title: "Submit Your Application",
    description:
      "Complete the online application with your background, categories, credentials, and relevant experience.",
  },
  {
    step: 2,
    title: "Profile Review",
    description:
      "Our team reviews your submitted profile details to support trust, quality, and directory fit.",
  },
  {
    step: 3,
    title: "Fit Review",
    description:
      "We assess whether your profile is a strong fit for the active directory model and audience.",
  },
  {
    step: 4,
    title: "Profile Setup",
    description:
      "Build your profile with description, categories, location, contact details, availability, and media where supported.",
  },
  {
    step: 5,
    title: "Go Live in the Directory",
    description:
      "Once approved, your profile goes live and becomes visible to people searching the directory.",
  },
];

export default function JoinNetworkPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const { settings: directorySettings } = useDirectorySettings();
  const listingLabel =
    directorySettings.listingLabelSingular ||
    directorySettings.participantLabelSingular ||
    "Directory Profile";

  return (
    <PageLayout>
      <section
        className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 text-center"
        data-testid="section-join-hero"
      >
        <h1
          className="font-heading text-3xl sm:text-4xl md:text-5xl font-bold mb-6"
          data-testid="text-join-title"
        >
          Are you ready to publish your {listingLabel.toLowerCase()} in our{" "}
          {directorySettings.directoryLabelSingular}?{" "}
          <span className="text-accent">Join the Network</span>
        </h1>

        <Button
          size="lg"
          className="w-full bg-accent px-8 py-6 text-base text-accent-foreground border-accent-border opacity-60 cursor-not-allowed sm:w-auto"
          disabled
          data-testid="button-apply-member"
        >
          <Clock className="mr-2 h-5 w-5" />
          {directorySettings.directoryRequiresApplicationProcess
            ? "Apply to Join"
            : "Registration opens soon."}
        </Button>

        <p
          className="text-sm sm:text-base text-muted-foreground mt-6"
          data-testid="text-login-prompt"
        >
          If you already have an account,{" "}
          <button
            onClick={() => setLoginOpen(true)}
            className="text-accent underline underline-offset-2 hover:text-accent/80 font-medium"
            data-testid="button-member-login"
          >
            Log in
          </button>{" "}
          to manage your profile.
        </p>
      </section>

      <section
        className="relative bg-muted/30 overflow-hidden"
        data-testid="section-membership-benefits"
      >
        <div
          className="pointer-events-none absolute top-0 left-0 right-0 h-32"
          style={{
            background:
              "radial-gradient(ellipse at 50% 0%, hsl(var(--accent) / 0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24">
          <h2
            className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-10 sm:mb-14"
            data-testid="text-membership-heading"
          >
            What Does Membership Include?
          </h2>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4 lg:gap-8">
            {membershipBenefits.map((benefit, idx) => (
              <div
                key={idx}
                className="rounded-2xl border border-border/60 bg-background/85 p-6 text-center shadow-sm"
                data-testid={`card-benefit-${idx}`}
              >
                <div className="w-14 h-14 rounded-full bg-accent/10 flex items-center justify-center mx-auto mb-4">
                  <benefit.icon className="h-7 w-7 text-accent" />
                </div>
                <h3 className="font-semibold text-base mb-2">{benefit.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {directorySettings.directoryRequiresApplicationProcess && (
        <section
          className="max-w-4xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24"
          data-testid="section-application-process"
        >
          <h2
            className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold text-center mb-10 sm:mb-14"
            data-testid="text-process-heading"
          >
            The Application Process
          </h2>
          <div className="relative">
            <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border hidden sm:block" />
            <div className="space-y-8 sm:space-y-10">
              {applicationSteps.map((step, idx) => (
                <div key={idx} className="flex gap-4 sm:gap-6" data-testid={`step-${idx}`}>
                  <div className="relative z-10 flex-shrink-0 w-12 h-12 rounded-full bg-accent text-accent-foreground flex items-center justify-center font-bold text-lg">
                    {step.step}
                  </div>
                  <div className="pt-2">
                    <h3 className="font-semibold text-base sm:text-lg mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {step.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="relative bg-muted/30 overflow-hidden" data-testid="section-training-cta">
        <div
          className="pointer-events-none absolute bottom-0 left-0 right-0 h-32"
          style={{
            background:
              "radial-gradient(ellipse at 50% 100%, hsl(var(--accent) / 0.12) 0%, transparent 70%)",
          }}
        />
        <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-14 sm:py-20 md:py-24 text-center">
          <h2
            className="font-heading text-2xl sm:text-3xl md:text-4xl font-semibold mb-4"
            data-testid="text-training-heading"
          >
            Interested in Training but Not a Member?
          </h2>
          <p className="text-sm sm:text-base text-muted-foreground leading-relaxed mb-8">
            We offer platform-approved training programs and resources for approved listing owners
            who want to deepen their expertise. Whether you're just beginning to explore the Core
            Platform space or want to sharpen your skills, our training equips you with practical
            frameworks and lived-experience insights.
          </p>
          <Button
            size="lg"
            className="w-full bg-accent text-accent-foreground border-accent-border sm:w-auto"
            data-testid="button-learn-more-training"
          >
            Learn More
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>

      <LoginDialog open={loginOpen} onOpenChange={setLoginOpen} />
    </PageLayout>
  );
}
