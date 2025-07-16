import { FC, ReactNode } from "react";
import Sidebar from "./Sidebar";
import MobileNav from "./MobileNav";
import Header from "./Header";

interface AppShellProps {
  children: ReactNode;
}

const AppShell: FC<AppShellProps> = ({ children }) => {
  return (
    <div className="flex flex-col h-screen">
      {/* Mobile Header */}
      <Header />

      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto mt-14 md:mt-0 md:ml-64 bg-gradient-to-br from-yellow-50 via-orange-50 to-pink-50 min-h-screen">
        <div className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>

      {/* Mobile Navigation */}
      <MobileNav />
    </div>
  );
};

export default AppShell;
