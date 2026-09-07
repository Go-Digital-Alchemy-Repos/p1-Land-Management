import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ChevronLeft,
  ChevronRight,
  Wand2,
  Check,
  Target,
  Users,
  Layers,
  Eye,
  Star,
} from "lucide-react";
import {
  LANDING_PAGE_GOALS,
  AUDIENCE_OPTIONS,
  getRecommendedBlocks,
  generateLandingPageBlocks,
  type WizardBlockOption,
} from "../builder/page-templates";
import type { BuilderContent } from "../builder/block-registry";
import { PageRenderer } from "../builder/block-renderer";

const STEPS = [
  { label: "Goal & Headline", icon: Target },
  { label: "Target Audience", icon: Users },
  { label: "Choose Blocks", icon: Layers },
  { label: "Preview & Create", icon: Eye },
];

interface LandingPageWizardProps {
  open: boolean;
  onClose: () => void;
  onCreate: (content: BuilderContent, title: string) => void;
}

export function LandingPageWizard({ open, onClose, onCreate }: LandingPageWizardProps) {
  const [step, setStep] = useState(0);
  const [goalId, setGoalId] = useState("");
  const [headline, setHeadline] = useState("");
  const [subheadline, setSubheadline] = useState("");
  const [selectedAudiences, setSelectedAudiences] = useState<string[]>([]);
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [blocksInitialized, setBlocksInitialized] = useState(false);
  const [ctaText, setCtaText] = useState("Get Started");
  const [ctaLink, setCtaLink] = useState("/directory");

  const toggleAudience = (id: string) => {
    setSelectedAudiences((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const toggleBlock = (id: string) => {
    setSelectedBlocks((prev) => (prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id]));
  };

  const blockOptions: WizardBlockOption[] = goalId ? getRecommendedBlocks(goalId) : [];

  const goToStep = (nextStep: number) => {
    if (nextStep === 2 && !blocksInitialized && goalId) {
      const recommended = getRecommendedBlocks(goalId)
        .filter((b) => b.recommended)
        .map((b) => b.id);
      setSelectedBlocks(recommended);
      setBlocksInitialized(true);
    }
    setStep(nextStep);
  };

  const previewBlocks = generateLandingPageBlocks(
    goalId,
    headline,
    subheadline,
    selectedAudiences,
    selectedBlocks,
    ctaText,
    ctaLink,
  );

  const resetState = () => {
    setStep(0);
    setGoalId("");
    setHeadline("");
    setSubheadline("");
    setSelectedAudiences([]);
    setSelectedBlocks([]);
    setBlocksInitialized(false);
    setCtaText("Get Started");
    setCtaLink("/directory");
  };

  const handleCreate = () => {
    const blocks = generateLandingPageBlocks(
      goalId,
      headline,
      subheadline,
      selectedAudiences,
      selectedBlocks,
      ctaText,
      ctaLink,
    );
    const title = headline || "Landing Page";
    resetState();
    onCreate({ blocks }, title);
  };

  const canProceed = () => {
    switch (step) {
      case 0:
        return !!goalId && !!headline.trim();
      case 1:
        return selectedAudiences.length > 0;
      case 2:
        return selectedBlocks.length > 0;
      case 3:
        return true;
      default:
        return false;
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent
        className="max-w-3xl max-h-[90vh] flex flex-col p-0"
        data-testid="dialog-landing-wizard"
      >
        <DialogHeader className="px-6 pt-6 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-violet-500" />
            Landing Page Generator
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-1 px-6 pt-3">
          {STEPS.map((s, i) => {
            const StepIcon = s.icon;
            const isActive = i === step;
            const isDone = i < step;
            return (
              <div key={i} className="flex items-center gap-1 flex-1">
                <button
                  onClick={() => i < step && goToStep(i)}
                  disabled={i > step}
                  className={`flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                    isActive
                      ? "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400"
                      : isDone
                        ? "text-violet-600 cursor-pointer hover:bg-violet-50 dark:hover:bg-violet-950/20"
                        : "text-muted-foreground"
                  }`}
                  data-testid={`wizard-step-${i}`}
                >
                  {isDone ? (
                    <Check className="h-3.5 w-3.5" />
                  ) : (
                    <StepIcon className="h-3.5 w-3.5" />
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </button>
                {i < STEPS.length - 1 && (
                  <div
                    className={`flex-1 h-px mx-1 ${i < step ? "bg-violet-300 dark:bg-violet-700" : "bg-border"}`}
                  />
                )}
              </div>
            );
          })}
        </div>

        <Separator className="mt-3" />

        <div className="flex-1 overflow-y-auto px-6 py-4 min-h-[300px]">
          {step === 0 && (
            <div className="space-y-5">
              <div>
                <Label className="text-sm font-medium">What's the goal of this page?</Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {LANDING_PAGE_GOALS.map((goal) => (
                    <button
                      key={goal.id}
                      onClick={() => {
                        setGoalId(goal.id);
                        setBlocksInitialized(false);
                      }}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                        goalId === goal.id
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                          : "border-border hover:border-violet-300"
                      }`}
                      data-testid={`goal-${goal.id}`}
                    >
                      <Target
                        className={`h-4 w-4 mt-0.5 flex-shrink-0 ${goalId === goal.id ? "text-violet-600" : "text-muted-foreground"}`}
                      />
                      <div>
                        <p className="text-sm font-medium">{goal.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{goal.description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <Label htmlFor="wiz-headline">Page Headline</Label>
                  <Input
                    id="wiz-headline"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="e.g. Find a Provider Who Fits Your Needs"
                    className="mt-1"
                    data-testid="input-wizard-headline"
                  />
                </div>
                <div>
                  <Label htmlFor="wiz-subheadline">
                    Subheadline{" "}
                    <span className="text-muted-foreground font-normal text-xs">(optional)</span>
                  </Label>
                  <Textarea
                    id="wiz-subheadline"
                    value={subheadline}
                    onChange={(e) => setSubheadline(e.target.value)}
                    placeholder="Supporting text that expands on the headline"
                    rows={2}
                    className="mt-1"
                    data-testid="input-wizard-subheadline"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">Who is this page for?</Label>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Select one or more target audiences
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {AUDIENCE_OPTIONS.map((aud) => {
                  const isSelected = selectedAudiences.includes(aud.id);
                  return (
                    <button
                      key={aud.id}
                      onClick={() => toggleAudience(aud.id)}
                      className={`relative flex items-center gap-2 p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                          : "border-border hover:border-violet-300"
                      }`}
                      data-testid={`audience-${aud.id}`}
                    >
                      {isSelected && (
                        <div className="absolute top-1.5 right-1.5 h-4 w-4 rounded-full bg-violet-500 flex items-center justify-center">
                          <Check className="h-2.5 w-2.5 text-white" />
                        </div>
                      )}
                      <Users
                        className={`h-4 w-4 flex-shrink-0 ${isSelected ? "text-violet-600" : "text-muted-foreground"}`}
                      />
                      <span className="text-sm font-medium">{aud.label}</span>
                    </button>
                  );
                })}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="wiz-cta-text">CTA Button Text</Label>
                  <Input
                    id="wiz-cta-text"
                    value={ctaText}
                    onChange={(e) => setCtaText(e.target.value)}
                    placeholder="e.g. Get Started"
                    className="mt-1"
                    data-testid="input-wizard-cta-text"
                  />
                </div>
                <div>
                  <Label htmlFor="wiz-cta-link">CTA Button Link</Label>
                  <Input
                    id="wiz-cta-link"
                    value={ctaLink}
                    onChange={(e) => setCtaLink(e.target.value)}
                    placeholder="/directory"
                    autoPrependHttps
                    className="mt-1 font-mono text-sm"
                    data-testid="input-wizard-cta-link"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Select Page Sections</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Recommended sections are pre-selected based on your goal. Toggle any on/off.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {selectedBlocks.length} selected
                </Badge>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {blockOptions.map((opt) => {
                  const isSelected = selectedBlocks.includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleBlock(opt.id)}
                      className={`flex items-start gap-3 p-3 rounded-lg border-2 text-left transition-all ${
                        isSelected
                          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                          : "border-border hover:border-violet-300"
                      }`}
                      data-testid={`block-option-${opt.id}`}
                    >
                      <div
                        className={`h-5 w-5 rounded border-2 flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          isSelected
                            ? "border-violet-500 bg-violet-500"
                            : "border-muted-foreground/40"
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-medium">{opt.label}</p>
                          {opt.recommended && (
                            <Star className="h-3 w-3 text-amber-500 fill-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Preview Your Landing Page</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Review the layout below. You can customize everything after creation.
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {previewBlocks.length} sections
                </Badge>
              </div>
              <div className="border rounded-xl bg-background p-4 min-h-[300px] max-h-[400px] overflow-y-auto">
                {previewBlocks.length === 0 ? (
                  <div className="flex items-center justify-center h-48 text-muted-foreground text-sm">
                    No blocks selected — go back and choose some sections.
                  </div>
                ) : (
                  <div className="transform scale-[0.6] origin-top">
                    <PageRenderer blocks={previewBlocks} />
                  </div>
                )}
              </div>

              <div className="bg-muted/30 rounded-lg p-3 text-xs text-muted-foreground flex items-start gap-2">
                <Wand2 className="h-4 w-4 mt-0.5 text-violet-500 flex-shrink-0" />
                <p>
                  After creating, you'll be taken to the page editor where you can customize every
                  section, rearrange blocks, add new ones, and configure page settings and SEO.
                </p>
              </div>
            </div>
          )}
        </div>

        <Separator />

        <DialogFooter className="px-6 py-4">
          <div className="flex items-center justify-between w-full">
            <div>
              {step > 0 && (
                <Button
                  variant="ghost"
                  onClick={() => goToStep(step - 1)}
                  data-testid="button-wizard-back"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Back
                </Button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={handleClose} data-testid="button-wizard-cancel">
                Cancel
              </Button>
              {step < STEPS.length - 1 ? (
                <Button
                  onClick={() => goToStep(step + 1)}
                  disabled={!canProceed()}
                  data-testid="button-wizard-next"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleCreate}
                  disabled={previewBlocks.length === 0}
                  data-testid="button-wizard-create"
                >
                  <Wand2 className="h-4 w-4 mr-1.5" />
                  Create Landing Page
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
