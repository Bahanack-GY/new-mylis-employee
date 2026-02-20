import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    LayoutDashboard,
    ListChecks,
    Briefcase,
    Ticket,
    Calendar,
    FileText,
    GraduationCap,
    AlertTriangle,
    MessageSquare,
    HandCoins,
    LogOut,
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLogout } from '../api/auth/hooks';
import logo from '../assets/Logo.png';

interface SidebarProps {
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
}

const menuItems = [
    { icon: LayoutDashboard, label: 'dashboard', path: '/dashboard' },
    { icon: ListChecks, label: 'tasks', path: '/tasks' },
    { icon: Briefcase, label: 'projects', path: '/projects' },
    { icon: Ticket, label: 'tickets', path: '/tickets' },
    { icon: Calendar, label: 'meetings', path: '/meetings' },
    { icon: FileText, label: 'documents', path: '/documents' },
    { icon: GraduationCap, label: 'formations', path: '/formations' },
    { icon: AlertTriangle, label: 'sanctions', path: '/sanctions' },
    { icon: HandCoins, label: 'demands', path: '/demands' },
    { icon: MessageSquare, label: 'messages', path: '/messages' },
];

// Bottom nav shows these 4 + a "More" button
const mobileMainItems = menuItems.slice(0, 4); // Dashboard, Tasks, Projects, Tickets
const mobileMoreItems = menuItems.slice(4);     // Meetings, Documents, Formations

const Sidebar = ({ isSidebarOpen, setIsSidebarOpen }: SidebarProps) => {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const location = useLocation();
    const logout = useLogout();
    const [moreOpen, setMoreOpen] = useState(false);

    const isActive = (path: string) => location.pathname.startsWith(path);
    const isMoreActive = mobileMoreItems.some(item => isActive(item.path));

    // ── Desktop Sidebar (>= md) ──
    const DesktopSidebar = (
        <motion.div
            animate={{ width: isSidebarOpen ? 280 : 80 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 100 }}
            className="hidden md:flex h-screen bg-[#283852] text-white flex-col relative shadow-2xl z-50"
        >
            {/* Header */}
            <div className="h-20 flex items-center justify-center p-4 border-b border-gray-700/50">
                <div className="flex items-center gap-3 w-full overflow-hidden">
                    <img src={logo} alt="Logo" className="w-10 h-10 object-contain min-w-[40px]" />
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <motion.div
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="font-bold text-xl whitespace-nowrap overflow-hidden"
                            >
                                MyLIS
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Toggle Button */}
            <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="absolute -right-3 top-24 bg-[#33cbcc] p-1 rounded-full shadow-lg hover:bg-[#2bb5b6] transition-colors z-50"
            >
                {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>

            {/* Navigation */}
            <div className="flex-1 py-8 px-4 space-y-2 overflow-y-auto">
                {menuItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <div
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`
                                flex items-center p-3 rounded-xl cursor-pointer transition-all duration-200 group relative
                                ${active
                                    ? 'bg-[#33cbcc] text-white shadow-lg shadow-[#33cbcc]/20'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-white'
                                }
                            `}
                        >
                            <item.icon size={24} className={`min-w-[24px] ${!active && 'group-hover:text-[#33cbcc]'}`} />

                            <AnimatePresence>
                                {isSidebarOpen && (
                                    <motion.span
                                        initial={{ opacity: 0, width: 0 }}
                                        animate={{ opacity: 1, width: 'auto' }}
                                        exit={{ opacity: 0, width: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="ml-4 font-medium whitespace-nowrap overflow-hidden"
                                    >
                                        {t(`sidebar.${item.label}`)}
                                    </motion.span>
                                )}
                            </AnimatePresence>

                            {/* Tooltip for collapsed state */}
                            {!isSidebarOpen && (
                                <div className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                                    {t(`sidebar.${item.label}`)}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            {/* Footer / Logout */}
            <div className="p-4 border-t border-gray-700/50">
                <div
                    onClick={logout}
                    className="flex items-center p-3 rounded-xl cursor-pointer text-gray-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                    <LogOut size={24} className="min-w-[24px]" />
                    <AnimatePresence>
                        {isSidebarOpen && (
                            <motion.span
                                initial={{ opacity: 0, width: 0 }}
                                animate={{ opacity: 1, width: 'auto' }}
                                exit={{ opacity: 0, width: 0 }}
                                transition={{ duration: 0.2 }}
                                className="ml-4 font-medium whitespace-nowrap overflow-hidden"
                            >
                                {t('sidebar.logout')}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </motion.div>
    );

    // ── Mobile Bottom Nav (< md) ──
    const MobileBottomNav = (
        <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
            {/* "More" overlay menu */}
            <AnimatePresence>
                {moreOpen && (
                    <>
                        {/* Backdrop */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/40 z-40"
                            onClick={() => setMoreOpen(false)}
                        />
                        {/* More panel */}
                        <motion.div
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            className="absolute bottom-full left-0 right-0 bg-white rounded-t-2xl shadow-2xl z-50 pb-2"
                        >
                            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                                <span className="text-sm font-semibold text-[#283852]">{t('sidebar.more')}</span>
                                <button
                                    onClick={() => setMoreOpen(false)}
                                    className="p-1 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <X size={18} className="text-gray-500" />
                                </button>
                            </div>
                            <div className="px-3 py-2 space-y-1">
                                {mobileMoreItems.map((item) => {
                                    const active = isActive(item.path);
                                    return (
                                        <div
                                            key={item.path}
                                            onClick={() => {
                                                navigate(item.path);
                                                setMoreOpen(false);
                                            }}
                                            className={`
                                                flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200
                                                ${active
                                                    ? 'bg-[#33cbcc]/10 text-[#283852]'
                                                    : 'text-gray-600 hover:bg-gray-50'
                                                }
                                            `}
                                        >
                                            <item.icon
                                                size={20}
                                                className={active ? 'text-[#33cbcc]' : 'text-gray-400'}
                                            />
                                            <span className="text-sm font-medium">{t(`sidebar.${item.label}`)}</span>
                                        </div>
                                    );
                                })}
                                {/* Logout in more menu */}
                                <div
                                    onClick={() => {
                                        setMoreOpen(false);
                                        logout();
                                    }}
                                    className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer text-gray-600 hover:bg-gray-50 transition-all duration-200 border-t border-gray-100 mt-1 pt-3"
                                >
                                    <LogOut size={20} className="text-gray-400" />
                                    <span className="text-sm font-medium">{t('sidebar.logout')}</span>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>

            {/* Bottom bar */}
            <div className="bg-white border-t border-gray-200 px-2 py-2 flex items-center justify-around safe-bottom">
                {mobileMainItems.map((item) => {
                    const active = isActive(item.path);
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={`
                                flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]
                                ${active ? 'text-[#33cbcc]' : 'text-gray-400'}
                            `}
                        >
                            <item.icon size={22} />
                            <span className="text-[10px] font-medium leading-tight">
                                {t(`sidebar.${item.label}`)}
                            </span>
                        </button>
                    );
                })}
                {/* More button */}
                <button
                    onClick={() => setMoreOpen(!moreOpen)}
                    className={`
                        flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all duration-200 min-w-[56px]
                        ${isMoreActive || moreOpen ? 'text-[#33cbcc]' : 'text-gray-400'}
                    `}
                >
                    <MoreHorizontal size={22} />
                    <span className="text-[10px] font-medium leading-tight">
                        {t('sidebar.more')}
                    </span>
                </button>
            </div>
        </div>
    );

    return (
        <>
            {DesktopSidebar}
            {MobileBottomNav}
        </>
    );
};

export default Sidebar;
