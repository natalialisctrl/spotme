import { FC, useState } from "react";
import { Link, useLocation } from "wouter";
import { MapPin, MessageSquare, Users, User, Shield, Settings, ChevronUp, LogOut } from "lucide-react";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";

const MobileNav: FC = () => {
  const [location] = useLocation();
  const { logoutMutation } = useAuth();

  return (
    <nav className="md:hidden bg-white border-t border-gray-200 fixed bottom-0 left-0 right-0 z-30">
      <div className="flex justify-around">
        <Link href="/" className={`flex flex-col items-center justify-center py-3 w-1/4 ${location === '/' ? 'text-primary border-t-2 border-primary' : 'text-gray-500'}`}>
            <MapPin className="h-6 w-6" />
            <span className="text-xs mt-1">Explore</span>
        </Link>
        <Link href="/messages" className={`flex flex-col items-center justify-center py-3 w-1/4 ${location === '/messages' ? 'text-primary border-t-2 border-primary' : 'text-gray-500'}`}>
            <MessageSquare className="h-6 w-6" />
            <span className="text-xs mt-1">Messages</span>
        </Link>
        <Link href="/connections" className={`flex flex-col items-center justify-center py-3 w-1/4 ${location === '/connections' ? 'text-primary border-t-2 border-primary' : 'text-gray-500'}`}>
            <Users className="h-6 w-6" />
            <span className="text-xs mt-1">Connections</span>
        </Link>
        <Popover>
          <PopoverTrigger className={`flex flex-col items-center justify-center py-3 w-1/4 ${(location === '/profile' || location === '/security-settings') ? 'text-primary border-t-2 border-primary' : 'text-gray-500'}`}>
            <User className="h-6 w-6" />
            <span className="text-xs mt-1">Profile</span>
          </PopoverTrigger>
          <PopoverContent className="w-48 p-0" align="end">
            <div className="flex flex-col">
              <Link href="/profile" className="flex items-center p-3 hover:bg-gray-100">
                <User className="h-4 w-4 mr-2" />
                <span className="text-sm">Profile</span>
              </Link>
              <Link href="/security-settings" className="flex items-center p-3 hover:bg-gray-100">
                <Shield className="h-4 w-4 mr-2" />
                <span className="text-sm">Security</span>
              </Link>
              <Link href="/settings" className="flex items-center p-3 hover:bg-gray-100">
                <Settings className="h-4 w-4 mr-2" />
                <span className="text-sm">Settings</span>
              </Link>
              <Separator />
              <button 
                onClick={() => logoutMutation.mutate()} 
                className="flex items-center p-3 hover:bg-gray-100 w-full text-left text-red-600"
                disabled={logoutMutation.isPending}
              >
                <LogOut className="h-4 w-4 mr-2" />
                <span className="text-sm">
                  {logoutMutation.isPending ? "Logging out..." : "Logout"}
                </span>
              </button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </nav>
  );
};

export default MobileNav;
