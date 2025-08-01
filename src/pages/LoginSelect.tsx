import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Shield, ArrowRight } from "lucide-react";
import RDRLogo from "@/components/RDRLogo";

export default function LoginSelect() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <RDRLogo className="w-16 h-16" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to RDR Project Portal</h1>
          <p className="text-gray-600">Choose your access level to continue</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Customer Portal Card */}
          <Card className="shadow-xl border-blue-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-t-lg">
              <CardTitle className="text-xl font-bold flex items-center justify-center gap-3">
                <Users className="w-6 h-6" />
                Customer Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Project Management</h3>
                <ul className="text-gray-600 space-y-2 text-sm">
                  <li>• Track project progress</li>
                  <li>• Access documents and files</li>
                  <li>• Communicate with your team</li>
                  <li>• View training materials</li>
                  <li>• Manage your profile</li>
                </ul>
              </div>
              <Button 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 flex items-center justify-center gap-2"
                onClick={() => {
                  console.log('LoginSelect: Navigating to /customer/login');
                  navigate("/customer/login");
                }}
              >
                Access Customer Portal
                <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="text-xs text-gray-500 mt-3">
                For clients and project stakeholders
              </p>
            </CardContent>
          </Card>

          {/* Admin Portal Card */}
          <Card className="shadow-xl border-red-200 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1">
            <CardHeader className="bg-gradient-to-r from-red-600 to-orange-600 text-white rounded-t-lg">
              <CardTitle className="text-xl font-bold flex items-center justify-center gap-3">
                <Shield className="w-6 h-6" />
                Administrator Portal
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6 text-center">
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">System Management</h3>
                <ul className="text-gray-600 space-y-2 text-sm">
                  <li>• Manage all clients and projects</li>
                  <li>• Configure system settings</li>
                  <li>• Access analytics and reports</li>
                  <li>• Manage user permissions</li>
                  <li>• System administration</li>
                </ul>
              </div>
              <Button 
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-3 flex items-center justify-center gap-2"
                onClick={() => navigate("/admin/login")}
              >
                Access Admin Dashboard
                <ArrowRight className="w-4 h-4" />
              </Button>
              <p className="text-xs text-gray-500 mt-3">
                For authorized administrators only
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-gray-500">
            Need help? Contact your project administrator or{" "}
            <Button variant="link" className="p-0 h-auto text-blue-600 hover:text-blue-700">
              support team
            </Button>
          </p>
        </div>
      </div>
    </div>
  );
}