import { FC } from "react";
import { Link, useLocation } from "wouter";
import { 
  MapPin, 
  MessageSquare, 
  Users, 
  User, 
  Settings, 
  Shield, 
  LogOut, 
  Dumbbell, 
  Clipboard, 
  CalendarDays,
  Trophy
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Logo } from "@/components/ui/logo";

const Sidebar: FC = () => {
  const [location] = useLocation();
  const { user, logoutMutation } = useAuth();

  if (!user) return null;

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 bg-white border-r border-gray-200 z-30">
      <div className="flex items-center justify-center px-6 py-4 h-16">
        <Logo size="md" showTagline={true} />
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="px-4 pt-4">
          <div className="space-y-1">
            <Link href="/" className={`flex items-center px-4 py-3 text-gray-700 ${location === '/' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <MapPin className="h-5 w-5 mr-3 text-primary" />
                Find Gym Partners
            </Link>
            <Link href="/workout-focus" className={`flex items-center px-4 py-3 text-gray-700 ${location === '/workout-focus' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <Dumbbell className="h-5 w-5 mr-3 text-gray-500" />
                Workout Focus
            </Link>
            <Link href="/workout-routines" className={`flex items-center px-4 py-3 text-gray-700 ${location === '/workout-routines' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <Clipboard className="h-5 w-5 mr-3 text-gray-500" />
                Workout Routines
            </Link>
            <Link href="/scheduled-meetups" className={`flex items-center px-4 py-3 text-gray-700 ${location === '/scheduled-meetups' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <CalendarDays className="h-5 w-5 mr-3 text-gray-500" />
                Scheduled Meetups
            </Link>
            <Link href="/messages" className={`flex items-center px-4 py-3 text-gray-700 ${location === '/messages' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <MessageSquare className="h-5 w-5 mr-3 text-gray-500" />
                Messages
            </Link>
            <Link href="/connections" className={`flex items-center px-4 py-3 text-gray-700 ${location === '/connections' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <Users className="h-5 w-5 mr-3 text-gray-500" />
                Connections
            </Link>
            <Link href="/challenges" className={`flex items-center px-4 py-3 text-gray-700 ${location === '/challenges' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <Trophy className="h-5 w-5 mr-3 text-gray-500" />
                Challenges
            </Link>
            <Link href="/profile" className={`flex items-center px-4 py-3 text-gray-700 ${location === '/profile' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <User className="h-5 w-5 mr-3 text-gray-500" />
                Profile
            </Link>
            <Link href="/settings" className={`flex items-center px-4 py-3 text-gray-700 ${location === '/settings' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <Settings className="h-5 w-5 mr-3 text-gray-500" />
                Settings
            </Link>
            <Link href="/security-settings" className={`flex items-center px-4 py-3 text-gray-700 ${location === '/security-settings' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <Shield className="h-5 w-5 mr-3 text-gray-500" />
                Security
            </Link>
          </div>
        </nav>
      </div>
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center mb-3">
          <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center">
            <span className="font-medium text-sm">{user.name.split(' ').map(n => n[0]).join('')}</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
        <Separator className="my-2" />
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start text-red-600 mt-2" 
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
        >
          <LogOut className="mr-2 h-4 w-4" />
          {logoutMutation.isPending ? "Logging out..." : "Logout"}
        </Button>
      </div>
    </aside>
  );
};

export default Sidebar;
