import { useState } from "react";
import { ClientManager } from "@/components/ClientManager";
import { ServiceTypeAdmin } from "@/components/ServiceTypeAdmin";
import { Button } from "@/components/ui/button";

const Index = () => {
  const [activeTab, setActiveTab] = useState<'clients' | 'services'>('clients');

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Service Type Management System</h1>
          <div className="flex gap-2">
            <Button 
              variant={activeTab === 'clients' ? 'default' : 'outline'}
              onClick={() => setActiveTab('clients')}
            >
              Client Management
            </Button>
            <Button 
              variant={activeTab === 'services' ? 'default' : 'outline'}
              onClick={() => setActiveTab('services')}
            >
              Service Settings
            </Button>
          </div>
        </div>
        
        {activeTab === 'clients' ? <ClientManager /> : <ServiceTypeAdmin />}
      </div>
    </div>
  );
};

export default Index;
