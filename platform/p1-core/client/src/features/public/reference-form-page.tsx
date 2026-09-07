import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Loader2, CheckCircle2, AlertCircle, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";

const CORE_PLATFORM_DEFINITION = `A "platform-approved" provider is a verified provider who demonstrates meaningful understanding of the developmental, emotional, and cultural experiences common in globally mobile communities. Platform-approved providers recognize themes such as high mobility, repeated loss and grief, cultural identity complexity, hidden diversity, rootlessness, restlessness, and the challenge of repatriation. They approach their work with cultural humility and an awareness of how cross-cultural upbringing shapes identity, attachment, and belonging.`;

interface ReferenceData {
  alreadyCompleted: boolean;
  applicantName: string;
  refereeName: string;
  relationship?: string;
}

interface FormState {
  firstName: string;
  applicantName: string;
  howKnown: string;
  corePlatformObservation: string;
  corePlatformUnderstanding: string;
  culturalConnection: string;
  safetyConcern: string;
  safetyConcernDetails: string;
  professionalConcern: string;
  professionalConcernDetails: string;
  recommendation: string;
  recommendationComments: string;
}

function YesNoField({
  name,
  label,
  value,
  onChange,
  detailsValue,
  onDetailsChange,
  showDetails,
}: {
  name: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  detailsValue: string;
  onDetailsChange: (val: string) => void;
  showDetails: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="flex gap-4">
        {["yes", "no"].map((opt) => (
          <label
            key={opt}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
              value === opt ? "border-primary bg-primary/5" : "hover:bg-muted/50"
            }`}
          >
            <input
              type="radio"
              name={name}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
              className="h-4 w-4"
              data-testid={`radio-${name}-${opt}`}
            />
            <span className="capitalize text-sm font-medium">{opt}</span>
          </label>
        ))}
      </div>
      {showDetails && (
        <Textarea
          value={detailsValue}
          onChange={(e) => onDetailsChange(e.target.value)}
          placeholder="Please provide any relevant details (optional)..."
          rows={3}
          className="mt-2"
          data-testid={`textarea-${name}-details`}
        />
      )}
    </div>
  );
}

export default function ReferenceFormPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const [submitted, setSubmitted] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<ReferenceData>({
    queryKey: ["/api/reference", token],
    enabled: !!token,
  });

  const [form, setForm] = useState<FormState>({
    firstName: "",
    applicantName: "",
    howKnown: "",
    corePlatformObservation: "",
    corePlatformUnderstanding: "",
    culturalConnection: "",
    safetyConcern: "",
    safetyConcernDetails: "",
    professionalConcern: "",
    professionalConcernDetails: "",
    recommendation: "",
    recommendationComments: "",
  });

  useEffect(() => {
    if (data && !data.alreadyCompleted) {
      setForm((prev) => ({
        ...prev,
        firstName: prev.firstName || data.refereeName?.split(" ")[0] || "",
        applicantName: data.applicantName || "",
      }));
    }
  }, [data]);

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/reference/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(form),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(
          (payload &&
          typeof payload === "object" &&
          "message" in payload &&
          typeof payload.message === "string"
            ? payload.message
            : null) || "Failed to submit. Please try again.",
        );
      }
      return payload;
    },
    onSuccess: () => {
      setSubmitted(true);
    },
    onError: (err) => {
      setValidationError(
        err instanceof Error ? err.message : "Failed to submit. Please try again.",
      );
    },
  });

  const handleSubmit = () => {
    setValidationError(null);
    if (!form.firstName.trim()) {
      setValidationError("Your first name is required.");
      return;
    }
    if (!form.howKnown.trim()) {
      setValidationError("Please describe how you know the applicant.");
      return;
    }
    if (!form.corePlatformObservation.trim()) {
      setValidationError("Please answer the Core Platform observation question.");
      return;
    }
    if (!form.corePlatformUnderstanding.trim()) {
      setValidationError("Please answer the Core Platform understanding question.");
      return;
    }
    if (!form.culturalConnection.trim()) {
      setValidationError("Please answer the cultural connection question.");
      return;
    }
    if (!form.safetyConcern) {
      setValidationError("Please answer the safety concern question.");
      return;
    }
    if (!form.professionalConcern) {
      setValidationError("Please answer the professional concern question.");
      return;
    }
    if (!form.recommendation) {
      setValidationError("Please indicate whether you recommend the applicant.");
      return;
    }
    submitMutation.mutate();
  };

  const updateField = (field: keyof FormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setValidationError(null);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
            <h2 className="text-xl font-semibold mb-2">Invalid Reference Link</h2>
            <p className="text-muted-foreground">
              This reference link is invalid, has expired, or the application is no longer active.
              If you believe this is an error, please contact the applicant or specialized support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (data.alreadyCompleted || submitted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 mx-auto text-green-600 mb-4" />
            <h2 className="text-xl font-semibold mb-2">
              {submitted ? "Thank You!" : "Reference Already Submitted"}
            </h2>
            <p className="text-muted-foreground">
              {submitted
                ? `Your reference for ${data.applicantName} has been submitted successfully. Your feedback is confidential and will not be shared with the applicant. Thank you for helping support the Core Platform provider network.`
                : `A reference for ${data.applicantName} has already been submitted from this link. Thank you for your support.`}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-[#1e3a5f] text-white py-6">
        <div className="container max-w-2xl mx-auto px-4">
          <h1 className="text-2xl font-bold">Core Platform</h1>
          <p className="text-white/80 text-sm mt-1">Confidential Reference Form</p>
        </div>
      </div>

      <div className="container max-w-2xl mx-auto py-8 px-4">
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Confidential Reference for {data.applicantName}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  <strong>{data.applicantName}</strong> has applied to join the Core Platform
                  provider network and has listed you as a professional reference. Your responses
                  are <strong>strictly confidential</strong> and will not be shared with the
                  applicant. This form takes approximately 5–10 minutes to complete.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6 bg-muted/30">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground font-medium mb-1">
              What does "platform-approved" mean?
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {CORE_PLATFORM_DEFINITION}
            </p>
          </CardContent>
        </Card>

        {validationError && (
          <Alert variant="destructive" className="mb-4" data-testid="alert-validation-error">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{validationError}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="firstName">Your First Name *</Label>
                <Input
                  id="firstName"
                  value={form.firstName}
                  onChange={(e) => updateField("firstName", e.target.value)}
                  placeholder="Your first name"
                  data-testid="input-ref-first-name"
                />
              </div>
              <div>
                <Label htmlFor="applicantName">Name of the Applicant</Label>
                <Input
                  id="applicantName"
                  value={form.applicantName}
                  disabled
                  className="bg-muted"
                  data-testid="input-ref-applicant-name"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Your Experience with the Applicant</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <Label htmlFor="howKnown">
                  How do you know the applicant, and how long have you known them? *
                </Label>
                <Textarea
                  id="howKnown"
                  value={form.howKnown}
                  onChange={(e) => updateField("howKnown", e.target.value)}
                  placeholder="Describe your professional relationship and duration..."
                  rows={3}
                  className="mt-1"
                  data-testid="textarea-how-known"
                />
              </div>

              <div>
                <Label htmlFor="corePlatformObservation">
                  In what contexts have you had the opportunity to observe the applicant interacting
                  with members? *
                </Label>
                <Textarea
                  id="corePlatformObservation"
                  value={form.corePlatformObservation}
                  onChange={(e) => updateField("corePlatformObservation", e.target.value)}
                  placeholder="Describe any clinical, educational, or community settings..."
                  rows={3}
                  className="mt-1"
                  data-testid="textarea-corePlatform-observation"
                />
              </div>

              <div>
                <Label htmlFor="corePlatformUnderstanding">
                  In your experience, how well does the applicant understand the unique experiences
                  and challenges faced by members? *
                </Label>
                <Textarea
                  id="corePlatformUnderstanding"
                  value={form.corePlatformUnderstanding}
                  onChange={(e) => updateField("corePlatformUnderstanding", e.target.value)}
                  placeholder="Share your assessment of their Core Platform knowledge and sensitivity..."
                  rows={3}
                  className="mt-1"
                  data-testid="textarea-corePlatform-understanding"
                />
              </div>

              <div>
                <Label htmlFor="culturalConnection">
                  How would you describe the applicant's ability to connect with children, teens, or
                  families from culturally diverse or internationally mobile backgrounds? *
                </Label>
                <Textarea
                  id="culturalConnection"
                  value={form.culturalConnection}
                  onChange={(e) => updateField("culturalConnection", e.target.value)}
                  placeholder="Describe their cultural competence and connection abilities..."
                  rows={3}
                  className="mt-1"
                  data-testid="textarea-cultural-connection"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Safety & Professional Conduct</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <YesNoField
                name="safetyConcern"
                label="Are you aware of any situations in which the applicant's interactions with children might have posed a concern for the child's safety or well-being? *"
                value={form.safetyConcern}
                onChange={(val) => updateField("safetyConcern", val)}
                detailsValue={form.safetyConcernDetails}
                onDetailsChange={(val) => updateField("safetyConcernDetails", val)}
                showDetails={form.safetyConcern === "yes"}
              />

              <Separator />

              <YesNoField
                name="professionalConcern"
                label="Are you aware of any situations in which the applicant's behavior toward colleagues, members, or others may have been unprofessional, unethical, or otherwise concerning? *"
                value={form.professionalConcern}
                onChange={(val) => updateField("professionalConcern", val)}
                detailsValue={form.professionalConcernDetails}
                onDetailsChange={(val) => updateField("professionalConcernDetails", val)}
                showDetails={form.professionalConcern === "yes"}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recommendation</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Would you recommend the applicant as a platform-approved provider? *</Label>
                <div className="flex gap-4 mt-2">
                  {["yes", "no"].map((opt) => (
                    <label
                      key={opt}
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg border cursor-pointer transition-colors ${
                        form.recommendation === opt
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="recommendation"
                        value={opt}
                        checked={form.recommendation === opt}
                        onChange={() => updateField("recommendation", opt)}
                        className="h-4 w-4"
                        data-testid={`radio-recommendation-${opt}`}
                      />
                      <span className="capitalize text-sm font-medium">{opt}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <Label htmlFor="recommendationComments">Additional comments (optional)</Label>
                <Textarea
                  id="recommendationComments"
                  value={form.recommendationComments}
                  onChange={(e) => updateField("recommendationComments", e.target.value)}
                  placeholder="Any additional thoughts or context you'd like to share..."
                  rows={3}
                  className="mt-1"
                  data-testid="textarea-recommendation-comments"
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button
              onClick={handleSubmit}
              disabled={submitMutation.isPending}
              size="lg"
              data-testid="button-submit-reference"
            >
              {submitMutation.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Submit Reference
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center pb-8">
            Your responses are confidential and will only be reviewed by the Core Platform team.
            They will not be shared with the applicant.
          </p>
        </div>
      </div>
    </div>
  );
}
