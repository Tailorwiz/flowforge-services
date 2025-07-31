import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { HelpCircle, MessageCircle, FileText, Activity, Upload, Calendar } from 'lucide-react';
import ClientWelcome from '@/components/ClientWelcome';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const ClientPortal = () => {
  const [messages] = useState([
    {
      id: 1,
      sender: 'RDR Team',
      message: 'Welcome to your project! We\'ve received your intake form and will begin work shortly.',
      timestamp: '2024-01-15 10:30 AM',
      isAdmin: true
    },
    {
      id: 2,
      sender: 'You',
      message: 'Thank you! Looking forward to seeing the results.',
      timestamp: '2024-01-15 10:45 AM',
      isAdmin: false
    }
  ]);

  const documents = [
    {
      id: 1,
      name: 'Original Resume',
      type: 'PDF',
      icon: <FileText className="w-8 h-8 text-red-600" />,
      status: 'uploaded',
      date: '2024-01-15'
    },
    {
      id: 2,
      name: 'Professional Resume',
      type: 'PDF',
      icon: <FileText className="w-8 h-8 text-rdr-gold" />,
      status: 'in-progress',
      date: 'In Progress'
    },
    {
      id: 3,
      name: 'Cover Letter Template',
      type: 'DOCX',
      icon: <FileText className="w-8 h-8 text-blue-600" />,
      status: 'pending',
      date: 'Coming Soon'
    }
  ];

  return (
    <div className="min-h-screen bg-rdr-light-gray">
      {/* Help Button */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button 
          size="lg" 
          className="bg-rdr-gold hover:bg-rdr-gold/90 text-rdr-navy shadow-xl rounded-full w-14 h-14"
        >
          <HelpCircle className="w-6 h-6" />
        </Button>
      </div>

      <div className="container mx-auto p-6 max-w-6xl">
        {/* Welcome Section */}
        <ClientWelcome 
          clientName="John Smith"
          packageName="Professional Resume Package"
          estimatedDelivery="2024-02-15"
          className="mb-8"
        />

        {/* Main Content Tabs */}
        <Tabs defaultValue="documents" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-8 bg-white shadow-sm rounded-xl p-1">
            <TabsTrigger 
              value="documents" 
              className="flex items-center gap-2 data-[state=active]:bg-rdr-navy data-[state=active]:text-white rounded-lg font-medium"
            >
              <FileText className="w-4 h-4" />
              My Documents
            </TabsTrigger>
            <TabsTrigger 
              value="messages" 
              className="flex items-center gap-2 data-[state=active]:bg-rdr-navy data-[state=active]:text-white rounded-lg font-medium"
            >
              <MessageCircle className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger 
              value="activity" 
              className="flex items-center gap-2 data-[state=active]:bg-rdr-navy data-[state=active]:text-white rounded-lg font-medium"
            >
              <Activity className="w-4 h-4" />
              Activity
            </TabsTrigger>
            <TabsTrigger 
              value="upload" 
              className="flex items-center gap-2 data-[state=active]:bg-rdr-navy data-[state=active]:text-white rounded-lg font-medium"
            >
              <Upload className="w-4 h-4" />
              Upload
            </TabsTrigger>
          </TabsList>

          {/* Documents Tab */}
          <TabsContent value="documents">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {documents.map((doc) => (
                <Card key={doc.id} className="bg-white shadow-lg border border-border hover:shadow-xl transition-all duration-300">
                  <CardHeader className="text-center pb-4">
                    <div className="flex justify-center mb-3">
                      <div className="w-16 h-16 bg-rdr-light-gray rounded-xl flex items-center justify-center">
                        {doc.icon}
                      </div>
                    </div>
                    <CardTitle className="text-lg font-semibold text-rdr-navy font-heading">
                      {doc.name}
                    </CardTitle>
                    <CardDescription className="text-rdr-medium-gray">
                      {doc.type} Document
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="text-center">
                    <div className={`
                      inline-flex items-center px-3 py-1 rounded-full text-sm font-medium mb-4
                      ${doc.status === 'uploaded' ? 'bg-green-100 text-green-800' :
                        doc.status === 'in-progress' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-600'}
                    `}>
                      {doc.status === 'uploaded' ? '✓ Uploaded' :
                       doc.status === 'in-progress' ? '⏳ In Progress' :
                       '⏸ Pending'}
                    </div>
                    <p className="text-sm text-rdr-medium-gray mb-4">{doc.date}</p>
                    {doc.status === 'uploaded' && (
                      <Button variant="outline" size="sm" className="w-full">
                        View Document
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          {/* Messages Tab */}
          <TabsContent value="messages">
            <Card className="bg-white shadow-lg border border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rdr-navy font-heading">
                  <MessageCircle className="w-5 h-5" />
                  Project Messages
                </CardTitle>
                <CardDescription>
                  Communicate directly with your RDR team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                  {messages.map((msg) => (
                    <div key={msg.id} className={`
                      flex ${msg.isAdmin ? 'justify-start' : 'justify-end'}
                    `}>
                      <div className={`
                        max-w-[80%] p-4 rounded-xl
                        ${msg.isAdmin 
                          ? 'bg-rdr-light-gray text-rdr-navy' 
                          : 'bg-rdr-navy text-white'}
                      `}>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-sm">{msg.sender}</span>
                          <span className="text-xs opacity-60">{msg.timestamp}</span>
                        </div>
                        <p className="text-sm">{msg.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="flex gap-2">
                  <input 
                    type="text" 
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-rdr-navy"
                  />
                  <Button className="bg-rdr-navy hover:bg-rdr-navy/90">
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Activity Tab */}
          <TabsContent value="activity">
            <Card className="bg-white shadow-lg border border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rdr-navy font-heading">
                  <Activity className="w-5 h-5" />
                  Project Activity
                </CardTitle>
                <CardDescription>
                  Track all updates and milestones for your project
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-start gap-4 p-4 bg-rdr-light-gray rounded-lg">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Calendar className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-rdr-navy">Project Started</h4>
                      <p className="text-sm text-rdr-medium-gray">Your resume project has been initiated and assigned to our team.</p>
                      <span className="text-xs text-rdr-medium-gray">January 15, 2024 - 10:00 AM</span>
                    </div>
                  </div>
                  
                  <div className="flex items-start gap-4 p-4 bg-rdr-light-gray rounded-lg">
                    <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                      <Upload className="w-4 h-4 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-medium text-rdr-navy">Documents Received</h4>
                      <p className="text-sm text-rdr-medium-gray">We've received your original resume and intake form.</p>
                      <span className="text-xs text-rdr-medium-gray">January 15, 2024 - 2:30 PM</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload">
            <Card className="bg-white shadow-lg border border-border">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rdr-navy font-heading">
                  <Upload className="w-5 h-5" />
                  Upload Documents
                </CardTitle>
                <CardDescription>
                  Share additional documents or revisions with your RDR team
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-border rounded-xl p-8 text-center">
                  <Upload className="w-12 h-12 text-rdr-medium-gray mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-rdr-navy mb-2">Upload Files</h3>
                  <p className="text-rdr-medium-gray mb-4">
                    Drag and drop files here, or click to browse
                  </p>
                  <Button className="bg-rdr-navy hover:bg-rdr-navy/90">
                    Choose Files
                  </Button>
                  <p className="text-xs text-rdr-medium-gray mt-2">
                    Supported formats: PDF, DOC, DOCX (Max 10MB)
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default ClientPortal;