import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Star, ExternalLink, MessageSquare } from "lucide-react";

interface TestimonialPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clientName: string;
}

export function TestimonialPrompt({ open, onOpenChange, clientName }: TestimonialPromptProps) {
  const handleTestimonialClick = () => {
    // This would open a testimonial form - you can customize the URL
    window.open('https://your-testimonial-form.com', '_blank');
  };

  const handleGoogleReviewClick = () => {
    // Replace with your actual Google Business profile URL
    window.open('https://g.page/your-business/review', '_blank');
  };

  const handleLinkedInReviewClick = () => {
    // Replace with your LinkedIn company page
    window.open('https://linkedin.com/company/your-company', '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">
            🎉 Thank You, {clientName}!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className="h-6 w-6 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>
            <p className="text-muted-foreground">
              We're thrilled you're happy with your documents! Your feedback helps us serve more professionals like you.
            </p>
          </div>

          <div className="space-y-3">
            <h3 className="font-medium text-center">Help others discover RDR:</h3>
            
            <Card className="border-primary/20">
              <CardContent className="p-4">
                <Button
                  onClick={handleTestimonialClick}
                  variant="outline"
                  className="w-full justify-between"
                >
                  <div className="flex items-center gap-2">
                    <MessageSquare className="h-4 w-4" />
                    Share Your Success Story
                  </div>
                  <ExternalLink className="h-4 w-4" />
                </Button>
                <p className="text-xs text-muted-foreground mt-2">
                  Tell others about your experience (takes 2 minutes)
                </p>
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={handleGoogleReviewClick}
                variant="outline"
                className="flex flex-col h-auto py-3"
              >
                <div className="text-sm font-medium">Google Review</div>
                <div className="text-xs text-muted-foreground">Public review</div>
              </Button>

              <Button
                onClick={handleLinkedInReviewClick}
                variant="outline"
                className="flex flex-col h-auto py-3"
              >
                <div className="text-sm font-medium">LinkedIn</div>
                <div className="text-xs text-muted-foreground">Recommend us</div>
              </Button>
            </div>
          </div>

          <div className="text-center">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground"
            >
              Maybe later
            </Button>
          </div>

          <div className="bg-muted/50 rounded-lg p-3 text-center">
            <p className="text-xs text-muted-foreground">
              💡 <strong>Tip:</strong> We'll send you a gentle reminder tomorrow if you'd prefer to leave a review later.
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}