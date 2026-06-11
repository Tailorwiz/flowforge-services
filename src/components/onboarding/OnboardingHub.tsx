import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Rocket, Table2, Settings2 } from "lucide-react";
import { OnboardingWizard } from "./OnboardingWizard";
import { OnboardingTracker } from "./OnboardingTracker";
import { OnboardingSettings } from "./OnboardingSettings";

export function OnboardingHub() {
  const [tab, setTab] = useState("wizard");

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList>
        <TabsTrigger value="wizard" className="flex items-center gap-2">
          <Rocket className="w-4 h-4" /> Wizard
        </TabsTrigger>
        <TabsTrigger value="tracker" className="flex items-center gap-2">
          <Table2 className="w-4 h-4" /> Tracker
        </TabsTrigger>
        <TabsTrigger value="settings" className="flex items-center gap-2">
          <Settings2 className="w-4 h-4" /> Settings
        </TabsTrigger>
      </TabsList>

      <TabsContent value="wizard">
        <OnboardingWizard onCompleted={() => { /* tracker refreshes on open */ }} />
      </TabsContent>
      <TabsContent value="tracker">
        <OnboardingTracker />
      </TabsContent>
      <TabsContent value="settings">
        <OnboardingSettings />
      </TabsContent>
    </Tabs>
  );
}
