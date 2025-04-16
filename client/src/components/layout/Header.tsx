import { FC, useState } from "react";
import { Bell, LogOut } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/ui/logo";

const Header: FC = () => {
  const { user, logoutMutation } = useAuth();
  const [notifications] = useState<any[]>([]);

  if (!user) return null;
  
  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <header className="bg-white border-b border-gray-200 fixed top-0 left-0 right-0 z-30 md:hidden">
      <div className="flex justify-between items-center px-4 py-3">
        <div className="flex items-center">
          <Logo size="sm" showTagline={true} />
        </div>
        <div className="flex items-center">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-full hover:bg-gray-100">
                <Bell className="h-6 w-6 text-gray-600" />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 block h-4 w-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {notifications.length}
                  </span>
                )}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {notifications.length === 0 ? (
                <div className="py-2 px-4 text-sm text-gray-500">No notifications</div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem key={notification.id}>
                    {notification.message}
                  </DropdownMenuItem>
                ))
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-2 p-2 rounded-full hover:bg-gray-100">
                <div className="h-8 w-8 rounded-full bg-primary text-white flex items-center justify-center">
                  <span className="font-medium text-sm">{user.name.split(' ').map(n => n[0]).join('')}</span>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuItem className="cursor-pointer" onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};

export default Header;
