import { FC } from "react";
import { Link, useLocation } from "wouter";
import { MapPin, MessageSquare, Users, User, Settings } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

const Sidebar: FC = () => {
  const [location] = useLocation();
  const { user } = useAuth();

  if (!user) return null;

  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:w-64 bg-white border-r border-gray-200 z-30">
      <div className="flex items-center px-6 py-4 h-16">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary" viewBox="0 0 20 20" fill="currentColor">
          <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
        </svg>
        <div className="ml-2">
          <h1 className="text-xl font-bold font-poppins text-primary">SpotMe</h1>
          <p className="text-xs text-gray-500">Never lift solo again</p>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="px-4 pt-4">
          <div className="space-y-1">
            <Link href="/">
              <a className={`flex items-center px-4 py-3 text-gray-700 ${location === '/' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <MapPin className="h-5 w-5 mr-3 text-primary" />
                Find Gym Partners
              </a>
            </Link>
            <Link href="/messages">
              <a className={`flex items-center px-4 py-3 text-gray-700 ${location === '/messages' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <MessageSquare className="h-5 w-5 mr-3 text-gray-500" />
                Messages
              </a>
            </Link>
            <Link href="/connections">
              <a className={`flex items-center px-4 py-3 text-gray-700 ${location === '/connections' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <Users className="h-5 w-5 mr-3 text-gray-500" />
                Connections
              </a>
            </Link>
            <Link href="/profile">
              <a className={`flex items-center px-4 py-3 text-gray-700 ${location === '/profile' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <User className="h-5 w-5 mr-3 text-gray-500" />
                Profile
              </a>
            </Link>
            <Link href="/settings">
              <a className={`flex items-center px-4 py-3 text-gray-700 ${location === '/settings' ? 'bg-gray-100 text-gray-900 rounded-lg font-medium' : 'hover:bg-gray-100 rounded-lg font-medium'}`}>
                <Settings className="h-5 w-5 mr-3 text-gray-500" />
                Settings
              </a>
            </Link>
          </div>
        </nav>
      </div>
      <div className="p-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="h-10 w-10 rounded-full bg-primary text-white flex items-center justify-center">
            <span className="font-medium text-sm">{user.name.split(' ').map(n => n[0]).join('')}</span>
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">{user.name}</p>
            <p className="text-xs text-gray-500">{user.email}</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
