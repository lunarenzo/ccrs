import { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { Container, Offcanvas, Button } from 'react-bootstrap';
import { 
  House, 
  FileText, 
  Users, 
  ClipboardText, 
  Gear, 
  List, 
  Moon, 
  Sun, 
  User, 
  SignOut,
  UserCircle,
  Palette
} from 'phosphor-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { useBreakpoint } from '../hooks/useBreakpoint';
import { classNames } from '../lib/utils';
import { AdminOnly, SupervisorOnly, useRoleCheck } from './auth/RoleGuard';

function Layout() {
  const { user, logout, loading } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { isDesktop } = useBreakpoint();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarShow, setSidebarShow] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    if (!loading && !user) {
      navigate('/login');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <Container fluid className="vh-100 d-flex align-items-center justify-content-center bg-ccrs-gray">
        <div className="text-ccrs-primary h5">Loading...</div>
      </Container>
    );
  }

  if (!user) {
    return null;
  }


  const { isAdmin, isSupervisor } = useRoleCheck();

  // Navigation sections (role-based)
  const getNavItems = () => {
    const baseItems = [
      { path: '/', label: 'Dashboard', icon: House, roles: ['admin', 'supervisor'] },
      { path: '/reports', label: 'Reports', icon: FileText, roles: ['admin', 'supervisor'] }
    ];

    // Admin-only items
    if (isAdmin) {
      baseItems.push(
        { path: '/users', label: 'Users', icon: Users, roles: ['admin'] },
        { path: '/audit', label: 'Audit Logs', icon: ClipboardText, roles: ['admin'] }
      );
    }

    return baseItems;
  };

  const mainNavItems = getNavItems();

  const accountItems = [
    { path: '/profile', label: 'Profile', icon: UserCircle },
    { path: '/settings', label: 'Settings', icon: Gear }
  ];

  const getUserInitials = (user: any) => {
    if (user?.fullName) {
      return user.fullName.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return user?.email?.[0].toUpperCase() || 'U';
  };

  const getUserRole = (user: any) => {
    const role = user?.role || 'admin';
    const roleLabels = {
      admin: 'Administrator',
      supervisor: 'Supervisor',
      officer: 'Officer',
      citizen: 'Citizen'
    };
    return roleLabels[role as keyof typeof roleLabels] || 'User';
  };

  const renderSidebarContent = () => (
    <div className="d-flex flex-column h-100">
      {/* User Profile Section */}
      <div className="sidebar-user-profile">
        <div className="sidebar-user-avatar">
          {getUserInitials(user)}
        </div>
        <div className="sidebar-user-info">
          <h6>{user?.fullName || user?.email || 'Admin User'}</h6>
          <div className="sidebar-user-role">{getUserRole(user)}</div>
        </div>
      </div>

      {/* Main Navigation */}
      <div className="sidebar-nav-section">
        <div className="sidebar-nav-section-title">Navigation</div>
        {mainNavItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => classNames(
              'sidebar-btn',
              isActive ? 'active' : ''
            )}
            onClick={() => setSidebarShow(false)}
          >
            <item.icon className="sidebar-btn-icon" weight="regular" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Account Section */}
      <div className="sidebar-nav-section">
        <div className="sidebar-nav-section-title">Account</div>
        {accountItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => classNames(
              'sidebar-btn',
              isActive ? 'active' : ''
            )}
            onClick={() => setSidebarShow(false)}
          >
            <item.icon className="sidebar-btn-icon" weight="regular" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </div>

      {/* Theme & Actions */}
      <div className="sidebar-nav-section">
        <div className="sidebar-nav-section-title">Preferences</div>
        
        {/* Theme Toggle */}
        <button
          className="sidebar-btn sidebar-theme-toggle"
          onClick={toggleTheme}
          aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
          {theme === 'light' ? 
            <Moon className="sidebar-btn-icon" weight="regular" /> : 
            <Sun className="sidebar-btn-icon" weight="regular" />
          }
          <span>{theme === 'light' ? 'Dark Mode' : 'Light Mode'}</span>
        </button>

        {/* Logout Button */}
        <button
          className="sidebar-btn sidebar-logout-btn"
          onClick={handleLogout}
          aria-label="Logout"
        >
          <SignOut className="sidebar-btn-icon" weight="regular" />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-vh-100 bg-ccrs-gray" data-bs-theme={theme}>
      {/* Desktop Persistent Sidebar */}
      {isDesktop && (
        <div className="sidebar-desktop bg-ccrs-light">
          {renderSidebarContent()}
        </div>
      )}

      {/* Mobile Header with Hamburger */}
      {!isDesktop && (
        <div className="d-flex align-items-center justify-content-between p-3 bg-ccrs-light border-bottom border-ccrs">
          <Button
            variant="outline-primary"
            size="sm"
            onClick={() => setSidebarShow(true)}
            className="d-flex align-items-center gap-2"
            aria-label="Open navigation"
          >
            <List size={20} weight="regular" />
            Menu
          </Button>
          
          <h5 className="text-ccrs-primary fw-bold mb-0">CCRS Admin</h5>
        </div>
      )}

      {/* Mobile Sidebar Offcanvas */}
      {!isDesktop && (
        <Offcanvas 
          show={sidebarShow} 
          onHide={() => setSidebarShow(false)}
          placement="start"
          className="bg-ccrs-light"
          style={{ width: 'var(--ccrs-sidebar-width)' }}
        >
          <Offcanvas.Header closeButton className="border-bottom border-ccrs p-0">
            <div className="w-100">
              {renderSidebarContent()}
            </div>
          </Offcanvas.Header>
        </Offcanvas>
      )}

      {/* Main Content Area */}
      <div className={classNames(
        'min-vh-100',
        isDesktop ? 'main-content-with-sidebar' : ''
      )}>
        <Container fluid className="p-0">
          <div className="p-3 p-lg-4">
            <Outlet />
          </div>
        </Container>
      </div>
    </div>
  );
}

export default Layout;
