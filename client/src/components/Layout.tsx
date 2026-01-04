import { ReactNode, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  HomeIcon,
  ServerStackIcon,
  Cog6ToothIcon,
  TvIcon,
  FilmIcon,
  Square3Stack3DIcon,
  CircleStackIcon,
  PlayIcon,
  ArrowsRightLeftIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  ClockIcon,
  Bars3Icon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import ActivityIndicator from './ActivityIndicator';

interface LayoutProps {
  children: ReactNode;
}

interface NavSection {
  title?: string;
  items: Array<{ name: string; href: string; icon: React.ComponentType<{ className?: string }> }>;
}

const navigation: NavSection[] = [
  {
    items: [
      { name: 'Dashboard', href: '/', icon: HomeIcon },
      { name: 'Queue', href: '/queue', icon: ArrowDownTrayIcon },
      { name: 'Activity', href: '/activity', icon: ClockIcon },
    ],
  },
  {
    title: 'Media',
    items: [
      { name: 'TV Series', href: '/series', icon: TvIcon },
      { name: 'Movies', href: '/movies', icon: FilmIcon },
      { name: 'Plex', href: '/plex', icon: PlayIcon },
    ],
  },
  {
    title: 'Analysis',
    items: [
      { name: 'Quality Profiles', href: '/quality', icon: Square3Stack3DIcon },
      { name: 'Disk Space', href: '/disk-space', icon: CircleStackIcon },
      { name: 'Compare', href: '/compare', icon: ArrowsRightLeftIcon },
      { name: 'Cutoff Unmet', href: '/cutoff', icon: ExclamationTriangleIcon },
    ],
  },
  {
    title: 'Settings',
    items: [
      { name: 'Instances', href: '/instances', icon: ServerStackIcon },
      { name: 'Settings', href: '/settings', icon: Cog6ToothIcon },
    ],
  },
];

export default function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleNavClick = () => {
    setSidebarOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-900">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 w-64 bg-gray-800 border-r border-gray-700 z-50 transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between h-16 px-6 border-b border-gray-700">
          <h1 className="text-xl font-bold text-primary-400">Managarr</h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 text-gray-400 hover:text-white"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>
        <nav className="p-4 space-y-4 overflow-y-auto h-[calc(100vh-4rem)]">
          {navigation.map((section, sectionIdx) => (
            <div key={sectionIdx}>
              {section.title && (
                <h3 className="px-3 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  {section.title}
                </h3>
              )}
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={handleNavClick}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                        isActive
                          ? 'bg-primary-600 text-white'
                          : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <main className="lg:pl-64">
        <header className="h-16 bg-gray-800 border-b border-gray-700 flex items-center justify-between px-4 lg:px-6">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
          >
            <Bars3Icon className="w-6 h-6" />
          </button>
          <div className="lg:hidden text-lg font-bold text-primary-400">Managarr</div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-3">
            <ActivityIndicator />
            <Link
              to="/settings"
              className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-700"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </Link>
          </div>
        </header>
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
