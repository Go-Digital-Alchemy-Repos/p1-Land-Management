import type { ReactNode } from "react";
import { Send } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./static-renderer-host";
export function ContactFormPresentation({
  form,
  company,
}: {
  form: ReactNode;
  company: ReactNode;
}) {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8" data-testid="dynamic-contact-form">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Send className="w-5 h-5" />
                Send a Message
              </CardTitle>
            </CardHeader>
            <CardContent>{form}</CardContent>
          </Card>
        </div>
        <div className="space-y-4">{company}</div>
      </div>
    </div>
  );
}
