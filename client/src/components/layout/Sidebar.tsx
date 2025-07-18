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
  Trophy,
  Award,
  Star
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
      <div className="flex items-center justify-center px-6 py-4 h-16 bg-[#f5f5f5]">
        <Logo size="md" showTagline={true} />
      </div>
      <div className="flex-1 overflow-y-auto bg-[#ffffff] text-[#ffffff]">
        <nav className="px-4 pt-4">
          <div className="space-y-1">
            <Link href="/" className="flex items-center px-4 py-3 text-black font-medium hover-pulse rounded-lg glow-effect bg-[#ffc8b3]">
                <MapPin className="h-5 w-5 mr-3 text-black" />
                Find Gym Partners
            </Link>
            <Link href="/workout-focus" className={`flex items-center px-4 py-3 text-black font-medium hover-pulse ${location === '/workout-focus' ? 'bg-[#e09980] rounded-lg glow-effect' : 'hover:bg-[#e09980] rounded-lg'}`}>
                <Dumbbell className="h-5 w-5 mr-3 text-black" />
                Workout Focus
            </Link>
            <Link href="/workout-routines" className={`flex items-center px-4 py-3 text-black font-medium hover-pulse ${location === '/workout-routines' ? 'bg-[#e09980] rounded-lg glow-effect' : 'hover:bg-[#e09980] rounded-lg'}`}>
                <Clipboard className="h-5 w-5 mr-3 text-black" />
                Workout Routines
            </Link>
            <Link href="/workout-recommendations" className={`flex items-center px-4 py-3 text-black font-medium hover-pulse ${location === '/workout-recommendations' ? 'bg-[#e09980] rounded-lg glow-effect' : 'hover:bg-[#e09980] rounded-lg'}`}>
                <Dumbbell className="h-5 w-5 mr-3 text-black" />
                Workout Recommendations
            </Link>
            <Link href="/scheduled-meetups" className={`flex items-center px-4 py-3 text-black font-medium hover-pulse ${location === '/scheduled-meetups' ? 'bg-[#e09980] rounded-lg glow-effect' : 'hover:bg-[#e09980] rounded-lg'}`}>
                <CalendarDays className="h-5 w-5 mr-3 text-black" />
                Scheduled Meetups
            </Link>
            <Link href="/messages" className={`flex items-center px-4 py-3 text-black font-medium hover-pulse ${(location === '/messages' || location === '/connections') ? 'bg-[#e09980] rounded-lg glow-effect' : 'hover:bg-[#e09980] rounded-lg'}`}>
                <MessageSquare className="h-5 w-5 mr-3 text-black" />
                Messages & Connections
            </Link>
            <Link href="/challenges" className={`flex items-center px-4 py-3 text-black font-medium hover-pulse ${location === '/challenges' ? 'bg-[#e09980] rounded-lg glow-effect' : 'hover:bg-[#e09980] rounded-lg'}`}>
                <Trophy className="h-5 w-5 mr-3 text-black" />
                Challenges
            </Link>
            <Link href="/achievements" className={`flex items-center px-4 py-3 text-black font-medium hover-pulse ${location === '/achievements' ? 'bg-[#e09980] rounded-lg glow-effect' : 'hover:bg-[#e09980] rounded-lg'}`}>
                <Award className="h-5 w-5 mr-3 text-black" />
                Achievements
            </Link>


            <Link href="/profile" className={`flex items-center px-4 py-3 text-black font-medium hover-pulse ${location === '/profile' ? 'bg-[#e09980] rounded-lg glow-effect' : 'hover:bg-[#e09980] rounded-lg'}`}>
                <User className="h-5 w-5 mr-3 text-black" />
                Profile
            </Link>
            <Link href="/settings" className={`flex items-center px-4 py-3 text-black font-medium hover-pulse ${location === '/settings' ? 'bg-[#e09980] rounded-lg glow-effect' : 'hover:bg-[#e09980] rounded-lg'}`}>
                <Settings className="h-5 w-5 mr-3 text-black" />
                Settings
            </Link>
            <Link href="/security-settings" className={`flex items-center px-4 py-3 text-black font-medium hover-pulse ${location === '/security-settings' ? 'bg-[#e09980] rounded-lg glow-effect' : 'hover:bg-[#e09980] rounded-lg'}`}>
                <Shield className="h-5 w-5 mr-3 text-black" />
                Security
            </Link>

          </div>
        </nav>
      </div>
      <div className="p-4 border-t border-[#e09980] bg-[#fae6d9]">
        <div className="flex items-center mb-3">
          <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center">
            <span className="font-bold text-sm">{user.name.split(' ').map(n => n[0]).join('')}</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-black">{user.name}</p>
            <p className="text-xs font-normal text-black">{user.email}</p>
          </div>
        </div>
        <Separator className="my-2" />
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full justify-start text-red-600 mt-2 hover-glow" 
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
