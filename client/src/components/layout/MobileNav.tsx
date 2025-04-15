import { FC } from "react";
import { Link, useLocation } from "wouter";
import { MapPin, MessageSquare, Users, User } from "lucide-react";

const MobileNav: FC = () => {
  const [location] = useLocation();

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
        <Link href="/profile" className={`flex flex-col items-center justify-center py-3 w-1/4 ${location === '/profile' ? 'text-primary border-t-2 border-primary' : 'text-gray-500'}`}>
            <User className="h-6 w-6" />
            <span className="text-xs mt-1">Profile</span>
        </Link>
      </div>
    </nav>
  );
};

export default MobileNav;
